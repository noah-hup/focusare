const { invoke } = window.__TAURI__.core;

// --- Helpers ---
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relativeTime(secs) {
  const diff = Math.floor(Date.now() / 1000) - secs;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// --- Theme ---
function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  document.getElementById('theme-icon-dark').style.display = light ? 'none' : '';
  document.getElementById('theme-icon-light').style.display = light ? '' : 'none';
}

document.getElementById('theme-toggle-btn').addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('theme-icon-dark').style.display = isLight ? 'none' : '';
  document.getElementById('theme-icon-light').style.display = isLight ? '' : 'none';
  settingsUpdateThemeButtons();
});

// --- Settings panel ---
const COLOR_VARS = [
  ['--bg',             'Background'],
  ['--bg-deep',        'Background deep'],
  ['--surface',        'Surface'],
  ['--surface-raised', 'Surface raised'],
  ['--border',         'Border'],
  ['--border-subtle',  'Border subtle'],
  ['--text',           'Text'],
  ['--text-secondary', 'Text secondary'],
  ['--text-muted',     'Text muted'],
  ['--accent',         'Accent'],
  ['--accent-dim',     'Accent dim'],
  ['--accent-hover',   'Accent hover'],
  ['--danger',         'Danger'],
  ['--danger-dim',     'Danger dim'],
  ['--hover',          'Hover'],
];

const DEFAULT_DARK = {
  '--bg':             '#121212',
  '--bg-deep':        '#0d0d0d',
  '--surface':        '#1a1a1a',
  '--surface-raised': '#222222',
  '--border':         'rgba(255, 255, 255, 0.08)',
  '--border-subtle':  'rgba(255, 255, 255, 0.04)',
  '--text':           '#e8e8e6',
  '--text-secondary': '#a7a7a2',
  '--text-muted':     '#6c6c67',
  '--accent':         '#9a948c',
  '--accent-dim':     'rgba(154,148,140,0.10)',
  '--accent-hover':   '#b0aaa2',
  '--danger':         '#a05f5f',
  '--danger-dim':     'rgba(160,95,95,0.10)',
  '--hover':          'rgba(255, 255, 255, 0.04)',
};

const DEFAULT_LIGHT = {
  '--bg':             '#f8f7f5',
  '--bg-deep':        '#f1efeb',
  '--surface':        '#ffffff',
  '--surface-raised': '#f6f5f3',
  '--border':         'rgba(50, 40, 30, 0.10)',
  '--border-subtle':  'rgba(50, 40, 30, 0.05)',
  '--text':           '#27231f',
  '--text-secondary': '#5c554f',
  '--text-muted':     '#99938c',
  '--accent':         '#8a7b6f',
  '--accent-dim':     'rgba(138,123,111,0.10)',
  '--accent-hover':   '#7a6e63',
  '--danger':         '#b05858',
  '--danger-dim':     'rgba(176,88,88,0.08)',
  '--hover':          'rgba(50, 40, 30, 0.03)',
};

function loadCustomColors() {
  const raw = localStorage.getItem('custom-colors');
  return raw ? JSON.parse(raw) : { dark: {}, light: {} };
}

function saveCustomColors(custom) {
  localStorage.setItem('custom-colors', JSON.stringify(custom));
}

function applyCustomColors() {
  const custom = loadCustomColors();

  let styleEl = document.getElementById('custom-color-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-color-style';
    document.head.appendChild(styleEl);
  }

  const darkLines = COLOR_VARS.filter(([v]) => custom.dark[v])
    .map(([v]) => `  ${v}: ${custom.dark[v]};`).join('\n');
  const lightLines = COLOR_VARS.filter(([v]) => custom.light[v])
    .map(([v]) => `  ${v}: ${custom.light[v]};`).join('\n');

  styleEl.textContent = [
    darkLines  ? `:root:not(.light) {\n${darkLines}\n}`  : '',
    lightLines ? `:root.light {\n${lightLines}\n}` : '',
  ].filter(Boolean).join('\n');
}

// --- Typography ---
const FONT_FAMILIES = {
  'dm-sans':  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'inter':    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'system':   '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'georgia':  'Georgia, "Times New Roman", serif',
  'mono':     '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
};

const DEFAULT_TYPOGRAPHY = { fontFamily: 'dm-sans', fontSizeNotes: 14 };

function loadTypography() {
  const raw = localStorage.getItem('typography');
  return raw ? { ...DEFAULT_TYPOGRAPHY, ...JSON.parse(raw) } : { ...DEFAULT_TYPOGRAPHY };
}

function saveTypography(typo) {
  localStorage.setItem('typography', JSON.stringify(typo));
}

function applyTypography() {
  const typo = loadTypography();
  const fontStack = FONT_FAMILIES[typo.fontFamily] || FONT_FAMILIES['dm-sans'];
  const root = document.documentElement;
  root.style.setProperty('--font', fontStack);
  root.style.setProperty('--font-size-notes', typo.fontSizeNotes + 'px');
}

function syncTypographyControls() {
  const typo = loadTypography();
  const familySel = document.getElementById('settings-font-family');
  const notesSl = document.getElementById('settings-font-size-notes');
  if (familySel) familySel.value = typo.fontFamily;
  if (notesSl) {
    notesSl.value = typo.fontSizeNotes;
    document.getElementById('settings-font-size-notes-val').textContent = typo.fontSizeNotes + 'px';
  }
}

function settingsUpdateThemeButtons() {
  const isLight = document.documentElement.classList.contains('light');
  document.getElementById('settings-dark-btn').classList.toggle('active', !isLight);
  document.getElementById('settings-light-btn').classList.toggle('active', isLight);
}

function buildColorRows(containerId, mode) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const custom = loadCustomColors();
  const defaults = mode === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;

  for (const [v, label_] of COLOR_VARS) {
    const row = document.createElement('div');
    row.className = 'settings-color-row';

    const label = document.createElement('span');
    label.className = 'settings-color-label';
    label.textContent = label_;

    const swatch = document.createElement('div');
    swatch.className = 'settings-color-swatch';
    const currentVal = custom[mode][v] || defaults[v];
    swatch.style.background = currentVal;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-color-input';
    input.value = custom[mode][v] || '';
    input.placeholder = defaults[v];
    input.dataset.var = v;
    input.dataset.mode = mode;

    input.addEventListener('input', () => {
      const val = input.value.trim();
      const testEl = document.createElement('div');
      testEl.style.color = val;
      const valid = val === '' || testEl.style.color !== '';
      input.classList.toggle('invalid', val !== '' && !valid);
      if (val === '' || valid) {
        swatch.style.background = val || defaults[v];
        const c = loadCustomColors();
        if (val === '') {
          delete c[mode][v];
        } else {
          c[mode][v] = val;
        }
        saveCustomColors(c);
        setActivePresetId(null);
        applyCustomColors();
        buildPresetList();
      }
    });

    row.appendChild(label);
    row.appendChild(swatch);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// --- Presets ---
function loadPresets() {
  const raw = localStorage.getItem('color-presets');
  return raw ? JSON.parse(raw) : [];
}

function savePresets(presets) {
  localStorage.setItem('color-presets', JSON.stringify(presets));
}

function getActivePresetId() {
  return localStorage.getItem('active-preset-id') || null;
}

function setActivePresetId(id) {
  if (id == null) localStorage.removeItem('active-preset-id');
  else localStorage.setItem('active-preset-id', id);
}

function buildPresetList() {
  const container = document.getElementById('settings-presets-list');
  container.innerHTML = '';
  const presets = loadPresets();
  const activeId = getActivePresetId();

  if (presets.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text-muted);padding:2px 8px 6px;';
    empty.textContent = 'No presets yet.';
    container.appendChild(empty);
    return;
  }

  for (const preset of presets) {
    const item = document.createElement('div');
    item.className = 'settings-preset-item' + (preset.id === activeId ? ' active-preset' : '');
    item.dataset.id = preset.id;

    const nameEl = document.createElement('span');
    nameEl.className = 'settings-preset-name';
    nameEl.textContent = preset.name;
    nameEl.title = 'Click to apply';
    nameEl.addEventListener('click', () => applyPreset(preset.id));

    const actions = document.createElement('div');
    actions.className = 'settings-preset-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'settings-preset-action-btn';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startRenamePreset(item, preset.id, nameEl);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'settings-preset-action-btn danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await showConfirm('Delete preset?', `"${preset.name}" will be permanently deleted.`);
      if (confirmed) deletePreset(preset.id);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(nameEl);
    item.appendChild(actions);
    container.appendChild(item);
  }
}

function startRenamePreset(item, id, nameEl) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-preset-name-input';
  input.value = nameEl.textContent;
  item.replaceChild(input, nameEl);
  input.focus();
  input.select();

  function commit() {
    const newName = input.value.trim();
    if (newName) {
      const presets = loadPresets();
      const p = presets.find(x => x.id === id);
      if (p) { p.name = newName; savePresets(presets); }
    }
    buildPresetList();
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); buildPresetList(); }
  });
}

function applyPreset(id) {
  const presets = loadPresets();
  const preset = presets.find(p => p.id === id);
  if (!preset) return;
  saveCustomColors({ dark: preset.dark, light: preset.light });
  saveHiddenTabs(preset.hiddenTabs || []);
  if (preset.typography) saveTypography(preset.typography);
  setActivePresetId(id);
  applyCustomColors();
  applyTypography();
  applyNavVisibility();
  syncNavCheckboxes();
  syncTypographyControls();
  buildColorRows('settings-colors-dark', 'dark');
  buildColorRows('settings-colors-light', 'light');
  buildPresetList();
}

function deletePreset(id) {
  const presets = loadPresets().filter(p => p.id !== id);
  savePresets(presets);
  if (getActivePresetId() === id) setActivePresetId(null);
  buildPresetList();
}

function saveCurrentAsPreset() {
  const nameInput = document.getElementById('settings-preset-name');
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const custom = loadCustomColors();
  const preset = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    dark: { ...custom.dark },
    light: { ...custom.light },
    hiddenTabs: [...loadHiddenTabs()],
    typography: { ...loadTypography() },
  };
  const presets = loadPresets();
  presets.push(preset);
  savePresets(presets);
  setActivePresetId(preset.id);
  nameInput.value = '';
  buildPresetList();
}

// --- Nav visibility ---
const ALL_TABS = ['calendar', 'notes', 'flashcards', 'stats'];

function loadHiddenTabs() {
  const raw = localStorage.getItem('hidden-tabs');
  return raw ? JSON.parse(raw) : [];
}

function saveHiddenTabs(hidden) {
  localStorage.setItem('hidden-tabs', JSON.stringify(hidden));
}

function applyNavVisibility() {
  const hidden = loadHiddenTabs();
  ALL_TABS.forEach(tab => {
    const btn = document.getElementById('tab-' + tab);
    if (btn) btn.style.display = hidden.includes(tab) ? 'none' : '';
  });
  // If the currently active tab is now hidden, switch to first visible
  const activeBtn = document.querySelector('.tab-btn.active');
  if (activeBtn && activeBtn.style.display === 'none') {
    const firstVisible = ALL_TABS.find(t => !hidden.includes(t));
    if (firstVisible) {
      document.getElementById('tab-' + firstVisible)?.click();
    }
  }
}

function syncNavCheckboxes() {
  const hidden = loadHiddenTabs();
  document.querySelectorAll('.settings-nav-check').forEach(cb => {
    cb.checked = !hidden.includes(cb.dataset.tab);
  });
}

document.getElementById('settings-nav-toggles').addEventListener('change', (e) => {
  if (!e.target.classList.contains('settings-nav-check')) return;
  const tab = e.target.dataset.tab;
  const hidden = loadHiddenTabs();
  if (e.target.checked) {
    const idx = hidden.indexOf(tab);
    if (idx !== -1) hidden.splice(idx, 1);
  } else {
    if (!hidden.includes(tab)) hidden.push(tab);
  }
  saveHiddenTabs(hidden);
  applyNavVisibility();
});

applyNavVisibility();

function openSettingsPanel() {
  settingsUpdateThemeButtons();
  buildPresetList();
  buildColorRows('settings-colors-dark', 'dark');
  buildColorRows('settings-colors-light', 'light');
  syncNavCheckboxes();
  syncTypographyControls();
  document.getElementById('settings-panel').style.display = 'flex';
}

document.getElementById('settings-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('settings-panel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    openSettingsPanel();
  } else {
    panel.style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
  const panel = document.getElementById('settings-panel');
  if (panel.style.display !== 'none' &&
      !panel.contains(e.target) &&
      e.target.id !== 'settings-btn' &&
      !document.getElementById('settings-btn').contains(e.target)) {
    panel.style.display = 'none';
  }
});

document.getElementById('settings-dark-btn').addEventListener('click', () => {
  const isLight = document.documentElement.classList.contains('light');
  if (isLight) {
    document.getElementById('theme-toggle-btn').click();
  }
});

