'use strict';

let currentPanel;
let asciiChartTemplateCache = null;

const FAVORITE_CODES = Object.freeze([
  24, 25, 26, 27,
  176, 177, 178, 179,
  191, 192, 196, 217, 218, 219, 220, 223,
  227, 228, 236, 241, 242, 248,
]);

function getVscode() {
  return require('vscode');
}

const CONTROL_NAMES = [
  'NUL',
  'SOH',
  'STX',
  'ETX',
  'EOT',
  'ENQ',
  'ACK',
  'BEL',
  'BS',
  'TAB',
  'LF',
  'VT',
  'FF',
  'CR',
  'SO',
  'SI',
  'DLE',
  'DC1',
  'DC2',
  'DC3',
  'DC4',
  'NAK',
  'SYN',
  'ETB',
  'CAN',
  'EM',
  'SUB',
  'ESC',
  'FS',
  'GS',
  'RS',
  'US',
];

const CONTROL_GLYPHS = [
  '␀',
  '☺',
  '☻',
  '♥',
  '♦',
  '♣',
  '♠',
  '•',
  '◘',
  '○',
  '◙',
  '♂',
  '♀',
  '♪',
  '♫',
  '☼',
  '►',
  '◄',
  '↕',
  '‼',
  '¶',
  '§',
  '▬',
  '↨',
  '↑',
  '↓',
  '→',
  '←',
  '∟',
  '↔',
  '▲',
  '▼',
];

const CONTROL_DESCRIPTIONS = [
  'Null',
  'Start of heading',
  'Start of text',
  'End of text',
  'End of transmission',
  'Enquiry',
  'Acknowledge',
  'Bell',
  'Backspace',
  'Horizontal tab',
  'Line feed',
  'Vertical tab',
  'Form feed',
  'Carriage return',
  'Shift out',
  'Shift in',
  'Data link escape',
  'Device control 1',
  'Device control 2',
  'Device control 3',
  'Device control 4',
  'Negative acknowledge',
  'Synchronous idle',
  'End of transmission block',
  'Cancel / Up arrow in CP437',
  'End of medium / Down arrow in CP437',
  'Substitute / Right arrow in CP437',
  'Escape / Left arrow in CP437',
  'File separator / Right angle in CP437',
  'Group separator / Left-right arrow in CP437',
  'Record separator / Up triangle in CP437',
  'Unit separator / Down triangle in CP437',
];

const CP437_EXTENDED_CHARS = [
  'Ç', 'ü', 'é', 'â', 'ä', 'à', 'å', 'ç', 'ê', 'ë', 'è', 'ï', 'î', 'ì', 'Ä', 'Å',
  'É', 'æ', 'Æ', 'ô', 'ö', 'ò', 'û', 'ù', 'ÿ', 'Ö', 'Ü', '¢', '£', '¥', '₧', 'ƒ',
  'á', 'í', 'ó', 'ú', 'ñ', 'Ñ', 'ª', 'º', '¿', '⌐', '¬', '½', '¼', '¡', '«', '»',
  '░', '▒', '▓', '│', '┤', '╡', '╢', '╖', '╕', '╣', '║', '╗', '╝', '╜', '╛', '┐',
  '└', '┴', '┬', '├', '─', '┼', '╞', '╟', '╚', '╔', '╩', '╦', '╠', '═', '╬', '╧',
  '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┘', '┌', '█', '▄', '▌', '▐', '▀',
  'α', 'ß', 'Γ', 'π', 'Σ', 'σ', 'µ', 'τ', 'Φ', 'Θ', 'Ω', 'δ', '∞', 'φ', 'ε', '∩',
  '≡', '±', '≥', '≤', '⌠', '⌡', '÷', '≈', '°', '∙', '·', '√', 'ⁿ', '²', '■', '\u00A0',
];

