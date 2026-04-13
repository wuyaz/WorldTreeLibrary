// @ts-nocheck

import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class ChatDataService {
  constructor() {
    this.chats = [];
    this.characters = [];
    this.isLoading = false;
    this.lastUpdated = null;
  }

  async fetchAllChats(pinnedChats = []) {
    if (this.isLoading) return this.chats;
    
    this.isLoading = true;
    this.chats = [];
    
    try {
      const ctx = window.SillyTavern?.getContext?.();
      let characters = window.characters || (ctx && ctx.characters) || [];
      
      if (characters.length === 0 && ctx && typeof ctx.getCharacters === 'function') {
        await ctx.getCharacters();
        characters = window.characters || ctx.characters || [];
      }
      
      if (characters.length === 0) {
        console.warn('[WTL ChatManager] 未拉取到角色列表');
        this.isLoading = false;
        return [];
      }
      
      const allChats = [];
      
      for (const char of characters) {
        const charName = char.avatar || char.name;
        if (!charName) continue;
        
        try {
          const response = await fetch('/api/chats/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ch_name: charName })
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            for (const [fName, meta] of Object.entries(data)) {
              allChats.push({
                character: char.name || charName,
                charId: charName,
                fileName: fName,
                timestamp: meta.last_mes || meta.create_date || 0,
                preview: meta.mes || '暂无预览',
                globalKey: `${charName}|${fName}`
              });
            }
          }
        } catch (e) {
          console.warn(`[WTL ChatManager] Failed to fetch chats for ${charName}:`, e);
        }
      }
      
      allChats.sort((a, b) => {
        const isAPinned = pinnedChats.includes(a.globalKey);
        const isBPinned = pinnedChats.includes(b.globalKey);
        if (isAPinned && !isBPinned) return -1;
        if (!isAPinned && isBPinned) return 1;
        return b.timestamp - a.timestamp;
      });
      
      this.chats = allChats;
      this.characters = characters;
      this.lastUpdated = new Date();
      this.isLoading = false;
      
      eventBus.emit(EVENTS.CHATS_CHANGED, { chats: this.chats });
      
      return this.chats;
    } catch (error) {
      console.error('[WTL ChatManager] Failed to fetch all chats:', error);
      this.isLoading = false;
      throw error;
    }
  }
  
  async fetchChatContent(charId, fileName) {
    const fileVariants = [fileName, fileName.replace(/\.jsonl$/i, '')];
    const folderVariants = [charId, `default_${charId}`, charId.replace(/ /g, '_')];
    
    for (const folder of folderVariants) {
      for (const fName of fileVariants) {
        try {
          const response = await fetch('/api/chats/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ch_name: folder, 
              file_name: fName, 
              avatar_url: folder 
            })
          });
          
          if (!response.ok) continue;
          
          const result = await response.text();
          if (result && result !== '{}') {
            try {
              const parsed = JSON.parse(result);
              if (parsed.lines) return parsed.lines;
            } catch (e) {
              const lines = result.split('\n')
                .filter(l => l.trim() !== '')
                .map(l => {
                  try {
                    return JSON.parse(l);
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean);
              if (lines.length > 0) return lines;
            }
          }
        } catch (err) {
          console.warn(`[WTL ChatManager] Failed to fetch chat content:`, err);
        }
      }
    }
    
    return null;
  }
  
  async loadAllChats() {
    return this.fetchAllChats();
  }

  getChatsByCharacter(characterName) {
    return this.chats.filter(chat => chat.character === characterName);
  }

  getChatsByFolder(folderName) {
    return this.chats.filter(chat => chat.folder === folderName);
  }

  getChatsByTags(tags) {
    if (!tags || tags.length === 0) return this.chats;
    return this.chats.filter(chat => 
      tags.some(tag => chat.tags && chat.tags.includes(tag))
    );
  }

  searchChats(query) {
    if (!query || typeof query !== 'string') return this.chats;
    const lowerQuery = query.toLowerCase();
    return this.chats.filter(chat => 
      chat.name.toLowerCase().includes(lowerQuery) ||
      chat.character.toLowerCase().includes(lowerQuery) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(lowerQuery)) ||
      (chat.tags && chat.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  sortChats(chats, sortBy = 'updated', direction = 'desc') {
    const sorted = [...chats];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'character':
          comparison = a.character.localeCompare(b.character);
          break;
        case 'created':
          comparison = (a.created?.getTime() || 0) - (b.created?.getTime() || 0);
          break;
        case 'updated':
        default:
          comparison = (a.updated?.getTime() || 0) - (b.updated?.getTime() || 0);
          break;
      }
      
      return direction === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }

  filterChats(options = {}) {
    let filtered = [...this.chats];
    
    if (options.character && options.character !== 'all') {
      filtered = filtered.filter(chat => chat.character === options.character);
    }
    
    if (options.folder && options.folder !== 'all') {
      filtered = filtered.filter(chat => chat.folder === options.folder);
    }
    
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(chat => 
        options.tags.some(tag => chat.tags && chat.tags.includes(tag))
      );
    }
    
    if (options.query) {
      const lowerQuery = options.query.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.name.toLowerCase().includes(lowerQuery) ||
        chat.character.toLowerCase().includes(lowerQuery) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (!options.showArchived) {
      filtered = filtered.filter(chat => !chat.isArchived);
    }
    
    return this.sortChats(filtered, options.sortBy, options.sortDirection);
  }

  paginateChats(chats, page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      items: chats.slice(start, end),
      total: chats.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(chats.length / pageSize),
      hasNext: end < chats.length,
      hasPrev: page > 1,
    };
  }

  getCharacters() {
    return this.characters;
  }

  getCharacterNames() {
    return [...new Set(this.chats.map(chat => chat.character))].sort();
  }
}
