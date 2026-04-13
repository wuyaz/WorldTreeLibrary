// @ts-nocheck

import { resolveExtRoot } from '../../../core/assets.js';

const CHAT_MANAGER_ROOT_ID = 'wtl-chat-manager-root';
const CHAT_MANAGER_STYLE_ID = 'wtl-chat-manager-styles';

export class ChatManagerUI {
  constructor(options = {}) {
    this.options = options;
    this.dataService = options.dataService;
    this.callbacks = options.callbacks || {};
    
    this.ui = {};
    this.searchTimer = null;
    this.rootEl = null;
  }

  async ensureStyles() {
    if (document.getElementById(CHAT_MANAGER_STYLE_ID)) return;
    
    try {
      const extRoot = resolveExtRoot();
      const cssUrl = `${extRoot}/assets/css/wtl-chat.css`;
      
      const response = await fetch(cssUrl);
      if (!response.ok) {
        console.warn('[WTL ChatManager] Failed to load CSS from:', cssUrl);
        return;
      }
      
      const css = await response.text();
      
      const style = document.createElement('style');
      style.id = CHAT_MANAGER_STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    } catch (error) {
      console.warn('[WTL ChatManager] Failed to load CSS:', error);
    }
  }

  async createContainer() {
    await this.ensureStyles();
    
    let host = document.getElementById(CHAT_MANAGER_ROOT_ID);
    
    if (!host) {
      host = document.createElement('section');
      host.id = CHAT_MANAGER_ROOT_ID;
      host.className = 'wtl-chat-manager-shell';
      
      host.innerHTML = `
        <div class="wtl-chat-manager-header">
          <div class="wtl-chat-manager-header-main" data-action="toggle-panel" title="点击展开/折叠聊天管理">
            <i class="fa-solid fa-folder-tree"></i>
            <span class="wtl-chat-manager-title">聊天管理</span>
            <span class="wtl-chat-manager-subtitle" data-role="subtitle">（载入中...）</span>
          </div>
          <div class="wtl-chat-manager-header-tools">
            <span class="wtl-chat-manager-count" data-role="count">0 条</span>
            <button type="button" class="wtl-chat-manager-icon-btn" title="批量操作" data-action="toggle-batch">
              <i class="fa-solid fa-check-double"></i>
            </button>
            <button type="button" class="wtl-chat-manager-icon-btn" title="刷新数据" data-action="refresh">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button type="button" class="wtl-chat-manager-icon-btn" title="设置" data-action="settings">
              <i class="fa-solid fa-gear"></i>
            </button>
            <button type="button" class="wtl-chat-manager-icon-btn" data-action="toggle-panel">
              <i class="fa-solid fa-chevron-down" data-role="chevron"></i>
            </button>
          </div>
        </div>
        <div class="wtl-chat-manager-panel"></div>
      `;
    }
    
    this.rootEl = host;
    this.ui.container = host;
    this.ui.panel = host.querySelector('.wtl-chat-manager-panel');
    this.ui.chevron = host.querySelector('[data-role="chevron"]');
    this.ui.count = host.querySelector('[data-role="count"]');
    this.ui.subtitle = host.querySelector('[data-role="subtitle"]');
    
    return host;
  }

  togglePanel(open) {
    if (!this.ui.panel) return;
    
    if (open === undefined) {
      open = !this.ui.panel.classList.contains('is-open');
    }
    
    this.ui.panel.classList.toggle('is-open', open);
    
    if (this.ui.chevron) {
      this.ui.chevron.style.transform = open ? 'rotate(180deg)' : '';
    }
    
    return open;
  }

  isPanelOpen() {
    return this.ui.panel?.classList.contains('is-open');
  }

  updateHeader(state) {
    const { totalChats, filteredCount, isBatchMode, isLoading, viewMode, activeFilter } = state;
    
    if (this.ui.count) {
      this.ui.count.textContent = `${filteredCount || 0} 条`;
    }
    
    if (this.ui.subtitle) {
      let subtitle = '';
      if (isLoading) {
        subtitle = '（载入中...）';
      } else if (viewMode !== 'time' && activeFilter !== '全部') {
        subtitle = `（${activeFilter}）`;
      } else {
        subtitle = `（共 ${totalChats || 0} 条）`;
      }
      this.ui.subtitle.textContent = subtitle;
    }
    
    const batchBtn = this.rootEl?.querySelector('[data-action="toggle-batch"]');
    if (batchBtn) {
      batchBtn.classList.toggle('is-active', isBatchMode);
    }
    
    this.ui.panel?.classList.toggle('is-batch', isBatchMode);
  }

