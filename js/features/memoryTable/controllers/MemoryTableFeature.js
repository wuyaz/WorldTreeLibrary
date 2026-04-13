// @ts-nocheck
/**
 * Memory Table Feature - Main Entry Point
 * Replaces the monolithic bindings.js with a modular architecture
 */

import { TableController } from './tableController.js';
import { PresetController } from './presetController.js';
import { PromptController } from './promptController.js';
import { PageController } from './pageController.js';
import { EditorController } from './editorController.js';
import { RuntimeController } from './runtimeController.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';
import { getFeatureFlags } from '../../../core/storage.js';

export class MemoryTableFeature {
  constructor() {
    this.uiRefs = null;
    this.controllers = {
      table: null,
      preset: null,
      prompt: null,
      page: null,
      editor: null,
      runtime: null
    };
    
    this.context = null;
    this.defaults = null;
    this.initialized = false;
    this.uiInitialized = false;
  }
  
  /**
   * Initialize the feature
   */
  async initialize() {
    if (this.initialized) {
      console.warn('[WTL MemoryTable] Feature already initialized');
      return;
    }
    
    try {
      // Load feature flags
      const featureFlags = getFeatureFlags();
      if (featureFlags.memoryTable === false) {
        console.log('[WTL MemoryTable] Feature disabled by flags');
        return;
      }
      
      // Initialize controllers will be created when UI is available
      // They need UI references, context, and defaults which are only available in initializeUI
      this.initialized = true;
      
      eventBus.emit(EVENTS.UI_READY, { feature: 'memoryTable' });
      console.log('[WTL MemoryTable] Feature initialized (UI pending)');
      
    } catch (error) {
      console.error('[WTL MemoryTable] Failed to initialize feature:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, {
        context: 'memoryTable.initialize',
        error
      });
      throw error;
    }
  }
  
  /**
   * Initialize UI when the tab is opened
   */
  initializeUI(root, context, defaults) {
    if (!root) {
      console.error('[WTL MemoryTable] No root element provided for UI initialization');
      return;
    }
    
    if (this.uiInitialized) {
      console.warn('[WTL MemoryTable] UI already initialized');
      return;
    }
    
    try {
      this.context = context;
      this.defaults = defaults;
      
      // Get UI references
      this.uiRefs = this.getUiRefs(root);
      
      // Initialize controllers with UI references
      this.controllers.table = new TableController(this.uiRefs, context, defaults);
      this.controllers.preset = new PresetController(this.uiRefs, context, defaults);
      this.controllers.prompt = new PromptController(this.uiRefs, context, defaults);
      this.controllers.page = new PageController(this.uiRefs, context, defaults);
      this.controllers.editor = new EditorController(this.uiRefs, context, defaults);
      this.controllers.runtime = new RuntimeController(this.uiRefs, context, defaults);
      
      // Bind cross-controller events
      this.bindCrossControllerEvents();
      
      // Apply initial UI state
      this.applyFeatureUi();
      
      // Set up global hook for chat changes
      this.setupChatHooks();
      
      this.uiInitialized = true;
      
      eventBus.emit(EVENTS.MEMORY_TABLE_LOADED, { root });
      
      console.log('[WTL MemoryTable] UI initialized successfully');
      
    } catch (error) {
      console.error('[WTL MemoryTable] Failed to initialize UI:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, {
        context: 'memoryTable.initializeUI',
        error
      });
    }
  }
  
  /**
   * Get UI element references from root
   */
  getUiRefs(root) {
    const byId = (id) => {
      if (root) {
        const el = root.querySelector(`#${id}`);
        if (el) return el;
      }
      return document.getElementById(id);
    };
    
    // 完整UI引用映射，基于HTML文件中的所有ID
    return {
      // 核心元素
      root: root,
      statusEl: byId('wtl-status'),
      pageMainEl: byId('wtl-page-main'),
      pageConfigEl: byId('wtl-page-config'),
      memoryFeatureDisabledEl: byId('wtl-memory-feature-disabled'),
      
      // 表格控制
      editTableBtn: byId('wtl-edit-table'),
      clearTableBtn: byId('wtl-clear-table'),
      tablePreviewEl: byId('wtl-table-preview'),
      blockListEl: byId('wtl-block-list'),
      refBlockListEl: byId('wtl-ref-block-list'),
      tableMdEl: byId('wtl-table-md'),
      templateEditorEl: byId('wtl-template-editor'),
      
      // 提示词控制
      prePromptEl: byId('wtl-preprompt'),
      instructionEl: byId('wtl-instruction'),
      schemaEl: byId('wtl-schema'),
      sendModeEl: byId('wtl-send-mode'),
      instModeEl: byId('wtl-inst-mode'),
      schemaModeSendEl: byId('wtl-schema-mode-send'),
      tableModeEl: byId('wtl-table-mode'),
      stModeEl: byId('wtl-mode-st'),
      
      // 预设控制
      prePromptPresetEl: byId('wtl-preprompt-preset'),
      instructionPresetEl: byId('wtl-instruction-preset'),
      schemaPresetEl: byId('wtl-schema-preset'),
      openaiPresetEl: byId('wtl-openai-preset'),
      openaiPresetNameEl: byId('wtl-openai-preset-name'),
      openaiPresetLoadEl: byId('wtl-openai-preset-load'),
      openaiPresetDelEl: byId('wtl-openai-preset-del'),
      openaiRefreshEl: byId('wtl-openai-refresh'),
      schemaPresetNameEl: byId('wtl-schema-preset-name'),
      schemaPresetLoadEl: byId('wtl-schema-preset-load'),
      schemaPresetSaveEl: byId('wtl-schema-preset-save'),
      schemaPresetRenameEl: byId('wtl-schema-preset-rename'),
      schemaPresetDelEl: byId('wtl-schema-preset-del'),
      schemaPresetImportEl: byId('wtl-schema-preset-import'),
      schemaPresetExportEl: byId('wtl-schema-preset-export'),
      schemaPresetFileEl: byId('wtl-schema-preset-file'),
      prePromptPresetNameEl: byId('wtl-preprompt-preset-name'),
      prePromptPresetLoadEl: byId('wtl-preprompt-preset-load'),
      prePromptPresetSaveEl: byId('wtl-preprompt-preset-save'),
      prePromptPresetRenameEl: byId('wtl-preprompt-preset-rename'),
      prePromptPresetDelEl: byId('wtl-preprompt-preset-del'),
      prePromptPresetImportEl: byId('wtl-preprompt-preset-import'),
      prePromptPresetExportEl: byId('wtl-preprompt-preset-export'),
      prePromptPresetFileEl: byId('wtl-preprompt-preset-file'),
      prepromptPresetEl: byId('wtl-preprompt-preset'),  // 注意：这里有两个不同的变量名
      prepromptPresetNameEl: byId('wtl-preprompt-preset-name'),
      prepromptPresetLoadEl: byId('wtl-preprompt-preset-load'),
      prepromptPresetSaveEl: byId('wtl-preprompt-preset-save'),
      prepromptPresetRenameEl: byId('wtl-preprompt-preset-rename'),
      prepromptPresetDelEl: byId('wtl-preprompt-preset-del'),
      prepromptPresetImportEl: byId('wtl-preprompt-preset-import'),
      prepromptPresetExportEl: byId('wtl-preprompt-preset-export'),
      prepromptPresetFileEl: byId('wtl-preprompt-preset-file'),
      instructionPresetNameEl: byId('wtl-instruction-preset-name'),
      instructionPresetLoadEl: byId('wtl-instruction-preset-load'),
      instructionPresetSaveEl: byId('wtl-instruction-preset-save'),
      instructionPresetRenameEl: byId('wtl-instruction-preset-rename'),
      instructionPresetDelEl: byId('wtl-instruction-preset-del'),
      instructionPresetImportEl: byId('wtl-instruction-preset-import'),
      instructionPresetExportEl: byId('wtl-instruction-preset-export'),
      instructionPresetFileEl: byId('wtl-instruction-preset-file'),
      schemaBindGlobalEl: byId('wtl-schema-bind-global'),
      schemaBindCharacterEl: byId('wtl-schema-bind-character'),
      schemaBindChatEl: byId('wtl-schema-bind-chat'),
      schemaEffectiveEl: byId('wtl-schema-effective'),
      
      // AI设置
      openaiUrlEl: byId('wtl-openai-url'),
      openaiKeyEl: byId('wtl-openai-key'),
      openaiModelEl: byId('wtl-openai-model'),
      openaiTempEl: byId('wtl-openai-temp'),
      openaiMaxEl: byId('wtl-openai-max'),
      openaiStreamEl: byId('wtl-openai-stream'),
      
      // 自动填表
      runBtn: byId('wtl-run'),
      autoToggleBtn: byId('wtl-auto-toggle'),
      autoFloorsEl: byId('wtl-auto-floors'),
      autoEveryEl: byId('wtl-auto-every'),
      
      // 批量填表
      batchBtn: byId('wtl-batch'),
      batchStartEl: byId('wtl-batch-start'),
      batchEndEl: byId('wtl-batch-end'),
      batchStepEl: byId('wtl-batch-step'),
      
      // 模态框
      modalEl: byId('wtl-modal'),
      modalTitleEl: byId('wtl-modal-title'),
      modalContentEl: byId('wtl-modal-content'),
      modalCustomEl: byId('wtl-modal-custom'),
      modalActionsEl: byId('wtl-modal-actions'),
      modalCloseBtn: byId('wtl-modal-close'),
      
      // 预览
      previewBodyEl: byId('wtl-preview-body'),
      previewHeadEl: byId('wtl-preview-head'),
      logContentEl: byId('wtl-log-content'),
      logPromptEl: byId('wtl-log-prompt'),
      logAiEl: byId('wtl-log-ai'),
      logRefreshBtn: byId('wtl-log-refresh'),
      
      // 其他重要元素
      resetGlobalBtn: byId('wtl-reset-global'),
      openConfigBtn: byId('wtl-open-config'),
      editTemplateBtn: byId('wtl-edit-template'),
      historyBackBtn: byId('wtl-history-back'),
      historyUndoBtn: byId('wtl-history-undo'),
      refreshSchemaBtn: byId('wtl-refresh-schema'),
      wbManualUiEl: byId('wtl-wb-manual-ui'),
      externalSaveBtn: byId('wtl-external-save'),
      
      // PromptController需要的元素
      externalEl: byId('wtl-mode-external'),
      logPromptBtn: byId('wtl-log-prompt'),
      logAiBtn: byId('wtl-log-ai'),
      logRefreshBtn: byId('wtl-log-refresh'),
      logContentEl: byId('wtl-log-content'),
      tableInjectToggleBtn: byId('wtl-table-inject-toggle'),
      instInjectToggleEl: byId('wtl-inst-inject-toggle'),
      schemaInjectToggleEl: byId('wtl-schema-inject-toggle'),
      instBlockEl: byId('wtl-inst-block'),
      schemaBlockEl: byId('wtl-schema-block'),
      instDepthEl: byId('wtl-inst-depth'),
      schemaDepthEl: byId('wtl-schema-depth'),
      instOrderEl: byId('wtl-inst-order'),
      schemaOrderEl: byId('wtl-schema-order'),
      instPosEl: byId('wtl-inst-pos'),
      schemaPosEl: byId('wtl-schema-pos'),
      instRoleEl: byId('wtl-inst-role'),
      schemaRoleEl: byId('wtl-schema-role'),
      
      // EditorController可能需要的元素
      resetInstructionBtn: byId('wtl-reset-instruction'),
      resetPrePromptBtn: byId('wtl-reset-preprompt'),
      resetSchemaBtn: byId('wtl-reset-schema'),
      sectionListEl: byId('wtl-section-list'),
      sectionAddBtn: byId('wtl-section-add'),
      columnListEl: byId('wtl-column-list'),
      columnAddBtn: byId('wtl-column-add'),
      blockAddBtn: byId('wtl-block-add'),
      blockResetBtn: byId('wtl-block-reset'),
      refBlockAddBtn: byId('wtl-ref-block-add'),
      refBlockResetBtn: byId('wtl-ref-block-reset'),
      editorDialogTitle: byId('wtl-editor-dialog-title'),
      editorDialogName: byId('wtl-editor-dialog-name'),
      editorDialogDefinition: byId('wtl-editor-dialog-definition'),
      editorDialogSave: byId('wtl-editor-dialog-save'),
      editorDialogClose: byId('wtl-editor-dialog-close'),
      editorDialogUpdate: byId('wtl-editor-dialog-update'),
      editorDialogUpdateRow: byId('wtl-editor-dialog-update-row'),
      editorDialogInsert: byId('wtl-editor-dialog-insert'),
      editorDialogInsertRow: byId('wtl-editor-dialog-insert-row'),
      editorDialogDelete: byId('wtl-editor-dialog-delete'),
      editorDialogDeleteRow: byId('wtl-editor-dialog-delete-row'),
      editorDialogFill: byId('wtl-editor-dialog-fill'),
      editorDialogFillRow: byId('wtl-editor-dialog-fill-row'),
      editorDialogSend: byId('wtl-editor-dialog-send'),
      editorDialogSendRow: byId('wtl-editor-dialog-send-row'),
      editorDialogUpdateEnabled: byId('wtl-editor-dialog-update-enabled'),
      editorDialogInsertEnabled: byId('wtl-editor-dialog-insert-enabled'),
      editorDialogDeleteEnabled: byId('wtl-editor-dialog-delete-enabled'),
      editorDialogUpdateToggle: byId('wtl-editor-dialog-update-toggle'),
      editorDialogInsertToggle: byId('wtl-editor-dialog-insert-toggle'),
      editorDialogDeleteToggle: byId('wtl-editor-dialog-delete-toggle'),
      editorOverlay: byId('wtl-editor-overlay'),
      
      // 表格相关元素
      tableViewEl: byId('wtl-table-view'),
      tableResizeBtn: byId('wtl-table-resize'),
      tableTabsEl: byId('wtl-table-tabs'),
      wbManualEl: byId('wtl-wb-manual'),
      wbManualRefreshBtn: byId('wtl-wb-manual-refresh'),
      wbManualWrapEl: byId('wtl-wb-manual-wrap'),
      wbModeEl: byId('wtl-wb-mode'),
      externalNavOrder: byId('wtl-external-nav-order'),
      externalNavRef: byId('wtl-external-nav-ref'),
      externalNavWb: byId('wtl-external-nav-wb'),
      externalPanelOrder: byId('wtl-external-panel-order'),
      externalPanelRef: byId('wtl-external-panel-ref'),
      externalPanelWb: byId('wtl-external-panel-wb'),
      
      // 如果需要更多元素，可以继续添加...
      
      // 如果需要更多元素，可以继续添加...
    };
  }
  
  /**
   * Bind events between controllers
   */
  bindCrossControllerEvents() {
    // Table -> Prompt events
    eventBus.on(EVENTS.MEMORY_TABLE_UPDATED, (data) => {
      if (this.controllers.prompt) {
        this.controllers.prompt.handleTableUpdated(data);
      }
    });
    
    // Preset -> Table events
    eventBus.on(EVENTS.PRESET_CHANGED, ({ type }) => {
      if (this.controllers.table && type === 'schema') {
        this.controllers.table.handleSchemaChanged();
      }
    });
    
    // Page -> Runtime events
    eventBus.on('page:changed', (page) => {
      if (this.controllers.runtime) {
        this.controllers.runtime.handlePageChange(page);
      }
    });
    
    // Add more cross-controller events as needed...
  }
  
  /**
   * Apply feature UI state based on feature flags
   */
  applyFeatureUi() {
    const featureFlags = getFeatureFlags();
    
    if (this.uiRefs?.root) {
      this.uiRefs.root.classList.toggle('wtl-memory-disabled', featureFlags.memoryTable === false);
    }
    
    if (this.uiRefs?.memoryFeatureDisabledEl) {
      this.uiRefs.memoryFeatureDisabledEl.style.display = 
        featureFlags.memoryTable === false ? 'block' : 'none';
    }
  }
  
  /**
   * Set up hooks for chat changes
   */
  setupChatHooks() {
    const { eventSource, event_types } = this.context || {};
    
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
  
  /**
   * Reload state when chat changes
   */
  async reloadStateForCurrentChat() {
    try {
      if (this.controllers.table) {
        await this.controllers.table.reloadStateForCurrentChat();
      }
      
      eventBus.emit(EVENTS.CONFIG_CHANGED, { context: 'chatChanged' });
    } catch (error) {
      console.error('[WTL MemoryTable] Failed to reload chat state:', error);
    }
  }
  
  /**
   * Set feature enabled/disabled state
   */
  setEnabled(enabled) {
    if (this.uiRefs?.root) {
      this.uiRefs.root.classList.toggle('wtl-memory-disabled', !enabled);
    }
    
    if (this.uiRefs?.memoryFeatureDisabledEl) {
      this.uiRefs.memoryFeatureDisabledEl.style.display = enabled ? 'none' : 'block';
    }
    
    // Notify controllers
    Object.values(this.controllers).forEach(controller => {
      if (controller?.setEnabled) {
        controller.setEnabled(enabled);
      }
    });
    
    eventBus.emit(EVENTS.FEATURE_FLAGS_CHANGED, {
      memoryTable: enabled
    });
    
    return this;
  }
  
  /**
   * Get a controller by type
   */
  getController(type) {
    return this.controllers[type] || null;
  }
  
  /**
   * Get all controllers
   */
  getControllers() {
    return { ...this.controllers };
  }
  
  /**
   * Check if UI is initialized
   */
  isUiInitialized() {
    return this.uiInitialized;
  }
  
  /**
   * Check if feature is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * Destroy the feature and clean up resources
   */
  destroy() {
    // Destroy controllers
    Object.values(this.controllers).forEach(controller => {
      if (controller?.destroy) {
        controller.destroy();
      }
    });
    
    // Clear references
    this.uiRefs = null;
    this.context = null;
    this.defaults = null;
    this.controllers = {
      table: null,
      preset: null,
      prompt: null,
      page: null,
      editor: null,
      runtime: null
    };
    
    this.initialized = false;
    this.uiInitialized = false;
    
    // Remove global hook
    window.__wtlChatHook = false;
    window.__wtlApplyFeatureUi = null;
    
    console.log('[WTL MemoryTable] Feature destroyed');
  }
}

// Export for backward compatibility
export function bindWorldTreeUi({ root, ctx, defaults }) {
  // This is the old API that will be called by main.js
  // It creates a new instance and initializes the UI
  const feature = new MemoryTableFeature();
  
  // Initialize the feature first
  feature.initialize().then(() => {
    // Then initialize the UI
    feature.initializeUI(root, ctx, defaults);
  }).catch(error => {
    console.error('[WTL MemoryTable] Failed to initialize from bindWorldTreeUi:', error);
  });
  
  // Return the feature instance for potential external use
  return feature;
}