// @ts-nocheck
/**
 * Page Controller for Memory Table
 * Handles page navigation, mode controls, and main UI interactions
 */

import { 
  createExternalTabController, 
  bindPageControls, 
  bindModeControls 
} from '../ui/pageControllers.js';
import { getFeatureFlags } from '../../../core/storage.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class PageController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.externalTabController = null;
    
    this.state = {
      currentPage: 'main',
      currentMode: 'st',
      currentInstMode: 'bundle',
      currentSchemaMode: 'send',
      currentExternalTab: 'order',
      isFeatureEnabled: true
    };
    
    this.initialize();
  }
  
  initialize() {
    this.initializeControllers();
    this.bindEvents();
    this.loadInitialState();
    this.syncUI();
  }
  
  initializeControllers() {
    // Initialize external tab controller
    this.externalTabController = createExternalTabController({
      externalNavOrderBtn: this.ui.externalNavOrderBtn,
      externalNavRefBtn: this.ui.externalNavRefBtn,
      externalNavWbBtn: this.ui.externalNavWbBtn,
      externalPanelOrderEl: this.ui.externalPanelOrderEl,
      externalPanelRefEl: this.ui.externalPanelRefEl,
      externalPanelWbEl: this.ui.externalPanelWbEl
    });
  }
  
  bindEvents() {
    // Bind page controls
    bindPageControls({
      openConfigBtn: this.ui.openConfigBtn,
      backMainBtn: this.ui.backMainBtn,
      pageMainEl: this.ui.pageMainEl,
      pageConfigEl: this.ui.pageConfigEl,
      hideTemplateEditor: this.hideTemplateEditor.bind(this),
      sendModeEl: this.ui.sendModeEl,
      logPromptBtn: this.ui.logPromptBtn,
      logAiBtn: this.ui.logAiBtn,
      logContentEl: this.ui.logContentEl,
      logRefreshBtn: this.ui.logRefreshBtn,
      refreshSchemaBtn: this.ui.refreshSchemaBtn,
      refreshPromptPreview: this.ctx.refreshPromptPreview || (() => {}),
      updateSchemaPreview: this.ctx.updateSchemaPreview || (() => {}),
      setStatus: this.ctx.setStatus || (() => {})
    });
    
    // Bind mode controls
    bindModeControls({
      sendModeEl: this.ui.sendModeEl,
      instModeEl: this.ui.instModeEl,
      schemaModeSendEl: this.ui.schemaModeSendEl,
      schemaModeCopyEl: this.ui.schemaModeCopyEl,
      schemaModeDisplayEl: this.ui.schemaModeDisplayEl,
      externalEl: this.ui.externalEl,
      stModeEl: this.ui.stModeEl,
      instBlockEl: this.ui.instBlockEl,
      instSidebarEl: this.ui.instSidebarEl,
      onSendModeChange: this.handleSendModeChange.bind(this),
      onInstModeChange: this.handleInstModeChange.bind(this),
      onSchemaModeChange: this.handleSchemaModeChange.bind(this)
    });
    
    // Bind event bus listeners
    eventBus.on(EVENTS.FEATURE_FLAGS_CHANGED, this.handleFeatureFlagsChanged.bind(this));
    eventBus.on(EVENTS.CHAT_CHANGED, this.handleChatChanged.bind(this));
  }
  
  loadInitialState() {
    const flags = getFeatureFlags();
    this.state.isFeatureEnabled = flags.memoryTable !== false;
    
    // Load current mode from UI elements
    if (this.ui.sendModeEl) {
      this.state.currentMode = this.ui.sendModeEl.value || 'st';
    }
    if (this.ui.instModeEl) {
      this.state.currentInstMode = this.ui.instModeEl.value || 'bundle';
    }
  }
  
  syncUI() {
    // Show/hide feature disabled message
    if (this.ui.memoryFeatureDisabledEl) {
      this.ui.memoryFeatureDisabledEl.style.display = this.state.isFeatureEnabled ? 'none' : 'block';
    }
    
    // Set initial page
    if (this.state.currentPage === 'main') {
      if (this.ui.pageMainEl) this.ui.pageMainEl.style.display = 'block';
      if (this.ui.pageConfigEl) this.ui.pageConfigEl.style.display = 'none';
    } else {
      if (this.ui.pageMainEl) this.ui.pageMainEl.style.display = 'none';
      if (this.ui.pageConfigEl) this.ui.pageConfigEl.style.display = 'block';
    }
    
    // Set initial external tab
    if (this.externalTabController) {
      this.externalTabController.setExternalLeftTab(this.state.currentExternalTab);
    }
  }
  
  // Public methods
  navigateTo(page) {
    if (page === this.state.currentPage) return;
    
    this.state.currentPage = page;
    
    if (page === 'main') {
      if (this.ui.pageMainEl) this.ui.pageMainEl.style.display = 'block';
      if (this.ui.pageConfigEl) this.ui.pageConfigEl.style.display = 'none';
    } else if (page === 'config') {
      if (this.ui.pageMainEl) this.ui.pageMainEl.style.display = 'none';
      if (this.ui.pageConfigEl) this.ui.pageConfigEl.style.display = 'block';
    }
    
    eventBus.emit(EVENTS.PAGE_CHANGED, { page });
  }
  
  setExternalTab(tab) {
    if (!['order', 'ref', 'wb'].includes(tab)) return;
    
    this.state.currentExternalTab = tab;
    if (this.externalTabController) {
      this.externalTabController.setExternalLeftTab(tab);
    }
    
    eventBus.emit(EVENTS.EXTERNAL_TAB_CHANGED, { tab });
  }
  
  hideTemplateEditor() {
    if (this.ui.templateEditorEl) {
      this.ui.templateEditorEl.style.display = 'none';
    }
  }
  
  showTemplateEditor() {
    if (this.ui.templateEditorEl) {
      this.ui.templateEditorEl.style.display = 'block';
    }
  }
  
  // Event handlers
  handleSendModeChange(mode) {
    this.state.currentMode = mode;
    eventBus.emit(EVENTS.SEND_MODE_CHANGED, { mode });
  }
  
  handleInstModeChange(mode) {
    this.state.currentInstMode = mode;
    eventBus.emit(EVENTS.INST_MODE_CHANGED, { mode });
  }
  
  handleSchemaModeChange(mode) {
    this.state.currentSchemaMode = mode;
    eventBus.emit(EVENTS.SCHEMA_MODE_CHANGED, { mode });
  }
  
  handleFeatureFlagsChanged(flags) {
    this.state.isFeatureEnabled = flags.memoryTable !== false;
    this.syncUI();
  }
  
  handleChatChanged(chatData) {
    // Update UI based on chat change if needed
    if (this.ctx.setStatus) {
      this.ctx.setStatus(`已切换到聊天: ${chatData.name || '未知'}`);
    }
  }
  
  // Cleanup
  destroy() {
    eventBus.off(EVENTS.FEATURE_FLAGS_CHANGED, this.handleFeatureFlagsChanged.bind(this));
    eventBus.off(EVENTS.CHAT_CHANGED, this.handleChatChanged.bind(this));
  }
}