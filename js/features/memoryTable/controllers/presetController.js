// @ts-nocheck
/**
 * Preset Controller for Memory Table
 * Handles preset management for OpenAI, prompts, and schemas
 */

import {
  loadTextPresetValue,
  saveTextPresetValue,
  renameTextPresetValue,
  deleteTextPresetValue,
  importJsonPresets,
  saveSchemaPresetValue,
  renameSchemaPresetValue,
  deleteSchemaPresetValue,
  importPresetFile,
  exportPresetFile
} from '../ui/presets.js';
import {
  createSchemaPresetHelpers,
  createOpenAiPresetHelpers,
  bindSchemaPresetGroup,
  bindPromptPresetGroups,
  refreshSchemaPresetSelect,
  refreshTextPresetSelect
} from '../ui/presetControllers.js';
import {
  PREPROMPT_PRESET_KEY,
  PREPROMPT_PRESET_ACTIVE_KEY,
  INSTRUCTION_PRESET_KEY,
  INSTRUCTION_PRESET_ACTIVE_KEY,
  SCHEMA_PRESET_KEY,
  SCHEMA_PRESET_ACTIVE_KEY,
  getFeatureFlags,
  safeParseJson,
  getOpenAIPresets,
  setOpenAIPresets,
  getPromptPresets,
  setPromptPresets,
  getPresetFromStorage,
  getPresetTextByName,
  getTextPresetFromStorage,
  getDefaultPromptText,
  getDefaultSchemaText,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScopedPresets,
  setSchemaScopedPresets,
  getBlocksPreset,
  getRefBlocksPreset,
  getOrderPreset,
  getRefOrderPreset
} from '../../../core/storage.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class PresetController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.schemaPresetHelpers = null;
    this.openAiPresetHelpers = null;
    
    this.initialize();
  }
  
  initialize() {
    this.initializePresetHelpers();
    this.bindEvents();
    this.refreshPresetSelects();
  }
  
  initializePresetHelpers() {
    // Schema preset helpers
    this.schemaPresetHelpers = createSchemaPresetHelpers({
      schemaBindGlobalEl: this.ui.schemaBindGlobalEl,
      schemaBindCharacterEl: this.ui.schemaBindCharacterEl,
      schemaBindChatEl: this.ui.schemaBindChatEl,
      getSchemaScopedPresets,
      getSchemaPresets,
      getDefaultSchemaText,
      getCurrentChatId: this.getCurrentChatId.bind(this),
      getCurrentCharacterId: this.getCurrentCharacterId.bind(this),
      localStorageRef: localStorage
    });
    
    // OpenAI preset helpers
    this.openAiPresetHelpers = createOpenAiPresetHelpers({
      openaiPresetEl: this.ui.openaiPresetEl,
      openaiPresetNameEl: this.ui.openaiPresetNameEl,
      openaiUrlEl: this.ui.openaiUrlEl,
      openaiKeyEl: this.ui.openaiKeyEl,
      openaiTempEl: this.ui.openaiTempEl,
      openaiMaxEl: this.ui.openaiMaxEl,
      openaiStreamEl: this.ui.openaiStreamEl,
      openaiModelEl: this.ui.openaiModelEl,
      getOpenAIPresets
    });
  }
  
  bindEvents() {
    // Bind schema preset controls
    if (this.ui.schemaPresetEl) {
      bindSchemaPresetGroup({
        presetSelectEl: this.ui.schemaPresetEl,
        presetNameEl: this.ui.schemaPresetNameEl,
        presetLoadEl: this.ui.schemaPresetLoadEl,
        presetSaveEl: this.ui.schemaPresetSaveEl,
        presetRenameEl: this.ui.schemaPresetRenameEl,
        presetDelEl: this.ui.schemaPresetDelEl,
        presetImportEl: this.ui.schemaPresetImportEl,
        presetExportEl: this.ui.schemaPresetExportEl,
        presetFileEl: this.ui.schemaPresetFileEl,
        getSchemaScopedPresets,
        getSchemaPresets,
        setSchemaPresets,
        setSchemaScopedPresets,
        getSchemaPreset: this.getSchemaPreset.bind(this),
        getCurrentChatId: this.getCurrentChatId.bind(this),
        getCurrentCharacterId: this.getCurrentCharacterId.bind(this),
        localStorageRef: localStorage,
        onSchemaUpdated: this.handleSchemaUpdated.bind(this)
      });
    }
    
    // Bind prompt preset controls
    bindPromptPresetGroups({
      preprompt: {
        presetSelectEl: this.ui.prepromptPresetEl,
        presetNameEl: this.ui.prepromptPresetNameEl,
        presetLoadEl: this.ui.prepromptPresetLoadEl,
        presetSaveEl: this.ui.prepromptPresetSaveEl,
        presetRenameEl: this.ui.prepromptPresetRenameEl,
        presetDelEl: this.ui.prepromptPresetDelEl,
        presetImportEl: this.ui.prepromptPresetImportEl,
        presetExportEl: this.ui.prepromptPresetExportEl,
        presetFileEl: this.ui.prepromptPresetFileEl,
        storageKey: PREPROMPT_PRESET_KEY,
        activeKey: PREPROMPT_PRESET_ACTIVE_KEY,
        getDefaultText: () => getDefaultPromptText('preprompt'),
        onPresetUpdated: this.handlePresetUpdated.bind(this, 'preprompt')
      },
      instruction: {
        presetSelectEl: this.ui.instructionPresetEl,
        presetNameEl: this.ui.instructionPresetNameEl,
        presetLoadEl: this.ui.instructionPresetLoadEl,
        presetSaveEl: this.ui.instructionPresetSaveEl,
        presetRenameEl: this.ui.instructionPresetRenameEl,
        presetDelEl: this.ui.instructionPresetDelEl,
        presetImportEl: this.ui.instructionPresetImportEl,
        presetExportEl: this.ui.instructionPresetExportEl,
        presetFileEl: this.ui.instructionPresetFileEl,
        storageKey: INSTRUCTION_PRESET_KEY,
        activeKey: INSTRUCTION_PRESET_ACTIVE_KEY,
        getDefaultText: () => getDefaultPromptText('instruction'),
        onPresetUpdated: this.handlePresetUpdated.bind(this, 'instruction')
      }
    });
    
    // Bind OpenAI preset controls
    if (this.ui.openaiPresetLoadEl) {
      this.ui.openaiPresetLoadEl.addEventListener('click', () => this.handleOpenAIPresetLoad());
    }
    
    if (this.ui.openaiPresetDelEl) {
      this.ui.openaiPresetDelEl.addEventListener('click', () => this.handleOpenAIPresetDelete());
    }
    
    if (this.ui.openaiRefreshEl) {
      this.ui.openaiRefreshEl.addEventListener('click', () => this.handleOpenAIRefresh());
    }
    
    // Bind preset import/export
    this.bindPresetImportExport();
  }
  
  bindPresetImportExport() {
    // Preprompt import/export
    if (this.ui.prepromptPresetImportEl) {
      this.ui.prepromptPresetImportEl.addEventListener('click', () => 
        this.handlePresetImport('preprompt')
      );
    }
    
    if (this.ui.prepromptPresetExportEl) {
      this.ui.prepromptPresetExportEl.addEventListener('click', () => 
        this.handlePresetExport('preprompt')
      );
    }
    
    // Instruction import/export
    if (this.ui.instructionPresetImportEl) {
      this.ui.instructionPresetImportEl.addEventListener('click', () => 
        this.handlePresetImport('instruction')
      );
    }
    
    if (this.ui.instructionPresetExportEl) {
      this.ui.instructionPresetExportEl.addEventListener('click', () => 
        this.handlePresetExport('instruction')
      );
    }
    
    // Schema import/export
    if (this.ui.schemaPresetImportEl) {
      this.ui.schemaPresetImportEl.addEventListener('click', () => 
        this.handleSchemaPresetImport()
      );
    }
    
    if (this.ui.schemaPresetExportEl) {
      this.ui.schemaPresetExportEl.addEventListener('click', () => 
        this.handleSchemaPresetExport()
      );
    }
  }
  
  async handleOpenAIPresetLoad() {
    try {
      const presetName = this.ui.openaiPresetEl?.value;
      if (!presetName) return;
      
      await this.openAiPresetHelpers?.loadOpenAIPresetByName(presetName);
      eventBus.emit(EVENTS.PRESET_LOADED, { type: 'openai', name: presetName });
    } catch (error) {
      console.error('[WTL PresetController] Failed to load OpenAI preset:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'loadOpenAIPreset', 
        error 
      });
    }
  }
  
  async handleOpenAIPresetDelete() {
    try {
      const presetName = this.ui.openaiPresetEl?.value;
      if (!presetName || presetName === '默认') {
        alert('不能删除默认预设');
        return;
      }
      
      if (!confirm(`确定要删除预设 "${presetName}" 吗？`)) {
        return;
      }
      
      const presets = getOpenAIPresets();
      delete presets[presetName];
      setOpenAIPresets(presets);
      
      await this.openAiPresetHelpers?.refreshOpenAIPresetSelect();
      eventBus.emit(EVENTS.PRESET_DELETED, { type: 'openai', name: presetName });
    } catch (error) {
      console.error('[WTL PresetController] Failed to delete OpenAI preset:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'deleteOpenAIPreset', 
        error 
      });
    }
  }
  
  async handleOpenAIRefresh() {
    try {
      // Refresh OpenAI models
      // This would typically make an API call to get available models
      eventBus.emit(EVENTS.AI_CALL_STARTED, { action: 'refresh_models' });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      eventBus.emit(EVENTS.AI_CALL_COMPLETED, { 
        action: 'refresh_models',
        result: { success: true }
      });
    } catch (error) {
      console.error('[WTL PresetController] Failed to refresh OpenAI:', error);
      eventBus.emit(EVENTS.AI_CALL_FAILED, { 
        action: 'refresh_models',
        error 
      });
    }
  }
  
  async handlePresetImport(presetType) {
    try {
      const fileInput = this.getPresetFileInput(presetType);
      if (!fileInput) return;
      
      fileInput.click();
      
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
          await importPresetFile(file, presetType);
          await this.refreshPresetSelect(presetType);
          eventBus.emit(EVENTS.PRESET_LOADED, { type: presetType, source: 'import' });
        } catch (error) {
          console.error(`[WTL PresetController] Failed to import ${presetType} preset:`, error);
          eventBus.emit(EVENTS.ERROR_OCCURRED, { 
            context: `import${presetType}Preset`, 
            error 
          });
        }
        
        // Reset file input
        fileInput.value = '';
      };
    } catch (error) {
      console.error(`[WTL PresetController] Failed to setup ${presetType} preset import:`, error);
    }
  }
  
  async handlePresetExport(presetType) {
    try {
      await exportPresetFile(presetType);
      eventBus.emit(EVENTS.PRESET_SAVED, { type: presetType, action: 'export' });
    } catch (error) {
      console.error(`[WTL PresetController] Failed to export ${presetType} preset:`, error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: `export${presetType}Preset`, 
        error 
      });
    }
  }
  
  async handleSchemaPresetImport() {
    try {
      const fileInput = this.ui.schemaPresetFileEl;
      if (!fileInput) return;
      
      fileInput.click();
      
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
          await importJsonPresets(file, 'schema');
          await refreshSchemaPresetSelect(this.ui.schemaPresetEl);
          eventBus.emit(EVENTS.PRESET_LOADED, { type: 'schema', source: 'import' });
        } catch (error) {
          console.error('[WTL PresetController] Failed to import schema preset:', error);
          eventBus.emit(EVENTS.ERROR_OCCURRED, { 
            context: 'importSchemaPreset', 
            error 
          });
        }
        
        // Reset file input
        fileInput.value = '';
      };
    } catch (error) {
      console.error('[WTL PresetController] Failed to setup schema preset import:', error);
    }
  }
  
  async handleSchemaPresetExport() {
    try {
      await exportPresetFile('schema');
      eventBus.emit(EVENTS.PRESET_SAVED, { type: 'schema', action: 'export' });
    } catch (error) {
      console.error('[WTL PresetController] Failed to export schema preset:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'exportSchemaPreset', 
        error 
      });
    }
  }
  
  handleSchemaUpdated() {
    eventBus.emit(EVENTS.PRESET_CHANGED, { type: 'schema' });
    this.refreshSchemaUI();
  }
  
  handlePresetUpdated(presetType) {
    eventBus.emit(EVENTS.PRESET_CHANGED, { type: presetType });
    this.refreshPromptUI();
  }
  
  refreshPresetSelects() {
    // Refresh schema preset select
    if (this.ui.schemaPresetEl) {
      refreshSchemaPresetSelect(this.ui.schemaPresetEl);
    }
    
    // Refresh text preset selects
    refreshTextPresetSelect(this.ui.prepromptPresetEl, 'preprompt');
    refreshTextPresetSelect(this.ui.instructionPresetEl, 'instruction');
    
    // Refresh OpenAI preset select
    if (this.openAiPresetHelpers) {
      this.openAiPresetHelpers.refreshOpenAIPresetSelect();
    }
  }
  
  refreshPresetSelect(presetType) {
    switch (presetType) {
      case 'preprompt':
        refreshTextPresetSelect(this.ui.prepromptPresetEl, 'preprompt');
        break;
      case 'instruction':
        refreshTextPresetSelect(this.ui.instructionPresetEl, 'instruction');
        break;
      case 'schema':
        if (this.ui.schemaPresetEl) {
          refreshSchemaPresetSelect(this.ui.schemaPresetEl);
        }
        break;
    }
  }
  
  refreshSchemaUI() {
    // Refresh schema-related UI elements
    if (this.ui.schemaEffectiveEl) {
      const schemaText = this.getSchemaPreset();
      this.ui.schemaEffectiveEl.textContent = schemaText || '无有效模板';
    }
    
    if (this.ui.schemaEl) {
      const schemaText = this.getSchemaPreset();
      this.ui.schemaEl.value = schemaText || '';
    }
  }
  
  refreshPromptUI() {
    // Refresh prompt-related UI elements
    if (this.ui.prePromptEl) {
      const prepromptText = getPresetFromStorage(
        PREPROMPT_PRESET_KEY,
        PREPROMPT_PRESET_ACTIVE_KEY,
        getDefaultPromptText('preprompt')
      );
      this.ui.prePromptEl.value = prepromptText || '';
    }
    
    if (this.ui.instructionEl) {
      const instructionText = getPresetFromStorage(
        INSTRUCTION_PRESET_KEY,
        INSTRUCTION_PRESET_ACTIVE_KEY,
        getDefaultPromptText('instruction')
      );
      this.ui.instructionEl.value = instructionText || '';
    }
  }
  
  getPresetFileInput(presetType) {
    switch (presetType) {
      case 'preprompt':
        return this.ui.prepromptPresetFileEl;
      case 'instruction':
        return this.ui.instructionPresetFileEl;
      default:
        return null;
    }
  }
  
  getCurrentChatId() {
    const ctx = this.ctx || window.SillyTavern?.getContext?.();
    return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || '';
  }
  
  getCurrentCharacterId() {
    const ctx = this.ctx || window.SillyTavern?.getContext?.();
    const characterId = ctx?.characterId || ctx?.character?.id || ctx?.character?.avatar || '';
    return characterId || '';
  }
  
  getSchemaPreset() {
    return getDefaultSchemaText();
  }
  
  // Public API
  getSchemaPresetHelpers() {
    return this.schemaPresetHelpers;
  }
  
  getOpenAiPresetHelpers() {
    return this.openAiPresetHelpers;
  }
  
  destroy() {
    // Cleanup event listeners
    if (this.ui.openaiPresetLoadEl) {
      this.ui.openaiPresetLoadEl.removeEventListener('click', () => this.handleOpenAIPresetLoad());
    }
    
    if (this.ui.openaiPresetDelEl) {
      this.ui.openaiPresetDelEl.removeEventListener('click', () => this.handleOpenAIPresetDelete());
    }
    
    if (this.ui.openaiRefreshEl) {
      this.ui.openaiRefreshEl.removeEventListener('click', () => this.handleOpenAIRefresh());
    }
  }
}

// Factory function for backward compatibility
export function createPresetController(uiRefs, context, defaults) {
  return new PresetController(uiRefs, context, defaults);
}