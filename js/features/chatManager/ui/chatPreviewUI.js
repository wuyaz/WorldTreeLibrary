// @ts-nocheck

export class ChatPreviewUI {
  constructor() {
  }

  renderMessages(messagesData, charId) {
    let html = '<div class="wtl-preview-container" style="display:flex;flex-direction:column;gap:8px;">';
    
    messagesData.forEach((msg) => {
      const { index, isUser, sender, text, isExpanded, floorNum } = msg;
      
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
            <div style="white-space:pre-wrap;word-break:break-word;">${this.escapeHtml(text)}</div>
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

  bindMessageEvents(container) {
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
