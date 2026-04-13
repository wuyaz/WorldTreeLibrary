export function normalizeManualWorldBookConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : { books: [] };
  cfg.books = Array.isArray(cfg.books) ? cfg.books : [];
  cfg.books.forEach((book) => {
    book.scope = book.scope || 'global';
    book.selected = Boolean(book.selected);
    book.includeAll = Boolean(book.includeAll);
    book.entries = Array.isArray(book.entries) ? book.entries : [];
    book.entries.forEach((entry) => {
      entry.selected = Boolean(entry.selected);
      entry.name = entry.name || '';
      entry.content = entry.content || '';
      entry.override = entry.override && typeof entry.override === 'object' ? entry.override : {};
    });
  });
  return cfg;
}

export function readManualWorldBookConfig(rawText) {
  let raw = { books: [] };
  try {
    raw = JSON.parse(rawText || '{"books": []}') || { books: [] };
  } catch (error) {
    console.warn('[WorldTreeLibrary] manual worldbook JSON invalid', error);
  }
  return normalizeManualWorldBookConfig(raw);
}

export function serializeManualWorldBookConfig(config) {
  return JSON.stringify(normalizeManualWorldBookConfig(config), null, 2);
}

export function mergeManualWorldBookConfig(template, current) {
  const merged = normalizeManualWorldBookConfig(JSON.parse(JSON.stringify(template || { books: [] })));
  const currentMap = new Map((current?.books || []).map((book) => [book.name, book]));

  for (const book of merged.books) {
    const currentBook = currentMap.get(book.name);
    if (!currentBook) continue;

    book.selected = Boolean(currentBook.selected);
    book.includeAll = Boolean(currentBook.includeAll);

    const entryMap = new Map((currentBook.entries || []).map((entry) => [entry.index, entry]));
    book.entries.forEach((entry) => {
      const currentEntry = entryMap.get(entry.index);
      if (!currentEntry) return;
      entry.selected = Boolean(currentEntry.selected);
      entry.name = currentEntry.name || entry.name;
      entry.content = currentEntry.content || entry.content;
      entry.override = { ...(entry.override || {}), ...(currentEntry.override || {}) };
    });
  }

  return merged;
}

export async function buildManualWorldBookTemplate() {
  const template = { books: [] };
  let listRes = { worldBooks: [] };

  try {
    listRes = await window.ST_API.worldBook.list({ scope: 'global' });
  } catch (error) {
    console.warn('[WorldTreeLibrary] worldBook.list failed', error);
  }

  for (const worldBook of listRes.worldBooks || []) {
    if (!worldBook?.name) continue;
    try {
      const res = await window.ST_API.worldBook.get({ name: worldBook.name, scope: 'global' });
      const entries = (res?.worldBook?.entries || []).map((entry) => ({
        index: entry.index,
        name: entry.name,
        content: entry.content || '',
        selected: false,
        override: {
          enabled: entry.enabled,
          activationMode: entry.activationMode,
          key: entry.key,
          secondaryKey: entry.secondaryKey,
          selectiveLogic: entry.selectiveLogic,
          role: entry.role,
          caseSensitive: entry.caseSensitive,
          excludeRecursion: entry.excludeRecursion,
          preventRecursion: entry.preventRecursion,
          probability: entry.probability,
          position: entry.position,
          order: entry.order,
          depth: entry.depth,
          other: entry.other
        }
      }));
      template.books.push({
        name: worldBook.name,
        scope: 'global',
        selected: false,
        includeAll: false,
        entries
      });
    } catch (error) {
      console.warn('[WorldTreeLibrary] worldBook.get template failed', error);
    }
  }

  return template;
}

function normalizeKeyValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(',');
  return String(value ?? '').trim();
}

