// @ts-nocheck

import { MemoryTableFeature } from './controllers/MemoryTableFeature.js';

export { MemoryTableFeature };

let memoryTableInstance = null;

export async function initializeMemoryTable(options = {}) {
  if (memoryTableInstance) {
    console.warn('[WTL MemoryTable] Already initialized');
    return memoryTableInstance;
  }
  
  try {
    memoryTableInstance = new MemoryTableFeature(options);
    await memoryTableInstance.initialize();
    console.log('[WTL MemoryTable] Initialized successfully');
    return memoryTableInstance;
  } catch (error) {
    console.error('[WTL MemoryTable] Failed to initialize:', error);
    memoryTableInstance = null;
    throw error;
  }
}

export function destroyMemoryTable() {
  if (memoryTableInstance) {
    try {
      memoryTableInstance.destroy();
      console.log('[WTL MemoryTable] Destroyed successfully');
    } catch (error) {
      console.error('[WTL MemoryTable] Failed to destroy:', error);
    }
    memoryTableInstance = null;
  }
}

export async function getMemoryTableInstance() {
  if (!memoryTableInstance) {
    await initializeMemoryTable();
  }
  return memoryTableInstance;
}

export function isMemoryTableInitialized() {
  return memoryTableInstance !== null && memoryTableInstance.isInitialized();
}