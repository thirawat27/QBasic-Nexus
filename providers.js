/**
 * QBasic Nexus - Language Providers
 * ==================================
 * VS Code Language Feature Providers for QBasic
 * 
 * Features:
 * - Document Symbols (Outline view)
 * - Go to Definition
 * - Auto-completion (IntelliSense)
 * - Hover Information
 * - Signature Help
 * - Document Formatting
 * - Code Folding
 * - Document Highlights
 * - Rename Symbol
 * - Code Actions (Quick Fix)
 * - Reference Provider
 * 
 * @author Thirawat27
 * @version 1.0.6
 * @license MIT
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('./languageData');

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
    SUB_DEF: /^\s*(?:DECLARE\s+)?(SUB|FUNCTION)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    TYPE_DEF: /^\s*TYPE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    CONST_DEF: /^\s*CONST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/i,
    LABEL: /^([a-zA-Z_][a-zA-Z0-9_]*):/,
    DIM: /\bDIM\s+(?:SHARED\s+)?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/gi,
    ASSIGN: /\b([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s*=/g,
    COMMENT: /^\s*(?:'|REM\b)/i,
    DECLARE: /^\s*DECLARE\s+/i,
    BLOCK_START: /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
    BLOCK_END: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i,
    BLOCK_MID: /^\s*(?:ELSE|ELSEIF|CASE)\b/i,
    WORD: /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/g,
    IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_]*/
};

// ============================================================================
// CACHING - Performance Optimization
// ============================================================================

const symbolCache = new Map();
const variableCache = new Map();
const CACHE_TTL = 2000; // 2 seconds

// Pre-built completion items for keywords/functions (immutable, never changes)
let cachedKeywordItems = null;
let cachedFunctionItems = null;

function getKeywordCompletionItems() {
    if (cachedKeywordItems) return cachedKeywordItems;
    cachedKeywordItems = [];
    for (const [key, data] of Object.entries(KEYWORDS)) {
        const item = new vscode.CompletionItem(data.label, vscode.CompletionItemKind.Keyword);
        item.detail = data.detail;
        item.sortText = `0_${key}`;
        cachedKeywordItems.push(item);
    }
    return cachedKeywordItems;
}

function getFunctionCompletionItems() {
    if (cachedFunctionItems) return cachedFunctionItems;
    cachedFunctionItems = [];
    for (const [key, data] of Object.entries(FUNCTIONS)) {
        const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Function);
        item.detail = data.detail;
        item.documentation = new vscode.MarkdownString(data.documentation);
        if (data.params && data.params.length > 0) {
            const placeholders = data.params.map((p, i) => `\${${i + 1}:${p}}`).join(', ');
            item.insertText = new vscode.SnippetString(`${key}(${placeholders})`);
        }
        item.sortText = `1_${key}`;
        cachedFunctionItems.push(item);
    }
    return cachedFunctionItems;
}

