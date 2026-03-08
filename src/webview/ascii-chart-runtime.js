'use strict';

const vscode = acquireVsCodeApi();
const entries = JSON.parse(
  document.getElementById('ascii-data')?.textContent || '[]',
);

const filters = [
  { id: 'all', label: 'All' },
  { id: 'control', label: 'Control' },
  { id: 'printable', label: 'Printable' },
  { id: 'extended', label: 'Extended' },
  { id: 'box', label: 'Box Drawing' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'math', label: 'Math' },
  { id: 'greek', label: 'Greek' },
];

let activeFilter = 'all';
let query = '';
let selectedCode = 218;

const grid = document.getElementById('grid');
const filtersRoot = document.getElementById('filters');
const search = document.getElementById('search');
const previewChar = document.getElementById('previewChar');
const meta = document.getElementById('meta');

function matchesFilter(entry) {
  if (activeFilter === 'all') return true;
  if (activeFilter === entry.group) return true;
  return entry.tags.includes(activeFilter);
}

function matchesQuery(entry) {
  if (!query) return true;

  const haystack = [
    entry.code,
    entry.hex,
    entry.shortName,
    entry.description,
    entry.group,
    entry.tags.join(' '),
    entry.chrSyntax,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function getSelectedEntry() {
  return entries.find((entry) => entry.code === selectedCode) || entries[0];
}

function updateDetails() {
  const entry = getSelectedEntry();
  if (!entry) return;

  previewChar.textContent = entry.display;
  previewChar.title = entry.description;

  meta.innerHTML = [
    ['Decimal', entry.code],
    ['Hex', `0x${entry.hex}`],
    ['Character', entry.character === '\u00A0' ? 'NBSP' : entry.character],
    ['Name', entry.shortName],
    ['Description', entry.description],
    ['QBasic', entry.chrSyntax],
  ]
    .map(
      ([label, value]) =>
        `<div class="ascii-meta__row"><span class="ascii-meta__label">${label}</span><strong class="ascii-meta__value">${value}</strong></div>`,
    )
    .join('');

  for (const card of grid.querySelectorAll('.ascii-card')) {
    card.classList.toggle('is-selected', Number(card.dataset.code) === selectedCode);
  }
}

function renderFilters() {
  filtersRoot.innerHTML = filters
    .map(
      (filter) =>
        `<button type="button" class="ascii-filter${filter.id === activeFilter ? ' is-active' : ''}" data-filter="${filter.id}">${filter.label}</button>`,
    )
    .join('');
}

function renderGrid() {
  const visible = entries.filter(
    (entry) => matchesFilter(entry) && matchesQuery(entry),
  );

  if (visible.length === 0) {
    grid.innerHTML =
      '<div class="ascii-empty">No characters matched the current filter.<br>Try another search term or switch group.</div>';
    return;
  }

  if (!visible.some((entry) => entry.code === selectedCode)) {
    selectedCode = visible[0].code;
  }

  grid.innerHTML = visible
    .map(
      (entry) =>
        `<button type="button" class="ascii-card${entry.code === selectedCode ? ' is-selected' : ''}" data-code="${entry.code}" title="Dec ${entry.code} | Hex 0x${entry.hex} | ${entry.description}"><div class="ascii-card__char">${entry.display}</div><div class="ascii-card__code">${entry.code} / ${entry.hex}</div></button>`,
    )
    .join('');
}

function send(type) {
  vscode.postMessage({ type, code: selectedCode });
}

filtersRoot.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;

  activeFilter = button.dataset.filter;
  renderFilters();
  renderGrid();
  updateDetails();
});

search.addEventListener('input', () => {
  query = search.value.trim().toLowerCase();
  renderGrid();
  updateDetails();
});

grid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-code]');
  if (!card) return;

  selectedCode = Number(card.dataset.code);
  updateDetails();
});

document
  .getElementById('copyChar')
  .addEventListener('click', () => send('copy-character'));
document
  .getElementById('copyChr')
  .addEventListener('click', () => send('copy-chr'));

renderFilters();
renderGrid();
updateDetails();
