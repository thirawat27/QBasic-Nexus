/**
 * Test Variable Declaration Issues
 * Tests that all variables are properly declared before use
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const InternalTranspiler = require('../src/compiler/transpiler');

function makeProgramRunnable(code) {
    const marker = '\n(async () => {';
    const markerIndex = code.lastIndexOf(marker);

    if (markerIndex === -1) {
        throw new Error('Could not locate generated program entrypoint');
    }

    return (
        code.slice(0, markerIndex + 1) +
        'return ' +
        code.slice(markerIndex + 1)
    );
}

function createTestRuntime(options, output) {
    const files = Object.create(null);
    const handles = Object.create(null);
    const directories = new Set(['/']);
    let currentDir = '/';
    let dirMatches = [];
    let dirIndex = 0;

    function normalizePath(filename) {
        const raw = String(filename ?? '').trim().replace(/\\/g, '/');
        if (!raw) return '';

        const combined = raw.startsWith('/')
            ? raw
            : (currentDir.endsWith('/') ? currentDir : currentDir + '/') + raw;
        const parts = combined.split('/');
        const normalized = [];

        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') {
                normalized.pop();
            } else {
                normalized.push(part);
            }
        }

        return '/' + normalized.join('/');
    }

    function trackParentDirs(filename) {
        const normalized = normalizePath(filename);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        directories.add('/');
        for (let i = 0; i < parts.length - 1; i++) {
            current += '/' + parts[i];
            directories.add(current);
        }
    }

    function ensureHandle(fileNum) {
        const key = Number(fileNum) || 1;
        if (!handles[key] && options.fileInput !== undefined && key === 1) {
            handles[key] = {
                filename: '/__inline__',
                mode: 'INPUT',
                content: String(options.fileInput),
                position: 0,
            };
        }
        return handles[key] || null;
    }

    function eof(fileNum) {
        const handle = ensureHandle(fileNum);
        if (!handle) return true;
        return handle.position >= handle.content.length;
    }

    function lof(fileNum) {
        const handle = ensureHandle(fileNum);
        return handle ? handle.content.length : 0;
    }

    function loc(fileNum) {
        const handle = ensureHandle(fileNum);
        return handle ? handle.position : 0;
    }

    function resolveOffset(handle, position) {
        if (position === undefined || position === null) {
            return Math.max(0, Math.floor(Number(handle.position) || 0));
        }

        const numeric = Math.max(1, Math.floor(Number(position) || 1));
        if (handle.mode === 'RANDOM' && handle.recordLength > 0) {
            return (numeric - 1) * handle.recordLength;
        }
        return numeric - 1;
    }

    function normalizeAccess(mode, access) {
        const explicit =
            access === undefined || access === null
                ? ''
                : String(access).toUpperCase().trim();
        if (explicit === 'READ' || explicit === 'WRITE' || explicit === 'READ WRITE') {
            return explicit;
        }
        if (mode === 'INPUT') return 'READ';
        if (mode === 'OUTPUT' || mode === 'APPEND') return 'WRITE';
        return 'READ WRITE';
    }

    function assertReadable(handle) {
        if (!handle) throw new Error('File is not open.');
        if (handle.access === 'WRITE') {
            throw new Error('File is not open for reading.');
        }
    }

    function assertWritable(handle) {
        if (!handle) throw new Error('File is not open.');
        if (handle.access === 'READ') {
            throw new Error('File is not open for writing.');
        }
    }

    function overwriteHandleData(handle, offset, data) {
        const start = Math.max(0, Math.floor(Number(offset) || 0));
        const payload = String(data ?? '');

        if (start > handle.content.length) {
            handle.content += ' '.repeat(start - handle.content.length) + payload;
            return;
        }

        handle.content =
            handle.content.slice(0, start) +
            payload +
            handle.content.slice(start + payload.length);
    }

    function fieldRecordLength(handle) {
        if (!handle?.fields || handle.fields.length === 0) return 0;
        return handle.fields.reduce(
            (total, field) => total + Math.max(0, Math.floor(Number(field.length) || 0)),
            0,
        );
    }

    function serializeValue(handle, value) {
        let serialized = String(value ?? '');
        const recordLength = Math.max(
            0,
            Math.floor(Number(handle?.recordLength || fieldRecordLength(handle)) || 0),
        );

        if (handle?.mode === 'RANDOM' && recordLength > 0) {
            serialized =
                serialized.length >= recordLength
                    ? serialized.slice(0, recordLength)
                    : serialized.padEnd(recordLength, ' ');
        }

        return serialized;
    }

    function readChunk(handle, offset, length) {
        const start = Math.max(0, Math.floor(Number(offset) || 0));
        const recordLength = Math.max(
            0,
            Math.floor(Number(handle?.recordLength || fieldRecordLength(handle)) || 0),
        );
        const effectiveLength =
            length === undefined || length === null
                ? recordLength > 0
                    ? recordLength
                    : Math.max(0, handle.content.length - start)
                : Math.max(0, Math.floor(Number(length) || 0));
        return handle.content.slice(start, start + effectiveLength);
    }

    function inputToken(fileNum) {
        const handle = ensureHandle(fileNum);
        if (!handle) return '';

        while (handle.position < handle.content.length) {
            const ch = handle.content[handle.position];
            if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === ',') {
                handle.position++;
            } else {
                break;
            }
        }

        if (handle.position >= handle.content.length) {
            throw new Error('Input past end of file');
        }

        if (handle.content[handle.position] === '"') {
            handle.position++;
            let value = '';
            while (handle.position < handle.content.length) {
                const ch = handle.content[handle.position];
                if (ch === '"') {
                    if (handle.content[handle.position + 1] === '"') {
                        value += '"';
                        handle.position += 2;
                        continue;
                    }
                    handle.position++;
                    return value;
                }
                value += ch;
                handle.position++;
            }
            return value;
        }

        const start = handle.position;
        while (handle.position < handle.content.length) {
            const ch = handle.content[handle.position];
            if (ch === ',' || ch === '\r' || ch === '\n') break;
            handle.position++;
        }

        return handle.content.slice(start, handle.position).trim();
    }

    function inputLine(fileNum) {
        const handle = ensureHandle(fileNum);
        if (!handle) return '';
        if (handle.position >= handle.content.length) {
            throw new Error('Input past end of file');
        }

        const newlineIndex = handle.content.indexOf('\n', handle.position);
        const end = newlineIndex === -1 ? handle.content.length : newlineIndex;
        const line = handle.content.slice(handle.position, end).replace(/\r$/, '');
        handle.position = newlineIndex === -1 ? handle.content.length : newlineIndex + 1;
        return line;
    }

    const runtime = {
        print(text) {
            output.push(String(text));
            return text;
        },
        input() {
            return Promise.resolve(options.userInput ?? '0');
        },
        cls() {},
        error(message) {
            throw new Error(message);
        },
        async open(filename, mode, fileNum, recordLength, fileOptions) {
            const normalized = normalizePath(filename);
            const openMode = String(mode || 'INPUT').toUpperCase();
            const content = files[normalized] ?? '';
            handles[fileNum] = {
                filename: normalized,
                mode: openMode,
                content: openMode === 'OUTPUT' ? '' : content,
                position: openMode === 'APPEND' ? content.length : 0,
                recordLength: Math.max(0, Math.floor(Number(recordLength) || 0)),
                fields: null,
                access: normalizeAccess(openMode, fileOptions?.access),
                shared: Boolean(fileOptions?.shared),
                lockMode:
                    fileOptions?.lockMode === undefined || fileOptions?.lockMode === null
                        ? null
                        : String(fileOptions.lockMode),
            };
        },
        async close(fileNum) {
            const handle = ensureHandle(fileNum);
            if (!handle) return;

            if (
                handle.mode === 'OUTPUT' ||
                handle.mode === 'APPEND' ||
                handle.mode === 'BINARY' ||
                handle.mode === 'RANDOM'
            ) {
                trackParentDirs(handle.filename);
                files[handle.filename] = handle.content;
            }
            delete handles[fileNum];
        },
        async printFile(fileNum, text) {
            const handle = ensureHandle(fileNum);
            if (!handle) return;
            assertWritable(handle);
            const content = String(text ?? '');
            handle.content =
                handle.content.slice(0, handle.position) +
                content +
                handle.content.slice(handle.position);
            handle.position += content.length;
        },
        async writeFile(fileNum, ...values) {
            const encoded = values
                .map((value) =>
                    typeof value === 'string'
                        ? '"' + String(value).replace(/"/g, '""') + '"'
                        : String(value),
                )
                .join(',') + '\n';
            await this.printFile(fileNum, encoded);
        },
        inputFile() {
            return Promise.resolve(inputLine(1));
        },
        inputFileLine(fileNum) {
            const handle = ensureHandle(fileNum);
            assertReadable(handle);
            return Promise.resolve(inputLine(fileNum));
        },
        inputFileToken(fileNum) {
            const handle = ensureHandle(fileNum);
            assertReadable(handle);
            return Promise.resolve(inputToken(fileNum));
        },
        inputFileChars(count, fileNum) {
            const handle = ensureHandle(fileNum);
            if (!handle) return '';
            assertReadable(handle);
            const length = Math.max(0, Math.floor(Number(count) || 0));
            const end = Math.min(handle.position + length, handle.content.length);
            const chunk = handle.content.slice(handle.position, end);
            handle.position = end;
            return chunk;
        },
        field(fileNum, definitions) {
            const handle = ensureHandle(fileNum);
            if (!handle) return;
            handle.fields = Array.isArray(definitions) ? definitions : [];
            const totalLength = fieldRecordLength(handle);
            if (totalLength > 0 && (!handle.recordLength || handle.recordLength < totalLength)) {
                handle.recordLength = totalLength;
            }
        },
        async putFileValue(fileNum, position, value) {
            const handle = ensureHandle(fileNum);
            if (!handle) return;
            assertWritable(handle);
            const payload =
                value === undefined
                    ? serializeValue(
                        handle,
                        handle.fields
                            .map((field) =>
                                String(field.get?.() ?? '')
                                    .padEnd(field.length)
                                    .slice(0, field.length),
                            )
                            .join(''),
                    )
                    : String(value ?? '');
            const offset = resolveOffset(handle, position);
            overwriteHandleData(handle, offset, payload);
            handle.position = offset + payload.length;
        },
        async getFileValue(fileNum, position, length) {
            const handle = ensureHandle(fileNum);
            if (!handle) return '';
            assertReadable(handle);
            const offset = resolveOffset(handle, position);
            const chunk = readChunk(handle, offset, length);
            handle.position = offset + chunk.length;
            return chunk;
        },
        async getFileFields(fileNum, position) {
            const handle = ensureHandle(fileNum);
            if (!handle) return;
            assertReadable(handle);
            const offset = resolveOffset(handle, position);
            const chunk = readChunk(
                handle,
                offset,
                handle.recordLength || fieldRecordLength(handle),
            );
            let fieldOffset = 0;
            for (const field of handle.fields || []) {
                const width = Math.max(0, Math.floor(Number(field.length) || 0));
                const slice = chunk.slice(fieldOffset, fieldOffset + width).padEnd(width);
                field.set?.(slice);
                fieldOffset += width;
            }
            handle.position = offset + chunk.length;
        },
        seek(fileNum, pos) {
            const handle = ensureHandle(fileNum);
            if (handle) {
                handle.position = resolveOffset(handle, pos);
            }
        },
        eof(fileNum) {
            return eof(fileNum);
        },
        lof(fileNum) {
            return lof(fileNum);
        },
        loc(fileNum) {
            return loc(fileNum);
        },
        freefile() {
            let candidate = 1;
            while (handles[candidate]) candidate++;
            return candidate;
        },
        fileexists(filename) {
            return Object.prototype.hasOwnProperty.call(files, normalizePath(filename));
        },
        direxists(dirname) {
            return directories.has(normalizePath(dirname));
        },
        'dir$'(spec) {
            if (spec !== undefined && String(spec).length > 0) {
                const pattern = String(spec)
                    .replace(/[.+^$()|[\]{}\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.');
                const regex = new RegExp('^' + pattern + '$', 'i');
                const prefix = currentDir === '/' ? '/' : currentDir + '/';
                dirMatches = Object.keys(files)
                    .filter((name) => name.startsWith(prefix))
                    .map((name) => name.slice(prefix.length))
                    .filter((name) => name.length > 0 && !name.includes('/'))
                    .filter((name) => regex.test(name))
                    .sort((left, right) => left.localeCompare(right));
                dirIndex = 0;
            } else if (dirMatches.length === 0) {
                return '';
            }

            if (dirIndex >= dirMatches.length) return '';
            return dirMatches[dirIndex++] || '';
        },
        'cwd$'() {
            return currentDir;
        },
        'startdir$'() {
            return '/';
        },
        rename(oldName, newName) {
            const currentName = normalizePath(oldName);
            const nextName = normalizePath(newName);
            if (!Object.prototype.hasOwnProperty.call(files, currentName)) return Promise.resolve();
            trackParentDirs(nextName);
            files[nextName] = files[currentName];
            delete files[currentName];
            return Promise.resolve();
        },
        kill(filename) {
            delete files[normalizePath(filename)];
            return Promise.resolve();
        },
        mkdir(dirname) {
            directories.add(normalizePath(dirname));
            return Promise.resolve();
        },
        rmdir(dirname) {
            directories.delete(normalizePath(dirname));
            return Promise.resolve();
        },
        chdir(dirname) {
            const nextDir = normalizePath(dirname || '.');
            if (!directories.has(nextDir)) {
                throw new Error('Directory not found: ' + String(dirname));
            }
            currentDir = nextDir;
            return Promise.resolve();
        },
        files() {
            return Promise.resolve();
        },
        lock() {},
        unlock() {},
        resetFiles() {
            for (const fileNum of Object.keys(handles)) {
                const handle = handles[fileNum];
                if (
                    handle.mode === 'OUTPUT' ||
                    handle.mode === 'APPEND' ||
                    handle.mode === 'BINARY' ||
                    handle.mode === 'RANDOM'
                ) {
                    files[handle.filename] = handle.content;
                }
                delete handles[fileNum];
            }
            return Promise.resolve();
        },
        'command$'() {
            return '';
        },
        'environ$'() {
            return '';
        },
    };

    return Object.assign(runtime, options.runtimeOverrides || {});
}

async function runWebProgram(sourceCode, options = {}) {
    const transpiler = new InternalTranspiler();
    const code = transpiler.transpile(sourceCode, 'web', {
        sourcePath: options.sourcePath,
    });
    const runnableCode = makeProgramRunnable(code);
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const output = [];

    globalThis.runtime = createTestRuntime(options, output);

    try {
        await new AsyncFunction(runnableCode)();
    } finally {
        delete globalThis.runtime;
    }

    return { code, output, runtime: globalThis.runtime };
}

// Test cases that previously caused "x is not defined" errors
const testCases = [
    {
        name: 'Simple assignment without DIM',
        code: `
            x = 10
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'Variable used in expression',
        code: `
            y = x + 5
            PRINT y
        `,
        shouldWork: true
    },
    {
        name: 'Array assignment without DIM',
        code: `
            arr(0) = 10
            arr(1) = 20
            PRINT arr(0)
        `,
        shouldWork: true
    },
    {
        name: 'Struct member assignment',
        code: `
            player.x = 100
            player.y = 200
            PRINT player.x
        `,
        shouldWork: true
    },
    {
        name: 'FOR loop variable',
        code: `
            FOR i = 1 TO 10
                PRINT i
            NEXT i
        `,
        shouldWork: true
    },
    {
        name: 'Multiple variables in expression',
        code: `
            result = a + b * c
            PRINT result
        `,
        shouldWork: true
    },
    {
        name: 'Variable in IF condition',
        code: `
            IF x > 10 THEN
                PRINT "Greater"
            END IF
        `,
        shouldWork: true
    },
    {
        name: 'String variable',
        code: `
            name$ = "John"
            PRINT name$
        `,
        shouldWork: true
    },
    {
        name: 'Complex expression',
        code: `
            total = price * quantity + tax
            PRINT total
        `,
        shouldWork: true
    },
    {
        name: 'Nested array access',
        code: `
            matrix(0, 0) = 1
            matrix(0, 1) = 2
            PRINT matrix(0, 0)
        `,
        shouldWork: true
    },
    {
        name: 'FOR loop variable remains accessible after NEXT',
        code: `
            FOR x = 1 TO 3
            NEXT x
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'Variable assigned inside IF remains accessible after block',
        code: `
            IF 1 THEN
                x = 10
            END IF
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'User-defined FUNCTION call resolves awaited value in web runtime',
        code: `
            FUNCTION Add(a, b)
                Add = a + b
            END FUNCTION
            PRINT Add(1, 2)
        `,
        shouldWork: true,
        expectedOutput: ['3']
    },
    {
        name: 'Recursive FUNCTION calls still work inside function bodies',
        code: `
            FUNCTION Fact(n)
                IF n <= 1 THEN
                    Fact = 1
                ELSE
                    Fact = n * Fact(n - 1)
                END IF
            END FUNCTION
            PRINT Fact(5)
        `,
        shouldWork: true,
        expectedOutput: ['120']
    },
    {
        name: 'GOSUB shares variable updates with caller scope',
        code: `
            x = 1
            GOSUB test
            PRINT x
            END
            test:
            x = 2
            RETURN
        `,
        shouldWork: true,
        expectedOutput: ['2']
    },
    {
        name: 'Multi-dimensional array assignment writes the addressed element',
        code: `
            DIM matrix(1, 1)
            matrix(0, 1) = 2
            PRINT matrix(0, 1)
        `,
        shouldWork: true,
        expectedOutput: ['2']
    },
    {
        name: 'INPUT # preserves read value for undeclared variables',
        code: `
            INPUT #1, x
            PRINT x
        `,
        shouldWork: true,
        expectedOutput: ['42'],
        fileInput: '42'
    },
    {
        name: 'Fixed-length string truncates assigned values',
        code: `
            DIM code AS STRING * 4
            code = "ABCDEFG"
            PRINT code
        `,
        shouldWork: true,
        expectedOutput: ['ABCD']
    },
    {
        name: 'Nested TYPE preserves fixed-length child fields',
        code: `
            TYPE Address
                Street AS STRING * 5
            END TYPE
            TYPE Person
                Name AS STRING * 10
                Home AS Address
            END TYPE

            DIM user AS Person
            user.Name = "Christopher"
            user.Home.Street = "Lane"
            PRINT user.Name
            PRINT user.Home.Street
        `,
        shouldWork: true,
        expectedOutput: ['Christophe', 'Lane ']
    },
    {
        name: 'Virtual memory supports PEEK, POKE, OUT, WAIT, and INP',
        code: `
            POKE 32, 255
            OUT 123, 7
            WAIT 123, 7
            PRINT PEEK(32)
            PRINT INP(123)
        `,
        shouldWork: true,
        expectedOutput: ['255', '7']
    },
    {
        name: 'STATIC variables persist across SUB calls',
        code: `
            SUB CountHits
                STATIC hits AS INTEGER
                hits = hits + 1
                PRINT hits
            END SUB

            CALL CountHits
            CALL CountHits
        `,
        shouldWork: true,
        expectedOutput: ['1', '2']
    },
    {
        name: 'COMMON SHARED exposes globals inside SUB scopes',
        code: `
            COMMON SHARED total AS INTEGER

            SUB AddOne
                total = total + 1
            END SUB

            CALL AddOne
            CALL AddOne
            PRINT total
        `,
        shouldWork: true,
        expectedOutput: ['2']
    },
    {
        name: 'Trampoline resumes after GOSUB inside IF blocks',
        code: `
            x = 1
            IF x = 1 THEN
                GOSUB worker
                PRINT "after"
            END IF
            END

            worker:
            PRINT "inside"
            RETURN
        `,
        shouldWork: true,
        expectedOutput: ['inside', 'after']
    },
    {
        name: 'Trampoline handles repeated GOTO loops without recursion',
        code: `
            count = 0
start:
            count = count + 1
            IF count < 3 THEN GOTO start
            PRINT count
        `,
        shouldWork: true,
        expectedOutput: ['3']
    },
    {
        name: 'SELECT CASE works inside AST/trampoline bodies',
        code: `
            value = 2
 entry:
            SELECT CASE value
                CASE 1
                    PRINT "one"
                CASE 2 TO 3
                    PRINT "few"
                CASE ELSE
                    PRINT "other"
            END SELECT
        `,
        shouldWork: true,
        expectedOutput: ['few']
    },
    {
        name: 'ON GOTO jumps to the selected label in trampoline mode',
        code: `
            choice = 2
            ON choice GOTO firstLabel, secondLabel
            PRINT "fallthrough"
            END

 firstLabel:
            PRINT "first"
            END

 secondLabel:
            PRINT "second"
        `,
        shouldWork: true,
        expectedOutput: ['second']
    },
    {
        name: 'ON GOSUB pushes a return address and resumes execution',
        code: `
            choice = 2
            ON choice GOSUB firstTask, secondTask
            PRINT "after"
            END

 firstTask:
            PRINT "first"
            RETURN

 secondTask:
            PRINT "second"
            RETURN
        `,
        shouldWork: true,
        expectedOutput: ['second', 'after']
    },
    {
        name: 'Nested FOR loops support NEXT with multiple variables',
        code: `
            count = 0
            FOR i = 1 TO 2
                FOR j = 1 TO 2
                    count = count + 1
                NEXT j, i
            PRINT count
        `,
        shouldWork: true,
        expectedOutput: ['4']
    },
    {
        name: 'ON ERROR GOTO handler traps runtime errors and RESUME NEXT continues',
        code: `
            ON ERROR GOTO handler
            PRINT "before"
            ERROR 5
            PRINT "after"
            END

handler:
            PRINT "handled"
            RESUME NEXT
        `,
        shouldWork: true,
        expectedOutput: ['before', 'handled', 'after']
    },
    {
        name: 'ERR and ERL report the trapped error code and source line',
        code:
            'ON ERROR GOTO handler\n' +
            'PRINT "before"\n' +
            'ERROR 9\n' +
            'PRINT "after"\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n' +
            'RESUME NEXT\n',
        shouldWork: true,
        expectedOutput: ['before', '9', '3', 'after']
    },
    {
        name: 'ON ERROR RESUME NEXT skips failing statements automatically',
        code: `
            ON ERROR RESUME NEXT
            PRINT "before"
            ERROR 5
            PRINT "after"
        `,
        shouldWork: true,
        expectedOutput: ['before', 'after']
    },
    {
        name: 'Division by zero raises QB error 11 and preserves the fault line',
        code:
            'ON ERROR GOTO handler\n' +
            'PRINT "before"\n' +
            'x = 10 / 0\n' +
            'PRINT "after"\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n' +
            'RESUME NEXT\n',
        shouldWork: true,
        expectedOutput: ['before', '11', '3', 'after']
    },
    {
        name: 'RESUME label transfers control to the requested label',
        code: `
            ON ERROR GOTO handler
            PRINT "before"
            ERROR 5
            PRINT "skipped"
            END

handler:
            PRINT "handled"
            RESUME recovery

recovery:
            PRINT "recover"
        `,
        shouldWork: true,
        expectedOutput: ['before', 'handled', 'recover']
    },
    {
        name: 'Integer division truncates toward zero like QB64',
        code: 'PRINT -5 \\ 2',
        shouldWork: true,
        expectedOutput: ['-2']
    },
    {
        name: 'CINT uses banker\'s rounding like QB64',
        code: 'PRINT CINT(2.5)\nPRINT CINT(3.5)\nPRINT CINT(-2.5)\nPRINT CINT(-3.5)',
        shouldWork: true,
        expectedOutput: ['2', '4', '-2', '-4']
    },
    {
        name: 'CINT overflow raises QB error 6 with the fault line',
        code:
            'ON ERROR GOTO handler\n' +
            'PRINT "before"\n' +
            'PRINT CINT(40000)\n' +
            'PRINT "after"\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n' +
            'RESUME NEXT\n',
        shouldWork: true,
        expectedOutput: ['before', '6', '3', 'after']
    },
    {
        name: 'Typed INTEGER assignments coerce array elements with QB-style rounding',
        code:
            'DIM values(1) AS INTEGER\n' +
            'values(1) = 3.5\n' +
            'PRINT values(1)\n',
        shouldWork: true,
        expectedOutput: ['4']
    },
    {
        name: 'Typed SINGLE assignments coerce string inputs to numeric values',
        code:
            'DIM ratio AS SINGLE\n' +
            'ratio = "3.25"\n' +
            'PRINT ratio + 1\n',
        shouldWork: true,
        expectedOutput: ['4.25']
    },
    {
        name: 'TYPE assignments copy coerced fields instead of aliasing the source object',
        code:
            'TYPE Counter\n' +
            '    Value AS INTEGER\n' +
            'END TYPE\n' +
            'DIM src AS Counter\n' +
            'DIM dst AS Counter\n' +
            'src.Value = 2.5\n' +
            'dst = src\n' +
            'src.Value = 9\n' +
            'PRINT dst.Value\n' +
            'PRINT src.Value\n',
        shouldWork: true,
        expectedOutput: ['2', '9']
    },
    {
        name: 'VAL parses QB-style hexadecimal and D-exponent prefixes',
        code: 'PRINT VAL("&HFF")\nPRINT VAL("1.5D2")\nPRINT VAL("ABC")',
        shouldWork: true,
        expectedOutput: ['255', '150', '0']
    },
    {
        name: 'OPEN rejects invalid file numbers with QB error 64',
        code:
            'ON ERROR GOTO handler\n' +
            'OPEN "demo.txt" FOR OUTPUT AS #0\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n',
        shouldWork: true,
        expectedOutput: ['64', '2']
    },
    {
        name: 'INPUT # reports bad file mode on write-only handles',
        code:
            'ON ERROR GOTO handler\n' +
            'OPEN "demo.txt" FOR OUTPUT AS #1\n' +
            'INPUT #1, x\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n',
        shouldWork: true,
        expectedOutput: ['54', '3']
    },
    {
        name: 'INPUT # reports QB error 61 when reading past EOF',
        code:
            'ON ERROR GOTO handler\n' +
            'OPEN "demo.txt" FOR OUTPUT AS #1\n' +
            'WRITE #1, 42\n' +
            'CLOSE #1\n' +
            'OPEN "demo.txt" FOR INPUT AS #1\n' +
            'INPUT #1, x\n' +
            'INPUT #1, y\n' +
            'END\n' +
            '\n' +
            'handler:\n' +
            'PRINT ERR\n' +
            'PRINT ERL\n',
        shouldWork: true,
        expectedOutput: ['61', '7']
    },
    {
        name: 'Procedure-local ON ERROR handlers stay isolated inside SUB bodies',
        code: `
            SUB Demo
                ON ERROR RESUME NEXT
                PRINT "sub-before"
                ERROR 7
                PRINT "sub-after"
            END SUB

            CALL Demo
            PRINT "main-after"
        `,
        shouldWork: true,
        expectedOutput: ['sub-before', 'sub-after', 'main-after']
    },
    {
        name: 'POINT returns plotted color and current graphics position',
        code: `
            SCREEN 12
            PSET (10, 12), 4
            PRINT POINT(10, 12)
            PRINT POINT(0)
            PRINT POINT(1)
        `,
        shouldWork: true,
        expectedOutput: ['4', '10', '12']
    },
    {
        name: 'CRT graphics helpers stay callable through the web runtime bindings',
        code: `
            SCREEN 13
            PAINT (10, 10), 4, 1
            DRAW "R10"
            VIEW (1, 1)-(10, 10), 2, 3
            VIEW
            VIEW PRINT 2 TO 20
            WINDOW (0, 0)-(100, 100)
            PALETTE 1, 10
            PCOPY 0, 1
            PRINT "graphics-ok"
        `,
        shouldWork: true,
        expectedOutput: ['graphics-ok'],
        setup() {
            const calls = [];
            const record = (name, isAsync = false) =>
                isAsync
                    ? async (...args) => {
                        calls.push([name, ...args.map((arg) => arg === undefined ? null : arg)]);
                    }
                    : (...args) => {
                        calls.push([name, ...args.map((arg) => arg === undefined ? null : arg)]);
                    };

            return {
                calls,
                runtimeOverrides: {
                    paint: record('paint'),
                    draw: record('draw', true),
                    view: record('view'),
                    viewPrint: record('viewPrint'),
                    window: record('window'),
                    palette: record('palette'),
                    pcopy: record('pcopy'),
                },
            };
        },
        verify(_result, setupResult) {
            const actual = JSON.stringify(setupResult.calls);
            const expected = JSON.stringify([
                ['paint', 10, 10, 4, 1],
                ['draw', 'R10'],
                ['view', 1, 1, 10, 10, 2, 3],
                ['view'],
                ['viewPrint', 2, 20],
                ['window', 0, 0, 100, 100, false],
                ['palette', 1, 10],
                ['pcopy', 0, 1],
            ]);
            if (actual !== expected) {
                throw new Error(`Expected runtime calls ${expected}, got ${actual}`);
            }
        },
    },
    {
        name: 'QB64 screen helper bindings execute without missing runtime references',
        code: `
            _FULLSCREEN
            _DEST 1
            _SOURCE 2
            _FONT 3
            _SETALPHA 128, 1
            _CLEARCOLOR 4
            PRINT "helpers-ok"
        `,
        shouldWork: true,
        expectedOutput: ['helpers-ok'],
        setup() {
            const calls = [];
            const record = (name) => (...args) => {
                calls.push([name, ...args.map((arg) => arg === undefined ? null : arg)]);
            };

            return {
                calls,
                runtimeOverrides: {
                    fullscreen: record('fullscreen'),
                    dest: record('dest'),
                    source: record('source'),
                    font: record('font'),
                    setAlpha: record('setAlpha'),
                    clearColor: record('clearColor'),
                },
            };
        },
        verify(_result, setupResult) {
            const actual = JSON.stringify(setupResult.calls);
            const expected = JSON.stringify([
                ['fullscreen', 0],
                ['dest', 1],
                ['source', 2],
                ['font', 3, null],
                ['setAlpha', 128, 1, null, null, null],
                ['clearColor', 4, null],
            ]);
            if (actual !== expected) {
                throw new Error(`Expected runtime calls ${expected}, got ${actual}`);
            }
        },
    },
    {
        name: 'Clipboard write statement routes through the web runtime clipboard hook',
        code: `
            _CLIPBOARD = "Copied"
            PRINT "clipboard-ok"
        `,
        shouldWork: true,
        expectedOutput: ['clipboard-ok'],
        setup() {
            const calls = [];
            return {
                calls,
                runtimeOverrides: {
                    clipboard(text) {
                        calls.push(['clipboard', text]);
                        return Promise.resolve();
                    },
                },
            };
        },
        verify(_result, setupResult) {
            const actual = JSON.stringify(setupResult.calls);
            const expected = JSON.stringify([['clipboard', 'Copied']]);
            if (actual !== expected) {
                throw new Error(`Expected runtime calls ${expected}, got ${actual}`);
            }
        },
    },
    {
        name: 'LINE INPUT # and token-based INPUT # read from opened files',
        code: `
            f = FREEFILE
            OPEN "notes.txt" FOR OUTPUT AS #f
            PRINT #f, "first line"
            PRINT #f, "second line"
            CLOSE #f

            OPEN "notes.txt" FOR INPUT AS #f
            LINE INPUT #f, a$
            INPUT #f, b$
            CLOSE #f

            PRINT a$
            PRINT b$
        `,
        shouldWork: true,
        expectedOutput: ['first line', 'second line']
    },
    {
        name: 'INPUT # reads multiple values written by WRITE # with quoted CSV escaping',
        code: `
            f = FREEFILE
            OPEN "values.csv" FOR OUTPUT AS #f
            WRITE #f, "A,B", "Q""R", 12
            CLOSE #f

            OPEN "values.csv" FOR INPUT AS #f
            INPUT #f, a$, b$, n
            CLOSE #f

            PRINT a$
            PRINT b$
            PRINT n
        `,
        shouldWork: true,
        expectedOutput: ['A,B', 'Q"R', '12']
    },
    {
        name: 'INPUT # supports array elements and TYPE member-chain targets',
        code: `
            TYPE Person
                Name AS STRING * 4
            END TYPE

            DIM parts(1) AS STRING * 3
            DIM people(1) AS Person

            f = FREEFILE
            OPEN "assign.csv" FOR OUTPUT AS #f
            WRITE #f, "HELLO", "xy", 7
            CLOSE #f

            OPEN "assign.csv" FOR INPUT AS #f
            INPUT #f, people(1).Name, parts(1), n
            CLOSE #f

            PRINT people(1).Name
            PRINT parts(1)
            PRINT n
        `,
        shouldWork: true,
        expectedOutput: ['HELL', 'xy ', '7']
    },
    {
        name: 'LINE INPUT # supports TYPE member-chain targets',
        code: `
            TYPE NoteLine
                Text AS STRING * 8
            END TYPE

            DIM notes(1) AS NoteLine
            f = FREEFILE
            OPEN "line.txt" FOR OUTPUT AS #f
            PRINT #f, "ABCDE"
            CLOSE #f

            OPEN "line.txt" FOR INPUT AS #f
            LINE INPUT #f, notes(1).Text
            CLOSE #f

            PRINT notes(1).Text
        `,
        shouldWork: true,
        expectedOutput: ['ABCDE   ']
    },
    {
        name: 'File helpers support FREEFILE, INPUT$, LOF, LOC, SEEK, and EOF',
        code: `
            f = FREEFILE
            PRINT f
            OPEN "stream.txt" FOR OUTPUT AS #f
            PRINT #f, "ABCDE"
            CLOSE #f

            OPEN "stream.txt" FOR INPUT AS #f
            PRINT LOF(f)
            PRINT INPUT$(3, f)
            PRINT LOC(f)
            SEEK #f, 2
            PRINT INPUT$(2, f)
            SEEK #f, 4
            tail$ = INPUT$(3, f)
            PRINT LEN(tail$)
            PRINT EOF(f)
            CLOSE #f
        `,
        shouldWork: true,
        expectedOutput: ['1', '6', 'ABC', '3', 'BC', '3', '-1']
    },
    {
        name: 'Directory helpers support MKDIR, CHDIR, NAME, KILL, DIR$, and existence checks',
        code: `
            MKDIR "docs"
            PRINT _DIREXISTS("docs")
            CHDIR "docs"

            f = FREEFILE
            OPEN "alpha.txt" FOR OUTPUT AS #f
            PRINT #f, "A"
            CLOSE #f

            NAME "alpha.txt" AS "beta.txt"
            PRINT _FILEEXISTS("alpha.txt")
            PRINT _FILEEXISTS("beta.txt")
            PRINT DIR$("*.txt")
            PRINT DIR$()

            CHDIR ".."
            KILL "docs/beta.txt"
            PRINT _FILEEXISTS("docs/beta.txt")
        `,
        shouldWork: true,
        expectedOutput: ['-1', '0', '-1', 'beta.txt', '', '0']
    },
    {
        name: 'FIELD with RANDOM files preserves fixed-length records across PUT # and GET #',
        code: `
            f = FREEFILE
            OPEN "records.dat" FOR RANDOM AS #f LEN = 8
            FIELD #f, 3 AS code$, 5 AS name$

            LSET code$ = "AB"
            LSET name$ = "Q"
            PUT #f, 1

            LSET code$ = ""
            LSET name$ = ""
            GET #f, 1

            PRINT code$
            PRINT name$
            CLOSE #f
        `,
        shouldWork: true,
        expectedOutput: ['AB ', 'Q    ']
    },
    {
        name: 'BINARY GET # and PUT # support positional string transfers',
        code: `
            f = FREEFILE
            OPEN "blob.bin" FOR BINARY AS #f
            PUT #f, 1, "HELLO"
            DIM chunk AS STRING * 3
            GET #f, 2, chunk
            PRINT chunk
            CLOSE #f
        `,
        shouldWork: true,
        expectedOutput: ['ELL']
    },
    {
        name: 'BINARY PUT # and GET # preserve typed INTEGER values',
        code: `
            DIM written AS INTEGER
            DIM readBack AS INTEGER
            written = 513

            f = FREEFILE
            OPEN "ints.bin" FOR BINARY AS #f
            PUT #f, 1, written
            GET #f, 1, readBack
            CLOSE #f

            PRINT readBack
        `,
        shouldWork: true,
        expectedOutput: ['513']
    },
    {
        name: 'BINARY PUT # and GET # preserve TYPE records with fixed strings and scalars',
        code: `
            TYPE Record
                Id AS INTEGER
                Tag AS STRING * 4
            END TYPE

            DIM source AS Record
            DIM target AS Record
            source.Id = 258
            source.Tag = "AB"

            f = FREEFILE
            OPEN "record.bin" FOR BINARY AS #f
            PUT #f, 1, source
            GET #f, 1, target
            CLOSE #f

            PRINT target.Id
            PRINT target.Tag
        `,
        shouldWork: true,
        expectedOutput: ['258', 'AB  ']
    },
    {
        name: 'RANDOM GET # and PUT # preserve nested TYPE records',
        code: `
            TYPE Inner
                Count AS INTEGER
            END TYPE

            TYPE Outer
                Child AS Inner
                Tag AS STRING * 4
            END TYPE

            DIM source AS Outer
            DIM target AS Outer
            source.Child.Count = 1025
            source.Tag = "ZX"

            f = FREEFILE
            OPEN "nested.dat" FOR RANDOM AS #f LEN = 6
            PUT #f, 1, source
            GET #f, 1, target
            CLOSE #f

            PRINT target.Child.Count
            PRINT target.Tag
        `,
        shouldWork: true,
        expectedOutput: ['1025', 'ZX  ']
    },
    {
        name: 'GET # supports array elements and TYPE member-chain targets',
        code: `
            TYPE Person
                Name AS STRING * 4
            END TYPE

            DIM parts(1) AS STRING * 3
            DIM people(1) AS Person

            f = FREEFILE
            OPEN "members.bin" FOR BINARY AS #f
            PUT #f, 1, "HELLO"
            GET #f, 2, parts(1)
            GET #f, 1, people(1).Name
            CLOSE #f

            PRINT parts(1)
            PRINT people(1).Name
        `,
        shouldWork: true,
        expectedOutput: ['ELL', 'HELL']
    },
    {
        name: 'READ supports array elements and TYPE member-chain targets',
        code: `
            TYPE Holder
                Code AS STRING * 3
            END TYPE

            DIM holders(1) AS Holder
            DATA "ABCD", 9
            READ holders(1).Code, nums(1)
            PRINT holders(1).Code
            PRINT nums(1)
        `,
        shouldWork: true,
        expectedOutput: ['ABC', '9']
    },
    {
        name: 'OPEN accepts ACCESS and SHARED clauses for binary file workflows',
        code: `
            f = FREEFILE
            OPEN "access.bin" FOR BINARY ACCESS WRITE SHARED AS #f LEN = 4
            PUT #f, 1, "ABCD"
            CLOSE #f

            OPEN "access.bin" FOR BINARY ACCESS READ SHARED AS #f LEN = 4
            PRINT INPUT$(4, f)
            CLOSE #f
        `,
        shouldWork: true,
        expectedOutput: ['ABCD']
    },
    {
        name: 'Opening the same file twice without SHARED raises a runtime error',
        code: `
            ON ERROR GOTO handler
            f1 = FREEFILE
            OPEN "exclusive.bin" FOR BINARY AS #f1
            f2 = FREEFILE
            OPEN "exclusive.bin" FOR BINARY AS #f2
            PRINT "miss"
            END

handler:
            PRINT "exclusive"
        `,
        shouldWork: true,
        expectedOutput: ['exclusive']
    },
    {
        name: 'LOCK prevents overlapping reads on other shared handles until UNLOCK',
        code: `
            ON ERROR GOTO handler
            f1 = FREEFILE
            OPEN "locks.bin" FOR BINARY SHARED AS #f1
            f2 = FREEFILE
            OPEN "locks.bin" FOR BINARY SHARED AS #f2
            LOCK #f1, 2 TO 4

            DIM chunk AS STRING * 2
            GET #f2, 3, chunk
            PRINT "miss"
            END

handler:
            PRINT "locked"
        `,
        shouldWork: true,
        expectedOutput: ['locked']
    },
    {
        name: 'UNLOCK releases explicit byte-range locks for subsequent reads',
        code: `
            f = FREEFILE
            OPEN "unlock.bin" FOR BINARY AS #f
            PUT #f, 1, "ABCDE"
            CLOSE #f

            f1 = FREEFILE
            OPEN "unlock.bin" FOR BINARY SHARED AS #f1
            f2 = FREEFILE
            OPEN "unlock.bin" FOR BINARY SHARED AS #f2
            LOCK #f1, 2 TO 4
            UNLOCK #f1, 2 TO 4

            DIM chunk AS STRING * 2
            GET #f2, 3, chunk
            PRINT chunk
        `,
        shouldWork: true,
        expectedOutput: ['CD']
    },
    {
        name: 'OPEN LOCK READ applies an implicit read lock across shared handles',
        code: `
            f = FREEFILE
            OPEN "implicit.bin" FOR OUTPUT AS #f
            PRINT #f, "ABCD"
            CLOSE #f

            ON ERROR GOTO handler
            f1 = FREEFILE
            OPEN "implicit.bin" FOR BINARY ACCESS READ SHARED LOCK READ AS #f1
            f2 = FREEFILE
            OPEN "implicit.bin" FOR BINARY ACCESS READ SHARED AS #f2
            PRINT "miss"
            END

handler:
            PRINT "implicit"
        `,
        shouldWork: true,
        expectedOutput: ['implicit']
    },
    {
        name: 'RUN restarts the current program in the internal runtime',
        code: `
            IF _FILEEXISTS("rerun.flag") THEN
                PRINT "second"
                KILL "rerun.flag"
            ELSE
                f = FREEFILE
                OPEN "rerun.flag" FOR OUTPUT AS #f
                PRINT #f, "1"
                CLOSE #f
                PRINT "first"
                RUN
            END IF
        `,
        shouldWork: true,
        expectedOutput: ['first', 'second']
    },
    {
        name: 'File statements still work inside AST trampoline bodies',
        code: `
start:
            f = FREEFILE
            OPEN "trampoline.txt" FOR OUTPUT AS #f
            PRINT #f, "ok"
            CLOSE #f
            GOTO done

done:
            PRINT _FILEEXISTS("trampoline.txt")
        `,
        shouldWork: true,
        expectedOutput: ['-1']
    },
    {
        name: 'LSET and RSET statements align fixed-length strings',
        code: `
            DIM lefty AS STRING * 5
            DIM righty AS STRING * 5
            LSET lefty = "A"
            RSET righty = "A"
            PRINT lefty
            PRINT righty
        `,
        shouldWork: true,
        expectedOutput: ['A    ', '    A']
    },
    {
        name: 'LSET and RSET support TYPE members and array elements',
        code: `
            TYPE FixedPair
                Left AS STRING * 4
                Right AS STRING * 4
            END TYPE

            DIM rows(1) AS STRING * 4
            DIM pair AS FixedPair

            LSET rows(1) = "X"
            RSET pair.Right = "Y"
            PRINT rows(1)
            PRINT pair.Right
        `,
        shouldWork: true,
        expectedOutput: ['X   ', '   Y']
    },
    {
        name: 'SWAP supports array elements and TYPE member targets',
        code: `
            TYPE Pair
                Name AS STRING * 4
            END TYPE

            DIM words(1) AS STRING * 4
            DIM pair AS Pair
            words(1) = "LEFT"
            pair.Name = "RIGHT"
            SWAP words(1), pair.Name
            PRINT words(1)
            PRINT pair.Name
        `,
        shouldWork: true,
        expectedOutput: ['RIGH', 'LEFT']
    },
    {
        name: 'SWAP preserves fixed-length coercion on both targets',
        code: `
            DIM shorty AS STRING * 2
            DIM longy AS STRING * 4
            shorty = "AA"
            longy = "BBBB"
            SWAP shorty, longy
            PRINT shorty
            PRINT longy
        `,
        shouldWork: true,
        expectedOutput: ['BB', 'AA  ']
    },
    {
        name: 'Binary conversion functions round-trip standard and generic forms',
        code: `
            PRINT CVI(MKI$(513))
            PRINT CVL(MKL$(70000))
            PRINT INT(CVS(MKS$(1.5)) * 10)
            PRINT INT(CVD(MKD$(2.25)) * 100)
            PRINT _CV("INTEGER", _MK$("INTEGER", 321))
            PRINT _CV("DOUBLE", _MK$("DOUBLE", 3.5))
        `,
        shouldWork: true,
        expectedOutput: ['513', '70000', '15', '225', '321', '3.5']
    },
    {
        name: '$INCLUDE resolves relative to the source file path',
        code: `
            $INCLUDE: "shared.bi"
            PRINT greeting$
        `,
        shouldWork: true,
        setup() {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-include-'));
            const sourcePath = path.join(dir, 'main.bas');
            fs.writeFileSync(
                path.join(dir, 'shared.bi'),
                'greeting$ = "Included"',
                'utf8',
            );
            return {
                sourcePath,
                cleanup() {
                    fs.rmSync(dir, { recursive: true, force: true });
                },
            };
        },
        expectedOutput: ['Included']
    }
];

async function testVariableDeclaration() {
    console.log('🧪 Testing Variable Declaration\n');
    console.log('='.repeat(70));
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
        try {
            const setupResult = typeof test.setup === 'function' ? test.setup() : null;
            // Execute generated web code to catch CRT-style runtime scope errors
            let generatedCode = '';
            try {
                const result = await runWebProgram(test.code, {
                    fileInput: test.fileInput,
                    userInput: test.userInput,
                    sourcePath: setupResult?.sourcePath,
                    runtimeOverrides: setupResult?.runtimeOverrides,
                });
                const { code, output } = result;
                generatedCode = code;

                if (test.expectedOutput) {
                    const actual = JSON.stringify(output);
                    const expected = JSON.stringify(test.expectedOutput);
                    if (actual !== expected) {
                        throw new Error(`Expected output ${expected}, got ${actual}`);
                    }
                }

                if (typeof test.verify === 'function') {
                    await test.verify(result, setupResult);
                }

                console.log(`✅ ${test.name}`);
                passed++;
                
            } catch (evalError) {
                if (evalError.message.includes('is not defined')) {
                    console.log(`❌ ${test.name}`);
                    console.log(`   Error: ${evalError.message}`);
                    console.log(
                        `   Generated code:\n${generatedCode.split('\n').slice(0, 20).join('\n')}`,
                    );
                    failed++;
                } else {
                    throw evalError;
                }
            } finally {
                setupResult?.cleanup?.();
            }
            
        } catch (error) {
            console.log(`❌ ${test.name}`);
            console.log(`   Transpiler error: ${error.message}`);
            failed++;
        }
        
        console.log('');
    }
    
    console.log('='.repeat(70));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
    
    if (failed === 0) {
        console.log('✅ All tests passed!\n');
        return true;
    } else {
        console.log('❌ Some tests failed\n');
        return false;
    }
}

// Run tests
if (require.main === module) {
    testVariableDeclaration()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error(`❌ Test runner crashed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = {
    testVariableDeclaration,
    makeProgramRunnable,
    createTestRuntime,
    runWebProgram,
};
