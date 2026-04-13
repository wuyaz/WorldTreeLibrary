// @ts-nocheck
/**
 * Runtime Controller for Memory Table
 * Handles batch operations, auto-refresh, and runtime interactions
 */

import { createBatchController, createOpenAiModelController } from '../ui/runtimeControllers.js';
import { createAutoRefreshController, bindWorldBookControls, bindOpenAiPresetControls } from '../ui/actionControllers.js';
import { renderManualWorldBookEditor } from '../ui/manualWorldBook.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class RuntimeController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.batchController = null;
    this.openAiModelController = null;
    this.autoRefreshController = null;
    this.manualWorldBookController = null;
    
    this.state = {
      isBatchRunning: false,
      isAutoRefreshEnabled: true,
      isManualWorldBookEnabled: false,
      currentBatchStart: 1,
      currentBatchEnd: 1,
      currentBatchStep: 1,
      openAiModels: [],
      worldBookMode: 'auto'
    };
    
    this.initialize();
  }
  
  initialize() {
    this.initializeControllers();
    this.bindEvents();
    this.loadInitialState();
    this.syncUI();
    this.startAutoRefresh();
  }
  
  initializeControllers() {
    // Initialize batch controller
    this.batchController = createBatchController({
      batchStartEl: this.ui.batchStartEl,
      batchEndEl: this.ui.batchEndEl,
      batchStepEl: this.ui.batchStepEl,
      setStatus: this.ctx.setStatus || (() => {}),
      runFillOnce: this.ctx.runFillOnce || (() => Promise.resolve())
    });
    
    // Initialize OpenAI model controller
    this.openAiModelController = createOpenAiModelController({
      openaiUrlEl: this.ui.openaiUrlEl,
      openaiKeyEl: this.ui.openaiKeyEl,
      openaiModelEl: this.ui.openaiModelEl
    });
    
    // Initialize auto-refresh controller
    this.autoRefreshController = createAutoRefreshController({
      pageConfigEl: this.ui.pageConfigEl,
      sendModeEl: this.ui.sendModeEl,
      logPromptBtn: this.ui.logPromptBtn,
      logAiBtn: this.ui.logAiBtn,
      logContentEl: this.ui.logContentEl,
      refreshPromptPreview: this.ctx.refreshPromptPreview || (() => Promise.resolve())
    });
    
    // Initialize manual worldbook controller
    this.manualWorldBookController = renderManualWorldBookEditor({
      wbModeEl: this.ui.wbModeEl,
      wbManualWrapEl: this.ui.wbManualWrapEl,
      wbManualEl: this.ui.wbManualEl,
      wbManualRefreshEl: this.ui.wbManualRefreshEl,
      buildManualWorldBookTemplate: this.ctx.buildManualWorldBookTemplate || (() => Promise.resolve('')),
      getManualConfig: this.ctx.getManualConfig || (() => ({})),
      mergeManualConfig: this.ctx.mergeManualConfig || ((a, b) => ({ ...a, ...b })),
      setManualConfig: this.ctx.setManualConfig || (() => {}),
      renderManualWorldBookUI: this.ctx.renderManualWorldBookUI || (() => {}),
      saveState: this.ctx.saveState || (() => Promise.resolve()),
      refreshPromptPreview: this.ctx.refreshPromptPreview || (() => Promise.resolve())
    });
  }
  
  bindEvents() {
    // Bind batch controls
    if (this.ui.batchBtn) {
      this.ui.batchBtn.addEventListener('click', () => {
        this.runBatchFill();
      });
    }
    
    // Bind auto-refresh toggle
    if (this.ui.autoToggleBtn) {
      this.ui.autoToggleBtn.addEventListener('click', () => {
        this.toggleAutoRefresh();
      });
    }
    
    // Bind worldbook controls
    bindWorldBookControls({
      wbModeEl: this.ui.wbModeEl,
      wbManualWrapEl: this.ui.wbManualWrapEl,
      wbManualEl: this.ui.wbManualEl,
      wbManualRefreshEl: this.ui.wbManualRefreshEl,
      buildManualWorldBookTemplate: this.ctx.buildManualWorldBookTemplate || (() => Promise.resolve('')),
      getManualConfig: this.ctx.getManualConfig || (() => ({})),
      mergeManualConfig: this.ctx.mergeManualConfig || ((a, b) => ({ ...a, ...b })),
      setManualConfig: this.ctx.setManualConfig || (() => {}),
      renderManualWorldBookUI: this.ctx.renderManualWorldBookUI || (() => {}),
      saveState: this.ctx.saveState || (() => Promise.resolve()),
      refreshPromptPreview: this.ctx.refreshPromptPreview || (() => Promise.resolve())
    });
    
    // Bind OpenAI preset controls
    bindOpenAiPresetControls({
      openaiRefreshEl: this.ui.openaiRefreshEl,
      openaiPresetLoadEl: this.ui.openaiPresetLoadEl,
      openaiPresetDelEl: this.ui.openaiPresetDelEl,
      externalSaveEl: this.ui.externalSaveEl,
      openaiPresetEl: this.ui.openaiPresetEl,
      openaiPresetNameEl: this.ui.openaiPresetNameEl,
      openaiUrlEl: this.ui.openaiUrlEl,
      openaiKeyEl: this.ui.openaiKeyEl,
      openaiModelEl: this.ui.openaiModelEl,
      openaiTempEl: this.ui.openaiTempEl,
      openaiMaxEl: this.ui.openaiMaxEl,
      openaiStreamEl: this.ui.openaiStreamEl,
      refreshModels: this.openAiModelController?.refreshModels || (() => Promise.resolve()),
      loadOpenAIPresetByName: this.ctx.loadOpenAIPresetByName || (() => ({})),
      getOpenAIPresets: this.ctx.getOpenAIPresets || (() => []),
      setOpenAIPresets: this.ctx.setOpenAIPresets || (() => {}),
      refreshOpenAIPresetSelect: this.ctx.refreshOpenAIPresetSelect || (() => {}),
      saveState: this.ctx.saveState || (() => Promise.resolve()),
      setStatus: this.ctx.setStatus || (() => {})
    });
    
    // Bind event bus listeners
    eventBus.on(EVENTS.BATCH_STARTED, this.handleBatchStarted.bind(this));
    eventBus.on(EVENTS.BATCH_COMPLETED, this.handleBatchCompleted.bind(this));
    eventBus.on(EVENTS.BATCH_ERROR, this.handleBatchError.bind(this));
    eventBus.on(EVENTS.AUTO_REFRESH_TOGGLED, this.handleAutoRefreshToggled.bind(this));
  }
  
  loadInitialState() {
    // Load batch settings from UI
    if (this.ui.batchStartEl) {
      this.state.currentBatchStart = parseInt(this.ui.batchStartEl.value) || 1;
    }
    if (this.ui.batchEndEl) {
      this.state.currentBatchEnd = parseInt(this.ui.batchEndEl.value) || 1;
    }
    if (this.ui.batchStepEl) {
      this.state.currentBatchStep = parseInt(this.ui.batchStepEl.value) || 1;
    }
    
    // Load worldbook mode from UI
    if (this.ui.wbModeEl) {
      this.state.worldBookMode = this.ui.wbModeEl.value || 'auto';
    }
    
    // Load auto-refresh state from localStorage
    const autoRefreshState = localStorage.getItem('wtl.autoRefreshEnabled');
    if (autoRefreshState !== null) {
      this.state.isAutoRefreshEnabled = autoRefreshState === 'true';
    }
  }
  
  syncUI() {
    // Update auto-refresh button state
    if (this.ui.autoToggleBtn) {
      this.ui.autoToggleBtn.textContent = this.state.isAutoRefreshEnabled ? '关闭自动刷新' : '开启自动刷新';
      this.ui.autoToggleBtn.dataset.enabled = this.state.isAutoRefreshEnabled ? 'true' : 'false';
    }
    
    // Update batch input values
    if (this.ui.batchStartEl && this.ui.batchStartEl.value !== this.state.currentBatchStart.toString()) {
      this.ui.batchStartEl.value = this.state.currentBatchStart.toString();
    }
    if (this.ui.batchEndEl && this.ui.batchEndEl.value !== this.state.currentBatchEnd.toString()) {
      this.ui.batchEndEl.value = this.state.currentBatchEnd.toString();
    }
    if (this.ui.batchStepEl && this.ui.batchStepEl.value !== this.state.currentBatchStep.toString()) {
      this.ui.batchStepEl.value = this.state.currentBatchStep.toString();
    }
    
    // Update worldbook mode UI
    if (this.ui.wbModeEl && this.ui.wbModeEl.value !== this.state.worldBookMode) {
      this.ui.wbModeEl.value = this.state.worldBookMode;
    }
    if (this.ui.wbManualWrapEl) {
      this.ui.wbManualWrapEl.style.display = this.state.worldBookMode === 'manual' ? 'block' : 'none';
    }
  }
  
  // Public methods
  startAutoRefresh() {
    if (this.state.isAutoRefreshEnabled && this.autoRefreshController) {
      this.autoRefreshController.ensurePreviewAutoRefresh();
    }
  }
  
  stopAutoRefresh() {
    // Auto-refresh is controlled by the controller's internal timer
    // We'll rely on the controller to handle cleanup
  }
  
  toggleAutoRefresh() {
    this.state.isAutoRefreshEnabled = !this.state.isAutoRefreshEnabled;
    localStorage.setItem('wtl.autoRefreshEnabled', this.state.isAutoRefreshEnabled.toString());
    this.syncUI();
    
    if (this.state.isAutoRefreshEnabled) {
      this.startAutoRefresh();
      if (this.ctx.setStatus) {
        this.ctx.setStatus('自动刷新已开启');
      }
    } else {
      // Note: The auto-refresh controller handles its own cleanup
      if (this.ctx.setStatus) {
        this.ctx.setStatus('自动刷新已关闭');
      }
    }
    
    eventBus.emit(EVENTS.AUTO_REFRESH_TOGGLED, { enabled: this.state.isAutoRefreshEnabled });
  }
  
  async runBatchFill() {
    if (this.state.isBatchRunning) {
      if (this.ctx.setStatus) {
        this.ctx.setStatus('批量任务已在运行中');
      }
      return;
    }
    
    if (!this.batchController) {
      if (this.ctx.setStatus) {
        this.ctx.setStatus('批量控制器未初始化');
      }
      return;
    }
    
    this.state.isBatchRunning = true;
    if (this.ui.batchBtn) {
      this.ui.batchBtn.disabled = true;
      this.ui.batchBtn.textContent = '批量处理中...';
    }
    
    eventBus.emit(EVENTS.BATCH_STARTED, {
      start: this.state.currentBatchStart,
      end: this.state.currentBatchEnd,
      step: this.state.currentBatchStep
    });
    
    try {
      await this.batchController.runBatchFill();
      eventBus.emit(EVENTS.BATCH_COMPLETED, {
        start: this.state.currentBatchStart,
        end: this.state.currentBatchEnd,
        step: this.state.currentBatchStep
      });
    } catch (error) {
      console.error('[WTL] Batch fill error:', error);
      eventBus.emit(EVENTS.BATCH_ERROR, { error: error.message });
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`批量处理出错: ${error.message}`);
      }
    } finally {
      this.state.isBatchRunning = false;
      if (this.ui.batchBtn) {
        this.ui.batchBtn.disabled = false;
        this.ui.batchBtn.textContent = '批量填表';
      }
    }
  }
  
  async refreshOpenAiModels() {
    if (!this.openAiModelController) {
      if (this.ctx.setStatus) {
        this.ctx.setStatus('OpenAI 控制器未初始化');
      }
      return;
    }
    
    try {
      await this.openAiModelController.refreshModels();
      if (this.ctx.setStatus) {
        this.ctx.setStatus('OpenAI 模型列表已刷新');
      }
      eventBus.emit(EVENTS.OPENAI_MODELS_REFRESHED);
    } catch (error) {
      console.error('[WTL] Failed to refresh OpenAI models:', error);
      if (this.ctx.setStatus) {
        this.ctx.setStatus(`刷新模型失败: ${error.message}`);
      }
    }
  }
  
  setWorldBookMode(mode) {
    if (!['auto', 'manual'].includes(mode)) return;
    
    this.state.worldBookMode = mode;
    localStorage.setItem('wtl.worldBookMode', mode);
    this.syncUI();
    
    eventBus.emit(EVENTS.WORLDBOOK_MODE_CHANGED, { mode });
  }
  
  updateBatchSettings(start, end, step) {
    const newStart = Math.max(1, parseInt(start) || 1);
    const newEnd = Math.max(newStart, parseInt(end) || newStart);
    const newStep = Math.max(1, parseInt(step) || 1);
    
    this.state.currentBatchStart = newStart;
    this.state.currentBatchEnd = newEnd;
    this.state.currentBatchStep = newStep;
    
    localStorage.setItem('wtl.batchStart', newStart.toString());
    localStorage.setItem('wtl.batchEnd', newEnd.toString());
    localStorage.setItem('wtl.batchStep', newStep.toString());
    
    this.syncUI();
    eventBus.emit(EVENTS.BATCH_SETTINGS_CHANGED, {
      start: newStart,
      end: newEnd,
      step: newStep
    });
  }
  
  // Event handlers
  handleBatchStarted(data) {
    this.state.isBatchRunning = true;
    this.syncUI();
  }
  
  handleBatchCompleted(data) {
    this.state.isBatchRunning = false;
    this.syncUI();
  }
  
  handleBatchError(data) {
    this.state.isBatchRunning = false;
    this.syncUI();
  }
  
  handleAutoRefreshToggled(data) {
    this.state.isAutoRefreshEnabled = data.enabled;
    this.syncUI();
  }
  
  // Cleanup
  destroy() {
    eventBus.off(EVENTS.BATCH_STARTED, this.handleBatchStarted.bind(this));
    eventBus.off(EVENTS.BATCH_COMPLETED, this.handleBatchCompleted.bind(this));
    eventBus.off(EVENTS.BATCH_ERROR, this.handleBatchError.bind(this));
    eventBus.off(EVENTS.AUTO_REFRESH_TOGGLED, this.handleAutoRefreshToggled.bind(this));
    
    // Clean up any intervals or timeouts
    if (this.autoRefreshController?.cleanup) {
      this.autoRefreshController.cleanup();
    }
  }
}