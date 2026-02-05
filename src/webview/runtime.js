/**
 * QBasic Nexus - Next-Gen Neon CRT Runtime v1.1.0
 * ===============================================
 * The heartbeat of QBasic Nexus's execution environment. This advanced runtime
 * simulates a retro CRT experience with modern Neon aesthetics while ensuring
 * peak performance and stability.
 * 
 * 🚀 v1.1.0 Key Improvements & Optimizations:
 * 
 * 1. 🛡️ Robust Resource Management:
 *    - Strict limits on Images (100), Sounds (32), and Buffers to prevent memory leaks.
 *    - Intelligent auto-cleanup strategies that recycle oldest resources first.
 *    - Input event listener sanitation to ensure clean restarts.
 * 
 * 2. 💾 Persistent Virtual File System (VFS):
 *    - Fully functional in-memory filesystem with 10MB storage limit.
 *    - Persistent data storage powered by localStorage for specific use cases.
 * 
 * 3. 🏎️ High-Performance Graphics:
 *    - Optimized Canvas API usage with limited repaints.
 *    - Cached Glow effects and RGB calculations for buttery smooth rendering.
 *    - SpanPool architecture to minimize DOM thrashing and GC pressure.
 * 
 * 4. 🔊 Enhanced Audio Engine:
 *    - Async audio context handling with precise oscillator tracking.
 *    - Proper gain node management for clear, artifact-free sound.
 * 
 * @author Thirawat27
 * @version 1.1.0
 */

/* global requestAnimationFrame, cancelAnimationFrame, Image, Audio, requestIdleCallback */

