// @ts-nocheck
/**
 * Preset Controller for Memory Table
 * Handles preset management for OpenAI, prompts, and schemas
 */

import {
  loadTextPresetValue,
  saveTextPresetValue,
  renameTextPresetValue,
  deleteTextPresetValue
} from '../ui/presets.js';
import {
  createSchemaPresetHelpers,
  createOpenAiPresetHelpers,
  bindSchemaPresetControls,
  bindTextPresetControls,
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
  getOpenAIPresets,
  setOpenAIPresets,
  getPromptPresets,
  setPromptPresets,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScopedPresets,
  setSchemaScopedPresets
} from '../../../core/storage.js';
import { safeParseJson } from '../../../shared/utils/index.js';
import { saveSchemaPresetValue, renameSchemaPresetValue, deleteSchemaPresetValue } from '../ui/presets.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class PresetController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.schemaPresetHelpers = null;
    this.openAiPresetHelpers = null;
  }
  
  initialize() {
    if (!this.ui || !this.ui.root) {
      console.warn('[WTL PresetController] UI refs not ready, delaying initialization');
      return;
    }
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
      bindSchemaPresetControls({
        schemaPresetEl: this.ui.schemaPresetEl,
        schemaPresetNameEl: this.ui.schemaPresetNameEl,
        schemaPresetLoadEl: this.ui.schemaPresetLoadEl,
        schemaPresetSaveEl: this.ui.schemaPresetSaveEl,
        schemaPresetRenameEl: this.ui.schemaPresetRenameEl,
        schemaPresetDelEl: this.ui.schemaPresetDelEl,
        schemaPresetImportEl: this.ui.schemaPresetImportEl,
        schemaPresetFileEl: this.ui.schemaPresetFileEl,
        schemaPresetExportEl: this.ui.schemaPresetExportEl,
        schemaBindGlobalEl: this.ui.schemaBindGlobalEl,
        schemaBindCharacterEl: this.ui.schemaBindCharacterEl,
        schemaBindChatEl: this.ui.schemaBindChatEl,
        schemaEl: this.ui.schemaEl,
        schemaEffectiveEl: this.ui.schemaEffectiveEl,
        getSchemaPresets,
        setSchemaPresets,
        getSchemaScope: () => this.schemaPresetHelpers?.getSchemaScope?.() || 'global',
        getSchemaScopeLabel: (scope) => this.schemaPresetHelpers?.getSchemaScopeLabel?.(scope) || scope,
        getSchemaScopedPresets,
        setSchemaScopedPresets,
        getCurrentChatId: this.getCurrentChatId.bind(this),
        getCurrentCharacterId: this.getCurrentCharacterId.bind(this),
        resolveSchemaByScope: () => this.schemaPresetHelpers?.resolveSchemaByScope?.() || { scope: 'global', name: '默认', text: '' },
        parseSchemaToTemplate: this.parseSchemaToTemplate.bind(this),
        updateSchemaPreview: this.updateSchemaPreview.bind(this),
        refreshPromptPreview: this.refreshPromptPreview.bind(this),
        importPresetFile: this.importPresetFile.bind(this),
        exportPresetFile: this.exportPresetFile.bind(this),
        downloadJsonFile: this.downloadJsonFile.bind(this),
        saveSchemaPresetValue,
        renameSchemaPresetValue,
        deleteSchemaPresetValue,
        updateSchemaBindRadios: (scope) => this.schemaPresetHelpers?.updateSchemaBindRadios?.(scope),
        onSchemaLoaded: this.handleSchemaUpdated.bind(this),
        setStatus: this.setStatus.bind(this)
      });
    }
    
    // Bind prompt preset controls
    bindTextPresetControls({
      selectEl: this.ui.prepromptPresetEl,
      nameEl: this.ui.prepromptPresetNameEl,
      textareaEl: this.ui.prePromptEl,
      loadBtn: this.ui.prepromptPresetLoadEl,
      saveBtn: this.ui.prepromptPresetSaveEl,
      renameBtn: this.ui.prepromptPresetRenameEl,
      deleteBtn: this.ui.prepromptPresetDelEl,
      importBtn: this.ui.prepromptPresetImportEl,
      fileEl: this.ui.prepromptPresetFileEl,
      exportBtn: this.ui.prepromptPresetExportEl,
      storageKey: PREPROMPT_PRESET_KEY,
      activeStorageKey: PREPROMPT_PRESET_ACTIVE_KEY,
      getPromptPresets,
      setPromptPresets,
      loadTextPresetValue,
      saveTextPresetValue,
      renameTextPresetValue,
      deleteTextPresetValue,
      importPresetFile: this.importPresetFile.bind(this),
      exportPresetFile: this.exportPresetFile.bind(this),
      downloadJsonFile: this.downloadJsonFile.bind(this),
      refreshPromptPreview: this.refreshPromptPreview.bind(this),
      setStatus: this.setStatus.bind(this),
      labels: {
        subject: '破限提示',
        filename: 'wtl-preprompt-presets.json'
      }
    });
    
    bindTextPresetControls({
      selectEl: this.ui.instructionPresetEl,
      nameEl: this.ui.instructionPresetNameEl,
      textareaEl: this.ui.instructionEl,
      loadBtn: this.ui.instructionPresetLoadEl,
      saveBtn: this.ui.instructionPresetSaveEl,
      renameBtn: this.ui.instructionPresetRenameEl,
      deleteBtn: this.ui.instructionPresetDelEl,
      importBtn: this.ui.instructionPresetImportEl,
      fileEl: this.ui.instructionPresetFileEl,
      exportBtn: this.ui.instructionPresetExportEl,
      storageKey: INSTRUCTION_PRESET_KEY,
      activeStorageKey: INSTRUCTION_PRESET_ACTIVE_KEY,
      getPromptPresets,
      setPromptPresets,
      loadTextPresetValue,
      saveTextPresetValue,
      renameTextPresetValue,
      deleteTextPresetValue,
      importPresetFile: this.importPresetFile.bind(this),
      exportPresetFile: this.exportPresetFile.bind(this),
      downloadJsonFile: this.downloadJsonFile.bind(this),
      refreshPromptPreview: this.refreshPromptPreview.bind(this),
      setStatus: this.setStatus.bind(this),
      labels: {
        subject: '填表指令',
        filename: 'wtl-instruction-presets.json'
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
    } catch (error) {
      console.error(`[WTL PresetController] Failed to setup ${presetType} preset import:`, error);
    }
  }
  
  async handlePresetExport(presetType) {
    try {
      const filename = presetType === 'preprompt' ? 'wtl-preprompt-presets.json' : 'wtl-instruction-presets.json';
      const presets = getPromptPresets(presetType === 'preprompt' ? PREPROMPT_PRESET_KEY : INSTRUCTION_PRESET_KEY);
      this.downloadJsonFile(filename, presets);
      eventBus.emit(EVENTS.PRESET_SAVED, { type: presetType, action: 'export' });
    } catch (error) {
      console.error(`[WTL PresetController] Failed to export ${presetType} preset:`, error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: `export${presetType}Preset`, 
        error 
      });
    }
  }
  
  async importPresetFile({ file, currentPresets, applyPresets, onSuccess, onError, resetInput }) {
    if (!file) return false;
    try {
      const text = await file.text();
      const data = safeParseJson(text) || {};
      const presets = { ...(currentPresets || {}), ...data };
      applyPresets?.(presets);
      onSuccess?.(presets);
      return true;
    } catch (err) {
      onError?.(err);
      return false;
    } finally {
      resetInput?.();
    }
  }
  
  exportPresetFile({ filename, presets, downloadJson }) {
    downloadJson?.(filename, presets || {});
  }
  
  downloadJsonFile(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  parseSchemaToTemplate(schemaText) {
    try {
      const { parseSchemaToTemplate } = import('../data/template.js');
      return parseSchemaToTemplate(schemaText);
    } catch (error) {
      console.error('[WTL PresetController] Failed to parse schema:', error);
      return { title: '记忆表格', sections: [] };
    }
  }
  
  updateSchemaPreview() {
    if (this.ui.schemaEl) {
      const schemaText = this.getSchemaPreset();
      this.ui.schemaEl.value = schemaText || '';
    }
  }
  
  refreshPromptPreview(force = false) {
    eventBus.emit('refreshPromptPreview', { force });
  }
  
  setStatus(message) {
    console.log('[WTL PresetController]', message);
  }
  
  async handleSchemaPresetImport() {
    try {
      const fileInput = this.ui.schemaPresetFileEl;
      if (!fileInput) return;
      
      fileInput.click();
    } catch (error) {
      console.error('[WTL PresetController] Failed to setup schema preset import:', error);
    }
  }
  
  async handleSchemaPresetExport() {
    try {
      const presets = getSchemaPresets();
      this.downloadJsonFile('wtl-schema-presets.json', presets);
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
      case 'schema':
        return this.ui.schemaPresetFileEl;
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