// @ts-nocheck

const STORAGE_KEY = 'st_gcm_state_v5';

export class ChatManagerState {
  constructor() {
    this.viewMode = 'time';
    this.activeFilter = '全部';
    this.searchQuery = '';
    this.isBatchMode = false;
    this.selectedChats = new Set();

    this.folders = ['主线', '支线', '日常', '废案'];
    this.tags = ['高甜', '虐心', '战斗', 'R18'];
    this.folderColors = {};
    this.tagColors = {};

    this.chatFolder = {};
    this.chatTags = {};
    this.chatSummary = {};
    this.chatTitleOverride = {};
    this.pinnedChats = [];
    this.favoriteChats = [];

    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.isExpanded = false;
    this.selectedFolder = null;
    this.selectedTags = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.viewMode = data.viewMode || this.viewMode;
      this.activeFilter = data.activeFilter || this.activeFilter;
      this.searchQuery = data.searchQuery || '';
      this.folders = data.folders || this.folders;
      this.tags = data.tags || this.tags;
      this.folderColors = data.folderColors || {};
      this.tagColors = data.tagColors || {};
      this.chatFolder = data.chatFolder || {};
      this.chatTags = data.chatTags || {};
      this.chatSummary = data.chatSummary || {};
      this.chatTitleOverride = data.chatTitleOverride || {};
      this.pinnedChats = data.pinnedChats || [];
      this.favoriteChats = data.favoriteChats || [];
      this.currentPage = data.currentPage || 1;
      this.itemsPerPage = data.itemsPerPage || 20;
      this.isExpanded = data.isExpanded || false;
      this.selectedFolder = data.selectedFolder || null;
      this.selectedTags = data.selectedTags || [];
      
      if (this.viewMode === 'folder' && !this.activeFilter) {
        this.activeFilter = '未分类';
      } else if ((this.viewMode === 'tag' || this.viewMode === 'character') && this.activeFilter === '全部') {
        this.activeFilter = '';
      }
    } catch (e) {
      console.warn('[WTL ChatManager] Failed to load state:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        viewMode: this.viewMode,
        activeFilter: this.activeFilter,
        searchQuery: this.searchQuery,
        folders: this.folders,
        tags: this.tags,
        folderColors: this.folderColors,
        tagColors: this.tagColors,
        chatFolder: this.chatFolder,
        chatTags: this.chatTags,
        chatSummary: this.chatSummary,
        chatTitleOverride: this.chatTitleOverride,
        pinnedChats: this.pinnedChats,
        favoriteChats: this.favoriteChats,
        currentPage: this.currentPage,
        itemsPerPage: this.itemsPerPage,
        isExpanded: this.isExpanded,
        selectedFolder: this.selectedFolder,
        selectedTags: this.selectedTags,
      }));
    } catch (e) {
      console.warn('[WTL ChatManager] Failed to save state:', e);
    }
  }

  setPage(page) {
    this.currentPage = Math.max(1, page);
    this.save();
  }

  setItemsPerPage(count) {
    this.itemsPerPage = Math.max(5, Math.min(100, count));
    this.currentPage = 1;
    this.save();
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.save();
  }

  setExpanded(expanded) {
    this.isExpanded = expanded;
    this.save();
  }

  setSelectedFolder(folderId) {
    this.selectedFolder = folderId;
    this.currentPage = 1;
    this.save();
  }

  setSelectedTags(tagIds) {
    this.selectedTags = tagIds || [];
    this.currentPage = 1;
    this.save();
  }

  toggleTag(tagId) {
    const index = this.selectedTags.indexOf(tagId);
    if (index === -1) {
      this.selectedTags.push(tagId);
    } else {
      this.selectedTags.splice(index, 1);
    }
    this.currentPage = 1;
    this.save();
  }

  clearFilters() {
    this.selectedFolder = null;
    this.selectedTags = [];
    this.currentPage = 1;
    this.save();
  }

  getChatFolder(globalKey) {
    return this.chatFolder[globalKey] || '未分类';
  }

  setChatFolder(globalKey, folderName) {
    if (folderName) {
      this.chatFolder[globalKey] = folderName;
    } else {
      delete this.chatFolder[globalKey];
    }
    this.save();
  }

  getChatTags(globalKey) {
    return this.chatTags[globalKey] || [];
  }

  setChatTags(globalKey, tags) {
    if (tags && tags.length > 0) {
      this.chatTags[globalKey] = tags;
    } else {
      delete this.chatTags[globalKey];
    }
    this.save();
  }

  addTagToChat(globalKey, tag) {
    if (!this.chatTags[globalKey]) {
      this.chatTags[globalKey] = [];
    }
    if (!this.chatTags[globalKey].includes(tag)) {
      this.chatTags[globalKey].push(tag);
      this.save();
    }
  }

  removeTagFromChat(globalKey, tag) {
    if (this.chatTags[globalKey]) {
      this.chatTags[globalKey] = this.chatTags[globalKey].filter(t => t !== tag);
      if (this.chatTags[globalKey].length === 0) {
        delete this.chatTags[globalKey];
      }
      this.save();
    }
  }

  getChatSummary(globalKey) {
    return this.chatSummary[globalKey] || '';
  }

  setChatSummary(globalKey, summary) {
    if (summary && summary.trim()) {
      this.chatSummary[globalKey] = summary.trim();
    } else {
      delete this.chatSummary[globalKey];
    }
    this.save();
  }

  getChatTitle(globalKey, defaultTitle) {
    return this.chatTitleOverride[globalKey] || defaultTitle;
  }

  setChatTitle(globalKey, title) {
    if (title && title.trim()) {
      this.chatTitleOverride[globalKey] = title.trim();
    } else {
      delete this.chatTitleOverride[globalKey];
    }
    this.save();
  }

  isPinned(globalKey) {
    return this.pinnedChats.includes(globalKey);
  }

  togglePin(globalKey) {
    const index = this.pinnedChats.indexOf(globalKey);
    if (index === -1) {
      this.pinnedChats.push(globalKey);
    } else {
      this.pinnedChats.splice(index, 1);
    }
    this.save();
  }

  pinChat(globalKey) {
    if (!this.pinnedChats.includes(globalKey)) {
      this.pinnedChats.push(globalKey);
      this.save();
    }
  }

  unpinChat(globalKey) {
    const index = this.pinnedChats.indexOf(globalKey);
    if (index !== -1) {
      this.pinnedChats.splice(index, 1);
      this.save();
    }
  }

  isFavorite(globalKey) {
    return this.favoriteChats.includes(globalKey);
  }

  toggleFavorite(globalKey) {
    const index = this.favoriteChats.indexOf(globalKey);
    if (index === -1) {
      this.favoriteChats.push(globalKey);
    } else {
      this.favoriteChats.splice(index, 1);
    }
    this.save();
  }

  favoriteChat(globalKey) {
    if (!this.favoriteChats.includes(globalKey)) {
      this.favoriteChats.push(globalKey);
      this.save();
    }
  }

  unfavoriteChat(globalKey) {
    const index = this.favoriteChats.indexOf(globalKey);
    if (index !== -1) {
      this.favoriteChats.splice(index, 1);
      this.save();
    }
  }

  addFolder(name) {
    if (!this.folders.includes(name)) {
      this.folders.push(name);
      this.save();
    }
    return name;
  }

  removeFolder(name) {
    const index = this.folders.indexOf(name);
    if (index !== -1) {
      this.folders.splice(index, 1);
      for (const key in this.chatFolder) {
        if (this.chatFolder[key] === name) {
          delete this.chatFolder[key];
        }
      }
      this.save();
    }
  }

  addTag(name) {
    if (!this.tags.includes(name)) {
      this.tags.push(name);
      this.save();
    }
    return name;
  }

  removeTag(name) {
    const index = this.tags.indexOf(name);
    if (index !== -1) {
      this.tags.splice(index, 1);
      for (const key in this.chatTags) {
        this.chatTags[key] = this.chatTags[key].filter(t => t !== name);
        if (this.chatTags[key].length === 0) {
          delete this.chatTags[key];
        }
      }
      this.save();
    }
  }

  removeChatData(globalKey) {
    delete this.chatFolder[globalKey];
    delete this.chatTags[globalKey];
    delete this.chatSummary[globalKey];
    delete this.chatTitleOverride[globalKey];
    
    const pinnedIndex = this.pinnedChats.indexOf(globalKey);
    if (pinnedIndex !== -1) {
      this.pinnedChats.splice(pinnedIndex, 1);
    }
    
    const favoriteIndex = this.favoriteChats.indexOf(globalKey);
    if (favoriteIndex !== -1) {
      this.favoriteChats.splice(favoriteIndex, 1);
    }
    
    this.save();
  }

  migrateChatData(oldKey, newKey) {
    if (this.chatFolder[oldKey] !== undefined) {
      this.chatFolder[newKey] = this.chatFolder[oldKey];
      delete this.chatFolder[oldKey];
    }
    
    if (this.chatTags[oldKey] !== undefined) {
      this.chatTags[newKey] = this.chatTags[oldKey];
      delete this.chatTags[oldKey];
    }
    
    if (this.chatSummary[oldKey] !== undefined) {
      this.chatSummary[newKey] = this.chatSummary[oldKey];
      delete this.chatSummary[oldKey];
    }
    
    if (this.chatTitleOverride[oldKey] !== undefined) {
      this.chatTitleOverride[newKey] = this.chatTitleOverride[oldKey];
      delete this.chatTitleOverride[oldKey];
    }
    
    const pinnedIndex = this.pinnedChats.indexOf(oldKey);
    if (pinnedIndex !== -1) {
      this.pinnedChats[pinnedIndex] = newKey;
    }
    
    const favoriteIndex = this.favoriteChats.indexOf(oldKey);
    if (favoriteIndex !== -1) {
      this.favoriteChats[favoriteIndex] = newKey;
    }
    
    this.save();
  }

  exportState() {
    return JSON.stringify({
      folders: this.folders,
      tags: this.tags,
      folderColors: this.folderColors,
      tagColors: this.tagColors,
      chatFolder: this.chatFolder,
      chatTags: this.chatTags,
      chatSummary: this.chatSummary,
      chatTitleOverride: this.chatTitleOverride,
      pinnedChats: this.pinnedChats
    }, null, 2);
  }

  importState(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.folders) this.folders = data.folders;
      if (data.tags) this.tags = data.tags;
      if (data.folderColors) this.folderColors = data.folderColors;
      if (data.tagColors) this.tagColors = data.tagColors;
      if (data.chatFolder) this.chatFolder = data.chatFolder;
      if (data.chatTags) this.chatTags = data.chatTags;
      if (data.chatSummary) this.chatSummary = data.chatSummary;
      if (data.chatTitleOverride) this.chatTitleOverride = data.chatTitleOverride;
      if (data.pinnedChats) this.pinnedChats = data.pinnedChats;
      if (data.favoriteChats) this.favoriteChats = data.favoriteChats;
      this.save();
      return true;
    } catch (e) {
      console.error('[WTL ChatManager] Failed to import state:', e);
      return false;
    }
  }

  reset() {
    this.folders = ['主线', '支线', '日常', '废案'];
    this.tags = ['高甜', '虐心', '战斗', 'R18'];
    this.folderColors = {};
    this.tagColors = {};
    this.chatFolder = {};
    this.chatTags = {};
    this.chatSummary = {};
    this.chatTitleOverride = {};
    this.pinnedChats = [];
    this.favoriteChats = [];
    this.save();
  }
}

export { STORAGE_KEY };