document.getElementById('settings-light-btn').addEventListener('click', () => {
  const isLight = document.documentElement.classList.contains('light');
  if (!isLight) {
    document.getElementById('theme-toggle-btn').click();
  }
});

document.getElementById('settings-preset-save-btn').addEventListener('click', saveCurrentAsPreset);
document.getElementById('settings-preset-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveCurrentAsPreset();
});

document.getElementById('settings-reset-btn').addEventListener('click', () => {
  saveCustomColors({ dark: {}, light: {} });
  saveHiddenTabs([]);
  saveTypography({ ...DEFAULT_TYPOGRAPHY });
  setActivePresetId(null);
  applyCustomColors();
  applyTypography();
  applyNavVisibility();
  syncNavCheckboxes();
  syncTypographyControls();
  buildPresetList();
  buildColorRows('settings-colors-dark', 'dark');
  buildColorRows('settings-colors-light', 'light');
});

document.getElementById('settings-font-family').addEventListener('change', (e) => {
  const typo = loadTypography();
  typo.fontFamily = e.target.value;
  saveTypography(typo);
  setActivePresetId(null);
  applyTypography();
  buildPresetList();
});


document.getElementById('settings-font-size-notes').addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  document.getElementById('settings-font-size-notes-val').textContent = val + 'px';
  const typo = loadTypography();
  typo.fontSizeNotes = val;
  saveTypography(typo);
  setActivePresetId(null);
  applyTypography();
  buildPresetList();
});

// Apply saved colors and typography on load
applyCustomColors();
applyTypography();

// --- State ---
let activeModule = null;
let activeSubfolder = '';  // slash-separated path within module, '' = root
let activeNote = null;
let saveTimer = null;

// --- DOM refs ---
const moduleList        = document.getElementById('module-list');
const addModuleBtn      = document.getElementById('add-module-btn');
const noteList          = document.getElementById('note-list');
const addNoteBtn        = document.getElementById('add-note-btn');
const notesEmpty        = document.getElementById('notes-empty');
const notesSearch       = document.getElementById('notes-search');
const editorPlaceholder = document.getElementById('editor-placeholder');
const editorContent     = document.getElementById('editor-content');
const noteTitle         = document.getElementById('note-title');
const noteEditor        = document.getElementById('note-editor');
const saveStatus        = document.getElementById('save-status');
const deleteNoteBtn     = document.getElementById('delete-note-btn');

// Modal
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalInput   = document.getElementById('modal-input');
const modalCancel  = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

// Context menu
const ctxMenu   = document.getElementById('ctx-menu');
const ctxRename = document.getElementById('ctx-rename');
const ctxDelete = document.getElementById('ctx-delete');

// --- Format toolbar ---
document.querySelectorAll('.fmt-btn:not(.fc-fmt)').forEach(btn => {
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus in editor
    const cmd = btn.dataset.cmd;
    if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') {
      document.execCommand('formatBlock', false, cmd);
    } else {
      document.execCommand(cmd, false, null);
    }
    updateToolbarState();
  });
});

// Highlight active toolbar buttons based on cursor state
function updateToolbarState() {
  document.querySelectorAll('.fmt-btn[data-cmd]:not(.fc-fmt)').forEach(btn => {
    const cmd = btn.dataset.cmd;
    let active = false;
    if (cmd === 'bold') active = document.queryCommandState('bold');
    else if (cmd === 'italic') active = document.queryCommandState('italic');
    else if (cmd === 'underline') active = document.queryCommandState('underline');
    else if (cmd === 'insertUnorderedList') active = document.queryCommandState('insertUnorderedList');
    else if (cmd === 'insertOrderedList') active = document.queryCommandState('insertOrderedList');
    else if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') {
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      active = block === cmd;
    }
    btn.classList.toggle('active', active);
  });
}

noteEditor.addEventListener('keyup', updateToolbarState);
noteEditor.addEventListener('mouseup', updateToolbarState);
noteEditor.addEventListener('selectionchange', updateToolbarState);

// --- Divider button ---
document.getElementById('divider-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();
  noteEditor.focus();
  document.execCommand('insertHTML', false, '<hr><p><br></p>');
  scheduleSave();
});

// --- Box button ---
document.getElementById('box-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();
  noteEditor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const existingBox = node.closest ? node.closest('.text-box') : null;
  if (existingBox) {
    // unwrap: move all children out of the box
    const frag = document.createDocumentFragment();
    while (existingBox.firstChild) frag.appendChild(existingBox.firstChild);
    existingBox.replaceWith(frag);
  } else {
    const range = sel.getRangeAt(0);
    const box = document.createElement('div');
    box.className = 'text-box';
    // Extract the selected content and place it inside the box.
    // surroundContents fails for multi-paragraph (partial-node) selections,
    // so we use extractContents instead.
    const frag = range.extractContents();
    // Ensure the box contains block-level content (wrap bare text/inline nodes in <p>)
    const tmp = document.createElement('div');
    tmp.appendChild(frag);
    // If all children are inline/text, wrap in a paragraph
    const hasBlock = Array.from(tmp.childNodes).some(n =>
      n.nodeType === Node.ELEMENT_NODE && /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|TABLE)$/.test(n.nodeName)
    );
    if (!hasBlock) {
      const p = document.createElement('p');
      while (tmp.firstChild) p.appendChild(tmp.firstChild);
      tmp.appendChild(p);
    }
    while (tmp.firstChild) box.appendChild(tmp.firstChild);
    range.insertNode(box);
    // Place cursor after the box
    const after = document.createElement('p');
    after.innerHTML = '<br>';
    box.after(after);
  }
  updateToolbarState();
  scheduleSave();
});

// --- Table toolbar ---
const tableBtn  = document.getElementById('table-btn');

// --- NOTES LaTeX Button ---
document.getElementById('note-latex-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();
  const editor = document.getElementById('note-editor');
  if (!editor) return;

  // Cursor position sichern
  const sel = window.getSelection();
  let savedRange = null;
  if (sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }

  // Modal öffnen
  const overlay    = document.getElementById('latex-modal-overlay');
  const input      = document.getElementById('latex-input');
  const confirmBtn = document.getElementById('latex-confirm-btn');
  const cancelBtn  = document.getElementById('latex-cancel-btn');
  input.value = '';
  overlay.style.display = 'flex';
  input.focus();

  function closeModal() {
    overlay.style.display = 'none';
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', onCancel);
    input.removeEventListener('keydown', onKey);
  }

  function onConfirm() {
    const raw = input.value.trim();
    closeModal();
    if (!raw) return;
    const isDisplay = raw.startsWith('\\[') || raw.startsWith('$$');
    const markup = isDisplay ? raw : `$${raw}$`;

    // Auswahl wiederherstellen
    editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (savedRange) selection.addRange(savedRange);

    // Text einfügen
    document.execCommand('insertText', false, markup);

    // Rendern + speichern
    renderLatexInEl(editor);
    scheduleSave();
  }

  function onCancel() { closeModal(); }
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onConfirm(); }
    if (e.key === 'Escape') onCancel();
  }

  confirmBtn.addEventListener('click', onConfirm);
  cancelBtn.addEventListener('click', onCancel);
  input.addEventListener('keydown', onKey);
});

const tableMenu = document.getElementById('table-menu');

tableBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  tableMenu.classList.toggle('open');
});

document.addEventListener('mousedown', (e) => {
  if (!tableMenu.contains(e.target) && e.target !== tableBtn) {
    tableMenu.classList.remove('open');
  }
});

function getTableCell() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).startContainer;
  while (node && node !== noteEditor) {
    if (node.nodeName === 'TD' || node.nodeName === 'TH') return node;
    node = node.parentNode;
  }
  return null;
}

document.getElementById('tm-insert').addEventListener('mousedown', (e) => {
  e.preventDefault();
  tableMenu.classList.remove('open');
  const rows = 3, cols = 3;
  let html = '<table><thead><tr>';
  for (let c = 0; c < cols; c++) html += '<th><br></th>';
  html += '</tr></thead><tbody>';
  for (let r = 0; r < rows - 1; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) html += '<td><br></td>';
    html += '</tr>';
  }
  html += '</tbody></table><p><br></p>';
  noteEditor.focus();
  document.execCommand('insertHTML', false, html);
  scheduleSave();
});

document.getElementById('tm-add-row').addEventListener('mousedown', (e) => {
  e.preventDefault();
  tableMenu.classList.remove('open');
  const cell = getTableCell();
  if (!cell) return;
  const row = cell.closest('tr');
  const cols = row.cells.length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < cols; i++) {
    const td = document.createElement('td');
    td.innerHTML = '<br>';
    newRow.appendChild(td);
  }
  row.parentNode.insertBefore(newRow, row.nextSibling);
  scheduleSave();
});

document.getElementById('tm-del-row').addEventListener('mousedown', (e) => {
  e.preventDefault();
  tableMenu.classList.remove('open');
  const cell = getTableCell();
  if (!cell) return;
  const row = cell.closest('tr');
  const table = row.closest('table');
  row.remove();
  if (table.querySelectorAll('tr').length === 0) table.remove();
  scheduleSave();
});

document.getElementById('tm-add-col').addEventListener('mousedown', (e) => {
  e.preventDefault();
  tableMenu.classList.remove('open');
  const cell = getTableCell();
  if (!cell) return;
  const colIdx = cell.cellIndex;
  cell.closest('table').querySelectorAll('tr').forEach(row => {
    const newCell = row.cells[colIdx].tagName === 'TH'
      ? document.createElement('th')
      : document.createElement('td');
    newCell.innerHTML = '<br>';
    row.insertBefore(newCell, row.cells[colIdx + 1] || null);
  });
  scheduleSave();
});

document.getElementById('tm-del-col').addEventListener('mousedown', (e) => {
  e.preventDefault();
  tableMenu.classList.remove('open');
  const cell = getTableCell();
  if (!cell) return;
  const colIdx = cell.cellIndex;
  const table = cell.closest('table');
  table.querySelectorAll('tr').forEach(row => {
    if (row.cells[colIdx]) row.deleteCell(colIdx);
  });
  if (table.querySelector('tr') && table.querySelector('tr').cells.length === 0) table.remove();
  scheduleSave();
});

// --- Image upload (notes) ---
(function () {
  const imageBtn   = document.getElementById('note-image-btn');
  const imageInput = document.getElementById('note-image-input');

  imageBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    imageInput.value = '';
    imageInput.click();
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      noteEditor.focus();
      insertResizableImage(noteEditor, ev.target.result, scheduleSave);
    };
    reader.readAsDataURL(file);
  });
})();

// --- Image upload (flashcards) ---
(function () {
  const imageBtn   = document.getElementById('fc-image-btn');
  const imageInput = document.getElementById('fc-image-input');

  imageBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    imageInput.value = '';
    imageInput.click();
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      fcLastFocusedEditor.focus();
      insertResizableImage(fcLastFocusedEditor, ev.target.result, fcScheduleSave);
    };
    reader.readAsDataURL(file);
  });
})();

/**
 * Insert a resizable image wrapper into `editor` at the current caret position.
 * `src` is a data URL. `onchange` is called after each resize to trigger save.
 */
function insertResizableImage(editor, src, onchange) {
  const wrap = document.createElement('span');
  wrap.className = 'editor-img-wrap';
  wrap.contentEditable = 'false';

  const img = document.createElement('img');
  img.src = src;
  img.style.width = '300px';

  const handle = document.createElement('span');
  handle.className = 'img-resize-handle';

  wrap.appendChild(img);
  wrap.appendChild(handle);

  // Insert at caret
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(wrap);
    // Move caret after the image
    range.setStartAfter(wrap);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(wrap);
  }

  // Ensure a paragraph follows so cursor can be placed after the image
  if (!wrap.nextSibling || (wrap.nextSibling.nodeType === Node.TEXT_NODE && wrap.nextSibling.textContent === '')) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    wrap.after(p);
  }

  attachImageResize(wrap, img, handle, onchange);
  selectEditorImage(wrap);
  onchange();
}

/** Attach click-to-select and drag-resize behaviour to an image wrapper. */
function attachImageResize(wrap, img, handle, onchange) {
  // Select on click
  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    selectEditorImage(wrap);
  });

  // Resize via drag on the handle
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX  = e.clientX;
    const startW  = img.getBoundingClientRect().width;

    function onMove(ev) {
      const newW = Math.max(40, startW + (ev.clientX - startX));
      img.style.width = newW + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      onchange();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

let selectedImgWrap = null;
function selectEditorImage(wrap) {
  if (selectedImgWrap && selectedImgWrap !== wrap) {
    selectedImgWrap.classList.remove('selected');
  }
  selectedImgWrap = wrap;
  wrap.classList.add('selected');
}

// Clicking anywhere else deselects
document.addEventListener('click', (e) => {
  if (selectedImgWrap && !selectedImgWrap.contains(e.target)) {
    selectedImgWrap.classList.remove('selected');
    selectedImgWrap = null;
  }
});

/** Re-attach resize behaviour to existing images after loading saved content. */
function reattachImageResizers(editor, onchange) {
  editor.querySelectorAll('.editor-img-wrap').forEach((wrap) => {
    const img    = wrap.querySelector('img');
    const handle = wrap.querySelector('.img-resize-handle');
    if (img && handle) attachImageResize(wrap, img, handle, onchange);
  });
}

/** Handle paste events containing images for a given editor + save callback. */
function handleImagePaste(editor, onchange, e) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editor.focus();
        insertResizableImage(editor, ev.target.result, onchange);
      };
      reader.readAsDataURL(file);
      return;
    }
  }
}

