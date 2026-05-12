// @ts-nocheck
/**
 * AutoFill Service - 自动填表服务
 * 
 * 功能: 监听聊天流式输出完成事件，自动触发填表操作，提供用户通知
 * 应该写入: 流式事件监听、自动填表触发逻辑、状态管理、通知显示
 * 不应该写入: 表格数据操作、UI渲染、配置管理、业务规则
 * 
 * 被使用: MemoryTableFeature.js (自动填表集成)
 * 使用文件: settingsManager.js (配置读取), tableController.js (填表操作)
 * 
 * 注意: 这是自动填表的核心服务，只关注自动触发逻辑，不处理具体填表操作
 */

import { getSetting } from '../../../core/settingsManager.js';

export class AutoFillService {
  constructor(context, tableController) {
    this.ctx = context;
    this.tableController = tableController;
    this.state = {
      isStreaming: false,
      messageCount: 0,
      lastStreamTime: 0,
      pendingAutoFill: false
    };
    
    this.initializeStreamingHooks();
  }
  
  /**
   * Show toast notification using SillyTavern's toastr
   */
  showToast(message, type = 'info') {
    try {
      const toastr = window.toastr || window.parent?.toastr;
      if (toastr && toastr[type]) {
        toastr[type](message, 'WorldTreeLibrary');
      } else {
        console.log(`[WTL AutoFill] ${type}: ${message}`);
      }
    } catch (error) {
      console.log(`[WTL AutoFill] ${type}: ${message}`);
    }
  }
  
