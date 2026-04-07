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