// --- Modal helper ---
function openModal(title, placeholder, confirmLabel, defaultValue = '') {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalInput.placeholder = placeholder;
    modalInput.value = defaultValue;
    modalConfirm.textContent = confirmLabel;
    modalOverlay.style.display = 'flex';
    modalInput.focus();
    modalInput.select();

    const cleanup = () => {
      modalOverlay.style.display = 'none';
      modalConfirm.removeEventListener('click', onConfirm);
      modalCancel.removeEventListener('click', onCancel);
      modalInput.removeEventListener('keydown', onKey);
    };
    const onConfirm = () => { cleanup(); resolve(modalInput.value.trim()); };
    const onCancel  = () => { cleanup(); resolve(null); };
    const onKey = (e) => {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    modalConfirm.addEventListener('click', onConfirm);
    modalCancel.addEventListener('click', onCancel);
    modalInput.addEventListener('keydown', onKey);
  });
}

// --- Context menu ---
let ctxTarget = null;
let ctxType = null;

function showCtxMenu(x, y, type, target) {
  ctxType = type;
  ctxTarget = target;
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
}

function hideCtxMenu() {
  ctxMenu.style.display = 'none';
  ctxTarget = null;
  ctxType = null;
}

document.addEventListener('click', () => hideCtxMenu());
document.addEventListener('contextmenu', () => hideCtxMenu());

// ════════════════════════════════════════════════════
// --- Module rendering ---
async function loadModules() {
  const modules = await invoke('list_modules');
  moduleList.innerHTML = '';
  for (const mod of modules) {
    moduleList.appendChild(makeModuleItem(mod));
  }
}

function makeModuleItem(name) {
  const li = document.createElement('li');
  li.className = 'module-item' + (name === activeModule ? ' active' : '');
  li.dataset.name = name;
  li.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <span>${escHtml(name)}</span>`;
  li.addEventListener('click', () => selectModule(name));
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCtxMenu(e.clientX, e.clientY, 'module', name);
  });
  return li;
}

async function selectModule(name) {
  await maybeSaveCurrentNote();
  activeModule = name;
  activeSubfolder = '';
  activeNote = null;
  addNoteBtn.style.display = '';
  document.getElementById('add-subfolder-btn').style.display = '';
  showEditorPlaceholder();
  await loadNotes();
  document.querySelectorAll('.module-item').forEach(el =>
    el.classList.toggle('active', el.dataset.name === name));
}

// --- Note rendering ---
async function loadNotes() {
  if (!activeModule) return;

  const query = notesSearch.value.trim();

  noteList.innerHTML = '';
  renderNotesBreadcrumb();

  if (query) {
    // Full-content search across entire module via backend
    const results = await invoke('search_notes', { module: activeModule, query });
    if (results.length === 0) {
      notesEmpty.style.display = 'flex';
      notesEmpty.querySelector('span').textContent = 'No results';
    } else {
      notesEmpty.style.display = 'none';
      for (const r of results) {
        noteList.appendChild(makeSearchNoteItem(r));
      }
    }
    return;
  }

  let [subfolders, notes] = await Promise.all([
    invoke('list_subfolders', { module: activeModule, subfolder: activeSubfolder }),
    invoke('list_notes', { module: activeModule, subfolder: activeSubfolder }),
  ]);

  if (subfolders.length === 0 && notes.length === 0) {
    notesEmpty.style.display = 'flex';
    notesEmpty.querySelector('span').textContent = 'No notes yet';
  } else {
    notesEmpty.style.display = 'none';
  }
  for (const n of subfolders) noteList.appendChild(makeSubfolderItem(n));
  for (const n of notes) noteList.appendChild(makeNoteItem(n));
}

function makeSearchNoteItem(r) {
  // r = { module, subfolder, name }
  const li = document.createElement('li');
  li.className = 'note-item search-result-item' + (r.name === activeNote && r.subfolder === activeSubfolder ? ' active' : '');
  li.dataset.name = r.name;
  const label = r.subfolder ? `${r.subfolder} / ${r.name}` : r.name;
  li.textContent = label;
  li.addEventListener('click', async () => {
    await maybeSaveCurrentNote();
    activeSubfolder = r.subfolder;
    activeNote = r.name;
    const content = await invoke('read_note', { module: activeModule, subfolder: r.subfolder, note: r.name });
    noteTitle.value = r.name;
    noteEditor.innerHTML = content;
    reattachImageResizers(noteEditor, scheduleSave);
    highlightQuery(noteEditor, notesSearch.value.trim());
    showEditorContent();
    noteEditor.focus();
    document.querySelectorAll('.note-item').forEach(el =>
      el.classList.toggle('active', el === li));
  });
  return li;
}

function renderNotesBreadcrumb() {
  let crumb = document.getElementById('notes-breadcrumb');
  if (!crumb) {
    crumb = document.createElement('div');
    crumb.id = 'notes-breadcrumb';
    crumb.className = 'notes-breadcrumb';
    noteList.parentNode.insertBefore(crumb, noteList);
  }
  crumb.innerHTML = '';
  if (!activeSubfolder) { crumb.style.display = 'none'; return; }
  crumb.style.display = 'flex';

  // Back-up one level button
  const backBtn = document.createElement('button');
  backBtn.className = 'breadcrumb-back';
  backBtn.title = 'Go up';
  backBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  backBtn.addEventListener('click', async () => {
    await maybeSaveCurrentNote();
    activeNote = null;
    showEditorPlaceholder();
    const parts = activeSubfolder.split('/');
    parts.pop();
    activeSubfolder = parts.join('/');
    await loadNotes();
  });
  crumb.appendChild(backBtn);

  // Segment labels
  const segments = activeSubfolder.split('/');
  segments.forEach((seg, i) => {
    const span = document.createElement('span');
    span.className = 'breadcrumb-seg';
    span.textContent = seg;
    if (i < segments.length - 1) {
      span.addEventListener('click', async () => {
        await maybeSaveCurrentNote();
        activeNote = null;
        showEditorPlaceholder();
        activeSubfolder = segments.slice(0, i + 1).join('/');
        await loadNotes();
      });
    }
    crumb.appendChild(span);
    if (i < segments.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = '/';
      crumb.appendChild(sep);
    }
  });
}

function makeSubfolderItem(name) {
  const li = document.createElement('li');
  li.className = 'note-item subfolder-item';
  li.dataset.subfolder = name;
  li.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>${escHtml(name)}</span>`;
  li.addEventListener('click', async () => {
    await maybeSaveCurrentNote();
    activeNote = null;
    showEditorPlaceholder();
    activeSubfolder = activeSubfolder ? activeSubfolder + '/' + name : name;
    await loadNotes();
  });
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCtxMenu(e.clientX, e.clientY, 'subfolder', name);
  });
  return li;
}

function makeNoteItem(name) {
  const li = document.createElement('li');
  li.className = 'note-item' + (name === activeNote ? ' active' : '');
  li.dataset.name = name;
  li.textContent = name;
  li.addEventListener('click', () => openNote(name));
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCtxMenu(e.clientX, e.clientY, 'note', name);
  });
  return li;
}

async function openNote(name) {
  await maybeSaveCurrentNote();
  activeNote = name;
  const content = await invoke('read_note', { module: activeModule, subfolder: activeSubfolder, note: name });
  noteTitle.value = name;
  noteEditor.innerHTML = content;
  reattachImageResizers(noteEditor, scheduleSave);
  highlightQuery(noteEditor, notesSearch.value.trim());
  showEditorContent();
  noteEditor.focus();
  document.querySelectorAll('.note-item').forEach(el =>
    el.classList.toggle('active', el.dataset.name === name));
}

// --- Editor visibility ---
function showEditorPlaceholder() {
  editorPlaceholder.style.display = '';
  editorContent.classList.remove('visible');
}
function showEditorContent() {
  editorPlaceholder.style.display = 'none';
  editorContent.classList.add('visible');
}

// --- Autosave ---
// --- Search highlight ---
function highlightQuery(el, query) {
  if (!query) return;
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const idx = node.textContent.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return;
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      const after = node.splitText(idx);
      after.splitText(query.length);
      mark.appendChild(after.cloneNode());
      after.replaceWith(mark);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'MARK') {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  Array.from(el.childNodes).forEach(walk);
}

function stripHighlights(el) {
  el.querySelectorAll('mark.search-highlight').forEach(mark => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
  el.normalize();
}

function scheduleSave() {
  saveStatus.textContent = 'Editing...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentNote, 1200);
}

async function saveCurrentNote() {
  if (!activeModule || !activeNote) return;
  const currentTitle = noteTitle.value.trim();
  stripHighlights(noteEditor);
  const content = noteEditor.innerHTML;

  if (currentTitle && currentTitle !== activeNote) {
    try {
      await invoke('rename_note', { module: activeModule, subfolder: activeSubfolder, oldName: activeNote, newSubfolder: activeSubfolder, newName: currentTitle });
      activeNote = currentTitle;
      document.querySelectorAll('.note-item').forEach(el => {
        if (el.classList.contains('active')) {
          el.dataset.name = currentTitle;
          el.textContent = currentTitle;
        }
      });
    } catch (e) {
      saveStatus.textContent = 'Error';
      return;
    }
  }

  try {
    await invoke('write_note', { module: activeModule, subfolder: activeSubfolder, note: activeNote, content });
    saveStatus.textContent = 'Saved';
    setTimeout(() => { if (saveStatus.textContent === 'Saved') saveStatus.textContent = ''; }, 1500);
  } catch (e) {
    saveStatus.textContent = 'Error';
  }
}

async function maybeSaveCurrentNote() {
  if (activeModule && activeNote) {
    clearTimeout(saveTimer);
    await saveCurrentNote();
  }
}

// --- Add module ---
addModuleBtn.addEventListener('click', async () => {
  const name = await openModal('New module', 'Module name', 'Create');
  if (!name) return;
  await invoke('create_module', { name });
  await loadModules();
  await selectModule(name);
});

// --- Add subfolder ---
document.getElementById('add-subfolder-btn').addEventListener('click', async () => {
  if (!activeModule) return;
  const name = await openModal('New subfolder', 'Subfolder name', 'Create');
  if (!name) return;
  if (name.includes('/')) { alert('Subfolder name cannot contain /'); return; }
  try {
    await invoke('create_subfolder', { module: activeModule, subfolder: activeSubfolder, name });
    await loadNotes();
  } catch (e) { alert('Error: ' + e); }
});

// --- Add note ---
addNoteBtn.addEventListener('click', async () => {
  if (!activeModule) return;
  const name = await openModal('New note', 'Note title', 'Create');
  if (!name) return;
  await invoke('write_note', { module: activeModule, subfolder: activeSubfolder, note: name, content: '' });
  await loadNotes();
  await openNote(name);
});

// --- Delete note ---
deleteNoteBtn.addEventListener('click', async () => {
  if (!activeModule || !activeNote) return;
  const confirmed = confirm(`Delete "${activeNote}"?`);
  if (!confirmed) return;
  await invoke('delete_note', { module: activeModule, subfolder: activeSubfolder, note: activeNote });
  activeNote = null;
  showEditorPlaceholder();
  await loadNotes();
});

// --- Context menu actions ---
ctxRename.addEventListener('click', async () => {
  const type = ctxType, target = ctxTarget;
  hideCtxMenu();

  if (type === 'module') {
    const newName = await openModal('Rename module', 'Module name', 'Rename', target);
    if (!newName || newName === target) return;
    try {
      const notes = await invoke('list_notes', { module: target, subfolder: '' });
      await invoke('create_module', { name: newName });
      for (const note of notes) {
        const content = await invoke('read_note', { module: target, subfolder: '', note });
        await invoke('write_note', { module: newName, subfolder: '', note, content });
      }
      await invoke('delete_module', { name: target });
      if (activeModule === target) activeModule = newName;
      await loadModules();
      if (activeModule === newName) {
        await loadNotes();
      }
    } catch (e) { alert('Error renaming module: ' + e); }

  } else if (type === 'subfolder') {
    const currentPath = activeSubfolder ? activeSubfolder + '/' + target : target;
    const newInput = await openModal('Move / rename subfolder', 'Path (e.g. parent/name)', 'Rename', currentPath);
    if (!newInput || newInput === currentPath) return;
    try {
      await invoke('rename_subfolder', { module: activeModule, subfolder: currentPath, newPath: newInput });
      await loadNotes();
    } catch (e) { alert('Error: ' + e); }

  } else if (type === 'note') {
    // Allow "folder/name" to move the note into a different subfolder
    const currentVal = activeSubfolder ? activeSubfolder + '/' + target : target;
    const newInput = await openModal('Move / rename note', 'Path (e.g. folder/title)', 'Rename', currentVal);
    if (!newInput || newInput === currentVal) return;
    const lastSlash = newInput.lastIndexOf('/');
    const newSubfolder = lastSlash === -1 ? '' : newInput.slice(0, lastSlash);
    const newName = lastSlash === -1 ? newInput : newInput.slice(lastSlash + 1);
    if (!newName) { alert('Note name cannot be empty'); return; }
    try {
      await invoke('rename_note', { module: activeModule, subfolder: activeSubfolder, oldName: target, newSubfolder, newName });
      if (activeNote === target) {
        if (newSubfolder !== activeSubfolder) {
          // moved to a different folder — close editor
          activeNote = null;
          activeSubfolder = newSubfolder;
          showEditorPlaceholder();
        } else {
          activeNote = newName;
          noteTitle.value = newName;
        }
      }
      await loadNotes();
      document.querySelectorAll('.note-item').forEach(el =>
        el.classList.toggle('active', el.dataset.name === activeNote));
    } catch (e) { alert('Error: ' + e); }
  }
});

ctxDelete.addEventListener('click', async () => {
  const type = ctxType, target = ctxTarget;
  hideCtxMenu();

  if (type === 'module') {
    const confirmed = confirm(`Delete module "${target}" and all its notes?`);
    if (!confirmed) return;
    await invoke('delete_module', { name: target });
    if (activeModule === target) {
      activeModule = null;
      activeSubfolder = '';
      activeNote = null;
      addNoteBtn.style.display = 'none';
      document.getElementById('add-subfolder-btn').style.display = 'none';
      noteList.innerHTML = '';
      notesEmpty.style.display = 'flex';
      notesEmpty.querySelector('span').textContent = 'No module selected';
      showEditorPlaceholder();
    }
    await loadModules();
  } else if (type === 'subfolder') {
    const confirmed = confirm(`Delete subfolder "${target}" and all its contents?`);
    if (!confirmed) return;
    try {
      const fullPath = activeSubfolder ? activeSubfolder + '/' + target : target;
      await invoke('delete_subfolder', { module: activeModule, subfolder: fullPath });
      await loadNotes();
    } catch (e) { alert('Error deleting subfolder: ' + e); }
  } else if (type === 'note') {
    const confirmed = confirm(`Delete note "${target}"?`);
    if (!confirmed) return;
    await invoke('delete_note', { module: activeModule, subfolder: activeSubfolder, note: target });
    if (activeNote === target) {
      activeNote = null;
      showEditorPlaceholder();
    }
    await loadNotes();
  }
});

// --- Notes search ---
notesSearch.addEventListener('input', () => { if (activeModule) loadNotes(); });

// --- Editor events ---
noteEditor.addEventListener('input', scheduleSave);
noteEditor.addEventListener('paste', (e) => handleImagePaste(noteEditor, scheduleSave, e));
noteTitle.addEventListener('input', scheduleSave);
noteTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); noteEditor.focus(); }
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    clearTimeout(saveTimer);
    await saveCurrentNote();
  }
});

