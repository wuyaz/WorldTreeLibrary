// @ts-nocheck
/**
 * SessionSandbox.js - 会话沙箱管理器
 * 
 * 功能: 以Chat ID为主键建立独立沙箱，管理每个聊天的表格数据、隐藏行配置、历史记录等会话状态。提供会话切换、数据读写、自动保存功能。
 * 
 * 应该写入:
 * - 会话切换逻辑（保存当前/加载新会话）
 * - 表格数据的读写
 * - 隐藏行配置的读写
 * - 历史记录的追加和管理（最多50条）
 * - localStorage的读写封装
 * - 内存缓存的管理
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 业务逻辑处理
 * - AI调用逻辑
 * - 复杂的数据转换
 * 
 * 被使用:
 * - js/features/memoryTable/core/MemoryTableCore.js
 * 
 * 使用文件:
 * - localStorage (持久化存储)
 * 
 * 注意:
 * - 存储键格式：wtl.session.{chatId}.{dataType}
 * - 切换聊天时自动保存当前会话
 * - 历史记录超过50条会自动清理最旧的
 */

export class SessionSandbox {
  constructor() {
    this.prefix = 'wtl.session';
    this.currentChatId = null;
    this.cache = new Map();
  }
  
  /**
   * 切换会话
   */
  switchChat(chatId) {
    if (this.currentChatId === chatId) return;
    
    // 保存当前会话
    this.saveCurrentSession();
    
    // 切换到新会话
    this.currentChatId = chatId;
    
    // 加载新会话
    this.loadSession(chatId);
  }
  
  /**
   * 获取当前表格数据
   */
  getTableData() {
    return this.getSessionData('table');
  }
  
  /**
   * 设置当前表格数据
   */
  setTableData(data) {
    this.setSessionData('table', data);
  }
  
  /**
   * 获取隐藏行配置
   */
  getHiddenRows() {
    return this.getSessionData('hiddenRows') || {};
  }
  
  /**
   * 设置隐藏行配置
   */
  setHiddenRows(hiddenRows) {
    this.setSessionData('hiddenRows', hiddenRows);
  }
  
  /**
   * 获取历史记录
   */
  getHistory() {
    return this.getSessionData('history') || [];
  }
  
  /**
   * 添加历史记录
   */
  addHistory(record) {
    const history = this.getHistory();
    history.push({
      timestamp: Date.now(),
      ...record
    });
    
    // 限制历史记录数量
    if (history.length > 50) {
      history.shift();
    }
    
    this.setSessionData('history', history);
  }
  
  /**
   * 清空当前会话
   */
  clearCurrentSession() {
    if (!this.currentChatId) return;
    
    this.cache.delete(this.currentChatId);
    const key = `${this.prefix}.${this.currentChatId}`;
    localStorage.removeItem(key);
  }
  
  /**
   * 获取会话数据
   */
  getSessionData(key) {
    if (!this.currentChatId) return null;
    
    const session = this.cache.get(this.currentChatId);
    if (!session) return null;
    
    return session[key] || null;
  }
  
  /**
   * 设置会话数据
   */
  setSessionData(key, value) {
    if (!this.currentChatId) return;
    
    let session = this.cache.get(this.currentChatId);
    if (!session) {
      session = {};
    }
    
    session[key] = value;
    this.cache.set(this.currentChatId, session);
  }
  
  /**
   * 加载会话
   */
  loadSession(chatId) {
    const key = `${this.prefix}.${chatId}`;
    const value = localStorage.getItem(key);
    
    if (value) {
      try {
        const session = JSON.parse(value);
        this.cache.set(chatId, session);
      } catch (e) {
        console.error('[SessionSandbox] Failed to load session:', e);
        this.cache.set(chatId, {});
      }
    } else {
      this.cache.set(chatId, {});
    }
  }
  
  /**
   * 保存当前会话
   */
  saveCurrentSession() {
    if (!this.currentChatId) return;
    
    const session = this.cache.get(this.currentChatId);
    if (!session) return;
    
    const key = `${this.prefix}.${this.currentChatId}`;
    localStorage.setItem(key, JSON.stringify(session));
  }
}