  renderToolbar(State) {
    const { viewMode, searchQuery } = State;
    
    return `
      <div class="wtl-chat-manager-toolbar">
        <div class="wtl-chat-manager-toolbar-main">
          <div class="wtl-chat-manager-tabs">
            <button class="wtl-chat-manager-pill ${viewMode === 'time' ? 'is-active' : ''}" data-action="view" data-view="time">🕐 时间</button>
            <button class="wtl-chat-manager-pill ${viewMode === 'character' ? 'is-active' : ''}" data-action="view" data-view="character">👤 角色</button>
            <button class="wtl-chat-manager-pill ${viewMode === 'folder' ? 'is-active' : ''}" data-action="view" data-view="folder">📁 分组</button>
            <button class="wtl-chat-manager-pill ${viewMode === 'tag' ? 'is-active' : ''}" data-action="view" data-view="tag">🏷️ 标签</button>
          </div>
          <input type="text" class="wtl-chat-manager-search" placeholder="搜索..." value="${searchQuery || ''}" data-action="search">
        </div>
      </div>
    `;
  }

  renderFilters(State) {
    const { viewMode, activeFilter } = State;
    
    if (viewMode === 'folder') {
      const folders = State.folders || [];
      let html = '<div class="wtl-chat-manager-filters">' +
        `<button class="wtl-chat-manager-pill ${activeFilter === '全部' ? 'is-active' : ''}" data-action="filter" data-val="全部">全部</button>`;
      folders.forEach(f => {
        html += `<button class="wtl-chat-manager-pill ${activeFilter === f ? 'is-active' : ''}" data-action="filter" data-val="${f}">${f}</button>`;
      });
      html += `<button class="wtl-chat-manager-pill" data-action="add-item" data-type="folder">+ 新建</button>`;
      html += '</div>';
      return html;
    }
    
    if (viewMode === 'tag') {
      const tags = State.tags || [];
      let html = '<div class="wtl-chat-manager-filters">' +
        `<button class="wtl-chat-manager-pill ${activeFilter === '全部' ? 'is-active' : ''}" data-action="filter" data-val="全部">全部</button>`;
      tags.forEach(t => {
        html += `<button class="wtl-chat-manager-pill ${activeFilter === t ? 'is-active' : ''}" data-action="filter" data-val="${t}">${t}</button>`;
      });
      html += `<button class="wtl-chat-manager-pill" data-action="add-item" data-type="tag">+ 新建</button>`;
      html += '</div>';
      return html;
    }
    
    if (viewMode === 'character') {
      const characters = State.characters || [];
      let html = '<div class="wtl-chat-manager-filters">' +
        `<button class="wtl-chat-manager-pill ${activeFilter === '全部' ? 'is-active' : ''}" data-action="filter" data-val="全部">全部</button>`;
      characters.forEach(c => {
        html += `<button class="wtl-chat-manager-pill ${activeFilter === c ? 'is-active' : ''}" data-action="filter" data-val="${c}">${c}</button>`;
      });
      html += '</div>';
      return html;
    }
    
    return '';
  }