// --- Confirm dialog ---
function showConfirm(title, body) {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    const overlay = document.getElementById('confirm-overlay');
    overlay.style.display = 'flex';

    function finish(result) {
      overlay.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      resolve(result);
    }
    const okBtn     = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const onOk      = () => finish(true);
    const onCancel  = () => finish(false);
    const onOverlay = (e) => { if (e.target === overlay) finish(false); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
  });
}

// --- Trash panel ---
const trashPanel     = document.getElementById('trash-panel');
const trashList      = document.getElementById('trash-list');
const trashEmptyHint = document.getElementById('trash-empty-hint');
const trashCount     = document.getElementById('trash-count');

document.getElementById('trash-btn').addEventListener('click', async () => {
  const isOpen = trashPanel.style.display !== 'none';
  trashPanel.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) await loadTrash();
});

document.getElementById('trash-close-btn').addEventListener('click', () => {
  trashPanel.style.display = 'none';
});

document.getElementById('trash-empty-btn').addEventListener('click', async () => {
  const items = await invoke('list_trash');
  if (items.length === 0) return;
  const confirmed = await showConfirm(
    'Empty trash?',
    `This will permanently delete all ${items.length} item${items.length === 1 ? '' : 's'}. This cannot be undone.`
  );
  if (!confirmed) return;
  for (const item of items) {
    await invoke('delete_trash_item', { id: item.id, kind: item.kind });
  }
  await loadTrash();
});

async function loadTrash() {
  const items = await invoke('list_trash');
  trashList.innerHTML = '';
  if (items.length === 0) {
    trashEmptyHint.style.display = 'flex';
    trashCount.style.display = 'none';
  } else {
    trashEmptyHint.style.display = 'none';
    trashCount.textContent = items.length;
    trashCount.style.display = '';
    for (const item of items) {
      trashList.appendChild(makeTrashItem(item));
    }
  }
}

function makeTrashItem(item) {
  const li = document.createElement('li');
  li.className = 'trash-item';

  const icon = item.kind === 'module'
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

  const meta = item.kind === 'note'
    ? `${escHtml(item.module)} · ${relativeTime(item.deleted_at)}`
    : `module · ${relativeTime(item.deleted_at)}`;

  li.innerHTML = `
    ${icon}
    <div class="trash-item-info">
      <div class="trash-item-name">${escHtml(item.name)}</div>
      <div class="trash-item-meta">${meta}</div>
    </div>
    <div class="trash-item-actions">
      <button class="icon-btn restore-btn" title="Restore">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.61"/></svg>
      </button>
      <button class="icon-btn danger perm-del-btn" title="Delete permanently">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`;

  li.querySelector('.restore-btn').addEventListener('click', async () => {
    await invoke('restore_trash_item', { id: item.id, kind: item.kind });
    await loadTrash();
    await loadModules();
    if (activeModule) await loadNotes();
  });

  li.querySelector('.perm-del-btn').addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Delete permanently?',
      `"${item.name}" will be permanently deleted. This cannot be undone.`
    );
    if (!confirmed) return;
    await invoke('delete_trash_item', { id: item.id, kind: item.kind });
    await loadTrash();
  });

  return li;
}

// --- Tab navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('view-notes').style.display = tab === 'notes' ? 'flex' : 'none';
    document.getElementById('view-calendar').style.display = tab === 'calendar' ? 'flex' : 'none';
    document.getElementById('view-flashcards').style.display = tab === 'flashcards' ? 'flex' : 'none';
    document.getElementById('view-stats').style.display = tab === 'stats' ? 'flex' : 'none';
    if (tab === 'calendar') renderCalendar();
    if (tab === 'flashcards') loadFcFolders();
    if (tab === 'stats') window.initStats();
  });
});

// ════════════════════════════════════════════════════
//  CALENDAR
// ════════════════════════════════════════════════════

// --- State ---
let calView = 'month'; // 'month' | 'week' | 'day'
let calDate = new Date(); // anchor date for current view
let calEvents = [];     // array of CalendarEvent objects

// --- Helpers ---
function pad2(n) { return String(n).padStart(2, '0'); }

function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDate(s) {
  // parse YYYY-MM-DD as local date
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function eventsOnDay(dateString) {
  return calEvents.filter(e => e.date === dateString);
}

function isToday(dateString) {
  return dateString === dateStr(new Date());
}

// unique id
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Load / persist ---
async function loadCalendarEvents() {
  calEvents = await invoke('list_events');
}

// --- Render dispatcher ---
function renderCalendar() {
  updateCalTitle();
  const monthView = document.getElementById('cal-month-view');
  const weekView  = document.getElementById('cal-week-view');
  const dayView   = document.getElementById('cal-day-view');
  monthView.style.display = calView === 'month' ? 'flex' : 'none';
  weekView.style.display  = calView === 'week'  ? 'flex' : 'none';
  dayView.style.display   = calView === 'day'   ? 'flex' : 'none';

  if (calView === 'month') renderMonthView();
  else if (calView === 'week') renderWeekView();
  else renderDayView();
}

// --- Title ---
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function updateCalTitle() {
  const title = document.getElementById('cal-title');
  if (calView === 'month') {
    title.textContent = `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`;
  } else if (calView === 'week') {
    const mon = weekStart(calDate);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    title.textContent = `${MONTHS[mon.getMonth()]} ${mon.getDate()} – ${mon.getMonth() !== sun.getMonth() ? MONTHS[sun.getMonth()] + ' ' : ''}${sun.getDate()}, ${sun.getFullYear()}`;
  } else {
    title.textContent = `${DAYS[calDate.getDay()]}, ${MONTHS[calDate.getMonth()]} ${calDate.getDate()}, ${calDate.getFullYear()}`;
  }
}

// --- Month view ---
function renderMonthView() {
  const cells = document.getElementById('cal-month-cells');
  cells.innerHTML = '';

  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  // First day of month, padded to Sunday
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  let day = 1;
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';

    let cellDate;
    if (i < firstDay) {
      // previous month
      cellDate = new Date(year, month - 1, prevDays - firstDay + 1 + i);
      cell.classList.add('other-month');
    } else if (day > daysInMonth) {
      // next month
      cellDate = new Date(year, month + 1, day - daysInMonth);
      day++;
      cell.classList.add('other-month');
    } else {
      cellDate = new Date(year, month, day);
      day++;
    }

    const ds = dateStr(cellDate);
    if (isToday(ds)) cell.classList.add('today');

    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    // Events for this day
    const dayEvs = eventsOnDay(ds);
    for (const ev of dayEvs) {
      const chip = document.createElement('div');
      chip.className = 'cal-event-chip';
      chip.style.background = ev.color || 'var(--accent)';
      chip.textContent = (ev.start_time ? ev.start_time + ' ' : '') + ev.title;
      chip.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
      cell.appendChild(chip);
    }

    cell.addEventListener('click', () => openEventModal(null, ds));
    cells.appendChild(cell);
  }
}

// --- Week helpers ---
function weekStart(d) {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay()); // go to Sunday
  s.setHours(0, 0, 0, 0);
  return s;
}

function buildTimeLabels(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  // Labels for 0–23 (one per hour row) + midnight label aligned with the closing border
  for (let h = 0; h <= 24; h++) {
    const label = document.createElement('div');
    label.className = h < 24 ? 'cal-time-label' : 'cal-time-label cal-time-label--midnight';
    label.textContent = h === 0 ? '' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : h === 24 ? '12 AM' : `${h - 12} PM`;
    container.appendChild(label);
  }
}

// Compute non-overlapping column layout for a set of timed events.
// Returns an array of { ev, col, totalCols } in the same order.
function layoutEvents(evs) {
  // Sort by start time, then by end time descending
  const sorted = evs.slice().sort((a, b) => {
    const as = timeToMinutes(a.start_time), bs = timeToMinutes(b.start_time);
    if (as !== bs) return as - bs;
    return (timeToMinutes(b.end_time) || bs + 60) - (timeToMinutes(a.end_time) || as + 60);
  });

  // Assign each event to a column slot
  const cols = [];   // cols[i] = end minute of last event in column i
  const assign = sorted.map(ev => {
    const start = timeToMinutes(ev.start_time);
    const end   = Math.min(1440, timeToMinutes(ev.end_time) || (start + 60));
    let slot = cols.findIndex(colEnd => colEnd <= start);
    if (slot === -1) { slot = cols.length; cols.push(0); }
    cols[slot] = end;
    return { ev, slot };
  });

  // For each event, find how many columns its time-span actually needs
  // (max slot index of any event that overlaps it, + 1)
  const result = assign.map(({ ev, slot }) => {
    const start = timeToMinutes(ev.start_time);
    const end   = Math.min(1440, timeToMinutes(ev.end_time) || (start + 60));
    const maxSlot = assign.reduce((m, other) => {
      const os = timeToMinutes(other.ev.start_time);
      const oe = Math.min(1440, timeToMinutes(other.ev.end_time) || (os + 60));
      if (os < end && oe > start) return Math.max(m, other.slot);
      return m;
    }, slot);
    return { ev, col: slot, totalCols: maxSlot + 1 };
  });

  return result;
}