const CP437_EXTENDED_DESCRIPTIONS = [
  'Latin capital C with cedilla',
  'Latin small u with diaeresis',
  'Latin small e with acute',
  'Latin small a with circumflex',
  'Latin small a with diaeresis',
  'Latin small a with grave',
  'Latin small a with ring above',
  'Latin small c with cedilla',
  'Latin small e with circumflex',
  'Latin small e with diaeresis',
  'Latin small e with grave',
  'Latin small i with diaeresis',
  'Latin small i with circumflex',
  'Latin small i with grave',
  'Latin capital A with diaeresis',
  'Latin capital A with ring above',
  'Latin capital E with acute',
  'Latin small ae ligature',
  'Latin capital AE ligature',
  'Latin small o with circumflex',
  'Latin small o with diaeresis',
  'Latin small o with grave',
  'Latin small u with circumflex',
  'Latin small u with grave',
  'Latin small y with diaeresis',
  'Latin capital O with diaeresis',
  'Latin capital U with diaeresis',
  'Cent sign',
  'Pound sign',
  'Yen sign',
  'Peseta sign',
  'Latin small f with hook',
  'Latin small a with acute',
  'Latin small i with acute',
  'Latin small o with acute',
  'Latin small u with acute',
  'Latin small n with tilde',
  'Latin capital N with tilde',
  'Feminine ordinal indicator',
  'Masculine ordinal indicator',
  'Inverted question mark',
  'Reversed not sign',
  'Not sign',
  'One half',
  'One quarter',
  'Inverted exclamation mark',
  'Left-pointing double angle quote',
  'Right-pointing double angle quote',
  'Light shade',
  'Medium shade',
  'Dark shade',
  'Box drawing light vertical',
  'Box drawing light vertical and left',
  'Box drawing vertical single and left double',
  'Box drawing vertical double and left single',
  'Box drawing down double and left single',
  'Box drawing down single and left double',
  'Box drawing vertical double and left',
  'Box drawing double vertical',
  'Box drawing double down and left',
  'Box drawing double up and left',
  'Box drawing up double and left single',
  'Box drawing up single and left double',
  'Box drawing light down and left',
  'Box drawing light up and right',
  'Box drawing light up and horizontal',
  'Box drawing light down and horizontal',
  'Box drawing light vertical and right',
  'Box drawing light horizontal',
  'Box drawing light vertical and horizontal',
  'Box drawing vertical single and right double',
  'Box drawing vertical double and right single',
  'Box drawing double up and right',
  'Box drawing double down and right',
  'Box drawing double up and horizontal',
  'Box drawing double down and horizontal',
  'Box drawing double vertical and right',
  'Box drawing double horizontal',
  'Box drawing double vertical and horizontal',
  'Box drawing up single and horizontal double',
  'Box drawing up double and horizontal single',
  'Box drawing down single and horizontal double',
  'Box drawing down double and horizontal single',
  'Box drawing up double and right single',
  'Box drawing up single and right double',
  'Box drawing down single and right double',
  'Box drawing down double and right single',
  'Box drawing vertical double and horizontal single',
  'Box drawing vertical single and horizontal double',
  'Box drawing light up and left',
  'Box drawing light down and right',
  'Full block',
  'Lower half block',
  'Left half block',
  'Right half block',
  'Upper half block',
  'Greek alpha',
  'German sharp S',
  'Greek Gamma',
  'Greek pi',
  'Greek Sigma',
  'Greek sigma',
  'Micro sign',
  'Greek tau',
  'Greek Phi',
  'Greek Theta',
  'Greek Omega',
  'Greek delta',
  'Infinity',
  'Greek phi',
  'Greek epsilon',
  'Intersection',
  'Identical to',
  'Plus-minus sign',
  'Greater-than or equal to',
  'Less-than or equal to',
  'Top half integral',
  'Bottom half integral',
  'Division sign',
  'Almost equal to',
  'Degree sign',
  'Bullet operator',
  'Middle dot',
  'Square root',
  'Superscript n',
  'Superscript 2',
  'Black square',
  'Non-breaking space',
];

const PUNCTUATION_DESCRIPTIONS = Object.freeze({
  32: 'Space',
  33: 'Exclamation mark',
  34: 'Quotation mark',
  35: 'Number sign',
  36: 'Dollar sign',
  37: 'Percent sign',
  38: 'Ampersand',
  39: 'Apostrophe',
  40: 'Left parenthesis',
  41: 'Right parenthesis',
  42: 'Asterisk',
  43: 'Plus sign',
  44: 'Comma',
  45: 'Hyphen-minus',
  46: 'Period',
  47: 'Slash',
  58: 'Colon',
  59: 'Semicolon',
  60: 'Less-than sign',
  61: 'Equals sign',
  62: 'Greater-than sign',
  63: 'Question mark',
  64: 'At sign',
  91: 'Left square bracket',
  92: 'Backslash',
  93: 'Right square bracket',
  94: 'Caret',
  95: 'Underscore',
  96: 'Backtick',
  123: 'Left curly brace',
  124: 'Vertical bar',
  125: 'Right curly brace',
  126: 'Tilde',
  127: 'Delete / House symbol in CP437',
});