function getCachedSymbols(document) {
    const key = document.uri.toString();
    const cached = symbolCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedSymbols(document, data) {
    symbolCache.set(document.uri.toString(), {
        data,
        timestamp: Date.now()
    });
}

function getCachedVariables(document) {
    const key = document.uri.toString();
    const cached = variableCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedVariables(document, data) {
    variableCache.set(document.uri.toString(), {
        data,
        timestamp: Date.now()
    });
}

// Clear cache when document changes
function invalidateCache(uri) {
    const key = uri.toString();
    symbolCache.delete(key);
    variableCache.delete(key);
}

// ============================================================================
// DOCUMENT SYMBOL PROVIDER
// ============================================================================

class QBasicDocumentSymbolProvider {
    provideDocumentSymbols(document) {
        // Check cache first
        const cached = getCachedSymbols(document);
        if (cached) return cached;

        const symbols = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            if (PATTERNS.COMMENT.test(text) || PATTERNS.DECLARE.test(text)) continue;

            let match;

            // SUB/FUNCTION
            if ((match = PATTERNS.SUB_DEF.exec(text))) {
                const kind = match[1].toUpperCase() === 'FUNCTION'
                    ? vscode.SymbolKind.Function
                    : vscode.SymbolKind.Method;
                symbols.push(new vscode.DocumentSymbol(
                    match[2], match[1].toUpperCase(), kind, line.range, line.range
                ));
            }
            // TYPE
            else if ((match = PATTERNS.TYPE_DEF.exec(text))) {
                symbols.push(new vscode.DocumentSymbol(
                    match[1], 'TYPE', vscode.SymbolKind.Struct, line.range, line.range
                ));
            }
            // CONST
            else if ((match = PATTERNS.CONST_DEF.exec(text))) {
                symbols.push(new vscode.DocumentSymbol(
                    match[1], 'CONST', vscode.SymbolKind.Constant, line.range, line.range
                ));
            }
            // Label
            else if ((match = PATTERNS.LABEL.exec(text))) {
                symbols.push(new vscode.DocumentSymbol(
                    match[1], 'Label', vscode.SymbolKind.Event, line.range, line.range
                ));
            }
        }

        setCachedSymbols(document, symbols);
        return symbols;
    }
}

// ============================================================================
// DEFINITION PROVIDER
// ============================================================================

class QBasicDefinitionProvider {
    provideDefinition(document, position) {
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
        if (!wordRange) return null;

        const word = document.getText(wordRange);
        const patterns = [
            new RegExp(`^\\s*(?:SUB|FUNCTION|TYPE)\\s+${word}\\b`, 'i'),
            new RegExp(`^${word}:`, 'i'),
            new RegExp(`^\\s*CONST\\s+${word}\\b`, 'i'),
            new RegExp(`\\bDIM\\s+(?:SHARED\\s+)?${word}\\b`, 'i')
        ];

        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            if (PATTERNS.DECLARE.test(lineText)) continue;

            for (const pattern of patterns) {
                if (pattern.test(lineText)) {
                    return new vscode.Location(document.uri, new vscode.Position(i, 0));
                }
            }
        }

        return null;
    }
}

// ============================================================================
// COMPLETION PROVIDER
// ============================================================================

class QBasicCompletionItemProvider {
    provideCompletionItems(document, _position) {
        // Use pre-cached static items for keywords and functions
        const items = [
            ...getKeywordCompletionItems(),
            ...getFunctionCompletionItems()
        ];

        // Variables from document (dynamic, needs per-document scan)
        const vars = this._scanVariables(document);
        for (const v of vars) {
            const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable);
            item.detail = 'Variable';
            item.sortText = `2_${v}`;
            items.push(item);
        }

        // User-defined SUBs and FUNCTIONs (dynamic, needs per-document scan)
        const symbols = new QBasicDocumentSymbolProvider().provideDocumentSymbols(document);
        for (const sym of symbols) {
            if (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method) {
                const item = new vscode.CompletionItem(sym.name, 
                    sym.kind === vscode.SymbolKind.Function 
                        ? vscode.CompletionItemKind.Function 
                        : vscode.CompletionItemKind.Method
                );
                item.detail = sym.detail;
                item.sortText = `3_${sym.name}`;
                items.push(item);
            }
        }

        return items;
    }

    _createSnippet(name, params) {
        if (!params || params.length === 0) return name;
        const placeholders = params.map((p, i) => `\${${i + 1}:${p}}`).join(', ');
        return `${name}(${placeholders})`;
    }

    _scanVariables(document) {
        // Check cache
        const cached = getCachedVariables(document);
        if (cached) return cached;

        const text = document.getText();
        const vars = new Set();

        // Reset lastIndex
        PATTERNS.DIM.lastIndex = 0;
        PATTERNS.ASSIGN.lastIndex = 0;

        let m;
        while ((m = PATTERNS.DIM.exec(text))) vars.add(m[1]);
        while ((m = PATTERNS.ASSIGN.exec(text))) {
            if (!KEYWORDS[m[1].toUpperCase()]) vars.add(m[1]);
        }

        setCachedVariables(document, vars);
        return vars;
    }
}

// ============================================================================
// HOVER PROVIDER
// ============================================================================

