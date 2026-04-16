// @ts-nocheck

import { resolveExtRoot } from '../../../core/assets.js';
import { ChatFilterService } from '../services/chatFilterService.js';

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
    this.filterService = new ChatFilterService();
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
            <button type="button" class="wtl-chat-manager-icon-btn" title="上一页" data-action="page" data-page="prev">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="wtl-chat-manager-count" data-role="count">0 条</span>
            <button type="button" class="wtl-chat-manager-icon-btn" title="下一页" data-action="page" data-page="next">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
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
    const { totalChats, filteredCount, isBatchMode, isLoading, viewMode, activeFilter, currentPage, totalPages } = state;
    
    if (this.ui.count) {
      this.ui.count.textContent = `${filteredCount || 0} 条 · ${currentPage || 1}/${totalPages || 1}页`;
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
    
    const prevBtn = this.rootEl?.querySelector('[data-page="prev"]');
    const nextBtn = this.rootEl?.querySelector('[data-page="next"]');
    if (prevBtn) {
      prevBtn.disabled = (currentPage || 1) <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = (currentPage || 1) >= (totalPages || 1);
    }
    
    this.ui.panel?.classList.toggle('is-batch', isBatchMode);
  }

  renderToolbar(state) {
    const totalPages = Math.max(1, Number(state.totalPages || 1));
    const currentPage = Math.max(1, Number(state.currentPage || 1));
    
    const viewModes = [
      { mode: 'time', icon: 'fa-solid fa-clock', label: '时间' },
      { mode: 'favorite', icon: 'fa-solid fa-star', label: '收藏' },
      { mode: 'character', icon: 'fa-solid fa-user', label: '角色' },
      { mode: 'folder', icon: 'fa-solid fa-folder', label: '分组' },
      { mode: 'tag', icon: 'fa-solid fa-tag', label: '标签' },
    ];
    
    const tabsHtml = viewModes.map(({ mode, icon, label }) => {
      const isActive = state.viewMode === mode;
      return `<button class="wtl-chat-manager-pill ${isActive ? 'is-active' : ''}" data-action="view" data-view="${mode}"><i class="${icon}"></i> ${label}</button>`;
    }).join('');
    
    return `
      <div class="wtl-chat-manager-toolbar">
        <div class="wtl-chat-manager-toolbar-main">
          <div class="wtl-chat-manager-tabs">${tabsHtml}</div>
          <input type="text" class="wtl-chat-manager-search" placeholder="搜索..." value="${this.escapeHtml(state.searchQuery || '')}" data-action="search">
        </div>
      </div>
    `;
  }

  renderFilters(state) {
    const { viewMode, activeFilter } = state;
    
    let items = [];
    let showAdd = false;
    
    if (viewMode === 'folder') {
      items = state.folders || [];
      showAdd = true;
    } else if (viewMode === 'tag') {
      items = state.tags || [];
      showAdd = true;
    } else if (viewMode === 'character') {
      items = state.characters || [];
      showAdd = false;
    } else {
      return '';
    }
    
    const itemsHtml = items.map(item => {
      const isActive = activeFilter === item;
      return `<button class="wtl-chat-manager-pill ${isActive ? 'is-active' : ''}" data-action="filter" data-val="${this.escapeHtml(item)}">${this.escapeHtml(item)}</button>`;
    }).join('');
    
    const addBtn = showAdd ? `<button class="wtl-chat-manager-pill" data-action="add-item" data-type="${viewMode}">+ 新建</button>` : '';
    
    const firstFilter = viewMode === 'folder' ? '未分类' : '';
    const firstFilterHtml = firstFilter ? `<button class="wtl-chat-manager-pill ${activeFilter === firstFilter ? 'is-active' : ''}" data-action="filter" data-val="${this.escapeHtml(firstFilter)}">${this.escapeHtml(firstFilter)}</button>` : '';
    
    return `
      <div class="wtl-chat-manager-filters">
        ${firstFilterHtml}
        ${itemsHtml}
        ${addBtn}
      </div>
    `;
  }

  renderChatList(globalChats, state) {
    if (!globalChats || globalChats.length === 0) {
      return '<div class="wtl-chat-manager-empty">暂无聊天记录</div>';
    }

    const filterResult = this.filterService.filterChats(globalChats, state, state);
    
    if (filterResult.filteredChats.length === 0) {
      return '<div class="wtl-chat-manager-empty">没有符合筛选条件的聊天</div>';
    }

    const paginationData = this.filterService.paginateChats(
      filterResult.filteredChats,
      filterResult.pageSize,
      filterResult.currentPage
    );

    const cardsHtml = paginationData.pageItems.map(({ chat, key, folder, folderColor, tags: chatTags, summary, customTitle, isPinned, isFavorite }) => {
      const cardData = this.filterService.formatChatCardData(
        chat, key, folder, folderColor, chatTags, summary, customTitle, isPinned, isFavorite,
        state, state.previewLines
      );

      return this.renderChatCard(cardData);
    }).join('');

    const paginationHtml = this.renderPagination({
      currentPage: paginationData.currentPage,
      totalPages: paginationData.totalPages,
      totalItems: paginationData.totalItems,
      pageSize: filterResult.pageSize,
      startIndex: paginationData.startIndex,
      pageItemsCount: paginationData.pageItems.length,
    });

    return `
      <div class="wtl-chat-manager-list">${cardsHtml}</div>
      ${paginationHtml}
    `;
  }

  renderChatCard(card) {
    const tagsHtml = card.tags.map(tag => {
      const style = tag.color ? `style="--wtl-accent:${tag.color};--wtl-accent-bg:${tag.color}22;--wtl-accent-border:${tag.color}66;"` : '';
      return `<span class="wtl-chat-manager-meta-chip" data-action="remove-tag" data-key="${card.globalKey}" data-tag="${this.escapeHtml(tag.name)}" ${style}>${this.escapeHtml(tag.name)}</span>`;
    }).join('');
    
    const folderStyle = card.folderColor ? `style="--wtl-accent:${card.folderColor};--wtl-accent-bg:${card.folderColor}22;--wtl-accent-border:${card.folderColor}66;"` : '';
    
    return `
      <div class="wtl-chat-manager-card ${card.isPinned ? 'is-pinned' : ''}" data-key="${card.globalKey}">
        <div class="wtl-chat-manager-check">
          <input type="checkbox" class="wtl-chat-manager-checkbox" value="${card.globalKey}" ${card.isChecked ? 'checked' : ''}>
        </div>
        <div class="wtl-chat-manager-card-main">
          <div class="wtl-chat-manager-card-corner-actions">
            <button class="wtl-chat-manager-mini wtl-chat-manager-mini-plain" title="预览" data-action="preview" data-char="${card.charId}" data-file="${card.fileName}">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="wtl-chat-manager-mini wtl-chat-manager-mini-plain ${card.isFavorite ? 'is-active' : ''}" title="收藏" data-action="toggle-favorite" data-key="${card.globalKey}">
              <i class="fa-solid fa-star"></i>
            </button>
            <button class="wtl-chat-manager-mini wtl-chat-manager-mini-plain ${card.isPinned ? 'is-pinned' : ''}" title="置顶" data-action="toggle-pin" data-key="${card.globalKey}">
              <i class="fa-solid fa-thumbtack"></i>
            </button>
            <button class="wtl-chat-manager-mini is-danger" title="删除" data-action="delete-chat" data-char="${card.charId}" data-file="${card.fileName}" data-key="${card.globalKey}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="wtl-chat-manager-card-top">
            <div class="wtl-chat-manager-card-heading">
              <div class="wtl-chat-manager-title-row">
                <span class="wtl-chat-manager-title-text">${this.escapeHtml(card.customTitle)}</span>
                <button class="wtl-chat-manager-inline-icon" title="改名" data-action="edit-title" data-key="${card.globalKey}">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="wtl-chat-manager-inline-icon" title="添加简介" data-action="edit-summary" data-key="${card.globalKey}">
                  <i class="fa-solid fa-comment-dots"></i>
                </button>
              </div>
            </div>
          </div>
          ${card.summary ? `<div class="wtl-chat-manager-summary">${this.escapeHtml(card.summary)}</div>` : ''}
          <div class="wtl-chat-manager-preview-row">
            <div class="wtl-chat-manager-preview wtl-chat-manager-preview-lines-${card.previewLines}">${this.escapeHtml(card.preview)}</div>
            <button class="wtl-chat-manager-inline-icon" title="打开此聊天" data-action="open-chat" data-char="${card.charId}" data-file="${card.fileName}">
              <i class="fa-solid fa-external-link-alt"></i>
            </button>
          </div>
          <div class="wtl-chat-manager-meta-row">
            <span class="wtl-chat-manager-meta-chip wtl-chat-manager-character-chip">@${this.escapeHtml(card.character)}</span>
            <span class="wtl-chat-manager-meta-chip" data-action="edit-folder" data-key="${card.globalKey}" ${folderStyle}>${this.escapeHtml(card.folder)}</span>
            ${tagsHtml}
            <button class="wtl-chat-manager-inline-icon" title="添加标签" data-action="add-tag" data-key="${card.globalKey}">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
           <div class="wtl-chat-manager-card-foot">
             <span class="wtl-chat-manager-card-time">${this.formatRecentDate(card.timestamp)}</span>
             <span class="wtl-chat-manager-file-meta">
               <span class="wtl-chat-manager-file-name">${this.escapeHtml(card.fileName)}</span>
               <span class="wtl-chat-manager-file-extra">楼层 ${Number(card.messageCount || 0) || 0} · ${card.fileSize || '未知大小'}</span>
             </span>
           </div>
        </div>
      </div>
    `;
  }

  renderPagination({ currentPage, totalPages, totalItems, pageSize, startIndex, pageItemsCount }) {
    const rangeStart = totalItems === 0 ? 0 : startIndex + 1;
    const rangeEnd = startIndex + pageItemsCount;

    return `
      <div class="wtl-chat-manager-pagination">
        <div class="wtl-chat-manager-pagination-main">
          <button class="wtl-chat-manager-mini" data-action="page" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''} title="上一页">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="wtl-chat-manager-page-status">第 ${currentPage} / ${totalPages} 页</span>
          <button class="wtl-chat-manager-mini" data-action="page" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''} title="下一页">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="wtl-chat-manager-page-meta">显示 ${rangeStart}-${rangeEnd} / ${totalItems} 条，每页 ${pageSize} 条</div>
      </div>
    `;
  }

  formatRecentDate(timestamp) {
    const numeric = Number(timestamp || 0);
    if (!numeric) return '未知时间';
    const date = new Date(numeric);
    if (Number.isNaN(date.getTime())) return '未知时间';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  renderBatchBar(state) {
    const { isBatchMode, selectedChats } = state;
    if (!isBatchMode) return '';
    
    const allKeys = this.getAllVisibleKeys(state);
    const allSelected = allKeys.length > 0 && allKeys.every(k => selectedChats.has(k));
    
    return `
      <div class="wtl-chat-manager-batchbar">
        <div class="wtl-chat-manager-batchbar-left">
          <label class="wtl-chat-manager-select-all">
            <input type="checkbox" ${allSelected ? 'checked' : ''} data-action="select-all">
            <span>全选</span>
          </label>
          <span class="wtl-chat-manager-selected-count">已选 ${selectedChats.size} 条</span>
        </div>
        <div class="wtl-chat-manager-batchbar-right">
          <button class="wtl-chat-manager-btn" data-action="batch-folder">设分组</button>
          <button class="wtl-chat-manager-btn" data-action="batch-tag-add">加标签</button>
          <button class="wtl-chat-manager-btn" data-action="batch-rename">重命名</button>
          <button class="wtl-chat-manager-btn is-danger" data-action="batch-tag-del">清空标签</button>
        </div>
      </div>
    `;
  }

  getAllVisibleKeys(state) {
    return [];
  }

  renderPanel(globalChats, state) {
    if (!this.ui.panel) return;

    const toolbar = this.renderToolbar(state);
    const filters = this.renderFilters(state);
    const chatList = this.renderChatList(globalChats, state);
    const batchBar = this.renderBatchBar(state);

    this.ui.panel.innerHTML = toolbar + filters + chatList + batchBar;
    
    this.updateHeader({
      ...state,
      totalChats: globalChats?.length || 0,
      filteredCount: state.filteredCount || globalChats?.length || 0
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

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
