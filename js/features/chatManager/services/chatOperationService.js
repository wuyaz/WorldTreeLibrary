// @ts-nocheck
/**
 * Chat Operation Service - Handles chat operations like delete, archive, export
 */

export class ChatOperationService {
  constructor() {
    this.state = {
      isProcessing: false,
      operationQueue: []
    };
  }

  async deleteChats(chatIds) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('delete', chatIds);
      return;
    }

    this.state.isProcessing = true;
    
    try {
      const ST_API = window.SillyTavern?.getContext?.();
      if (!ST_API?.chatHistory?.delete) {
        throw new Error('Delete API not available');
      }

      const confirmed = confirm(`确定要删除 ${chatIds.length} 个聊天吗？此操作不可撤销。`);
      if (!confirmed) return;

      for (const chatId of chatIds) {
        await ST_API.chatHistory.delete(chatId);
      }

      return { success: true, count: chatIds.length };
    } catch (error) {
      console.error('[WTL ChatManager] Failed to delete chats:', error);
      throw error;
    } finally {
      this.state.isProcessing = false;
      this.processQueue();
    }
  }

  async archiveChats(chatIds, archive = true) {
    if (!chatIds || chatIds.length === 0) return;
    
    if (this.state.isProcessing) {
      this.queueOperation('archive', { chatIds, archive });
      return;
    }

    this.state.isProcessing = true;
    
    try {
      // Implementation depends on ST API availability
      console.log(`[WTL ChatManager] ${archive ? 'Archive' : 'Unarchive'} chats:`, chatIds);
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true, count: chatIds.length, archived: archive };
    } catch (error) {
      console.error('[WTL ChatManager] Failed to archive chats:', error);
      throw error;
    } finally {
      this.state.isProcessing = false;
      this.processQueue();
    }
  }

  async exportChats(chatIds, format = 'json') {
    if (!chatIds || chatIds.length === 0) return;
    
    this.state.isProcessing = true;
    
    try {
      const ST_API = window.SillyTavern?.getContext?.();
      const exportData = [];
      
      for (const chatId of chatIds) {
        if (ST_API?.chatHistory?.get) {
          const chat = await ST_API.chatHistory.get(chatId, { format: 'openai' });
          exportData.push({
            id: chatId,
            data: chat,
            exportedAt: new Date().toISOString(),
            format: format
          });
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, count: exportData.length };
    } catch (error) {
      console.error('[WTL ChatManager] Failed to export chats:', error);
      throw error;
    } finally {
      this.state.isProcessing = false;
    }
  }

  queueOperation(type, data) {
    this.state.operationQueue.push({ type, data, timestamp: Date.now() });
  }

  async processQueue() {
    if (this.state.operationQueue.length === 0 || this.state.isProcessing) return;
    
    const operation = this.state.operationQueue.shift();
    if (!operation) return;
    
    try {
      switch (operation.type) {
        case 'delete':
          await this.deleteChats(operation.data);
          break;
        case 'archive':
          await this.archiveChats(operation.data.chatIds, operation.data.archive);
          break;
        default:
          console.warn(`[WTL ChatManager] Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      console.error(`[WTL ChatManager] Failed to process queued operation ${operation.type}:`, error);
    }
  }

  getState() {
    return { ...this.state };
  }
}