class QBasicHoverProvider {
    provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$]*/);
        if (!range) return null;

        const word = document.getText(range).toUpperCase();

        // Keyword
        if (KEYWORDS[word]) {
            const k = KEYWORDS[word];
            return new vscode.Hover(
                new vscode.MarkdownString(`**${k.label}** *(keyword)*\n\n${k.detail}`)
            );
        }

        // Function
        if (FUNCTIONS[word]) {
            const f = FUNCTIONS[word];
            return new vscode.Hover(
                new vscode.MarkdownString(`**${word}** *(function)*\n\n${f.documentation}`)
            );
        }

        // Check if it's a user-defined SUB/FUNCTION
        const originalWord = document.getText(range);
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            const match = PATTERNS.SUB_DEF.exec(lineText);
            if (match && match[2].toUpperCase() === word) {
                return new vscode.Hover(
                    new vscode.MarkdownString(`**${originalWord}** *(${match[1].toLowerCase()})*\n\nDefined at line ${i + 1}`)
                );
            }
        }

        return null;
    }
}

// ============================================================================
// SIGNATURE HELP PROVIDER
// ============================================================================

class QBasicSignatureHelpProvider {
    provideSignatureHelp(document, position) {
        const lineText = document.lineAt(position).text;
        const textBefore = lineText.substring(0, position.character);

        // Find function call
        const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_$]*)\s*\(([^)]*)$/);
        if (!match) return null;

        const funcName = match[1].toUpperCase();
        const argsText = match[2];
        const funcData = FUNCTIONS[funcName];

        if (!funcData || !funcData.params) return null;

        // Count commas for active parameter
        const commaCount = (argsText.match(/,/g) || []).length;

        const sig = new vscode.SignatureInformation(
            `${funcName}(${funcData.params.join(', ')})`
        );
        sig.parameters = funcData.params.map(p => new vscode.ParameterInformation(p));
        sig.documentation = new vscode.MarkdownString(funcData.documentation);

        const help = new vscode.SignatureHelp();
        help.signatures = [sig];
        help.activeSignature = 0;
        help.activeParameter = Math.min(commaCount, funcData.params.length - 1);

        return help;
    }
}

// ============================================================================
// FORMATTING PROVIDER
// ============================================================================

class QBasicDocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document, options) {
        const edits = [];
        const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
        let level = 0;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const trimmed = line.text.trim();

            if (!trimmed) continue;

            // Decrease indent for END/LOOP/NEXT/WEND or ELSE/CASE
            if (PATTERNS.BLOCK_END.test(trimmed) || PATTERNS.BLOCK_MID.test(trimmed)) {
                level = Math.max(0, level - 1);
            }

            // Apply indent
            const expected = indent.repeat(level);
            const current = line.text.match(/^\s*/)?.[0] || '';

            if (current !== expected) {
                edits.push(vscode.TextEdit.replace(
                    new vscode.Range(i, 0, i, current.length),
                    expected
                ));
            }

            // Increase indent for block start
            if (PATTERNS.BLOCK_START.test(trimmed)) {
                // Single-line IF doesn't increase indent
                if (!/^\s*IF\b/i.test(trimmed) || /\bTHEN\s*$/i.test(trimmed)) {
                    level++;
                }
            }
            // ELSE/ELSEIF/CASE also increase after processing
            else if (PATTERNS.BLOCK_MID.test(trimmed)) {
                level++;
            }
        }

        return edits;
    }
}

// ============================================================================
// FOLDING RANGE PROVIDER
// ============================================================================

class QBasicFoldingRangeProvider {
    provideFoldingRanges(document) {
        const ranges = [];
        const stack = [];

        const foldPatterns = {
            start: /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
            end: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i
        };

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;

            if (foldPatterns.start.test(line)) {
                stack.push(i);
            } else if (foldPatterns.end.test(line)) {
                if (stack.length > 0) {
                    const startLine = stack.pop();
                    if (i > startLine) {
                        ranges.push(new vscode.FoldingRange(startLine, i));
                    }
                }
            }
        }

        // Fold comment blocks
        let commentStart = -1;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            const isComment = PATTERNS.COMMENT.test(line);

            if (isComment && commentStart === -1) {
                commentStart = i;
            } else if (!isComment && commentStart !== -1) {
                if (i - 1 > commentStart) {
                    ranges.push(new vscode.FoldingRange(commentStart, i - 1, vscode.FoldingRangeKind.Comment));
                }
                commentStart = -1;
            }
        }

        return ranges;
    }
}

// ============================================================================
// DOCUMENT HIGHLIGHT PROVIDER
// ============================================================================

