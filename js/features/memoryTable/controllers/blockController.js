// @ts-nocheck
/**
 * Block Controller for Memory Table
 * Handles block editing, ordering, and management
 */

import { createBlockEditorController, getBlockEls, getRefBlockEls, serializeBlockOrder } from '../ui/blockEditor.js';
import { createBlockModalController } from '../ui/blockModalController.js';
import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class BlockController {
  constructor(uiRefs, context, defaults) {
    this.ui = uiRefs;
    this.ctx = context;
    this.defaults = defaults;
    
    this.blockEditor = null;
    this.blockModalController = null;
    
    this.state = {
      blocks: [],
      refBlocks: [],
      currentBlock: null,
      currentRefBlock: null,
      isBlockModalOpen: false,
      isBlockEditOpen: false,
      isBlockWrapperEditOpen: false
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
    // Initialize block editor controller
    this.blockEditor = createBlockEditorController({
      blockListEl: this.ui.blockListEl,
      refBlockListEl: this.ui.refBlockListEl,
      getBlocksPreset: this.ctx.getBlocksPreset || (() => []),
      getRefBlocksPreset: this.ctx.getRefBlocksPreset || (() => []),
      saveState: this.ctx.saveState || (() => Promise.resolve()),
      refreshPromptPreview: this.ctx.refreshPromptPreview || (() => Promise.resolve()),
      openBlockPreview: this.openBlockPreview.bind(this),
      openBlockWrapperEdit: this.openBlockWrapperEdit.bind(this),
      openBlockEdit: this.openBlockEdit.bind(this),
      blockAddEl: this.ui.blockAddEl,
      refBlockAddEl: this.ui.refBlockAddEl
    });
    
    // Initialize block modal controller
    this.blockModalController = createBlockModalController({
      openBlockPreview: this.openBlockPreview.bind(this),
      openBlockWrapperEdit: this.openBlockWrapperEdit.bind(this),
      openBlockEdit: this.openBlockEdit.bind(this)
    });
  }
  
  bindEvents() {
    // Bind drag and drop for blocks
    if (this.ui.blockListEl) {
      this.bindDragAndDrop(this.ui.blockListEl, 'block');
    }
    
    if (this.ui.refBlockListEl) {
      this.bindDragAndDrop(this.ui.refBlockListEl, 'refBlock');
    }
    
    // Bind event bus listeners
    eventBus.on(EVENTS.BLOCKS_CHANGED, this.handleBlocksChanged.bind(this));
    eventBus.on(EVENTS.REF_BLOCKS_CHANGED, this.handleRefBlocksChanged.bind(this));
    eventBus.on(EVENTS.BLOCK_ADDED, this.handleBlockAdded.bind(this));
    eventBus.on(EVENTS.BLOCK_REMOVED, this.handleBlockRemoved.bind(this));
    eventBus.on(EVENTS.BLOCK_UPDATED, this.handleBlockUpdated.bind(this));
  }
  
  bindDragAndDrop(container, type) {
    if (!container) return;
    
    container.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('wtl-block')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
        e.target.classList.add('dragging');
      }
    });
    
    container.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('wtl-block')) {
        e.target.classList.remove('dragging');
      }
    });
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingEl = container.querySelector('.dragging');
      if (!draggingEl) return;
      
      const afterElement = this.getDragAfterElement(container, e.clientY);
      if (afterElement) {
        container.insertBefore(draggingEl, afterElement);
      } else {
        container.appendChild(draggingEl);
      }
      
      this.saveBlockOrder(type);
    });
  }
  
  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.wtl-block:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  loadInitialState() {
    // Load blocks from localStorage
    const savedBlocks = localStorage.getItem('wtl.blockOrder');
    if (savedBlocks) {
      try {
        this.state.blocks = JSON.parse(savedBlocks);
      } catch (e) {
        console.warn('[WTL] Failed to parse saved blocks:', e);
        this.state.blocks = this.ctx.getBlocksPreset?.() || [];
      }
    } else {
      this.state.blocks = this.ctx.getBlocksPreset?.() || [];
    }
    
    // Load ref blocks from localStorage
    const savedRefBlocks = localStorage.getItem('wtl.refBlockOrder');
    if (savedRefBlocks) {
      try {
        this.state.refBlocks = JSON.parse(savedRefBlocks);
      } catch (e) {
        console.warn('[WTL] Failed to parse saved ref blocks:', e);
        this.state.refBlocks = this.ctx.getRefBlocksPreset?.() || [];
      }
    } else {
      this.state.refBlocks = this.ctx.getRefBlocksPreset?.() || [];
    }
  }
  
  syncUI() {
    // Render blocks using the block editor controller
    if (this.blockEditor) {
      this.blockEditor.renderBlockList(this.state.blocks);
      this.blockEditor.renderRefBlockList(this.state.refBlocks);
    }
  }
  
  // Public methods
  getBlocks() {
    return [...this.state.blocks];
  }
  
  getRefBlocks() {
    return [...this.state.refBlocks];
  }
  
  getBlockById(id) {
    return this.state.blocks.find(block => block.id === id);
  }
  
  getRefBlockById(id) {
    return this.state.refBlocks.find(block => block.id === id);
  }
  
  addBlock(block) {
    if (!block.id) {
      block.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.state.blocks.push(block);
    this.saveBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.BLOCK_ADDED, { block });
    return block.id;
  }
  
  addRefBlock(block) {
    if (!block.id) {
      block.id = `ref_custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.state.refBlocks.push(block);
    this.saveRefBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.REF_BLOCK_ADDED, { block });
    return block.id;
  }
  
  updateBlock(id, updates) {
    const index = this.state.blocks.findIndex(block => block.id === id);
    if (index === -1) return false;
    
    this.state.blocks[index] = { ...this.state.blocks[index], ...updates };
    this.saveBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.BLOCK_UPDATED, { id, updates });
    return true;
  }
  
  updateRefBlock(id, updates) {
    const index = this.state.refBlocks.findIndex(block => block.id === id);
    if (index === -1) return false;
    
    this.state.refBlocks[index] = { ...this.state.refBlocks[index], ...updates };
    this.saveRefBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.REF_BLOCK_UPDATED, { id, updates });
    return true;
  }
  
  removeBlock(id) {
    const index = this.state.blocks.findIndex(block => block.id === id);
    if (index === -1) return false;
    
    const removed = this.state.blocks.splice(index, 1)[0];
    this.saveBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.BLOCK_REMOVED, { id, block: removed });
    return true;
  }
  
  removeRefBlock(id) {
    const index = this.state.refBlocks.findIndex(block => block.id === id);
    if (index === -1) return false;
    
    const removed = this.state.refBlocks.splice(index, 1)[0];
    this.saveRefBlocks();
    this.syncUI();
    
    eventBus.emit(EVENTS.REF_BLOCK_REMOVED, { id, block: removed });
    return true;
  }
  
  saveBlockOrder(type = 'block') {
    let container;
    let saveKey;
    let blocks;
    
    if (type === 'block') {
      container = this.ui.blockListEl;
      saveKey = 'wtl.blockOrder';
      blocks = this.state.blocks;
    } else {
      container = this.ui.refBlockListEl;
      saveKey = 'wtl.refBlockOrder';
      blocks = this.state.refBlocks;
    }
    
    if (!container) return;
    
    const order = serializeBlockOrder(container);
    if (!order) return;
    
    // Update state with new order while preserving block data
    const blockMap = new Map(blocks.map(block => [block.id, block]));
    const orderedBlocks = order.map(item => {
      const block = blockMap.get(item.id);
      if (block) {
        return { ...block, ...item };
      }
      return item;
    });
    
    if (type === 'block') {
      this.state.blocks = orderedBlocks;
    } else {
      this.state.refBlocks = orderedBlocks;
    }
    
    localStorage.setItem(saveKey, JSON.stringify(orderedBlocks));
    eventBus.emit(type === 'block' ? EVENTS.BLOCKS_CHANGED : EVENTS.REF_BLOCKS_CHANGED, { blocks: orderedBlocks });
  }
  
  saveBlocks() {
    localStorage.setItem('wtl.blockOrder', JSON.stringify(this.state.blocks));
    eventBus.emit(EVENTS.BLOCKS_CHANGED, { blocks: this.state.blocks });
  }
  
  saveRefBlocks() {
    localStorage.setItem('wtl.refBlockOrder', JSON.stringify(this.state.refBlocks));
    eventBus.emit(EVENTS.REF_BLOCKS_CHANGED, { blocks: this.state.refBlocks });
  }
  
  async openBlockPreview(block, element) {
    this.state.currentBlock = block;
    this.state.isBlockModalOpen = true;
    
    if (this.blockModalController) {
      await this.blockModalController.openBlockPreview(block, element);
    }
    
    eventBus.emit(EVENTS.BLOCK_PREVIEW_OPENED, { block });
  }
  
  openBlockWrapperEdit(block, element) {
    this.state.currentBlock = block;
    this.state.isBlockWrapperEditOpen = true;
    
    if (this.blockModalController) {
      this.blockModalController.openBlockWrapperEdit(block, element);
    }
    
    eventBus.emit(EVENTS.BLOCK_WRAPPER_EDIT_OPENED, { block });
  }
  
  openBlockEdit(block) {
    this.state.currentBlock = block;
    this.state.isBlockEditOpen = true;
    
    if (this.blockModalController) {
      this.blockModalController.openBlockEdit(block);
    }
    
    eventBus.emit(EVENTS.BLOCK_EDIT_OPENED, { block });
  }
  
  closeBlockModal() {
    this.state.isBlockModalOpen = false;
    this.state.isBlockEditOpen = false;
    this.state.isBlockWrapperEditOpen = false;
    this.state.currentBlock = null;
    
    if (this.blockModalController) {
      this.blockModalController.closeModal();
    }
    
    eventBus.emit(EVENTS.BLOCK_MODAL_CLOSED);
  }
  
  resetBlocks() {
    this.state.blocks = this.ctx.getBlocksPreset?.() || [];
    localStorage.removeItem('wtl.blockOrder');
    this.syncUI();
    
    eventBus.emit(EVENTS.BLOCKS_RESET, { blocks: this.state.blocks });
  }
  
  resetRefBlocks() {
    this.state.refBlocks = this.ctx.getRefBlocksPreset?.() || [];
    localStorage.removeItem('wtl.refBlockOrder');
    this.syncUI();
    
    eventBus.emit(EVENTS.REF_BLOCKS_RESET, { blocks: this.state.refBlocks });
  }
  
  // Event handlers
  handleBlocksChanged(data) {
    this.state.blocks = data.blocks || [];
    this.syncUI();
  }
  
  handleRefBlocksChanged(data) {
    this.state.refBlocks = data.blocks || [];
    this.syncUI();
  }
  
  handleBlockAdded(data) {
    // Update state if needed
    this.syncUI();
  }
  
  handleBlockRemoved(data) {
    // Update state if needed
    this.syncUI();
  }
  
  handleBlockUpdated(data) {
    // Update state if needed
    this.syncUI();
  }
  
  // Cleanup
  destroy() {
    eventBus.off(EVENTS.BLOCKS_CHANGED, this.handleBlocksChanged.bind(this));
    eventBus.off(EVENTS.REF_BLOCKS_CHANGED, this.handleRefBlocksChanged.bind(this));
    eventBus.off(EVENTS.BLOCK_ADDED, this.handleBlockAdded.bind(this));
    eventBus.off(EVENTS.BLOCK_REMOVED, this.handleBlockRemoved.bind(this));
    eventBus.off(EVENTS.BLOCK_UPDATED, this.handleBlockUpdated.bind(this));
    
    if (this.blockModalController?.destroy) {
      this.blockModalController.destroy();
    }
  }
}