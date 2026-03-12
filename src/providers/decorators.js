'use strict';

const vscode = require('vscode');

// Matches: _RGB32(r, g, b), _RGBA32(r, g, b, a), _RGB(r, g, b), _RGBA(r, g, b, a)
const COLOR_PATTERN = /\b(_RGB32|_RGBA32|_RGB|_RGBA)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/gi;

class QBasicColorProvider {
  /**
   * Provide colors for the current document.
   * This is called by VS Code to find colors in the document to display color boxes next to them.
   */
  provideDocumentColors(document, token) {
    const colors = [];
    const text = document.getText();
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
  provideColorPresentations(color, context, token) {
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

function updateDecorations(editor) {
  if (!editor || editor.document.languageId !== 'qbasic') {
    return;
  }

  const text = editor.document.getText();
  const todoOptions = [];
  const fixmeOptions = [];
  const noteOptions = [];

  const extractRegex = /(?:'|\bREM\b).*?\b(TODO|FIXME|FIXIT|HACK|BUG|NOTE)\b.*$/gim;
  let match;
  while ((match = extractRegex.exec(text))) {
    const keyword = match[1].toUpperCase();
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + match[0].length);
    const decoration = { range: new vscode.Range(startPos, endPos) };

    if (keyword === 'TODO') {
      todoOptions.push(decoration);
    } else if (keyword === 'FIXME' || keyword === 'FIXIT' || keyword === 'HACK' || keyword === 'BUG') {
      fixmeOptions.push(decoration);
    } else if (keyword === 'NOTE') {
      noteOptions.push(decoration);
    }
  }

  editor.setDecorations(todoDecorationType, todoOptions);
  editor.setDecorations(fixmeDecorationType, fixmeOptions);
  editor.setDecorations(noteDecorationType, noteOptions);
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
}

module.exports = {
  QBasicColorProvider,
  activateDecorators
};