class QBasicDocumentHighlightProvider {
    provideDocumentHighlights(document, position) {
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/);
        if (!wordRange) return null;

        const word = document.getText(wordRange);
        const highlights = [];
        const wordPattern = new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi');

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            let match;

            while ((match = wordPattern.exec(line)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + word.length);
                
                // Determine if it's a write or read
                const lineText = line.substring(0, match.index + word.length);
                const isWrite = /\s*=\s*$/.test(line.substring(match.index + word.length)) ||
                                /\bDIM\s+(?:SHARED\s+)?$/i.test(lineText.substring(0, match.index));
                
                highlights.push(new vscode.DocumentHighlight(
                    range, 
                    isWrite ? vscode.DocumentHighlightKind.Write : vscode.DocumentHighlightKind.Read
                ));
            }
        }

        return highlights;
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// ============================================================================
// RENAME PROVIDER
// ============================================================================

class QBasicRenameProvider {
    provideRenameEdits(document, position, newName) {
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/);
        if (!wordRange) return null;

        const oldName = document.getText(wordRange);
        
        // Validate new name
        if (!/^[a-zA-Z_][a-zA-Z0-9_$%!#&]*$/.test(newName)) {
            throw new Error('Invalid identifier name');
        }

        // Check if it's a keyword
        if (KEYWORDS[oldName.toUpperCase()] || KEYWORDS[newName.toUpperCase()]) {
            throw new Error('Cannot rename keywords');
        }

        const edits = new vscode.WorkspaceEdit();
        const wordPattern = new RegExp(`\\b${this._escapeRegex(oldName)}\\b`, 'gi');

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            let match;

            while ((match = wordPattern.exec(line)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + oldName.length);
                edits.replace(document.uri, range, newName);
            }
        }

        return edits;
    }

    prepareRename(document, position) {
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/);
        if (!wordRange) {
            throw new Error('Cannot rename this element');
        }

        const word = document.getText(wordRange);
        
        // Check if it's a keyword or built-in function
        if (KEYWORDS[word.toUpperCase()] || FUNCTIONS[word.toUpperCase()]) {
            throw new Error('Cannot rename keywords or built-in functions');
        }

        return { range: wordRange, placeholder: word };
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// ============================================================================
// CODE ACTION PROVIDER (Quick Fix)
// ============================================================================

class QBasicCodeActionProvider {
    provideCodeActions(document, range, context) {
        const actions = [];

        for (const diagnostic of context.diagnostics) {
            const message = diagnostic.message.toLowerCase();

            // Suggest fixes based on error messages
            if (message.includes('undefined') || message.includes('not defined')) {
                const word = this._extractIdentifier(diagnostic.message);
                if (word) {
                    // Suggest DIM declaration
                    const dimAction = new vscode.CodeAction(
                        `Add 'DIM ${word}'`,
                        vscode.CodeActionKind.QuickFix
                    );
                    dimAction.edit = new vscode.WorkspaceEdit();
                    dimAction.edit.insert(document.uri, new vscode.Position(0, 0), `DIM ${word}\n`);
                    dimAction.diagnostics = [diagnostic];
                    actions.push(dimAction);
                }
            }

            // Suggest THEN for IF without THEN
            if (message.includes('then expected') || message.includes('missing then')) {
                const line = document.lineAt(diagnostic.range.start.line);
                if (/\bIF\b/i.test(line.text) && !/\bTHEN\b/i.test(line.text)) {
                    const thenAction = new vscode.CodeAction(
                        'Add \'THEN\'',
                        vscode.CodeActionKind.QuickFix
                    );
                    thenAction.edit = new vscode.WorkspaceEdit();
                    thenAction.edit.insert(
                        document.uri, 
                        new vscode.Position(diagnostic.range.start.line, line.text.length),
                        ' THEN'
                    );
                    thenAction.diagnostics = [diagnostic];
                    actions.push(thenAction);
                }
            }

            // Suggest END IF for unclosed IF
            if (message.includes('end if') || message.includes('unclosed if')) {
                const endIfAction = new vscode.CodeAction(
                    'Add \'END IF\'',
                    vscode.CodeActionKind.QuickFix
                );
                endIfAction.edit = new vscode.WorkspaceEdit();
                endIfAction.edit.insert(
                    document.uri,
                    new vscode.Position(diagnostic.range.end.line + 1, 0),
                    'END IF\n'
                );
                endIfAction.diagnostics = [diagnostic];
                actions.push(endIfAction);
            }
        }

        // Add refactor actions
        const selectedText = document.getText(range);
        if (selectedText.trim().length > 0 && range.start.line !== range.end.line) {
            // Extract to SUB
            const extractSubAction = new vscode.CodeAction(
                'Extract to SUB',
                vscode.CodeActionKind.RefactorExtract
            );
            extractSubAction.command = {
                command: 'qbasic-nexus.extractToSub',
                title: 'Extract to SUB',
                arguments: [document, range]
            };
            actions.push(extractSubAction);
        }

        return actions;
    }

