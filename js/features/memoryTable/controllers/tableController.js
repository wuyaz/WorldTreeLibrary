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
  updateTableRows as updatePreviewTableRows,
  moveTableRow,
  applyPreviewEditsToMarkdown as applyTablePreviewEdits,
  reorderColumnsInMarkdown,
  reorderSectionsInMarkdown
} from '../ui/tablePreview.js';
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
import {
  ensureAutoFillDefaults,
  collectLoadStateSnapshot,
  seedStoredLoadStateSnapshot,
  persistCoreUiState
} from '../services/stateService.js';
import {
  buildManagedPromptInjectionItems,
  getManagedPromptInjectionEntryName
} from '../services/injectionService.js';
import { safeParseJson } from '../../../shared/utils/index.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class TableController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    this.state = {
      running: false,
      lastRef: null,
      manualState: null,
      activeSection: '',
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
    
    this.initialize();
  }
  
  initialize() {
    this.bindEvents();
    this.loadState();
    this.applyFeatureUi();
    this.ensureHooks();
  }
  
  bindEvents() {
    // Table editing events
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.addEventListener('click', () => this.toggleTableEditMode());
    }
    
    if (this.ui.clearTableBtn) {
      this.ui.clearTableBtn.addEventListener('click', () => this.clearTable());
    }
    
    // Table preview events
    if (this.ui.tablePreviewEl) {
      this.ui.tablePreviewEl.addEventListener('click', (e) => this.handleTablePreviewClick(e));
    }
    
    // Drag and drop events
    if (this.ui.blockListEl) {
      this.ui.blockListEl.addEventListener('dragend', () => this.handleBlockDragEnd());
      this.bindDrag(this.ui.blockListEl);
    }
    
    if (this.ui.refBlockListEl) {
      this.ui.refBlockListEl.addEventListener('dragend', () => this.handleRefBlockDragEnd());
      this.bindDrag(this.ui.refBlockListEl);
    }
  }
  
  async toggleTableEditMode() {
    this.state.tableEditMode = !this.state.tableEditMode;
    this.updateEditModeUI();
    
    if (this.state.tableEditMode) {
      await this.loadTableForEditing();
    }
  }
  
  updateEditModeUI() {
    if (this.ui.tablePreviewEl) {
      this.ui.tablePreviewEl.classList.toggle('wtl-edit-mode', this.state.tableEditMode);
    }
    
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.textContent = this.state.tableEditMode ? '退出编辑' : '编辑表格';
      this.ui.editTableBtn.classList.toggle('wtl-btn-primary', this.state.tableEditMode);
    }
  }
  
  async loadTableForEditing() {
    try {
      const tableMd = await this.loadTableForChat();
      const tableJson = parseMarkdownTableToJson(tableMd);
      
      // Update preview table
      if (this.ui.tablePreviewEl) {
        updatePreviewTableRows(this.ui.tablePreviewEl, tableJson.rows || []);
      }
      
      eventBus.emit(EVENTS.MEMORY_TABLE_LOADED, tableJson);
    } catch (error) {
      console.error('[WTL TableController] Failed to load table for editing:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'loadTableForEditing', 
        error 
      });
    }
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
      resolveSchemaByScope: this.resolveSchemaByScope.bind(this),
      loadSchemaForMode: this.loadSchemaForMode.bind(this),
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
      await saveTableForChatState({
        ctx: this.ctx,
        tableMd: emptyTable,
        defaults: this.defaults,
        safeParseJson,
        parseMarkdownTableToJson,
        renderJsonToMarkdown,
        getDefaultSchemaText: () => this.getDefaultSchemaText(),
        resolveSchemaByScope: this.resolveSchemaByScope.bind(this)
      });
      
      this.state.hiddenRows = {};
      await this.loadTableForEditing();
      
      eventBus.emit(EVENTS.MEMORY_TABLE_CLEARED);
      this.setStatus('表格已清空', 'success');
    } catch (error) {
      console.error('[WTL TableController] Failed to clear table:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'clearTable', 
        error 
      });
      this.setStatus('清空表格失败', 'error');
    }
  }
  
  async saveTable(tableMd) {
    try {
      await saveTableForChatState({
        ctx: this.ctx,
        tableMd,
        defaults: this.defaults,
        safeParseJson,
        parseMarkdownTableToJson,
        renderJsonToMarkdown,
        getDefaultSchemaText: () => this.getDefaultSchemaText(),
        resolveSchemaByScope: this.resolveSchemaByScope.bind(this)
      });
      
      eventBus.emit(EVENTS.MEMORY_TABLE_SAVED, { tableMd });
      this.setStatus('表格已保存', 'success');
      return true;
    } catch (error) {
      console.error('[WTL TableController] Failed to save table:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'saveTable', 
        error 
      });
      this.setStatus('保存表格失败', 'error');
      return false;
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
    // Implementation for editing a table row
    console.log('Edit row:', rowId);
  }
  
  deleteTableRow(rowId) {
    if (!confirm('确定要删除这一行吗？')) {
      return;
    }
    
    // Implementation for deleting a table row
    console.log('Delete row:', rowId);
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
    // Implementation for drag and drop functionality
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
      const blockOrder = serializeBlockOrder(this.ui.blockListEl);
      const refBlockOrder = serializeBlockOrder(this.ui.refBlockListEl);
      
      persistCoreUiState({
        blockOrder,
        refBlockOrder,
        hiddenRows: this.state.hiddenRows,
        activeSection: this.state.activeSection,
        tableSectionOrder: this.state.tableSectionOrder
      });
      
      eventBus.emit(EVENTS.STORAGE_CHANGED, { type: 'uiState' });
    } catch (error) {
      console.error('[WTL TableController] Failed to save state:', error);
    }
  }
  
  loadState() {
    try {
      const snapshot = collectLoadStateSnapshot();
      
      if (snapshot) {
        this.state.hiddenRows = snapshot.hiddenRows || {};
        this.state.activeSection = snapshot.activeSection || '';
        this.state.tableSectionOrder = snapshot.tableSectionOrder || [];
        
        // Seed stored state if needed
        seedStoredLoadStateSnapshot(snapshot);
      }
    } catch (error) {
      console.error('[WTL TableController] Failed to load state:', error);
    }
  }
  
  applyFeatureUi() {
    const featureFlags = this.getFeatureFlags();
    
    if (this.ui.memoryFeatureDisabledEl) {
      this.ui.memoryFeatureDisabledEl.style.display = 
        featureFlags.memoryTable === false ? 'block' : 'none';
    }
    
    if (this.ui.root) {
      this.ui.root.classList.toggle('wtl-memory-disabled', featureFlags.memoryTable === false);
    }
  }
  
  refreshPromptPreview(force = false) {
    // Implementation for refreshing prompt preview
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
      await reloadChatState();
      await this.loadTableForEditing();
      this.setStatus('聊天状态已更新', 'info');
    } catch (error) {
      console.error('[WTL TableController] Failed to reload chat state:', error);
    }
  }
  
  setStatus(message, type = 'info') {
    if (this.ui.statusEl) {
      this.ui.statusEl.textContent = message;
      this.ui.statusEl.className = `wtl-status wtl-status-${type}`;
      
      // Clear status after 3 seconds
      setTimeout(() => {
        if (this.ui.statusEl.textContent === message) {
          this.ui.statusEl.textContent = '';
          this.ui.statusEl.className = 'wtl-status';
        }
      }, 3000);
    }
  }
  
  // Helper methods
  getDefaultSchemaText() {
    // Implementation for getting default schema text
    return '';
  }
  
  resolveSchemaByScope(scope) {
    // Implementation for resolving schema by scope
    return '';
  }
  
  loadSchemaForMode(mode) {
    // Implementation for loading schema for mode
    return '';
  }
  
  getFeatureFlags() {
    const flags = safeParseJson(localStorage.getItem('wtl.featureFlags')) || {};
    return flags;
  }
  
  // Public API
  getState() {
    return { ...this.state };
  }
  
  updateState(newState) {
    this.state = { ...this.state, ...newState };
  }
  
  destroy() {
    // Cleanup event listeners
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.removeEventListener('click', () => this.toggleTableEditMode());
    }
    
    if (this.ui.clearTableBtn) {
      this.ui.clearTableBtn.removeEventListener('click', () => this.clearTable());
    }
    
    // Remove global hook
    window.__wtlChatHook = false;
    window.__wtlApplyFeatureUi = null;
  }
}

// Factory function for backward compatibility
export function createTableController(uiRefs, context, defaults) {
  return new TableController(uiRefs, context, defaults);
}