  /**
   * Initialize hooks to detect streaming completion
   */
  initializeStreamingHooks() {
    const { eventSource, event_types } = this.ctx || {};
    
    if (!eventSource || !event_types) {
      console.warn('[WTL AutoFill] No event source available');
      return;
    }
    
    // Hook into streaming events
    if (event_types.STREAM_START) {
      eventSource.on(event_types.STREAM_START, () => this.handleStreamStart());
    }
    
    if (event_types.STREAM_TOKEN) {
      eventSource.on(event_types.STREAM_TOKEN, () => this.handleStreamToken());
    }
    
    if (event_types.STREAM_END) {
      eventSource.on(event_types.STREAM_END, () => this.handleStreamEnd());
    }
    
    if (event_types.GENERATION_STOPPED) {
      eventSource.on(event_types.GENERATION_STOPPED, () => this.handleGenerationStopped());
    }
    
    // Hook into message creation events
    if (event_types.CHARACTER_MESSAGE_CREATED) {
      eventSource.on(event_types.CHARACTER_MESSAGE_CREATED, () => this.handleMessageCreated());
    }
    
    if (event_types.CHARACTER_MESSAGE_RENDERED) {
      eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => this.handleMessageRendered());
    }
  }
  
  /**
   * Handle streaming start
   */
  handleStreamStart() {
    console.log('[WTL AutoFill] Stream started');
    this.showToast('开始接收回复...', 'info');
    this.state.isStreaming = true;
    this.state.lastStreamTime = Date.now();
    this.state.pendingAutoFill = false;
  }
  
  /**
   * Handle streaming token (to detect ongoing streaming)
   */
  handleStreamToken() {
    this.state.lastStreamTime = Date.now();
  }
  
  /**
   * Handle streaming end
   */
  handleStreamEnd() {
    console.log('[WTL AutoFill] Stream ended');
    this.showToast('回复接收完成，准备填表...', 'info');
    this.state.isStreaming = false;
    
    // Schedule auto-fill check after a short delay to ensure message is fully processed
    setTimeout(() => {
      this.checkAndTriggerAutoFill();
    }, 1000);
  }
  
  /**
   * Handle generation stopped
   */
  handleGenerationStopped() {
    console.log('[WTL AutoFill] Generation stopped');
    this.state.isStreaming = false;
    
    // Schedule auto-fill check after a short delay
    setTimeout(() => {
      this.checkAndTriggerAutoFill();
    }, 500);
  }
  
  /**
   * Handle message created
   */
  handleMessageCreated() {
    this.state.messageCount++;
    console.log(`[WTL AutoFill] Message created. Total: ${this.state.messageCount}`);
  }
  
  /**
   * Handle message rendered
   */
  handleMessageRendered() {
    console.log('[WTL AutoFill] Message rendered');
    
    // If not currently streaming, check if we should trigger auto-fill
    if (!this.state.isStreaming) {
      this.checkAndTriggerAutoFill();
    }
  }
  
  /**
   * Check conditions and trigger auto-fill if needed
   */
  async checkAndTriggerAutoFill() {
    try {
      // Read settings from extension_settings
      const autoFillEnabled = await getSetting('memoryTable', 'autoFillEnabled', true);
      const autoFillFloors = await getSetting('memoryTable', 'autoFillFloors', '3');
      const autoFillEvery = await getSetting('memoryTable', 'autoFillEvery', '1');
      
      // Check if auto-fill is enabled
      if (!autoFillEnabled) {
        console.log('[WTL AutoFill] Auto-fill is disabled');
        return;
      }
      
      // Check if we should trigger based on message count
      if (this.state.messageCount % parseInt(autoFillEvery) !== 0) {
        console.log(`[WTL AutoFill] Message count ${this.state.messageCount} not multiple of ${autoFillEvery}`);
        return;
      }
      
      // Check if we have enough messages to process
      if (this.state.messageCount < parseInt(autoFillFloors)) {
        console.log(`[WTL AutoFill] Only ${this.state.messageCount} messages, need ${autoFillFloors}`);
        return;
      }
      
      // Check if we're already running or have a pending fill
      if (this.state.pendingAutoFill || this.tableController?.state?.running) {
        console.log('[WTL AutoFill] Fill already in progress');
        return;
      }
      
      console.log(`[WTL AutoFill] Triggering auto-fill for ${autoFillFloors} floors`);
      this.showToast('开始自动填表...', 'info');
      this.state.pendingAutoFill = true;
      
      // Trigger the fill
      if (this.tableController?.runFillOnce) {
        await this.tableController.runFillOnce();
        this.showToast('自动填表完成', 'success');
      }
      
      this.state.pendingAutoFill = false;
      
    } catch (error) {
      console.error('[WTL AutoFill] Error in auto-fill check:', error);
      this.showToast('自动填表失败: ' + error.message, 'error');
      this.state.pendingAutoFill = false;
    }
  }
  
  /**
   * Manual trigger for auto-fill
   */
  async triggerManualAutoFill() {
    try {
      console.log('[WTL AutoFill] Manual auto-fill triggered');
      this.showToast('开始手动填表...', 'info');
      
      if (this.tableController?.runFillOnce) {
        await this.tableController.runFillOnce();
        this.showToast('手动填表完成', 'success');
      }
      
    } catch (error) {
      console.error('[WTL AutoFill] Error in manual auto-fill:', error);
      this.showToast('手动填表失败: ' + error.message, 'error');
    }
  }
  
  /**
   * Get current auto-fill state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    const { eventSource, event_types } = this.ctx || {};
    
    if (eventSource && event_types) {
      if (event_types.STREAM_START) {
        eventSource.off(event_types.STREAM_START, this.handleStreamStart);
      }
      if (event_types.STREAM_TOKEN) {
        eventSource.off(event_types.STREAM_TOKEN, this.handleStreamToken);
      }
      if (event_types.STREAM_END) {
        eventSource.off(event_types.STREAM_END, this.handleStreamEnd);
      }
      if (event_types.GENERATION_STOPPED) {
        eventSource.off(event_types.GENERATION_STOPPED, this.handleGenerationStopped);
      }
      if (event_types.CHARACTER_MESSAGE_CREATED) {
        eventSource.off(event_types.CHARACTER_MESSAGE_CREATED, this.handleMessageCreated);
      }
      if (event_types.CHARACTER_MESSAGE_RENDERED) {
        eventSource.off(event_types.CHARACTER_MESSAGE_RENDERED, this.handleMessageRendered);
      }
    }
  }
}