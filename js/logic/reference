// 参考信息构建与格式化
// 依赖 st-api-wrapper 的全局对象，通过参数注入

const defaultWorldBookName = 'Current Chat';

const escapeAttr = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>');
};

const unescapeAttr = (value) => {
  return String(value ?? '')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&');
};

const extractWorldBookEntriesFromText = (text, entryMap) => {
  const raw = String(text || '');
  const re = /<WTL_WB_ENTRY([^>]*)>([\s\S]*?)<\/WTL_WB_ENTRY>/gi;
  const entries = [];
  let match;
  while ((match = re.exec(raw))) {
    const attrRaw = match[1] || '';
    const content = (match[2] || '').trim();
    if (!content) continue;
    const attrs = {};
    const attrRe = /(\w+)\s*=\s*"([^"]*)"/g;
    let m2;
    while ((m2 = attrRe.exec(attrRaw))) {
      attrs[m2[1]] = unescapeAttr(m2[2]);
    }
    const idxKey = attrs.index !== undefined ? String(attrs.index) : '';
    const base = entryMap?.get(idxKey) || null;
    const name = attrs.name || base?.name || '条目';
    const position = attrs.position || base?.position || 'outlet';
    const order = Number.isFinite(Number(attrs.order)) ? Number(attrs.order) : (Number(base?.order) || 0);
    const depth = Number.isFinite(Number(attrs.depth)) ? Number(attrs.depth) : (Number(base?.depth) || 0);
    entries.push({
      ...(base || {}),
      name,
      position,
      order,
      depth,
      enabled: true,
      content
    });
  }
  return entries;
};

const resolveAutoWorldBookEntries = async (ST_API, entries) => {
  if (!Array.isArray(entries) || !entries.length) return [];
  if (!ST_API?.prompt?.buildRequest) return entries;

  const entryMap = new Map(entries.map(e => [String(e.index), e]));
  const taggedEntries = entries.map((e, i) => {
    const name = escapeAttr(e?.name || `条目${i + 1}`);
    const position = escapeAttr(e?.position || 'outlet');
    const order = Number(e?.order ?? 0);
    const depth = Number(e?.depth ?? 0);
    const index = Number.isFinite(Number(e?.index)) ? Number(e.index) : i;
    const tagOpen = `<WTL_WB_ENTRY name="${name}" position="${position}" order="${order}" depth="${depth}" index="${index}">`;
    const tagClose = `</WTL_WB_ENTRY>`;
    return {
      ...e,
      index,
      enabled: e?.enabled !== false,
      content: `${tagOpen}\n${e?.content || ''}\n${tagClose}`
    };
  });

  const tempBook = { name: `WTL_AUTO_${Date.now()}`, entries: taggedEntries };

  try {
    const res = await ST_API.prompt.buildRequest({ worldBook: { replace: tempBook } });
    const text = Array.isArray(res?.chatCompletionMessages)
      ? res.chatCompletionMessages.map(m => m?.content || '').join('\n')
      : (res?.textPrompt || '');
    const extracted = extractWorldBookEntriesFromText(text, entryMap);
    return extracted.length ? extracted : entries;
  } catch (e) {
    console.warn('[WorldTreeLibrary] auto worldBook resolve failed', e);
    return entries;
  }
};