  renderChatList(globalChats, State) {
    if (!globalChats || globalChats.length === 0) {
      return '<div class="wtl-chat-manager-empty">暂无聊天记录</div>';
    }

    const searchLower = State.searchQuery?.toLowerCase() || '';
    let html = '<div class="wtl-chat-manager-list">';

    const rawSettings = localStorage.getItem('wtl_chat_manager_settings');
    let previewLines = 2;
    try {
      const parsedSettings = rawSettings ? JSON.parse(rawSettings) : null;
      previewLines = Math.max(1, Math.min(6, Number(parsedSettings?.previewLines ?? 2) || 2));
    } catch {}

    globalChats.forEach(chat => {
      const key = chat.globalKey;
      const folder = State.chatFolder[key] || '未分类';
      const tags = State.chatTags[key] || [];
      const summary = State.chatSummary[key] || '';
      const customTitle = State.chatTitleOverride[key] || chat.fileName.replace(/\.jsonl$/i, '');
      const isPinned = State.pinnedChats.includes(key);

      if (State.activeFilter !== '全部') {
        if (State.viewMode === 'folder' && folder !== State.activeFilter) return;
        if (State.viewMode === 'tag' && !tags.includes(State.activeFilter)) return;
        if (State.viewMode === 'character' && chat.character !== State.activeFilter) return;
      }

      if (searchLower && !(`${customTitle} ${summary} ${chat.character}`.toLowerCase().includes(searchLower))) return;

      const isChecked = State.selectedChats.has(key) ? 'checked' : '';

      html += `
        <div class="wtl-chat-manager-card ${isPinned ? 'is-pinned' : ''}" data-key="${key}">
          <div class="wtl-chat-manager-check">
            <input type="checkbox" class="wtl-chat-manager-checkbox" value="${key}" ${isChecked}>
          </div>
          <div class="wtl-chat-manager-card-main">
            <div class="wtl-chat-manager-card-corner-actions">
              <button class="wtl-chat-manager-mini wtl-chat-manager-mini-plain" title="预览" data-action="preview" data-char="${chat.charId}" data-file="${chat.fileName}">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="wtl-chat-manager-mini wtl-chat-manager-mini-plain ${isPinned ? 'is-active' : ''}" title="置顶" data-action="toggle-pin" data-key="${key}">
                <i class="fa-solid fa-thumbtack"></i>
              </button>
              <button class="wtl-chat-manager-mini is-danger" title="删除" data-action="delete-chat" data-char="${chat.charId}" data-file="${chat.fileName}" data-key="${key}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="wtl-chat-manager-card-top">
              <div class="wtl-chat-manager-card-heading">
                <div class="wtl-chat-manager-title-row">
                  <span class="wtl-chat-manager-title-text">${customTitle}</span>
                  <button class="wtl-chat-manager-inline-icon" title="改名" data-action="edit-title" data-key="${key}">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                </div>
              </div>
            </div>
            ${summary ? `<div class="wtl-chat-manager-summary">${summary}</div>` : ''}
            <div class="wtl-chat-manager-preview-row">
              <div class="wtl-chat-manager-preview wtl-chat-manager-preview-lines-${previewLines}">${chat.preview}</div>
              <button class="wtl-chat-manager-inline-icon" title="添加简介" data-action="edit-summary" data-key="${key}">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <div class="wtl-chat-manager-meta-row">
              <span class="wtl-chat-manager-meta-chip" data-action="edit-folder" data-key="${key}">${folder}</span>
              ${tags.map(t => `<span class="wtl-chat-manager-meta-chip" data-action="remove-tag" data-key="${key}" data-tag="${t}">${t}</span>`).join('')}
              <button class="wtl-chat-manager-inline-icon" title="添加标签" data-action="add-tag" data-key="${key}">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <div class="wtl-chat-manager-card-foot">
              <span class="wtl-chat-manager-card-time">@${chat.character}</span>
              <span class="wtl-chat-manager-file-name">${chat.fileName}</span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  renderBatchBar(State) {
    const { isBatchMode, selectedChats } = State;
    if (!isBatchMode) return '';
    
    const folders = State.folders || [];
    const folderOpts = folders.map((f, i) => `${i}. ${f}`).join('\n');
    
    return `
      <div class="wtl-chat-manager-batchbar">
        <span>已选 ${selectedChats.size} 条</span>
        <div>
          <button class="wtl-chat-manager-btn" data-action="batch-folder">设分组</button>
          <button class="wtl-chat-manager-btn" data-action="batch-tag-add">加标签</button>
          <button class="wtl-chat-manager-btn" data-action="batch-tag-del">删标签</button>
        </div>
      </div>
    `;
  }

  renderPanel(globalChats, State) {
    if (!this.ui.panel) return;

    const toolbar = this.renderToolbar(State);
    const filters = this.renderFilters(State);
    const chatList = this.renderChatList(globalChats, State);
    const batchBar = this.renderBatchBar(State);

    this.ui.panel.innerHTML = toolbar + filters + chatList + batchBar;
    
    this.updateHeader({
      ...State,
      totalChats: globalChats?.length || 0,
      filteredCount: State.filteredCount || globalChats?.length || 0
    });
  }

  showLoading() {
    if (this.ui.subtitle) {
      this.ui.subtitle.textContent = '（载入中...）';
    }
    if (this.ui.panel) {
      this.ui.panel.innerHTML = '<div class="wtl-chat-manager-empty"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>';
      this.ui.panel.classList.add('is-open');
    }
  }

  getContainer() {
    return this.rootEl;
  }

  destroy() {
    if (this.rootEl) {
      this.rootEl.remove();
    }
    this.rootEl = null;
    this.ui = {};
  }
}
