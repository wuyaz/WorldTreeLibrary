// @ts-nocheck

import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class ChatSettingsController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    this.settings = null;
    this.state = null;
    this.modal = null;
  }

  initialize(settings, state) {
    this.settings = settings;
    this.state = state;
    this.settings.load();
    this.state.load();
  }

  openSettingsModal() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      return;
    }

    this.modal = document.createElement('div');
    this.modal.id = 'wtl-chat-settings-modal';
    this.modal.style.cssText = `
      display: flex;
      position: fixed;
      inset: 0;
      z-index: 40000;
      background: color-mix(in srgb, var(--SmartThemeBgColor) 56%, transparent);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      padding: 16px;
    `;

    this.modal.innerHTML = `
      <div style="width: min(640px, 96vw); max-height: 86vh; overflow: auto; border: 1px solid var(--SmartThemeBorderColor); border-radius: 16px; background: var(--SmartThemeBlurTintColor); box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--SmartThemeBorderColor);">
          <strong style="color: var(--SmartThemeBodyColor);">聊天管理器设置</strong>
          <button type="button" id="wtl-chat-settings-close" class="menu_button"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="wtl-chat-settings-content" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
          ${this.renderSettingsContent()}
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.modal.style.display = 'none';
      }
    });

    const closeBtn = this.modal.querySelector('#wtl-chat-settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.modal.style.display = 'none';
      });
    }

    this.bindSettingsEvents();
  }

  renderSettingsContent() {
    return `
      <div class="wtl-settings-section">
        <h3 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); font-size: 1.1em;">显示设置</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span style="color: var(--SmartThemeBodyColor);">每页显示数量</span>
            <input type="number" id="wtl-settings-page-size" value="${this.settings.pageSize}" min="5" max="100" step="5" style="width: 80px; padding: 6px 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px; background: var(--SmartThemeBlurTintColor); color: var(--SmartThemeBodyColor);">
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span style="color: var(--SmartThemeBodyColor);">默认视图</span>
            <select id="wtl-settings-default-view" style="padding: 6px 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px; background: var(--SmartThemeBlurTintColor); color: var(--SmartThemeBodyColor);">
              <option value="time" ${this.settings.defaultView === 'time' ? 'selected' : ''}>按时间</option>
              <option value="character" ${this.settings.defaultView === 'character' ? 'selected' : ''}>按角色</option>
              <option value="folder" ${this.settings.defaultView === 'folder' ? 'selected' : ''}>按文件夹</option>
              <option value="tag" ${this.settings.defaultView === 'tag' ? 'selected' : ''}>按标签</option>
            </select>
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span style="color: var(--SmartThemeBodyColor);">显示归档聊天</span>
            <input type="checkbox" id="wtl-settings-show-archived" ${this.settings.showArchived ? 'checked' : ''} style="width: 18px; height: 18px;">
          </label>
        </div>
      </div>

      <div class="wtl-settings-section">
        <h3 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); font-size: 1.1em;">文件夹管理</h3>
        <div id="wtl-folder-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          ${this.renderFolderList()}
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="wtl-new-folder-input" placeholder="新文件夹名称" style="flex: 1; padding: 8px 12px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px; background: var(--SmartThemeBlurTintColor); color: var(--SmartThemeBodyColor);">
          <button type="button" id="wtl-add-folder-btn" class="menu_button">添加</button>
        </div>
      </div>

      <div class="wtl-settings-section">
        <h3 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); font-size: 1.1em;">标签管理</h3>
        <div id="wtl-tag-list" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          ${this.renderTagList()}
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="wtl-new-tag-input" placeholder="新标签名称" style="flex: 1; padding: 8px 12px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px; background: var(--SmartThemeBlurTintColor); color: var(--SmartThemeBodyColor);">
          <button type="button" id="wtl-add-tag-btn" class="menu_button">添加</button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
        <button type="button" id="wtl-settings-reset" class="menu_button">重置默认</button>
        <button type="button" id="wtl-settings-save" class="menu_button menu_button_icon" style="background: var(--SmartThemeUnderlineColor); color: var(--SmartThemeBodyColor);">保存设置</button>
      </div>
    `;
  }

  renderFolderList() {
    return this.settings.folders.map((folder, index) => `
      <div class="wtl-folder-item" data-folder="${folder}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 50%, transparent);">
        <span style="color: var(--SmartThemeBodyColor);">${folder}</span>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="wtl-folder-edit-btn menu_button" data-index="${index}" title="编辑"><i class="fa-solid fa-edit"></i></button>
          <button type="button" class="wtl-folder-delete-btn menu_button" data-folder="${folder}" title="删除"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  renderTagList() {
    return this.settings.tags.map((tag, index) => `
      <div class="wtl-tag-item" data-tag="${tag}" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeUnderlineColor) 20%, transparent);">
        <span style="color: var(--SmartThemeBodyColor); font-size: 0.9em;">${tag}</span>
        <button type="button" class="wtl-tag-delete-btn" data-tag="${tag}" style="background: none; border: none; color: var(--SmartThemeBodyColor); cursor: pointer; padding: 0; opacity: 0.7;"><i class="fa-solid fa-times"></i></button>
      </div>
    `).join('');
  }

  bindSettingsEvents() {
    if (!this.modal) return;

    const saveBtn = this.modal.querySelector('#wtl-settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    const resetBtn = this.modal.querySelector('#wtl-settings-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }

    const addFolderBtn = this.modal.querySelector('#wtl-add-folder-btn');
    if (addFolderBtn) {
      addFolderBtn.addEventListener('click', () => this.addFolder());
    }

    const addTagBtn = this.modal.querySelector('#wtl-add-tag-btn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => this.addTag());
    }

    this.modal.querySelectorAll('.wtl-folder-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const folder = e.currentTarget.dataset.folder;
        this.deleteFolder(folder);
      });
    });

    this.modal.querySelectorAll('.wtl-tag-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.currentTarget.dataset.tag;
        this.deleteTag(tag);
      });
    });
  }

  saveSettings() {
    const pageSizeInput = this.modal.querySelector('#wtl-settings-page-size');
    const defaultViewSelect = this.modal.querySelector('#wtl-settings-default-view');
    const showArchivedCheckbox = this.modal.querySelector('#wtl-settings-show-archived');

    if (pageSizeInput) {
      this.settings.pageSize = Math.max(5, Math.min(100, parseInt(pageSizeInput.value) || 20));
    }
    if (defaultViewSelect) {
      this.settings.defaultView = defaultViewSelect.value;
    }
    if (showArchivedCheckbox) {
      this.settings.showArchived = showArchivedCheckbox.checked;
    }

    this.settings.save();
    this.state.itemsPerPage = this.settings.pageSize;
    this.state.save();

    eventBus.emit(EVENTS.CHAT_MANAGER_STATE_CHANGED, { settings: this.settings });

    if (this.ctx.setStatus) {
      this.ctx.setStatus('设置已保存');
    }

    this.modal.style.display = 'none';
  }

  resetSettings() {
    this.settings = new this.settings.constructor();
    this.settings.save();
    this.refreshModalContent();
    
    if (this.ctx.setStatus) {
      this.ctx.setStatus('设置已重置');
    }
  }

  addFolder() {
    const input = this.modal.querySelector('#wtl-new-folder-input');
    if (!input) return;

    const name = input.value.trim();
    if (this.settings.addFolder(name)) {
      input.value = '';
      this.refreshFolderList();
      eventBus.emit(EVENTS.CHAT_MANAGER_STATE_CHANGED, { folders: this.settings.folders });
    }
  }

  deleteFolder(name) {
    if (this.settings.removeFolder(name)) {
      this.refreshFolderList();
      eventBus.emit(EVENTS.CHAT_MANAGER_STATE_CHANGED, { folders: this.settings.folders });
    }
  }

  addTag() {
    const input = this.modal.querySelector('#wtl-new-tag-input');
    if (!input) return;

    const name = input.value.trim();
    if (this.settings.addTag(name)) {
      input.value = '';
      this.refreshTagList();
      eventBus.emit(EVENTS.CHAT_MANAGER_STATE_CHANGED, { tags: this.settings.tags });
    }
  }

  deleteTag(name) {
    if (this.settings.removeTag(name)) {
      this.refreshTagList();
      eventBus.emit(EVENTS.CHAT_MANAGER_STATE_CHANGED, { tags: this.settings.tags });
    }
  }

  refreshFolderList() {
    const listEl = this.modal?.querySelector('#wtl-folder-list');
    if (listEl) {
      listEl.innerHTML = this.renderFolderList();
      this.bindSettingsEvents();
    }
  }

  refreshTagList() {
    const listEl = this.modal?.querySelector('#wtl-tag-list');
    if (listEl) {
      listEl.innerHTML = this.renderTagList();
      this.bindSettingsEvents();
    }
  }

  refreshModalContent() {
    const contentEl = this.modal?.querySelector('#wtl-chat-settings-content');
    if (contentEl) {
      contentEl.innerHTML = this.renderSettingsContent();
      this.bindSettingsEvents();
    }
  }

  destroy() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
