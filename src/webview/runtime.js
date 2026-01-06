/**
 * QBasic Nexus - Webview Runtime v1.0.6
 * =====================================
 * Clean, simple, and reliable CRT runtime for QBasic programs.
 * 
 * @author Thirawat27
 * @version 1.0.6
 */

/* global requestAnimationFrame, cancelAnimationFrame, Image, Audio */

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

    // QBasic 16-color palette (CGA/EGA) - frozen for immutability
    const COLORS = Object.freeze([
        '#000000', '#0000AA', '#00AA00', '#00AAAA',
        '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
        '#555555', '#5555FF', '#55FF55', '#55FFFF',
        '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ]);

    // =========================================================================
    // OBJECT POOLING - Reduce GC pressure
    // =========================================================================
    
    const SpanPool = {
        _pool: [],
        _maxSize: 100,
        
        acquire() {
            if (this._pool.length > 0) {
                return this._pool.pop();
            }
            return document.createElement('span');
        },
        
        release(span) {
            if (this._pool.length < this._maxSize) {
                span.textContent = '';
                span.style.cssText = '';
                span.className = '';
                this._pool.push(span);
            }
        },
        
        clear() {
            this._pool.length = 0;
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
        }

        stop() {
            if (this._audioContext) {
                try {
                    this._audioContext.suspend();
                    this._audioContext.close();
                } catch (_e) {
                    // Ignore close errors
                }
                this._audioContext = null;
                this._gainNode = null;
            }
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
            
            if (ctx.state === 'suspended') {
                try {
                    await ctx.resume();
                } catch (_e) {
                    // Ignore, waits for interaction
                }
            }

            // A 0 frequency means a pause
            if (frequency === 0) {
                await this.delay(duration);
                return;
            }
            
            const currentTime = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            
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
            try {
                const stopTime = ctx.currentTime;
                g.gain.linearRampToValueAtTime(0, stopTime + AUDIO_CONSTANTS.RAMP_TIME);
                o.stop(stopTime + AUDIO_CONSTANTS.RAMP_TIME);
            } catch (_e) {
                try { o.stop(); } catch (_e2) { /* ignore */ }
            }
            
            if (pause > 0) {
                await this.delay(pause);
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
            let promise = Promise.resolve();
            let nowait = false;
            
            while (match) {
                let noteValue = null;
                let longerNote = false;
                let temporaryLength = 0;
                
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
                    
                    if (nowait) {
                        this.playSound(freq, duration);
                        nowait = false;
                    } else {
                        await this.playSound(freq, duration);
                    }
                }
                match = reg.exec(commandString);
            }
            
            if (this.foreground) {
                await promise;
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

    function createSpan(text, fg = fgColor, bg = bgColor) {
        const span = SpanPool.acquire();
        span.textContent = text;
        span.style.color = COLORS[fg & 15]; // Bitwise AND faster than modulo
        if (bg > 0) {
            span.style.backgroundColor = COLORS[bg & 7];
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

        // Clear DOM efficiently
        while (screen.firstChild) {
            const child = screen.firstChild;
            screen.removeChild(child);
            // Return spans to pool if applicable
            if (child.tagName === 'SPAN') {
                SpanPool.release(child);
            }
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

    async function vfsPrint(filenum, text) {
        const fh = fileHandles[filenum];
        if (fh) {
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
        const sx = Math.min(x1, x2);
        const sy = Math.min(y1, y2);
        
        const imageData = ctx.getImageData(sx, sy, w, h);
        
        // If id is a string (variable name), use it. numeric check?
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

    function _pset(x, y, c) {
        if (!ctx) return;
        // Bitwise AND is faster than modulo for powers of 2
        ctx.fillStyle = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        ctx.fillRect(x | 0, y | 0, 1, 1); // Bitwise OR 0 for fast floor
        lastX = x;
        lastY = y;
    }

    function _preset(x, y, c) {
        if (!ctx) return;
        // If color omitted, use background (0 usually)
        ctx.fillStyle = c !== undefined ? COLORS[c & 15] : COLORS[0];
        ctx.fillRect(x | 0, y | 0, 1, 1);
        lastX = x;
        lastY = y;
    }

    function _line(x1, y1, x2, y2, c, box, fill) {
        if (!ctx) return;
        
        const colorVal = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        
        // Handle optional start point
        const startX = x1 ?? lastX;
        const startY = y1 ?? lastY;
        
        if (box) {
            const w = x2 - startX;
            const h = y2 - startY;
            
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
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        lastX = x2;
        lastY = y2;
    }

    function _circle(x, y, r, c) {
        if (!ctx) return;
        
        const colorVal = c !== undefined ? COLORS[c & 15] : COLORS[fgColor];
        ctx.strokeStyle = colorVal;
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
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

            // Print prompt
            if (prompt) {
                const promptSpan = createSpan(prompt);
                screen.appendChild(promptSpan);
            }

            // Create input element
            const inputLine = document.createElement('div');
            inputLine.className = 'input-line';
            
            const inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.className = 'cmd-input';
            inputEl.style.color = COLORS[fgColor];
            inputEl.autofocus = true;
            
            inputLine.appendChild(inputEl);
            screen.appendChild(inputLine);
            
            // Focus and scroll
            inputEl.focus();
            screen.scrollTop = screen.scrollHeight;

            inputEl.addEventListener('keydown', function handler(e) {
                if (e.key === 'Enter') {
                    const value = inputEl.value;
                    
                    // Replace input with static text
                    const resultSpan = createSpan(value + '\n');
                    inputLine.replaceWith(resultSpan);
                    
                    resolve(value);
                }
            });
        });
    }

    function inkey() {
        const key = keyBuffer;
        keyBuffer = '';
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
        
        // Advanced Math
        ceil: _ceil,
        round: _round,
        hypot: _hypot,
        d2r: _d2r,
        r2d: _r2d,
        
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

    // Mouse event handlers - use passive where possible for better scroll performance
    // Cache button mapping for efficiency
    const BUTTON_MAP_DOWN = [1, 4, 2]; // JS button -> QB mask for mousedown
    const BUTTON_MAP_UP = [~1, ~4, ~2]; // JS button -> QB mask for mouseup (inverted)
    
    document.addEventListener('mousemove', (e) => {
        if (!canvas || canvas.style.display === 'none') {
            // Text mode approximation - cache rect if needed frequently
            const rect = screen.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / 9) | 0;  // Bitwise OR 0 faster than Math.floor
            mouseY = ((e.clientY - rect.top) / 18) | 0;
        } else {
            // Graphic mode
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mouseX = ((e.clientX - rect.left) * scaleX) | 0;
            mouseY = ((e.clientY - rect.top) * scaleY) | 0;
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
        // Clear all key buffers
        keyHitBuffer = [];
        keyBuffer = '';
        keysDown.clear();
    }

    // =========================================================================
    // ADVANCED IMAGE HANDLING
    // =========================================================================
    
    const images = new Map(); // Image handles
    let nextImageId = -1000; // Negative IDs for user images

    async function _loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
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
        images.delete(imageId);
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
    let nextSoundId = 1;

    async function _sndOpen(filename) {
        return new Promise((resolve) => {
            const audio = new Audio(filename);
            audio.oncanplaythrough = () => {
                const id = nextSoundId++;
                sounds.set(id, audio);
                resolve(id);
            };
            audio.onerror = () => resolve(-1);
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
    // KEYBOARD HANDLER
    // =========================================================================
    
    const specialKeys = {
        'Enter': '\r',
        'Escape': '\x1b',
        'Backspace': '\b',
        'Tab': '\t',
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
        'F1': '\x00;',
        'F2': '\x00<',
        'F3': '\x00=',
        'F4': '\x00>',
        'F5': '\x00?',
        'F6': '\x00@',
        'F7': '\x00A',
        'F8': '\x00B',
        'F9': '\x00C',
        'F10': '\x00D'
    };

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        // Check special keys first (Map lookup is O(1))
        const special = specialKeys[e.key];
        if (special) {
            keyBuffer = special;
        } else if (e.key.length === 1) {
            keyBuffer = e.key;
        }
        
        // Also track for _KEYDOWN function
        keysDown.add(e.keyCode);
        keyHitBuffer.push(e.keyCode);
    });
    
    document.addEventListener('keyup', (e) => {
        keysDown.delete(e.keyCode);
    }, { passive: true });

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
                // Clear screen
                screen.innerHTML = '';
                
                // Reset state
                cursorRow = 1;
                cursorCol = 1;
                fgColor = 7;
                bgColor = 0;
                keyBuffer = '';
                
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
    
    console.log('[QBasic Nexus] Runtime v1.0.2 loaded');
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