export const buildReferenceBundle = async (options = {}) => {
  const {
    ST_API = window.ST_API,
    overrideChat = null,
    wbMode = 'auto',
    manualConfig = null,
    worldBookName = defaultWorldBookName
  } = options;

  let characterData = null;
  try {
    const ctx = window.SillyTavern?.getContext?.();
    const characterId = ctx?.characterId;
    const currentChar = characterId !== undefined && characterId !== null
      ? (ctx?.characters?.[characterId] ?? ctx?.characters?.[Number(characterId)])
      : null;
    const avatarFile = currentChar?.avatar || '';
    const nameFromAvatar = avatarFile.endsWith('.png') ? avatarFile.replace(/\.png$/i, '') : avatarFile;
    const characterName = currentChar?.name || nameFromAvatar;

    if (characterName) {
      const character = await ST_API.character.get({ name: characterName });
      characterData = character.character;
    }
  } catch (e) {
    console.warn('[WorldTreeLibrary] character.get skipped', e);
  }

  let chat = overrideChat;
  if (!chat) {
    try {
      chat = await ST_API.chatHistory.list({
        format: 'openai',
        mediaFormat: 'url',
        includeSwipes: false
      });
      if (!chat?.messages?.length) {
        chat = await ST_API.chatHistory.list({
          format: 'gemini',
          mediaFormat: 'url',
          includeSwipes: false
        });
      }
    } catch (e) {
      chat = await ST_API.chatHistory.list({
        format: 'gemini',
        mediaFormat: 'url',
        includeSwipes: false
      });
    }
  }

  const books = [];
  const selectedEntries = [];

  if (wbMode === 'manual') {
    const manual = manualConfig || {};

    for (const b of manual.books || []) {
      if (!b?.name || !b.selected) continue;
      const scope = b.scope || 'global';
      let fullEntries = [];
      try {
        const res = await ST_API.worldBook.get({ name: b.name, scope });
        if (res?.worldBook) books.push(res.worldBook);
        fullEntries = res?.worldBook?.entries || [];
      } catch (e) {
        console.warn('[WorldTreeLibrary] worldBook.get manual failed', e);
      }

      const entryMap = new Map();
      for (const e of b?.entries || []) {
        if (!e) continue;
        const idx = typeof e.index === 'number' ? e.index : undefined;
        if (idx === undefined) continue;
        entryMap.set(idx, e);
      }

      const useAll = !!b.includeAll;
      for (const entry of fullEntries) {
        const cfg = entryMap.get(entry.index);
        if (!useAll && !cfg?.selected) continue;
        if (!cfg && useAll) {
          selectedEntries.push(entry);
          continue;
        }
        if (!cfg) continue;
        const cfgOverride = cfg.override || {};
        const pick = (key, fallback) => (cfg[key] ?? cfgOverride[key] ?? fallback);
        const pickNum = (key, fallback) => {
          const val = cfg[key] ?? cfgOverride[key];
          return typeof val === 'number' ? val : fallback;
        };
        selectedEntries.push({
          ...entry,
          ...cfgOverride,
          name: cfg.name || entry.name,
          content: cfg.content || entry.content,
          enabled: pick('enabled', entry.enabled),
          activationMode: pick('activationMode', entry.activationMode),
          key: pick('key', entry.key),
          secondaryKey: pick('secondaryKey', entry.secondaryKey),
          selectiveLogic: pick('selectiveLogic', entry.selectiveLogic),
          role: pick('role', entry.role),
          caseSensitive: pick('caseSensitive', entry.caseSensitive),
          excludeRecursion: pick('excludeRecursion', entry.excludeRecursion),
          preventRecursion: pick('preventRecursion', entry.preventRecursion),
          probability: pickNum('probability', entry.probability),
          position: pick('position', entry.position),
          order: pickNum('order', entry.order),
          depth: pickNum('depth', entry.depth),
          other: { ...(entry.other || {}), ...(cfgOverride.other || {}), ...(cfg.other || {}) }
        });
      }
    }
  } else {
    const activeBooks = [];
    try {
      const chatList = await ST_API.worldBook.list({ scope: 'chat' });
      activeBooks.push(...(chatList.worldBooks || []));
    } catch (e) {
      // ignore
    }
    try {
      const charList = await ST_API.worldBook.list({ scope: 'character' });
      activeBooks.push(...(charList.worldBooks || []));
    } catch (e) {
      // ignore
    }

    const seen = new Set();
    for (const b of activeBooks) {
      if (!b?.name || seen.has(b.name)) continue;
      seen.add(b.name);
      try {
        const res = await ST_API.worldBook.get({ name: b.name, scope: b.scope });
        if (res?.worldBook) books.push(res.worldBook);
      } catch (e) {
        console.warn('[WorldTreeLibrary] worldBook.get failed', e);
      }
    }
  }

  if (!books.length && !selectedEntries.length) {
    try {
      const res = await ST_API.worldBook.get({ name: defaultWorldBookName, scope: 'chat' });
      if (res?.worldBook) books.push(res.worldBook);
    } catch (e) {
      console.warn('[WorldTreeLibrary] worldBook.get fallback failed', e);
    }
  }

  const mergedEntries = selectedEntries.length ? selectedEntries : books.flatMap(b => b.entries || []);
  const resolvedEntries = await resolveAutoWorldBookEntries(ST_API, mergedEntries);
  const worldBookRes = {
    worldBook: {
      name: books.map(b => b.name).filter(Boolean).join(', ') || worldBookName,
      entries: resolvedEntries
    }
  };

  return {
    character: characterData,
    chatHistory: chat,
    worldBook: worldBookRes?.worldBook || { name: worldBookName, entries: [] }
  };
};

