/**
 * QBasic Nexus - Webview Runtime v2.1
 * ===================================
 * Clean, simple, and reliable CRT runtime for QBasic programs.
 * 
 * @author Thirawat27
 * @version 2.1.0
 */

/* global requestAnimationFrame */

(function() {
    'use strict';

    // =========================================================================
    // VS CODE API & DOM
    // =========================================================================
    
    const vscode = acquireVsCodeApi();
    const screen = document.getElementById('screen');

    // =========================================================================
    // STATE
    // =========================================================================
    
    let cursorRow = 1;
    let cursorCol = 1;
    let fgColor = 7;  // Light gray
    let bgColor = 0;  // Black
    let keyBuffer = '';

    // QBasic 16-color palette (CGA/EGA)
    const COLORS = [
        '#000000', '#0000AA', '#00AA00', '#00AAAA',
        '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
        '#555555', '#5555FF', '#55FF55', '#55FFFF',
        '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ];

    // =========================================================================
    // AUDIO ENGINE (Simple)
    // =========================================================================
    
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    async function playSound(freq, durationMs) {
        if (freq <= 0) {
            return new Promise(r => setTimeout(r, durationMs));
        }
        
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.value = 0.1;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        
        return new Promise(resolve => {
            setTimeout(() => {
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                setTimeout(() => {
                    osc.stop();
                    osc.disconnect();
                    resolve();
                }, 50);
            }, durationMs);
        });
    }

    async function playBeep() {
        await playSound(800, 200);
    }

    // MML PLAY command (simplified)
    async function playMML(commands) {
        getAudioContext(); // Ensure audio context is ready
        let octave = 4;
        let noteLen = 4;
        let tempo = 120;
        
        const noteFreqs = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        
        const str = String(commands).toUpperCase();
        let i = 0;
        
        while (i < str.length) {
            const ch = str[i];
            i++;
            
            if (ch === 'O' && /\d/.test(str[i])) {
                octave = parseInt(str[i]);
                i++;
            } else if (ch === 'L' && /\d/.test(str[i])) {
                let num = '';
                while (/\d/.test(str[i])) num += str[i++];
                noteLen = parseInt(num) || 4;
            } else if (ch === 'T' && /\d/.test(str[i])) {
                let num = '';
                while (/\d/.test(str[i])) num += str[i++];
                tempo = parseInt(num) || 120;
            } else if (ch === 'P' || ch === 'R') {
                let num = '';
                while (/\d/.test(str[i])) num += str[i++];
                const len = parseInt(num) || noteLen;
                const ms = (240000 / tempo) / len;
                await new Promise(r => setTimeout(r, ms));
            } else if (noteFreqs[ch] !== undefined) {
                let semitone = noteFreqs[ch];
                
                // Check for sharp/flat
                if (str[i] === '+' || str[i] === '#') { semitone++; i++; }
                else if (str[i] === '-') { semitone--; i++; }
                
                // Check for length
                let len = noteLen;
                let num = '';
                while (/\d/.test(str[i])) num += str[i++];
                if (num) len = parseInt(num);
                
                // Check for dot
                let dotMult = 1;
                if (str[i] === '.') { dotMult = 1.5; i++; }
                
                const freq = 440 * Math.pow(2, (octave - 4) + (semitone - 9) / 12);
                const ms = ((240000 / tempo) / len) * dotMult;
                
                await playSound(freq, ms * 0.875);
            } else if (ch === '<') {
                octave = Math.max(0, octave - 1);
            } else if (ch === '>') {
                octave = Math.min(8, octave + 1);
            }
        }
    }

    // =========================================================================
    // SCREEN FUNCTIONS
    // =========================================================================
    
    function createSpan(text, fg = fgColor, bg = bgColor) {
        const span = document.createElement('span');
        span.textContent = text;
        span.style.color = COLORS[fg % 16];
        if (bg > 0) {
            span.style.backgroundColor = COLORS[bg % 8];
        }
        return span;
    }

    function print(text, newline = true) {
        const content = String(text);
        const span = createSpan(content + (newline ? '\n' : ''));
        screen.appendChild(span);
        
        // Auto-scroll
        requestAnimationFrame(() => {
            screen.scrollTop = screen.scrollHeight;
        });
        
        // Send to extension for quest checking
        vscode.postMessage({ type: 'check_output', content: content });
    }

    function cls() {
        screen.innerHTML = '';
        cursorRow = 1;
        cursorCol = 1;
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

    function screenMode(mode) {
        // Stub - would change graphics mode
        console.log('SCREEN', mode);
    }

    function setWidth(cols, rows) {
        // Stub
        console.log('WIDTH', cols, rows);
    }

    function showError(msg) {
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
        
        // Input
        input,
        'inkey$': inkey,
        
        // Sound
        beep: playBeep,
        sound: playSound,
        play: playMML,
        
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
        
        if (specialKeys[e.key]) {
            keyBuffer = specialKeys[e.key];
        } else if (e.key.length === 1) {
            keyBuffer = e.key;
        }
    });

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
    
    console.log('[QBasic Nexus] Runtime v2.1 loaded');
    vscode.postMessage({ type: 'ready' });

})();
