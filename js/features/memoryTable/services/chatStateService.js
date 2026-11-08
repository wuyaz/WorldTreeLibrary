export function getCharacterNameFromContext(ctx) {
  const characterId = ctx?.characterId;
  const currentChar = characterId !== undefined && characterId !== null
    ? (ctx?.characters?.[characterId] ?? ctx?.characters?.[Number(characterId)])
    : null;
  const avatarFile = currentChar?.avatar || '';
  const nameFromAvatar = avatarFile.endsWith('.png') ? avatarFile.replace(/\.png$/i, '') : avatarFile;
  return currentChar?.name || nameFromAvatar || '';
}

export function getChatKeyFromContext(ctx) {
  return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || 'default';
}

export function getChatMetadataFromContext(ctx) {
  return ctx?.chatMetadata || ctx?.chat?.metadata || null;
}

/**
 * 把 chat_metadata 写进聊天文件。
 *
 * 背景：st-api-wrapper 的 chatHistory 只有 get({index}) / list() / update({index,...}) / delete({index})，
 * 只能操作单条消息，完全无法读写 chat_metadata。原先的 chatHistory.update({ metadata, chatId })
 * 是无效签名（index 为 undefined，什么都不会做/直接抛错），异常被 catch 吞掉后静默退回 localStorage，
 * 导致表格从来没进过聊天文件。
 *
 * 正确做法（wrapper 自己的 worldbook 实现也是这么干的）：直接改 ctx.chatMetadata，
 * 再调 saveMetadataDebounced() 落盘。saveMetadata() 最终走 saveChatConditional() 写聊天文件。
 */
export async function persistChatMetadata(ctx) {
  let live = null;
  try {
    live = window.SillyTavern?.getContext?.() || ctx || null;
  } catch (e) {
    live = ctx || null;
  }
  try {
    if (typeof live?.saveMetadataDebounced === 'function') {
      live.saveMetadataDebounced();
      return true;
    }
    if (typeof live?.saveMetadata === 'function') {
      await live.saveMetadata();
      return true;
    }
    if (typeof live?.saveChat === 'function') {
      await live.saveChat();
      return true;
    }
  } catch (e) {
    console.warn('[WorldTreeLibrary] 聊天元数据落盘失败', e);
  }
  return false;
}

/**
 * 表格存储类型枚举
 */
export const TABLE_STORE_TYPE = {
  CHAT: 'chat',
  CHARACTER: 'character',
  WORLDBOOK: 'worldbook',
  LOCAL: 'local'
};

/**
 * 构建表格存储 key
 * @param {string} type - TABLE_STORE_TYPE 中的一种
 * @param {string} id - 关联的 ID
 * @returns {string} localStorage key
 */
export function makeTableStoreKey(type, id) {
  return `wtl.tableJson.${type}.${id}`;
}

/**
 * 解析表格存储 key，返回 { type, id }
 * @param {string} key - localStorage key
 * @returns {{ type: string|null, id: string|null }}
 */
export function parseTableStoreKey(key) {
  if (!key || !key.startsWith('wtl.tableJson.')) return { type: null, id: null };
  const rest = key.replace('wtl.tableJson.', '');
  // 兼容旧格式：wtl.tableJson.{chatKey}（无类型前缀）
  if (!rest.includes('.')) {
    return { type: TABLE_STORE_TYPE.CHAT, id: rest };
  }
  const dotIdx = rest.indexOf('.');
  const type = rest.substring(0, dotIdx);
  const id = rest.substring(dotIdx + 1);
  return { type, id };
}

/**
 * 扫描 localStorage 中所有表格，按类型分组
 * @param {Function} safeParseJson
 * @returns {Promise<Object>} { chat: Map, character: Map, worldbook: Map, local: Map }
 */
export function scanAllTables(safeParseJson) {
  const result = {
    chat: new Map(),
    character: new Map(),
    worldbook: new Map(),
    local: new Map()
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('wtl.tableJson.')) continue;

    const { type, id } = parseTableStoreKey(key);
    if (!type || !id) continue;

    try {
      const tableJson = safeParseJson(localStorage.getItem(key));
      if (!tableJson || !tableJson.sections) continue;

      let rowCount = 0;
      tableJson.sections.forEach(section => {
        if (section.rows) rowCount += section.rows.length;
      });

      const entry = { id, tableJson, rowCount, sectionCount: tableJson.sections.length };
      if (result[type]) {
        if (!result[type].has(id)) {
          result[type].set(id, { tables: [], totalRows: 0 });
        }
        const group = result[type].get(id);
        group.tables.push(entry);
        group.totalRows += rowCount;
      }
    } catch (e) {
      console.warn('[WTL] Failed to parse table for key:', key, e);
    }
  }

  return result;
}