function getPrintableDescription(code, character) {
  if (PUNCTUATION_DESCRIPTIONS[code]) return PUNCTUATION_DESCRIPTIONS[code];
  if (code >= 48 && code <= 57) return `Digit ${character}`;
  if (code >= 65 && code <= 90) return `Uppercase ${character}`;
  if (code >= 97 && code <= 122) return `Lowercase ${character}`;
  return `Printable ASCII ${character}`;
}

function getTags(code, description) {
  const tags = [];

  if (code <= 31 || code === 127) tags.push('control');
  else if (code <= 126) tags.push('printable');
  else tags.push('extended');

  if ((code >= 176 && code <= 178) || (code >= 219 && code <= 223)) {
    tags.push('blocks');
  }

  if (code >= 179 && code <= 218) tags.push('box');
  if (code >= 224 && code <= 239) tags.push('greek');
  if (code >= 240 && code <= 253) tags.push('math');

  if (
    /arrow|triangle/i.test(description) ||
    [16, 17, 18, 24, 25, 26, 27, 29, 30, 31].includes(code)
  ) {
    tags.push('symbols');
  }

  return tags;
}

function getDisplayCharacter(code, character, shortName) {
  if (code === 32) return 'SP';
  if (code === 255 || character === '\u00A0') return 'NBSP';
  return character || shortName;
}

function buildAsciiEntries() {
  const entries = [];

  for (let code = 0; code <= 255; code++) {
    let character;
    let description;
    let shortName;
    let group;

    if (code <= 31) {
      character = CONTROL_GLYPHS[code];
      description = CONTROL_DESCRIPTIONS[code];
      shortName = CONTROL_NAMES[code];
      group = 'control';
    } else if (code <= 126) {
      character = String.fromCharCode(code);
      description = getPrintableDescription(code, character);
      shortName = character;
      group = 'printable';
    } else if (code === 127) {
      character = '⌂';
      description = PUNCTUATION_DESCRIPTIONS[127];
      shortName = 'DEL';
      group = 'control';
    } else {
      character = CP437_EXTENDED_CHARS[code - 128];
      description = CP437_EXTENDED_DESCRIPTIONS[code - 128];
      shortName = character;
      group = 'extended';
    }

    entries.push({
      code,
      hex: code.toString(16).toUpperCase().padStart(2, '0'),
      character,
      display: getDisplayCharacter(code, character, shortName),
      description,
      shortName,
      group,
      tags: getTags(code, description),
      chrSyntax: `CHR$(${code})`,
    });
  }

  return entries;
}

const ASCII_ENTRIES = buildAsciiEntries();

function getAsciiEntries() {
  return ASCII_ENTRIES;
}

function getAsciiEntry(code) {
  return ASCII_ENTRIES[code] || null;
}

function buildAsciiCopyPayload(entry, copyType) {
  if (!entry) return null;

  switch (copyType) {
    case 'copy-character':
      return {
        text: entry.character,
        statusMessage: `Copied ${entry.display}`,
      };
    case 'copy-chr':
      return {
        text: entry.chrSyntax,
        statusMessage: `Copied ${entry.chrSyntax}`,
      };
    default:
      return null;
  }
}

function createChrQuickPickItem(entry) {
  return {
    code: entry.code,
    label: `${entry.display}  ${entry.chrSyntax}`,
    description: `Dec ${entry.code} • Hex 0x${entry.hex}`,
    detail: entry.description,
  };
}

function buildChrQuickPickItems(entries = ASCII_ENTRIES) {
  return entries.map(createChrQuickPickItem);
}