function buildDayColBody(col, ds) {
  const body = document.createElement('div');
  body.className = 'cal-col-body';

  // Hour rows 0–23, plus a closing midnight border row
  for (let h = 0; h <= 24; h++) {
    const row = document.createElement('div');
    row.className = h < 24 ? 'cal-hour-row' : 'cal-hour-row cal-hour-row--midnight';
    if (h < 24) {
      const half = document.createElement('div');
      half.className = 'cal-hour-half';
      row.appendChild(half);
      const hour = h;
      row.addEventListener('click', () => {
        const startT = `${pad2(hour)}:00`;
        const endT   = hour < 23 ? `${pad2(hour + 1)}:00` : '23:59';
        openEventModal(null, ds, startT, endT);
      });
    }
    body.appendChild(row);
  }

  // Timed events with overlap layout
  const dayEvs = eventsOnDay(ds).filter(e => e.start_time);
  const laid = layoutEvents(dayEvs);

  const PAD = 3; // px gap between event columns
  for (const { ev, col: slot, totalCols } of laid) {
    const startMin = timeToMinutes(ev.start_time);
    const endMin   = Math.min(1440, timeToMinutes(ev.end_time) || (startMin + 60));
    const topPx    = (startMin / 60) * 60;
    const heightPx = Math.max(18, ((endMin - startMin) / 60) * 60 - 2);

    const colW   = `calc((100% - ${PAD * 2}px) / ${totalCols})`;
    const leftPx = `calc(${PAD}px + ${slot} * ((100% - ${PAD * 2}px) / ${totalCols}))`;

    const chip = document.createElement('div');
    chip.className = 'cal-timed-event';
    chip.style.background = ev.color || 'var(--accent)';
    chip.style.top    = topPx + 'px';
    chip.style.height = heightPx + 'px';
    chip.style.left   = leftPx;
    chip.style.right  = 'unset';
    chip.style.width  = colW;
    chip.innerHTML = `<strong>${ev.title}</strong>${ev.start_time ? '<br>' + ev.start_time + (ev.end_time ? '–' + ev.end_time : '') : ''}`;
    chip.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
    body.appendChild(chip);
  }

  // Now line
  if (isToday(ds)) {
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const line = document.createElement('div');
    line.className = 'cal-now-line';
    line.style.top = (min / 60 * 60) + 'px';
    body.appendChild(line);
  }

  col.appendChild(body);
}

// --- Week view ---
function renderWeekView() {
  buildTimeLabels('cal-week-time-labels');

  const cols = document.getElementById('cal-week-cols');
  cols.innerHTML = '';

  // Outer scroll wrapper
  const scroll = document.createElement('div');
  scroll.className = 'cal-time-scroll';

  const colWrap = document.createElement('div');
  colWrap.className = 'cal-col-wrap';

  const ws = weekStart(calDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    const ds = dateStr(d);

    const col = document.createElement('div');
    col.className = 'cal-day-col';

    const header = document.createElement('div');
    header.className = 'cal-col-header' + (isToday(ds) ? ' today' : '');
    header.innerHTML = `<span class="col-weekday">${DAYS[d.getDay()]}</span><span class="col-date">${d.getDate()}</span>`;
    header.addEventListener('click', () => { calDate = d; calView = 'day'; setCalViewBtn('day'); renderCalendar(); });
    col.appendChild(header);

    // All-day events
    const allDayEvs = eventsOnDay(ds).filter(e => !e.start_time);
    if (allDayEvs.length) {
      const adr = document.createElement('div');
      adr.className = 'cal-allday-row';
      for (const ev of allDayEvs) {
        const chip = document.createElement('div');
        chip.className = 'cal-event-chip';
        chip.style.background = ev.color || 'var(--accent)';
        chip.textContent = ev.title;
        chip.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
        adr.appendChild(chip);
      }
      col.appendChild(adr);
    }

    buildDayColBody(col, ds);
    colWrap.appendChild(col);
  }

  scroll.appendChild(colWrap);
  cols.appendChild(scroll);

  // Sync time labels with scroll
  const weekLabels = document.getElementById('cal-week-time-labels');
  scroll.addEventListener('scroll', () => { weekLabels.scrollTop = scroll.scrollTop; });

  // Scroll to 7am
  requestAnimationFrame(() => { scroll.scrollTop = 7 * 60; });
}

// --- Day view ---
function renderDayView() {
  buildTimeLabels('cal-day-time-labels');

  const colContainer = document.getElementById('cal-day-col');
  colContainer.innerHTML = '';

  const scroll = document.createElement('div');
  scroll.className = 'cal-time-scroll';

  const colWrap = document.createElement('div');
  colWrap.className = 'cal-col-wrap';

  const ds = dateStr(calDate);
  const col = document.createElement('div');
  col.className = 'cal-day-col';

  const header = document.createElement('div');
  header.className = 'cal-col-header' + (isToday(ds) ? ' today' : '');
  header.innerHTML = `<span class="col-weekday">${DAYS[calDate.getDay()]}</span><span class="col-date">${calDate.getDate()}</span>`;
  col.appendChild(header);

  const allDayEvs = eventsOnDay(ds).filter(e => !e.start_time);
  if (allDayEvs.length) {
    const adr = document.createElement('div');
    adr.className = 'cal-allday-row';
    for (const ev of allDayEvs) {
      const chip = document.createElement('div');
      chip.className = 'cal-event-chip';
      chip.style.background = ev.color || 'var(--accent)';
      chip.textContent = ev.title;
      chip.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
      adr.appendChild(chip);
    }
    col.appendChild(adr);
  }

  buildDayColBody(col, ds);
  colWrap.appendChild(col);
  scroll.appendChild(colWrap);
  colContainer.appendChild(scroll);

  // Sync time labels with scroll
  const dayLabels = document.getElementById('cal-day-time-labels');
  scroll.addEventListener('scroll', () => { dayLabels.scrollTop = scroll.scrollTop; });

  requestAnimationFrame(() => { scroll.scrollTop = 7 * 60; });
}

// --- Navigation ---
document.getElementById('cal-prev').addEventListener('click', () => {
  if (calView === 'month')      calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
  else if (calView === 'week')  { calDate = new Date(calDate); calDate.setDate(calDate.getDate() - 7); }
  else                          { calDate = new Date(calDate); calDate.setDate(calDate.getDate() - 1); }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  if (calView === 'month')      calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1);
  else if (calView === 'week')  { calDate = new Date(calDate); calDate.setDate(calDate.getDate() + 7); }
  else                          { calDate = new Date(calDate); calDate.setDate(calDate.getDate() + 1); }
  renderCalendar();
});

document.getElementById('cal-today').addEventListener('click', () => {
  calDate = new Date();
  renderCalendar();
});

function setCalViewBtn(view) {
  calView = view;
  document.querySelectorAll('.cal-view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
}

document.querySelectorAll('.cal-view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setCalViewBtn(btn.dataset.view);
    renderCalendar();
  });
});

document.getElementById('cal-add-btn').addEventListener('click', () => openEventModal(null));

// ─── Event modal ───────────────────────────────────
let editingEvent = null;
let selectedColor = '#c4a882';

function openEventModal(ev, prefillDate, prefillStart, prefillEnd) {
  editingEvent = ev || null;
  const overlay = document.getElementById('event-modal-overlay');
  document.getElementById('event-modal-title').textContent = ev ? 'Edit Event' : 'New Event';
  document.getElementById('event-title-input').value  = ev ? ev.title : '';
  document.getElementById('event-date-input').value   = ev ? ev.date  : (prefillDate || dateStr(calDate));
  document.getElementById('event-start-input').value  = ev ? ev.start_time : (prefillStart || '');
  document.getElementById('event-end-input').value    = ev ? ev.end_time   : (prefillEnd || '');
  document.getElementById('event-notes-input').value  = ev ? ev.notes : '';
  document.getElementById('event-delete-btn').style.display = ev ? '' : 'none';

  selectedColor = ev ? (ev.color || '#c4a882') : '#c4a882';
  document.querySelectorAll('.event-color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === selectedColor);
  });

  overlay.style.display = 'flex';
  document.getElementById('event-title-input').focus();
}

function closeEventModal() {
  document.getElementById('event-modal-overlay').style.display = 'none';
  editingEvent = null;
}

document.querySelectorAll('.event-color-swatch').forEach(s => {
  s.addEventListener('click', () => {
    selectedColor = s.dataset.color;
    document.querySelectorAll('.event-color-swatch').forEach(sw =>
      sw.classList.toggle('active', sw === s));
  });
});

document.getElementById('event-cancel-btn').addEventListener('click', closeEventModal);
document.getElementById('event-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('event-modal-overlay')) closeEventModal();
});

document.getElementById('event-save-btn').addEventListener('click', async () => {
  const title = document.getElementById('event-title-input').value.trim();
  if (!title) { document.getElementById('event-title-input').focus(); return; }

  const ev = {
    id:         editingEvent ? editingEvent.id : newId(),
    title,
    date:       document.getElementById('event-date-input').value,
    start_time: document.getElementById('event-start-input').value,
    end_time:   document.getElementById('event-end-input').value,
    color:      selectedColor,
    notes:      document.getElementById('event-notes-input').value,
  };

  if (editingEvent) {
    await invoke('update_event', { event: ev });
  } else {
    await invoke('create_event', { event: ev });
  }

  await loadCalendarEvents();
  closeEventModal();
  renderCalendar();
});

document.getElementById('event-delete-btn').addEventListener('click', async () => {
  if (!editingEvent) return;
  const confirmed = await showConfirm('Delete event?', `"${editingEvent.title}" will be permanently deleted.`);
  if (!confirmed) return;
  await invoke('delete_event', { id: editingEvent.id });
  await loadCalendarEvents();
  closeEventModal();
  renderCalendar();
});

// --- Init ---
window.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme
  applyTheme(localStorage.getItem('theme') === 'light');
  // Purge items older than 14 days
  await invoke('purge_old_trash');
  await invoke('purge_old_fc_trash');
  await loadModules();
  await loadCalendarEvents();
  // Refresh trash badge counts
  const items = await invoke('list_trash');
  if (items.length > 0) {
    trashCount.textContent = items.length;
    trashCount.style.display = '';
  }
  const fcItems = await invoke('list_fc_trash');
  if (fcItems.length > 0) {
    fcTrashCount.textContent = fcItems.length;
    fcTrashCount.style.display = '';
  }
});

// ════════════════════════════════════════════════════
//  FLASH CARDS
// ════════════════════════════════════════════════════

// --- State ---
let fcActiveFolder  = null;  // currently selected folder name (null = All)
let fcActiveCardId  = null;  // id of currently open card
let fcCards         = [];    // all loaded flashcards
let fcActiveEditor  = null;  // 'front' | 'back' — which side has focus
let fcColorFilter   = '';    // '' | 'red' | 'yellow' | 'green'
let fcSaveTimer     = null;

// --- DOM refs ---
const fcFolderList    = document.getElementById('fc-folder-list');
const fcAddFolderBtn  = document.getElementById('fc-add-folder-btn');
const fcCardList      = document.getElementById('fc-card-list');
const fcAddCardBtn    = document.getElementById('fc-add-card-btn');
const fcCardsEmpty    = document.getElementById('fc-cards-empty');
const fcSearch        = document.getElementById('fc-search');
const fcEditorArea    = document.getElementById('fc-editor-area');
const fcEditorPH      = document.getElementById('fc-editor-placeholder');
const fcEditorContent = document.getElementById('fc-editor-content');
const fcFrontEditor   = document.getElementById('fc-front-editor');
const fcBackEditor    = document.getElementById('fc-back-editor');
const fcRevealRow     = document.getElementById('fc-reveal-row');
const fcRevealBtn     = document.getElementById('fc-reveal-btn');
const fcBackContent   = document.getElementById('fc-back-content');
const fcSaveStatus    = document.getElementById('fc-save-status');
const fcDeleteBtn     = document.getElementById('fc-delete-card-btn');
const fcColorPicker   = document.getElementById('fc-color-picker');
const fcCtxMenu       = document.getElementById('fc-ctx-menu');
const fcCtxRename     = document.getElementById('fc-ctx-rename');
const fcCtxDelete     = document.getElementById('fc-ctx-delete');

let fcCtxTarget = null;
let fcCtxType   = null;

// --- LaTeX helpers ---
function renderLatexInEl(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  }
}

// --- Save / load helpers ---
function fcGetCard(id) { return fcCards.find(c => c.id === id) || null; }

function fcScheduleSave() {
  fcSaveStatus.textContent = 'Editing...';
  clearTimeout(fcSaveTimer);
  fcSaveTimer = setTimeout(fcSaveCurrentCard, 1200);
}

async function fcSaveCurrentCard() {
  if (!fcActiveCardId) return;
  const card = fcGetCard(fcActiveCardId);
  if (!card) return;
  stripHighlights(fcFrontEditor);
  stripHighlights(fcBackEditor);
  card.front = fcFrontEditor.innerHTML;
  card.back  = fcBackEditor.innerHTML;
  try {
    await invoke('update_flashcard', { card });
    fcSaveStatus.textContent = 'Saved';
    setTimeout(() => { if (fcSaveStatus.textContent === 'Saved') fcSaveStatus.textContent = ''; }, 1500);
    fcUpdateCardListItem(card);
  } catch (e) {
    fcSaveStatus.textContent = 'Error';
  }
}

