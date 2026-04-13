// @ts-nocheck
/**
 * Prompt Controller for Memory Table
 * Handles prompt editing, preview, and injection
 */

import { createPromptMacroController } from '../ui/promptControllers.js';
import { createBatchController } from '../ui/runtimeControllers.js';
import { createAutoRefreshController } from '../ui/actionControllers.js';
import { buildPrompt } from '../services/promptService.js';
import { buildManagedPromptInjectionItems } from '../services/injectionService.js';
import { safeParseJson } from '../../../shared/utils/index.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class PromptController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.promptMacroController = null;
    this.batchController = null;
    this.autoRefreshController = null;
    
    this.state = {
      promptPreview: '',
      lastPrompt: '',
      isBatchMode: false,
      isAutoRefreshEnabled: false,
      injectionItems: []
    };
    
    this.initialize();
  }
  
  initialize() {
    this.initializeControllers();
    this.bindEvents();
    this.loadInitialState();
  }
  
  initializeControllers() {
    // Initialize prompt macro controller
    this.promptMacroController = createPromptMacroController({
      prePromptEl: this.ui.prePromptEl,
      instructionEl: this.ui.instructionEl,
      sendModeEl: this.ui.sendModeEl,
      externalEl: this.ui.externalEl,
      stModeEl: this.ui.stModeEl,
      instBlockEl: this.ui.instBlockEl,
      schemaBlockEl: this.ui.schemaBlockEl,
      instModeEl: this.ui.instModeEl,
      schemaModeSendEl: this.ui.schemaModeSendEl,
      tableModeEl: this.ui.tableModeEl,
      refreshPromptPreview: this.refreshPromptPreview.bind(this)
    });
    
    // Initialize batch controller
    this.batchController = createBatchController({
      batchBtn: this.ui.batchBtn,
      batchStartEl: this.ui.batchStartEl,
      batchEndEl: this.ui.batchEndEl,
      batchStepEl: this.ui.batchStepEl,
      runBatchFill: this.runBatchFill.bind(this),
      getCurrentChatId: this.getCurrentChatId.bind(this),
      getCharacterName: this.getCharacterName.bind(this)
    });
    
    // Initialize auto refresh controller
    this.autoRefreshController = createAutoRefreshController({
      autoToggleBtn: this.ui.autoToggleBtn,
      autoFloorsEl: this.ui.autoFloorsEl,
      autoEveryEl: this.ui.autoEveryEl,
      getAutoRefreshConfig: this.getAutoRefreshConfig.bind(this),
      setAutoRefreshConfig: this.setAutoRefreshConfig.bind(this),
      onAutoRefreshToggled: this.handleAutoRefreshToggled.bind(this)
    });
  }
  
  bindEvents() {
    // Bind prompt input controls
    if (this.ui.prePromptEl) {
      this.ui.prePromptEl.addEventListener('input', () => this.handlePromptInput('preprompt'));
    }
    
    if (this.ui.instructionEl) {
      this.ui.instructionEl.addEventListener('input', () => this.handlePromptInput('instruction'));
    }
    
    if (this.ui.schemaEl) {
      this.ui.schemaEl.addEventListener('input', () => this.handlePromptInput('schema'));
    }
    
    // Bind send mode controls
    if (this.ui.sendModeEl) {
      this.ui.sendModeEl.addEventListener('change', () => this.handleSendModeChange());
    }
    
    // Bind external mode controls
    if (this.ui.externalEl) {
      this.ui.externalEl.addEventListener('change', () => this.handleExternalModeChange());
    }
    
    // Bind ST mode controls
    if (this.ui.stModeEl) {
      this.ui.stModeEl.addEventListener('change', () => this.handleStModeChange());
    }
    
    // Bind prompt log controls
    if (this.ui.logPromptBtn) {
      this.ui.logPromptBtn.addEventListener('click', () => this.showPromptLog());
    }
    
    if (this.ui.logAiBtn) {
      this.ui.logAiBtn.addEventListener('click', () => this.showAiLog());
    }
    
    if (this.ui.logRefreshBtn) {
      this.ui.logRefreshBtn.addEventListener('click', () => this.refreshLog());
    }
    
    // Bind injection toggle controls
    if (this.ui.tableInjectToggleBtn) {
      this.ui.tableInjectToggleBtn.addEventListener('click', () => this.toggleTableInjection());
    }
    
    if (this.ui.instInjectToggleEl) {
      this.ui.instInjectToggleEl.addEventListener('click', () => this.toggleInstructionInjection());
    }
    
    if (this.ui.schemaInjectToggleEl) {
      this.ui.schemaInjectToggleEl.addEventListener('click', () => this.toggleSchemaInjection());
    }
  }
  
  loadInitialState() {
    // Load last prompt from localStorage
    const cachedPrompt = localStorage.getItem('wtl.lastPrompt') || '';
    if (this.ui.logContentEl) {
      this.ui.logContentEl.value = cachedPrompt;
    }
    
    // Set initial log button states
    if (this.ui.logPromptBtn) {
      this.ui.logPromptBtn.dataset.active = 'true';
    }
    
    if (this.ui.logAiBtn) {
      this.ui.logAiBtn.dataset.active = 'false';
    }
    
    // Load injection items
    this.loadInjectionItems();
    
    // Initial prompt preview refresh
    this.refreshPromptPreview(true);
  }
  
  async handlePromptInput(type) {
    // Save prompt to localStorage based on type
    switch (type) {
      case 'preprompt':
        this.savePromptToStorage('preprompt', this.ui.prePromptEl?.value || '');
        break;
      case 'instruction':
        this.savePromptToStorage('instruction', this.ui.instructionEl?.value || '');
        break;
      case 'schema':
        this.savePromptToStorage('schema', this.ui.schemaEl?.value || '');
        break;
    }
    
    // Refresh prompt preview
    await this.refreshPromptPreview();
    
    eventBus.emit(EVENTS.PRESET_CHANGED, { type });
  }
  
  handleSendModeChange() {
    const sendMode = this.ui.sendModeEl?.value || 'auto';
    localStorage.setItem('wtl.sendMode', sendMode);
    
    // Update UI based on send mode
    this.updateSendModeUI(sendMode);
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { key: 'sendMode', value: sendMode });
  }
  
  handleExternalModeChange() {
    const externalMode = this.ui.externalEl?.checked || false;
    localStorage.setItem('wtl.externalMode', externalMode.toString());
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { key: 'externalMode', value: externalMode });
  }
  
  handleStModeChange() {
    const stMode = this.ui.stModeEl?.checked || false;
    localStorage.setItem('wtl.stMode', stMode.toString());
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { key: 'stMode', value: stMode });
  }
  
  updateSendModeUI(sendMode) {
    // Update UI elements based on send mode
    if (this.promptMacroController) {
      this.promptMacroController.setModeConfigVisibility(sendMode);
    }
  }
  
  async toggleTableInjection() {
    const isEnabled = this.ui.tableInjectToggleBtn?.classList.contains('active') || false;
    const newState = !isEnabled;
    
    // Update UI
    if (this.ui.tableInjectToggleBtn) {
      this.ui.tableInjectToggleBtn.classList.toggle('active', newState);
      this.ui.tableInjectToggleBtn.textContent = newState ? '已启用' : '已禁用';
    }
    
    // Save state
    localStorage.setItem('wtl.tableInjectionEnabled', newState.toString());
    
    // Refresh prompt preview
    await this.refreshPromptPreview();
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { 
      key: 'tableInjectionEnabled', 
      value: newState 
    });
  }
  
  async toggleInstructionInjection() {
    const isEnabled = this.ui.instInjectToggleEl?.classList.contains('active') || false;
    const newState = !isEnabled;
    
    // Update UI
    if (this.ui.instInjectToggleEl) {
      this.ui.instInjectToggleEl.classList.toggle('active', newState);
      this.ui.instInjectToggleEl.textContent = newState ? '已启用' : '已禁用';
    }
    
    // Save state
    localStorage.setItem('wtl.instructionInjectionEnabled', newState.toString());
    
    // Refresh prompt preview
    await this.refreshPromptPreview();
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { 
      key: 'instructionInjectionEnabled', 
      value: newState 
    });
  }
  
  async toggleSchemaInjection() {
    const isEnabled = this.ui.schemaInjectToggleEl?.classList.contains('active') || false;
    const newState = !isEnabled;
    
    // Update UI
    if (this.ui.schemaInjectToggleEl) {
      this.ui.schemaInjectToggleEl.classList.toggle('active', newState);
      this.ui.schemaInjectToggleEl.textContent = newState ? '已启用' : '已禁用';
    }
    
    // Save state
    localStorage.setItem('wtl.schemaInjectionEnabled', newState.toString());
    
    // Refresh prompt preview
    await this.refreshPromptPreview();
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { 
      key: 'schemaInjectionEnabled', 
      value: newState 
    });
  }
  
  async refreshPromptPreview(force = false) {
    try {
      // Build prompt
      const promptData = await this.buildPromptData();
      const prompt = await buildPrompt(promptData);
      
      // Update state
      this.state.promptPreview = prompt;
      
      // Update log if showing prompts
      if (this.ui.logContentEl && this.ui.logPromptBtn?.dataset.active === 'true') {
        this.ui.logContentEl.value = prompt;
      }
      
      // Update injection items
      await this.updateInjectionItems(promptData);
      
      // Cache last prompt
      localStorage.setItem('wtl.lastPrompt', prompt);
      this.state.lastPrompt = prompt;
      
      eventBus.emit(EVENTS.MEMORY_TABLE_UPDATED, { prompt });
    } catch (error) {
      console.error('[WTL PromptController] Failed to refresh prompt preview:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, { 
        context: 'refreshPromptPreview', 
        error 
      });
    }
  }
  
  async buildPromptData() {
    // Get current prompt values
    const preprompt = this.ui.prePromptEl?.value || '';
    const instruction = this.ui.instructionEl?.value || '';
    const schema = this.ui.schemaEl?.value || '';
    
    // Get injection states
    const tableInjectionEnabled = this.ui.tableInjectToggleBtn?.classList.contains('active') || false;
    const instructionInjectionEnabled = this.ui.instInjectToggleEl?.classList.contains('active') || false;
    const schemaInjectionEnabled = this.ui.schemaInjectToggleEl?.classList.contains('active') || false;
    
    // Get send mode
    const sendMode = this.ui.sendModeEl?.value || 'auto';
    
    // Get current table data (this would need to be implemented)
    const tableData = await this.getCurrentTableData();
    
    return {
      preprompt,
      instruction,
      schema,
      tableData,
      tableInjectionEnabled,
      instructionInjectionEnabled,
      schemaInjectionEnabled,
      sendMode,
      externalMode: this.ui.externalEl?.checked || false,
      stMode: this.ui.stModeEl?.checked || false,
      context: this.ctx
    };
  }
  
  async getCurrentTableData() {
    // This should fetch current table data
    // For now, return empty data
    return {
      rows: [],
      sections: []
    };
  }
  
  async updateInjectionItems(promptData) {
    try {
      const injectionItems = await buildManagedPromptInjectionItems(promptData);
      this.state.injectionItems = injectionItems;
      
      // Update UI with injection items if needed
      // This would typically update some UI element showing active injections
      
      eventBus.emit(EVENTS.CONFIG_CHANGED, { 
        key: 'injectionItems', 
        value: injectionItems 
      });
    } catch (error) {
      console.error('[WTL PromptController] Failed to update injection items:', error);
    }
  }
  
  loadInjectionItems() {
    try {
      const savedItems = localStorage.getItem('wtl.injectionItems');
      if (savedItems) {
        this.state.injectionItems = safeParseJson(savedItems) || [];
      }
    } catch (error) {
      console.error('[WTL PromptController] Failed to load injection items:', error);
      this.state.injectionItems = [];
    }
  }
  
  savePromptToStorage(type, value) {
    const key = `wtl.${type}Prompt`;
    localStorage.setItem(key, value);
  }
  
  showPromptLog() {
    if (this.ui.logPromptBtn && this.ui.logAiBtn && this.ui.logContentEl) {
      this.ui.logPromptBtn.dataset.active = 'true';
      this.ui.logAiBtn.dataset.active = 'false';
      this.ui.logContentEl.value = this.state.lastPrompt || '';
    }
  }
  
  showAiLog() {
    if (this.ui.logPromptBtn && this.ui.logAiBtn && this.ui.logContentEl) {
      this.ui.logPromptBtn.dataset.active = 'false';
      this.ui.logAiBtn.dataset.active = 'true';
      
      // This would show AI response log
      // For now, clear the log
      this.ui.logContentEl.value = 'AI 日志内容将在此显示...';
    }
  }
  
  refreshLog() {
    if (this.ui.logPromptBtn?.dataset.active === 'true') {
      // Refresh prompt log
      if (this.ui.logContentEl) {
        this.ui.logContentEl.value = this.state.lastPrompt || '';
      }
    } else {
      // Refresh AI log
      // This would reload AI response history
      if (this.ui.logContentEl) {
        this.ui.logContentEl.value = '刷新 AI 日志...';
        // Simulate loading
        setTimeout(() => {
          if (this.ui.logContentEl) {
            this.ui.logContentEl.value = 'AI 响应日志已刷新';
          }
        }, 500);
      }
    }
  }
  
  async runBatchFill() {
    if (this.state.running) {
      alert('已有任务正在运行，请等待完成');
      return;
    }
    
    this.state.running = true;
    
    try {
      if (this.batchController) {
        await this.batchController.runBatchFill();
      }
      
      eventBus.emit(EVENTS.AI_CALL_COMPLETED, { action: 'batch_fill' });
    } catch (error) {
      console.error('[WTL PromptController] Batch fill failed:', error);
      eventBus.emit(EVENTS.AI_CALL_FAILED, { 
        action: 'batch_fill',
        error 
      });
    } finally {
      this.state.running = false;
    }
  }
  
  handleAutoRefreshToggled(enabled) {
    this.state.isAutoRefreshEnabled = enabled;
    
    if (enabled) {
      // Start auto-refresh interval
      this.startAutoRefresh();
    } else {
      // Stop auto-refresh interval
      this.stopAutoRefresh();
    }
    
    eventBus.emit(EVENTS.CONFIG_CHANGED, { 
      key: 'autoRefreshEnabled', 
      value: enabled 
    });
  }
  
  startAutoRefresh() {
    const interval = parseInt(this.ui.autoEveryEl?.value || '5000', 10);
    
    this.autoRefreshInterval = setInterval(async () => {
      await this.refreshPromptPreview();
    }, interval);
  }
  
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }
  
  getAutoRefreshConfig() {
    return {
      enabled: this.state.isAutoRefreshEnabled,
      interval: parseInt(this.ui.autoEveryEl?.value || '5000', 10),
      floors: parseInt(this.ui.autoFloorsEl?.value || '5', 10)
    };
  }
  
  setAutoRefreshConfig(config) {
    if (config.enabled !== undefined) {
      this.state.isAutoRefreshEnabled = config.enabled;
      if (this.ui.autoToggleBtn) {
        this.ui.autoToggleBtn.classList.toggle('active', config.enabled);
        this.ui.autoToggleBtn.textContent = config.enabled ? '自动刷新：开' : '自动刷新：关';
      }
    }
    
    if (config.interval !== undefined && this.ui.autoEveryEl) {
      this.ui.autoEveryEl.value = config.interval;
    }
    
    if (config.floors !== undefined && this.ui.autoFloorsEl) {
      this.ui.autoFloorsEl.value = config.floors;
    }
    
    // Restart auto-refresh if needed
    if (this.state.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }
  
  getCurrentChatId() {
    const ctx = this.ctx || window.SillyTavern?.getContext?.();
    return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || '';
  }
  
  getCharacterName() {
    const ctx = this.ctx || window.SillyTavern?.getContext?.();
    return ctx?.character?.name || '';
  }
  
  // Public API
  getPromptPreview() {
    return this.state.promptPreview;
  }
  
  getInjectionItems() {
    return [...this.state.injectionItems];
  }
  
  isRunning() {
    return this.state.running;
  }
  
  destroy() {
    // Stop auto-refresh
    this.stopAutoRefresh();
    
    // Cleanup event listeners
    if (this.ui.prePromptEl) {
      this.ui.prePromptEl.removeEventListener('input', () => this.handlePromptInput('preprompt'));
    }
    
    if (this.ui.instructionEl) {
      this.ui.instructionEl.removeEventListener('input', () => this.handlePromptInput('instruction'));
    }
    
    if (this.ui.schemaEl) {
      this.ui.schemaEl.removeEventListener('input', () => this.handlePromptInput('schema'));
    }
    
    if (this.ui.logPromptBtn) {
      this.ui.logPromptBtn.removeEventListener('click', () => this.showPromptLog());
    }
    
    if (this.ui.logAiBtn) {
      this.ui.logAiBtn.removeEventListener('click', () => this.showAiLog());
    }
    
    if (this.ui.logRefreshBtn) {
      this.ui.logRefreshBtn.removeEventListener('click', () => this.refreshLog());
    }
    
    // Destroy controllers
    if (this.batchController?.destroy) {
      this.batchController.destroy();
    }
    
    if (this.autoRefreshController?.destroy) {
      this.autoRefreshController.destroy();
    }
  }
}

// Factory function for backward compatibility
export function createPromptController(uiRefs, context, defaults) {
  return new PromptController(uiRefs, context, defaults);
}