// @ts-nocheck

export class ChatFilterService {
  constructor() {
    this.state = null;
    this.settings = null;
  }

  setState(state) {
    this.state = state;
  }

  setSettings(settings) {
    this.settings = settings;
  }

  filterChats(globalChats, state, settings) {
    if (!globalChats || globalChats.length === 0) {
      return [];
    }

    const searchLower = state.searchQuery?.toLowerCase() || '';
    const previewLines = Math.max(1, Math.min(6, Number(settings?.previewLines ?? 2) || 2));
    const rawPageSize = state.itemsPerPage ?? settings?.pageSize ?? globalChats.length ?? 20;
    const pageSize = Math.max(5, Math.min(100, Number(rawPageSize) || 20));
    const currentPage = Math.max(1, Number(state.currentPage || 1));

    const filteredChats = [];

    globalChats.forEach(chat => {
      const key = chat.globalKey;
      const folder = state.chatFolder[key] || '未分类';
      const folderColor = state.folderColors?.[folder] || '';
      const tagOrder = state.tags || [];
      const tags = [...(state.chatTags[key] || [])].sort((a, b) => {
        const aIndex = tagOrder.indexOf(a);
        const bIndex = tagOrder.indexOf(b);
        const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        if (safeA !== safeB) return safeA - safeB;
        return String(a).localeCompare(String(b), 'zh-CN');
      });
      const summary = state.chatSummary[key] || '';
      const customTitle = state.chatTitleOverride[key] || chat.fileName.replace(/\.jsonl$/i, '');
      const isPinned = state.pinnedChats.includes(key);
      const isFavorite = state.favoriteChats.includes(key);

      if (state.activeFilter !== '全部') {
        if (state.viewMode === 'folder' && folder !== state.activeFilter) return;
        if (state.viewMode === 'tag' && !tags.includes(state.activeFilter)) return;
        if (state.viewMode === 'character' && chat.character !== state.activeFilter) return;
      }

      if (state.viewMode === 'favorite' && !isFavorite) return;

      if (searchLower && !(`${customTitle} ${summary} ${chat.character}`.toLowerCase().includes(searchLower))) return;

      filteredChats.push({
        chat,
        key,
        folder,
        folderColor,
        tags,
        summary,
        customTitle,
        isPinned,
        isFavorite,
      });
    });

    return {
      filteredChats,
      pageSize,
      currentPage,
      totalPages: Math.max(1, Math.ceil(filteredChats.length / pageSize)),
    };
  }

  paginateChats(filteredChats, pageSize, currentPage) {
    const totalPages = Math.max(1, Math.ceil(filteredChats.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pageItems = filteredChats.slice(startIndex, startIndex + pageSize);

    return {
      pageItems,
      totalPages,
      currentPage: safePage,
      startIndex,
      totalItems: filteredChats.length,
    };
  }

  formatChatCardData(chat, key, folder, folderColor, tags, summary, customTitle, isPinned, isFavorite, state, previewLines) {
    const tagColors = tags.map(t => ({
      name: t,
      color: state.tagColors?.[t] || '',
    }));

    return {
      globalKey: key,
      charId: chat.charId,
      fileName: chat.fileName,
      character: chat.character,
      customTitle,
      summary,
      preview: chat.preview || '',
      previewLines,
      folder,
      folderColor,
      tags: tagColors,
      isPinned,
      isFavorite,
      isChecked: state.selectedChats.has(key),
      timestamp: chat.timestamp,
      messageCount: chat.messageCount,
      fileSize: chat.fileSize,
    };
  }
}