// --- FC folder tree state ---
// Set of folder paths that are expanded in the tree
const fcExpandedFolders = new Set();

// --- Render folders as a tree ---
async function loadFcFolders() {
  fcCards = await invoke('list_flashcards');
  const folders = await invoke('list_fc_folders');
  fcFolderList.innerHTML = '';

  // "All cards" entry
  const allLi = document.createElement('li');
  allLi.className = 'module-item' + (fcActiveFolder === null ? ' active' : '');
  allLi.dataset.name = '__all__';
  allLi.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
    <span>All cards</span>`;
  allLi.addEventListener('click', () => selectFcFolder(null));
  fcFolderList.appendChild(allLi);

  // Build tree from flat folder list
  renderFcFolderTree(folders, '', 0);
  fcRenderCardList();
}

function renderFcFolderTree(allFolders, prefix, depth) {
  // Collect direct children at this level
  const children = new Map(); // segment -> full path
  for (const f of allFolders) {
    if (prefix && !f.startsWith(prefix + '/')) continue;
    const rest = prefix ? f.slice(prefix.length + 1) : f;
    const seg = rest.split('/')[0];
    const fullPath = prefix ? prefix + '/' + seg : seg;
    if (!children.has(seg)) children.set(seg, fullPath);
  }

  let childEntries = Array.from(children.entries()); // [[seg, fullPath], ...]

  for (const [seg, fullPath] of childEntries) {
    // Check if this path has children
    const hasChildren = allFolders.some(f => f.startsWith(fullPath + '/'));
    const isExpanded = fcExpandedFolders.has(fullPath);
    const li = makeFcFolderItem(seg, fullPath, depth, hasChildren, isExpanded);
    fcFolderList.appendChild(li);
    if (hasChildren && isExpanded) {
      renderFcFolderTree(allFolders, fullPath, depth + 1);
    }
  }
}

function makeFcFolderItem(label, fullPath, depth, hasChildren, isExpanded) {
  const li = document.createElement('li');
  li.className = 'module-item' + (fullPath === fcActiveFolder ? ' active' : '');
  li.dataset.name = fullPath;
  li.style.paddingLeft = (8 + depth * 14) + 'px';

  const arrowSvg = hasChildren
    ? `<svg class="fc-folder-arrow ${isExpanded ? 'expanded' : ''}" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
    : `<span style="display:inline-block;width:10px"></span>`;

  li.innerHTML = `
    ${arrowSvg}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <span>${escHtml(label)}</span>`;

  if (hasChildren) {
    li.querySelector('.fc-folder-arrow').addEventListener('click', (e) => {
      e.stopPropagation();
      if (fcExpandedFolders.has(fullPath)) {
        fcExpandedFolders.delete(fullPath);
      } else {
        fcExpandedFolders.add(fullPath);
      }
      loadFcFolders();
    });
  }

  li.addEventListener('click', () => selectFcFolder(fullPath));
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fcCtxTarget = fullPath;
    fcCtxType   = 'folder';
    fcCtxMenu.style.display = 'block';
    fcCtxMenu.style.left = e.clientX + 'px';
    fcCtxMenu.style.top  = e.clientY + 'px';
  });
  return li;
}

async function selectFcFolder(name) {
  await fcMaybeSave();
  fcActiveFolder = name;
  fcAddCardBtn.style.display = '';
  fcShowEditorPlaceholder();
  document.querySelectorAll('#fc-folder-list .module-item').forEach(el => {
    const isAll    = name === null && el.dataset.name === '__all__';
    const isFolder = name !== null && el.dataset.name === name;
    el.classList.toggle('active', isAll || isFolder);
  });
  fcRenderCardList();
}

// --- Render card list ---
function fcFilteredCards() {
  let cards = fcCards;
  if (fcActiveFolder !== null) {
    // Show cards in this folder and all its subfolders
    cards = cards.filter(c => c.folder === fcActiveFolder || c.folder.startsWith(fcActiveFolder + '/'));
  }
  if (fcColorFilter) {
    cards = cards.filter(c => c.color === fcColorFilter);
  }
  const query = fcSearch.value.trim().toLowerCase();
  if (query) {
    cards = cards.filter(c => {
      const front = document.createElement('div');
      front.innerHTML = c.front;
      const back = document.createElement('div');
      back.innerHTML = c.back;
      return front.textContent.toLowerCase().includes(query) ||
             back.textContent.toLowerCase().includes(query);
    });
  }
  return cards;
}

function fcRenderCardList() {
  const cards = fcFilteredCards();
  const query = fcSearch.value.trim();
  fcCardList.innerHTML = '';
  if (cards.length === 0) {
    fcCardsEmpty.style.display = 'flex';
    if (query) {
      fcCardsEmpty.querySelector('span').textContent = 'No results';
    } else if (fcActiveFolder === null && !fcColorFilter) {
      fcCardsEmpty.querySelector('span').textContent = 'No cards yet';
    } else {
      fcCardsEmpty.querySelector('span').textContent = 'No cards here';
    }
  } else {
    fcCardsEmpty.style.display = 'none';
  }
  // Show add btn only when a folder is selected (not "All")
  fcAddCardBtn.style.display = (fcActiveFolder !== null) ? '' : 'none';
  for (const card of cards) {
    fcCardList.appendChild(makeFcCardItem(card));
  }
}

function fcCardPreviewText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) || '(empty)';
}

function makeFcCardItem(card) {
  const li = document.createElement('li');
  li.className = 'fc-card-item' + (card.id === fcActiveCardId ? ' active' : '');
  if (card.color) li.classList.add('color-' + card.color);
  li.dataset.id = card.id;

  li.innerHTML = `
    <span class="fc-card-item-dot"></span>
    <span class="fc-card-item-text">${escHtml(fcCardPreviewText(card.front))}</span>`;
  li.addEventListener('click', () => openFcCard(card.id));
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fcCtxTarget = card.id;
    fcCtxType   = 'card';
    fcCtxMenu.style.display = 'block';
    fcCtxMenu.style.left = e.clientX + 'px';
    fcCtxMenu.style.top  = e.clientY + 'px';
  });
  return li;
}

function fcUpdateCardListItem(card) {
  const li = fcCardList.querySelector(`[data-id="${card.id}"]`);
  if (!li) return;
  li.className = 'fc-card-item' + (card.id === fcActiveCardId ? ' active' : '');
  if (card.color) li.classList.add('color-' + card.color);
  li.querySelector('.fc-card-item-text').textContent = fcCardPreviewText(card.front);
}

// --- Open card in editor ---
async function openFcCard(id) {
  await fcMaybeSave();
  const card = fcGetCard(id);
  if (!card) return;
  fcActiveCardId = id;
  fcFrontEditor.innerHTML = card.front;
  fcBackEditor.innerHTML  = card.back;
  reattachImageResizers(fcFrontEditor, fcScheduleSave);
  reattachImageResizers(fcBackEditor, fcScheduleSave);
  const fcQuery = fcSearch.value.trim();
  highlightQuery(fcFrontEditor, fcQuery);
  highlightQuery(fcBackEditor, fcQuery);
  renderLatexInEl(fcFrontEditor);
  renderLatexInEl(fcBackEditor);
  fcShowEditorContent(card.color);
  // Hide back side until user reveals it
  fcRevealRow.style.display = '';
  fcBackContent.style.display = 'none';
  document.querySelectorAll('.fc-card-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  // Sync color picker
  document.querySelectorAll('.fc-color-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.color === card.color));
}

function fcShowEditorPlaceholder() {
  fcEditorPH.style.display = '';
  fcEditorContent.style.display = 'none';
  fcActiveCardId = null;
}

function fcShowEditorContent(color) {
  fcEditorPH.style.display = 'none';
  fcEditorContent.style.display = 'flex';
  fcEditorContent.className = '';
  if (color) fcEditorContent.classList.add('card-' + color);
}

async function fcMaybeSave() {
  if (fcActiveCardId) {
    clearTimeout(fcSaveTimer);
    await fcSaveCurrentCard();
  }
}

// --- Add folder ---
fcAddFolderBtn.addEventListener('click', async () => {
  // Pre-fill with current folder path as prefix so user can easily create a subfolder
  const defaultVal = fcActiveFolder ? fcActiveFolder + '/' : '';
  const name = await openModal('New folder', 'e.g. Math or Math/Algebra', 'Create', defaultVal);
  if (!name) return;
  // Persist the folder (and all parent segments) so empty folders survive reloads
  await invoke('create_fc_folder', { name });
  // Auto-expand all parent segments
  const segs = name.split('/');
  for (let i = 1; i < segs.length; i++) {
    fcExpandedFolders.add(segs.slice(0, i).join('/'));
  }
  fcActiveFolder = name;
  await loadFcFolders();
  await selectFcFolder(name);
});

// --- Add card ---
fcAddCardBtn.addEventListener('click', async () => {
  if (fcActiveFolder === null) return;
  const id = newId();
  const card = { id, folder: fcActiveFolder, front: '', back: '', color: '' };
  await invoke('create_flashcard', { card });
  fcCards.push(card);
  fcRenderCardList();
  await openFcCard(id);
});

// --- Delete card ---
fcDeleteBtn.addEventListener('click', async () => {
  if (!fcActiveCardId) return;
  const confirmed = await showConfirm('Move to trash?', 'This card will be moved to the flashcard trash.');
  if (!confirmed) return;
  await invoke('delete_flashcard', { id: fcActiveCardId });
  fcCards = fcCards.filter(c => c.id !== fcActiveCardId);
  fcActiveCardId = null;
  fcShowEditorPlaceholder();
  fcRenderCardList();
  // Update trash badge
  const fcItems = await invoke('list_fc_trash');
  fcTrashCount.textContent = fcItems.length;
  fcTrashCount.style.display = fcItems.length > 0 ? '' : 'none';
});

// --- Color picker ---
document.querySelectorAll('.fc-color-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!fcActiveCardId) return;
    const color = btn.dataset.color;
    const card = fcGetCard(fcActiveCardId);
    if (!card) return;
    card.color = color;
    document.querySelectorAll('.fc-color-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.color === color));
    fcShowEditorContent(color);
    await invoke('update_flashcard', { card });
    fcUpdateCardListItem(card);
  });
});

// --- FC search ---
fcSearch.addEventListener('input', () => fcRenderCardList());

// --- Color filter ---
document.querySelectorAll('.fc-color-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    fcColorFilter = btn.dataset.color;
    document.querySelectorAll('.fc-color-filter').forEach(b =>
      b.classList.toggle('active', b === btn));
    fcRenderCardList();
  });
});

// --- Reveal back side ---
fcRevealBtn.addEventListener('click', () => {
  fcRevealRow.style.display = 'none';
  fcBackContent.style.display = 'flex';
});

// --- FC format toolbar ---
let fcLastFocusedEditor = fcFrontEditor;
fcFrontEditor.addEventListener('focus', () => { fcLastFocusedEditor = fcFrontEditor; });
fcBackEditor.addEventListener('focus',  () => { fcLastFocusedEditor = fcBackEditor; });

document.querySelectorAll('.fc-fmt').forEach(btn => {
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    fcLastFocusedEditor.focus();
    const cmd = btn.dataset.cmd;
    if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') {
      document.execCommand('formatBlock', false, cmd);
    } else if (cmd) {
      document.execCommand(cmd, false, null);
    }
  });
});

// FC divider btn
document.getElementById('fc-divider-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();
  fcLastFocusedEditor.focus();
  document.execCommand('insertHTML', false, '<hr><p><br></p>');
  fcScheduleSave();
});

// FC box btn
document.getElementById('fc-box-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();
  fcLastFocusedEditor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const existingBox = node.closest ? node.closest('.text-box') : null;
  if (existingBox) {
    const frag = document.createDocumentFragment();
    while (existingBox.firstChild) frag.appendChild(existingBox.firstChild);
    existingBox.replaceWith(frag);
  } else {
    const range = sel.getRangeAt(0);
    const box = document.createElement('div');
    box.className = 'text-box';
    const frag = range.extractContents();
    const tmp = document.createElement('div');
    tmp.appendChild(frag);
    const hasBlock = Array.from(tmp.childNodes).some(n =>
      n.nodeType === Node.ELEMENT_NODE && /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|TABLE)$/.test(n.nodeName)
    );
    if (!hasBlock) {
      const p = document.createElement('p');
      while (tmp.firstChild) p.appendChild(tmp.firstChild);
      tmp.appendChild(p);
    }
    while (tmp.firstChild) box.appendChild(tmp.firstChild);
    range.insertNode(box);
    const after = document.createElement('p');
    after.innerHTML = '<br>';
    box.after(after);
  }
  fcScheduleSave();
});