function parseKeyValue(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function createLabeledInput(labelText, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'wtl-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.className = 'text_pole';
  input.value = value ?? '';
  input.addEventListener('input', () => onChange(input.value));
  wrap.appendChild(label);
  wrap.appendChild(input);
  return wrap;
}

function createLabeledNumber(labelText, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'wtl-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.className = 'text_pole';
  input.value = value ?? '';
  input.addEventListener('input', () => onChange(Number(input.value)));
  wrap.appendChild(label);
  wrap.appendChild(input);
  return wrap;
}

function createLabeledSelect(labelText, value, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'wtl-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const select = document.createElement('select');
  select.className = 'text_pole';
  const normalized = options.map((o) => {
    if (typeof o === 'string') return { value: o, label: o };
    return { value: o.value, label: o.label };
  });
  select.innerHTML = normalized.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  select.value = value ?? normalized[0]?.value;
  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}

function createLabeledTextarea(labelText, value, onChange) {
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = labelText;
  const textarea = document.createElement('textarea');
  textarea.className = 'text_pole';
  textarea.rows = 3;
  textarea.value = value ?? '';
  textarea.addEventListener('input', () => onChange(textarea.value));
  wrap.appendChild(label);
  wrap.appendChild(textarea);
  return wrap;
}

function renderEntryDetail({ detail, entry, sync }) {
  detail.appendChild(createLabeledInput('名称', entry.name || '', (v) => { entry.name = v; sync(); }));
  detail.appendChild(createLabeledTextarea('内容', entry.content || '', (v) => { entry.content = v; sync(); }));

  const override = entry.override || (entry.override = {});
  detail.appendChild(createLabeledSelect('插入位置', override.position || '', [
    { value: 'beforeChar', label: '角色定义之前' },
    { value: 'afterChar', label: '角色定义之后' },
    { value: 'beforeEm', label: '示例消息之前' },
    { value: 'afterEm', label: '示例消息之后' },
    { value: 'beforeAn', label: '作者注释之前' },
    { value: 'afterAn', label: '作者注释之后' },
    { value: 'fixed', label: '固定深度' },
    { value: 'outlet', label: 'Outlet' }
  ], (v) => { override.position = v; sync(); }));
  detail.appendChild(createLabeledNumber('顺序', override.order ?? '', (v) => { override.order = Number.isFinite(v) ? v : 0; sync(); }));
  detail.appendChild(createLabeledNumber('深度', override.depth ?? '', (v) => { override.depth = Number.isFinite(v) ? v : 0; sync(); }));
  detail.appendChild(createLabeledSelect('触发模式', override.activationMode || '', [
    { value: 'always', label: '总是触发' },
    { value: 'conditional', label: '匹配关键词' },
    { value: 'disabled', label: '禁用' }
  ], (v) => { override.activationMode = v; sync(); }));
  detail.appendChild(createLabeledSelect('关键词逻辑', override.selectiveLogic || '', [
    { value: 'andAny', label: '包含任一关键词（AND ANY）' },
    { value: 'andAll', label: '包含全部关键词（AND ALL）' },
    { value: 'orAll', label: '命中任一关键词（OR ALL）' },
    { value: 'notAny', label: '不包含任一关键词（NOT ANY）' },
    { value: 'notAll', label: '不包含全部关键词（NOT ALL）' }
  ], (v) => { override.selectiveLogic = v; sync(); }));
  detail.appendChild(createLabeledInput('关键词', normalizeKeyValue(override.key ?? entry.key ?? ''), (v) => { override.key = parseKeyValue(v); sync(); }));
  detail.appendChild(createLabeledInput('副关键词', normalizeKeyValue(override.secondaryKey ?? entry.secondaryKey ?? ''), (v) => { override.secondaryKey = parseKeyValue(v); sync(); }));
  detail.appendChild(createLabeledInput('概率', override.probability ?? '', (v) => { override.probability = Number(v); sync(); }));
  detail.appendChild(createLabeledSelect('角色', override.role || '', [
    { value: 'system', label: '系统' },
    { value: 'user', label: '用户' },
    { value: 'model', label: '模型' }
  ], (v) => { override.role = v; sync(); }));
}

function renderBookEntry({ entry, entriesWrap, sync }) {
  const entryWrap = document.createElement('div');
  entryWrap.className = 'wtl-wb-entry';
  entryWrap.dataset.entryIndex = entry.index;

  const entryHead = document.createElement('div');
  entryHead.className = 'wtl-row';

  const entryCheck = document.createElement('input');
  entryCheck.type = 'checkbox';
  entryCheck.checked = !!entry.selected;
  entryCheck.addEventListener('change', () => {
    entry.selected = entryCheck.checked;
    sync();
  });

  const entryLabel = document.createElement('span');
  const orderLabel = Number(entry?.override?.order ?? entry?.order ?? 0);
  entryLabel.textContent = `${entry.name || '条目'} (#${entry.index}) [顺序:${orderLabel}]`;

  const entryToggle = document.createElement('button');
  entryToggle.className = 'menu_button wtl-wb-entry-toggle';
  entryToggle.textContent = '详情';

  entryHead.appendChild(entryCheck);
  entryHead.appendChild(entryLabel);
  entryHead.appendChild(entryToggle);

  const detail = document.createElement('div');
  detail.className = 'wtl-wb-entry-detail';
  renderEntryDetail({ detail, entry, sync });

  entryToggle.addEventListener('click', () => {
    const open = detail.style.display !== 'none';
    entriesWrap.querySelectorAll('.wtl-wb-entry-detail').forEach((el) => {
      if (el !== detail) el.style.display = 'none';
    });
    entriesWrap.querySelectorAll('.wtl-wb-entry-toggle').forEach((btn) => {
      if (btn !== entryToggle) btn.textContent = '详情';
    });
    detail.style.display = open ? 'none' : 'block';
    entryToggle.textContent = open ? '详情' : '收起';
  });

  entryWrap.appendChild(entryHead);
  entryWrap.appendChild(detail);
  entriesWrap.appendChild(entryWrap);
}

function renderBook({ book, host, sync, rerender }) {
  const bookWrap = document.createElement('div');
  bookWrap.className = 'wtl-wb-book';
  bookWrap.dataset.bookName = book.name;

  const head = document.createElement('div');
  head.className = 'wtl-row';

  const bookCheck = document.createElement('input');
  bookCheck.type = 'checkbox';
  bookCheck.checked = !!book.selected;
  bookCheck.addEventListener('change', () => {
    book.selected = bookCheck.checked;
    sync();
  });

  const title = document.createElement('strong');
  title.textContent = book.name;

  const includeAll = document.createElement('label');
  includeAll.className = 'wtl-badge';
  includeAll.style.display = 'inline-flex';
  includeAll.style.gap = '6px';
  includeAll.style.alignItems = 'center';
  const includeAllCheck = document.createElement('input');
  includeAllCheck.type = 'checkbox';
  includeAllCheck.checked = !!book.includeAll;
  includeAllCheck.addEventListener('change', () => {
    book.includeAll = includeAllCheck.checked;
    sync();
  });
  includeAll.appendChild(includeAllCheck);
  includeAll.appendChild(document.createTextNode('包含全书'));

  const toggle = document.createElement('button');
  toggle.className = 'menu_button';
  toggle.textContent = '展开';

  const selectAll = document.createElement('button');
  selectAll.className = 'menu_button';
  selectAll.textContent = '全选条目';

  const clearAll = document.createElement('button');
  clearAll.className = 'menu_button';
  clearAll.textContent = '清空条目';

  head.appendChild(bookCheck);
  head.appendChild(title);
  head.appendChild(includeAll);
  head.appendChild(toggle);
  head.appendChild(selectAll);
  head.appendChild(clearAll);

  const entriesWrap = document.createElement('div');
  entriesWrap.className = 'wtl-wb-entries';
  entriesWrap.style.display = 'none';

  toggle.addEventListener('click', () => {
    const open = entriesWrap.style.display !== 'none';
    entriesWrap.style.display = open ? 'none' : 'block';
    toggle.textContent = open ? '展开' : '收起';
  });
  selectAll.addEventListener('click', () => {
    book.entries.forEach(e => { e.selected = true; });
    rerender();
    sync();
  });
  clearAll.addEventListener('click', () => {
    book.entries.forEach(e => { e.selected = false; });
    rerender();
    sync();
  });

  const displayEntries = [...book.entries].sort((a, b) => {
    const ao = Number(a?.override?.order ?? a?.order ?? 0);
    const bo = Number(b?.override?.order ?? b?.order ?? 0);
    if (ao !== bo) return ao - bo;
    return (a?.index ?? 0) - (b?.index ?? 0);
  });

  displayEntries.forEach((entry) => {
    renderBookEntry({ entry, entriesWrap, sync });
  });

  bookWrap.appendChild(head);
  bookWrap.appendChild(entriesWrap);
  host.appendChild(bookWrap);
}

export function renderManualWorldBookEditor({
  host,
  normalizeManualConfig,
  getConfig,
  setConfig,
  saveState,
  refreshPromptPreview
}) {
  if (!host) return null;

  let manualState = normalizeManualConfig(getConfig());

  const sync = () => {
    if (!manualState) return;
    setConfig(manualState);
    saveState();
    refreshPromptPreview(true);
  };

  const rerender = () => {
    manualState = normalizeManualConfig(manualState);
    host.innerHTML = '';
    manualState.books.forEach((book) => {
      renderBook({
        book,
        host,
        sync,
        rerender
      });
    });
  };

  rerender();
  return {
    getState: () => manualState,
    rerender,
    setState: (next) => {
      manualState = normalizeManualConfig(next);
      rerender();
    }
  };
}