export const formatReferenceText = async (options = {}) => {
  const {
    ST_API = window.ST_API,
    ref,
    entryName = 'WorldTreeMemory',
    tableMd = '',
    instructionMd = '',
    refBlockEls = [],
    refBlocksPreset = [],
    refOrderPreset = []
  } = options;

  const character = ref?.character || {};
  const desc = character.description || character.charDescription || '';
  const personality = character.personality || character.charPersonality || '';
  const scenario = character.scenario || character.charScenario || '';
  const examples = Array.isArray(character.message) ? character.message.join('\n') : (character.mesExamples || character.mes_example || character.chatExample || '');

  const resolveMacro = async (macro, fallback) => {
    try {
      const out = await ST_API.macros.process({ text: macro });
      if (out?.ok) return out.text || '';
    } catch (e) {
      console.warn('[WorldTreeLibrary] macros.process failed', e);
    }
    return fallback || '';
  };

  const charDesc = await resolveMacro('{{description}}', desc);
  const charPersonality = await resolveMacro('{{personality}}', personality);
  const charScenario = await resolveMacro('{{scenario}}', scenario);
  const charExamples = await resolveMacro('{{mesExamples}}', examples);
  const charDepth = await resolveMacro('{{charDepthPrompt}}', character.charDepthPrompt || '');

  const formatChatHistory = (messages) => {
    if (!Array.isArray(messages)) return '';
    return messages
      .map((m) => {
        const role = m.role || 'unknown';
        if (typeof m.content === 'string' && m.content.trim()) return `[${role}] ${m.content}`;
        if (Array.isArray(m.parts)) {
          const text = m.parts.map(p => ('text' in p ? p.text : '')).join(' ').trim();
          return text ? `[${role}] ${text}` : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  };

  let personaText = '';
  try {
    const personaOut = await ST_API.macros.process({ text: '{{persona}}' });
    if (personaOut?.ok) personaText = personaOut.text || '';
  } catch (e) {
    console.warn('[WorldTreeLibrary] persona macro failed', e);
  }

  const formatWorldBookEntries = (entries, position) => {
    if (!Array.isArray(entries)) return '';
    const baseName = entryName || 'WorldTreeMemory';
    const excludeNames = new Set([`${baseName}__table`, `${baseName}__instruction`]);
    const tableContent = (tableMd || '').trim();
    const instructionContent = (instructionMd || '').trim();
    return entries
      .filter(e => e && e.enabled !== false && !excludeNames.has(e.name))
      .filter(e => {
        const content = (e.content || '').trim();
        if (!content) return false;
        if (tableContent && content === tableContent) return false;
        if (instructionContent && content === instructionContent) return false;
        return true;
      })
      .filter(e => (position ? e.position === position : true))
      .slice()
      .sort((a, b) => {
        if (a.position === 'fixed' && b.position === 'fixed') {
          const da = Number(a.depth ?? 0);
          const db = Number(b.depth ?? 0);
          if (da !== db) return da - db;
        }
        return Number(a.order ?? 0) - Number(b.order ?? 0);
      })
      .map((e) => {
        const entryHeader = `【${e.name || '条目'}】`;
        const content = (e.content || '').trim();
        if (!content) return '';
        return `${entryHeader}\n${content}`.trim();
      })
      .filter(Boolean)
      .join('\n\n');
  };

  const characterBlocks = [
    { id: 'character_desc', label: '角色卡-描述', text: charDesc },
    { id: 'character_personality', label: '角色卡-性格', text: charPersonality },
    { id: 'character_scenario', label: '角色卡-场景', text: charScenario },
    { id: 'character_examples', label: '角色卡-示例对话', text: charExamples },
    { id: 'character_depth', label: '角色卡-深度提示', text: charDepth }
  ];

  const personaBlock = { id: 'persona', label: '用户信息', text: personaText };
  const chatBlock = { id: 'chat', label: '聊天记录', text: formatChatHistory(ref?.chatHistory?.messages || []) };

  const worldBookPositions = [
    { id: 'wb_beforeChar', label: '世界书-角色定义之前', position: 'beforeChar' },
    { id: 'wb_afterChar', label: '世界书-角色定义之后', position: 'afterChar' },
    { id: 'wb_beforeEm', label: '世界书-示例消息之前', position: 'beforeEm' },
    { id: 'wb_afterEm', label: '世界书-示例消息之后', position: 'afterEm' },
    { id: 'wb_beforeAn', label: '世界书-作者注释之前', position: 'beforeAn' },
    { id: 'wb_afterAn', label: '世界书-作者注释之后', position: 'afterAn' },
    { id: 'wb_fixed', label: '世界书-固定深度', position: 'fixed' },
    { id: 'wb_outlet', label: '世界书-Outlet', position: 'outlet' }
  ].map((p) => ({
    id: p.id,
    label: p.label,
    text: formatWorldBookEntries(ref?.worldBook?.entries || [], p.position)
  }));

  const customRefBlocks = refBlockEls
    .filter(el => (el.dataset.type || '') === 'custom')
    .map(el => ({
      id: el.dataset.id || '',
      label: el.dataset.label || '自定义提示词',
      text: el.dataset.content || ''
    }))
    .filter(b => b.id);

  const refMap = new Map([
    ['persona', personaBlock],
    ...characterBlocks.map(b => [b.id, b]),
    ...worldBookPositions.map(b => [b.id, b]),
    ...customRefBlocks.map(b => [b.id, b])
  ]);

  const wrapperMap = new Map(refBlockEls.map(el => [
    el.dataset.id || '',
    {
      prefix: el.dataset.prefix || '',
      suffix: el.dataset.suffix || '',
      usePrefix: (el.dataset.usePrefix ?? (el.dataset.prefix ? 'true' : 'false')) === 'true',
      useSuffix: (el.dataset.useSuffix ?? (el.dataset.suffix ? 'true' : 'false')) === 'true'
    }
  ]));

  const refOrder = refBlockEls.map((el) => el.dataset.id || '').filter(Boolean);
  const labelToId = new Map(refBlocksPreset.map(b => [b.label, b.id]));
  const fallbackOrder = (refOrderPreset || []).map(label => labelToId.get(label)).filter(Boolean);
  const order = refOrder.length ? refOrder : (fallbackOrder.length ? fallbackOrder : refBlocksPreset.map(b => b.id));

  const referenceSections = order
    .map((id) => {
      const base = refMap.get(id);
      if (!base) return null;
      const wrap = wrapperMap.get(id);
      if (!wrap) return base;
      const wrappedText = `${wrap.usePrefix ? wrap.prefix : ''}${base.text || ''}${wrap.useSuffix ? wrap.suffix : ''}`;
      return { ...base, text: wrappedText };
    })
    .filter(Boolean)
    .filter(b => (b.text || '').trim());

  const referenceBlock = {
    id: 'reference',
    label: '参考信息',
    text: referenceSections.map(b => `【${b.label}】\n${b.text}`).join('\n\n')
  };

  return [referenceBlock, chatBlock, personaBlock, ...characterBlocks, ...worldBookPositions];
};
