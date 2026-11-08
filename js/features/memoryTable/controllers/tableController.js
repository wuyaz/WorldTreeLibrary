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
import { createFillController, bindCommonActionControls } from '../ui/actionControllers.js';
import { applyAllPromptMacros } from '../ui/promptControllers.js';
import { extractEditPayload, parseCommands } from '../data/commands.js';
import { applyCommands } from '../services/applyService.js';
import { getBlocksPreset, getRefBlocksPreset, getRefOrderPreset } from '../../../core/storage.js';
import {
  getCharacterNameFromContext,
  getChatKeyFromContext,
  getChatMetadataFromContext,
  loadTableForChatState,
  saveTableForChatState,
  reloadStateForCurrentChat as reloadChatState,
  TABLE_STORE_TYPE,
  makeTableStoreKey,
  parseTableStoreKey,
  scanAllTables,
  persistChatMetadata
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

  async initialize() {
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
    // 加载表格数据到 tableMdEl.value，同时触发 loadTableForChatState 中的
    // metadata→localStorage 同步写入，确保管理面板（scanAllTables）能扫描到
    // loadTableForEditing 内部已调用 renderTablePreview，无需重复调用
    await this.loadTableForEditing();

    // 初始化填表控制器（createFillController）并绑定按钮事件
    this._initFillController();
  }

  /**
   * 初始化填表控制器：创建 runFillOnce 并绑定 runBtn 等按钮事件
   */
  _initFillController() {
    const hiddenRowsRef = {
      get: () => this.state.hiddenRows,
      set: (val) => { this.state.hiddenRows = val || {}; }
    };

    const fillController = createFillController({
      buildReferenceBundle,
      formatReferenceText,
      getManualConfig: () => this.state.manualState || {},
      wbModeEl: this.ui.wbModeEl,
      entryEl: null, // entryEl 在 HTML 中不存在，createFillController 内部有默认值 'WorldTreeMemory'
      tableMdEl: this.ui.tableMdEl,
      instructionEl: this.ui.instructionEl,
      refBlockListEl: this.ui.refBlockListEl,
      getRefBlocksPreset: () => getRefBlocksPreset(),
      getRefOrderPreset: () => getRefOrderPreset(),
      blockListEl: this.ui.blockListEl,
      prePromptEl: this.ui.prePromptEl,
      schemaEl: this.ui.schemaEl,
      templateState: () => this.state.templateState,
      hiddenRowsRef,
      buildPrompt,
      applyAllPromptMacros,
      logPromptBtn: this.ui.logPromptBtn,
      logAiBtn: this.ui.logAiBtn,
      logContentEl: this.ui.logContentEl,
      externalPromptPreviewEl: this.ui.externalPromptPreviewEl,
      sendModeEl: this.ui.sendModeEl,
      callAi,
      openaiUrlEl: this.ui.openaiUrlEl,
      openaiKeyEl: this.ui.openaiKeyEl,
      openaiModelEl: this.ui.openaiModelEl,
      openaiTempEl: this.ui.openaiTempEl,
      openaiMaxEl: this.ui.openaiMaxEl,
      openaiStreamEl: this.ui.openaiStreamEl,
      parseCommands,
      extractEditPayload,
      applyCommands,
      stripTableWrapper,
      ensureTableWrapper,
      renderPreview: (md) => this.renderTablePreview(md),
      saveState: () => this.saveState(),
      setStatus: (msg) => this.setStatus(msg),
      notifyStatus: (type, msg) => {
        if (this.viewRenderer) this.viewRenderer.updateStatus(msg, type);
      },
      getRefBlockEls: (el) => getRefBlockEls(el),
      getBlockEls: (el) => getBlockEls(el),
      onPendingAiHistory: (data) => {
        this.state.pendingAiHistory = data;
      },
      onLastRef: (ref) => {
        this.state.lastRef = ref;
      },
      getRunning: () => this.state.running,
      setRunning: (val) => {
        this.state.running = val;
        if (this.viewRenderer) this.viewRenderer.updateRunButton(val);
      }
    });

    this.runFillOnce = fillController.runFillOnce;

    // 绑定 runBtn 等通用操作按钮
    bindCommonActionControls({
      runBtn: this.ui.runBtn,
      stopBtn: null, // HTML 中无 stopBtn
      clearBtn: null, // HTML 中无 clearBtn
      saveBtn: null, // HTML 中无 saveBtn
      resetGlobalBtn: this.ui.resetGlobalBtn,
      clearTableBtn: this.ui.clearTableBtn,
      makeModalSaveButton: (label, fn) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', fn);
        return btn;
      },
      openConfirmModal: (title, msg, btns) => {
        // 使用原生 confirm 作为 fallback
        if (confirm(`${title}\n\n${msg}`)) {
          btns?.[0]?.click?.();
        }
      },
      resetAllDefaults: async () => {
        // 重置所有默认设置
        localStorage.removeItem('wtl.blockOrder');
        localStorage.removeItem('wtl.refBlockOrder');
        this.state.hiddenRows = {};
        this.state.templateState = { title: '记忆表格', sections: [] };
        await this.loadTableForEditing();
        this.setStatus('已恢复默认设置');
      },
      tableMdEl: this.ui.tableMdEl,
      renderPreview: (md) => this.renderTablePreview(md),
      saveState: () => this.saveState(),
      refreshPromptPreview: (force) => this.refreshPromptPreview(force),
      setStatus: (msg) => this.setStatus(msg),
      getRunning: () => this.state.running,
      setRunning: (val) => {
        this.state.running = val;
        if (this.viewRenderer) this.viewRenderer.updateRunButton(val);
      },
      runFillOnce: this.runFillOnce
    });
  }

  bindEvents() {
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.addEventListener('click', () => this.toggleTableEditMode());
    }

    if (this.ui.newTableFromTemplateBtn) {
      this.ui.newTableFromTemplateBtn.addEventListener('click', () => this.showNewTableTemplateModal());
    }

    if (this.ui.manageTablesBtn) {
      this.ui.manageTablesBtn.addEventListener('click', () => this.showManageTablesModal());
    }

    if (this.ui.clearTableBtn) {
      this.ui.clearTableBtn.addEventListener('click', () => this.clearTable());
    }

    if (this.ui.refreshTableBtn) {
      this.ui.refreshTableBtn.addEventListener('click', () => this.loadTableForEditing());
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

      // 右滑删除按钮事件（由 ViewRenderer 的 _bindSwipeDelete 触发）
      tableBody.addEventListener('wtl-swipe-delete', (e) => {
        const { rowIdx, sectionNum } = e.detail;
        if (rowIdx !== undefined && sectionNum !== undefined) {
          this.deleteRow(rowIdx, sectionNum);
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
      const result = await this.loadTableForChat();
      const tableMd = result?.tableMd ?? result ?? '';
      const isNew = result?.isNew === true;
      // 同步更新 tableMdEl.value，确保后续操作（如刷新按钮）能读取到最新数据
      if (this.ui.tableMdEl) {
        this.ui.tableMdEl.value = tableMd;
      }
      // 始终重新渲染表格（刷新按钮依赖此行为来刷新显示）
      this.renderTablePreview(tableMd);
      if (this.state.tableEditMode && this.viewRenderer) {
        this.viewRenderer.toggleEditMode(true);
        // 绑定内联编辑事件（contenteditable 已在 toggleEditMode 中设置）
        this._bindInlineEditing();
      }
      eventBus.emit(EVENTS.MEMORY_TABLE_LOADED, parseMarkdownTableToJson(tableMd));
      // 如果是新表格（无 metadata），弹窗询问是否从模板新建
      if (isNew) {
        this._promptNewTableIfNeeded();
      }
    } catch (error) {
      console.error('[WTL TableController] Failed to load table for editing:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { context: 'loadTableForEditing', error });
    }
  }

  async _promptNewTableIfNeeded() {
    // 检查是否已勾选"不再询问"
    const skipPrompt = localStorage.getItem('wtl.skipNewTablePrompt') === 'true';
    if (skipPrompt) return;

    // 防抖：同一聊天只弹一次
    const chatKey = getChatKeyFromContext(this.ctx);
    if (this._promptedChatKey === chatKey) return;
    this._promptedChatKey = chatKey;

    const popupModule = await import('/scripts/popup.js');
    const Popup = window.Popup || popupModule.Popup;

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;min-width:340px;">
        <div style="font-size:13px;line-height:1.5;">
          当前聊天尚未创建记忆表格，是否从模板新建？
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;opacity:0.7;cursor:pointer;">
          <input type="checkbox" id="wtl-skip-prompt" style="margin:0;">
          不再询问
        </label>
      </div>
    `;

    let skipChecked = false;

    const popup = new Popup(container, popupModule.POPUP_TYPE.CONFIRM, '', {
      okButton: '新建表格',
      cancelButton: '暂不创建',
      wide: false,
      large: false,
      allowVerticalScrolling: true,
      onOpen: () => {
        const checkbox = container.querySelector('#wtl-skip-prompt');
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            skipChecked = checkbox.checked;
          });
        }
      },
    });

    const result = await popup.show();
    if (skipChecked) {
      localStorage.setItem('wtl.skipNewTablePrompt', 'true');
    }
    if (result === 1 || result === popupModule.POPUP_RESULT?.AFFIRMATIVE) {
      // 等待当前弹窗完全关闭后再打开新弹窗
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.showNewTableTemplateModal();
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
    const result = await loadTableForChatState({
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
    return result;
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

  async showNewTableTemplateModal() {
    const chatKey = getChatKeyFromContext(this.ctx);
    const hasChat = chatKey && chatKey !== 'default';

    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    const builtinPresets = window.__WTL_PRESETS__?.schema || {};
    const allNames = [...new Set([...Object.keys(presets), ...Object.keys(builtinPresets)])];

    if (!allNames.length) {
      alert('没有可用的表格模板，请先在设置中创建模板。');
      return;
    }

    const popupModule = await import('/scripts/popup.js');
    const Popup = window.Popup || popupModule.Popup;

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;min-width:360px;">
        ${!hasChat ? '<div style="color: var(--wtl-accent); margin-bottom: 4px; font-size: 12px;">未检测到当前聊天，新建表格将保存到本地。</div>' : ''}
        <div style="font-size:12px;opacity:0.75;">选择模板：</div>
        <div id="wtl-template-list" style="max-height:250px;overflow-y:auto;">
          ${allNames.map((name, idx) => `
            <label style="display:block;padding:8px;cursor:pointer;border-radius:4px;margin-bottom:4px;background:rgba(255,255,255,0.03);">
              <input type="radio" name="wtl-template" value="${this._escapeHtml(name)}" ${idx === 0 ? 'checked' : ''} style="margin-right:8px;">
              ${this._escapeHtml(name)}
            </label>
          `).join('')}
        </div>
      </div>
    `;

    let selectedTemplate = allNames[0];

    const popup = new Popup(container, popupModule.POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
      wide: false,
      large: false,
      allowVerticalScrolling: true,
      onOpen: () => {
        const radios = container.querySelectorAll('input[name="wtl-template"]');
        radios.forEach(radio => {
          radio.addEventListener('change', () => {
            if (radio.checked) selectedTemplate = radio.value;
          });
        });
      },
    });

    const result = await popup.show();
    if (!(result === 1 || result === popupModule.POPUP_RESULT?.AFFIRMATIVE)) {
      return;
    }

    const checkedRadio = container.querySelector('input[name="wtl-template"]:checked');
    if (checkedRadio) selectedTemplate = checkedRadio.value;

    await this.createTableFromTemplate(selectedTemplate);
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

  async showManageTablesModal() {
    const popupModule = await import('/scripts/popup.js');
    const Popup = window.Popup || popupModule.Popup;

    const container = document.createElement('div');
    container.style.cssText = 'width:100%;max-width:90vw;';

    // 顶部标签栏
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:2px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;';
    tabBar.innerHTML = `
      <button class="wtl-manage-tab" data-tab="chat" style="flex:1;padding:6px 8px;border:none;border-radius:4px 4px 0 0;cursor:pointer;font-size:12px;background:var(--wtl-accent);color:#fff;font-weight:500;transition:background 0.15s;">💬 聊天</button>
      <button class="wtl-manage-tab" data-tab="character" style="flex:1;padding:6px 8px;border:none;border-radius:4px 4px 0 0;cursor:pointer;font-size:12px;background:rgba(255,255,255,0.04);color:var(--wtl-text);transition:background 0.15s;">👤 角色</button>
      <button class="wtl-manage-tab" data-tab="worldbook" style="flex:1;padding:6px 8px;border:none;border-radius:4px 4px 0 0;cursor:pointer;font-size:12px;background:rgba(255,255,255,0.04);color:var(--wtl-text);transition:background 0.15s;">📖 世界书</button>
      <button class="wtl-manage-tab" data-tab="local" style="flex:1;padding:6px 8px;border:none;border-radius:4px 4px 0 0;cursor:pointer;font-size:12px;background:rgba(255,255,255,0.04);color:var(--wtl-text);transition:background 0.15s;">💾 本地</button>
    `;
    container.appendChild(tabBar);

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'padding:4px 0;max-height:60vh;overflow-y:auto;';
    bodyEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--wtl-text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> 正在加载表格列表...</div>';

    container.appendChild(bodyEl);

    let popupInstance = null;
    let activeTab = 'chat';
    const currentChatKey = getChatKeyFromContext(this.ctx);

    // 切换标签
    const switchTab = (tab) => {
      activeTab = tab;
      tabBar.querySelectorAll('.wtl-manage-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.style.background = isActive ? 'var(--wtl-accent)' : 'rgba(255,255,255,0.04)';
        btn.style.color = isActive ? '#fff' : 'var(--wtl-text)';
        btn.style.fontWeight = isActive ? '500' : 'normal';
      });
      loadTableList();
    };

    tabBar.querySelectorAll('.wtl-manage-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 读取/保存聊天排序
    const loadChatOrder = () => {
      try {
        const raw = localStorage.getItem('wtl.chatOrder');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    };
    const saveChatOrder = (order) => {
      localStorage.setItem('wtl.chatOrder', JSON.stringify(order));
    };

    const loadTableList = async () => {
      bodyEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--wtl-text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> 正在加载表格列表...</div>';

      try {
        let allChats = [];
        try {
          const chatApi = await import('../../../shared/api/chatApi.js');
          allChats = await chatApi.fetchAllChats();
        } catch (e) {
          console.warn('[WTL] Failed to fetch chats via API:', e);
        }

        // 使用 scanAllTables 扫描所有表格
        const allTables = scanAllTables(safeParseJson);
        const tablesMap = allTables[activeTab];

        if (!tablesMap || tablesMap.size === 0) {
          const emptyHints = {
            chat: '当前没有链接到聊天的表格。<br>新建表格时默认链接到当前聊天。',
            character: '当前没有角色表格。<br>可以在聊天标签页中为角色创建表格。',
            worldbook: '当前没有世界书表格。<br>可以在聊天标签页中为世界书创建表格。',
            local: '当前没有本地表格。<br>本地表格不会自动加载到任何聊天。'
          };
          bodyEl.innerHTML = `
            <div style="text-align:center;padding:32px;color:var(--wtl-text-muted);">
              <i class="fa-solid fa-inbox" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.3;"></i>
              <div>暂无表格</div>
              <div style="font-size:11px;margin-top:4px;">${emptyHints[activeTab] || ''}</div>
            </div>
          `;
          return;
        }

        // 构建列表项
        const items = [];
        for (const [id, entry] of tablesMap) {
          let displayName = id;
          let subName = '';
          let isCurrent = false;

          if (activeTab === 'chat') {
            isCurrent = id === currentChatKey;
            if (allChats.length > 0) {
              const matched = allChats.find(c =>
                c.fileName === id || c.globalKey === id ||
                c.globalKey?.endsWith('|' + id) ||
                c.fileName?.replace(/\.jsonl$/i, '') === id
              );
              if (matched) {
                displayName = matched.character || id;
                subName = matched.fileName?.replace(/\.jsonl$/i, '') || id;
              }
            }
            if (!subName) {
              const charName = getCharacterNameFromContext(this.ctx);
              if (charName) displayName = charName;
            }
          } else if (activeTab === 'character') {
            // 尝试从 context 获取角色名
            const chars = this.ctx?.characters || [];
            const char = chars.find(c => c.id === id || c.name === id);
            if (char) displayName = char.name || id;
          } else if (activeTab === 'worldbook') {
            // 世界书名称
          }
          // local 直接用 id

          const isEmpty = entry.totalRows === 0;
          items.push({
            id,
            displayName,
            subName,
            tableCount: entry.tables.length,
            totalRows: entry.totalRows,
            isEmpty,
            isCurrent
          });
        }

        // 排序：聊天标签下当前聊天置顶，其余按已保存顺序
        if (activeTab === 'chat') {
          const savedOrder = loadChatOrder();
          const currentItem = items.find(it => it.isCurrent);
          const otherItems = items.filter(it => !it.isCurrent);
          const orderMap = new Map(savedOrder.map((key, idx) => [key, idx]));
          otherItems.sort((a, b) => {
            const ai = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
            const bi = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
            return ai - bi;
          });
          items.length = 0;
          if (currentItem) items.push(currentItem);
          items.push(...otherItems);
        }

        // 渲染
        let html = '';
        items.forEach((item, idx) => {
          const escapedId = this._escapeHtml(item.id);
          const escapedName = this._escapeHtml(item.displayName);
          const escapedSub = this._escapeHtml(item.subName);
          const isEmpty = item.isEmpty;

          if (activeTab === 'chat') {
            // 聊天视图：当前聊天展开高亮，其他折叠
            if (item.isCurrent) {
              html += `
              <div class="wtl-manage-section" data-store-type="chat" data-store-id="${escapedId}" data-is-current="true"
                   style="margin-bottom:8px;border-radius:8px;overflow:hidden;
                          border:1px solid var(--wtl-accent);background:rgba(255,255,255,0.04);">
                <div class="wtl-manage-section-header"
                     style="display:flex;align-items:center;padding:10px 12px;
                            background:rgba(255,255,255,0.06);cursor:default;
                            border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:11px;color:var(--wtl-accent);margin-right:6px;">●</span>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${escapedName}
                      ${isEmpty ? '<span style="margin-left:6px;font-size:10px;color:#e5c07b;font-weight:normal;">(空表格)</span>' : ''}
                    </div>
                    <div style="font-size:11px;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${escapedSub} · 当前聊天
                    </div>
                  </div>
                  <span style="font-size:11px;opacity:0.4;white-space:nowrap;margin-right:8px;">
                    ${item.tableCount} 个表格 · ${item.totalRows} 行
                  </span>
                  <button class="wtl-manage-delete-btn" data-store-type="chat" data-store-id="${escapedId}"
                          style="background:none;border:none;color:var(--wtl-text);opacity:0.3;cursor:pointer;
                                 padding:4px 6px;font-size:12px;transition:opacity 0.15s;"
                          title="删除此聊天的所有表格">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
                <div class="wtl-manage-section-body" style="padding:6px 8px;">
                  <div class="wtl-manage-table-item" data-store-type="chat" data-store-id="${escapedId}"
                       style="display:flex;align-items:center;padding:8px 10px;
                               background:${isEmpty ? 'rgba(255,200,50,0.06)' : 'rgba(255,255,255,0.02)'};
                               border-radius:6px;cursor:pointer;transition:background 0.15s;
                               border:1px solid ${isEmpty ? 'rgba(255,200,50,0.2)' : 'transparent'};">
                    <span class="wtl-drag-handle" data-store-type="chat" data-store-id="${escapedId}"
                          style="cursor:grab;opacity:0.3;padding:4px 6px;margin-right:4px;
                                 font-size:12px;transition:opacity 0.15s;user-select:none;"
                          title="拖拽排序">
                      <i class="fa-solid fa-grip-vertical"></i>
                    </span>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;opacity:0.7;">表格 1</div>
                    </div>
                    <span style="font-size:10px;opacity:0.35;">${item.totalRows} 行</span>
                  </div>
                </div>
              </div>`;
            } else {
              html += `
              <div class="wtl-manage-section" data-store-type="chat" data-store-id="${escapedId}" data-is-current="false"
                   style="margin-bottom:6px;border-radius:8px;overflow:hidden;
                          border:1px solid transparent;background:rgba(255,255,255,0.02);">
                <div class="wtl-manage-section-header wtl-collapse-toggle"
                     style="display:flex;align-items:center;padding:10px 12px;
                            cursor:pointer;transition:background 0.15s;">
                  <span class="wtl-collapse-arrow" style="font-size:10px;opacity:0.4;margin-right:8px;
                         transition:transform 0.2s;display:inline-block;">▶</span>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${escapedName}
                      ${isEmpty ? '<span style="margin-left:6px;font-size:10px;color:#e5c07b;font-weight:normal;">(空表格)</span>' : ''}
                    </div>
                    <div style="font-size:11px;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${escapedSub}
                    </div>
                  </div>
                  <span style="font-size:11px;opacity:0.4;white-space:nowrap;margin-right:8px;">
                    ${item.tableCount} 个表格 · ${item.totalRows} 行
                  </span>
                  <button class="wtl-manage-delete-btn" data-store-type="chat" data-store-id="${escapedId}"
                          style="background:none;border:none;color:var(--wtl-text);opacity:0.3;cursor:pointer;
                                 padding:4px 6px;font-size:12px;transition:opacity 0.15s;"
                          title="删除此聊天的所有表格">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
                <div class="wtl-manage-section-body" style="display:none;padding:6px 8px;">
                  <div class="wtl-manage-table-item" data-store-type="chat" data-store-id="${escapedId}"
                       style="display:flex;align-items:center;padding:8px 10px;
                               background:${isEmpty ? 'rgba(255,200,50,0.06)' : 'rgba(255,255,255,0.02)'};
                               border-radius:6px;cursor:pointer;transition:background 0.15s;
                               border:1px solid ${isEmpty ? 'rgba(255,200,50,0.2)' : 'transparent'};">
                    <span class="wtl-drag-handle" data-store-type="chat" data-store-id="${escapedId}"
                          style="cursor:grab;opacity:0.3;padding:4px 6px;margin-right:4px;
                                 font-size:12px;transition:opacity 0.15s;user-select:none;"
                          title="拖拽排序">
                      <i class="fa-solid fa-grip-vertical"></i>
                    </span>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;opacity:0.7;">表格 1</div>
                    </div>
                    <span style="font-size:10px;opacity:0.35;">${item.totalRows} 行</span>
                  </div>
                </div>
              </div>`;
            }
          } else {
            // 角色/世界书/本地视图：简洁列表，无折叠
            html += `
            <div class="wtl-manage-section" data-store-type="${activeTab}" data-store-id="${escapedId}"
                 style="margin-bottom:6px;border-radius:8px;overflow:hidden;
                        border:1px solid transparent;background:rgba(255,255,255,0.02);">
              <div class="wtl-manage-section-header"
                   style="display:flex;align-items:center;padding:10px 12px;cursor:default;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapedName}
                    ${isEmpty ? '<span style="margin-left:6px;font-size:10px;color:#e5c07b;font-weight:normal;">(空表格)</span>' : ''}
                  </div>
                  <div style="font-size:11px;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ID: ${escapedId}
                  </div>
                </div>
                <span style="font-size:11px;opacity:0.4;white-space:nowrap;margin-right:8px;">
                  ${item.tableCount} 个表格 · ${item.totalRows} 行
                </span>
                <button class="wtl-manage-delete-btn" data-store-type="${activeTab}" data-store-id="${escapedId}"
                        style="background:none;border:none;color:var(--wtl-text);opacity:0.3;cursor:pointer;
                               padding:4px 6px;font-size:12px;transition:opacity 0.15s;"
                        title="删除">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>`;
          }
        });

        bodyEl.innerHTML = html;

        // 折叠/展开逻辑（仅聊天标签页）
        if (activeTab === 'chat') {
          bodyEl.querySelectorAll('.wtl-collapse-toggle').forEach(header => {
            header.addEventListener('click', (e) => {
              if (e.target.closest('.wtl-manage-delete-btn')) return;
              const section = header.closest('.wtl-manage-section');
              const body = section.querySelector('.wtl-manage-section-body');
              const arrow = header.querySelector('.wtl-collapse-arrow');
              if (body.style.display === 'none') {
                body.style.display = 'block';
                arrow.style.transform = 'rotate(90deg)';
              } else {
                body.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
              }
            });
            header.addEventListener('mouseenter', () => {
              header.style.background = 'rgba(255,255,255,0.04)';
            });
            header.addEventListener('mouseleave', () => {
              header.style.background = '';
            });
          });

          // 表格项点击：切换到该聊天
          bodyEl.querySelectorAll('.wtl-manage-table-item').forEach(item => {
            item.addEventListener('click', async (e) => {
              if (e.target.closest('.wtl-manage-delete-btn')) return;
              if (e.target.closest('.wtl-drag-handle')) return;
              const storeId = item.dataset.storeId;
              if (popupInstance && typeof popupInstance.close === 'function') {
                popupInstance.close();
              }
              await this._switchToChat(storeId);
            });
            item.addEventListener('mouseenter', () => {
              item.style.background = 'rgba(255,255,255,0.06)';
            });
            item.addEventListener('mouseleave', () => {
              item.style.background = 'rgba(255,255,255,0.02)';
            });
          });

          // 拖拽把手 hover
          bodyEl.querySelectorAll('.wtl-drag-handle').forEach(handle => {
            handle.addEventListener('mouseenter', () => { handle.style.opacity = '0.7'; });
            handle.addEventListener('mouseleave', () => { handle.style.opacity = '0.3'; });
          });

          // 拖拽排序
          let dragSrcSection = null;
          let dragPlaceholder = null;
          bodyEl.querySelectorAll('.wtl-drag-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
              e.preventDefault();
              dragSrcSection = handle.closest('.wtl-manage-section');
              if (!dragSrcSection) return;
              const rect = dragSrcSection.getBoundingClientRect();
              dragPlaceholder = document.createElement('div');
              dragPlaceholder.style.cssText = `
                height:${rect.height}px;margin-bottom:6px;
                border:2px dashed var(--wtl-accent);border-radius:8px;
                opacity:0.5;pointer-events:none;
              `;
              dragSrcSection.style.opacity = '0.4';
              dragSrcSection.parentNode.insertBefore(dragPlaceholder, dragSrcSection);

              const onMouseMove = (ev) => {
                if (!dragPlaceholder) return;
                const sections = [...bodyEl.querySelectorAll('.wtl-manage-section')];
                let targetIdx = sections.indexOf(dragPlaceholder);
                for (let i = 0; i < sections.length; i++) {
                  const sec = sections[i];
                  if (sec === dragPlaceholder || sec === dragSrcSection) continue;
                  const br = sec.getBoundingClientRect();
                  if (ev.clientY < br.top + br.height / 2) { targetIdx = i; break; }
                  targetIdx = i + 1;
                }
                const currentIdx = sections.indexOf(dragPlaceholder);
                if (targetIdx !== currentIdx && targetIdx < sections.length) {
                  bodyEl.insertBefore(dragPlaceholder, sections[targetIdx]);
                } else if (targetIdx >= sections.length) {
                  bodyEl.appendChild(dragPlaceholder);
                }
              };

              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (dragPlaceholder && dragSrcSection) {
                  dragPlaceholder.parentNode?.insertBefore(dragSrcSection, dragPlaceholder);
                  dragPlaceholder.remove();
                  dragSrcSection.style.opacity = '1';
                }
                dragPlaceholder = null;
                dragSrcSection = null;
                const newOrder = [];
                bodyEl.querySelectorAll('.wtl-manage-section').forEach(sec => {
                  newOrder.push(sec.dataset.storeId);
                });
                saveChatOrder(newOrder);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            });
          });
        }

        // 删除按钮（所有标签页通用）
        bodyEl.querySelectorAll('.wtl-manage-delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const storeType = btn.dataset.storeType;
            const storeId = btn.dataset.storeId;
            const label = { chat: '聊天', character: '角色', worldbook: '世界书', local: '本地' }[storeType] || storeType;
            if (confirm(`确定要删除此${label}的所有表格吗？\n${storeId}`)) {
              // 1. 删除 localStorage 中该 store 下的所有表格相关数据
              //    注意：兼容旧格式 wtl.tableJson.{chatKey}（无类型前缀）
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (!key) continue;
                const matched =
                  // 新格式：wtl.tableJson.{type}.{id}
                  key.startsWith(`wtl.tableJson.${storeType}.${storeId}`) ||
                  key.startsWith(`wtl.table.${storeType}.${storeId}`) ||
                  key.startsWith(`wtl.hiddenRows.${storeType}.${storeId}`) ||
                  key.startsWith(`wtl.history.${storeType}.${storeId}`) ||
                  key.startsWith(`wtl.session.${storeId}`) ||
                  // 旧格式兼容：wtl.tableJson.{chatKey}（无类型前缀，仅 chat 类型）
                  (storeType === 'chat' && key === `wtl.tableJson.${storeId}`) ||
                  (storeType === 'chat' && key === `wtl.table.${storeId}`) ||
                  (storeType === 'chat' && key === `wtl.hiddenRows.${storeId}`) ||
                  (storeType === 'chat' && key === `wtl.history.${storeId}`);
                if (matched) {
                  localStorage.removeItem(key);
                }
              }
              // 2. 从排序中移除
              if (storeType === 'chat') {
                const order = loadChatOrder().filter(k => k !== storeId);
                saveChatOrder(order);
              }
              // 3. 对于聊天类型，清除 chat metadata 中的表格数据
              //    因为 saveTableForChatState 会优先保存到 chat metadata，
              //    如果只删 localStorage，下次加载聊天时又会从 metadata 恢复
              if (storeType === 'chat') {
                try {
                  const currentChatKey = getChatKeyFromContext(this.ctx);
                  if (storeId === currentChatKey) {
                    // 删除的是当前聊天：直接改内存里的 chat_metadata 再落盘
                    const metadata = getChatMetadataFromContext(this.ctx);
                    if (metadata && typeof metadata === 'object') {
                      if (metadata.WorldTreeLibrary) {
                        delete metadata.WorldTreeLibrary;
                      }
                      await persistChatMetadata(this.ctx);
                    }
                    // 同时重置当前内存中的表格状态，避免残留
                    this.state.hiddenRows = {};
                    if (this.ui.tableMdEl) this.ui.tableMdEl.value = '';
                    if (this.viewRenderer) this.viewRenderer.renderTable({ sections: [] });
                  } else {
                    // 酒馆内存里只有当前聊天的 metadata，别的聊天改不了聊天文件，
                    // 上面清掉的 localStorage 就是唯一数据源，这里不需要（也无法）再动 metadata。
                    console.warn('[WTL] 删除的是非当前聊天，仅清理了 localStorage:', storeId);
                  }
                } catch (e) {
                  console.warn('[WTL] Failed to clear chat metadata for', storeId, e);
                }
              }
              await loadTableList();
            }
          });
          btn.addEventListener('mouseenter', () => {
            btn.style.opacity = '0.8';
            btn.style.color = '#e06c75';
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.opacity = '0.3';
            btn.style.color = '';
          });
        });

      } catch (error) {
        console.error('[WTL] Failed to load table list:', error);
        bodyEl.innerHTML = `
          <div style="text-align:center;padding:24px;color:#e06c75;">
            <i class="fa-solid fa-triangle-exclamation"></i> 加载失败，请重试
          </div>
        `;
      }
    };

    const popup = new Popup(container, popupModule.POPUP_TYPE.CONFIRM, '', {
      okButton: '刷新',
      cancelButton: '关闭',
      wide: false,
      large: false,
      allowVerticalScrolling: true,
      onOpen: () => {
        popupInstance = popup;
        loadTableList();
      },
    });

    popupInstance = popup;
    const result = await popup.show();
    if (result === 1 || result === popupModule.POPUP_RESULT?.AFFIRMATIVE) {
      await loadTableList();
    }
  }

  async _switchToChat(chatKey) {
    try {
      const chatApi = await import('../../../shared/api/chatApi.js');
      const allChats = await chatApi.fetchAllChats();
      const matched = allChats.find(c =>
        c.fileName === chatKey ||
        c.globalKey === chatKey ||
        c.globalKey?.endsWith('|' + chatKey) ||
        c.fileName?.replace(/\.jsonl$/i, '') === chatKey
      );
      if (matched) {
        await chatApi.openCharacterChat(matched.charId, matched.fileName);
        return;
      }
    } catch (e) {
      console.warn('[WTL] Failed to switch chat via API:', e);
    }
    this.setStatus('无法切换到该聊天，请手动选择', 'warning');
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export function createTableController(uiRefs, context, defaults) {
  return new TableController(uiRefs, context, defaults);
}