// FC LaTeX btn
// --- FC LaTeX Button ---
document.getElementById('fc-latex-btn').addEventListener('mousedown', (e) => {
  e.preventDefault();

  // Letzter fokussierter Editor – musst du ggf. global setzen
  const targetEditor = fcLastFocusedEditor;

  // 🔹 Aktuelle Cursor-Position speichern (Range merken)
  let savedRange = null;
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }

  // --- Modal öffnen ---
  const latexOverlay = document.getElementById('latex-modal-overlay');
  const latexInput   = document.getElementById('latex-input');
  const confirmBtn   = document.getElementById('latex-confirm-btn');
  const cancelBtn    = document.getElementById('latex-cancel-btn');

  latexInput.value = '';
  latexOverlay.style.display = 'flex';
  latexInput.focus();

  // --- Hilfsfunktionen ---
  function closeLatex() {
    latexOverlay.style.display = 'none';
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', onCancel);
    latexInput.removeEventListener('keydown', onKey);
  }

  function onConfirm() {
    const raw = latexInput.value.trim();
    closeLatex();
    if (!raw) return;

    // Inline oder Display-LaTeX unterscheiden
    const isDisplay = raw.startsWith('\\[') || raw.startsWith('$$');
    const markup = isDisplay ? raw : `$${raw}$`;

    // 🔹 Alte Cursorposition wiederherstellen und Text einfügen
    targetEditor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (savedRange) {
      selection.addRange(savedRange);
    }

    document.execCommand('insertText', false, markup);

    // Rendern + Speichern
    renderLatexInEl(targetEditor);
    fcScheduleSave();
  }

  function onCancel() { closeLatex(); }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onConfirm();
    }
    if (e.key === 'Escape') onCancel();
  }

  // --- Listener anhängen ---
  confirmBtn.addEventListener('click', onConfirm);
  cancelBtn.addEventListener('click', onCancel);
  latexInput.addEventListener('keydown', onKey);
});

// --- Autosave on input ---
fcFrontEditor.addEventListener('input', fcScheduleSave);
fcBackEditor.addEventListener('input',  fcScheduleSave);
fcFrontEditor.addEventListener('paste', (e) => handleImagePaste(fcFrontEditor, fcScheduleSave, e));
fcBackEditor.addEventListener('paste',  (e) => handleImagePaste(fcBackEditor, fcScheduleSave, e));

// --- FC context menu ---
document.addEventListener('click', () => {
  fcCtxMenu.style.display = 'none';
  fcCtxTarget = null;
  fcCtxType   = null;
});

fcCtxRename.addEventListener('click', async () => {
  const type = fcCtxType, target = fcCtxTarget;
  fcCtxMenu.style.display = 'none';

  if (type === 'folder') {
    const newName = await openModal('Move / rename folder', 'Path (e.g. parent/name)', 'Rename', target);
    if (!newName || newName === target) return;
    await invoke('rename_fc_folder', { oldName: target, newName });
    // Update expanded state
    const prefix = target + '/';
    const toAdd = [];
    for (const p of fcExpandedFolders) {
      if (p === target) { fcExpandedFolders.delete(p); toAdd.push(newName); }
      else if (p.startsWith(prefix)) { fcExpandedFolders.delete(p); toAdd.push(newName + '/' + p.slice(prefix.length)); }
    }
    toAdd.forEach(p => fcExpandedFolders.add(p));
    // Update active folder
    if (fcActiveFolder === target) fcActiveFolder = newName;
    else if (fcActiveFolder && fcActiveFolder.startsWith(prefix)) fcActiveFolder = newName + '/' + fcActiveFolder.slice(prefix.length);
    await loadFcFolders();
  } else if (type === 'card') {
    const card = fcGetCard(target);
    if (!card) return;
    const newFolder = await openModal('Move card to folder', 'Folder path (e.g. Math/Algebra)', 'Move', card.folder);
    if (newFolder === null || newFolder === card.folder) return;
    card.folder = newFolder;
    await invoke('update_flashcard', { card });
    fcRenderCardList();
  }
});

fcCtxDelete.addEventListener('click', async () => {
  const type = fcCtxType, target = fcCtxTarget;
  fcCtxMenu.style.display = 'none';

  if (type === 'folder') {
    const prefix = target + '/';
    const folderCards = fcCards.filter(c => c.folder === target || c.folder.startsWith(prefix));
    const confirmed = await showConfirm(
      `Move folder to trash?`,
      `"${target}" and ${folderCards.length} card${folderCards.length === 1 ? '' : 's'} will be moved to the flashcard trash.`
    );
    if (!confirmed) return;
    await invoke('delete_fc_folder', { name: target });
    if (fcActiveFolder === target || (fcActiveFolder && fcActiveFolder.startsWith(prefix))) {
      fcActiveFolder = null;
      fcShowEditorPlaceholder();
    }
    fcCards = fcCards.filter(c => c.folder !== target && !c.folder.startsWith(prefix));
    await loadFcFolders();
    // Update trash badge
    const fcItems = await invoke('list_fc_trash');
    fcTrashCount.textContent = fcItems.length;
    fcTrashCount.style.display = fcItems.length > 0 ? '' : 'none';
  } else if (type === 'card') {
    const confirmed = await showConfirm('Move to trash?', 'This card will be moved to the flashcard trash.');
    if (!confirmed) return;
    await invoke('delete_flashcard', { id: target });
    fcCards = fcCards.filter(c => c.id !== target);
    if (fcActiveCardId === target) {
      fcActiveCardId = null;
      fcShowEditorPlaceholder();
    }
    fcRenderCardList();
    // Update trash badge
    const fcItems = await invoke('list_fc_trash');
    fcTrashCount.textContent = fcItems.length;
    fcTrashCount.style.display = fcItems.length > 0 ? '' : 'none';
  }
});

// ── FC Trash ──────────────────────────────────────────────────────────────

const fcTrashPanel     = document.getElementById('fc-trash-panel');
const fcTrashList      = document.getElementById('fc-trash-list');
const fcTrashEmptyHint = document.getElementById('fc-trash-empty-hint');
const fcTrashCount     = document.getElementById('fc-trash-count');

document.getElementById('fc-trash-btn').addEventListener('click', async () => {
  const isOpen = fcTrashPanel.style.display !== 'none';
  fcTrashPanel.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) await loadFcTrash();
});

document.getElementById('fc-trash-close-btn').addEventListener('click', () => {
  fcTrashPanel.style.display = 'none';
});

document.getElementById('fc-trash-empty-btn').addEventListener('click', async () => {
  const items = await invoke('list_fc_trash');
  if (items.length === 0) return;
  const confirmed = await showConfirm(
    'Empty trash?',
    `This will permanently delete all ${items.length} item${items.length === 1 ? '' : 's'}. This cannot be undone.`
  );
  if (!confirmed) return;
  for (const item of items) {
    await invoke('delete_fc_trash_item', { id: item.id });
  }
  await loadFcTrash();
});

async function loadFcTrash() {
  const items = await invoke('list_fc_trash');
  fcTrashList.innerHTML = '';
  if (items.length === 0) {
    fcTrashEmptyHint.style.display = 'flex';
    fcTrashCount.style.display = 'none';
  } else {
    fcTrashEmptyHint.style.display = 'none';
    fcTrashCount.textContent = items.length;
    fcTrashCount.style.display = '';
    for (const item of items) {
      fcTrashList.appendChild(makeFcTrashItem(item));
    }
  }
}

function makeFcTrashItem(item) {
  const li = document.createElement('li');
  li.className = 'trash-item';

  const icon = item.kind === 'folder'
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;

  const kindLabel = item.kind === 'folder'
    ? `folder · ${item.cards.length} card${item.cards.length === 1 ? '' : 's'}`
    : `card · ${escHtml(item.folder || 'no folder')}`;

  li.innerHTML = `
    ${icon}
    <div class="trash-item-info">
      <div class="trash-item-name">${escHtml(item.name)}</div>
      <div class="trash-item-meta">${kindLabel} · ${relativeTime(item.deleted_at)}</div>
    </div>
    <div class="trash-item-actions">
      <button class="icon-btn restore-btn" title="Restore">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.61"/></svg>
      </button>
      <button class="icon-btn danger perm-del-btn" title="Delete permanently">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`;

  li.querySelector('.restore-btn').addEventListener('click', async () => {
    await invoke('restore_fc_trash_item', { id: item.id });
    fcCards = await invoke('list_flashcards');
    await loadFcFolders();
    await loadFcTrash();
  });

  li.querySelector('.perm-del-btn').addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Delete permanently?',
      `"${item.name}" will be permanently deleted. This cannot be undone.`
    );
    if (!confirmed) return;
    await invoke('delete_fc_trash_item', { id: item.id });
    await loadFcTrash();
  });

  return li;
}

// ── Panel resize & hide ────────────────────────────────────────────────────

