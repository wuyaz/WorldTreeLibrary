// @ts-nocheck

import eventBus, { EVENTS } from '../../../core/eventBus.js';
import { ChatDataService } from '../data/chatData.js';
import { ChatManagerUI } from '../ui/chatManagerUI.js';
import { ChatManagerSettings, MORANDI_COLORS } from '../data/chatManagerSettings.js';
import { ChatSettingsUI } from '../ui/chatSettingsUI.js';
import { ChatPreviewUI } from '../ui/chatPreviewUI.js';

export class ChatManagerController {
  constructor(options = {}) {
    this.options = options;
    this.uiRefs = {};
    
    this.dataService = new ChatDataService();
    this.settings = new ChatManagerSettings();
    this.ui = null;
    
    this.observer = null;
    this.observerTimer = null;
    this.settingsPopup = null;
    this.settingsPanel = null;
    this.settingsUI = null;
    this.settingsPanelClickHandler = null;
    this.settingsPanelChangeHandler = null;
    this.settingsSections = {
      folder: false,
      tag: false,
    };
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

  moveArrayItem(arr, from, to) {
    if (!Array.isArray(arr)) return;
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
  }

  clampNumber(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  getPresetColorButtons(type, value, selectedColor = '') {
    return MORANDI_COLORS.map(color => `
      <button
        type="button"
        class="wtl-chat-settings-swatch ${selectedColor === color ? 'is-active' : ''}"
        data-settings-action="pick-preset-color"
        data-type="${type}"
        data-value="${this.escapeHtml(value)}"
        data-color="${color}"
        style="--wtl-swatch:${color};"
        title="${color}"
      ></button>
    `).join('');
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
            class="wtl-picker-option ${isSelected ? 'is-selected' : ''}"
            data-value="${this.escapeHtml(option)}"
            style="display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--SmartThemeBorderColor);background:${isSelected ? 'var(--SmartThemeUnderlineColor)' : 'rgba(255,255,255,0.06)'};color:var(--SmartThemeBodyColor);cursor:pointer;white-space:nowrap;font-size:13px;"
          >${this.escapeHtml(option)}</button>
        `;
      }).join('');

      container.innerHTML = `
        <div class="wtl-picker-wrap" style="display:flex;flex-direction:column;gap:10px;min-width:320px;">
          <div style="font-size:12px;opacity:0.75;">${this.escapeHtml(subtitle || '')}</div>
          <div class="wtl-picker-options" style="display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow:auto;">${allowEmpty ? `<button type="button" class="wtl-picker-empty ${selectedValue ? '' : 'is-selected'}" data-empty="1" style="display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--SmartThemeBorderColor);background:${selectedValue ? 'rgba(255,255,255,0.06)' : 'var(--SmartThemeUnderlineColor)'};color:var(--SmartThemeBodyColor);cursor:pointer;white-space:nowrap;font-size:13px;">${this.escapeHtml(emptyLabel)}</button>` : ''}${optionHtml}</div>
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

          const setSelectedVisual = (button, selected) => {
            if (!button) return;
            button.classList.toggle('is-selected', selected);
            button.style.background = selected ? 'var(--SmartThemeUnderlineColor)' : 'rgba(255,255,255,0.06)';
          };

          const clearSelectedButtons = () => {
            optionButtons.forEach(btn => setSelectedVisual(btn, false));
            setSelectedVisual(emptyButton, false);
          };

          optionButtons.forEach(button => {
            button.addEventListener('click', () => {
              clearSelectedButtons();
              setSelectedVisual(button, true);
              resolvedValue = button.dataset.value || '';
              if (input) input.value = '';
            });
          });

          if (emptyButton) {
            emptyButton.addEventListener('click', () => {
              clearSelectedButtons();
              setSelectedVisual(emptyButton, true);
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
          } else if (!selectedValue && !allowEmpty) {
            resolvedValue = '';
          }
        },
        onClosing: () => {
          const input = container.querySelector('.wtl-picker-input');
          const customValue = input?.value?.trim?.() || '';
          if (customValue) {
            resolvedValue = customValue;
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

  async showMultiOptionPicker({
    subtitle,
    options,
    selectedValues = [],
    createLabel,
    createPlaceholder,
  }) {
    try {
      const popupModule = await import('/scripts/popup.js');
      const Popup = window.Popup || popupModule.Popup;

      const container = document.createElement('div');
      const selectedSet = new Set((selectedValues || []).map(value => String(value)));

      container.innerHTML = `
        <div class="wtl-picker-wrap" style="display:flex;flex-direction:column;gap:10px;min-width:340px;">
          <div style="font-size:12px;opacity:0.75;">${this.escapeHtml(subtitle || '')}</div>
          <div class="wtl-picker-options" style="display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow:auto;">
            ${options.map(option => {
              const selected = selectedSet.has(option);
              return `<button type="button" class="wtl-picker-option ${selected ? 'is-selected' : ''}" data-value="${this.escapeHtml(option)}" style="display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--SmartThemeBorderColor);background:${selected ? 'var(--SmartThemeUnderlineColor)' : 'rgba(255,255,255,0.06)'};color:var(--SmartThemeBodyColor);cursor:pointer;white-space:nowrap;font-size:13px;">${this.escapeHtml(option)}</button>`;
            }).join('')}
          </div>
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:12px;opacity:0.8;">${this.escapeHtml(createLabel)}</span>
            <input class="text_pole wtl-picker-input" type="text" placeholder="${this.escapeHtml(createPlaceholder)}" value="" />
          </label>
        </div>
      `;

      const popup = new Popup(container, popupModule.POPUP_TYPE.CONFIRM, '', {
        okButton: '应用',
        cancelButton: '取消',
        wide: false,
        large: false,
        allowVerticalScrolling: true,
        onOpen: () => {
          const optionButtons = Array.from(container.querySelectorAll('.wtl-picker-option'));
          optionButtons.forEach(button => {
            button.addEventListener('click', () => {
              const value = button.dataset.value || '';
              if (!value) return;
              if (selectedSet.has(value)) {
                selectedSet.delete(value);
                button.classList.remove('is-selected');
                button.style.background = 'rgba(255,255,255,0.06)';
              } else {
                selectedSet.add(value);
                button.classList.add('is-selected');
                button.style.background = 'var(--SmartThemeUnderlineColor)';
              }
            });
          });
        },
      });

      const result = await popup.show();
      if (!(result === 1 || result === popupModule.POPUP_RESULT.AFFIRMATIVE)) {
        return null;
      }

      const customValue = String(container.querySelector('.wtl-picker-input')?.value || '');
      customValue.split(',').map(part => part.trim()).filter(Boolean).forEach(value => selectedSet.add(value));
      return Array.from(selectedSet);
    } catch (error) {
      console.warn('[WTL ChatManager] showMultiOptionPicker failed:', error);
      return null;
    }
  }

  sortTagsBySettings(tags = []) {
    const order = this.settings.tags || [];
    return [...new Set(tags)].sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (safeA !== safeB) return safeA - safeB;
      return String(a).localeCompare(String(b), 'zh-CN');
    });
  }

  getItemColorStyle(type, value) {
    const color = type === 'folder'
      ? this.settings.getFolderColor(value)
      : this.settings.getTagColor(value);
    return color
      ? `style="--wtl-accent:${color};--wtl-accent-bg:${color}22;--wtl-accent-border:${color}66;"`
      : '';
  }

  syncColorsToState() {
    this.dataService.state.folderColors = { ...this.settings.folderColors };
    this.dataService.state.tagColors = { ...this.settings.tagColors };
    this.dataService.state.save();
  }

  async initialize() {
    this.dataService.state.load();
    await this.settings.load();
    
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
      case 'page':
        this.handlePageChange(actionEl.dataset.page);
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
      case 'toggle-favorite':
        e.stopPropagation();
        await this.handleToggleFavorite(actionEl.dataset.key);
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

    if (target.matches('[data-settings-input="pageSize"]')) {
      const value = Math.max(5, Math.min(100, Number(target.value) || this.settings.pageSize));
      target.value = value;
    }

    if (target.matches('[data-settings-input="previewLines"]')) {
      const value = Math.max(1, Math.min(6, Number(target.value) || this.settings.previewLines));
      target.value = value;
    }

    if (target.matches('[data-settings-input="previewLayers"]')) {
      const value = Math.max(1, Math.min(12, Number(target.value) || this.settings.previewLayers));
      target.value = value;
    }

    if (target.matches('[data-settings-input="folderColor"]')) {
      this.settings.setFolderColor(target.dataset.value, target.value);
      this.syncColorsToState();
      this.renderSettingsPanel();
      this.renderPanel();
    }

    if (target.matches('[data-settings-input="tagColor"]')) {
      this.settings.setTagColor(target.dataset.value, target.value);
      this.syncColorsToState();
      this.renderSettingsPanel();
      this.renderPanel();
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
    await this.openGraphicalSettings();
  }

  async openGraphicalSettings() {
    await this.settings.load();
    const popupModule = await import('/scripts/popup.js');
    const Popup = window.Popup || popupModule.Popup;

    this.settingsUI = new ChatSettingsUI({
      settings: this.settings,
      callbacks: {
        folderSectionOpen: this.settingsSections.folder,
        tagSectionOpen: this.settingsSections.tag,
      },
    });

    this.settingsPanel = document.createElement('div');
    this.settingsPanel.className = 'wtl-chat-settings-panel';
    this.settingsPanel.innerHTML = this.settingsUI.render(this.settings);

    const popup = new Popup(this.settingsPanel, popupModule.POPUP_TYPE.CONFIRM, '', {
      okButton: '保存设置',
      cancelButton: '关闭',
      wide: true,
      large: false,
      allowVerticalScrolling: true,
      onOpen: () => {
        this.bindSettingsPanelEvents();
      },
    });

    this.settingsPopup = popup;
    const result = await popup.show();
    if (result === 1 || result === popupModule.POPUP_RESULT?.AFFIRMATIVE) {
      const pageSize = Number(this.getSettingsInputValue('pageSize')) || this.settings.pageSize;
      const previewLines = Number(this.getSettingsInputValue('previewLines')) || this.settings.previewLines;
      const previewLayers = Number(this.getSettingsInputValue('previewLayers')) || this.settings.previewLayers;
      const defaultView = this.getSettingsInputValue('defaultView') || this.settings.defaultView;
      
      this.handleSaveSettings({ pageSize, previewLines, previewLayers, defaultView });
    }
    
    this.settingsPanel = null;
    this.settingsPopup = null;
    this.settingsUI = null;
  }

  renderSettingsPanel() {
    if (!this.settingsPanel || !this.settingsUI) return;
    this.settingsUI.callbacks = {
      folderSectionOpen: this.settingsSections.folder,
      tagSectionOpen: this.settingsSections.tag,
    };
    this.settingsPanel.innerHTML = this.settingsUI.render(this.settings);
  }

  bindSettingsPanelEvents() {
    if (!this.settingsPanel) return;

    if (this.settingsPanelClickHandler) {
      this.settingsPanel.removeEventListener('click', this.settingsPanelClickHandler);
    }
    if (this.settingsPanelChangeHandler) {
      this.settingsPanel.removeEventListener('change', this.settingsPanelChangeHandler);
    }

    this.settingsPanelClickHandler = async (event) => {
      const viewBtn = event.target.closest('.wtl-chat-settings-view-btn');
      if (viewBtn) {
        const container = viewBtn.closest('.wtl-chat-settings-view-toggle');
        if (container) {
          container.querySelectorAll('.wtl-chat-settings-view-btn').forEach(btn => {
            btn.classList.remove('is-active');
          });
          viewBtn.classList.add('is-active');
        }
        return;
      }
      
      const presetBtn = event.target.closest('.wtl-chat-settings-preset-btn');
      if (presetBtn) {
        if (presetBtn.dataset.settingsAction === 'add-preset') {
          const type = presetBtn.dataset.type;
          await this.handleAddPreset(type);
          return;
        }
        
        const container = presetBtn.closest('.wtl-chat-settings-preset-buttons');
        if (container) {
          container.querySelectorAll('.wtl-chat-settings-preset-btn').forEach(btn => {
            btn.classList.remove('is-active');
          });
          presetBtn.classList.add('is-active');
          
          const presetName = presetBtn.dataset.preset;
          const isDefault = presetName === '默认';
          
          const section = container.closest('.wtl-chat-settings-section');
          const saveBtn = section?.querySelector('[data-settings-action="save-preset"]');
          const deleteBtn = section?.querySelector('[data-settings-action="delete-preset"]');
          
          if (saveBtn) saveBtn.disabled = isDefault;
          if (deleteBtn) deleteBtn.disabled = isDefault;
          
          if (!isDefault) {
            this.handleLoadPreset(container.closest('.wtl-chat-settings-section')?.dataset.type);
          } else {
            this.handleLoadDefaultPreset(container.closest('.wtl-chat-settings-section')?.dataset.type);
          }
        }
        return;
      }
      
      const actionEl = event.target.closest('[data-settings-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.settingsAction;
      switch (action) {
        case 'toggle-section':
          this.toggleSettingsSection(actionEl.dataset.type);
          break;
        case 'reset':
          this.handleResetSettings();
          break;
        case 'add-item':
          this.handleSettingsAddItem(actionEl.dataset.type);
          break;
        case 'color-prev':
          this.handleColorPrev(actionEl.dataset.type, actionEl.dataset.value);
          break;
        case 'color-next':
          this.handleColorNext(actionEl.dataset.type, actionEl.dataset.value);
          break;
        case 'color-prev-create':
          this.handleColorPrevCreate(actionEl.dataset.type);
          break;
        case 'color-next-create':
          this.handleColorNextCreate(actionEl.dataset.type);
          break;
        case 'remove-item':
          await this.handleSettingsRemoveItem(actionEl.dataset.type, actionEl.dataset.value);
          break;
        case 'move-item':
          this.handleSettingsMoveItem(actionEl.dataset.type, actionEl.dataset.value, actionEl.dataset.direction);
          break;
        case 'save-preset':
          this.handleSavePreset(actionEl.dataset.type);
          break;
        case 'delete-preset':
          this.handleDeletePreset(actionEl.dataset.type);
          break;
      }
    };

    this.settingsPanelChangeHandler = (event) => {
      this.handleChange({ target: event.target });
    };

    this.settingsPanel.addEventListener('click', this.settingsPanelClickHandler);
    this.settingsPanel.addEventListener('change', this.settingsPanelChangeHandler);
  }



  toggleSettingsSection(type) {
    this.settingsSections[type] = !this.settingsSections[type];
    this.renderSettingsPanel();
  }

  handleColorPrev(type, value) {
    const slider = this.settingsPanel?.querySelector(`.wtl-chat-settings-color-slider[data-type="${type}"][data-value="${value}"]`);
    if (!slider) return;
    
    let currentIndex = parseInt(slider.dataset.currentIndex) || 0;
    currentIndex = (currentIndex - 1 + MORANDI_COLORS.length) % MORANDI_COLORS.length;
    const newColor = MORANDI_COLORS[currentIndex];
    
    slider.dataset.currentIndex = currentIndex;
    const display = slider.querySelector('.wtl-chat-settings-color-display');
    if (display) display.style.backgroundColor = newColor;
    
    if (type === 'folder') {
      this.settings.setFolderColor(value, newColor);
    } else {
      this.settings.setTagColor(value, newColor);
    }
    
    this.syncColorsToState();
    this.renderPanel();
  }

  handleColorNext(type, value) {
    const slider = this.settingsPanel?.querySelector(`.wtl-chat-settings-color-slider[data-type="${type}"][data-value="${value}"]`);
    if (!slider) return;
    
    let currentIndex = parseInt(slider.dataset.currentIndex) || 0;
    currentIndex = (currentIndex + 1) % MORANDI_COLORS.length;
    const newColor = MORANDI_COLORS[currentIndex];
    
    slider.dataset.currentIndex = currentIndex;
    const display = slider.querySelector('.wtl-chat-settings-color-display');
    if (display) display.style.backgroundColor = newColor;
    
    if (type === 'folder') {
      this.settings.setFolderColor(value, newColor);
    } else {
      this.settings.setTagColor(value, newColor);
    }
    
    this.syncColorsToState();
    this.renderPanel();
  }

  handleColorPrevCreate(type) {
    const slider = this.settingsPanel?.querySelector(`.wtl-chat-settings-color-slider.is-create[data-type="${type}"]`);
    if (!slider) return;
    
    let currentIndex = parseInt(slider.dataset.currentIndex) || 0;
    currentIndex = (currentIndex - 1 + MORANDI_COLORS.length) % MORANDI_COLORS.length;
    const newColor = MORANDI_COLORS[currentIndex];
    
    slider.dataset.currentIndex = currentIndex;
    const display = slider.querySelector('.wtl-chat-settings-color-display');
    if (display) display.style.backgroundColor = newColor;
  }

  handleColorNextCreate(type) {
    const slider = this.settingsPanel?.querySelector(`.wtl-chat-settings-color-slider.is-create[data-type="${type}"]`);
    if (!slider) return;
    
    let currentIndex = parseInt(slider.dataset.currentIndex) || 0;
    currentIndex = (currentIndex + 1) % MORANDI_COLORS.length;
    const newColor = MORANDI_COLORS[currentIndex];
    
    slider.dataset.currentIndex = currentIndex;
    const display = slider.querySelector('.wtl-chat-settings-color-display');
    if (display) display.style.backgroundColor = newColor;
  }

  openNativeColorPicker(actionEl) {
    const wrapper = actionEl.closest('.wtl-chat-settings-color-picker');
    wrapper?.querySelector('.wtl-chat-settings-color-native')?.click();
  }

  openNativeCreateColorPicker(actionEl) {
    const wrapper = actionEl.closest('.wtl-chat-settings-color-picker');
    wrapper?.querySelector('.wtl-chat-settings-color-native')?.click();
  }

  handlePresetColorPick(type, value, color) {
    if (type === 'folder-create') {
      const input = this.settingsPanel?.querySelector('[data-settings-input="folderCreateColor"]');
      if (input) input.value = color;
      this.renderSettingsPanel();
      return;
    }

    if (type === 'tag-create') {
      const input = this.settingsPanel?.querySelector('[data-settings-input="tagCreateColor"]');
      if (input) input.value = color;
      this.renderSettingsPanel();
      return;
    }

    if (type === 'folder') {
      this.settings.setFolderColor(value, color);
    } else if (type === 'tag') {
      this.settings.setTagColor(value, color);
    }

    this.syncColorsToState();
    this.renderSettingsPanel();
    this.renderPanel();
  }

  syncSettingsToState() {
    this.dataService.state.folders = [...this.settings.folders];
    this.dataService.state.tags = [...this.settings.tags];
    this.dataService.state.folderColors = { ...this.settings.folderColors };
    this.dataService.state.tagColors = { ...this.settings.tagColors };
    this.dataService.state.setItemsPerPage(this.settings.pageSize);

    Object.keys(this.dataService.state.chatFolder).forEach((key) => {
      if (!this.settings.folders.includes(this.dataService.state.chatFolder[key])) {
        delete this.dataService.state.chatFolder[key];
      }
    });

    Object.keys(this.dataService.state.chatTags).forEach((key) => {
      const nextTags = this.sortTagsBySettings((this.dataService.state.chatTags[key] || []).filter(tag => this.settings.tags.includes(tag)));
      if (nextTags.length > 0) {
        this.dataService.state.chatTags[key] = nextTags;
      } else {
        delete this.dataService.state.chatTags[key];
      }
    });

    this.dataService.state.save();
  }

  getSettingsInputValue(key) {
    const input = this.settingsPanel?.querySelector(`[data-settings-input="${key}"]`);
    if (!input) return '';
    
    if (input.classList.contains('wtl-chat-settings-view-toggle') || 
        input.classList.contains('wtl-chat-settings-preset-buttons')) {
      const activeBtn = input.querySelector('.is-active');
      return activeBtn?.dataset?.value || activeBtn?.dataset?.preset || '';
    }
    
    if (input.classList.contains('wtl-chat-settings-color-slider')) {
      const currentIndex = parseInt(input.dataset.currentIndex) || 0;
      return MORANDI_COLORS[currentIndex];
    }
    
    return input?.value ?? '';
  }

  handleSaveSettings(values) {
    const pageSize = values?.pageSize ?? this.settings.pageSize;
    const previewLines = values?.previewLines ?? this.settings.previewLines;
    const previewLayers = values?.previewLayers ?? this.settings.previewLayers;
    const defaultView = values?.defaultView ?? this.settings.defaultView;
    
    this.settings.updateDisplaySettings({
      pageSize,
      previewLines,
      previewLayers,
      defaultView,
    });
    
    this.syncSettingsToState();
    this.syncColorsToState();
    this.toast('success', '聊天管理设置已保存');
    this.renderPanel();
  }

  async handleResetSettings() {
    await this.settings.reset();
    this.syncSettingsToState();
    this.syncColorsToState();
    this.renderSettingsPanel();
    this.renderPanel();
    this.toast('info', '已恢复默认设置');
  }

  handleSettingsAddItem(type) {
    const inputKey = type === 'folder' ? 'folderName' : 'tagName';
    const value = String(this.getSettingsInputValue(inputKey)).trim();
    
    const slider = this.settingsPanel?.querySelector(`.wtl-chat-settings-color-slider.is-create[data-type="${type}"]`);
    const currentIndex = parseInt(slider?.dataset.currentIndex) || 0;
    const color = MORANDI_COLORS[currentIndex];
    
    if (!value) return;

    const added = type === 'folder'
      ? this.settings.addFolder(value, color)
      : this.settings.addTag(value, color);

    if (!added) {
      this.toast('warning', `${type === 'folder' ? '分组' : '标签'}已存在或名称无效`);
      return;
    }

    this.syncSettingsToState();
    this.syncColorsToState();
    this.renderSettingsPanel();
  }

  handleSettingsClearColor(type, value) {
    if (type === 'folder') {
      this.settings.clearFolderColor(value);
    } else {
      this.settings.clearTagColor(value);
    }
    this.syncColorsToState();
    this.renderSettingsPanel();
    this.renderPanel();
  }

  async handleSettingsRemoveItem(type, value) {
    const label = type === 'folder' ? '分组' : '标签';
    const confirmed = await this.confirm(`确定删除${label} [${value}] 吗？`);
    if (!confirmed) return;

    if (type === 'folder') {
      this.settings.removeFolder(value);
      this.dataService.state.removeFolder(value);
    } else {
      this.settings.removeTag(value);
      this.dataService.state.removeTag(value);
    }

    this.syncSettingsToState();
    this.syncColorsToState();
    this.renderSettingsPanel();
    this.renderPanel();
  }

  handleSettingsMoveItem(type, value, direction) {
    const moved = type === 'folder'
      ? this.settings.moveFolder(value, direction)
      : this.settings.moveTag(value, direction);

    if (!moved) return;

    this.syncSettingsToState();
    this.syncColorsToState();
    this.renderSettingsPanel();
    this.renderPanel();
  }

  async handleAddPreset(type) {
    const presetName = await this.prompt('请输入预设名称:');
    if (!presetName || !presetName.trim()) return;

    const trimmedName = presetName.trim();
    if (trimmedName === '默认') {
      this.toast('warning', '不能使用"默认"作为预设名称');
      return;
    }

    if (this.settings.saveCurrentAsPreset(type, trimmedName)) {
      this.renderSettingsPanel();
      this.toast('success', `预设已保存: ${trimmedName}`);
    } else {
      this.toast('error', '保存预设失败');
    }
  }

  handleLoadPreset(type) {
    const presetName = this.getSettingsInputValue(`${type}Preset`);
    if (!presetName || presetName === '默认') {
      return;
    }

    if (this.settings.loadPreset(type, presetName)) {
      this.syncSettingsToState();
      this.syncColorsToState();
      this.renderSettingsPanel();
      this.renderPanel();
      this.toast('success', `已加载预设: ${presetName}`);
    } else {
      this.toast('error', '加载预设失败');
    }
  }

  async handleSavePreset(type) {
    const presetName = await this.prompt('请输入预设名称:', this.getSettingsInputValue(`${type}Preset`) || '');
    if (!presetName || !presetName.trim()) return;

    if (this.settings.saveCurrentAsPreset(type, presetName.trim())) {
      this.renderSettingsPanel();
      this.toast('success', `预设已保存: ${presetName.trim()}`);
    } else {
      this.toast('error', '保存预设失败');
    }
  }

  async handleDeletePreset(type) {
    const presetName = this.getSettingsInputValue(`${type}Preset`);
    if (!presetName || presetName === '默认') {
      this.toast('warning', '无法删除默认预设');
      return;
    }

    if (await this.confirm(`确定删除预设 [${presetName}] 吗？`)) {
      if (this.settings.deletePreset(type, presetName)) {
        this.renderSettingsPanel();
        this.toast('success', `预设已删除: ${presetName}`);
      } else {
        this.toast('error', '删除预设失败');
      }
    }
  }

  async handleLoadDefaultPreset(type) {
    if (await this.confirm('确定加载默认预设吗？当前设置将被覆盖。')) {
      if (await this.settings.loadDefaultPreset(type)) {
        this.syncSettingsToState();
        this.syncColorsToState();
        this.renderSettingsPanel();
        this.renderPanel();
        this.toast('success', '已加载默认预设');
      } else {
        this.toast('error', '加载默认预设失败');
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
    this.dataService.state.currentPage = 1;
    this.dataService.state.save();
    this.renderPanel();
  }

  getPaginationState() {
    const pageSize = Math.max(5, Math.min(100, Number(this.dataService.state.itemsPerPage || this.settings.pageSize || 20)));
    const filteredCount = this.getFilteredChats().length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const currentPage = Math.max(1, Math.min(totalPages, Number(this.dataService.state.currentPage || 1)));
    return { pageSize, filteredCount, totalPages, currentPage };
  }

  handlePageChange(direction) {
    const { totalPages, currentPage } = this.getPaginationState();
    const nextPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    this.dataService.state.currentPage = Math.max(1, Math.min(totalPages, nextPage));
    this.dataService.state.save();
    this.renderPanel();
  }

  getFilteredChats() {
    const state = this.dataService.state;
    const searchLower = state.searchQuery?.toLowerCase() || '';

    return this.globalChats.filter(chat => {
      const key = chat.globalKey;
      const folder = state.chatFolder[key] || '未分类';
      const tags = state.chatTags[key] || [];
      const summary = state.chatSummary[key] || '';
      const customTitle = state.chatTitleOverride[key] || chat.fileName.replace(/\.jsonl$/i, '');

      if (state.activeFilter !== '全部') {
        if (state.viewMode === 'folder' && folder !== state.activeFilter) return false;
        if (state.viewMode === 'tag' && !tags.includes(state.activeFilter)) return false;
        if (state.viewMode === 'character' && chat.character !== state.activeFilter) return false;
      }

      if (state.viewMode === 'favorite' && !state.favoriteChats.includes(key)) return false;

      if (searchLower && !(`${customTitle} ${summary} ${chat.character}`.toLowerCase().includes(searchLower))) {
        return false;
      }

      return true;
    });
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
    const selected = await this.showMultiOptionPicker({
      subtitle: '可多选已有标签，也可用逗号输入多个新标签',
      options: tags,
      createLabel: '新建标签',
      createPlaceholder: '输入新标签名称，多个请用逗号分隔',
    });

    if (!selected || selected.length === 0) return;

    selected.forEach((tag) => {
      if (!tags.includes(tag)) {
        this.dataService.addTag(tag);
      }
      this.dataService.addTagToChat(globalKey, tag);
    });

    this.dataService.state.chatTags[globalKey] = this.sortTagsBySettings(this.dataService.state.chatTags[globalKey] || []);
    this.dataService.state.save();
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
    this.previewUI = new ChatPreviewUI();
    
    await newPreviewService.show(charId, fileName, {
      onMessagesReady: (container, messagesData) => {
        container.innerHTML = this.previewUI.renderMessages(messagesData, charId);
        this.previewUI.bindMessageEvents(container);
      },
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

  async handleToggleFavorite(globalKey) {
    this.dataService.toggleFavorite(globalKey);
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
    const filteredChats = this.getFilteredChats();
    const pagination = this.getPaginationState();
    const state = {
      ...this.dataService.state,
      previewLines: this.settings.previewLines,
      pageSize: this.settings.pageSize,
      defaultView: this.settings.defaultView,
      folderColors: { ...this.settings.folderColors },
      tagColors: { ...this.settings.tagColors },
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      characters: this.dataService.getCharacters(),
      filteredCount: filteredChats.length
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

    this.settingsPanel = null;
    this.settingsPopup = null;
    
    this.ui?.destroy();
    
    this.isDataLoaded = false;
    this.globalChats = [];
  }
}