export async function loadTableForChatState({
  ctx,
  defaults,
  safeParseJson,
  renderJsonToMarkdown,
  parseSchemaToTemplate,
  buildEmptyTableFromTemplate,
  getDefaultSchemaText,
  resolveSchemaByScope,
  loadSchemaForMode,
  hiddenRowsRef
}) {
  const metadata = getChatMetadataFromContext(ctx);

  // 1. 优先从 chat metadata 加载
  const metaJson = safeParseJson(metadata?.WorldTreeLibrary?.tableJson);
  if (metaJson && metaJson.sections) {
    hiddenRowsRef.value = typeof metaJson.hiddenRows === 'object' && metaJson.hiddenRows ? metaJson.hiddenRows : {};
    // 同步写入 localStorage，以便管理面板（scanAllTables）能扫描到
    const chatKey = getChatKeyFromContext(ctx);
    const storeKey = makeTableStoreKey(TABLE_STORE_TYPE.CHAT, chatKey);
    localStorage.setItem(storeKey, JSON.stringify(metaJson));
    return { tableMd: renderJsonToMarkdown(metaJson), isNew: false };
  }

  // 2. 从 localStorage 加载（新格式）
  const chatKey = getChatKeyFromContext(ctx);
  const storeKey = makeTableStoreKey(TABLE_STORE_TYPE.CHAT, chatKey);
  const localJson = safeParseJson(localStorage.getItem(storeKey));
  if (localJson && localJson.sections) {
    hiddenRowsRef.value = typeof localJson.hiddenRows === 'object' && localJson.hiddenRows ? localJson.hiddenRows : {};
    return { tableMd: renderJsonToMarkdown(localJson), isNew: false };
  }

  // 3. 兼容旧格式：wtl.tableJson.{chatKey}
  const oldKey = `wtl.tableJson.${chatKey}`;
  const oldJson = safeParseJson(localStorage.getItem(oldKey));
  if (oldJson && oldJson.sections) {
    hiddenRowsRef.value = typeof oldJson.hiddenRows === 'object' && oldJson.hiddenRows ? oldJson.hiddenRows : {};
    // 迁移到新格式
    localStorage.setItem(storeKey, localStorage.getItem(oldKey));
    localStorage.removeItem(oldKey);
    return { tableMd: renderJsonToMarkdown(oldJson), isNew: false };
  }

  // 4. 无表格，返回空数据（不自动创建表格）
  hiddenRowsRef.value = {};
  return { tableMd: '', isNew: false };
}

export async function saveTableForChatState({
  ctx,
  tableMd,
  meta = {},
  hiddenRows,
  wrapTable,
  parseMarkdownTableToJson,
  appendHistory,
  storeType = TABLE_STORE_TYPE.CHAT,
  storeId = null
}) {
  const metadata = getChatMetadataFromContext(ctx);
  const wrapped = wrapTable(tableMd);
  const tableJson = parseMarkdownTableToJson(wrapped);
  tableJson.hiddenRows = hiddenRows || {};

  if (typeof appendHistory === 'function') {
    appendHistory(tableJson, wrapped, meta);
  }

  // 如果是聊天类型，写入当前聊天的 chat_metadata 并落盘
  if (storeType === TABLE_STORE_TYPE.CHAT) {
    const currentChatKey = getChatKeyFromContext(ctx);
    const isCurrentChat = !storeId || storeId === currentChatKey;
    if (metadata && typeof metadata === 'object' && isCurrentChat) {
      metadata.WorldTreeLibrary = { ...(metadata.WorldTreeLibrary || {}), tableJson, table: wrapped };
      await persistChatMetadata(ctx);
    } else if (!isCurrentChat) {
      // 酒馆内存里只有“当前打开聊天”的 metadata，别的聊天无法写入聊天文件
      console.warn('[WorldTreeLibrary] 目标聊天不是当前聊天，无法写入 chat_metadata，仅保存到 localStorage:', storeId);
    }
  }

  // 始终保存到 localStorage（即使已保存到 metadata），
  // 确保管理面板（scanAllTables）能扫描到表格数据
  const keyId = storeId || getChatKeyFromContext(ctx);
  const storeKey = makeTableStoreKey(storeType, keyId);
  localStorage.setItem(storeKey, JSON.stringify(tableJson));
  localStorage.setItem(`wtl.table.${storeType}.${keyId}`, wrapped);
}

export async function reloadStateForCurrentChat({
  getCtx,
  currentChatStateKey,
  loadState,
  onChatChanged,
  getPromptCache,
  getAiCache,
  isPromptLogActive,
  isAiLogActive,
  setLogContent,
  refreshPromptPreview
}) {
  const ctx = getCtx();
  const nextChatKey = getChatKeyFromContext(ctx);
  if (!nextChatKey) return currentChatStateKey;
  const changed = currentChatStateKey !== nextChatKey;
  await loadState();
  if (changed && typeof onChatChanged === 'function') {
    onChatChanged();
  }
  if (isPromptLogActive()) setLogContent(getPromptCache());
  if (isAiLogActive()) setLogContent(getAiCache());
  await refreshPromptPreview(true);
  return nextChatKey;
}
