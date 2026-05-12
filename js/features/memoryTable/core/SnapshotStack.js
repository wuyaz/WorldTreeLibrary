// @ts-nocheck
/**
 * SnapshotStack.js - 快照栈管理器
 * 
 * 功能: 管理表格数据的快照历史，支持撤销重做操作。维护一个固定大小的栈，自动清理超出限制的旧快照。
 * 
 * 应该写入:
 * - 快照的推送（深拷贝后入栈）
 * - 撤销操作（索引后退）
 * - 重做操作（索引前进）
 * - 当前快照的获取
 * - 栈状态的查询（大小/可否撤销/可否重做）
 * - 栈的清空
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 业务逻辑处理
 * - AI调用逻辑
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/core/MemoryTableCore.js
 * - js/features/memoryTable/services/MutationExecutor.js
 * 
 * 使用文件:
 * - 无外部依赖（纯数据结构）
 * 
 * 注意:
 * - 默认最大栈大小为50
 * - 非栈顶位置push会清除后续快照
 * - 快照使用JSON深拷贝
 * - 索引从0开始，-1表示空栈
 */

export class SnapshotStack {
  constructor(maxSize = 50) {
    this.stack = [];
    this.currentIndex = -1;
    this.maxSize = maxSize;
  }
  
  /**
   * 推入新快照
   */
  push(state) {
    // 清除当前位置之后的所有快照
    if (this.currentIndex < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
    }
    
    // 深拷贝状态
    const snapshot = {
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(state))
    };
    
    this.stack.push(snapshot);
    
    // 限制栈大小
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }
    
    return snapshot;
  }
  
  /**
   * 撤销
   */
  undo() {
    if (!this.canUndo()) return null;
    
    this.currentIndex--;
    return JSON.parse(JSON.stringify(this.stack[this.currentIndex].data));
  }
  
  /**
   * 重做
   */
  redo() {
    if (!this.canRedo()) return null;
    
    this.currentIndex++;
    return JSON.parse(JSON.stringify(this.stack[this.currentIndex].data));
  }
  
  /**
   * 是否可撤销
   */
  canUndo() {
    return this.currentIndex > 0;
  }
  
  /**
   * 是否可重做
   */
  canRedo() {
    return this.currentIndex < this.stack.length - 1;
  }
  
  /**
   * 获取当前快照
   */
  getCurrent() {
    if (this.currentIndex < 0 || this.currentIndex >= this.stack.length) {
      return null;
    }
    
    return JSON.parse(JSON.stringify(this.stack[this.currentIndex].data));
  }
  
  /**
   * 获取历史记录
   */
  getHistory() {
    return this.stack.map((snapshot, index) => ({
      index,
      timestamp: snapshot.timestamp,
      isCurrent: index === this.currentIndex
    }));
  }
  
  /**
   * 清空栈
   */
  clear() {
    this.stack = [];
    this.currentIndex = -1;
  }
}
