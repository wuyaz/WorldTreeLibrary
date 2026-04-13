// @ts-nocheck

import eventBus, { EVENTS } from '../../../core/eventBus.js';
import { ChatDataService } from '../data/chatData.js';
import { ChatManagerUI } from '../ui/chatManagerUI.js';

export class ChatManagerController {
  constructor(options = {}) {
    this.options = options;
    this.uiRefs = {};
    
    this.dataService = new ChatDataService();
    this.ui = null;
    
    this.observer = null;
    this.observerTimer = null;
    this.isDataLoaded = false;
    this.globalChats = [];
  }

  async prompt(message, defaultValue = '') {
    try {
      const Popup = window.Popup || (await import('/scripts/popup.js')).Popup;
      return await Popup.show.input('聊天管理', message, defaultValue);
    } catch (e) {
      console.warn('[WTL ChatManager] Popup failed, using native prompt:', e);
      return window.prompt(message, defaultValue);
    }
  }

  async confirm(message) {
    try {
      const popupModule = await import('/scripts/popup.js');
      const Popup = window.Popup || popupModule.Popup;
      const result = await Popup.show.confirm('聊天管理', message);
      return result === true
        || result === 1
        || result === popupModule.POPUP_RESULT?.AFFIRMATIVE
        || result?.result === true
        || result?.result === 1
        || result?.result === popupModule.POPUP_RESULT?.AFFIRMATIVE;
    } catch (e) {
      console.warn('[WTL ChatManager] Popup failed, using native confirm:', e);
      return window.confirm(message);
    }
  }