async function insertChrFromAsciiChart() {
  const vscode = getVscode();
  const favoriteEntries = FAVORITE_CODES.map(getAsciiEntry).filter(Boolean);
  const favoriteCodes = new Set(favoriteEntries.map((entry) => entry.code));
  const allItems = buildChrQuickPickItems(
    ASCII_ENTRIES.filter((entry) => !favoriteCodes.has(entry.code)),
  );
  const items = [];

  if (favoriteEntries.length > 0) {
    items.push({
      label: 'Common QBasic Symbols',
      kind: vscode.QuickPickItemKind.Separator,
    });
    items.push(...favoriteEntries.map(createChrQuickPickItem));
  }

  items.push({
    label: 'All ASCII / CP437 Characters',
    kind: vscode.QuickPickItemKind.Separator,
  });
  items.push(...allItems);

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Insert CHR$() at Cursor',
    placeHolder: 'Search by character, decimal, hex, or description',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked || typeof picked.code !== 'number') return;

  const entry = getAsciiEntry(picked.code);
  if (!entry) return;

  if (await insertIntoEditor(entry.chrSyntax)) {
    setStatusMessage(`Inserted ${entry.chrSyntax}`);
  }
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function loadWebviewTextFile(extensionUri, ...segments) {
  const vscode = getVscode();
  const fileUri = vscode.Uri.joinPath(extensionUri, ...segments);
  const contents = await vscode.workspace.fs.readFile(fileUri);
  return new TextDecoder().decode(contents);
}

async function insertIntoEditor(text) {
  const vscode = getVscode();
  const editor =
    vscode.window.activeTextEditor ||
    vscode.window.visibleTextEditors.find(
      (candidate) => !candidate.document.isClosed,
    );

  if (!editor) {
    vscode.window.showWarningMessage('Open an editor first to insert text.');
    return false;
  }

  const applied = await editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      editBuilder.replace(selection, text);
    }
  });

  if (!applied) {
    vscode.window.showErrorMessage('Failed to insert text into the editor.');
  }

  return applied;
}

function setStatusMessage(message) {
  const vscode = getVscode();
  vscode.window.setStatusBarMessage(message, 2000);
}

async function getAsciiChartHtml(panel, extensionUri) {
  const vscode = getVscode();
  const webview = panel.webview;

  if (!asciiChartTemplateCache) {
    asciiChartTemplateCache = await loadWebviewTextFile(
      extensionUri,
      'src',
      'webview',
      'ascii-chart.html',
    );
  }

  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'ascii-chart.css'),
  );
  const jsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'src',
      'webview',
      'ascii-chart-runtime.js',
    ),
  );
  const logoUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'image', 'QBasicNexus.png'),
  );

  return asciiChartTemplateCache
    .replace(/\{\{cspSource\}\}/g, webview.cspSource)
    .replace(/\{\{cssUri\}\}/g, cssUri.toString())
    .replace(/\{\{jsUri\}\}/g, jsUri.toString())
    .replace(/\{\{logoUri\}\}/g, logoUri.toString())
    .replace('{{asciiDataJson}}', escapeJsonForHtml(ASCII_ENTRIES));
}

async function showAsciiChart(extensionUri) {
  const vscode = getVscode();
  const column =
    vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

  if (currentPanel) {
    currentPanel.title = 'QBasic ASCII Chart';
    currentPanel.webview.html = await getAsciiChartHtml(
      currentPanel,
      extensionUri,
    );
    currentPanel.reveal(column);
    return currentPanel;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'qbasicNexusAsciiChart',
    'QBasic ASCII Chart',
    column,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'src', 'webview'),
        vscode.Uri.joinPath(extensionUri, 'image'),
      ],
    },
  );

  currentPanel.webview.html = await getAsciiChartHtml(currentPanel, extensionUri);

  currentPanel.webview.onDidReceiveMessage(async (message) => {
    const entry = getAsciiEntry(Number(message.code));
    if (!entry) return;

    const payload = buildAsciiCopyPayload(entry, message.type);
    if (!payload) return;

    try {
      await vscode.env.clipboard.writeText(payload.text);
      setStatusMessage(payload.statusMessage);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown clipboard error';
      vscode.window.showErrorMessage(
        `Failed to copy ${entry.chrSyntax}: ${reason}`,
      );
    }
  });

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });

  return currentPanel;
}

module.exports = {
  getAsciiEntries,
  getAsciiEntry,
  buildAsciiCopyPayload,
  buildChrQuickPickItems,
  insertChrFromAsciiChart,
  showAsciiChart,
};
