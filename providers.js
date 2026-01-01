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
 * 
 * @author Thirawat27
 * @version 1.0.0
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
    BLOCK_MID: /^\s*(?:ELSE|ELSEIF|CASE)\b/i
};

// ============================================================================
// DOCUMENT SYMBOL PROVIDER
// ============================================================================

class QBasicDocumentSymbolProvider {
    provideDocumentSymbols(document) {
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
            new RegExp(`^\\s*CONST\\s+${word}\\b`, 'i')
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
    provideCompletionItems(document) {
        const items = [];

        // Keywords
        for (const [key, data] of Object.entries(KEYWORDS)) {
            const item = new vscode.CompletionItem(data.label, vscode.CompletionItemKind.Keyword);
            item.detail = data.detail;
            item.sortText = `0_${key}`;
            items.push(item);
        }

        // Functions
        for (const [key, data] of Object.entries(FUNCTIONS)) {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Function);
            item.detail = data.detail;
            item.documentation = new vscode.MarkdownString(data.documentation);
            item.insertText = new vscode.SnippetString(this._createSnippet(key, data.params));
            item.sortText = `1_${key}`;
            items.push(item);
        }

        // Variables from document
        const vars = this._scanVariables(document);
        for (const v of vars) {
            const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable);
            item.detail = 'Variable';
            item.sortText = `2_${v}`;
            items.push(item);
        }

        return items;
    }

    _createSnippet(name, params) {
        if (!params || params.length === 0) return name;
        const placeholders = params.map((p, i) => `\${${i + 1}:${p}}`).join(', ');
        return `${name}(${placeholders})`;
    }

    _scanVariables(document) {
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
// EXPORTS
// ============================================================================

module.exports = {
    QBasicDocumentSymbolProvider,
    QBasicDefinitionProvider,
    QBasicCompletionItemProvider,
    QBasicHoverProvider,
    QBasicSignatureHelpProvider,
    QBasicDocumentFormattingEditProvider
};
