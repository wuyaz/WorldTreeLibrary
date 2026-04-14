// @ts-nocheck

import { fetchChatContent, openCharacterChat } from '../../../shared/api/chatApi.js';
import { ChatManagerSettings } from '../data/chatManagerSettings.js';

export class ChatPreviewService {
  constructor() {
    this.modalId = 'st-gcm-shared-modal';
    this.settings = new ChatManagerSettings();
    this.settings.load();
    this.callbacks = {};
  }

  async show(charId, fileName, callbacks = {}) {
    this.callbacks = callbacks;
    const Popup = window.Popup || (await import('/scripts/popup.js')).Popup;
    const POPUP_TYPE = window.POPUP_TYPE || (await import('/scripts/popup.js')).POPUP_TYPE;
    
    const container = document.createElement('div');
    container.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> 读取对话数据中...</div>';
    
    const popup = new Popup(container, POPUP_TYPE.TEXT, '', {
      wide: true,
      large: false,
      allowVerticalScrolling: true,
      okButton: '跳转到此聊天',
      cancelButton: '关闭',
    });

    popup.show().then(async (result) => {
      if (result === 1) {
        const success = await openCharacterChat(charId, fileName);
        if (!success) {
          window.toastr?.warning?.('未能调用原生跳转接口，请手动在列表中选择。');
        }
        callbacks.onJump?.(charId, fileName);
      }
    });

    try {
      const data = await fetchChatContent(charId, fileName);
      
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="color:#e06c75; text-align:center;padding:20px;">无法读取该对话文件数据。</div>';
        return;
      }

      const validMsg = data
        .filter(m => (m.mes || m.message) && String(m.mes || m.message).trim() !== '')
        .slice(-this.settings.previewLayers);

      const messagesData = this.prepareMessagesData(validMsg, charId);
      
      if (this.callbacks.onMessagesReady) {
        this.callbacks.onMessagesReady(container, messagesData);
      }

    } catch (error) {
      console.error('[WTL ChatPreview] Error:', error);
      container.innerHTML = '<div style="color:#e06c75; text-align:center;padding:20px;">读取数据时发生错误。</div>';
    }
  }

  prepareMessagesData(messages, charId) {
    return messages.map((msg, index) => {
      const isUser = msg.is_user === true || msg.is_user === 'true';
      const sender = msg.name || msg.sender || (isUser ? 'You' : charId);
      const txt = String(msg.mes || msg.message);
      const isExpanded = index === messages.length - 1;
      const floorNum = index + 1;
      
      return {
        index,
        isUser,
        sender,
        text: txt,
        isExpanded,
        floorNum,
      };
    });
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const chatPreviewService = new ChatPreviewService();
