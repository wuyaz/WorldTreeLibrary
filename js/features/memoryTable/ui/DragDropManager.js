// @ts-nocheck
/**
 * DragDropManager.js - 拖拽管理器
 * 
 * 功能: 统一管理所有拖拽排序功能，包括块列表、提示词顺序、参考信息顺序、表格列等的拖拽重排。支持handle触发、位置检测、顺序回调。
 * 
 * 应该写入:
 * - 全局拖拽事件的绑定和阻止默认行为
 * - 容器的拖拽排序启用
 * - dragstart/dragover/drop事件的处理
 * - 拖拽位置的检测（before/after判断）
 * - 顺序变更的回调触发
 * - 拖拽状态的视觉反馈（is-dragging类）
 * 
 * 不应该写入:
 * - 具体的业务数据处理
 * - 底层存储读写
 * - 复杂的DOM创建
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/blockController.js
 * - js/features/memoryTable/controllers/editorController.js
 * 
 * 使用文件:
 * - document.addEventListener (全局事件)
 * 
 * 注意:
 * - handleSelector用于限制拖拽触发区域
 * - composedPath用于精确检测handle点击
 * - 拖拽期间会添加is-dragging类
 * - onReorder回调返回新的ID顺序数组
 */

export class DragDropManager {
  constructor(root) {
    this.root = root;
    this.draggedItem = null;
    this.dropTarget = null;
  }
  
  /**
   * 初始化拖拽功能
   */
  initialize() {
    this.bindGlobalEvents();
  }
  
  /**
   * 绑定全局拖拽事件
   */
  bindGlobalEvents() {
    // 阻止默认拖拽行为
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * 为容器启用拖拽排序
   */
  enableSortable(container, options = {}) {
    if (!container) {
      console.warn('[DragDropManager] Container not found');
      return;
    }
    
    const {
      itemSelector = '.wtl-orchestrator-item, .wtl-table-pill',
      handleSelector = '.wtl-orchestrator-handle, .wtl-table-pill-drag-handle',
      onReorder = null,
      draggable = true
    } = options;
    
    console.log('[DragDropManager] Enabling sortable for container:', container.id || container.className);
    console.log('[DragDropManager] Item selector:', itemSelector);
    console.log('[DragDropManager] Handle selector:', handleSelector);
    
    container.addEventListener('dragstart', (e) => {
      console.log('[DragDropManager] Dragstart event target:', e.target.className);
      console.log('[DragDropManager] Event composed path:', e.composedPath().map(el => el.className || el.tagName));
      
      const item = e.target.closest(itemSelector);
      if (!item) {
        console.log('[DragDropManager] No item found for dragstart');
        return;
      }
      
      // 检查是否通过handle拖拽 - 使用 composedPath 检查整个事件路径
      if (handleSelector) {
        const path = e.composedPath();
        const handle = path.find(el => el.classList && el.classList.contains(handleSelector.replace('.', '').split(' ')[0]));
        
        console.log('[DragDropManager] Handle found via path:', handle ? handle.className : 'null');
        
        if (!handle) {
          e.preventDefault();
          console.log('[DragDropManager] Drag prevented - not from handle');
          return;
        }
        console.log('[DragDropManager] Drag started from handle');
      }
      
      this.draggedItem = item;
      item.classList.add('is-dragging');
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.block || item.dataset.sectionIdx || '');
    });
    
    container.addEventListener('dragend', (e) => {
      const item = e.target.closest(itemSelector);
      if (!item) return;
      
      if (this.draggedItem) {
        this.draggedItem.classList.remove('is-dragging');
        this.draggedItem = null;
      }
      
      if (onReorder) {
        const items = Array.from(container.querySelectorAll(itemSelector));
        const order = items.map((item, idx) => ({
          id: item.dataset.block || item.dataset.sectionIdx,
          index: idx
        }));
        console.log('[DragDropManager] Reorder callback with order:', order);
        onReorder(order);
      }
    });
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const item = e.target.closest(itemSelector);
      if (!item || item === this.draggedItem) return;
      
      const rect = item.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      
      if (e.clientX < midX) {
        item.parentNode.insertBefore(this.draggedItem, item);
      } else {
        item.parentNode.insertBefore(this.draggedItem, item.nextSibling);
      }
    });
    
    container.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * 为表头启用列拖拽排序
   */
  enableColumnSortable(table, options = {}) {
    if (!table) {
      console.warn('[DragDropManager] Table not found');
      return;
    }
    
    const thead = table.querySelector('thead');
    if (!thead) {
      console.warn('[DragDropManager] Thead not found');
      return;
    }
    
    const { onReorder } = options;
    const handleSelector = '.wtl-table-col-drag-handle';
    
    console.log('[DragDropManager] Enabling column sortable for table');
    
    thead.addEventListener('dragstart', (e) => {
      console.log('[DragDropManager] Column dragstart event target:', e.target.tagName, e.target.className);
      console.log('[DragDropManager] Column event composed path:', e.composedPath().map(el => el.className || el.tagName));
      
      const th = e.target.closest('th');
      if (!th) {
        console.log('[DragDropManager] No th found for dragstart');
        return;
      }
      
      // 检查是否通过handle拖拽 - 使用 composedPath
      const path = e.composedPath();
      const handle = path.find(el => el.classList && el.classList.contains('wtl-table-col-drag-handle'));
      
      console.log('[DragDropManager] Column handle found:', handle ? handle.className : 'null');
      
      if (!handle) {
        e.preventDefault();
        console.log('[DragDropManager] Column drag prevented - not from handle');
        return;
      }
      
      console.log('[DragDropManager] Column drag started');
      this.draggedItem = th;
      th.classList.add('wtl-dragging');
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', th.dataset.colIdx || '');
    });
    
    thead.addEventListener('dragend', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      
      if (this.draggedItem) {
        this.draggedItem.classList.remove('wtl-dragging');
        this.draggedItem = null;
      }
      
      if (onReorder) {
        const headers = Array.from(thead.querySelectorAll('th'));
        const order = headers.map((th, idx) => ({
          colIdx: parseInt(th.dataset.colIdx),
          newIdx: idx
        }));
        console.log('[DragDropManager] Column reorder callback:', order);
        onReorder(order);
      }
    });
    
    thead.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const th = e.target.closest('th');
      if (!th || th === this.draggedItem) return;
      
      const rect = th.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      
      if (e.clientX < midX) {
        th.parentNode.insertBefore(this.draggedItem, th);
      } else {
        th.parentNode.insertBefore(this.draggedItem, th.nextSibling);
      }
    });
  }
  
  /**
   * 销毁
   */
  destroy() {
    this.draggedItem = null;
    this.dropTarget = null;
    this.root = null;
  }
}

export function createDragDropManager(root) {
  return new DragDropManager(root);
}
