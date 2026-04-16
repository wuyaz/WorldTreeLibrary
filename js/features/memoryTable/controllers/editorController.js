// @ts-nocheck
/**
 * Editor Controller for Memory Table
 * Handles table editing, template editing, reset operations, and history
 */

import { 
  bindResetAndHistoryControls, 
  bindEditorResetGroup, 
  bindTemplateEditorGroup 
} from '../ui/editorControllers.js';
import { createTemplateEditorController } from '../ui/templateEditor.js';
import { createHistoryModalController } from '../ui/history.js';
import { wrapTable, stripTableWrapper, ensureTableWrapper } from '../data/markdown.js';
import { parseSchemaToTemplate, templateToSchemaMarkdown } from '../data/template.js';
import { getFeatureFlags } from '../../../core/storage.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class EditorController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.templateEditor = null;
    this.historyController = null;
    
    this.state = {
      tableContent: '',
      templateContent: '',
      schemaContent: '',
      isTemplateEditorOpen: false,
      isTableEditing: false,
      historyIndex: 0,
      historyStack: []
    };
  }
  
  initialize() {
    if (!this.ui || !this.ui.root) {
      console.warn('[WTL EditorController] UI refs not ready, delaying initialization');
      return;
    }
    this.initializeControllers();
    this.bindEvents();
    this.loadInitialState();
    this.syncUI();
  }
  
  initializeControllers() {
    // Initialize template editor controller
    this.templateEditor = createTemplateEditorController({
      templateEditorEl: this.ui.templateEditorEl,
      templateSectionGridEl: this.ui.templateSectionGridEl,
      templateColumnGridEl: this.ui.templateColumnGridEl,
      saveTemplateBtn: this.ui.saveTemplateBtn,
      cancelTemplateBtn: this.ui.cancelTemplateBtn,
      renderTemplateSections: this.ctx.renderTemplateSections || (() => {}),
      renderTemplateColumns: this.ctx.renderTemplateColumns || (() => {}),
      updateSchemaPreview: this.ctx.updateSchemaPreview || (() => {}),
      getCurrentTemplateState: this.getCurrentTemplateState.bind(this),
      setCurrentTemplateState: this.setCurrentTemplateState.bind(this)
    });
    
    // Initialize history controller
    this.historyController = createHistoryModalController({
      historyBackBtn: this.ui.historyBackBtn,
      historyUndoBtn: this.ui.historyUndoBtn,
      historyBtn: this.ui.historyBtn,
      openHistoryModal: this.openHistoryModal.bind(this),
      restoreHistoryByOffset: this.restoreHistoryByOffset.bind(this)
    });
  }
  
  bindEvents() {
    // Bind editor reset controls
    bindEditorResetGroup({
      reset: {
        resetSchemaBtn: this.ui.resetSchemaBtn,
        blockResetEl: this.ui.blockResetEl,
        refBlockResetEl: this.ui.refBlockResetEl
      },
      history: {
        historyBackBtn: this.ui.historyBackBtn,
        historyUndoBtn: this.ui.historyUndoBtn,
        historyBtn: this.ui.historyBtn
      },
      common: {
        makeModalSaveButton: this.ctx.makeModalSaveButton || (() => {}),
        openConfirmModal: this.ctx.openConfirmModal || (() => {}),
        saveState: this.ctx.saveState || (() => Promise.resolve()),
        refreshPromptPreview: this.ctx.refreshPromptPreview || (() => Promise.resolve()),
        setStatus: this.ctx.setStatus || (() => {})
      },
      schema: {
        getSchemaPreset: this.ctx.getSchemaPreset || (() => ''),
        parseSchemaToTemplate: parseSchemaToTemplate,
        renderJsonToMarkdown: this.ctx.renderJsonToMarkdown || (() => ''),
        buildEmptyTableFromTemplate: this.ctx.buildEmptyTableFromTemplate || (() => ({})),
        buildTemplatePrompt: this.ctx.buildTemplatePrompt || (() => ''),
        schemaEl: this.ui.schemaEl,
        tableMdEl: this.ui.tableMdEl,
        renderPreview: this.ctx.renderPreview || (() => {}),
        renderTemplateSections: this.ctx.renderTemplateSections || (() => {}),
        renderTemplateColumns: this.ctx.renderTemplateColumns || (() => {}),
        updateSchemaPreview: this.ctx.updateSchemaPreview || (() => {}),
        getBlocksPreset: this.ctx.getBlocksPreset || (() => []),
        renderBlockList: this.ctx.renderBlockList || (() => {}),
        getRefBlocksPreset: this.ctx.getRefBlocksPreset || (() => []),
        renderRefBlockList: this.ctx.renderRefBlockList || (() => {}),
        restoreHistoryByOffset: this.restoreHistoryByOffset.bind(this),
        openHistoryModal: this.openHistoryModal.bind(this),
        onSchemaReset: this.handleSchemaReset.bind(this)
      }
    });
    
    // Bind template editor controls
    bindTemplateEditorGroup({
      controls: {
        editTemplateBtn: this.ui.editTemplateBtn,
        templateEditorEl: this.ui.templateEditorEl,
        saveTemplateBtn: this.ui.saveTemplateBtn,
        cancelTemplateBtn: this.ui.cancelTemplateBtn
      },
      dialog: {
        openConfirmModal: this.ctx.openConfirmModal || (() => {}),
        makeModalSaveButton: this.ctx.makeModalSaveButton || (() => {})
      },
      renderers: {
        renderTemplateSections: this.ctx.renderTemplateSections || (() => {}),
        renderTemplateColumns: this.ctx.renderTemplateColumns || (() => {})
      },
      preview: {
        updateSchemaPreview: this.ctx.updateSchemaPreview || (() => {})
      },
      onTemplateSave: this.handleTemplateSave.bind(this),
      onTemplateCancel: this.handleTemplateCancel.bind(this)
    });
    
    // Bind table editing controls
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.addEventListener('click', () => {
        this.toggleTableEditing();
      });
    }
    
    // Bind event bus listeners
    eventBus.on(EVENTS.TABLE_CONTENT_CHANGED, this.handleTableContentChanged.bind(this));
    eventBus.on(EVENTS.TEMPLATE_CONTENT_CHANGED, this.handleTemplateContentChanged.bind(this));
    eventBus.on(EVENTS.SCHEMA_CONTENT_CHANGED, this.handleSchemaContentChanged.bind(this));
  }
  
  loadInitialState() {
    // Load from localStorage or context
    const savedTable = localStorage.getItem('wtl.tableContent') || '';
    const savedTemplate = localStorage.getItem('wtl.templateContent') || '';
    const savedSchema = localStorage.getItem('wtl.schemaContent') || '';
    
    this.state.tableContent = savedTable;
    this.state.templateContent = savedTemplate;
    this.state.schemaContent = savedSchema;
    
    // Load history stack
    const savedHistory = localStorage.getItem('wtl.historyStack');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          this.state.historyStack = parsed;
        }
      } catch (e) {
        console.warn('[WTL] Failed to parse history stack:', e);
      }
    }
  }
  
  syncUI() {
    // Update UI elements with current state
    if (this.ui.tableMdEl && this.ui.tableMdEl.value !== this.state.tableContent) {
      this.ui.tableMdEl.value = this.state.tableContent;
    }
    
    if (this.ui.schemaEl && this.ui.schemaEl.value !== this.state.schemaContent) {
      this.ui.schemaEl.value = this.state.schemaContent;
    }
    
    // Update template editor visibility
    if (this.ui.templateEditorEl) {
      this.ui.templateEditorEl.style.display = this.state.isTemplateEditorOpen ? 'block' : 'none';
    }
    
    // Update table editing button state
    if (this.ui.editTableBtn) {
      this.ui.editTableBtn.textContent = this.state.isTableEditing ? '完成编辑' : '编辑表格';
      this.ui.editTableBtn.dataset.editing = this.state.isTableEditing ? 'true' : 'false';
    }
  }
  
  // Public methods
  openTemplateEditor() {
    this.state.isTemplateEditorOpen = true;
    this.syncUI();
    eventBus.emit(EVENTS.TEMPLATE_EDITOR_OPENED);
  }
  
  closeTemplateEditor() {
    this.state.isTemplateEditorOpen = false;
    this.syncUI();
    eventBus.emit(EVENTS.TEMPLATE_EDITOR_CLOSED);
  }
  
  toggleTableEditing() {
    this.state.isTableEditing = !this.state.isTableEditing;
    
    if (this.state.isTableEditing) {
      // Enable table editing mode
      if (this.ui.tableMdEl) {
        this.ui.tableMdEl.readOnly = false;
        this.ui.tableMdEl.classList.add('is-editing');
      }
    } else {
      // Disable table editing mode
      if (this.ui.tableMdEl) {
        this.ui.tableMdEl.readOnly = true;
        this.ui.tableMdEl.classList.remove('is-editing');
      }
      
      // Save changes
      this.saveTableContent();
    }
    
    this.syncUI();
    eventBus.emit(EVENTS.TABLE_EDITING_TOGGLED, { isEditing: this.state.isTableEditing });
  }
  
  saveTableContent() {
    if (this.ui.tableMdEl) {
      const newContent = this.ui.tableMdEl.value;
      if (newContent !== this.state.tableContent) {
        this.state.tableContent = newContent;
        this.pushToHistory('table', this.state.tableContent);
        localStorage.setItem('wtl.tableContent', newContent);
        eventBus.emit(EVENTS.TABLE_CONTENT_SAVED, { content: newContent });
      }
    }
  }
  
  saveTemplateContent() {
    if (this.ui.schemaEl) {
      const newContent = this.ui.schemaEl.value;
      if (newContent !== this.state.schemaContent) {
        this.state.schemaContent = newContent;
        this.pushToHistory('schema', this.state.schemaContent);
        localStorage.setItem('wtl.schemaContent', newContent);
        eventBus.emit(EVENTS.SCHEMA_CONTENT_SAVED, { content: newContent });
      }
    }
  }
  
  resetTableToTemplate() {
    const templateState = this.getCurrentTemplateState();
    if (!templateState) return;
    
    const newTable = this.ctx.renderJsonToMarkdown?.(this.ctx.buildEmptyTableFromTemplate?.(templateState)) || '';
    
    this.state.tableContent = newTable;
    if (this.ui.tableMdEl) {
      this.ui.tableMdEl.value = newTable;
    }
    
    this.pushToHistory('table', newTable);
    eventBus.emit(EVENTS.TABLE_RESET_TO_TEMPLATE, { content: newTable });
    
    if (this.ctx.renderPreview) {
      this.ctx.renderPreview(newTable);
    }
    
    if (this.ctx.saveState) {
      this.ctx.saveState();
    }
  }
  
  getCurrentTemplateState() {
    if (this.ui.schemaEl) {
      return parseSchemaToTemplate(this.ui.schemaEl.value);
    }
    return null;
  }
  
  setCurrentTemplateState(templateState) {
    if (!templateState) return;
    
    const schemaMarkdown = templateToSchemaMarkdown(templateState);
    const templatePrompt = this.ctx.buildTemplatePrompt?.(templateState) || schemaMarkdown;
    
    this.state.schemaContent = schemaMarkdown;
    if (this.ui.schemaEl) {
      this.ui.schemaEl.value = templatePrompt;
    }
    
    this.pushToHistory('schema', schemaMarkdown);
    eventBus.emit(EVENTS.TEMPLATE_STATE_CHANGED, { templateState });
  }
  
  // History management
  pushToHistory(type, content) {
    const historyEntry = {
      type,
      content,
      timestamp: Date.now()
    };
    
    // Clear future history if we're not at the end
    if (this.state.historyIndex < this.state.historyStack.length - 1) {
      this.state.historyStack = this.state.historyStack.slice(0, this.state.historyIndex + 1);
    }
    
    this.state.historyStack.push(historyEntry);
    this.state.historyIndex = this.state.historyStack.length - 1;
    
    // Keep history size manageable
    if (this.state.historyStack.length > 50) {
      this.state.historyStack = this.state.historyStack.slice(-50);
      this.state.historyIndex = this.state.historyStack.length - 1;
    }
    
    // Save to localStorage
    localStorage.setItem('wtl.historyStack', JSON.stringify(this.state.historyStack));
  }
  
  async restoreHistoryByOffset(offset) {
    const newIndex = this.state.historyIndex + offset;
    
    if (newIndex < 0 || newIndex >= this.state.historyStack.length) {
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`无法${offset < 0 ? '后退' : '前进'}: 历史记录${offset < 0 ? '起点' : '终点'}`);
      }
      return;
    }
    
    const entry = this.state.historyStack[newIndex];
    this.state.historyIndex = newIndex;
    
    // Restore content based on type
    switch (entry.type) {
      case 'table':
        this.state.tableContent = entry.content;
        if (this.ui.tableMdEl) {
          this.ui.tableMdEl.value = entry.content;
        }
        if (this.ctx.renderPreview) {
          this.ctx.renderPreview(entry.content);
        }
        break;
      
      case 'schema':
        this.state.schemaContent = entry.content;
        if (this.ui.schemaEl) {
          this.ui.schemaEl.value = entry.content;
        }
        if (this.ctx.updateSchemaPreview) {
          this.ctx.updateSchemaPreview();
        }
        break;
    }
    
    if (this.ctx.setStatus) {
      this.ctx.setStatus(`已${offset < 0 ? '后退' : '前进'}到 ${new Date(entry.timestamp).toLocaleTimeString()}`);
    }
    
    eventBus.emit(EVENTS.HISTORY_RESTORED, { entry, offset });
  }
  
  openHistoryModal() {
    // This would open a modal showing history entries
    // For now, just emit an event
    eventBus.emit(EVENTS.HISTORY_MODAL_OPENED, { 
      historyStack: this.state.historyStack,
      historyIndex: this.state.historyIndex 
    });
  }
  
  // Event handlers
  handleTableContentChanged(data) {
    this.state.tableContent = data.content || '';
    this.syncUI();
  }
  
  handleTemplateContentChanged(data) {
    this.state.templateContent = data.content || '';
    this.syncUI();
  }
  
  handleSchemaContentChanged(data) {
    this.state.schemaContent = data.content || '';
    this.syncUI();
  }
  
  handleSchemaReset(data) {
    this.state.schemaContent = data.schemaSource || '';
    this.state.templateContent = JSON.stringify(data.templateState || {});
    this.syncUI();
  }
  
  handleTemplateSave() {
    this.saveTemplateContent();
    this.closeTemplateEditor();
  }
  
  handleTemplateCancel() {
    this.closeTemplateEditor();
  }
  
  // Cleanup
  destroy() {
    eventBus.off(EVENTS.TABLE_CONTENT_CHANGED, this.handleTableContentChanged.bind(this));
    eventBus.off(EVENTS.TEMPLATE_CONTENT_CHANGED, this.handleTemplateContentChanged.bind(this));
    eventBus.off(EVENTS.SCHEMA_CONTENT_CHANGED, this.handleSchemaContentChanged.bind(this));
    
    if (this.templateEditor?.destroy) {
      this.templateEditor.destroy();
    }
    
    if (this.historyController?.destroy) {
      this.historyController.destroy();
    }
  }
}