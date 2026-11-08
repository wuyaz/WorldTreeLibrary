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
import { showToast } from '../../../shared/ui/toast.js';
import { debugAlert } from '../../../shared/utils/debugAlert.js';

export class AutoFillService {
  /**
   * @param {object} context - SillyTavern context
   * @param {Function} runFillOnceFn - 填表函数，由 createFillController 提供
   */
  constructor(context, runFillOnceFn) {
    this.ctx = context;
    this.runFillOnce = runFillOnceFn || (() => Promise.resolve());
    this.state = {
      isStreaming: false,
      messageCount: 0,
      lastStreamTime: 0,
      pendingAutoFill: false
    };
    
    this.initializeStreamingHooks();
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
    debugAlert('[DEBUG 自动填表] 事件: STREAM_START - 流式输出开始');
    showToast('开始接收回复...', 'info');
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
    debugAlert('[DEBUG 自动填表] 事件: STREAM_END - 流式输出结束，1秒后将检查自动填表');
    showToast('回复接收完成，准备填表...', 'info');
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
    debugAlert('[DEBUG 自动填表] 事件: GENERATION_STOPPED - 生成已停止，0.5秒后将检查自动填表');
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
    debugAlert('[DEBUG 自动填表] 事件: CHARACTER_MESSAGE_CREATED - 消息已创建\n当前消息计数: ' + this.state.messageCount);
  }
  
  /**
   * Handle message rendered
   */
  handleMessageRendered() {
    console.log('[WTL AutoFill] Message rendered');
    debugAlert('[DEBUG 自动填表] 事件: CHARACTER_MESSAGE_RENDERED - 消息已渲染\nisStreaming: ' + this.state.isStreaming + '\nmessageCount: ' + this.state.messageCount);
    
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
      
      debugAlert('[DEBUG 自动填表] checkAndTriggerAutoFill 开始检查\n启用: ' + autoFillEnabled + '\n消息数: ' + this.state.messageCount + '\n需要楼层: ' + autoFillFloors + '\n每N条触发: ' + autoFillEvery + '\npendingAutoFill: ' + this.state.pendingAutoFill);
      
      // Check if auto-fill is enabled
      if (!autoFillEnabled) {
        console.log('[WTL AutoFill] Auto-fill is disabled');
        debugAlert('[DEBUG 自动填表] 跳过: 自动填表已禁用');
        return;
      }
      
      // Check if we should trigger based on message count
      if (this.state.messageCount % parseInt(autoFillEvery) !== 0) {
        console.log(`[WTL AutoFill] Message count ${this.state.messageCount} not multiple of ${autoFillEvery}`);
        debugAlert('[DEBUG 自动填表] 跳过: 消息数 ' + this.state.messageCount + ' 不是 ' + autoFillEvery + ' 的倍数');
        return;
      }
      
      // Check if we have enough messages to process
      if (this.state.messageCount < parseInt(autoFillFloors)) {
        console.log(`[WTL AutoFill] Only ${this.state.messageCount} messages, need ${autoFillFloors}`);
        debugAlert('[DEBUG 自动填表] 跳过: 消息数不足 (' + this.state.messageCount + ' < ' + autoFillFloors + ')');
        return;
      }
      
      // Check if we're already running or have a pending fill
      if (this.state.pendingAutoFill) {
        console.log('[WTL AutoFill] Fill already in progress');
        debugAlert('[DEBUG 自动填表] 跳过: 已有填表进行中');
        return;
      }
      
      console.log(`[WTL AutoFill] Triggering auto-fill for ${autoFillFloors} floors`);
      debugAlert('[DEBUG 自动填表] 条件满足！即将调用 runFillOnce 开始自动填表');
      showToast('开始自动填表...', 'info');
      this.state.pendingAutoFill = true;
      
      // Trigger the fill
      await this.runFillOnce();
      showToast('自动填表完成', 'success');
      debugAlert('[DEBUG 自动填表] runFillOnce 执行完毕，自动填表完成');
      
      this.state.pendingAutoFill = false;
      
    } catch (error) {
      console.error('[WTL AutoFill] Error in auto-fill check:', error);
      debugAlert('[DEBUG 自动填表] 错误: ' + (error?.message || error));
      showToast('自动填表失败: ' + error.message, 'error');
      this.state.pendingAutoFill = false;
    }
  }
  
  /**
   * Manual trigger for auto-fill
   */
  async triggerManualAutoFill() {
    try {
      console.log('[WTL AutoFill] Manual auto-fill triggered');
      debugAlert('[DEBUG 自动填表] 手动触发自动填表');
      showToast('开始手动填表...', 'info');
      
      await this.runFillOnce();
      showToast('手动填表完成', 'success');
      debugAlert('[DEBUG 自动填表] 手动填表完成');
      
    } catch (error) {
      console.error('[WTL AutoFill] Error in manual auto-fill:', error);
      debugAlert('[DEBUG 自动填表] 手动填表错误: ' + (error?.message || error));
      showToast('手动填表失败: ' + error.message, 'error');
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