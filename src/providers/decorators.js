'use strict';

const vscode = require('vscode');
const {
  mightContainTodoKeyword,
  scanTodoComments,
} = require('../shared/todoComments');

// Matches: _RGB32(r, g, b), _RGBA32(r, g, b, a), _RGB(r, g, b), _RGBA(r, g, b, a)
const COLOR_PATTERN = /\b(_RGB32|_RGBA32|_RGB|_RGBA)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/gi;

class QBasicColorProvider {
  /**
   * Provide colors for the current document.
   * This is called by VS Code to find colors in the document to display color boxes next to them.
   */
  provideDocumentColors(document, _token) {
    const colors = [];
    const text = document.getText();
    const upperText = text.toUpperCase();

    // Fast path: if there are no occurrences of "_RGB", skip everything
    if (!upperText.includes('_RGB')) {
      return colors;
    }

    let match;
    COLOR_PATTERN.lastIndex = 0;
    while ((match = COLOR_PATTERN.exec(text)) !== null) {
      const type = match[1].toUpperCase();
      const isAlpha = type === '_RGBA' || type === '_RGBA32';
      
      const r = parseInt(match[2], 10);
      const g = parseInt(match[3], 10);
      const b = parseInt(match[4], 10);
      let a = 255;
      
      if (isAlpha && match[5] !== undefined) {
        a = parseInt(match[5], 10);
      }

      // Ensure RGB values are within 0-255 range
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && (!isAlpha || (a >= 0 && a <= 255))) {
        // VS Code expects colors to be float values from 0.0 to 1.0
        const color = new vscode.Color(r / 255, g / 255, b / 255, a / 255);
        
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        
        colors.push(new vscode.ColorInformation(range, color));
      }
    }

    return colors;
  }

  /**
   * Provide the string representations of the color when the user picks a new color in the color picker.
   */
  provideColorPresentations(color, context, _token) {
    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    const a = Math.round(color.alpha * 255);

    // Get original text to know if we need RGB or RGBA, and 32-bit or normal
    let originalText = context.document.getText(context.range);
    let is32Bit = originalText.toUpperCase().includes('32');
    let hasAlpha = originalText.toUpperCase().includes('_RGBA');

    let label;
    if (hasAlpha) {
      label = is32Bit ? `_RGBA32(${r}, ${g}, ${b}, ${a})` : `_RGBA(${r}, ${g}, ${b}, ${a})`;
    } else {
      label = is32Bit ? `_RGB32(${r}, ${g}, ${b})` : `_RGB(${r}, ${g}, ${b})`;
    }

    return [new vscode.ColorPresentation(label)];
  }
}

// ── Inline TODO Highlighter ──────────────────────────────────────────────────

let timeout = null;
const decorationCache = new Map();

const todoDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 165, 0, 0.2)', // Orange background
  color: '#ffa500',                          // Orange text
  fontWeight: 'bold',
  borderRadius: '2px'
});

const fixmeDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.2)',   // Red background
  color: '#ff4444',                          // Red text
  fontWeight: 'bold',
  borderRadius: '2px'
});

const noteDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(50, 150, 255, 0.2)', // Blue background
  color: '#4db8ff',                           // Blue text
  fontWeight: 'bold',
  borderRadius: '2px'
});

function setDecorationGroups(editor, groups) {
  editor.setDecorations(todoDecorationType, groups.todoOptions);
  editor.setDecorations(fixmeDecorationType, groups.fixmeOptions);
  editor.setDecorations(noteDecorationType, groups.noteOptions);
}

function buildDecorationGroups(matches) {
  const groups = {
    todoOptions: [],
    fixmeOptions: [],
    noteOptions: [],
  };

  for (const match of matches) {
    const startPos = new vscode.Position(match.line, match.start);
    const endPos = new vscode.Position(match.line, match.end);
    const decoration = { range: new vscode.Range(startPos, endPos) };

    if (match.keyword === 'TODO') {
      groups.todoOptions.push(decoration);
    } else if (
      match.keyword === 'FIXME' ||
      match.keyword === 'FIXIT' ||
      match.keyword === 'HACK' ||
      match.keyword === 'BUG'
    ) {
      groups.fixmeOptions.push(decoration);
    } else if (match.keyword === 'NOTE') {
      groups.noteOptions.push(decoration);
    }
  }

  return groups;
}

function updateDecorations(editor) {
  if (!editor || editor.document.languageId !== 'qbasic') {
    return;
  }

  const cacheKey = editor.document.uri.toString();
  const cached = decorationCache.get(cacheKey);
  if (cached && cached.version === editor.document.version) {
    setDecorationGroups(editor, cached.groups);
    return;
  }

  const text = editor.document.getText();

  // Fast path to completely bypass regex testing if no matched words exist
  if (!mightContainTodoKeyword(text)) {
    const emptyGroups = {
      todoOptions: [],
      fixmeOptions: [],
      noteOptions: [],
    };
    decorationCache.set(cacheKey, {
      version: editor.document.version,
      groups: emptyGroups,
    });
    setDecorationGroups(editor, emptyGroups);
    return;
  }

  const groups = buildDecorationGroups(scanTodoComments(text));
  decorationCache.set(cacheKey, {
    version: editor.document.version,
    groups,
  });
  setDecorationGroups(editor, groups);
}

function triggerUpdateDecorations(editor) {
  if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
  }
  timeout = setTimeout(() => updateDecorations(editor), 300);
}

function activateDecorators(context) {
    let activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
        triggerUpdateDecorations(activeEditor);
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations(activeEditor);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations(activeEditor);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidCloseTextDocument((document) => {
        decorationCache.delete(document.uri.toString());
    }, null, context.subscriptions);
}

module.exports = {
  QBasicColorProvider,
  activateDecorators
};
