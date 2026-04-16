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
      this.context = context || window.SillyTavern?.getContext?.() || {};
      this.defaults = defaults || window.__WTL_DEFAULTS__ || {};
      
      this.uiRefs = this.getUiRefs(root);
      
      this.controllers.table = new TableController(this.uiRefs, this.context, this.defaults);
      this.controllers.preset = new PresetController(this.uiRefs, this.context, this.defaults);
      this.controllers.prompt = new PromptController(this.uiRefs, this.context, this.defaults);
      this.controllers.page = new PageController(this.uiRefs, this.context, this.defaults);
      this.controllers.editor = new EditorController(this.uiRefs, this.context, this.defaults);
      this.controllers.runtime = new RuntimeController(this.uiRefs, this.context, this.defaults);
      
      this.controllers.table.initialize();
      this.controllers.preset.initialize();
      this.controllers.prompt.initialize();
      this.controllers.page.initialize();
      this.controllers.editor.initialize();
      this.controllers.runtime.initialize();
      
      this.bindCrossControllerEvents();
      
      this.applyFeatureUi();
      
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
    
    return {
      root: root,
      statusEl: byId('wtl-status'),
      pageMainEl: byId('wtl-page-main'),
      pageConfigEl: byId('wtl-page-config'),
      memoryFeatureDisabledEl: byId('wtl-memory-feature-disabled'),
      
      tablePreviewEl: byId('wtl-table-view'),
      tablePreviewHeadEl: byId('wtl-preview-head'),
      tablePreviewBodyEl: byId('wtl-preview-body'),
      tableResizeEl: byId('wtl-table-resize'),
      tableMdEl: byId('wtl-table-md'),
      tablePreviewTextareaEl: byId('wtl-table-preview'),
      
      runBtn: byId('wtl-run'),
      autoToggleBtn: byId('wtl-auto-toggle'),
      autoFloorsEl: byId('wtl-auto-floors'),
      autoEveryEl: byId('wtl-auto-every'),
      batchBtn: byId('wtl-batch'),
      batchStartEl: byId('wtl-batch-start'),
      batchEndEl: byId('wtl-batch-end'),
      batchStepEl: byId('wtl-batch-step'),
      batchParamsEl: byId('wtl-batch-params'),
      
      editTableBtn: byId('wtl-edit-table'),
      editTemplateBtn: byId('wtl-edit-template'),
      clearTableBtn: byId('wtl-clear-table'),
      openConfigBtn: byId('wtl-open-config'),
      resetGlobalBtn: byId('wtl-reset-global'),
      historyBackBtn: byId('wtl-history-back'),
      historyUndoBtn: byId('wtl-history-undo'),
      backMainBtn: byId('wtl-back-main'),
      
      templateEditorEl: byId('wtl-template-editor'),
      sectionListEl: byId('wtl-section-list'),
      columnListEl: byId('wtl-column-list'),
      sectionAddBtn: byId('wtl-section-add'),
      sectionApplyBtn: byId('wtl-section-apply'),
      sectionCancelBtn: byId('wtl-section-cancel'),
      columnAddBtn: byId('wtl-column-add'),
      
      editorOverlayEl: byId('wtl-editor-overlay'),
      editorDialogTitleEl: byId('wtl-editor-dialog-title'),
      editorDialogNameEl: byId('wtl-editor-dialog-name'),
      editorDialogDefinitionEl: byId('wtl-editor-dialog-definition'),
      editorDialogInsertEl: byId('wtl-editor-dialog-insert'),
      editorDialogInsertEnabledEl: byId('wtl-editor-dialog-insert-enabled'),
      editorDialogUpdateEl: byId('wtl-editor-dialog-update'),
      editorDialogUpdateEnabledEl: byId('wtl-editor-dialog-update-enabled'),
      editorDialogDeleteEl: byId('wtl-editor-dialog-delete'),
      editorDialogDeleteEnabledEl: byId('wtl-editor-dialog-delete-enabled'),
      editorDialogFillEl: byId('wtl-editor-dialog-fill'),
      editorDialogSendEl: byId('wtl-editor-dialog-send'),
      editorDialogSaveBtn: byId('wtl-editor-dialog-save'),
      editorDialogCloseBtn: byId('wtl-editor-dialog-close'),
      
      sendModeEl: byId('wtl-send-mode'),
      stModeEl: byId('wtl-mode-st'),
      externalModeEl: byId('wtl-mode-external'),
      
      instModeEl: byId('wtl-inst-mode'),
      instInjectToggleEl: byId('wtl-inst-inject-toggle'),
      instPosEl: byId('wtl-inst-pos'),
      instRoleEl: byId('wtl-inst-role'),
      instDepthEl: byId('wtl-inst-depth'),
      instOrderEl: byId('wtl-inst-order'),
      
      schemaModeSendEl: byId('wtl-schema-mode-send'),
      schemaInjectToggleEl: byId('wtl-schema-inject-toggle'),
      schemaPosEl: byId('wtl-schema-pos'),
      schemaRoleEl: byId('wtl-schema-role'),
      schemaDepthEl: byId('wtl-schema-depth'),
      schemaOrderEl: byId('wtl-schema-order'),
      
      tableModeEl: byId('wtl-table-mode'),
      tableInjectToggleEl: byId('wtl-table-inject-toggle'),
      tablePosEl: byId('wtl-table-pos'),
      tableRoleEl: byId('wtl-table-role'),
      tableDepthEl: byId('wtl-table-depth'),
      tableOrderEl: byId('wtl-table-order'),
      
      prePromptEl: byId('wtl-preprompt'),
      instructionEl: byId('wtl-instruction'),
      schemaEl: byId('wtl-schema'),
      
      prePromptPresetEl: byId('wtl-preprompt-preset'),
      prePromptPresetNameEl: byId('wtl-preprompt-preset-name'),
      prePromptPresetLoadEl: byId('wtl-preprompt-preset-load'),
      prePromptPresetSaveEl: byId('wtl-preprompt-preset-save'),
      prePromptPresetRenameEl: byId('wtl-preprompt-preset-rename'),
      prePromptPresetDelEl: byId('wtl-preprompt-preset-del'),
      prePromptPresetImportEl: byId('wtl-preprompt-preset-import'),
      prePromptPresetExportEl: byId('wtl-preprompt-preset-export'),
      prePromptPresetFileEl: byId('wtl-preprompt-preset-file'),
      editPrePromptBtn: byId('wtl-edit-preprompt'),
      resetPrePromptBtn: byId('wtl-reset-preprompt'),
      
      instructionPresetEl: byId('wtl-instruction-preset'),
      instructionPresetNameEl: byId('wtl-instruction-preset-name'),
      instructionPresetLoadEl: byId('wtl-instruction-preset-load'),
      instructionPresetSaveEl: byId('wtl-instruction-preset-save'),
      instructionPresetRenameEl: byId('wtl-instruction-preset-rename'),
      instructionPresetDelEl: byId('wtl-instruction-preset-del'),
      instructionPresetImportEl: byId('wtl-instruction-preset-import'),
      instructionPresetExportEl: byId('wtl-instruction-preset-export'),
      instructionPresetFileEl: byId('wtl-instruction-preset-file'),
      editInstructionBtn: byId('wtl-edit-instruction'),
      resetInstructionBtn: byId('wtl-reset-instruction'),
      
      schemaPresetEl: byId('wtl-schema-preset'),
      schemaPresetNameEl: byId('wtl-schema-preset-name'),
      schemaPresetLoadEl: byId('wtl-schema-preset-load'),
      schemaPresetSaveEl: byId('wtl-schema-preset-save'),
      schemaPresetRenameEl: byId('wtl-schema-preset-rename'),
      schemaPresetDelEl: byId('wtl-schema-preset-del'),
      schemaPresetImportEl: byId('wtl-schema-preset-import'),
      schemaPresetExportEl: byId('wtl-schema-preset-export'),
      schemaPresetFileEl: byId('wtl-schema-preset-file'),
      refreshSchemaBtn: byId('wtl-refresh-schema'),
      resetSchemaBtn: byId('wtl-reset-schema'),
      schemaEffectiveEl: byId('wtl-schema-effective'),
      schemaBindGlobalEl: byId('wtl-schema-bind-global'),
      schemaBindCharacterEl: byId('wtl-schema-bind-character'),
      schemaBindChatEl: byId('wtl-schema-bind-chat'),
      
      openaiPresetEl: byId('wtl-openai-preset'),
      openaiPresetNameEl: byId('wtl-openai-preset-name'),
      openaiPresetLoadEl: byId('wtl-openai-preset-load'),
      openaiPresetDelEl: byId('wtl-openai-preset-del'),
      openaiUrlEl: byId('wtl-openai-url'),
      openaiKeyEl: byId('wtl-openai-key'),
      openaiModelEl: byId('wtl-openai-model'),
      openaiTempEl: byId('wtl-openai-temp'),
      openaiMaxEl: byId('wtl-openai-max'),
      openaiStreamEl: byId('wtl-openai-stream'),
      openaiRefreshEl: byId('wtl-openai-refresh'),
      externalSaveBtn: byId('wtl-external-save'),
      
      externalNavOrder: byId('wtl-external-nav-order'),
      externalNavRef: byId('wtl-external-nav-ref'),
      externalNavWb: byId('wtl-external-nav-wb'),
      externalPanelOrder: byId('wtl-external-panel-order'),
      externalPanelRef: byId('wtl-external-panel-ref'),
      externalPanelWb: byId('wtl-external-panel-wb'),
      
      blockListEl: byId('wtl-block-list'),
      blockAddBtn: byId('wtl-block-add'),
      blockResetBtn: byId('wtl-block-reset'),
      
      refBlockListEl: byId('wtl-ref-block-list'),
      refBlockAddBtn: byId('wtl-ref-block-add'),
      refBlockResetBtn: byId('wtl-ref-block-reset'),
      
      wbModeEl: byId('wtl-wb-mode'),
      wbManualWrapEl: byId('wtl-wb-manual-wrap'),
      wbManualEl: byId('wtl-wb-manual'),
      wbManualRefreshEl: byId('wtl-wb-manual-refresh'),
      wbManualUiEl: byId('wtl-wb-manual-ui'),
      
      logPromptBtn: byId('wtl-log-prompt'),
      logAiBtn: byId('wtl-log-ai'),
      logContentEl: byId('wtl-log-content'),
      logRefreshBtn: byId('wtl-log-refresh'),
      
      modalEl: byId('wtl-modal'),
      modalTitleEl: byId('wtl-modal-title'),
      modalContentEl: byId('wtl-modal-content'),
      modalCustomEl: byId('wtl-modal-custom'),
      modalActionsEl: byId('wtl-modal-actions'),
      modalCloseBtn: byId('wtl-modal-close')
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