  toast(type, message) {
    try {
      const toastr = window.toastr || window.parent?.toastr;
      if (toastr && toastr[type]) {
        toastr[type](message);
      }
    } catch (e) {
      console.log(`[WTL ChatManager] ${type}: ${message}`);
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

  async showOptionPicker({
    title,
    subtitle,
    options,
    selectedValue = '',
    createLabel,
    createPlaceholder,
    allowEmpty = false,
    emptyLabel = '未设置',
  }) {
    try {
      const popupModule = await import('/scripts/popup.js');
      const Popup = window.Popup || popupModule.Popup;

      const container = document.createElement('div');
      container.className = 'wtl-picker-popup';

      const optionHtml = options.map(option => {
        const isSelected = option === selectedValue;
        return `
          <button
            type="button"
            class="wtl-picker-option menu_button ${isSelected ? 'menu_button_default' : ''}"
            data-value="${this.escapeHtml(option)}"
          >${this.escapeHtml(option)}</button>
        `;
      }).join('');

      container.innerHTML = `
        <div class="wtl-picker-wrap" style="display:flex;flex-direction:column;gap:10px;min-width:320px;">
          <div style="font-size:12px;opacity:0.75;">${this.escapeHtml(subtitle || '')}</div>
          ${allowEmpty ? `<button type="button" class="wtl-picker-empty menu_button ${selectedValue ? '' : 'menu_button_default'}" data-empty="1">${this.escapeHtml(emptyLabel)}</button>` : ''}
          <div class="wtl-picker-options" style="display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow:auto;">${optionHtml}</div>
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:12px;opacity:0.8;">${this.escapeHtml(createLabel)}</span>
            <input class="text_pole wtl-picker-input" type="text" placeholder="${this.escapeHtml(createPlaceholder)}" value="" />
          </label>
        </div>
      `;

      let resolvedValue = null;

      const popup = new Popup(container, popupModule.POPUP_TYPE.CONFIRM, '', {
        okButton: '应用',
        cancelButton: '取消',
        wide: false,
        large: false,
        allowVerticalScrolling: true,
        onOpen: () => {
          const optionButtons = Array.from(container.querySelectorAll('.wtl-picker-option'));
          const emptyButton = container.querySelector('.wtl-picker-empty');
          const input = container.querySelector('.wtl-picker-input');

          const clearSelectedButtons = () => {
            optionButtons.forEach(btn => btn.classList.remove('menu_button_default'));
            emptyButton?.classList.remove('menu_button_default');
          };

          optionButtons.forEach(button => {
            button.addEventListener('click', () => {
              clearSelectedButtons();
              button.classList.add('menu_button_default');
              resolvedValue = button.dataset.value || '';
              if (input) input.value = '';
            });
          });

          if (emptyButton) {
            emptyButton.addEventListener('click', () => {
              clearSelectedButtons();
              emptyButton.classList.add('menu_button_default');
              resolvedValue = '';
              if (input) input.value = '';
            });
          }

          if (input) {
            input.addEventListener('input', () => {
              if (input.value.trim()) {
                clearSelectedButtons();
                resolvedValue = input.value.trim();
              } else {
                resolvedValue = selectedValue || (allowEmpty ? '' : null);
              }
            });
          }

          if (selectedValue && !resolvedValue) {
            resolvedValue = selectedValue;
          } else if (!selectedValue && allowEmpty) {
            resolvedValue = '';
          }
        },
        onClosing: () => {
          const input = container.querySelector('.wtl-picker-input');
          const customValue = input?.value?.trim?.() || '';
          if (customValue) {
            resolvedValue = customValue;
          }

          if (resolvedValue === null || resolvedValue === undefined) {
            this.toast('warning', '请选择一个选项或输入新名称');
            return false;
          }

          return true;
        },
      });

      const result = await popup.show();
      if (!(result === 1 || result === popupModule.POPUP_RESULT.AFFIRMATIVE)) {
        return null;
      }

      return typeof resolvedValue === 'string' ? resolvedValue.trim() : resolvedValue;
    } catch (error) {
      console.warn('[WTL ChatManager] showOptionPicker failed:', error);
      return null;
    }
  }

  async initialize() {
    this.dataService.state.load();
    
    this.ui = new ChatManagerUI({
      dataService: this.dataService,
    });
    
    const container = await this.ui.createContainer();
    this.injectContainer(container);
    this.startObserver();
    
    this.bindEvents();
    
    eventBus.emit(EVENTS.CHAT_MANAGER_LOADED, {
      initialized: true,
    });
  }

  injectContainer(container) {
    const selectors = [
      '.welcomePanel .welcomeRecent',
      '.welcomeRecent',
      '#chat .welcomePanel',
      '.welcomePanel',
    ];
    
    for (const selector of selectors) {
      const target = document.querySelector(selector);
      if (target) {
        target.appendChild(container);
        return true;
      }
    }
    
    return false;
  }

  bindEvents() {
    document.body.addEventListener('click', (e) => {
      const container = e.target.closest('#wtl-chat-manager-root');
      if (!container) return;
      console.log('[WTL ChatManager] Click detected in container', e.target);
      this.handleClick(e);
    });
    
    document.body.addEventListener('input', (e) => {
      const container = e.target.closest('#wtl-chat-manager-root');
      if (!container) return;
      this.handleInput(e);
    });
    
    document.body.addEventListener('change', (e) => {
      const container = e.target.closest('#wtl-chat-manager-root');
      if (!container) return;
      this.handleChange(e);
    });
    
    console.log('[WTL ChatManager] Events bound to body');
  }

  async handleClick(e) {
    const target = e.target;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    
    const action = actionEl.dataset.action;
    console.log('[WTL ChatManager] Action:', action);
    
    switch (action) {
      case 'toggle-panel':
        await this.togglePanel();
        break;
      case 'toggle-batch':
        this.handleToggleBatch();
        break;
      case 'refresh':
        await this.handleRefresh();
        break;
      case 'settings':
        this.handleSettings();
        break;
      case 'view':
        this.handleViewChange(actionEl.dataset.view);
        break;
      case 'filter':
        this.handleFilter(actionEl.dataset.val);
        break;
      case 'add-item':
        this.handleAddItem(actionEl.dataset.type);
        break;
      case 'edit-title':
        e.stopPropagation();
        this.handleEditTitle(actionEl.dataset.key);
        break;
      case 'edit-summary':
        e.stopPropagation();
        this.handleEditSummary(actionEl.dataset.key);
        break;
      case 'edit-folder':
        e.stopPropagation();
        this.handleEditFolder(actionEl.dataset.key);
        break;
      case 'add-tag':
        e.stopPropagation();
        this.handleAddTag(actionEl.dataset.key);
        break;
      case 'remove-tag':
        e.stopPropagation();
        this.handleRemoveTag(actionEl.dataset.key, actionEl.dataset.tag);
        break;
      case 'preview':
        e.stopPropagation();
        await this.handlePreview(actionEl.dataset.char, actionEl.dataset.file);
        break;
      case 'toggle-pin':
        e.stopPropagation();
        await this.handleTogglePin(actionEl.dataset.key);
        break;
      case 'delete-chat':
        e.stopPropagation();
        await this.handleDeleteChat(actionEl.dataset.char, actionEl.dataset.file, actionEl.dataset.key);
        break;
      case 'batch-folder':
        this.handleBatchFolder();
        break;
      case 'batch-tag-add':
        this.handleBatchTagAdd();
        break;
      case 'batch-tag-del':
        this.handleBatchTagDel();
        break;
    }
  }

  handleInput(e) {
    const target = e.target;
    
    if (target.dataset.action === 'search') {
      if (this.observerTimer) clearTimeout(this.observerTimer);
      const val = target.value;
      this.observerTimer = setTimeout(() => {
        this.dataService.state.searchQuery = val;
        this.dataService.state.save();
        this.renderPanel();
      }, 300);
    }
  }

  handleChange(e) {
    const target = e.target;
    
    if (target.classList.contains('wtl-chat-manager-checkbox')) {
      const card = target.closest('.wtl-chat-manager-card');
      if (card) {
        const key = card.dataset.key;
        if (target.checked) {
          this.dataService.state.selectedChats.add(key);
        } else {
          this.dataService.state.selectedChats.delete(key);
        }
        this.renderPanel();
      }
    }
  }

  async togglePanel() {
    console.log('[WTL ChatManager] togglePanel called, isDataLoaded:', this.isDataLoaded);
    const isOpen = this.ui.isPanelOpen();
    console.log('[WTL ChatManager] isPanelOpen:', isOpen);
    
    if (!isOpen) {
      if (!this.isDataLoaded || this.globalChats.length === 0) {
        console.log('[WTL ChatManager] Loading data...');
        this.ui.showLoading();
        try {
          this.globalChats = await this.dataService.loadAllChats();
          this.isDataLoaded = true;
          console.log('[WTL ChatManager] Data loaded:', this.globalChats.length, 'chats');
        } catch (error) {
          console.error('[WTL ChatManager] Failed to load data:', error);
          this.isDataLoaded = false;
        }
      }
      this.ui.togglePanel(true);
      this.renderPanel();
      console.log('[WTL ChatManager] Panel opened');
    } else {
      this.ui.togglePanel(false);
      console.log('[WTL ChatManager] Panel closed');
    }
  }

  handleToggleBatch() {
    this.dataService.state.isBatchMode = !this.dataService.state.isBatchMode;
    this.dataService.state.selectedChats.clear();
    this.dataService.state.save();
    this.renderPanel();
  }

  async handleRefresh() {
    this.ui.showLoading();
    this.globalChats = await this.dataService.loadAllChats();
    this.renderPanel();
  }

  async handleSettings() {
    const raw = this.dataService.state.exportState();
    const action = await this.prompt(
      `当前备份数据：\n${raw.substring(0, 200)}...\n\n【输入 1 恢复出厂设置】\n【直接粘贴 JSON 数据点击确认可覆盖】`,
      raw
    );
    
    if (action === '1') {
      if (await this.confirm('彻底清空所有分组和标签？')) {
        this.dataService.state.reset();
        this.renderPanel();
      }
    } else if (action && action !== raw) {
      try {
        JSON.parse(action);
        this.dataService.state.importState(action);
        this.toast('success', '覆盖成功！');
        this.renderPanel();
      } catch (e) {
        this.toast('error', '格式错误！');
      }
    }
  }

  handleViewChange(viewMode) {
    this.dataService.state.viewMode = viewMode;
    this.dataService.state.activeFilter = '全部';
    this.dataService.state.isBatchMode = false;
    this.dataService.state.selectedChats.clear();
    this.dataService.state.save();
    this.renderPanel();
  }

  handleFilter(filter) {
    this.dataService.state.activeFilter = filter;
    this.dataService.state.save();
    this.renderPanel();
  }

  async handleAddItem(type) {
    const name = await this.prompt(`请输入新建${type === 'folder' ? '分组' : '标签'}的名称:`);
    if (name && name.trim()) {
      if (type === 'folder') {
        this.dataService.state.addFolder(name.trim());
      } else {
        this.dataService.state.addTag(name.trim());
      }
      this.renderPanel();
    }
  }

  async handleEditTitle(globalKey) {
    const current = this.dataService.getChatTitle(globalKey);
    const val = await this.prompt('修改自定义标题 (留空恢复原文件名):', current);
    if (val !== null) {
      this.dataService.setChatTitle(globalKey, val);
      this.renderPanel();
    }
  }

  async handleEditSummary(globalKey) {
    const current = this.dataService.getChatSummary(globalKey);
    const val = await this.prompt('添加/修改一句话简介:', current);
    if (val !== null) {
      this.dataService.setChatSummary(globalKey, val);
      this.renderPanel();
    }
  }

  async handleEditFolder(globalKey) {
    const folders = this.dataService.getFolders();
    const current = this.dataService.getChatFolder(globalKey);
    const selected = await this.showOptionPicker({
      title: '聊天分组',
      subtitle: '选择已有分组，或直接创建一个新分组',
      options: folders,
      selectedValue: current === '未分类' ? '' : current,
      createLabel: '新建分组',
      createPlaceholder: '输入新分组名称',
      allowEmpty: true,
      emptyLabel: '未分类',
    });

    if (selected === null) return;

    if (selected && !folders.includes(selected)) {
      this.dataService.state.addFolder(selected);
    }

    this.dataService.setChatFolder(globalKey, selected || '');
    this.renderPanel();
  }

  async handleAddTag(globalKey) {
    const tags = this.dataService.getTags();
    const selected = await this.showOptionPicker({
      title: '聊天标签',
      subtitle: '选择已有标签，或输入一个新标签',
      options: tags,
      selectedValue: '',
      createLabel: '新建标签',
      createPlaceholder: '输入新标签名称',
      allowEmpty: false,
    });

    if (!selected) return;

    if (!tags.includes(selected)) {
      this.dataService.addTag(selected);
    }

    this.dataService.addTagToChat(globalKey, selected);
    this.renderPanel();
  }

  async handleRemoveTag(globalKey, tag) {
    if (await this.confirm(`确定从该对话移除标签 [${tag}] 吗？`)) {
      this.dataService.removeTagFromChat(globalKey, tag);
      this.renderPanel();
    }
  }

  async handlePreview(charId, fileName) {
    const { chatPreviewService } = await import('../services/chatPreviewService.js');
    const newPreviewService = new chatPreviewService.constructor();
    await newPreviewService.show(charId, fileName, {
      onJump: () => {
        this.ui.togglePanel(false);
      }
    });
  }

  async handleTogglePin(globalKey) {
    this.dataService.togglePin(globalKey);
    this.globalChats = await this.dataService.loadAllChats();
    this.renderPanel();
  }

  async handleDeleteChat(charId, fileName, globalKey) {
    try {
      const popupModule = await import('/scripts/popup.js');
      const confirmed = await popupModule.callGenericPopup('Delete the Chat File?', popupModule.POPUP_TYPE.CONFIRM);
      if (!confirmed) return;

      const scriptModule = await import('/script.js');
      const characters = scriptModule.characters || [];
      const characterId = characters.findIndex(x => x.avatar === charId);
      if (characterId === -1) {
        this.toast('error', '未找到对应角色，无法删除聊天');
        return;
      }

      await scriptModule.deleteCharacterChatByName(String(characterId), fileName);
      this.dataService.state.selectedChats.delete(globalKey);
      this.globalChats = await this.dataService.loadAllChats();
      this.toast('success', '聊天已删除');
      this.renderPanel();
    } catch (error) {
      console.error('[WTL ChatManager] Failed to delete chat:', error);
      this.toast('error', '删除失败，请查看控制台日志');
    }
  }

  handleBatchFolder() {
    if (this.dataService.state.selectedChats.size === 0) return;
    
    const folders = this.dataService.getFolders();
    const opts = folders.map((f, i) => `${i}. ${f}`).join('\n');
    const choice = prompt(`将 ${this.dataService.state.selectedChats.size} 个对话移入分组:\n${opts}`);
    
    if (choice !== null && folders[parseInt(choice)]) {
      const target = folders[parseInt(choice)];
      this.dataService.state.selectedChats.forEach(k => {
        this.dataService.state.setChatFolder(k, target);
      });
      this.dataService.state.isBatchMode = false;
      this.dataService.state.selectedChats.clear();
      this.dataService.state.save();
      this.renderPanel();
    }
  }

  handleBatchTagAdd() {
    if (this.dataService.state.selectedChats.size === 0) return;
    
    const t = prompt('为批量对话添加标签:');
    if (t && t.trim()) {
      const tag = t.trim();
      const tags = this.dataService.getTags();
      if (!tags.includes(tag)) {
        this.dataService.addTag(tag);
      }
      this.dataService.state.selectedChats.forEach(k => {
        this.dataService.addTagToChat(k, tag);
      });
      this.dataService.state.isBatchMode = false;
      this.dataService.state.selectedChats.clear();
      this.dataService.state.save();
      this.renderPanel();
    }
  }

  handleBatchTagDel() {
    if (this.dataService.state.selectedChats.size === 0) return;
    
    const t = prompt('为批量对话移除标签:');
    if (t && t.trim()) {
      const tag = t.trim();
      this.dataService.state.selectedChats.forEach(k => {
        this.dataService.removeTagFromChat(k, tag);
      });
      this.dataService.state.isBatchMode = false;
      this.dataService.state.selectedChats.clear();
      this.dataService.state.save();
      this.renderPanel();
    }
  }

  renderPanel() {
    const state = {
      ...this.dataService.state,
      characters: this.dataService.getCharacters(),
      filteredCount: this.globalChats.length
    };
    
    this.ui.renderPanel(this.globalChats, state);
  }

  startObserver() {
    if (this.observer) return;
    
    this.observer = new MutationObserver(() => {
      if (this.observerTimer) clearTimeout(this.observerTimer);
      this.observerTimer = setTimeout(() => {
        const welcomePanel = document.querySelector('.welcomePanel');
        const existingContainer = document.getElementById('wtl-chat-manager-root');
        if (welcomePanel && !existingContainer) {
          this.ui.createContainer().then(container => {
            this.injectContainer(container);
          });
        }
      }, 500);
    });
    
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  setEnabled(enabled) {
    if (enabled) {
      this.ui.createContainer().then(container => {
        this.injectContainer(container);
      });
      this.startObserver();
    } else {
      this.ui.togglePanel(false);
    }
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    
    if (this.observerTimer) {
      clearTimeout(this.observerTimer);
      this.observerTimer = null;
    }
    
    this.ui?.destroy();
    
    this.isDataLoaded = false;
    this.globalChats = [];
  }
}
