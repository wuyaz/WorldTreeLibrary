// @ts-nocheck

import { fetchChatContent, openCharacterChat } from '../services/chatManagerApi.js';
import { ChatManagerSettings } from '../data/chatManagerSettings.js';

export class ChatPreviewService {
  constructor() {
    this.modalId = 'st-gcm-shared-modal';
    this.settings = new ChatManagerSettings();
    this.settings.load();
  }

  async show(charId, fileName, callbacks = {}) {
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

      container.innerHTML = this.renderMessages(validMsg, charId);
      this.bindMessageEvents(container, validMsg);

    } catch (error) {
      console.error('[WTL ChatPreview] Error:', error);
      container.innerHTML = '<div style="color:#e06c75; text-align:center;padding:20px;">读取数据时发生错误。</div>';
    }
  }

  renderMessages(messages, charId) {
    let html = '<div class="wtl-preview-container" style="display:flex;flex-direction:column;gap:8px;">';
    
    messages.forEach((msg, index) => {
      const isUser = msg.is_user === true || msg.is_user === 'true';
      const sender = msg.name || msg.sender || (isUser ? 'You' : charId);
      const txt = String(msg.mes || msg.message);
      const isExpanded = index === messages.length - 1;
      const floorNum = index + 1;
      
      html += `
        <div class="wtl-preview-msg" data-index="${index}" style="border:1px solid var(--SmartThemeBorderColor);border-radius:8px;overflow:hidden;">
          <div class="wtl-preview-header" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,0,0,0.2);cursor:pointer;user-select:none;">
            <span style="font-weight:bold;color:${isUser ? 'var(--SmartThemeUserColor, #68b)' : 'var(--SmartThemeBotColor, #8a6)'};">
              <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'}" style="margin-right:6px;"></i>${sender}
            </span>
            <div style="display:flex;align-items:center;gap:8px;">
              <small style="opacity:0.6;">楼层 ${floorNum}</small>
              <i class="fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}" style="transition:transform 0.2s;"></i>
            </div>
          </div>
          <div class="wtl-preview-body" style="padding:${isExpanded ? '12px' : '0 12px'};max-height:${isExpanded ? '300px' : '0'};overflow:auto;transition:all 0.2s;">
            <div style="white-space:pre-wrap;word-break:break-word;">${this.escapeHtml(txt)}</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  bindMessageEvents(container, messages) {
    container.querySelectorAll('.wtl-preview-header').forEach(header => {
      header.addEventListener('click', () => {
        const msgEl = header.closest('.wtl-preview-msg');
        const body = msgEl.querySelector('.wtl-preview-body');
        const icon = header.querySelector('.fa-chevron-up, .fa-chevron-down');
        const isExpanded = body.style.maxHeight !== '0px';
        
        if (isExpanded) {
          body.style.maxHeight = '0';
          body.style.padding = '0 12px';
          icon.classList.remove('fa-chevron-up');
          icon.classList.add('fa-chevron-down');
        } else {
          body.style.maxHeight = '300px';
          body.style.padding = '12px';
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        }
      });
    });
  }
}

export const chatPreviewService = new ChatPreviewService();
