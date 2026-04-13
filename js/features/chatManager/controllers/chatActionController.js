// @ts-nocheck
/**
 * Chat Action Controller for Chat Manager
 * Handles chat operations like delete, archive, restore, export
 */

import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class ChatActionController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.state = {
      isProcessing: false,
      lastOperation: null,
      operationQueue: []
    };
    
    this.initialize();
  }
  
  initialize() {
    this.bindEvents();
  }
  
  bindEvents() {
    // Listen for action requests
    eventBus.on(EVENTS.CHAT_DELETE_REQUESTED, this.handleDeleteRequest.bind(this));
    eventBus.on(EVENTS.CHAT_ARCHIVE_REQUESTED, this.handleArchiveRequest.bind(this));
    eventBus.on(EVENTS.CHAT_RESTORE_REQUESTED, this.handleRestoreRequest.bind(this));
    eventBus.on(EVENTS.CHAT_EXPORT_REQUESTED, this.handleExportRequest.bind(this));
    eventBus.on(EVENTS.CHAT_OPEN_REQUESTED, this.handleOpenRequest.bind(this));
  }
  
  // Public methods
  async deleteChats(chatIds) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('delete', chatIds);
      return;
    }
    
    this.state.isProcessing = true;
    this.state.lastOperation = { type: 'delete', chatIds };
    
    try {
      // Confirm deletion
      const confirmed = await this.confirmAction('delete', chatIds.length);
      if (!confirmed) {
        this.state.isProcessing = false;
        return;
      }
      
      // Perform deletion via SillyTavern API
      const ST_API = window.SillyTavern?.getContext?.();
      if (!ST_API?.chatHistory?.delete) {
        throw new Error('SillyTavern API not available');
      }
      
      // Delete each chat
      for (const chatId of chatIds) {
        await ST_API.chatHistory.delete(chatId);
        eventBus.emit(EVENTS.CHAT_DELETED, { chatId });
      }
      
      // Update status
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`已删除 ${chatIds.length} 个聊天`);
      }
      
      // Refresh chat list
      eventBus.emit(EVENTS.CHATS_CHANGED);
      
    } catch (error) {
      console.error('[WTL ChatManager] Failed to delete chats:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`删除失败: ${error.message}`);
      }
      
      eventBus.emit(EVENTS.CHAT_OPERATION_ERROR, { 
        operation: 'delete', 
        chatIds, 
        error: error.message 
      });
      
    } finally {
      this.state.isProcessing = false;
      this.processNextOperation();
    }
  }
  
  async archiveChats(chatIds) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('archive', chatIds);
      return;
    }
    
    this.state.isProcessing = true;
    this.state.lastOperation = { type: 'archive', chatIds };
    
    try {
      // Perform archiving via SillyTavern API
      const ST_API = window.SillyTavern?.getContext?.();
      if (!ST_API?.chatHistory?.update) {
        throw new Error('SillyTavern API not available');
      }
      
      // Archive each chat
      for (const chatId of chatIds) {
        await ST_API.chatHistory.update(chatId, { isArchived: true });
        eventBus.emit(EVENTS.CHAT_ARCHIVED, { chatId });
      }
      
      // Update status
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`已归档 ${chatIds.length} 个聊天`);
      }
      
      // Refresh chat list
      eventBus.emit(EVENTS.CHATS_CHANGED);
      
    } catch (error) {
      console.error('[WTL ChatManager] Failed to archive chats:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`归档失败: ${error.message}`);
      }
      
      eventBus.emit(EVENTS.CHAT_OPERATION_ERROR, { 
        operation: 'archive', 
        chatIds, 
        error: error.message 
      });
      
    } finally {
      this.state.isProcessing = false;
      this.processNextOperation();
    }
  }
  
  async restoreChats(chatIds) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('restore', chatIds);
      return;
    }
    
    this.state.isProcessing = true;
    this.state.lastOperation = { type: 'restore', chatIds };
    
    try {
      // Perform restoration via SillyTavern API
      const ST_API = window.SillyTavern?.getContext?.();
      if (!ST_API?.chatHistory?.update) {
        throw new Error('SillyTavern API not available');
      }
      
      // Restore each chat
      for (const chatId of chatIds) {
        await ST_API.chatHistory.update(chatId, { isArchived: false });
        eventBus.emit(EVENTS.CHAT_RESTORED, { chatId });
      }
      
      // Update status
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`已恢复 ${chatIds.length} 个聊天`);
      }
      
      // Refresh chat list
      eventBus.emit(EVENTS.CHATS_CHANGED);
      
    } catch (error) {
      console.error('[WTL ChatManager] Failed to restore chats:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`恢复失败: ${error.message}`);
      }
      
      eventBus.emit(EVENTS.CHAT_OPERATION_ERROR, { 
        operation: 'restore', 
        chatIds, 
        error: error.message 
      });
      
    } finally {
      this.state.isProcessing = false;
      this.processNextOperation();
    }
  }
  
  async exportChats(chatIds) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('export', chatIds);
      return;
    }
    
    this.state.isProcessing = true;
    this.state.lastOperation = { type: 'export', chatIds };
    
    try {
      // Get chat data
      const chats = this.ctx.getSelectedChatData?.() || [];
      if (chats.length === 0) {
        throw new Error('没有找到选中的聊天数据');
      }
      
      // Create export data
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        count: chats.length,
        chats: chats.map(chat => ({
          id: chat.id,
          name: chat.name,
          character: chat.character,
          messageCount: chat.messageCount,
          created: chat.created?.toISOString(),
          updated: chat.updated?.toISOString(),
          isArchived: chat.isArchived,
          tags: chat.tags,
          metadata: chat.metadata
        }))
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `wtl_chats_export_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      // Update status
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`已导出 ${chats.length} 个聊天到 ${exportFileDefaultName}`);
      }
      
      eventBus.emit(EVENTS.CHATS_EXPORTED, { count: chats.length, filename: exportFileDefaultName });
      
    } catch (error) {
      console.error('[WTL ChatManager] Failed to export chats:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`导出失败: ${error.message}`);
      }
      
      eventBus.emit(EVENTS.CHAT_OPERATION_ERROR, { 
        operation: 'export', 
        chatIds, 
        error: error.message 
      });
      
    } finally {
      this.state.isProcessing = false;
      this.processNextOperation();
    }
  }
  
  async openChat(chatId) {
    try {
      // Use SillyTavern API to open chat
      const ST_API = window.SillyTavern?.getContext?.();
      if (!ST_API?.chatHistory?.open) {
        throw new Error('SillyTavern API not available');
      }
      
      await ST_API.chatHistory.open(chatId);
      
      // Update status
      if (this.ctx.setStatus) {
        this.ctx.setStatus('聊天已打开');
      }
      
      eventBus.emit(EVENTS.CHAT_OPENED, { chatId });
      
    } catch (error) {
      console.error('[WTL ChatManager] Failed to open chat:', error);
      
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`打开聊天失败: ${error.message}`);
      }
      
      eventBus.emit(EVENTS.CHAT_OPERATION_ERROR, { 
        operation: 'open', 
        chatId, 
        error: error.message 
      });
    }
  }
  
  // Helper methods
  queueOperation(type, chatIds) {
    this.state.operationQueue.push({ type, chatIds, timestamp: Date.now() });
    
    if (this.ctx.setStatus) {
      this.ctx.setStatus(`操作已加入队列: ${this.getOperationName(type)} (${chatIds.length} 个聊天)`);
    }
    
    eventBus.emit(EVENTS.CHAT_OPERATION_QUEUED, { type, chatIds });
  }
  
  async processNextOperation() {
    if (this.state.operationQueue.length === 0 || this.state.isProcessing) {
      return;
    }
    
    const nextOp = this.state.operationQueue.shift();
    if (!nextOp) return;
    
    switch (nextOp.type) {
      case 'delete':
        await this.deleteChats(nextOp.chatIds);
        break;
      case 'archive':
        await this.archiveChats(nextOp.chatIds);
        break;
      case 'restore':
        await this.restoreChats(nextOp.chatIds);
        break;
      case 'export':
        await this.exportChats(nextOp.chatIds);
        break;
    }
  }
  
  async confirmVolAction(type, count) {
    const operationNames = {
      'delete': '删除',
      'archive': '归档',
      'restore': '恢复',
      'export': '导出'
    };
    
const name = operationNames[type] || '操作';
    const message = `确定要${name} ${count} 个聊天吗？此操作${type === 'delete' ? '无法撤销' : '可能需要一些时间'}。`;
    
    return new Promise((resolve) => {
      if (window.confirm(message)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }
  
  getOperationName(type) {
    const names = {
      'delete': '删除',
      'archive': '归档',
      'restore': '恢复',
      'export': '导出'
    };
    return names[type] || '操作';
  }
  
  // Event handlers
  handleDeleteRequest(data) {
    this.deleteChats(data.chatIds ? [data.chatId] : [data.chatId]);
  }
  
  handleArchiveRequest(data) {
    this.archiveChats(data.chatIds ? [data.chatId] : [data.chatId]);
  }
  
  handleRestoreRequest(data) {
    this.restoreChats(data.chatIds ? [data.chatId] : [data.chatId]);
  }
  
  handleExportRequest(data) {
    this.exportChats(data.chatIds ? [data.chatId] : [data.chatId]);
  }
  
  handleOpenRequest(data) {
    this.openChat(data.chatId);
  }
  
  // Cleanup
  destroy() {
    eventBus.off(EVENTS.CHAT_DELETE_REQUESTED, this.handleDeleteRequest.bind(this));
    eventBus.off(EVENTS.CHAT_ARCHIVE_REQUESTED, this.handleArchiveRequest.bind(this));
    eventBus.off(EVENTS.CHAT_RESTORE_REQUESTED, this.handleRestoreRequest.bind(this));
    eventBus.off(EVENTS.CHAT_EXPORT_REQUESTED, this.handleExportRequest.bind(this));
    eventBus.off(EVENTS.CHAT_OPEN_REQUESTED, this.handleOpenRequest.bind(this));
    
    // Clear operation queue
    this.state.operationQueue = [];
    this.state.isProcessing = false;
  }
}