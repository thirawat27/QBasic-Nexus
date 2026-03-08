'use strict';

const { CONFIG } = require('../extension/constants');

const LINE_NUMBER_PATTERN = /^\s*\d+\s*/;

function sanitizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getVscode() {
  return require('vscode');
}

function getConfigValue(key, fallback) {
  const { getConfig } = require('../extension/utils');
  return getConfig(key, fallback);
}

function stripLineNumber(line) {
  return LINE_NUMBER_PATTERN.test(line)
    ? line.replace(LINE_NUMBER_PATTERN, '')
    : line;
}

function splitTextLines(text) {
  const eolMatch = text.match(/\r\n|\n/);
  const eol = eolMatch ? eolMatch[0] : '\n';
  const hasTrailingEol = /(?:\r\n|\n)$/.test(text);
  const lines = text.length === 0 ? [''] : text.split(/\r\n|\n/);

  if (hasTrailingEol) lines.pop();

  return { lines, eol, hasTrailingEol };
}

function joinTextLines(lines, eol, hasTrailingEol) {
  const joined = lines.join(eol);
  return hasTrailingEol ? `${joined}${eol}` : joined;
}

function removeLineNumbersInLines(lines) {
  let changed = 0;

  const nextLines = lines.map((line) => {
    const stripped = stripLineNumber(line);
    if (stripped !== line) changed++;
    return stripped;
  });

  return { lines: nextLines, changed };
}

function renumberLinesInLines(lines, options = {}) {
  const start = sanitizePositiveInteger(options.start, 1);
  const step = sanitizePositiveInteger(options.step, 1);

  let current = start;
  let changed = 0;
  let numberedLines = 0;
  let blankLines = 0;

  const nextLines = lines.map((line) => {
    const stripped = stripLineNumber(line);

    if (!stripped.trim()) {
      if (stripped !== line) changed++;
      blankLines++;
      return stripped;
    }

    const renumbered = `${current} ${stripped}`;
    current += step;
    numberedLines++;

    if (renumbered !== line) changed++;

    return renumbered;
  });

  return {
    lines: nextLines,
    changed,
    numberedLines,
    blankLines,
    start,
    step,
  };
}

function removeLineNumbersFromText(text) {
  const { lines, eol, hasTrailingEol } = splitTextLines(text);
  const result = removeLineNumbersInLines(lines);

  return {
    ...result,
    text: joinTextLines(result.lines, eol, hasTrailingEol),
  };
}

function renumberLinesFromText(text, options = {}) {
  const { lines, eol, hasTrailingEol } = splitTextLines(text);
  const result = renumberLinesInLines(lines, options);

  return {
    ...result,
    text: joinTextLines(result.lines, eol, hasTrailingEol),
  };
}

function getActiveQBasicEditor() {
  const vscode = getVscode();
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('Please open a QBasic file first.');
    return null;
  }

  return editor;
}

function getTargetLineRanges(editor) {
  const selections = editor.selections.filter((selection) => !selection.isEmpty);

  if (selections.length === 0) {
    return [{ start: 0, end: editor.document.lineCount - 1 }];
  }

  const ranges = selections
    .map((selection) => {
      const start = selection.start.line;
      let end = selection.end.line;

      if (selection.end.character === 0 && end > start) end--;

      return { start, end: Math.max(start, end) };
    })
    .sort((left, right) => left.start - right.start);

  return ranges.reduce((merged, range) => {
    const previous = merged[merged.length - 1];

    if (!previous || range.start > previous.end + 1) {
      merged.push({ ...range });
      return merged;
    }

    previous.end = Math.max(previous.end, range.end);
    return merged;
  }, []);
}

async function applyLineTransform(editor, transform, buildMessage, emptyMessage) {
  const vscode = getVscode();
  const document = editor.document;
  const lineRanges = getTargetLineRanges(editor);
  const edit = new vscode.WorkspaceEdit();
  const summary = {
    changed: 0,
    touchedLines: 0,
    numberedLines: 0,
    blankLines: 0,
    selectionBlocks: lineRanges.length,
  };

  for (const range of lineRanges) {
    const originalLines = [];

    for (let lineNumber = range.start; lineNumber <= range.end; lineNumber++) {
      originalLines.push(document.lineAt(lineNumber).text);
    }

    const result = transform(originalLines);
    summary.changed += result.changed;
    summary.touchedLines += originalLines.length;
    summary.numberedLines += result.numberedLines || 0;
    summary.blankLines += result.blankLines || 0;

    result.lines.forEach((line, index) => {
      if (line === originalLines[index]) return;
      const targetLine = document.lineAt(range.start + index);
      edit.replace(document.uri, targetLine.range, line);
    });
  }

  if (summary.changed === 0) {
    vscode.window.showInformationMessage(emptyMessage);
    return false;
  }

  const applied = await vscode.workspace.applyEdit(edit);

  if (!applied) {
    vscode.window.showErrorMessage('Failed to update line numbers.');
    return false;
  }

  vscode.window.showInformationMessage(buildMessage(summary));
  return true;
}

async function removeLineNumbers() {
  const editor = getActiveQBasicEditor();
  if (!editor) return;

  await applyLineTransform(
    editor,
    removeLineNumbersInLines,
    (summary) => `Removed line numbers from ${summary.changed} line(s).`,
    'No line numbers were found in the current selection.',
  );
}

async function renumberLines() {
  const editor = getActiveQBasicEditor();
  if (!editor) return;

  const start = sanitizePositiveInteger(
    getConfigValue(CONFIG.LINE_NUMBER_START, 1),
    1,
  );
  const step = sanitizePositiveInteger(
    getConfigValue(CONFIG.LINE_NUMBER_STEP, 1),
    1,
  );

  await applyLineTransform(
    editor,
    (lines) => renumberLinesInLines(lines, { start, step }),
    (summary) =>
      `Renumbered ${summary.numberedLines} line(s) from ${start} with step ${step}.`,
    'Nothing to renumber in the current selection.',
  );
}

module.exports = {
  stripLineNumber,
  removeLineNumbersInLines,
  renumberLinesInLines,
  removeLineNumbersFromText,
  renumberLinesFromText,
  removeLineNumbers,
  renumberLines,
};
