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
  const chatKey = getChatKeyFromContext(ctx);
  
  const metaJson = safeParseJson(metadata?.WorldTreeLibrary?.tableJson);
  const localJson = safeParseJson(localStorage.getItem(`wtl.tableJson.${chatKey}`));
  const tableJson = metaJson || localJson;
  
  if (tableJson && tableJson.sections) {
    hiddenRowsRef.value = typeof tableJson.hiddenRows === 'object' && tableJson.hiddenRows ? tableJson.hiddenRows : {};
    return renderJsonToMarkdown(tableJson);
  }

  const schemaMode = localStorage.getItem('wtl.schemaMode') || defaults?.schemaMode || 'global';
  const resolved = typeof resolveSchemaByScope === 'function' ? resolveSchemaByScope() : null;
  const schema = resolved?.text || (typeof loadSchemaForMode === 'function' ? loadSchemaForMode(schemaMode) : '') || (typeof getDefaultSchemaText === 'function' ? getDefaultSchemaText() : '');
  
  const template = parseSchemaToTemplate(schema || '');
  const defaultJson = buildEmptyTableFromTemplate(template);
  defaultJson.hiddenRows = {};
  hiddenRowsRef.value = {};
  
  const tableMd = renderJsonToMarkdown(defaultJson);
  localStorage.setItem(`wtl.tableJson.${chatKey}`, JSON.stringify(defaultJson));
  localStorage.setItem(`wtl.table.${chatKey}`, tableMd);
  
  return tableMd;
}

export async function saveTableForChatState({
  ctx,
  tableMd,
  meta = {},
  hiddenRows,
  wrapTable,
  parseMarkdownTableToJson,
  appendHistory
}) {
  const metadata = getChatMetadataFromContext(ctx);
  const wrapped = wrapTable(tableMd);
  const tableJson = parseMarkdownTableToJson(wrapped);
  tableJson.hiddenRows = hiddenRows || {};
  
  if (typeof appendHistory === 'function') {
    appendHistory(tableJson, wrapped, meta);
  }
  
  if (metadata && typeof metadata === 'object') {
    metadata.WorldTreeLibrary = { ...(metadata.WorldTreeLibrary || {}), tableJson, table: wrapped };
    if (window.ST_API?.chatHistory?.update) {
      try {
        const payload = { metadata };
        if (ctx?.chatId) payload.chatId = ctx.chatId;
        if (ctx?.chat?.id) payload.id = ctx.chat.id;
        if (ctx?.chat?.file) payload.file = ctx.chat.file;
        await window.ST_API.chatHistory.update(payload);
        return;
      } catch (e) {
        console.warn('[WorldTreeLibrary] chat metadata update failed, fallback localStorage', e);
      }
    }
  }
  
  const chatKey = getChatKeyFromContext(ctx);
  localStorage.setItem(`wtl.tableJson.${chatKey}`, JSON.stringify(tableJson));
  localStorage.setItem(`wtl.table.${chatKey}`, wrapped);
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
