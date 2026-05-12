// @ts-nocheck
/**
 * Table Controller for Memory Table
 * Handles table rendering, editing, and interactions
 */

import {
  wrapTable,
  stripTableWrapper,
  ensureTableWrapper,
  parseSections,
  parseMarkdownTableToJson,
  renderJsonToMarkdown,
  buildEmptyTableFromTemplate
} from '../data/markdown.js';
import {
  parseSchemaToTemplate
} from '../data/template.js';
import {
  updateTableRows as updatePreviewTableRows,
  moveTableRow,
  applyPreviewEditsToMarkdown as applyTablePreviewEdits,
  reorderColumnsInMarkdown,
  reorderSectionsInMarkdown
} from '../ui/tablePreview.js';
import { ViewRenderer } from '../ui/ViewRenderer.js';
import { getBlockEls, getRefBlockEls, serializeBlockOrder } from '../ui/blockEditor.js';
import { createModalController } from '../../../shared/ui/modal.js';
import { buildReferenceBundle, formatReferenceText } from '../services/referenceService.js';
import { buildPrompt } from '../services/promptService.js';
import { callAi } from '../services/aiService.js';
import {
  getCharacterNameFromContext,
  getChatKeyFromContext,
  getChatMetadataFromContext,
  loadTableForChatState,
  saveTableForChatState,
  reloadStateForCurrentChat as reloadChatState
} from '../services/chatStateService.js';
import { safeParseJson } from '../../../shared/utils/index.js';
import { getFeatureFlags } from '../../../core/storage.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class TableController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    this.viewRenderer = null;
    this.state = {
      running: false,
      lastRef: null,
      manualState: null,
      activeSection: '',
      activeSectionIndex: 0,
      tableSectionOrder: [],
      hiddenRows: {},
      templateState: { title: '记忆表格', sections: [] },
      templateActiveSectionId: '',
      tableEditMode: false,
      templateEditMode: false,
      schemaSource: '',
      pendingAiHistory: null,
      currentChatStateKey: '',
      runtimeInjectedInput: null
    };

    this.history = [];
    this.autoRefreshInterval = null;
  }

  initialize() {
    if (!this.ui || !this.ui.root) {
      console.warn('[WTL TableController] UI refs not ready, delaying initialization');
      return;
    }
    this.viewRenderer = new ViewRenderer(this.ui.root);
    this.viewRenderer.initialize();
    this.bindEvents();
    this.loadState();
    this.applyFeatureUi();
    this.ensureHooks();
    this.renderTablePreview();
  }

  bindEvents() {
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.addEventListener('click', () => this.toggleTableEditMode());
    }

    if (this.ui.newTableFromTemplateBtn) {
      this.ui.newTableFromTemplateBtn.addEventListener('click', () => this.showNewTableTemplateModal());
    }

    if (this.ui.clearTableBtn) {
      this.ui.clearTableBtn.addEventListener('click', () => this.clearTable());
    }

    if (this.ui.tablePreviewEl) {
      this.ui.tablePreviewEl.addEventListener('click', (e) => this.handleTablePreviewClick(e));
    }

    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.wtl-add-row-btn');
        if (addBtn) {
          const rowIdx = parseInt(addBtn.dataset.rowIdx, 10);
          const sectionNum = parseInt(addBtn.dataset.section, 10);
          this.addRowToSection(rowIdx, sectionNum);
          return;
        }
        // 操作面板按钮（上移、下移、隐藏、删除）
        const actionBtn = e.target.closest('.wtl-row-action-btn');
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          const rowIdx = parseInt(actionBtn.dataset.rowIdx, 10);
          const sectionNum = parseInt(actionBtn.dataset.section, 10);
          switch (action) {
            case 'move-up':
              this.moveRowUp(rowIdx, sectionNum);
              break;
            case 'move-down':
              this.moveRowDown(rowIdx, sectionNum);
              break;
            case 'hide-row':
              this.toggleRowHide(rowIdx, sectionNum);
              break;
            case 'delete-row':
              this.deleteRow(rowIdx, sectionNum);
              break;
          }
          return;
        }
      });

      // Row drag-and-drop for reorder
      // dragstart only fires on rows that have draggable="true" set by the drag handle mousedown
      tableBody.addEventListener('dragstart', (e) => {
        const tr = e.target.closest('tr[data-row-idx]');
        if (!tr) { e.preventDefault(); return; }
        tr.classList.add('wtl-dragging');
        e.dataTransfer.setData('text/plain', tr.dataset.rowIdx || '');
        e.dataTransfer.effectAllowed = 'move';
      });

      tableBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = tableBody.querySelector('.wtl-dragging');
        if (!dragging) return;
        const target = e.target.closest('tr[data-row-idx]');
        if (!target || target === dragging || target.classList.contains('wtl-add-row-tr')) return;
        e.dataTransfer.dropEffect = 'move';
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          tableBody.insertBefore(dragging, target);
        } else {
          tableBody.insertBefore(dragging, target.nextSibling);
        }
      });

      tableBody.addEventListener('dragend', () => {
        const dragging = tableBody.querySelector('.wtl-dragging');
        if (dragging) {
          dragging.classList.remove('wtl-dragging');
          this._applyRowOrderFromDOM();
        }
      });
    }

    if (this.ui.blockListEl) {
      this.ui.blockListEl.addEventListener('dragend', () => this.handleBlockDragEnd());
      this.bindDrag(this.ui.blockListEl);
    }

    if (this.ui.refBlockListEl) {
      this.ui.refBlockListEl.addEventListener('dragend', () => this.handleRefBlockDragEnd());
      this.bindDrag(this.ui.refBlockListEl);
    }

    const sectionTabs = this.ui.root?.querySelector('#wtl-section-tabs');
    if (sectionTabs) {
      sectionTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.wtl-section-tab');
        if (!tab) return;
        const idx = parseInt(tab.dataset.sectionIdx, 10);
        if (!isNaN(idx)) this.handleSectionTabClick(idx);
      });
      sectionTabs.addEventListener('dragend', () => this.handleSectionTabDragEnd());
    }
  }

  renderTablePreview(md) {
    const tableMd = md ?? this.ui.tableMdEl?.value ?? '';
    if (!tableMd) {
      this.viewRenderer.tableHead.innerHTML = '';
      this.viewRenderer.tableBody.innerHTML = '';
      this.viewRenderer.sectionTabsEl.innerHTML = '';
      this.viewRenderer.updateRowCount(0);
      return;
    }

    try {
      const tableJson = parseMarkdownTableToJson(tableMd);
      const sections = tableJson?.sections || [];

      let sectionIndex = this.state.activeSectionIndex || 0;
      if (this.state.activeSection && sections.length) {
        const found = sections.findIndex(s => s.name === this.state.activeSection);
        if (found >= 0) sectionIndex = found;
      }
      this.state.activeSectionIndex = Math.min(sectionIndex, Math.max(0, sections.length - 1));
      if (sections.length) {
        this.state.activeSection = sections[this.state.activeSectionIndex]?.name || '';
      }

      this.viewRenderer.renderSectionTabs(sections, this.state.activeSectionIndex, this.state.templateEditMode);
      // 始终以非编辑模式渲染表格（编辑模式通过 toggleEditMode 切换，不重建 DOM）
      this.viewRenderer.renderTable(tableJson, {
        sectionIndex: this.state.activeSectionIndex,
        hiddenRows: this.state.hiddenRows,
        editMode: false,
        templateMode: this.state.templateEditMode
      });
      // 如果当前是编辑模式，切换过去（不重建 DOM，保留行高列宽）
      if (this.state.tableEditMode) {
        this.viewRenderer.toggleEditMode(true);
      }
      this.viewRenderer.bindResizeHandles();
      this.viewRenderer.updateLastSaved('');
    } catch (error) {
      console.error('[WTL TableController] Failed to render table preview:', error);
    }
  }

  handleSectionTabClick(sectionIdx) {
    if (this.state.templateEditMode) return;
    this.state.activeSectionIndex = sectionIdx;
    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    if (sections[sectionIdx]) {
      this.state.activeSection = sections[sectionIdx].name;
    }
    this.viewRenderer.setActiveTab(sectionIdx);
    this.viewRenderer.renderTable(tableJson, {
      sectionIndex: sectionIdx,
      hiddenRows: this.state.hiddenRows,
      editMode: false,
      templateMode: this.state.templateEditMode
    });
    if (this.state.tableEditMode) {
      this.viewRenderer.toggleEditMode(true);
    }
    this.viewRenderer.bindResizeHandles();
    this.saveState();
  }

  handleSectionTabDragEnd() {
    if (!this.state.templateEditMode) return;
    const tabsEl = this.ui.root?.querySelector('#wtl-section-tabs');
    if (!tabsEl) return;
    const ordered = Array.from(tabsEl.querySelectorAll('.wtl-section-tab'))
      .map(el => {
        const editIcon = el.querySelector('.wtl-table-header-edit-icon');
        if (editIcon) editIcon.remove();
        return el.textContent?.trim() || '';
      })
      .filter(Boolean);
    if (!ordered.length) return;
    this.state.tableSectionOrder = ordered;
    const next = reorderSectionsInMarkdown(this.ui.tableMdEl?.value || '', ordered);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = next;
    this.renderTablePreview(next);
    this.saveState();
  }

  addRowToSection(rowIdx, sectionNum) {
    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    const sectionIdx = sectionNum - 1;
    if (!sections[sectionIdx]) return;
    const columns = sections[sectionIdx].columns || [];
    const newRow = columns.map(() => '');
    sections[sectionIdx].rows.splice(rowIdx, 0, newRow);
    const nextMd = renderJsonToMarkdown(tableJson);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;
    this._reRenderWithPanelRestore(nextMd);
    this.saveTable();
  }

  async toggleTableEditMode() {
    if (this.state.tableEditMode) {
      this.state.tableEditMode = false;
      this.updateEditModeUI();
      if (this.viewRenderer) {
        this.viewRenderer.toggleEditMode(false);
      }
      await this.saveTable();
    } else {
      this.state.tableEditMode = true;
      this.updateEditModeUI();
      await this.loadTableForEditing();
    }
  }

  updateEditModeUI() {
    if (this.viewRenderer) this.viewRenderer.updateEditTableButton(this.state.tableEditMode);
  }

  async loadTableForEditing() {
    try {
      const tableMd = await this.loadTableForChat();
      // 只在表格未渲染时重建，否则只切换编辑模式
      const hasBody = this.viewRenderer?.tableBody?.children?.length > 0;
      if (!hasBody) {
        this.renderTablePreview(tableMd);
      }
      if (this.state.tableEditMode && this.viewRenderer) {
        this.viewRenderer.toggleEditMode(true);
        // 绑定内联编辑事件（contenteditable 已在 toggleEditMode 中设置）
        this._bindInlineEditing();
      }
      eventBus.emit(EVENTS.MEMORY_TABLE_LOADED, parseMarkdownTableToJson(tableMd));
    } catch (error) {
      console.error('[WTL TableController] Failed to load table for editing:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { context: 'loadTableForEditing', error });
    }
  }

  /** 绑定内联编辑事件 */
  _bindInlineEditing() {
    if (!this.viewRenderer?.tableBody) return;
    this.viewRenderer.tableBody.querySelectorAll('td[data-col-idx]').forEach(cell => {
      // 移除旧监听器避免重复绑定
      cell.removeEventListener('blur', this._onCellBlur);
      cell.removeEventListener('keydown', this._onCellKeydown);
    });
    this._onCellBlur = (e) => {
      const row = e.target.closest('tr');
      const rowIdx = parseInt(row?.dataset?.rowIdx ?? 0);
      const colIdx = parseInt(e.target?.dataset?.colIdx ?? 0);
      const tableJson = parseMarkdownTableToJson(this.ui.tableMdEl?.value || '');
      const sections = tableJson?.sections || [];
      const section = sections[this.state.activeSectionIndex];
      if (section?.rows?.[rowIdx]) {
        section.rows[rowIdx][colIdx] = e.target.textContent;
        const nextMd = renderJsonToMarkdown(tableJson);
        if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;
      }
    };
    this._onCellKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }
      if (e.key === 'Escape') e.target.blur();
    };
    this.viewRenderer.tableBody.querySelectorAll('td[data-col-idx]').forEach(cell => {
      cell.addEventListener('blur', this._onCellBlur);
      cell.addEventListener('keydown', this._onCellKeydown);
    });
  }

  async loadTableForChat() {
    const hiddenRowsRef = { value: this.state.hiddenRows };
    const tableMd = await loadTableForChatState({
      ctx: this.ctx,
      defaults: this.defaults,
      safeParseJson,
      renderJsonToMarkdown,
      parseSchemaToTemplate,
      buildEmptyTableFromTemplate,
      getDefaultSchemaText: () => this.getDefaultSchemaText(),
      resolveSchemaByScope: () => this.resolveSchemaByScope(),
      loadSchemaForMode: (mode) => this.loadSchemaForMode(mode),
      hiddenRowsRef
    });
    this.state.hiddenRows = hiddenRowsRef.value;
    return tableMd;
  }

  async clearTable() {
    if (!confirm('确定要清空记忆表格吗？此操作不可撤销。')) {
      return;
    }

    try {
      const emptyTable = buildEmptyTableFromTemplate(this.state.templateState);
      const tableMd = renderJsonToMarkdown(emptyTable);

      if (this.ui.tableMdEl) {
        this.ui.tableMdEl.value = tableMd;
      }

      this.state.hiddenRows = {};
      this.state.activeSectionIndex = 0;
      this.state.activeSection = '';
      await this.saveTable();
      this.renderTablePreview(tableMd);

      eventBus.emit(EVENTS.MEMORY_TABLE_CLEARED);
      this.setStatus('表格已清空', 'success');
    } catch (error) {
      console.error('[WTL TableController] Failed to clear table:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { context: 'clearTable', error });
      this.setStatus('清空表格失败', 'error');
    }
  }

  showNewTableTemplateModal() {
    const chatKey = getChatKeyFromContext(this.ctx);
    const hasChat = chatKey && chatKey !== 'default';

    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    const builtinPresets = window.__WTL_PRESETS__?.schema || {};
    const allNames = [...new Set([...Object.keys(presets), ...Object.keys(builtinPresets)])];

    if (!allNames.length) {
      alert('没有可用的表格模板，请先在设置中创建模板。');
      return;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'wtl-modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;
    modalOverlay.innerHTML = `
      <div class="wtl-modal" style="background: var(--wtl-bg-elev); border-radius: 8px; padding: 0; width: 400px; max-width: 90vw; border: 1px solid var(--wtl-border);">
        <div class="wtl-modal-header" style="padding: 12px 16px; border-bottom: 1px solid var(--wtl-border);">
          <h3 style="margin:0; font-size: 14px;">从模板新建表格</h3>
        </div>
        <div class="wtl-modal-body" style="padding: 16px;">
          ${!hasChat ? '<div style="color: var(--wtl-accent); margin-bottom: 12px; font-size: 12px;">未检测到当前聊天，新建表格将保存到本地。</div>' : ''}
          <div style="margin-bottom: 8px; font-size: 12px;">选择模板：</div>
          <div id="wtl-template-list" style="max-height: 250px; overflow-y: auto;">
            ${allNames.map((name, idx) => `
              <label style="display: block; padding: 8px; cursor: pointer; border-radius: 4px; margin-bottom: 4px; background: rgba(255,255,255,0.03);">
                <input type="radio" name="wtl-template" value="${this._escapeHtml(name)}" ${idx === 0 ? 'checked' : ''} style="margin-right: 8px;">
                ${this._escapeHtml(name)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="wtl-modal-footer" style="padding: 12px 16px; border-top: 1px solid var(--wtl-border); display: flex; justify-content: flex-end; gap: 8px;">
          <button id="wtl-modal-cancel" class="menu_button" style="padding: 4px 10px;">取消</button>
          <button id="wtl-modal-confirm" class="menu_button menu_button wtl-action-primary" style="padding: 4px 10px;">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    const onClose = () => modalOverlay.remove();
    const confirmBtn = modalOverlay.querySelector('#wtl-modal-confirm');
    const cancelBtn = modalOverlay.querySelector('#wtl-modal-cancel');

    const onConfirm = () => {
      const selected = modalOverlay.querySelector('input[name="wtl-template"]:checked');
      const templateName = selected ? selected.value : allNames[0];
      onClose();
      this.createTableFromTemplate(templateName);
    };
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onClose);
  }

  async createTableFromTemplate(templateName) {
    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    const builtinPresets = window.__WTL_PRESETS__?.schema || {};
    let schemaText = presets[templateName] || builtinPresets[templateName] || '';
    if (typeof schemaText !== 'string') {
      if (Array.isArray(schemaText)) {
        schemaText = schemaText.join('\n');
      } else if (schemaText && typeof schemaText === 'object' && schemaText.text) {
        schemaText = schemaText.text;
      } else {
        schemaText = JSON.stringify(schemaText);
      }
    }
    if (!schemaText) {
      alert(`模板 "${templateName}" 内容为空。`);
      return;
    }
    try {
      const template = parseSchemaToTemplate(schemaText);
      const emptyTableJson = buildEmptyTableFromTemplate(template);
      const tableMd = renderJsonToMarkdown(emptyTableJson);
      if (this.ui.tableMdEl) this.ui.tableMdEl.value = tableMd;
      this.state.hiddenRows = {};
      this.state.activeSectionIndex = 0;
      this.state.activeSection = '';
      await this.saveTable();
      this.renderTablePreview(tableMd);
      this.setStatus(`已从模板 "${templateName}" 新建表格`, 'success');
    } catch (error) {
      console.error('[WTL TableController] Failed to create table from template:', error);
      alert('创建表格失败，请检查模板格式。');
    }
  }



  async saveTable(meta = {}) {
    try {
      const tableMd = this.ui.tableMdEl?.value || '';
      await saveTableForChatState({
        ctx: this.ctx,
        tableMd,
        meta,
        hiddenRows: this.state.hiddenRows,
        wrapTable,
        parseMarkdownTableToJson,
        appendHistory: this.appendHistory.bind(this)
      });

      if (this.viewRenderer) {
        const now = new Date();
        this.viewRenderer.updateLastSaved(`已保存 ${now.toLocaleTimeString()}`);
      }

      eventBus.emit(EVENTS.MEMORY_TABLE_SAVED, { tableMd });
      this.setStatus('表格已保存', 'success');
      return true;
    } catch (error) {
      console.error('[WTL TableController] Failed to save table:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { context: 'saveTable', error });
      this.setStatus('保存表格失败', 'error');
      return false;
    }
  }

  appendHistory(tableJson, tableMd, meta) {
    const historyItem = {
      timestamp: Date.now(),
      tableJson,
      tableMd,
      meta
    };
    this.history.push(historyItem);
    if (this.history.length > 50) {
      this.history.shift();
    }

    const chatKey = getChatKeyFromContext(this.ctx);
    try {
      localStorage.setItem(`wtl.history.${chatKey}`, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[WTL TableController] Failed to save history:', e);
    }
  }

  handleTablePreviewClick(event) {
    const target = event.target;
    if (target.classList.contains('wtl-table-action-btn')) {
      const action = target.dataset.action;
      const rowId = target.closest('tr').dataset.rowId;

      switch (action) {
        case 'edit':
          this.editTableRow(rowId);
          break;
        case 'delete':
          this.deleteTableRow(rowId);
          break;
        case 'hide':
          this.toggleRowVisibility(rowId);
          break;
      }
    }
  }

  editTableRow(rowId) {
    console.log('Edit row:', rowId);
  }

  deleteTableRow(rowId) {
    if (!confirm('确定要删除这一行吗？')) {
      return;
    }
    console.log('Delete row:', rowId);
  }

  /**
   * 保存当前展开的面板状态，重新渲染后恢复
   * 使用 data-row（行号，1-based）作为稳定标识，因为 data-row-idx 在重排后会变化
   * @returns {object|null} { rowNum, sectionNum } 或 null
   */
  _saveOpenPanelState() {
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (!tableBody) return null;
    const openRow = tableBody.querySelector('tr.wtl-table-row.is-panel-open');
    if (!openRow) return null;
    return {
      rowNum: openRow.dataset.row,      // 使用 data-row（行号，1-based，稳定不变）
      sectionNum: openRow.dataset.section
    };
  }

  /**
   * 恢复面板展开状态（直接操作 DOM，不依赖事件模拟）
   */
  _restoreOpenPanel(panelState) {
    if (!panelState) return;
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (!tableBody) return;
    const { rowNum, sectionNum } = panelState;
    // 使用 data-row（行号）查找，该值在重排后不变
    const row = tableBody.querySelector(
      `tr.wtl-table-row[data-row="${rowNum}"][data-section="${sectionNum}"]`
    );
    if (!row) return;
    const rowIdx = row.dataset.rowIdx;  // 获取重排后的新索引
    const toggle = row.querySelector('.wtl-row-action-toggle');
    const indexTd = row.querySelector('.wtl-row-index');
    if (!toggle || !indexTd) return;
    const panel = indexTd.querySelector('.wtl-row-action-panel');
    if (!panel) return;

    // 收起其他行已展开的面板
    const openRows = tableBody.querySelectorAll('tr.wtl-table-row.is-panel-open');
    openRows.forEach(openRow => {
      if (openRow === row) return;
      openRow.classList.remove('is-panel-open');
      const openPanel = openRow.querySelector('.wtl-row-action-panel.is-open');
      if (openPanel) {
        openPanel.classList.remove('is-open');
        // 延迟清除内容，让淡出动画完成
        const panelToClear = openPanel;
        setTimeout(() => {
          if (!panelToClear.classList.contains('is-open')) {
            panelToClear.innerHTML = '';
          }
        }, 280);
      }
      const openToggle = openRow.querySelector('.wtl-row-action-toggle.is-open');
      if (openToggle) {
        openToggle.classList.remove('is-open');
        openToggle.className = 'fa-solid fa-caret-right wtl-row-action-toggle';
      }
    });

    // 展开当前行的面板
    toggle.classList.add('is-open');
    toggle.className = 'fa-solid fa-caret-down wtl-row-action-toggle';
    panel.classList.add('is-open');
    row.classList.add('is-panel-open');
    const isHidden = Boolean(this.state.hiddenRows?.[sectionNum]?.[rowNum]);
    const hideIcon = isHidden ? 'fa-eye' : 'fa-ghost';
    const hideTitle = isHidden ? '显示该行' : '隐藏该行';
    panel.innerHTML = `
      <button class="wtl-row-action-btn" data-action="move-up" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="上移该行"><i class="fa-solid fa-arrow-up"></i></button>
      <button class="wtl-row-action-btn" data-action="move-down" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="下移该行"><i class="fa-solid fa-arrow-down"></i></button>
      <button class="wtl-row-action-btn" data-action="hide-row" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="${hideTitle}"><i class="fa-solid ${hideIcon}"></i></button>
      <button class="wtl-row-action-btn wtl-row-action-btn-danger" data-action="delete-row" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="删除该行"><i class="fa-solid fa-trash"></i></button>
    `;
  }

  /**
   * 重新渲染表格并恢复面板状态
   */
  _reRenderWithPanelRestore(md) {
    const panelState = this._saveOpenPanelState();
    this.renderTablePreview(md);
    this._restoreOpenPanel(panelState);
  }

  /**
   * 删除指定行（通过行索引和分区号）
   */
  deleteRow(rowIdx, sectionNum) {
    // 先播放滑出动画
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    const targetRow = tableBody?.querySelector(`tr.wtl-table-row[data-row-idx="${rowIdx}"]`);
    if (targetRow) {
      targetRow.classList.add('wtl-row-deleting');
      setTimeout(() => {
        this._doDeleteRow(rowIdx, sectionNum);
      }, 300);
    } else {
      this._doDeleteRow(rowIdx, sectionNum);
    }
  }

  /**
   * 实际执行删除（动画完成后调用）
   */
  _doDeleteRow(rowIdx, sectionNum) {
    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    const sectionIdx = sectionNum - 1;
    if (!sections[sectionIdx]) return;
    if (rowIdx < 0 || rowIdx >= sections[sectionIdx].rows.length) return;
    sections[sectionIdx].rows.splice(rowIdx, 1);
    const nextMd = renderJsonToMarkdown(tableJson);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;
    // 删除后不恢复面板（行已不存在）
    this.renderTablePreview(nextMd);
    this.saveTable();
  }

  /**
   * 更新表格行 data-* 属性和面板按钮 data-row-idx
   */
  _refreshRowIndices() {
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr.wtl-table-row');
    rows.forEach((tr, idx) => {
      const rowNum = idx + 1;
      tr.dataset.rowIdx = String(idx);
      tr.dataset.row = String(rowNum);
      // 更新行头 td 的 data-* 属性
      const indexTd = tr.querySelector('.wtl-row-index');
      if (indexTd) {
        indexTd.dataset.rowIdx = String(idx);
        indexTd.dataset.row = String(rowNum);
      }
      // 更新面板按钮的 data-row-idx
      const panel = tr.querySelector('.wtl-row-action-panel');
      if (panel) {
        panel.querySelectorAll('[data-row-idx]').forEach(btn => {
          btn.dataset.rowIdx = String(idx);
        });
      }
      // 更新 toggle 的 data-row-idx
      const toggle = tr.querySelector('.wtl-row-action-toggle');
      if (toggle) toggle.dataset.rowIdx = String(idx);
    });
  }

  /**
   * 上移指定行（带动画）
   */
  moveRowUp(rowIdx, sectionNum) {
    if (rowIdx <= 0) return;
    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    const sectionIdx = sectionNum - 1;
    if (!sections[sectionIdx]) return;
    const rows = sections[sectionIdx].rows;
    if (rowIdx < 1 || rowIdx >= rows.length) return;

    // 保存面板状态，并调整 rowNum 指向移动后的新位置
    const panelState = this._saveOpenPanelState();
    if (panelState && panelState.rowNum == rowIdx + 1) {
      panelState.rowNum = rowIdx;
    }

    // 交换数据
    [rows[rowIdx - 1], rows[rowIdx]] = [rows[rowIdx], rows[rowIdx - 1]];
    const nextMd = renderJsonToMarkdown(tableJson);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;

    // DOM 方式移动行（带动画）
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (tableBody) {
      const targetRow = tableBody.querySelector(`tr.wtl-table-row[data-row-idx="${rowIdx}"]`);
      const beforeRow = tableBody.querySelector(`tr.wtl-table-row[data-row-idx="${rowIdx - 1}"]`);
      if (targetRow && beforeRow) {
        tableBody.insertBefore(targetRow, beforeRow);
        this._refreshRowIndices();
        this._restoreOpenPanel(panelState);
        this.saveTable();
        return;
      }
    }
    // fallback: 重新渲染
    this.renderTablePreview(nextMd);
    this._restoreOpenPanel(panelState);
    this.saveTable();
  }

  /**
   * 下移指定行（带动画）
   */
  moveRowDown(rowIdx, sectionNum) {
    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    const sectionIdx = sectionNum - 1;
    if (!sections[sectionIdx]) return;
    const rows = sections[sectionIdx].rows;
    if (rowIdx < 0 || rowIdx >= rows.length - 1) return;

    // 保存面板状态，并调整 rowNum 指向移动后的新位置
    const panelState = this._saveOpenPanelState();
    if (panelState && panelState.rowNum == rowIdx + 1) {
      panelState.rowNum = rowIdx + 2;
    }

    // 交换数据
    [rows[rowIdx], rows[rowIdx + 1]] = [rows[rowIdx + 1], rows[rowIdx]];
    const nextMd = renderJsonToMarkdown(tableJson);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;

    // DOM 方式移动行（带动画）
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (tableBody) {
      const targetRow = tableBody.querySelector(`tr.wtl-table-row[data-row-idx="${rowIdx}"]`);
      const afterRow = tableBody.querySelector(`tr.wtl-table-row[data-row-idx="${rowIdx + 1}"]`);
      if (targetRow && afterRow) {
        tableBody.insertBefore(targetRow, afterRow.nextSibling);
        this._refreshRowIndices();
        this._restoreOpenPanel(panelState);
        this.saveTable();
        return;
      }
    }
    // fallback: 重新渲染
    this.renderTablePreview(nextMd);
    this._restoreOpenPanel(panelState);
    this.saveTable();
  }

  /**
   * 切换行隐藏状态
   */
  toggleRowHide(rowIdx, sectionNum) {
    const rowNum = rowIdx + 1;
    if (!this.state.hiddenRows[sectionNum]) {
      this.state.hiddenRows[sectionNum] = {};
    }
    this.state.hiddenRows[sectionNum][rowNum] = !this.state.hiddenRows[sectionNum][rowNum];
    const tableMd = this.ui.tableMdEl?.value || '';
    // 隐藏/显示后恢复面板
    this._reRenderWithPanelRestore(tableMd);
    this.saveState();
  }

  /**
   * 行拖拽结束后，根据 DOM 中的行顺序重排数据
   */
  _applyRowOrderFromDOM() {
    const tableBody = this.ui.root?.querySelector('#wtl-preview-body');
    if (!tableBody) return;
    const domRows = Array.from(tableBody.querySelectorAll('tr.wtl-table-row[data-row-idx]'));
    if (!domRows.length) return;

    const tableMd = this.ui.tableMdEl?.value || '';
    const tableJson = parseMarkdownTableToJson(tableMd);
    const sections = tableJson?.sections || [];
    const sectionIdx = this.state.activeSectionIndex;
    if (!sections[sectionIdx]) return;

    // 收集 DOM 中行的原始索引顺序
    const originalIndices = domRows.map(tr => parseInt(tr.dataset.rowIdx, 10));
    const originalRows = sections[sectionIdx].rows;

    // 按新顺序重排
    const reorderedRows = originalIndices.map(idx => originalRows[idx] || []);
    sections[sectionIdx].rows = reorderedRows;

    const nextMd = renderJsonToMarkdown(tableJson);
    if (this.ui.tableMdEl) this.ui.tableMdEl.value = nextMd;
    this._reRenderWithPanelRestore(nextMd);
    this.saveTable();
  }

  toggleRowVisibility(rowId) {
    this.state.hiddenRows[rowId] = !this.state.hiddenRows[rowId];
    this.updateRowVisibility(rowId);
  }

  updateRowVisibility(rowId) {
    const row = this.ui.tablePreviewEl?.querySelector(`tr[data-row-id="${rowId}"]`);
    if (row) {
      row.classList.toggle('wtl-hidden', this.state.hiddenRows[rowId]);
    }
  }

  bindDrag(element) {
    if (!element) return;

    let draggedItem = null;

    element.addEventListener('dragstart', (e) => {
      draggedItem = e.target.closest('.wtl-draggable');
      if (draggedItem) {
        draggedItem.classList.add('wtl-dragging');
        e.dataTransfer.setData('text/plain', draggedItem.dataset.id || '');
      }
    });

    element.addEventListener('dragend', (e) => {
      if (draggedItem) {
        draggedItem.classList.remove('wtl-dragging');
        draggedItem = null;
      }
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(element, e.clientY);
      const draggable = document.querySelector('.wtl-dragging');

      if (draggable && afterElement) {
        element.insertBefore(draggable, afterElement);
      }
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.wtl-draggable:not(.wtl-dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  handleBlockDragEnd() {
    this.saveState();
    this.refreshPromptPreview(true);
  }

  handleRefBlockDragEnd() {
    this.saveState();
    this.refreshPromptPreview(true);
  }

  saveState() {
    try {
      const chatKey = getChatKeyFromContext(this.ctx);

      localStorage.setItem(`wtl.hiddenRows.${chatKey}`, JSON.stringify(this.state.hiddenRows));
      localStorage.setItem(`wtl.activeSection.${chatKey}`, this.state.activeSection);
      localStorage.setItem(`wtl.tableSectionOrder.${chatKey}`, JSON.stringify(this.state.tableSectionOrder));

      const blockOrder = serializeBlockOrder(this.ui.blockListEl);
      const refBlockOrder = serializeBlockOrder(this.ui.refBlockListEl);

      if (blockOrder) {
        localStorage.setItem('wtl.blockOrder', JSON.stringify(blockOrder));
      }

      if (refBlockOrder) {
        localStorage.setItem('wtl.refBlockOrder', JSON.stringify(refBlockOrder));
      }

      eventBus.emit(EVENTS.STORAGE_CHANGED, { type: 'uiState' });
    } catch (error) {
      console.error('[WTL TableController] Failed to save state:', error);
    }
  }

  loadState() {
    try {
      const chatKey = getChatKeyFromContext(this.ctx);

      const savedHiddenRows = localStorage.getItem(`wtl.hiddenRows.${chatKey}`);
      if (savedHiddenRows) {
        this.state.hiddenRows = safeParseJson(savedHiddenRows) || {};
      }

      const savedActiveSection = localStorage.getItem(`wtl.activeSection.${chatKey}`);
      if (savedActiveSection) {
        this.state.activeSection = savedActiveSection;
      }

      const savedSectionOrder = localStorage.getItem(`wtl.tableSectionOrder.${chatKey}`);
      if (savedSectionOrder) {
        this.state.tableSectionOrder = safeParseJson(savedSectionOrder) || [];
      }
    } catch (error) {
      console.error('[WTL TableController] Failed to load state:', error);
    }
  }

  applyFeatureUi() {
    // Always show table area — never hide it
    if (this.ui.memoryFeatureDisabledEl) {
      this.ui.memoryFeatureDisabledEl.style.display = 'none';
    }
  }

  refreshPromptPreview(force = false) {
    if (force || this.state.runtimeInjectedInput) {
      // Refresh logic here
    }
  }

  ensureHooks() {
    const { eventSource, event_types } = this.ctx || {};

    if (!window.__wtlChatHook) {
      window.__wtlChatHook = true;

      if (event_types?.CHAT_CHANGED) {
        eventSource.on(event_types.CHAT_CHANGED, () => this.reloadStateForCurrentChat());
      }
      if (event_types?.CHAT_LOADED) {
        eventSource.on(event_types.CHAT_LOADED, () => this.reloadStateForCurrentChat());
      }
      if (event_types?.CHAT_CHANGED_MANUALLY) {
        eventSource.on(event_types.CHAT_CHANGED_MANUALLY, () => this.reloadStateForCurrentChat());
      }
    }
  }

  async reloadStateForCurrentChat() {
    try {
      await reloadChatState({
        getCtx: () => this.ctx,
        currentChatStateKey: this.state.currentChatStateKey,
        loadState: () => this.loadState(),
        onChatChanged: () => {},
        getPromptCache: () => localStorage.getItem('wtl.prompt.cache'),
        getAiCache: () => localStorage.getItem('wtl.ai.cache'),
        isPromptLogActive: () => true,
        isAiLogActive: () => true,
        setLogContent: () => {},
        refreshPromptPreview: (force) => this.refreshPromptPreview(force)
      });
      await this.loadTableForEditing();
      this.setStatus('聊天状态已更新', 'info');
    } catch (error) {
      console.error('[WTL TableController] Failed to reload chat state:', error);
    }
  }

  setStatus(message, type = 'info') {
    if (this.viewRenderer) {
      this.viewRenderer.updateStatus(message, type);
      return;
    }
    if (this.ui.statusEl) {
      this.ui.statusEl.textContent = message;
      this.ui.statusEl.className = `wtl-status wtl-status-${type}`;

      setTimeout(() => {
        if (this.ui.statusEl.textContent === message) {
          this.ui.statusEl.textContent = '';
          this.ui.statusEl.className = 'wtl-status';
        }
      }, 3000);
    }
  }

  getDefaultSchemaText() {
    try {
      const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
      const active = localStorage.getItem('wtl.schema.presetActive') || '默认';

      if (presets[active]) {
        return presets[active];
      }

      if (presets['默认']) {
        return presets['默认'];
      }

      if (window.__WTL_PRESETS__?.schema?.['默认']) {
        const fallback = window.__WTL_PRESETS__.schema['默认'];
        return Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
      }

      return '';
    } catch (error) {
      console.error('[WTL TableController] Failed to get default schema:', error);
      return '';
    }
  }

  resolveSchemaByScope() {
    try {
      const chatId = getChatKeyFromContext(this.ctx);
      const charId = this.ctx?.characterId || '';

      const scopedPresets = safeParseJson(localStorage.getItem('wtl.schema.presetsByScope')) || {};
      const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};

      const chatName = scopedPresets?.chat?.[chatId];
      if (chatName && presets[chatName]) {
        return { scope: 'chat', name: chatName, text: presets[chatName] };
      }

      const charName = scopedPresets?.character?.[charId];
      if (charName && presets[charName]) {
        return { scope: 'character', name: charName, text: presets[charName] };
      }

      const globalName = scopedPresets?.global || localStorage.getItem('wtl.schema.presetActive') || '默认';
      const globalText = presets[globalName] || presets['默认'] || this.getDefaultSchemaText();
      return { scope: 'global', name: globalName || '默认', text: globalText || '' };
    } catch (error) {
      console.error('[WTL TableController] Failed to resolve schema by scope:', error);
      return { scope: 'global', name: '默认', text: '' };
    }
  }

  loadSchemaForMode(mode) {
    const resolved = this.resolveSchemaByScope();
    return resolved?.text || this.getDefaultSchemaText();
  }

  getFeatureFlags() {
    return safeParseJson(localStorage.getItem('wtl.featureFlags')) || {
      memoryTable: true,
      chatManager: true
    };
  }

  getState() {
    return { ...this.state };
  }

  updateState(newState) {
    this.state = { ...this.state, ...newState };
  }

  destroy() {
    if (this.viewRenderer) {
      this.viewRenderer.destroy();
      this.viewRenderer = null;
    }
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.removeEventListener('click', () => this.toggleTableEditMode());
    }

    if (this.ui.clearTableBtn) {
      this.ui.clearTableBtn.removeEventListener('click', () => this.clearTable());
    }

    window.__wtlChatHook = false;
    window.__wtlApplyFeatureUi = null;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export function createTableController(uiRefs, context, defaults) {
  return new TableController(uiRefs, context, defaults);
}
