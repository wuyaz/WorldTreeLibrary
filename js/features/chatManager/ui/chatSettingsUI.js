// @ts-nocheck

import { MORANDI_COLORS } from '../data/chatManagerSettings.js';

export class ChatSettingsUI {
  constructor(options = {}) {
    this.settings = options.settings;
    this.callbacks = options.callbacks || {};
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render(settings) {
    this.settings = settings;
    return this.renderSettingsPanel();
  }

  renderSettingsPanel() {
    if (!this.settings) {
      console.error('[WTL ChatSettingsUI] Settings not initialized');
      return '<div class="wtl-chat-settings-empty">设置未初始化</div>';
    }

    const renderColorPicker = (type, value, selectedColor) => {
      const colorIndex = MORANDI_COLORS.indexOf(selectedColor);
      const currentIndex = colorIndex >= 0 ? colorIndex : 0;
      
      return `
        <div class="wtl-chat-settings-color-slider" data-type="${type}" data-value="${this.escapeHtml(value)}" data-current-index="${currentIndex}">
          <button type="button" class="wtl-chat-settings-color-nav wtl-chat-settings-color-prev" data-settings-action="color-prev" data-type="${type}" data-value="${this.escapeHtml(value)}">‹</button>
          <div class="wtl-chat-settings-color-display" style="background-color: ${selectedColor};"></div>
          <button type="button" class="wtl-chat-settings-color-nav wtl-chat-settings-color-next" data-settings-action="color-next" data-type="${type}" data-value="${this.escapeHtml(value)}">›</button>
        </div>
      `;
    };

    const renderCreateColorPicker = (type, selectedColor) => {
      const colorIndex = MORANDI_COLORS.indexOf(selectedColor);
      const currentIndex = colorIndex >= 0 ? colorIndex : 0;
      
      return `
        <div class="wtl-chat-settings-color-slider is-create" data-type="${type}" data-current-index="${currentIndex}">
          <button type="button" class="wtl-chat-settings-color-nav wtl-chat-settings-color-prev" data-settings-action="color-prev-create" data-type="${type}">‹</button>
          <div class="wtl-chat-settings-color-display" style="background-color: ${selectedColor};"></div>
          <button type="button" class="wtl-chat-settings-color-nav wtl-chat-settings-color-next" data-settings-action="color-next-create" data-type="${type}">›</button>
        </div>
      `;
    };

    const renderItemRow = (type, value, index, total) => `
      <div class="wtl-chat-settings-item">
        <div class="wtl-chat-settings-item-main">
          <span class="wtl-chat-settings-order">${index + 1}</span>
          <span class="wtl-chat-settings-name">${this.escapeHtml(value)}</span>
        </div>
        <div class="wtl-chat-settings-color-row">
          ${renderColorPicker(type, value, (type === 'folder' ? this.settings.getFolderColor(value) : this.settings.getTagColor(value)) || MORANDI_COLORS[0])}
          <button type="button" class="wtl-chat-settings-btn is-icon" data-settings-action="clear-color" data-type="${type}" data-value="${this.escapeHtml(value)}" title="清除颜色">
            <i class="fa-solid fa-eraser"></i>
          </button>
        </div>
        <div class="wtl-chat-settings-actions">
          <button type="button" class="wtl-chat-settings-btn is-icon" data-settings-action="move-item" data-type="${type}" data-value="${this.escapeHtml(value)}" data-direction="up" ${index === 0 ? 'disabled' : ''} title="上移">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button type="button" class="wtl-chat-settings-btn is-icon" data-settings-action="move-item" data-type="${type}" data-value="${this.escapeHtml(value)}" data-direction="down" ${index === total - 1 ? 'disabled' : ''} title="下移">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button type="button" class="wtl-chat-settings-btn is-icon is-danger" data-settings-action="remove-item" data-type="${type}" data-value="${this.escapeHtml(value)}" title="删除">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    const renderSection = (type, title, subtitle, inputPlaceholder, values, isOpen = false) => {
      let presetList = [];
      try {
        presetList = this.settings.getPresetList(type) || [];
      } catch (e) {
        console.warn('[WTL ChatSettingsUI] Failed to get preset list:', e);
      }
      
      const currentPreset = type === 'folder' ? (this.settings.currentFolderPreset || '') : (this.settings.currentTagPreset || '');
      
      const presetButtons = presetList.map(name => 
        `<button type="button" class="wtl-chat-settings-preset-btn ${name === currentPreset ? 'is-active' : ''}" data-preset="${this.escapeHtml(name)}">${this.escapeHtml(name)}</button>`
      ).join('');
      
      const isDefaultSelected = currentPreset === '' || currentPreset === '默认';

      const itemsHtml = values.length
        ? values.map((value, index) => renderItemRow(type, value, index, values.length)).join('')
        : '<div class="wtl-chat-settings-empty">暂无项目</div>';

      return `
        <section class="wtl-chat-settings-section ${isOpen ? 'is-open' : ''}" data-type="${type}">
          <button type="button" class="wtl-chat-settings-section-head" data-settings-action="toggle-section" data-type="${type}">
            <span class="wtl-chat-settings-section-copy">
              <strong>${title}</strong>
            </span>
            <span class="wtl-chat-settings-section-arrow">${isOpen ? '收起' : '展开'}</span>
          </button>
          <div class="wtl-chat-settings-section-body">
            <div class="wtl-chat-settings-preset-row">
              <div class="wtl-chat-settings-preset-buttons" data-settings-input="${type}Preset">
                <button type="button" class="wtl-chat-settings-preset-btn ${isDefaultSelected ? 'is-active' : ''}" data-preset="默认">默认</button>
                ${presetButtons}
                <button type="button" class="wtl-chat-settings-preset-btn" data-settings-action="add-preset" data-type="${type}" title="添加预设">+</button>
              </div>
              <button type="button" class="wtl-chat-settings-btn is-icon" data-settings-action="save-preset" data-type="${type}" title="保存预设" ${isDefaultSelected ? 'disabled' : ''}>
                <i class="fa-solid fa-floppy-disk"></i>
              </button>
              <button type="button" class="wtl-chat-settings-btn is-icon is-danger" data-settings-action="delete-preset" data-type="${type}" title="删除预设" ${isDefaultSelected ? 'disabled' : ''}>
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="wtl-chat-settings-list">${itemsHtml}</div>
            <div class="wtl-chat-settings-create-row">
              <input class="wtl-chat-settings-input text_pole" type="text" placeholder="${inputPlaceholder}" data-settings-input="${type}Name" style="flex:1;">
              <button type="button" class="wtl-chat-settings-btn" data-settings-action="add-item" data-type="${type}">添加</button>
            </div>
          </div>
        </section>
      `;
    };

    return `
      <div class="wtl-chat-settings-shell">
        <section class="wtl-chat-settings-card is-display">
          <div class="wtl-chat-settings-card-head">
            <h3>显示设置</h3>
            <button type="button" class="wtl-chat-settings-btn" data-settings-action="reset">恢复默认</button>
          </div>
          <div class="wtl-chat-settings-controls">
            <label class="wtl-chat-settings-row">
              <span>预览行数</span>
              <input class="wtl-chat-settings-input text_pole" type="number" min="1" max="6" value="${this.settings.previewLines}" data-settings-input="previewLines">
            </label>
            <label class="wtl-chat-settings-row">
              <span>每页显示行数</span>
              <input class="wtl-chat-settings-input text_pole" type="number" min="5" max="100" step="5" value="${this.settings.pageSize}" data-settings-input="pageSize">
            </label>
            <label class="wtl-chat-settings-row">
              <span>预览弹窗显示层数</span>
              <input class="wtl-chat-settings-input text_pole" type="number" min="1" max="12" value="${this.settings.previewLayers}" data-settings-input="previewLayers">
            </label>
            <label class="wtl-chat-settings-row">
              <span>修改标题同步重命名文件</span>
              <input type="checkbox" ${this.settings.renameFileWithTitle ? 'checked' : ''} data-settings-input="renameFileWithTitle">
            </label>
            <label class="wtl-chat-settings-row">
              <span>默认视图</span>
              <div class="wtl-chat-settings-view-toggle" data-settings-input="defaultView">
                <button type="button" class="wtl-chat-settings-view-btn ${this.settings.defaultView === 'time' ? 'is-active' : ''}" data-value="time">时间</button>
                <button type="button" class="wtl-chat-settings-view-btn ${this.settings.defaultView === 'favorite' ? 'is-active' : ''}" data-value="favorite">收藏</button>
                <button type="button" class="wtl-chat-settings-view-btn ${this.settings.defaultView === 'character' ? 'is-active' : ''}" data-value="character">角色</button>
                <button type="button" class="wtl-chat-settings-view-btn ${this.settings.defaultView === 'folder' ? 'is-active' : ''}" data-value="folder">分组</button>
                <button type="button" class="wtl-chat-settings-view-btn ${this.settings.defaultView === 'tag' ? 'is-active' : ''}" data-value="tag">标签</button>
              </div>
            </label>
          </div>
        </section>
        ${renderSection('folder', '分组', '', '输入新分组名称', this.settings.folders, this.callbacks.folderSectionOpen)}
        ${renderSection('tag', '标签', '', '输入新标签名称', this.settings.tags, this.callbacks.tagSectionOpen)}
      </div>
    `;
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
}
