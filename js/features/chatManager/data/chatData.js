// @ts-nocheck

import { ChatManagerState } from './chatManagerState.js';
import { fetchAllChats } from '../services/chatManagerApi.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class ChatDataService {
  constructor() {
    this.state = new ChatManagerState();
    this.state.load();
    
    this.chats = [];
    this.isLoading = false;
    this.isDataLoaded = false;
    this.lastUpdated = null;
  }

  async loadAllChats() {
    if (this.isLoading) return this.chats;

    this.isLoading = true;
    
    try {
      this.chats = await fetchAllChats();
      
      this.sortChats();
      
      this.lastUpdated = new Date();
      this.isLoading = false;
      this.isDataLoaded = true;
      
      eventBus.emit(EVENTS.CHATS_CHANGED, { chats: this.chats });
      
      return this.chats;
    } catch (error) {
      console.error('[WTL ChatManager] Failed to load all chats:', error);
      this.isLoading = false;
      throw error;
    }
  }

  sortChats() {
    this.chats.sort((a, b) => {
      const isAPinned = this.state.isPinned(a.globalKey);
      const isBPinned = this.state.isPinned(b.globalKey);
      
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;
      
      return b.timestamp - a.timestamp;
    });
  }

  togglePin(globalKey) {
    this.state.togglePin(globalKey);
    this.sortChats();
  }

  getChatTitle(globalKey) {
    const chat = this.chats.find(c => c.globalKey === globalKey);
    const defaultTitle = chat ? chat.fileName.replace(/\.jsonl$/i, '') : globalKey;
    return this.state.getChatTitle(globalKey, defaultTitle);
  }

  setChatTitle(globalKey, title) {
    this.state.setChatTitle(globalKey, title);
  }

  getChatSummary(globalKey) {
    return this.state.getChatSummary(globalKey);
  }

  setChatSummary(globalKey, summary) {
    this.state.setChatSummary(globalKey, summary);
  }

  getChatFolder(globalKey) {
    return this.state.getChatFolder(globalKey);
  }

  setChatFolder(globalKey, folder) {
    this.state.setChatFolder(globalKey, folder);
  }

  getChatTags(globalKey) {
    return this.state.getChatTags(globalKey);
  }

  addTagToChat(globalKey, tag) {
    this.state.addTagToChat(globalKey, tag);
  }

  removeTagFromChat(globalKey, tag) {
    this.state.removeTagFromChat(globalKey, tag);
  }

  getFolders() {
    return this.state.folders;
  }

  getTags() {
    return this.state.tags;
  }

  addTag(name) {
    return this.state.addTag(name);
  }

  isPinned(globalKey) {
    return this.state.isPinned(globalKey);
  }

  getCharacters() {
    return [...new Set(this.chats.map(c => c.character))].sort();
  }

  getState() {
    return this.state;
  }
}
