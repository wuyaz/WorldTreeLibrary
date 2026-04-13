// @ts-nocheck

import eventBus, { EVENTS } from '../../../core/eventBus.js';
import { ChatManagerUI } from '../ui/chatManagerUI.js';
import { chatPreviewService } from '../services/chatPreviewService.js';

export class ChatUIController {
  constructor(uiRefs, context, defaults, dataService, settingsService, folderService, tagService) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.state = {
      isVisible: true,
      isInitialized: false,
      isLoading: false,
      observerTimer: null,
    };
    
    this.dataService = dataService;
    this.settingsService = settingsService;
    this.folderService = folderService;
    this.tagService = tagService;
    
    this.chatManagerUI = null;
    
    this.initialize();
  }
  
  initialize() {
    this.bindEvents();
  }
  
  bindEvents() {
    eventBus.on(EVENTS.CHAT_DATA_STATE_CHANGED, this.handleDataStateChanged.bind(this));
  }
  
  async injectUI() {
    if (this.chatManagerUI && this.ui.chatManagerContainer?.isConnected) return;

    if (this.chatManagerUI && !this.ui.chatManagerContainer?.isConnected) {
      this.chatManagerUI.destroy();
      this.chatManagerUI = null;
      this.ui.chatManagerContainer = null;
    }

    this.chatManagerUI = new ChatManagerUI({
      dataService: this.dataService,
      callbacks: {}
    });

    const container = await this.chatManagerUI.createContainer();
    
    const maxAttempts = 30;
    const delay = 500;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const selectors = [
        '.welcomePanel .welcomeRecent',
        '.welcomeRecent',
        '#chat .welcomePanel',
        '.welcomePanel',
      ];
      
      let target = null;
      for (const selector of selectors) {
        target = document.querySelector(selector);
        if (target) break;
      }
      
      if (target) {
        target.appendChild(container);
        this.ui.chatManagerContainer = container;
        this.state.isInitialized = true;
        this.bindUIEvents();
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  bindUIEvents() {
    if (!this.chatManagerUI?.rootEl) return;
    
    this.chatManagerUI.rootEl.addEventListener('click', (e) => {
      this.handleAction(e);
    });

    this.chatManagerUI.rootEl.addEventListener('input', (e) => {
      this.handleInput(e);
    });

    this.chatManagerUI.rootEl.addEventListener('change', (e) => {
      this.handleChange(e);
    });
  }

  handleAction(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    
    switch (action) {
      case 'toggle-panel':
        this.handleTogglePanel();
        break;
      case 'toggle-batch':
        this.handleToggleBatch();
        break;
      case 'refresh':
        this.handleRefresh();
        break;
      case 'settings':
        this.handleSettings();
        break;
      case 'view':
        this.handleViewChange(target.dataset.view);
        break;
      case 'filter':
        this.handleFilter(target.dataset.val);
        break;
      case 'add-item':
        this.handleAddItem(target.dataset.type);
        break;
      case 'edit-title':
        e.stopPropagation();
        this.handleEditTitle(target.dataset.key);
        break;
      case 'edit-summary':
        e.stopPropagation();
        this.handleEditSummary(target.dataset.key);
        break;
      case 'edit-folder':
        e.stopPropagation();
        this.handleEditFolder(target.dataset.key);
        break;
      case 'add-tag':
        e.stopPropagation();
        this.handleAddTag(target.dataset.key);
        break;
      case 'remove-tag':
        e.stopPropagation();
        this.handleRemoveTag(target.dataset.key, target.dataset.tag);
        break;
      case 'preview':
        e.stopPropagation();
        this.handlePreview(target.dataset.char, target.dataset.file);
        break;
      case 'toggle-pin':
        e.stopPropagation();
        this.handleTogglePin(target.dataset.key);
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
    const target = e.target.closest('[data-action="search"]');
    if (!target) return;

    if (this.state.observerTimer) clearTimeout(this.state.observerTimer);
    const val = target.value;
    this.state.observerTimer = setTimeout(() => {
      this.handleSearch(val);
    }, 300);
  }

  handleChange(e) {
    const target = e.target.closest('.wtl-chat-manager-checkbox');
    if (!target) return;

    const card = target.closest('.wtl-chat-manager-card');
    if (card) {
      this.handleCardSelect(card.dataset.key, target.checked);
    }
  }

  async handleTogglePanel() {
    const isOpen = this.chatManagerUI.togglePanel();
    
    if (isOpen && !this.dataService.isDataLoaded) {
      this.chatManagerUI.showLoading();
      await this.dataService.loadAllChats();
      this.dataService.isDataLoaded = true;
    }
    
    this.renderPanel();
  }

  handleToggleBatch() {
    this.dataService.state.isBatchMode = !this.dataService.state.isBatchMode;
    this.dataService.state.selectedChats.clear();
    this.dataService.state.save();
    this.renderPanel();
  }

  async handleRefresh() {
    this.chatManagerUI.showLoading();
    await this.dataService.loadAllChats();
    this.renderPanel();
  }

  handleSettings() {
    const raw = this.dataService.state.exportState();
    const action = window.parent.prompt(
      `当前备份数据：\n${raw.substring(0, 200)}...\n\n【输入 1 恢复出厂设置】\n【直接粘贴 JSON 数据点击确认可覆盖】`,
      raw
    );
    
    if (action === '1') {
      if (window.parent.confirm('彻底清空所有分组和标签？')) {
        this.dataService.state.reset();
        this.renderPanel();
      }
    } else if (action && action !== raw) {
      try {
        JSON.parse(action);
        this.dataService.state.importState(action);
        window.parent.toastr?.success?.('覆盖成功！');
        this.renderPanel();
      } catch (e) {
        window.parent.toastr?.error?.('格式错误！');
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

  handleAddItem(type) {
    const name = window.parent.prompt(`请输入新建${type === 'folder' ? '分组' : '标签'}的名称:`);
    if (name && name.trim()) {
      const cleanName = name.trim();
      if (type === 'folder' && !this.dataService.state.folders.includes(cleanName)) {
        this.dataService.state.folders.push(cleanName);
      }
      if (type === 'tag' && !this.dataService.state.tags.includes(cleanName)) {
        this.dataService.state.tags.push(cleanName);
      }
      this.dataService.state.save();
      this.renderPanel();
    }
  }

  handleSearch(val) {
    this.dataService.state.searchQuery = val;
    this.dataService.state.save();
    this.renderPanel();
  }

  handleEditTitle(globalKey) {
    const current = this.dataService.getChatTitle(globalKey);
    const val = window.parent.prompt('修改自定义标题 (留空恢复原文件名):', current);
    if (val !== null) {
      this.dataService.setChatTitle(globalKey, val);
      this.renderPanel();
    }
  }

  handleEditSummary(globalKey) {
    const current = this.dataService.getChatSummary(globalKey);
    const val = window.parent.prompt('添加/修改一句话简介:', current);
    if (val !== null) {
      this.dataService.setChatSummary(globalKey, val);
      this.renderPanel();
    }
  }

  handleEditFolder(globalKey) {
    const folders = this.dataService.getFolders();
    const opts = folders.map((f, i) => `${i}. ${f}`).join('\n');
    const choice = window.parent.prompt(`为该对话选择分组:\n${opts}`, '0');
    if (choice !== null && folders[parseInt(choice)]) {
      this.dataService.setChatFolder(globalKey, folders[parseInt(choice)]);
      this.renderPanel();
    }
  }

  handleAddTag(globalKey) {
    const tags = this.dataService.getTags();
    const available = tags.join(', ');
    const input = window.parent.prompt(`可用标签: ${available}\n输入要添加的标签(支持新标签):`);
    if (input && input.trim()) {
      const t = input.trim();
      if (!tags.includes(t)) {
        this.dataService.addTag(t);
      }
      this.dataService.addTagToChat(globalKey, t);
      this.renderPanel();
    }
  }

  handleRemoveTag(globalKey, tag) {
    if (window.parent.confirm(`确定从该对话移除标签 [${tag}] 吗？`)) {
      this.dataService.removeTagFromChat(globalKey, tag);
      this.renderPanel();
    }
  }

  async handlePreview(charId, fileName) {
    const newPreviewService = new chatPreviewService.constructor();
    await newPreviewService.show(charId, fileName, {
      onJump: () => {
        this.chatManagerUI.togglePanel(false);
      }
    });
  }

  async handleTogglePin(globalKey) {
    this.dataService.togglePin(globalKey);
    await this.dataService.loadAllChats();
    this.renderPanel();
  }

  handleCardSelect(globalKey, checked) {
    if (checked) {
      this.dataService.state.selectedChats.add(globalKey);
    } else {
      this.dataService.state.selectedChats.delete(globalKey);
    }
    this.renderPanel();
  }

  handleBatchFolder() {
    if (this.dataService.state.selectedChats.size === 0) return;
    const folders = this.dataService.getFolders();
    const opts = folders.map((f, i) => `${i}. ${f}`).join('\n');
    const choice = window.parent.prompt(`将 ${this.dataService.state.selectedChats.size} 个对话移入分组:\n${opts}`);
    
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
    const t = window.parent.prompt('为批量对话添加标签:');
    
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
    const t = window.parent.prompt('为批量对话移除标签:');
    
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
    if (!this.chatManagerUI || !this.dataService) return;
    
    const globalChats = this.dataService.chats || [];
    const State = {
      ...this.dataService.state,
      globalChats: globalChats,
      characters: this.dataService.getCharacters(),
      filteredCount: globalChats.length
    };
    
    this.chatManagerUI.renderPanel(globalChats, State);
  }

  async removeUI() {
    if (this.chatManagerUI) {
      this.chatManagerUI.destroy();
      this.chatManagerUI = null;
      this.ui.chatManagerContainer = null;
      this.state.isInitialized = false;
    }
  }

  show() {
    this.state.isVisible = true;
    localStorage.setItem('wtl.chatManager.visible', 'true');
    if (this.ui.chatManagerContainer) {
      this.ui.chatManagerContainer.style.display = 'block';
    }
    eventBus.emit(EVENTS.CHAT_MANAGER_SHOWN);
  }
  
  hide() {
    this.state.isVisible = false;
    localStorage.setItem('wtl.chatManager.visible', 'false');
    if (this.ui.chatManagerContainer) {
      this.ui.chatManagerContainer.style.display = 'none';
    }
    eventBus.emit(EVENTS.CHAT_MANAGER_HIDDEN);
  }

  handleDataStateChanged(data) {
    this.renderPanel();
  }
  
  destroy() {
    eventBus.off(EVENTS.CHAT_DATA_STATE_CHANGED, this.handleDataStateChanged.bind(this));
    this.removeUI();
  }
}