(function() {
    'use strict';

    // =========================================================================
    // VS CODE API & DOM
    // =========================================================================
    
    const vscode = acquireVsCodeApi();
    const screen = document.getElementById('screen');
    const canvas = document.getElementById('gfx-layer');
    
    // Global directives for linters
    /* global localStorage */

    // =========================================================================
    // STATE
    // =========================================================================
    
    let cursorRow = 1;
    let cursorCol = 1;
    let fgColor = 7;  // Light gray
    let bgColor = 0;  // Black
    let keyBuffer = '';

    // Virtual File System (VFS) - localStorage based
    const VFS_KEY = 'qbasic_nexus_vfs';
    const VFS_MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    let vfs = {};
    let openFiles = {};
    
    // Load VFS from localStorage
    function _loadVFS() {
        try {
            const stored = localStorage.getItem(VFS_KEY);
            if (stored) {
                vfs = JSON.parse(stored);
            }
        } catch (_e) {
            vfs = {};
        }
    }
    
    // Save VFS to localStorage (with size limit)
    function _saveVFS() {
        try {
            const data = JSON.stringify(vfs);
            if (data.length <= VFS_MAX_SIZE) {
                localStorage.setItem(VFS_KEY, data);
            } else {
                console.warn('[QBasic VFS] Size limit exceeded, not saving');
            }
        } catch (_e) {
            console.error('[QBasic VFS] Failed to save:', _e);
        }
    }
    
    // Initialize VFS
    _loadVFS();

    // QBasic 16-color palette - Enhanced Neon for visibility on dark backgrounds
    // Brighter than original CGA/EGA for modern displays
    const COLORS = Object.freeze([
        '#0a0a0a', '#3388FF', '#00DD44', '#00DDDD',
        '#DD3333', '#DD44DD', '#DD8800', '#CCCCCC',
        '#808080', '#6699FF', '#66FF66', '#66FFFF',
        '#FF6666', '#FF66FF', '#FFFF66', '#FFFFFF'
    ]);

    // =========================================================================
    // OBJECT POOLING - Reduce GC pressure with memory limits
    // =========================================================================
    
    const SpanPool = {
        _pool: [],
        _maxSize: 200,  // Increased for better reuse
        _totalCreated: 0,
        _maxTotal: 500, // Hard limit on total spans created
        
        acquire() {
            if (this._pool.length > 0) {
                return this._pool.pop();
            }
            // Limit total span creation to prevent memory bloat
            if (this._totalCreated < this._maxTotal) {
                this._totalCreated++;
                return document.createElement('span');
            }
            // Fallback: force reuse by returning new span anyway
            console.warn('[QBasic Runtime] SpanPool: Maximum spans reached');
            return document.createElement('span');
        },
        
        release(span) {
            if (this._pool.length < this._maxSize && span) {
                // Clean up span completely
                span.textContent = '';
                span.style.cssText = '';
                span.className = '';
                span.removeAttribute('style');
                this._pool.push(span);
            }
            // If pool is full, let GC handle it
        },
        
        clear() {
            this._pool.length = 0;
            this._totalCreated = 0;
        },
        
        // Get memory usage stats
        stats() {
            return {
                poolSize: this._pool.length,
                totalCreated: this._totalCreated,
                maxSize: this._maxSize
            };
        }
    };

    // =========================================================================
    // AUDIO ENGINE (Adapted from qbjs-main)
    // =========================================================================
    
    // Pre-computed constants for audio
    const AUDIO_CONSTANTS = Object.freeze({
        C6_FREQ: 1047,
        DEFAULT_TEMPO: 120,
        RAMP_TIME: 0.01,
        DEFAULT_GAIN: 0.3
    });
    
    class QBasicSound {
        constructor() {
            this.octave = 4;
            this.noteLength = 4;
            this.tempo = AUDIO_CONSTANTS.DEFAULT_TEMPO;
            this.mode = 0.875; // 7/8 pre-computed
            this.foreground = true;
            this.type = 'square';
            this._audioContext = null;
            this._gainNode = null; // Reusable gain node for simple sounds
            this._isResuming = false;
            this._activeOscillators = new Set(); // Track active oscillators for cleanup
            this._activeGainNodes = new Set(); // Track gain nodes for cleanup
            this._maxConcurrentSounds = 8; // Limit concurrent sounds to prevent resource exhaustion
            this._cleanupScheduled = false;
        }

        // Periodic cleanup of finished oscillators
        _scheduleCleanup() {
            if (this._cleanupScheduled) return;
            this._cleanupScheduled = true;
            
            setTimeout(() => {
                this._cleanupScheduled = false;
                
                // Clean up disconnected oscillators
                for (const osc of this._activeOscillators) {
                    try {
                        // Check if oscillator is still playing
                        if (osc._ended) {
                            this._activeOscillators.delete(osc);
                        }
                    } catch (_e) {
                        this._activeOscillators.delete(osc);
                    }
                }
                
                // Clean up gain nodes
                this._activeGainNodes.clear();
            }, 1000); // Cleanup every second if needed
        }

        stop() {
            // Stop all active oscillators first
            for (const osc of this._activeOscillators) {
                try {
                    osc.stop(0);
                    osc.disconnect();
                } catch (_e) {
                    // Ignore errors on already stopped oscillators
                }
            }
            this._activeOscillators.clear();
            
            // Disconnect all gain nodes
            for (const gain of this._activeGainNodes) {
                try {
                    gain.disconnect();
                } catch (_e) { /* ignore */ }
            }
            this._activeGainNodes.clear();
            
            if (this._audioContext) {
                try {
                    // Check state before closing
                    if (this._audioContext.state !== 'closed') {
                        // Suspend first, then close
                        this._audioContext.suspend().then(() => {
                            if (this._audioContext && this._audioContext.state !== 'closed') {
                                this._audioContext.close().catch(() => {});
                            }
                        }).catch(() => {
                            // Try to close anyway
                            if (this._audioContext && this._audioContext.state !== 'closed') {
                                this._audioContext.close().catch(() => {});
                            }
                        });
                    }
                } catch (_e) {
                    // Ignore close errors
                }
                this._audioContext = null;
                this._gainNode = null;
            }
        }
        
        // Reset to initial state (for program restart)
        reset() {
            this.stop();
            this.octave = 4;
            this.noteLength = 4;
            this.tempo = AUDIO_CONSTANTS.DEFAULT_TEMPO;
            this.mode = 0.875;
            this.foreground = true;
            this.type = 'square';
            this._cleanupScheduled = false;
        }
        
        // Lazy initialization with singleton pattern
        _ensureContext() {
            if (!this._audioContext) {
                this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Single resume helper with flag to prevent multiple attempts
                const resume = () => {
                    if (this._audioContext && this._audioContext.state === 'suspended' && !this._isResuming) {
                        this._isResuming = true;
                        this._audioContext.resume().finally(() => {
                            this._isResuming = false;
                        });
                    }
                };
                document.addEventListener('click', resume, { once: true, passive: true });
                document.addEventListener('keydown', resume, { once: true, passive: true });
            }
            return this._audioContext;
        }

        async playSound(frequency, duration) {
            const ctx = this._ensureContext();
            
            // Check if context is in valid state
            if (ctx.state === 'closed') {
                this._audioContext = null;
                return;
            }
            
            if (ctx.state === 'suspended') {
                try {
                    await ctx.resume();
                } catch (_e) {
                    // Ignore, waits for interaction
                    return;
                }
            }

            // A 0 frequency means a pause
            if (frequency === 0) {
                await this.delay(duration);
                return;
            }
            
            // Validate parameters
            if (!isFinite(frequency) || !isFinite(duration) || duration <= 0) {
                return;
            }
            
            // Limit concurrent sounds to prevent resource exhaustion
            if (this._activeOscillators.size >= this._maxConcurrentSounds) {
                // Stop oldest oscillator
                const oldest = this._activeOscillators.values().next().value;
                if (oldest) {
                    try {
                        oldest.stop();
                        oldest.disconnect();
                    } catch (_e) { /* ignore */ }
                    this._activeOscillators.delete(oldest);
                }
            }
            
            const currentTime = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            
            // Track oscillator and gain node for cleanup
            this._activeOscillators.add(o);
            this._activeGainNodes.add(g);
            
            // Mark oscillator when ended for cleanup
            o.onended = () => {
                o._ended = true;
                this._activeOscillators.delete(o);
                this._activeGainNodes.delete(g);
            };
            
            // Schedule periodic cleanup
            this._scheduleCleanup();
            
            try {
                o.connect(g);
                g.connect(ctx.destination);
                
                // Ramp up to avoid click at start
                g.gain.setValueAtTime(0, currentTime);
                g.gain.linearRampToValueAtTime(AUDIO_CONSTANTS.DEFAULT_GAIN, currentTime + AUDIO_CONSTANTS.RAMP_TIME);
                
                o.frequency.value = frequency;
                o.type = this.type;
                o.start(currentTime);
                
                const actualDuration = duration * this.mode;
                const pause = duration - actualDuration;
                
                await this.delay(actualDuration);
                
                // Ramp down to avoid clicking
                const stopTime = ctx.currentTime;
                g.gain.linearRampToValueAtTime(0, stopTime + AUDIO_CONSTANTS.RAMP_TIME);
                o.stop(stopTime + AUDIO_CONSTANTS.RAMP_TIME);
                
                if (pause > 0) {
                    await this.delay(pause);
                }
            } catch (_e) {
                try { o.stop(); } catch (_e2) { /* ignore */ }
            } finally {
                // Remove from tracking regardless of success/failure
                this._activeOscillators.delete(o);
            }
        }
    
        getNoteValue(octave, note) {
            const octaveNotes = 'C D EF G A B';
            const index = octaveNotes.indexOf(note.toUpperCase());
            if (index < 0) {
                throw new Error(note + ' is not a valid note');
            }
            return octave * 12 + index;
        }

        async play(commandString) {
            if (!commandString) return;
            commandString = String(commandString).replace(/ /g, '').toUpperCase();
            
            // QBJS Compatible Regex
            const reg = /(?<octave>O\d+)|(?<octaveUp>>)|(?<octaveDown><)|(?<note>[A-G][#+-]?\d*\.?[,]?)|(?<noteN>N\d+\.?)|(?<length>L\d+)|(?<legato>ML)|(?<normal>MN)|(?<staccato>MS)|(?<pause>P\d+\.?)|(?<tempo>T\d+)|(?<foreground>MF)|(?<background>MB)/gi;
            
            let match = reg.exec(commandString);
            // Track background promises for proper awaiting
            const backgroundPromises = [];
            
            while (match) {
                let noteValue = null;
                let longerNote = false;
                let temporaryLength = 0;
                let nowait = false;
                
                const g = match.groups || {}; // Safety check

                if (g.octave) this.octave = parseInt(match[0].substring(1));
                if (g.octaveUp) this.octave++;
                if (g.octaveDown) this.octave--;
                
                if (g.note) {
                    const noteMatch = /(?<note>[A-G])(?<suffix>[#+-]?)(?<shorthand>\d*)(?<longerNote>\.?)(?<nowait>,?)/i.exec(match[0]);
                    const ng = noteMatch.groups || {};

                    if (ng.longerNote) longerNote = true;
                    if (ng.shorthand) temporaryLength = parseInt(ng.shorthand);
                    if (ng.nowait) nowait = true;
                    
                    noteValue = this.getNoteValue(this.octave, ng.note);
                    switch (ng.suffix) {
                        case '#': case '+': noteValue++; break;
                        case '-': noteValue--; break;
                    }
                }
                
                if (g.noteN) {
                    const noteNMatch = /N(?<noteValue>\d+)(?<longerNote>\.?)/i.exec(match[0]);
                    const ng = noteNMatch.groups || {};
                    if (ng.longerNote) longerNote = true;
                    noteValue = parseInt(ng.noteValue);
                }
                
                if (g.length) this.noteLength = parseInt(match[0].substring(1));
                if (g.legato) this.mode = 1;
                if (g.normal) this.mode = 7 / 8;
                if (g.staccato) this.mode = 3 / 4;
                
                if (g.pause) {
                    const pauseMatch = /P(?<length>\d+)(?<longerNote>\.?)/i.exec(match[0]);
                    const ng = pauseMatch.groups || {};
                    if (ng.longerNote) longerNote = true;
                    noteValue = 0;
                    temporaryLength = parseInt(ng.length);
                }
                
                if (g.tempo) this.tempo = parseInt(match[0].substring(1));
                if (g.foreground) this.foreground = true;
                if (g.background) this.foreground = false;
    
                if (noteValue !== null) {
                    // Pre-compute note duration base
                    const noteDuration = 240000 / this.tempo; // (60000 * 4 / tempo) simplified
                    let duration = temporaryLength 
                        ? noteDuration / temporaryLength 
                        : noteDuration / this.noteLength;
                    if (longerNote) duration *= 1.5;
                    
                    // Use pre-computed C6 constant
                    const freq = noteValue === 0 ? 0 : AUDIO_CONSTANTS.C6_FREQ * Math.pow(2, (noteValue - 48) / 12);
                    
                    if (nowait || !this.foreground) {
                        // Fire-and-forget or background mode - collect promises
                        const soundPromise = this.playSound(freq, duration);
                        backgroundPromises.push(soundPromise);
                    } else {
                        // Foreground mode - wait for each note
                        await this.playSound(freq, duration);
                    }
                }
                match = reg.exec(commandString);
            }
            
            // Wait for all background sounds to finish if in foreground mode at end
            if (this.foreground && backgroundPromises.length > 0) {
                await Promise.all(backgroundPromises);
            }
        }
        
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    const soundSystem = new QBasicSound();

    // =========================================================================
    // SCREEN FUNCTIONS
    // =========================================================================
    
    // Print batching for performance - reduces DOM reflows
    let printBatch = null;
    let printBatchTimer = null;
    const _BATCH_DELAY = 16; // ~60fps (for documentation)

    function flushPrintBatch() {
        if (printBatch && printBatch.childNodes.length > 0) {
            screen.appendChild(printBatch);
            printBatch = null;
            
            // Single scroll at end of batch
            screen.scrollTop = screen.scrollHeight;
        }
        printBatchTimer = null;
    }

    // Pre-computed glow cache for performance with size limit
    const _glowCache = new Map();
    const _MAX_GLOW_CACHE_SIZE = 32; // 16 colors * 2 for safety
    
    function _getGlowStyle(color) {
        if (!_glowCache.has(color)) {
            // Prevent cache from growing unbounded
            if (_glowCache.size >= _MAX_GLOW_CACHE_SIZE) {
                // Clear oldest entry (first key)
                const firstKey = _glowCache.keys().next().value;
                _glowCache.delete(firstKey);
            }
            // Lighter glow for better performance (single layer)
            _glowCache.set(color, `0 0 5px ${color}66`);
        }
        return _glowCache.get(color);
    }

    function createSpan(text, fg = fgColor, bg = bgColor) {
        const span = SpanPool.acquire();
        span.textContent = text;
        
        const colorIndex = fg & 15;
        const color = COLORS[colorIndex];
        span.style.color = color;
        
        // Apply lightweight glow (skip for black/dark colors)
        if (colorIndex > 0 && colorIndex !== 8) {
            span.style.textShadow = _getGlowStyle(color);
        } else {
            span.style.textShadow = '';
        }
        
        if (bg > 0) {
            span.style.backgroundColor = COLORS[bg & 7];
        } else {
            span.style.backgroundColor = '';
        }
        return span;
    }

    // Cached message object to reduce object creation
    const _outputMessage = { type: 'check_output', content: '' };

    function print(text, newline = true) {
        const content = String(text);
        const span = createSpan(newline ? content + '\n' : content);
        
        // Batch DOM operations
        if (!printBatch) {
            printBatch = document.createDocumentFragment();
        }
        printBatch.appendChild(span);
        
        // Schedule flush - only if not already scheduled
        if (!printBatchTimer) {
            printBatchTimer = requestAnimationFrame(flushPrintBatch);
        }
        
        // Reuse message object to reduce GC
        _outputMessage.content = content;
        vscode.postMessage(_outputMessage);
    }

    function cls() {
        // Clear pending batch to avoid ghost text
        if (printBatch) {
            printBatch = null;
        }
        if (printBatchTimer) {
            cancelAnimationFrame(printBatchTimer);
            printBatchTimer = null;
        }

        // Fast DOM clear - textContent is faster than removeChild loop
        screen.textContent = '';
        
        // Reset span pool asynchronously to avoid blocking
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => SpanPool.clear());
        } else {
            setTimeout(() => SpanPool.clear(), 0);
        }
        
        cursorRow = 1;
        cursorCol = 1;
        
        if (ctx && canvas.style.display !== 'none') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function locate(row, col) {
        cursorRow = row;
        cursorCol = col;
        // Note: True locate would require a character grid, simplified here
    }

    function color(fg, bg) {
        if (fg !== undefined) fgColor = fg % 16;
        if (bg !== undefined) bgColor = bg % 8;
    }

    // =========================================================================
    // VIRTUAL FILE SYSTEM (VFS)
    // =========================================================================
    
    const fileHandles = {};
    const STORAGE_KEY = 'QBASIC_VFS_';

    function _vfsSave(filename, content) {
        try {
            localStorage.setItem(STORAGE_KEY + filename.toUpperCase(), content);
        } catch (e) {
            console.error('VFS Save Error:', e);
        }
    }

    function _vfsLoad(filename) {
        return localStorage.getItem(STORAGE_KEY + filename.toUpperCase());
    }

    async function vfsOpen(filename, mode, filenum) {
        mode = mode.toUpperCase();
        let content = _vfsLoad(filename) || '';
        
        fileHandles[filenum] = {
            filename: filename,
            mode: mode,
            content: content,
            position: 0,
            buffer: '' // For output buffering
        };
        
        if (mode === 'OUTPUT') {
            fileHandles[filenum].content = ''; // Overwrite
            fileHandles[filenum].buffer = '';
        } else if (mode === 'APPEND') {
             // Keep content
        } else if (mode === 'INPUT') {
             // Read only
        }
    }

    async function vfsClose(filenum) {
        const fh = fileHandles[filenum];
        if (fh) {
            if (fh.mode === 'OUTPUT' || fh.mode === 'APPEND') {
                let finalContent = fh.content;
                if (fh.mode === 'OUTPUT') finalContent = fh.buffer;
                else if (fh.mode === 'APPEND') finalContent += fh.buffer;
                
                _vfsSave(fh.filename, finalContent);
            }
            delete fileHandles[filenum];
        }
    }

    // Maximum VFS buffer size to prevent memory issues
    const _MAX_VFS_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    async function vfsPrint(filenum, text) {
        const fh = fileHandles[filenum];
        if (fh) {
            // Check buffer size limit
            if (fh.buffer.length + text.length > _MAX_VFS_BUFFER_SIZE) {
                console.warn('[QBasic Runtime] VFS buffer limit reached');
                return;
            }
            fh.buffer += text;
        }
    }
    
    async function vfsInput(filenum) {
         // Simplified line input from file
         // TODO: Real token-based input
         const fh = fileHandles[filenum];
         if (!fh) return '';
         
         const lines = fh.content.split('\n');
         let res = '';
         if (fh.position < lines.length) {
             res = lines[fh.position];
             fh.position++;
         }
         return res;
    }

    // =========================================================================
    // GRAPHICS ENGINE
    // =========================================================================

    const ctx = canvas ? canvas.getContext('2d', { alpha: true, desynchronized: true }) : null;
    
    // Image buffers for GET/PUT
    // QBasic stores images in arrays. We will use a Map to simulate this.
    // Key: Array ID (or Name), Value: ImageData
    const imageBuffers = new Map();
    const MAX_IMAGE_BUFFERS = 50; // Limit number of GET buffers
    const MAX_BUFFER_PIXELS = 500000; // ~500K pixels max per buffer
    let _nextBufferId = 1;
    
    // Reusable temp canvas for composite operations (object pooling)
    let _tempCanvas = null;
    let _tempCtx = null;
    
    function _getTempCanvas(w, h) {
        if (!_tempCanvas) {
            _tempCanvas = document.createElement('canvas');
            _tempCtx = _tempCanvas.getContext('2d');
        }
        if (_tempCanvas.width !== w || _tempCanvas.height !== h) {
            _tempCanvas.width = w;
            _tempCanvas.height = h;
        }
        return { canvas: _tempCanvas, ctx: _tempCtx };
    }

    // Helper to get buffer from ID or create new
    function _getBuffer(id) {
        return imageBuffers.get(id);
    }
    
    function _get(x1, y1, x2, y2, id) {
        if (!ctx) return;
        const w = Math.abs(x2 - x1) + 1;
        const h = Math.abs(y2 - y1) + 1;
        
        // Check size limit
        if (w * h > MAX_BUFFER_PIXELS) {
            console.warn('[QBasic Runtime] GET: Image too large, skipping');
            return;
        }
        
        // Enforce buffer limit
        if (imageBuffers.size >= MAX_IMAGE_BUFFERS && !imageBuffers.has(id)) {
            const oldestKey = imageBuffers.keys().next().value;
            imageBuffers.delete(oldestKey);
        }
        
        const sx = Math.min(x1, x2);
        const sy = Math.min(y1, y2);
        
        const imageData = ctx.getImageData(sx, sy, w, h);
        
        // If id is a string (variable name), use it
        imageBuffers.set(id, imageData);
    }

    function _put(x, y, id, action) {
        if (!ctx) return;
        const imageData = imageBuffers.get(id);
        if (!imageData) return;
        
        if (!action || action.toUpperCase() === 'PSET') {
             ctx.putImageData(imageData, x, y);
        } else if (action.toUpperCase() === 'OR') {
            // Manual composition for OR, XOR, AND, etc if needed. 
            // putImageData doesn't support composition directly.
            // Simplified: Draw temporary canvas
            createTempCanvas(imageData, x, y, 'lighter'); // 'lighter' is additive (plus) not exactly OR
        } else if (action.toUpperCase() === 'XOR') {
            createTempCanvas(imageData, x, y, 'xor');
        } else {
             ctx.putImageData(imageData, x, y);
        }
    }
    
    function createTempCanvas(imgData, x, y, compOp) {
         // Reuse temp canvas instead of creating new one each time
         const { canvas: t, ctx: tctx } = _getTempCanvas(imgData.width, imgData.height);
         tctx.putImageData(imgData, 0, 0);
         
         const oldComp = ctx.globalCompositeOperation;
         ctx.globalCompositeOperation = compOp;
         ctx.drawImage(t, x, y);
         ctx.globalCompositeOperation = oldComp;
    }
    
    let lastX = 0;
    let lastY = 0;
    
    // Default resolutions - frozen for immutability
    const RESOLUTIONS = Object.freeze({
        0: Object.freeze({ w: 0, h: 0 }),         // Text Mode (Canvas hidden)
        1: Object.freeze({ w: 320, h: 200 }),
        2: Object.freeze({ w: 640, h: 200 }),
        7: Object.freeze({ w: 320, h: 200 }),
        9: Object.freeze({ w: 640, h: 350 }),
        12: Object.freeze({ w: 640, h: 480 }),
        13: Object.freeze({ w: 320, h: 200 })
    });

    function screenMode(mode) {
        if (!canvas) return;
        
        const res = RESOLUTIONS[mode] || RESOLUTIONS[12]; // Default to VGA
        
        if (mode === 0) {
            canvas.style.display = 'none';
        } else {
            canvas.style.display = 'block';
            canvas.width = res.w;
            canvas.height = res.h;
            
            // Clear
            ctx.fillStyle = '#000000'; // Default black background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;
        }
        
        // Reset state
        lastX = canvas.width / 2;
        lastY = canvas.height / 2;
        
        console.log(`SCREEN ${mode}: ${canvas.width}x${canvas.height}`);
    }

    function _pset(x, y, c, isStep) {
        if (!ctx) return;
        // Handle STEP - coordinates are relative to last point
        const absX = isStep ? lastX + x : x;
        const absY = isStep ? lastY + y : y;
        
        // Bitwise AND is faster than modulo for powers of 2
        ctx.fillStyle = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        ctx.fillRect(absX | 0, absY | 0, 1, 1); // Bitwise OR 0 for fast floor
        lastX = absX;
        lastY = absY;
    }

    function _preset(x, y, c, isStep) {
        if (!ctx) return;
        // Handle STEP - coordinates are relative to last point
        const absX = isStep ? lastX + x : x;
        const absY = isStep ? lastY + y : y;
        
        // If color omitted, use background (0 usually)
        ctx.fillStyle = c !== undefined ? COLORS[c & 15] : COLORS[0];
        ctx.fillRect(absX | 0, absY | 0, 1, 1);
        lastX = absX;
        lastY = absY;
    }

    function _line(x1, y1, x2, y2, c, box, fill, step1, step2) {
        if (!ctx) return;
        
        const colorVal = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        
        // Handle optional start point and STEP
        let startX = x1 ?? lastX;
        let startY = y1 ?? lastY;
        
        // If step1, first point is relative to last position
        if (step1 && x1 !== null) {
            startX = lastX + x1;
            startY = lastY + y1;
        }
        
        // If step2, second point is relative to first point
        let endX = step2 ? startX + x2 : x2;
        let endY = step2 ? startY + y2 : y2;
        
        if (box) {
            const w = endX - startX;
            const h = endY - startY;
            
            if (fill) {
                ctx.fillStyle = colorVal;
                ctx.fillRect(startX, startY, w, h);
            } else {
                ctx.strokeStyle = colorVal;
                ctx.strokeRect(startX, startY, w, h);
            }
        } else {
            ctx.strokeStyle = colorVal;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        lastX = endX;
        lastY = endY;
    }

    function _circle(x, y, r, c, isStep, startAngle, endAngle, aspect) {
        if (!ctx) return;
        
        // Handle STEP - center is relative to last point
        const centerX = isStep ? lastX + x : x;
        const centerY = isStep ? lastY + y : y;
        
        const colorVal = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        ctx.strokeStyle = colorVal;
        
        // Convert QBasic angles (radians, 0=right, counter-clockwise) to Canvas angles
        // QBasic uses negative angles for partial arcs
        let start = 0;
        let end = 2 * Math.PI;
        let useArc = false;
        
        if (startAngle !== undefined && startAngle !== 'undefined') {
            start = -parseFloat(startAngle); // QBasic angles are negative for arcs
            useArc = true;
        }
        if (endAngle !== undefined && endAngle !== 'undefined') {
            end = -parseFloat(endAngle);
            useArc = true;
        }
        
        // Aspect ratio handling (stretch circle into ellipse)
        const aspectRatio = (aspect !== undefined && aspect !== 'undefined') ? parseFloat(aspect) : 1;
        
        ctx.save();
        ctx.beginPath();
        
        if (aspectRatio !== 1 && aspectRatio > 0) {
            // Draw ellipse using scale transform
            ctx.translate(centerX, centerY);
            ctx.scale(1, aspectRatio);
            ctx.arc(0, 0, r, useArc ? start : 0, useArc ? end : 2 * Math.PI, start > end);
            ctx.restore();
            ctx.stroke();
        } else {
            ctx.arc(centerX, centerY, r, useArc ? start : 0, useArc ? end : 2 * Math.PI, start > end);
            ctx.stroke();
            ctx.restore();
        }
        
        lastX = centerX;
        lastY = centerY;
    }

    function setWidth(cols, rows) {
        // Text mode width setting - stubs for now
        // Could adjust CSS font-size in future
        console.log('WIDTH', cols, rows);
    }

    function showError(msg) {
        flushPrintBatch(); // Ensure previous output is visible
        const span = document.createElement('span');
        span.textContent = '\n❌ Runtime Error: ' + msg + '\n';
        span.style.color = '#FF5555';
        screen.appendChild(span);
    }

    // =========================================================================
    // INPUT FUNCTIONS
    // =========================================================================
    
    async function input(prompt = '') {
        return new Promise((resolve) => {
            flushPrintBatch(); // Force flush so prompt appears before input box

            // Create input line container (inline to stay on same line)
            const inputLine = document.createElement('span');
            inputLine.className = 'input-line';
            
            // Add prompt if provided
            if (prompt) {
                const promptSpan = document.createElement('span');
                promptSpan.className = 'prompt';
                promptSpan.textContent = prompt;
                promptSpan.style.color = COLORS[fgColor];
                // Apply color-matched glow
                if (fgColor > 0 && fgColor !== 8) {
                    promptSpan.style.textShadow = `0 0 4px ${COLORS[fgColor]}88, 0 0 8px ${COLORS[fgColor]}44`;
                }
                inputLine.appendChild(promptSpan);
            }
            
            const inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.className = 'cmd-input';
            inputEl.style.color = COLORS[fgColor];
            // Apply color-matched glow to input
            if (fgColor > 0 && fgColor !== 8) {
                inputEl.style.textShadow = `0 0 4px ${COLORS[fgColor]}88, 0 0 8px ${COLORS[fgColor]}44`;
            }
            inputEl.autofocus = true;
            
            inputLine.appendChild(inputEl);
            screen.appendChild(inputLine);
            
            // Focus and scroll
            inputEl.focus();
            screen.scrollTop = screen.scrollHeight;

            // Use named handler for proper cleanup
            function handleKeydown(e) {
                if (e.key === 'Enter') {
                    const value = inputEl.value;
                    
                    // Remove event listener to prevent memory leak
                    inputEl.removeEventListener('keydown', handleKeydown);
                    
                    // Replace input line with static text (prompt + value + newline)
                    const resultSpan = createSpan((prompt || '') + value + '\n');
                    inputLine.replaceWith(resultSpan);
                    
                    resolve(value);
                }
            }
            inputEl.addEventListener('keydown', handleKeydown);
        });
    }

    function inkey() {
        // QBasic INKEY$ returns only first character (or 2-char extended key code)
        if (keyBuffer.length === 0) return '';
        
        // Check for extended key (starts with \x00)
        if (keyBuffer.charCodeAt(0) === 0 && keyBuffer.length >= 2) {
            const key = keyBuffer.substring(0, 2);
            keyBuffer = keyBuffer.substring(2);
            return key;
        }
        
        // Return single character
        const key = keyBuffer.charAt(0);
        keyBuffer = keyBuffer.substring(1);
        return key;
    }

    // =========================================================================
    // TIMER FUNCTIONS
    // =========================================================================
    
    function timer() {
        const d = new Date();
        return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    }

    function dateStr() {
        const d = new Date();
        return String(d.getMonth() + 1).padStart(2, '0') + '-' + 
               String(d.getDate()).padStart(2, '0') + '-' + d.getFullYear();
    }

    function timeStr() {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + 
               String(d.getMinutes()).padStart(2, '0') + ':' + 
               String(d.getSeconds()).padStart(2, '0');
    }

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    async function delay(seconds) {
        return sleep(seconds * 1000);
    }

    // =========================================================================
    // STRING FUNCTIONS (from qbjs-main)
    // =========================================================================
    
    function _left$(str, n) {
        if (n === undefined || n < 0) return '';
        return String(str).substring(0, n);
    }

    function _right$(str, n) {
        if (n === undefined || n < 0) return '';
        const s = String(str);
        // Handle n >= length case - return entire string
        if (n >= s.length) return s;
        return s.substring(s.length - n);
    }

    function _mid$(str, start, len) {
        const s = String(str);
        if (len === undefined) {
            return s.substring(start - 1);
        }
        return s.substring(start - 1, start - 1 + len);
    }

    function _ltrim$(str) {
        return String(str).trimStart();
    }

    function _rtrim$(str) {
        return String(str).trimEnd();
    }

    function _trim$(str) {
        return String(str).trim();
    }

    function _instr(arg1, arg2, arg3) {
        let start = 1;
        let source, search;
        
        if (arg3 !== undefined) {
            start = arg1;
            source = String(arg2);
            search = String(arg3);
        } else {
            source = String(arg1);
            search = String(arg2);
        }
        
        const idx = source.indexOf(search, start - 1);
        return idx < 0 ? 0 : idx + 1;
    }

    function _instrrev(arg1, arg2, arg3) {
        let source, search, start;
        
        if (arg3 !== undefined) {
            source = String(arg1);
            search = String(arg2);
            start = arg3 - 1;
        } else {
            source = String(arg1);
            search = String(arg2);
            start = source.length;
        }
        
        const idx = source.lastIndexOf(search, start);
        return idx < 0 ? 0 : idx + 1;
    }

    function _ucase$(str) {
        return String(str).toUpperCase();
    }

    function _lcase$(str) {
        return String(str).toLowerCase();
    }

    function _string$(count, charOrCode) {
        if (count <= 0) return '';
        let char = typeof charOrCode === 'number' 
            ? String.fromCharCode(charOrCode) 
            : String(charOrCode).charAt(0);
        return char.repeat(count);
    }

    function _space$(n) {
        return n > 0 ? ' '.repeat(n) : '';
    }

    function _asc(str, pos) {
        const s = String(str);
        if (s.length === 0) return 0;
        const index = pos !== undefined ? pos - 1 : 0;
        return s.charCodeAt(index) || 0;
    }

    function _chr$(code) {
        return String.fromCharCode(code);
    }

    function _len(str) {
        return String(str).length;
    }

    function _str$(num) {
        const s = String(num);
        return num >= 0 ? ' ' + s : s;
    }

    function _val(str) {
        const result = parseFloat(str);
        return isNaN(result) ? 0 : result;
    }

    // =========================================================================
    // EXTENDED MATH FUNCTIONS (from qbjs-main)
    // =========================================================================
    
    function _acos(x) {
        return Math.acos(x);
    }

    function _asin(x) {
        return Math.asin(x);
    }

    function _atan2(y, x) {
        return Math.atan2(y, x);
    }

    function _fix(x) {
        // FIX truncates toward zero (like INT but for negatives)
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    }

    function _sgn(x) {
        if (x > 0) return 1;
        if (x < 0) return -1;
        return 0;
    }

    function _int(x) {
        return Math.floor(x);
    }

    function _abs(x) {
        return Math.abs(x);
    }

    function _sqr(x) {
        return Math.sqrt(x);
    }

    function _log(x) {
        return Math.log(x);
    }

    function _exp(x) {
        return Math.exp(x);
    }

    function _sin(x) {
        return Math.sin(x);
    }

    function _cos(x) {
        return Math.cos(x);
    }

    function _tan(x) {
        return Math.tan(x);
    }

    function _atn(x) {
        return Math.atan(x);
    }

    // Seeded random number generator state
    let _rndSeed = Date.now() % 233280;
    
    function _randomize(seed) {
        _rndSeed = seed !== undefined ? (seed % 233280) : (Date.now() % 233280);
    }
    
    function _rnd(n) {
        // QBasic RND behavior:
        // n < 0: Uses n as new seed, returns consistent value
        // n = 0: Returns last random number (not implemented, returns new)
        // n > 0 or omitted: Returns next random number
        if (n !== undefined && n < 0) {
            _rndSeed = Math.abs(n) % 233280;
        }
        
        // Linear Congruential Generator (same as transpiler)
        _rndSeed = (_rndSeed * 9301 + 49297) % 233280;
        return _rndSeed / 233280;
    }

    // =========================================================================
    // SYSTEM FUNCTIONS (from qbjs-main)
    // =========================================================================
    
    function _desktopWidth() {
        return window.screen.width * (window.devicePixelRatio || 1);
    }

    function _desktopHeight() {
        return window.screen.height * (window.devicePixelRatio || 1);
    }

    async function _clipboard$() {
        try {
            return await navigator.clipboard.readText();
        } catch {
            return '';
        }
    }

    async function _setClipboard(text) {
        try {
            await navigator.clipboard.writeText(String(text));
        } catch {
            console.error('Clipboard write failed');
        }
    }

    // =========================================================================
    // GRAPHICS: PAINT (Optimized Scanline Flood Fill)
    // =========================================================================
    
    // Pre-computed RGB cache for colors
    const _colorRGBCache = new Map();
    
    function _getColorRGB(colorIndex) {
        if (_colorRGBCache.has(colorIndex)) {
            return _colorRGBCache.get(colorIndex);
        }
        const hex = COLORS[colorIndex & 15];
        const rgb = _hexToRgbFast(hex);
        _colorRGBCache.set(colorIndex, rgb);
        return rgb;
    }
    
    function _hexToRgbFast(hex) {
        // Fast hex parse without regex
        const val = parseInt(hex.slice(1), 16);
        return {
            r: (val >> 16) & 255,
            g: (val >> 8) & 255,
            b: val & 255
        };
    }

    function _paint(x, y, fillColor, borderColor) {
        if (!ctx) return;
        
        x = x | 0;
        y = y | 0;
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Bounds check
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        
        // Safety limit for very large canvases
        const maxPixels = width * height;
        if (maxPixels > 2000000) {
            console.warn('[QBasic Runtime] PAINT: Canvas too large, skipping');
            return;
        }
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Use cached RGB values
        const fillRGB = _getColorRGB(fillColor !== undefined ? fillColor : fgColor);
        
        // Get target color at starting point
        const startIdx = (y * width + x) << 2;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        
        // Early exit if fill equals target
        if (fillRGB.r === targetR && fillRGB.g === targetG && fillRGB.b === targetB) {
            return;
        }
        
        // Border color
        let borderR = -1, borderG = -1, borderB = -1;
        let hasBorder = false;
        if (borderColor !== undefined) {
            const borderRGB = _getColorRGB(borderColor);
            borderR = borderRGB.r;
            borderG = borderRGB.g;
            borderB = borderRGB.b;
            hasBorder = true;
        }
        
        // Optimized scanline flood fill with typed array for visited
        const visited = new Uint8Array(maxPixels);
        const stack = new Int32Array(maxPixels * 2);
        let stackPtr = 0;
        
        // Push initial point
        stack[stackPtr++] = x;
        stack[stackPtr++] = y;
        
        const fillR = fillRGB.r;
        const fillG = fillRGB.g;
        const fillB = fillRGB.b;
        
        // Safety: limit maximum iterations to prevent infinite loops
        const maxIterations = 1000000;
        let iterations = 0;
        
        while (stackPtr > 0 && iterations < maxIterations) {
            iterations++;
            
            const cy = stack[--stackPtr];
            const cx = stack[--stackPtr];
            
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
            
            const key = cy * width + cx;
            if (visited[key]) continue;
            visited[key] = 1;
            
            const idx = key << 2;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Check boundary conditions
            if (hasBorder) {
                if (r === borderR && g === borderG && b === borderB) continue;
            } else {
                if (r !== targetR || g !== targetG || b !== targetB) continue;
            }
            
            // Fill pixel
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = 255;
            
            // Push neighbors (optimized order for cache locality)
            stack[stackPtr++] = cx + 1;
            stack[stackPtr++] = cy;
            stack[stackPtr++] = cx - 1;
            stack[stackPtr++] = cy;
            stack[stackPtr++] = cx;
            stack[stackPtr++] = cy + 1;
            stack[stackPtr++] = cx;
            stack[stackPtr++] = cy - 1;
        }
        
        if (iterations >= maxIterations) {
            console.warn('[QBasic Runtime] PAINT: Iteration limit reached');
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    function _hexToRgb(hex) {
        return _hexToRgbFast(hex);
    }

    // =========================================================================
    // NEW RUNTIME FUNCTIONS - Additional QBasic/QB64 Commands
    // =========================================================================

    // DRAW command - turtle graphics
    async function _draw(cmdString) {
        if (!ctx) return;
        
        const cmds = String(cmdString).toUpperCase();
        let i = 0;
        let penDown = true;
        let angle = 0; // 0 = right, 90 = down, 180 = left, 270 = up
        let scale = 1;
        
        function getNumber() {
            let num = '';
            while (i < cmds.length && /[0-9.-]/.test(cmds[i])) {
                num += cmds[i++];
            }
            return parseFloat(num) || 0;
        }
        
        function move(dx, dy, draw) {
            dx *= scale;
            dy *= scale;
            // Apply angle rotation
            const rad = angle * Math.PI / 180;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
            
            const newX = lastX + rx;
            const newY = lastY + ry;
            
            if (draw && penDown) {
                ctx.strokeStyle = COLORS[fgColor];
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(newX, newY);
                ctx.stroke();
            }
            
            lastX = newX;
            lastY = newY;
        }
        
        // Safety limit to prevent infinite loops
        const maxIterations = cmds.length * 10;
        let iterations = 0;
        
        while (i < cmds.length && iterations++ < maxIterations) {
            const c = cmds[i++];
            if (c === ' ') continue;
            
            try {
                switch (c) {
                    case 'U': move(0, -getNumber(), true); break;
                    case 'D': move(0, getNumber(), true); break;
                    case 'L': move(-getNumber(), 0, true); break;
                    case 'R': move(getNumber(), 0, true); break;
                    case 'E': { const n = getNumber(); move(n, -n, true); break; }
                    case 'F': { const n = getNumber(); move(n, n, true); break; }
                    case 'G': { const n = getNumber(); move(-n, n, true); break; }
                    case 'H': { const n = getNumber(); move(-n, -n, true); break; }
                    case 'M': {
                        // Move absolute or relative
                        let relative = false;
                        if (cmds[i] === '+' || cmds[i] === '-') {
                            relative = cmds[i] === '+' || cmds[i] === '-';
                            if (cmds[i] === '+') i++;
                        }
                        const x = getNumber();
                        if (cmds[i] === ',') i++;
                        const y = getNumber();
                        if (relative || cmds[i-1] === '-' || cmds[i-2] === '+') {
                            move(x, y, true);
                        } else {
                            if (penDown) {
                                ctx.strokeStyle = COLORS[fgColor];
                                ctx.beginPath();
                                ctx.moveTo(lastX, lastY);
                                ctx.lineTo(x, y);
                                ctx.stroke();
                            }
                            lastX = x;
                            lastY = y;
                        }
                        break;
                    }
                    case 'B': penDown = false; break; // Blank (move without drawing)
                    case 'N': break; // Return to start after line (not fully implemented)
                    case 'A': angle = getNumber() * 90; break; // Angle (0-3)
                    case 'T': angle = getNumber(); break; // Turn angle
                    case 'C': fgColor = getNumber() & 15; break; // Color
                    case 'S': scale = Math.max(0.1, getNumber() / 4); break; // Scale with minimum
                    case 'P': { const _fill = getNumber(); if (cmds[i] === ',') i++; getNumber(); break; } // Paint
                    default: break; // Ignore unknown commands
                }
            } catch (_e) {
                console.warn('[DRAW] Error processing command:', c);
            }
        }
        
        if (iterations >= maxIterations) {
            console.warn('[DRAW] Iteration limit reached');
        }
    }

    // VIEW - set graphics viewport
    function _view(x1, y1, x2, y2, fill, border) {
        if (!ctx) return;
        // Store viewport for clipping
        if (x1 !== undefined) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x1, y1, x2 - x1, y2 - y1);
            ctx.clip();
            if (fill !== undefined) {
                ctx.fillStyle = COLORS[fill & 15];
                ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            }
            if (border !== undefined) {
                ctx.strokeStyle = COLORS[border & 15];
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            }
        } else {
            ctx.restore();
        }
    }

    // VIEW PRINT - set text viewport
    function _viewPrint(top, bottom) {
        // Store text viewport limits
        console.log('VIEW PRINT', top || 1, 'TO', bottom || 25);
    }

    // WINDOW - set logical coordinate system
    function _window(x1, y1, x2, y2, screenCoords) {
        // Transform coordinates based on logical window
        console.log('WINDOW', x1, y1, '-', x2, y2, screenCoords ? 'SCREEN' : '');
    }

    // PALETTE - set color palette
    function _palette(attr, color) {
        if (attr !== undefined && color !== undefined) {
            // In 32-bit mode, palette is direct RGB
            COLORS[attr & 15] = '#' + (color & 0xFFFFFF).toString(16).padStart(6, '0');
        } else {
            // Reset palette to default
            const defaultColors = [
                '#000000', '#0000AA', '#00AA00', '#00AAAA',
                '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
                '#555555', '#5555FF', '#55FF55', '#55FFFF',
                '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
            ];
            for (let i = 0; i < 16; i++) {
                COLORS[i] = defaultColors[i];
            }
        }
    }

    function _paletteUsing(arr) {
        // Set multiple palette entries from array
        if (Array.isArray(arr)) {
            for (let i = 0; i < Math.min(arr.length, 16); i++) {
                COLORS[i] = '#' + (arr[i] & 0xFFFFFF).toString(16).padStart(6, '0');
            }
        }
    }

    // PCOPY - copy screen page
    function _pcopy(src, dst) {
        console.log('PCOPY', src, 'TO', dst, '- single page in web mode');
    }

    // File system stubs (VFS-based)
    async function _rename(oldName, newName) {
        const old = vfs[oldName];
        if (old !== undefined) {
            vfs[newName] = old;
            delete vfs[oldName];
            _saveVFS();
        }
    }

    async function _kill(filename) {
        delete vfs[filename];
        _saveVFS();
    }

    async function _mkdir(dirname) {
        try {
            if (!dirname || typeof dirname !== 'string') return;
            vfs['__dir__' + dirname] = true;
            _saveVFS();
        } catch (_e) {
            console.error('[VFS] MKDIR error:', _e);
        }
    }

    async function _rmdir(dirname) {
        try {
            if (!dirname) return;
            delete vfs['__dir__' + dirname];
            _saveVFS();
        } catch (_e) {
            console.error('[VFS] RMDIR error:', _e);
        }
    }

    async function _chdir(dirname) {
        // VFS doesn't have real directory structure
        console.log('CHDIR', dirname || '.');
    }

    async function _files(spec) {
        try {
            // List files in VFS
            const _pattern = spec || '*';
            const files = Object.keys(vfs).filter(f => !f.startsWith('__'));
            print('Files in VFS:', true);
            if (files.length === 0) {
                print('  (no files)', true);
            } else {
                files.forEach(f => print('  ' + f, true));
            }
        } catch (_e) {
            console.error('[VFS] FILES error:', _e);
        }
    }

    function _seek(fileNum, pos) {
        try {
            if (openFiles[fileNum]) {
                openFiles[fileNum].pos = Math.max(0, (pos || 1) - 1); // 1-based, clamp to 0
            }
        } catch (_e) {
            console.error('[VFS] SEEK error:', _e);
        }
    }

    function _lock(fileNum, start, end) {
        console.log('LOCK', fileNum, start, end, '- not supported in web VFS');
    }

    function _unlock(fileNum, start, end) {
        console.log('UNLOCK', fileNum, start, end, '- not supported in web VFS');
    }

    async function _resetFiles() {
        try {
            Object.keys(openFiles).forEach(f => delete openFiles[f]);
        } catch (_e) {
            console.error('[VFS] RESET error:', _e);
        }
    }

    // Memory stubs
    function _poke(addr, value) {
        console.log('POKE', addr, value, '- memory access not supported');
    }

    // Shell stub
    async function _shell(cmd) {
        console.log('SHELL', cmd || '(interactive)', '- not supported in web');
        showError('SHELL command not available in web mode');
    }

    // Fullscreen
    function _fullscreen(mode) {
        try {
            if (mode === 0) {
                document.exitFullscreen?.();
            } else {
                document.documentElement.requestFullscreen?.();
            }
        } catch (_e) {
            console.warn('[Fullscreen] Not supported:', _e);
        }
    }

    // _DEST and _SOURCE for image operations
    let _destImage = 0;
    let _sourceImage = 0;

    function _dest(handle) {
        _destImage = handle;
    }

    function _source(handle) {
        _sourceImage = handle;
    }

    function _font(fontHandle, imgHandle) {
        console.log('_FONT', fontHandle, imgHandle, '- custom fonts not yet supported');
    }

    // Memory operations (stubs)
    function _memfree(mem) {
        console.log('_MEMFREE', mem);
    }

    function _memcopy(src, srcOff, bytes, dst, dstOff) {
        console.log('_MEMCOPY', src, srcOff, bytes, 'TO', dst, dstOff);
    }

    function _memfill(mem, off, bytes, val) {
        console.log('_MEMFILL', mem, off, bytes, val);
    }

    // Alpha/Transparency
    function _setAlpha(alpha, color, start, end, img) {
        console.log('_SETALPHA', alpha, color, start, end, img);
    }

    function _clearColor(color, img) {
        console.log('_CLEARCOLOR', color, img);
    }

    // =========================================================================
    // EXPOSE RUNTIME API
    // =========================================================================
    
    window.runtime = {
        // Output
        print,
        cls,
        locate,
        color,
        screen: screenMode,
        width: setWidth,
        error: showError,
        
        // Graphics
        pset: _pset,
        preset: _preset,
        line: _line,
        circle: _circle,
        get: _get,
        put: _put,
        
        // Advanced Image
        loadimage: _loadImage,
        newimage: _newImage,
        copyimage: _copyImage,
        freeimage: _freeImage,
        putimage: _putImage,
        printstring: _printString,
        
        // Mouse
        mouseinput: _mouseInput,
        mousex: () => mouseX,
        mousey: () => mouseY,
        mousebutton: (b) => {
             // If b is supplied, check specific button
             if (b === 1) return (mouseButtons & 1) ? -1 : 0;
             if (b === 2) return (mouseButtons & 2) ? -1 : 0;
             if (b === 3) return (mouseButtons & 4) ? -1 : 0;
             return mouseButtons ? -1 : 0;
        },
        mousewheel: _mouseWheel,
        mousehide: _mouseHide,
        mouseshow: _mouseShow,
        
        // Advanced Keyboard
        keydown: _keyDown,
        keyhit: _keyHit,
        keyclear: _keyClear,
        
        // VFS
        open: vfsOpen,
        close: vfsClose,
        printFile: vfsPrint,
        inputFile: vfsInput,
        
        // Input
        input,
        'inkey$': inkey,
        
        // Sound
        beep: async () => await soundSystem.playSound(800, 200),
        sound: async (f, d) => await soundSystem.playSound(f, (d / 18.2) * 1000),
        play: async (cmd) => await soundSystem.play(cmd),
        
        // Advanced Sound
        sndopen: _sndOpen,
        sndplay: _sndPlay,
        sndloop: _sndLoop,
        sndclose: _sndClose,
        
        // RGB Color
        rgb32: _rgb32,
        rgba32: _rgba32,
        red32: _red32,
        green32: _green32,
        blue32: _blue32,
        alpha32: _alpha32,
        
        // Performance
        limit: _limit,
        display: _display,
        
        // Advanced Math (existing)
        ceil: _ceil,
        round: _round,
        hypot: _hypot,
        d2r: _d2r,
        r2d: _r2d,
        
        // Extended Math (new from qbjs-main)
        acos: _acos,
        asin: _asin,
        atan2: _atan2,
        fix: _fix,
        sgn: _sgn,
        'int': _int,
        abs: _abs,
        sqr: _sqr,
        log: _log,
        exp: _exp,
        sin: _sin,
        cos: _cos,
        tan: _tan,
        atn: _atn,
        rnd: _rnd,
        
        // String Functions (new from qbjs-main)
        'left$': _left$,
        'right$': _right$,
        'mid$': _mid$,
        'ltrim$': _ltrim$,
        'rtrim$': _rtrim$,
        'trim$': _trim$,
        instr: _instr,
        instrrev: _instrrev,
        'ucase$': _ucase$,
        'lcase$': _lcase$,
        'string$': _string$,
        'space$': _space$,
        asc: _asc,
        'chr$': _chr$,
        len: _len,
        'str$': _str$,
        val: _val,
        
        // System Functions (new from qbjs-main)
        desktopwidth: _desktopWidth,
        desktopheight: _desktopHeight,
        'clipboard$': _clipboard$,
        clipboard: _setClipboard,
        
        // Graphics - PAINT (new from qbjs-main)
        paint: _paint,
        
        // NEW: DRAW command
        draw: _draw,
        
        // NEW: VIEW and WINDOW
        view: _view,
        viewPrint: _viewPrint,
        window: _window,
        
        // NEW: Palette
        palette: _palette,
        paletteUsing: _paletteUsing,
        pcopy: _pcopy,
        
        // NEW: File system
        rename: _rename,
        kill: _kill,
        mkdir: _mkdir,
        rmdir: _rmdir,
        chdir: _chdir,
        files: _files,
        seek: _seek,
        lock: _lock,
        unlock: _unlock,
        resetFiles: _resetFiles,
        
        // NEW: Memory
        poke: _poke,
        
        // NEW: Shell
        shell: _shell,
        
        // NEW: Fullscreen
        fullscreen: _fullscreen,
        
        // NEW: Image destinations
        dest: _dest,
        source: _source,
        font: _font,
        
        // NEW: Memory operations
        memfree: _memfree,
        memcopy: _memcopy,
        memfill: _memfill,
        
        // NEW: Alpha/Transparency
        setAlpha: _setAlpha,
        clearColor: _clearColor,
        
        // Time
        timer,
        'date$': dateStr,
        'time$': timeStr,
        sleep,
        delay,
        
        // State accessors
        get CSRLIN() { return cursorRow; },
        get POS() { return cursorCol; },
        screenWidth: () => 80,
        screenHeight: () => 25,
        
        // Internal
        _keyBuffer: '',
        _fgColor: fgColor,
        _bgColor: bgColor
    };

    // =========================================================================
    // MOUSE HANDLER
    // =========================================================================
    
    let mouseX = 0;
    let mouseY = 0;
    let mouseButtons = 0;
    let _mouseScroll = 0;

    // Mouse event handlers - optimized with RAF throttling
    // Cache button mapping for efficiency
    const BUTTON_MAP_DOWN = [1, 4, 2]; // JS button -> QB mask for mousedown
    const BUTTON_MAP_UP = [~1, ~4, ~2]; // JS button -> QB mask for mouseup (inverted)
    
    // Throttle mousemove with RAF for smooth performance
    let _mouseMoveQueued = false;
    let _lastMouseEvent = null;
    
    function _processMouseMove() {
        _mouseMoveQueued = false;
        if (!_lastMouseEvent) return;
        
        const e = _lastMouseEvent;
        if (!canvas || canvas.style.display === 'none') {
            const rect = screen.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / 9) | 0;
            mouseY = ((e.clientY - rect.top) / 18) | 0;
        } else {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mouseX = ((e.clientX - rect.left) * scaleX) | 0;
            mouseY = ((e.clientY - rect.top) * scaleY) | 0;
        }
    }
    
    document.addEventListener('mousemove', (e) => {
        _lastMouseEvent = e;
        if (!_mouseMoveQueued) {
            _mouseMoveQueued = true;
            requestAnimationFrame(_processMouseMove);
        }
    }, { passive: true });

    document.addEventListener('mousedown', (e) => {
        // QB: 1=Left, 2=Right, 4=Middle
        // JS: 0=Left, 1=Middle, 2=Right
        const mask = BUTTON_MAP_DOWN[e.button];
        if (mask) mouseButtons |= mask;
    }, { passive: true });

    document.addEventListener('mouseup', (e) => {
        const mask = BUTTON_MAP_UP[e.button];
        if (mask) mouseButtons &= mask;
    }, { passive: true });
    
    document.addEventListener('contextmenu', e => e.preventDefault());

    function _mouseInput() {
        // QB64's _MOUSEINPUT returns true if there is new input, 
        // effectively mostly used to poll. In our event-driven system, 
        // we can just return -1 (True) always or manage a queue.
        // For simplicity, we just return -1.
        return -1; 
    }

    function _mouseWheel() {
        const val = _mouseScroll;
        _mouseScroll = 0; // Reset after reading
        return val;
    }

    function _mouseHide() {
        document.body.style.cursor = 'none';
        if (canvas) canvas.style.cursor = 'none';
    }

    function _mouseShow(style) {
        const cursorStyle = style || 'default';
        document.body.style.cursor = cursorStyle;
        if (canvas) canvas.style.cursor = cursorStyle;
    }

    // Mouse wheel event - passive for better performance
    document.addEventListener('wheel', (e) => {
        _mouseScroll += e.deltaY > 0 ? 1 : -1;
    }, { passive: true });

    // =========================================================================
    // ADVANCED KEYBOARD HANDLER
    // =========================================================================
    
    const keysDown = new Set();
    let keyHitBuffer = [];
    // keyBuffer is already declared at line 34 in the STATE section
    
    // Map special keys to QBasic scan codes
    const specialKeys = {
        'ArrowUp': '\x00H',
        'ArrowDown': '\x00P',
        'ArrowLeft': '\x00K',
        'ArrowRight': '\x00M',
        'Home': '\x00G',
        'End': '\x00O',
        'PageUp': '\x00I',
        'PageDown': '\x00Q',
        'Insert': '\x00R',
        'Delete': '\x00S',
        'F1': '\x00;', 'F2': '\x00<', 'F3': '\x00=', 'F4': '\x00>',
        'F5': '\x00?', 'F6': '\x00@', 'F7': '\x00A', 'F8': '\x00B',
        'F9': '\x00C', 'F10': '\x00D', 'F11': '\x00\x85', 'F12': '\x00\x86',
        'Enter': '\r',
        'Escape': '\x1b',
        'Backspace': '\b',
        'Tab': '\t'
    };
    
    // Keyboard event listeners with buffer limits
    const MAX_KEY_BUFFER_SIZE = 256; // Limit buffer size to prevent memory bloat
    const MAX_INKEY_BUFFER_SIZE = 64;
    
    document.addEventListener('keydown', (e) => {
        const keyCode = e.keyCode || e.which;
        keysDown.add(keyCode);
        
        // Limit keyHitBuffer size
        if (keyHitBuffer.length < MAX_KEY_BUFFER_SIZE) {
            keyHitBuffer.push(keyCode);
        }
        
        // Add to INKEY$ buffer with size limit
        if (keyBuffer.length < MAX_INKEY_BUFFER_SIZE) {
            if (specialKeys[e.key]) {
                keyBuffer += specialKeys[e.key];
            } else if (e.key.length === 1) {
                keyBuffer += e.key;
            }
        }
        
        // Prevent default for arrow keys and other game keys to avoid scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const keyCode = e.keyCode || e.which;
        keysDown.delete(keyCode);
    });
    
    // inkey function is already defined at line 729

    function _keyDown(keyCode) {
        // Check if a key is currently held down
        // QB64 uses scan codes, we'll support both
        return keysDown.has(keyCode) ? -1 : 0;
    }

    function _keyHit() {
        // Return the next key from buffer, or 0 if empty
        if (keyHitBuffer.length > 0) {
            return keyHitBuffer.shift();
        }
        return 0;
    }

    function _keyClear(_buffer) {
        // Clear all key buffers - use .length = 0 for better performance
        keyHitBuffer.length = 0;
        keyBuffer = '';
        keysDown.clear();
    }

    // =========================================================================
    // ADVANCED IMAGE HANDLING
    // =========================================================================
    
    const images = new Map(); // Image handles
    const MAX_IMAGES = 100; // Limit number of loaded images
    let nextImageId = -1000; // Negative IDs for user images
    
    // Helper to enforce image limit
    function _enforceImageLimit() {
        if (images.size >= MAX_IMAGES) {
            // Remove oldest image (first entry)
            const oldestId = images.keys().next().value;
            const oldImg = images.get(oldestId);
            if (oldImg) {
                if (oldImg.canvas) {
                    oldImg.canvas.width = 0;
                    oldImg.canvas.height = 0;
                }
                oldImg.ctx = null;
            }
            images.delete(oldestId);
            console.warn('[QBasic Runtime] Image limit reached, oldest image removed');
        }
    }

    async function _loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                _enforceImageLimit(); // Ensure we don't exceed limit
                const id = nextImageId--;
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                images.set(id, {
                    canvas: tempCanvas,
                    ctx: tempCtx,
                    width: img.width,
                    height: img.height
                });
                resolve(id);
            };
            img.onerror = () => resolve(-1); // Return -1 on error
            img.src = url;
        });
    }

    function _newImage(width, height, _mode) {
        _enforceImageLimit(); // Ensure we don't exceed limit
        const id = nextImageId--;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        // Fill with black by default
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, width, height);
        images.set(id, {
            canvas: tempCanvas,
            ctx: tempCtx,
            width: width,
            height: height
        });
        return id;
    }

    function _copyImage(srcId) {
        const src = images.get(srcId);
        if (!src) return -1;
        
        _enforceImageLimit(); // Ensure we don't exceed limit
        const id = nextImageId--;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = src.width;
        tempCanvas.height = src.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(src.canvas, 0, 0);
        images.set(id, {
            canvas: tempCanvas,
            ctx: tempCtx,
            width: src.width,
            height: src.height
        });
        return id;
    }

    function _freeImage(imageId) {
        const img = images.get(imageId);
        if (img) {
            // Release canvas memory by setting dimensions to 0
            if (img.canvas) {
                img.canvas.width = 0;
                img.canvas.height = 0;
            }
            img.ctx = null;
            images.delete(imageId);
        }
    }

    function _putImage(dx1, dy1, dx2, dy2, srcId, dstId, sx1, sy1, sx2, sy2) {
        // Get source image
        const src = srcId ? images.get(srcId) : null;
        const srcCanvas = src ? src.canvas : canvas;
        
        // Get destination context
        let dstCtx = ctx;
        if (dstId && images.has(dstId)) {
            dstCtx = images.get(dstId).ctx;
        }
        
        if (!srcCanvas || !dstCtx) return;
        
        // Calculate dimensions
        const srcW = sx2 !== undefined ? Math.abs(sx2 - sx1) : srcCanvas.width;
        const srcH = sy2 !== undefined ? Math.abs(sy2 - sy1) : srcCanvas.height;
        const dstW = dx2 !== undefined ? Math.abs(dx2 - dx1) : srcW;
        const dstH = dy2 !== undefined ? Math.abs(dy2 - dy1) : srcH;
        
        dstCtx.drawImage(
            srcCanvas,
            sx1 || 0, sy1 || 0, srcW, srcH,
            dx1 || 0, dy1 || 0, dstW, dstH
        );
    }

    function _printString(x, y, text) {
        if (!ctx) return;
        ctx.fillStyle = COLORS[fgColor % 16];
        ctx.font = '16px monospace';
        ctx.fillText(text, x, y + 16); // +16 for baseline
    }

    // =========================================================================
    // ADVANCED SOUND HANDLING
    // =========================================================================
    
    const sounds = new Map();
    const MAX_SOUNDS = 32; // Limit number of loaded sounds
    let nextSoundId = 1;
    
    // Helper to enforce sound limit
    function _enforceSoundLimit() {
        if (sounds.size >= MAX_SOUNDS) {
            // Remove oldest sound (first entry)
            const oldestId = sounds.keys().next().value;
            const oldAudio = sounds.get(oldestId);
            if (oldAudio) {
                try {
                    oldAudio.pause();
                    oldAudio.removeAttribute('src');
                    oldAudio.load();
                } catch (_e) { /* ignore */ }
            }
            sounds.delete(oldestId);
            console.warn('[QBasic Runtime] Sound limit reached, oldest sound removed');
        }
    }

    async function _sndOpen(filename) {
        return new Promise((resolve) => {
            _enforceSoundLimit(); // Ensure we don't exceed limit
            
            const audio = new Audio(filename);
            
            // Use one-time event handlers
            const onReady = () => {
                audio.removeEventListener('canplaythrough', onReady);
                audio.removeEventListener('error', onError);
                const id = nextSoundId++;
                sounds.set(id, audio);
                resolve(id);
            };
            
            const onError = () => {
                audio.removeEventListener('canplaythrough', onReady);
                audio.removeEventListener('error', onError);
                resolve(-1);
            };
            
            audio.addEventListener('canplaythrough', onReady, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.src = filename;
        });
    }

    function _sndPlay(sid) {
        const audio = sounds.get(sid);
        if (audio) {
            audio.currentTime = 0;
            audio.loop = false;
            audio.play();
        }
    }

    function _sndLoop(sid) {
        const audio = sounds.get(sid);
        if (audio) {
            audio.currentTime = 0;
            audio.loop = true;
            audio.play();
        }
    }

    function _sndClose(sid) {
        const audio = sounds.get(sid);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            sounds.delete(sid);
        }
    }

    // =========================================================================
    // RGB COLOR FUNCTIONS
    // =========================================================================
    
    function _rgb32(r, g, b, a) {
        if (a === undefined) a = 255;
        return ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
    }

    function _rgba32(r, g, b, a) {
        return _rgb32(r, g, b, a);
    }

    function _red32(rgb) {
        return (rgb >> 16) & 0xFF;
    }

    function _green32(rgb) {
        return (rgb >> 8) & 0xFF;
    }

    function _blue32(rgb) {
        return rgb & 0xFF;
    }

    function _alpha32(rgb) {
        return (rgb >> 24) & 0xFF;
    }

    // =========================================================================
    // PERFORMANCE CONTROLS
    // =========================================================================
    
    let _limitFps = 0;
    let lastFrameTime = 0;

    async function _limit(fps) {
        if (fps <= 0) return;
        
        const frameTime = 1000 / fps;
        const now = performance.now();
        const elapsed = now - lastFrameTime;
        
        if (elapsed < frameTime) {
            await sleep(frameTime - elapsed);
        }
        lastFrameTime = performance.now();
    }

    function _display() {
        // In browser, canvas auto-displays. This is a no-op but included for compatibility.
        // Could be used for double-buffering in future.
    }

    // =========================================================================
    // ADVANCED MATH FUNCTIONS
    // =========================================================================
    
    function _ceil(x) {
        return Math.ceil(x);
    }

    function _round(x) {
        return Math.round(x);
    }

    function _hypot(x, y) {
        return Math.hypot(x, y);
    }

    function _d2r(degrees) {
        return degrees * (Math.PI / 180);
    }

    function _r2d(radians) {
        return radians * (180 / Math.PI);
    }

    // =========================================================================
    // QUEST HUD
    // =========================================================================
    
    function updateQuestHud(visible, quest = null) {
        const hud = document.getElementById('quest-hud');
        const title = document.getElementById('quest-title');
        const desc = document.getElementById('quest-desc');
        
        if (!hud) return;
        
        hud.style.display = visible ? 'block' : 'none';
        if (quest) {
            title.textContent = quest.title || 'OBJECTIVE';
            desc.textContent = quest.objective || '';
        }
    }

    // =========================================================================
    // MESSAGE HANDLER
    // =========================================================================
    
    window.addEventListener('message', async (event) => {
        const message = event.data;

        switch (message.type) {
            case 'execute':
                // =========================================================
                // RESOURCE CLEANUP - Essential for stability
                // =========================================================
                
                // Stop all sounds and reset audio system
                soundSystem.reset();
                
                // Clear all images from memory - release canvas resources
                for (const [_id, img] of images) {
                    try {
                        if (img.canvas) {
                            img.canvas.width = 0;
                            img.canvas.height = 0;
                        }
                        if (img.ctx) {
                            img.ctx = null;
                        }
                    } catch (_e) { /* ignore */ }
                }
                images.clear();
                
                // Clear image buffers (GET/PUT) - ImageData doesn't need explicit cleanup
                imageBuffers.clear();
                _nextBufferId = 1;
                
                // Close all audio handles - properly release audio resources
                for (const [_id, audio] of sounds) {
                    try {
                        audio.pause();
                        audio.removeAttribute('src');
                        audio.load(); // Reset audio element
                    } catch (_e) { /* ignore */ }
                }
                sounds.clear();
                nextSoundId = 1;
                
                // Clear VFS file handles
                for (const key of Object.keys(fileHandles)) {
                    delete fileHandles[key];
                }
                
                // Clear keyboard/mouse state
                keysDown.clear();
                keyHitBuffer.length = 0; // Faster than reassigning
                _mouseScroll = 0;
                mouseButtons = 0;
                _lastMouseEvent = null;
                _mouseMoveQueued = false;
                
                // Cancel any pending print batch
                if (printBatchTimer) {
                    cancelAnimationFrame(printBatchTimer);
                    printBatchTimer = null;
                }
                printBatch = null;
                
                // Clear and reset SpanPool
                SpanPool.clear();
                
                // Clear caches to free memory (they will repopulate on use)
                _glowCache.clear();
                _colorRGBCache.clear();
                
                // Clear screen - use textContent for faster DOM clear
                screen.textContent = '';
                
                // Reset state
                cursorRow = 1;
                cursorCol = 1;
                fgColor = 7;
                bgColor = 0;
                keyBuffer = '';
                lastFrameTime = 0;
                lastX = 0;
                lastY = 0;
                nextImageId = -1000;
                
                // Clear graphics canvas
                if (ctx && canvas) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                // Clear temp canvas to free memory
                if (_tempCanvas) {
                    _tempCanvas.width = 0;
                    _tempCanvas.height = 0;
                }
                
                // Show running indicator
                print('▶ RUNNING: ' + message.filename, true);
                print('', true);
                
                try {
                    // Execute the transpiled code using indirect eval
                    // This allows the async IIFE to run properly
                    (0, eval)(message.code);
                } catch (err) {
                    showError(err.message);
                    console.error('[QBasic Runtime]', err);
                    vscode.postMessage({ type: 'error', content: err.message });
                }
                break;

            case 'clear':
                cls();
                break;

            case 'start_quest':
                updateQuestHud(true, message.quest);
                break;

            case 'quest_complete': {
                const desc = document.getElementById('quest-desc');
                if (desc) {
                    desc.innerHTML = '<span style="color:#0f0">✅ MISSION COMPLETE!</span>';
                }
                break;
            }
        }
    });

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    console.log('[QBasic Nexus] Runtime v1.1.0 loaded (Extended Edition)');
    vscode.postMessage({ type: 'ready' });

    // UX Hint for Audio Context
    function showActivationHint() {
        const hint = document.createElement('div');
        hint.id = 'activation-hint';
        hint.textContent = '🔊 CLICK SCREEN TO START';
        hint.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:#0f0;padding:5px 10px;font-family:monospace;z-index:9999;border:1px solid #0f0;font-size:12px;pointer-events:none;transition:opacity 0.5s;';
        document.body.appendChild(hint);

        const removeHint = () => {
             hint.style.opacity = '0';
             setTimeout(() => {
                 if (hint.parentNode) hint.parentNode.removeChild(hint);
             }, 500);
             document.removeEventListener('click', removeHint);
             document.removeEventListener('keydown', removeHint);
        };
        
        document.addEventListener('click', removeHint);
        document.addEventListener('keydown', removeHint);
    }
    showActivationHint();

})();