    _extractIdentifier(message) {
        const match = message.match(/['"]?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)['"]?/);
        return match ? match[1] : null;
    }
}

// ============================================================================
// REFERENCE PROVIDER
// ============================================================================

class QBasicReferenceProvider {
    provideReferences(document, position, context) {
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/);
        if (!wordRange) return null;

        const word = document.getText(wordRange);
        const references = [];
        const wordPattern = new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi');

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            let match;

            while ((match = wordPattern.exec(line)) !== null) {
                // Skip if includeDeclaration is false and this is a declaration
                if (!context.includeDeclaration) {
                    const beforeMatch = line.substring(0, match.index);
                    if (/\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i.test(beforeMatch)) {
                        continue;
                    }
                }

                references.push(new vscode.Location(
                    document.uri,
                    new vscode.Range(i, match.index, i, match.index + word.length)
                ));
            }
        }

        return references;
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// ============================================================================
// ON TYPE FORMATTING PROVIDER
// ============================================================================

class QBasicOnTypeFormattingEditProvider {
    /**
     * Provides on-type formatting edits (triggered after newline)
     * @param {vscode.TextDocument} document 
     * @param {vscode.Position} position 
     * @param {string} ch - The character that triggered formatting
     * @returns {vscode.TextEdit[]}
     */
    provideOnTypeFormattingEdits(document, position, ch) {
        if (ch !== '\n' || position.line === 0) {
            return [];
        }

        const prevLine = document.lineAt(position.line - 1).text;
        const prevTrimmed = prevLine.trim().toUpperCase();
        const indent = prevLine.match(/^\s*/)?.[0] || '';
        const tabUnit = '    '; // 4 spaces

        // Auto-indent after block-starting statements
        const blockStarters = [
            /^IF\b.+\bTHEN\s*$/,        // IF...THEN (multi-line)
            /^FOR\b/,                    // FOR loop
            /^DO\b/,                     // DO loop
            /^WHILE\b/,                  // WHILE loop
            /^SELECT\s+CASE\b/,          // SELECT CASE
            /^SUB\b/,                    // SUB definition
            /^FUNCTION\b/,               // FUNCTION definition
            /^TYPE\b/                    // TYPE definition
        ];

        for (const pattern of blockStarters) {
            if (pattern.test(prevTrimmed)) {
                return [
                    vscode.TextEdit.insert(position, indent + tabUnit)
                ];
            }
        }

        // Maintain indent for CASE statements
        if (/^CASE\b/.test(prevTrimmed)) {
            return [
                vscode.TextEdit.insert(position, indent + tabUnit)
            ];
        }

        // Decrease indent after END/NEXT/LOOP/WEND
        const blockEnders = /^(END\s+(?:IF|SUB|FUNCTION|TYPE|SELECT)|NEXT|LOOP|WEND)\b/;
        if (blockEnders.test(prevTrimmed)) {
            // Maintain same indent as the END statement
            return [
                vscode.TextEdit.insert(position, indent)
            ];
        }

        return [];
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    QBasicDocumentSymbolProvider,
    QBasicDefinitionProvider,
    QBasicCompletionItemProvider,
    QBasicHoverProvider,
    QBasicSignatureHelpProvider,
    QBasicDocumentFormattingEditProvider,
    QBasicFoldingRangeProvider,
    QBasicDocumentHighlightProvider,
    QBasicRenameProvider,
    QBasicCodeActionProvider,
    QBasicReferenceProvider,
    QBasicOnTypeFormattingEditProvider,
    invalidateCache
};