(function initPanelResize() {
  const MIN_W = 120;
  const MAX_W = 500;

  // Config per view: [panel-el, resize-handle-el, storage-key, hide-btn-el, show-strip-id]
  const panels = [
    {
      view: 'notes',
      panel: document.getElementById('notes-sidebar'),
      handle: document.getElementById('notes-resize-1'),
      storageW: 'panel-w-notes-sidebar',
      storageH: 'panel-hidden-notes-sidebar',
      hideBtn: document.getElementById('notes-sidebar-hide-btn'),
      showStripId: 'notes-sidebar-show-strip',
    },
    {
      view: 'notes',
      panel: document.getElementById('notes-panel'),
      handle: document.getElementById('notes-resize-2'),
      storageW: 'panel-w-notes-panel',
      storageH: 'panel-hidden-notes-panel',
      hideBtn: document.getElementById('notes-panel-hide-btn'),
      showStripId: 'notes-panel-show-strip',
    },
    {
      view: 'fc',
      panel: document.getElementById('fc-sidebar'),
      handle: document.getElementById('fc-resize-1'),
      storageW: 'panel-w-fc-sidebar',
      storageH: 'panel-hidden-fc-sidebar',
      hideBtn: document.getElementById('fc-sidebar-hide-btn'),
      showStripId: 'fc-sidebar-show-strip',
    },
    {
      view: 'fc',
      panel: document.getElementById('fc-cards-panel'),
      handle: document.getElementById('fc-resize-2'),
      storageW: 'panel-w-fc-cards-panel',
      storageH: 'panel-hidden-fc-cards-panel',
      hideBtn: document.getElementById('fc-cards-panel-hide-btn'),
      showStripId: 'fc-cards-panel-show-strip',
    },
  ];

  function hidePanel(cfg) {
    cfg.panel.classList.add('collapsed');
    cfg.handle.style.display = 'none';
    cfg.hideBtn.style.display = 'none';
    cfg.showStrip.classList.remove('hidden');
    localStorage.setItem(cfg.storageH, '1');
  }

  function showPanel(cfg) {
    cfg.panel.classList.remove('collapsed');
    cfg.handle.style.display = '';
    cfg.hideBtn.style.display = '';
    cfg.showStrip.classList.add('hidden');
    localStorage.removeItem(cfg.storageH);
  }

  panels.forEach(cfg => {
    // Restore saved width
    const savedW = parseInt(localStorage.getItem(cfg.storageW));
    if (savedW && savedW >= MIN_W && savedW <= MAX_W) {
      cfg.panel.style.width = savedW + 'px';
    }

    // Create show-strip element (collapsed-state clickable sliver)
    const strip = document.createElement('div');
    strip.className = 'panel-show-strip hidden';
    strip.id = cfg.showStripId;
    strip.title = 'Show panel';
    strip.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    cfg.handle.parentNode.insertBefore(strip, cfg.handle);
    cfg.showStrip = strip;

    // Restore hidden state
    if (localStorage.getItem(cfg.storageH) === '1') {
      hidePanel(cfg);
    }

    // Hide button click
    cfg.hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePanel(cfg);
    });

    // Show strip click
    strip.addEventListener('click', (e) => {
      e.stopPropagation();
      showPanel(cfg);
    });

    // Drag to resize
    cfg.handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = cfg.panel.getBoundingClientRect().width;
      cfg.handle.classList.add('dragging');

      function onMove(ev) {
        const newW = Math.min(MAX_W, Math.max(MIN_W, startW + ev.clientX - startX));
        cfg.panel.style.width = newW + 'px';
      }
      function onUp() {
        cfg.handle.classList.remove('dragging');
        const finalW = cfg.panel.getBoundingClientRect().width;
        localStorage.setItem(cfg.storageW, Math.round(finalW));
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
})();

// ════════════════════════════════════════════════════
//  STATS & STOPWATCH
// ════════════════════════════════════════════════════

(function () {
  // --- State ---
  let swRunning = false;
  let swStartTime = null;      // Date when current run started
  let swElapsed = 0;           // accumulated seconds before current run
  let swInterval = null;

  let allSessions = [];        // loaded from backend
  let chartOffset = 0;         // days to shift window back (0 = last 30 days ending today)
  let statsInitialized = false;
  const dayOriginalSeconds = {}; // tracks original (pre-edit) seconds per date
  let barRects = [];           // [{x, y, w, h, day}] for hit testing

  // --- Helpers ---
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function formatHMS(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }

  function formatDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${secs}s`;
  }

  function shiftDate(base, n) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }

  function fmtDateShort(d) {
    return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`;
  }

  function fmtDateFull(d) {
    return `${d.getDate()}. ${d.toLocaleString('default',{month:'short'})} ${d.getFullYear()}`;
  }

  // Build array of {date, seconds} for the 30-day window ending at offset
  function buildWindow() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = shiftDate(today, -chartOffset);
    const startDate = shiftDate(endDate, -29);

    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = shiftDate(startDate, i);
      const ds = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      days.push({ date: ds, d, seconds: 0 });
    }

    for (const s of allSessions) {
      const idx = days.findIndex(day => day.date === s.date);
      if (idx !== -1) days[idx].seconds += s.duration;
    }

    return { days, startDate, endDate };
  }

  // --- Stopwatch ---
  const display = document.getElementById('stopwatch-display');
  const startBtn = document.getElementById('stopwatch-start-btn');
  const stopBtn = document.getElementById('stopwatch-stop-btn');
  const discardBtn = document.getElementById('stopwatch-discard-btn');

  function updateDisplay() {
    const total = swRunning
      ? swElapsed + Math.floor((Date.now() - swStartTime) / 1000)
      : swElapsed;
    display.textContent = formatHMS(total);
  }

  startBtn.addEventListener('click', () => {
    if (swRunning) return;
    swRunning = true;
    swStartTime = Date.now();
    swInterval = setInterval(updateDisplay, 500);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    discardBtn.disabled = false;
    display.classList.add('running');
  });

  stopBtn.addEventListener('click', async () => {
    if (!swRunning) return;
    clearInterval(swInterval);
    swElapsed += Math.floor((Date.now() - swStartTime) / 1000);
    swRunning = false;

    const session = {
      id: `${Date.now()}`,
      date: todayStr(),
      duration: swElapsed,
      started_at: Math.floor(swStartTime / 1000),
    };

    await invoke('save_session', { session });
    allSessions.push(session);

    // reset
    swElapsed = 0;
    swStartTime = null;
    display.textContent = '00:00:00';
    display.classList.remove('running');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    discardBtn.disabled = true;

    renderChart();
    renderStats();
  });

  discardBtn.addEventListener('click', async () => {
    if (!await showConfirm('Discard session?', 'The current time will not be saved.')) return;
    clearInterval(swInterval);
    swRunning = false;
    swElapsed = 0;
    swStartTime = null;
    display.textContent = '00:00:00';
    display.classList.remove('running');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    discardBtn.disabled = true;
  });

  // --- Stats cards ---
  function renderStats() {
    // Total
    const totalSec = allSessions.reduce((s, x) => s + x.duration, 0);
    document.getElementById('stat-total').textContent = totalSec > 0 ? formatDuration(totalSec) : '—';

    // Avg per active day (days with at least one session)
    const dayMap = {};
    for (const s of allSessions) {
      dayMap[s.date] = (dayMap[s.date] || 0) + s.duration;
    }
    const activeDays = Object.keys(dayMap).length;
    const avgSec = activeDays > 0 ? Math.round(totalSec / activeDays) : 0;
    document.getElementById('stat-avg').textContent = avgSec > 0 ? formatDuration(avgSec) : '—';

    // Streak: consecutive days up to and including today
    let streak = 0;
    const d = new Date();
    d.setHours(0,0,0,0);
    while (true) {
      const ds = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      if (dayMap[ds]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    document.getElementById('stat-streak').textContent = streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''}` : '—';
  }

  // --- Chart ---
  function renderChart() {
    const canvas = document.getElementById('stats-chart');
    const { days, startDate, endDate } = buildWindow();

    // Update range label
    document.getElementById('chart-range-label').textContent =
      `${fmtDateFull(startDate)} – ${fmtDateFull(endDate)}`;

    // Disable next if already at today
    const today = new Date(); today.setHours(0,0,0,0);
    document.getElementById('chart-next-btn').disabled = chartOffset === 0;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth;
    const H = canvas.parentElement.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    // Compute styles from CSS vars
    const cs = getComputedStyle(document.documentElement);
    const accent    = cs.getPropertyValue('--accent').trim();
    const accentDim = cs.getPropertyValue('--accent-dim').trim();
    const textMuted = cs.getPropertyValue('--text-muted').trim();
    const border    = cs.getPropertyValue('--border').trim();

    const FONT_SIZE = 11;
    const PAD_LEFT = 46;
    const PAD_RIGHT = 10;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 32;

    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;

    const maxSec = Math.max(...days.map(d => d.seconds), 60);
    // Round up to nice number
    const maxH = maxSec / 3600;
    const niceMax = maxH <= 1 ? 1 : maxH <= 2 ? 2 : maxH <= 4 ? 4 : maxH <= 6 ? 6 : Math.ceil(maxH);
    const maxDisplay = niceMax * 3600;

    const barCount = 30;
    const gap = 3;
    const barW = Math.max(2, (chartW - gap * (barCount - 1)) / barCount);

    ctx.clearRect(0, 0, W, H);

    // Horizontal grid lines
    const gridLines = 4;
    ctx.font = `${FONT_SIZE}px var(--font, sans-serif)`;
    for (let i = 0; i <= gridLines; i++) {
      const val = (maxDisplay / gridLines) * i;
      const y = PAD_TOP + chartH - (val / maxDisplay) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + chartW, y);
      ctx.strokeStyle = i === 0 ? border : border;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Y label
      const hVal = val / 3600;
      const label = hVal >= 1 ? `${hVal}h` : `${Math.round(val / 60)}m`;
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, PAD_LEFT - 6, y);
    }

    // Bars
    barRects = [];
    days.forEach((day, i) => {
      const x = PAD_LEFT + i * (barW + gap);
      const barH = day.seconds > 0 ? Math.max(2, (day.seconds / maxDisplay) * chartH) : 0;
      const y = PAD_TOP + chartH - barH;

      // Store hit rect (full column height for easier clicking)
      barRects.push({ x, y: PAD_TOP, w: barW, h: chartH, day });

      if (barH > 0) {
        ctx.fillStyle = accent;
        const r = Math.min(3, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = accentDim;
        ctx.fillRect(x, PAD_TOP + chartH - 2, barW, 2);
      }

      // X-axis labels: every 5 bars, plus first and last
      if (i === 0 || i === 29 || (i + 1) % 5 === 0) {
        ctx.fillStyle = textMuted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${FONT_SIZE}px var(--font, sans-serif)`;
        ctx.fillText(fmtDateShort(day.d), x + barW / 2, PAD_TOP + chartH + 6);
      }
    });
  }

  // --- Bar click → edit time ---
  const canvas = document.getElementById('stats-chart');

  canvas.style.cursor = 'default';
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = barRects.find(b => b.day.seconds > 0 && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
    canvas.style.cursor = hit ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = barRects.find(b => b.day.seconds > 0 && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
    if (!hit) return;
    openEditTimeModal(hit.day, e.clientX, e.clientY);
  });

  function openEditTimeModal(day, clientX, clientY) {
    // Record the original seconds for this date the first time it's edited
    if (dayOriginalSeconds[day.date] === undefined || day.seconds > dayOriginalSeconds[day.date]) {
      dayOriginalSeconds[day.date] = day.seconds;
    }
    const currentSec = day.seconds;
    const totalSec = dayOriginalSeconds[day.date];
    const totalH = Math.floor(totalSec / 3600);
    const totalM = Math.floor((totalSec % 3600) / 60);
    const curH = Math.floor(currentSec / 3600);
    const curM = Math.floor((currentSec % 3600) / 60);

    // Build popover
    let pop = document.getElementById('bar-edit-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'bar-edit-pop';
      pop.className = 'bar-edit-pop';
      document.body.appendChild(pop);
    }

    pop.innerHTML = `
      <div class="bar-edit-title">Edit time for <strong>${day.date}</strong></div>
      <div class="bar-edit-hint">Max: ${totalH}h ${totalM}m</div>
      <div class="bar-edit-row">
        <input type="number" id="bar-edit-h" class="bar-edit-input" min="0" max="${totalH}" value="${curH}" />
        <span class="bar-edit-sep">h</span>
        <input type="number" id="bar-edit-m" class="bar-edit-input" min="0" max="59" value="${curM}" />
        <span class="bar-edit-sep">m</span>
      </div>
      <div class="bar-edit-actions">
        <button class="stopwatch-btn" id="bar-edit-cancel">Cancel</button>
        <button class="stopwatch-btn primary" id="bar-edit-confirm">Save</button>
      </div>
    `;

    // Position near click, keep on screen
    pop.style.display = 'block';
    const pw = 240, ph = 140;
    let left = clientX + 12;
    let top = clientY - 20;
    if (left + pw > window.innerWidth - 8) left = clientX - pw - 12;
    if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    // Enforce max on hour input change (m max depends on h)
    const hInput = document.getElementById('bar-edit-h');
    const mInput = document.getElementById('bar-edit-m');

    function clampInputs() {
      let h = Math.min(parseInt(hInput.value) || 0, totalH);
      let m = parseInt(mInput.value) || 0;
      if (h === totalH) {
        mInput.max = totalM;
        m = Math.min(m, totalM);
      } else {
        mInput.max = 59;
      }
      hInput.value = h;
      mInput.value = m;
    }
    hInput.addEventListener('input', clampInputs);
    mInput.addEventListener('input', clampInputs);

    document.getElementById('bar-edit-cancel').addEventListener('click', () => {
      pop.style.display = 'none';
    });

    document.getElementById('bar-edit-confirm').addEventListener('click', async () => {
      clampInputs();
      const newSec = (parseInt(hInput.value) || 0) * 3600 + (parseInt(mInput.value) || 0) * 60;
      if (newSec === currentSec) { pop.style.display = 'none'; return; }

      if (newSec === 0) {
        const confirmed = await showConfirm(
          'Delete all sessions?',
          `Setting the time to 0 will permanently delete all sessions for ${day.date}.`
        );
        if (!confirmed) return;
      }

      const diff = currentSec - newSec; // positive = reduce, negative = increase

      if (diff > 0) {
        // Reduce: trim sessions from newest first
        const daySessions = allSessions
          .filter(s => s.date === day.date)
          .sort((a, b) => b.started_at - a.started_at);

        let toRemove = diff;
        for (const s of daySessions) {
          if (toRemove <= 0) break;
          if (s.duration <= toRemove) {
            toRemove -= s.duration;
            await invoke('delete_session', { id: s.id });
            allSessions = allSessions.filter(x => x.id !== s.id);
          } else {
            await invoke('delete_session', { id: s.id });
            const trimmed = { ...s, duration: s.duration - toRemove };
            await invoke('save_session', { session: trimmed });
            const idx = allSessions.findIndex(x => x.id === s.id);
            allSessions[idx] = trimmed;
            toRemove = 0;
          }
        }
      } else {
        // Increase: add seconds back to the newest session, or create a new one
        const toAdd = -diff;
        const daySessions = allSessions
          .filter(s => s.date === day.date)
          .sort((a, b) => b.started_at - a.started_at);

        if (daySessions.length > 0) {
          const s = daySessions[0];
          await invoke('delete_session', { id: s.id });
          const grown = { ...s, duration: s.duration + toAdd };
          await invoke('save_session', { session: grown });
          const idx = allSessions.findIndex(x => x.id === s.id);
          allSessions[idx] = grown;
        } else {
          const newSession = {
            id: `${Date.now()}`,
            date: day.date,
            duration: toAdd,
            started_at: Math.floor(Date.now() / 1000),
          };
          await invoke('save_session', { session: newSession });
          allSessions.push(newSession);
        }
      }

      pop.style.display = 'none';
      renderStats();
      renderChart();
    });

    // Close on outside click
    function onOutside(e) {
      if (!pop.contains(e.target)) {
        pop.style.display = 'none';
        document.removeEventListener('mousedown', onOutside);
      }
    }
    setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
  }

  // --- Chart navigation ---
  document.getElementById('chart-prev-btn').addEventListener('click', () => {
    chartOffset += 30;
    renderChart();
  });

  document.getElementById('chart-next-btn').addEventListener('click', () => {
    if (chartOffset > 0) {
      chartOffset = Math.max(0, chartOffset - 30);
      renderChart();
    }
  });

  // --- Init ---
  window.initStats = async function () {
    if (!statsInitialized) {
      allSessions = await invoke('list_sessions');
      statsInitialized = true;
    }
    renderStats();
    renderChart();
  };

  // Re-render chart on resize when stats tab is visible
  window.addEventListener('resize', () => {
    if (document.getElementById('view-stats').style.display !== 'none') {
      renderChart();
    }
  });
})();
