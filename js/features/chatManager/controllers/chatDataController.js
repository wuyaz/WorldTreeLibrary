// @ts-nocheck
/**
 * Chat Data Controller for Chat Manager
 * Handles chat data fetching, filtering, sorting, and selection
 */

import eventBus, { EVENTS } from '../../../core/eventBus.js';
import { ChatDataService } from '../services/chatDataService.js';
import { ChatManagerSettings } from '../data/chatManagerSettings.js';
import { ChatManagerState } from '../data/chatManagerState.js';

export class ChatDataController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.chatDataService = new ChatDataService();
    this.settings = new ChatManagerSettings();
    this.managerState = new ChatManagerState();
    
    this.state = {
      chats: [],
      filteredChats: [],
      currentFilter: 'all',
      searchQuery: '',
      sortBy: 'updated',
      sortDirection: 'desc',
      selectedChats: new Set(),
      isLoading: false,
      lastUpdated: null,
      currentPage: 1,
      totalPages: 1,
      pageSize: 20,
      selectedFolder: null,
      selectedTags: [],
      selectedCharacter: null,
      viewMode: 'time',
    };
    
    this.initialize();
  }
  
  initialize() {
    this.settings.load();
    this.managerState.load();
    this.state.pageSize = this.settings.pageSize;
    this.state.currentPage = this.managerState.currentPage || 1;
    this.state.selectedFolder = this.managerState.selectedFolder;
    this.state.selectedTags = this.managerState.selectedTags || [];
    this.state.viewMode = this.settings.defaultView;
    this.bindEvents();
    this.loadInitialState();
  }
  
  bindEvents() {
    if (window.SillyTavern?.getContext) {
      window.addEventListener('st-chat-changed', this.handleChatChanged.bind(this));
      window.addEventListener('st-chat-deleted', this.handleChatDeleted.bind(this));
      window.addEventListener('st-chat-created', this.handleChatCreated.bind(this));
    }
    
    eventBus.on(EVENTS.CHAT_FILTER_CHANGED, this.handleFilterChanged.bind(this));
    eventBus.on(EVENTS.CHAT_SORT_CHANGED, this.handleSortChanged.bind(this));
    eventBus.on(EVENTS.CHAT_SEARCH_CHANGED, this.handleSearchChanged.bind(this));
  }
  
  loadInitialState() {
    const savedFilter = localStorage.getItem('wtl.chatManager.filter');
    const savedSortBy = localStorage.getItem('wtl.chatManager.sortBy');
    const savedSortDirection = localStorage.getItem('wtl.chatManager.sortDirection');
    
    if (savedFilter) this.state.currentFilter = savedFilter;
    if (savedSortBy) this.state.sortBy = savedSortBy;
    if (savedSortDirection) this.state.sortDirection = savedSortDirection;
    
    const savedSelected = localStorage.getItem('wtl.chatManager.selectedChats');
    if (savedSelected) {
      try {
        const selected = JSON.parse(savedSelected);
        if (Array.isArray(selected)) {
          this.state.selectedChats = new Set(selected);
        }
      } catch (e) {
        console.warn('[WTL ChatManager] Failed to parse selected chats:', e);
      }
    }
  }
  
  async loadInitialData() {
    return await this.refreshChats();
  }
  
  async refreshChats(options = {}) {
    if (this.state.isLoading) return;
    
    this.state.isLoading = true;
    this.emitStateChange();
    
    try {
      const chats = await this.chatDataService.loadAllChats();
      
      this.state.chats = chats.map(chat => ({
        ...chat,
        folder: this.managerState.chatFolder[chat.id] || null,
        tags: this.managerState.chatTags[chat.id] || [],
        isPinned: this.managerState.pinnedChats.includes(chat.id),
      }));
      this.state.lastUpdated = new Date();
      
      this.applyFilterAndSort();
      
      this.emitStateChange();
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`已加载 ${chats.length} 个聊天`);
      }
      
      return chats;
    } catch (error) {
      console.error('[WTL ChatManager] Failed to refresh chats:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus('加载聊天失败');
      }
      
      throw error;
    } finally {
      this.state.isLoading = false;
      this.emitStateChange();
    }
  }
  
  async fetchChatsFromAPI(options = {}) {
    try {
      const chats = await this.chatDataService.loadAllChats();
      return chats;
    } catch (error) {
      console.error('[WTL ChatManager] Failed to fetch chats:', error);
      return this.fetchChatsFromLocalStorage();
    }
  }
  
  fetchChatsFromLocalStorage() {
    // Try to get chats from localStorage as fallback
    const savedChats = localStorage.getItem('wtl.chatManager.cachedChats');
    if (savedChats) {
      try {
        return JSON.parse(savedChats);
      } catch (e) {
        console.warn('[WTL ChatManager] Failed to parse cached chats:', e);
      }
    }
    
    return [];
  }
  
  applyFilterAndSort() {
    let filtered = [...this.state.chats];
    
    if (this.state.selectedFolder) {
      filtered = filtered.filter(chat => chat.folder === this.state.selectedFolder);
    }
    
    if (this.state.selectedTags && this.state.selectedTags.length > 0) {
      filtered = filtered.filter(chat => 
        this.state.selectedTags.some(tag => chat.tags && chat.tags.includes(tag))
      );
    }
    
    if (this.state.selectedCharacter) {
      filtered = filtered.filter(chat => chat.character === this.state.selectedCharacter);
    }
    
    switch (this.state.currentFilter) {
      case 'active':
        filtered = filtered.filter(chat => !chat.isArchived);
        break;
      case 'archived':
        filtered = filtered.filter(chat => chat.isArchived);
        break;
      case 'all':
      default:
        break;
    }
    
    if (!this.settings.showArchived && this.state.currentFilter === 'all') {
      filtered = filtered.filter(chat => !chat.isArchived);
    }
    
    if (this.state.searchQuery.trim()) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.name.toLowerCase().includes(query) ||
        chat.character.toLowerCase().includes(query) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)) ||
        (chat.tags && chat.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      
      let aValue, bValue;
      
      switch (this.state.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'character':
          aValue = a.character.toLowerCase();
          bValue = b.character.toLowerCase();
          break;
        case 'created':
          aValue = a.created?.getTime() || 0;
          bValue = b.created?.getTime() || 0;
          break;
        case 'updated':
        default:
          aValue = a.updated?.getTime() || 0;
          bValue = b.updated?.getTime() || 0;
          break;
      }
      
      if (this.state.sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    this.state.totalPages = Math.ceil(filtered.length / this.state.pageSize);
    
    const start = (this.state.currentPage - 1) * this.state.pageSize;
    const end = start + this.state.pageSize;
    
    this.state.filteredChats = filtered.slice(start, end);
    this.state.totalChats = filtered.length;
  }
  
  filterChats(filter, query = '') {
    const needsUpdate = filter !== this.state.currentFilter || query !== this.state.searchQuery;
    
    if (filter !== this.state.currentFilter) {
      this.state.currentFilter = filter;
      localStorage.setItem('wtl.chatManager.filter', filter);
    }
    
    if (query !== this.state.searchQuery) {
      this.state.searchQuery = query;
    }
    
    if (needsUpdate) {
      this.applyFilterAndSort();
      this.emitStateChange();
      eventBus.emit(EVENTS.CHATS_FILTERED, { filter, query, chats: this.state.filteredChats });
    }
  }
  
  sortChats(by, direction = 'desc') {
    const needsUpdate = by !== this.state.sortBy || direction !== this.state.sortDirection;
    
    if (by !== this.state.sortBy) {
      this.state.sortBy = by;
      localStorage.setItem('wtl.chatManager.sortBy', by);
    }
    
    if (direction !== this.state.sortDirection) {
      this.state.sortDirection = direction;
      localStorage.setItem('wtl.chatManager.sortDirection', direction);
    }
    
    if (needsUpdate) {
      this.applyFilterAndSort();
      this.emitStateChange();
      eventBus.emit(EVENTS.CHATS_SORTED, { by, direction, chats: this.state.filteredChats });
    }
  }
  
  selectChat(chatId) {
    if (!this.state.selectedChats.has(chatId)) {
      this.state.selectedChats.add(chatId);
      this.saveSelectedChats();
      this.emitStateChange();
      eventBus.emit(EVENTS.CHAT_SELECTED, { chatId, selected: true });
    }
  }
  
  deselectChat(chatId) {
    if (this.state.selectedChats.has(chatId)) {
      this.state.selectedChats.delete(chatId);
      this.saveSelectedChats();
      this.emitStateChange();
      eventBus.emit(EVENTS.CHAT_SELECTED, { chatId, selected: false });
    }
  }
  
  toggleChatSelection(chatId) {
    if (this.state.selectedChats.has(chatId)) {
      this.deselectChat(chatId);
    } else {
      this.selectChat(chatId);
    }
  }
  
  selectAllChats() {
    const allChatIds = this.state.filteredChats.map(chat => chat.id);
    this.state.selectedChats = new Set([...this.state.selectedChats, ...allChatIds]);
    this.saveSelectedChats();
    this.emitStateChange();
    eventBus.emit(EVENTS.ALL_CHATS_SELECTED, { chatIds: allChatIds });
  }
  
  deselectAllChats() {
    this.state.selectedChats.clear();
    this.saveSelectedChats();
    this.emitStateChange();
    eventBus.emit(EVENTS.ALL_CHATS_DESELECTED);
  }
  
  getSelectedChats() {
    return Array.from(this.state.selectedChats);
  }
  
  getSelectedChatData() {
    return this.state.chats.filter(chat => this.state.selectedChats.has(chat.id));
  }
  
  getChatById(chatId) {
    return this.state.chats.find(chat => chat.id === chatId);
  }
  
  saveSelectedChats() {
    localStorage.setItem('wtl.chatManager.selectedChats', JSON.stringify(Array.from(this.state.selectedChats)));
  }
  
  clearData() {
    this.state.chats = [];
    this.state.filteredChats = [];
    this.state.selectedChats.clear();
    this.state.isLoading = false;
    this.saveSelectedChats();
    this.emitStateChange();
  }
  
  // Event handlers
  handleChatChanged(event) {
    // Refresh chats when a chat is changed
    if (this.ctx.getState?.().isOpen) {
      this.refreshChats();
    }
  }
  
  handleChatDeleted(event) {
    const chatId = event.detail?.chatId;
    if (chatId) {
      // Remove from selected chats if it was selected
      if (this.state.selectedChats.has(chatId)) {
        this.state.selectedChats.delete(chatId);
        this.saveSelectedChats();
      }
      
      // Refresh the list
      this.refreshChats();
    }
  }
  
  handleChatCreated(event) {
    // Refresh chats when a new chat is created
    this.refreshChats();
  }
  
  handleFilterChanged(data) {
    this.filterChats(data.filter, this.state.searchQuery);
  }
  
  handleSortChanged(data) {
    this.sortChats(data.by, data.direction);
  }
  
  handleSearchChanged(data) {
    this.filterChats(this.state.currentFilter, data.query);
  }
  
  emitStateChange() {
    eventBus.emit(EVENTS.CHAT_DATA_STATE_CHANGED, {
      chats: this.state.chats,
      filteredChats: this.state.filteredChats,
      selectedChats: new Set(this.state.selectedChats),
      currentFilter: this.state.currentFilter,
      searchQuery: this.state.searchQuery,
      sortBy: this.state.sortBy,
      sortDirection: this.state.sortDirection,
      isLoading: this.state.isLoading,
      lastUpdated: this.state.lastUpdated,
      currentPage: this.state.currentPage,
      totalPages: this.state.totalPages,
      pageSize: this.state.pageSize,
      totalChats: this.state.totalChats,
      selectedFolder: this.state.selectedFolder,
      selectedTags: this.state.selectedTags,
      selectedCharacter: this.state.selectedCharacter,
      viewMode: this.state.viewMode,
      folders: this.settings.folders,
      tags: this.settings.tags,
      characters: this.chatDataService.getCharacterNames(),
    });
  }
  
  setPage(page) {
    this.state.currentPage = Math.max(1, Math.min(page, this.state.totalPages));
    this.managerState.setPage(this.state.currentPage);
    this.applyFilterAndSort();
    this.emitStateChange();
  }
  
  nextPage() {
    if (this.state.currentPage < this.state.totalPages) {
      this.setPage(this.state.currentPage + 1);
    }
  }
  
  prevPage() {
    if (this.state.currentPage > 1) {
      this.setPage(this.state.currentPage - 1);
    }
  }
  
  setPageSize(size) {
    this.state.pageSize = Math.max(5, Math.min(100, size));
    this.state.currentPage = 1;
    this.settings.pageSize = this.state.pageSize;
    this.settings.save();
    this.applyFilterAndSort();
    this.emitStateChange();
  }
  
  setFolder(folder) {
    this.state.selectedFolder = folder;
    this.state.currentPage = 1;
    this.managerState.setSelectedFolder(folder);
    this.applyFilterAndSort();
    this.emitStateChange();
    eventBus.emit(EVENTS.CHATS_FILTERED, { folder, chats: this.state.filteredChats });
  }
  
  setTags(tags) {
    this.state.selectedTags = tags || [];
    this.state.currentPage = 1;
    this.managerState.setSelectedTags(tags);
    this.applyFilterAndSort();
    this.emitStateChange();
    eventBus.emit(EVENTS.CHATS_FILTERED, { tags, chats: this.state.filteredChats });
  }
  
  toggleTag(tag) {
    const index = this.state.selectedTags.indexOf(tag);
    if (index === -1) {
      this.state.selectedTags.push(tag);
    } else {
      this.state.selectedTags.splice(index, 1);
    }
    this.state.currentPage = 1;
    this.managerState.toggleTag(tag);
    this.applyFilterAndSort();
    this.emitStateChange();
  }
  
  setCharacter(character) {
    this.state.selectedCharacter = character;
    this.state.currentPage = 1;
    this.applyFilterAndSort();
    this.emitStateChange();
    eventBus.emit(EVENTS.CHATS_FILTERED, { character, chats: this.state.filteredChats });
  }
  
  setViewMode(mode) {
    this.state.viewMode = mode;
    this.settings.defaultView = mode;
    this.settings.save();
    this.emitStateChange();
  }
  
  clearFilters() {
    this.state.selectedFolder = null;
    this.state.selectedTags = [];
    this.state.selectedCharacter = null;
    this.state.currentFilter = 'all';
    this.state.searchQuery = '';
    this.state.currentPage = 1;
    this.managerState.clearFilters();
    this.applyFilterAndSort();
    this.emitStateChange();
    eventBus.emit(EVENTS.CHATS_FILTERED, { cleared: true, chats: this.state.filteredChats });
  }
  
  assignFolder(chatId, folderName) {
    this.managerState.chatFolder[chatId] = folderName;
    this.managerState.save();
    const chat = this.getChatById(chatId);
    if (chat) {
      chat.folder = folderName;
    }
    this.emitStateChange();
  }
  
  assignTags(chatId, tags) {
    this.managerState.chatTags[chatId] = tags;
    this.managerState.save();
    const chat = this.getChatById(chatId);
    if (chat) {
      chat.tags = tags;
    }
    this.emitStateChange();
  }
  
  togglePinChat(chatId) {
    const index = this.managerState.pinnedChats.indexOf(chatId);
    if (index === -1) {
      this.managerState.pinnedChats.push(chatId);
    } else {
      this.managerState.pinnedChats.splice(index, 1);
    }
    this.managerState.save();
    const chat = this.getChatById(chatId);
    if (chat) {
      chat.isPinned = index === -1;
    }
    this.applyFilterAndSort();
    this.emitStateChange();
  }
  
  getSettings() {
    return this.settings;
  }
  
  getState() {
    return this.managerState;
  }
  
  // Cleanup
  destroy() {
    // Remove event listeners
    if (window.SillyTavern?.getContext) {
      window.removeEventListener('st-chat-changed', this.handleChatChanged.bind(this));
      window.removeEventListener('st-chat-deleted', this.handleChatDeleted.bind(this));
      window.removeEventListener('st-chat-created', this.handleChatCreated.bind(this));
    }
    
    eventBus.off(EVENTS.CHAT_FILTER_CHANGED, this.handleFilterChanged.bind(this));
    eventBus.off(EVENTS.CHAT_SORT_CHANGED, this.handleSortChanged.bind(this));
    eventBus.off(EVENTS.CHAT_SEARCH_CHANGED, this.handleSearchChanged.bind(this));
  }
}
