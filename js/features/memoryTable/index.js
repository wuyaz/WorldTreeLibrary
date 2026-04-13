// @ts-nocheck

import { MemoryTableFeature } from './controllers/MemoryTableFeature.js';

export { MemoryTableFeature };

let memoryTableInstance = null;

export async function initializeMemoryTable(options = {}) {
  if (!memoryTableInstance) {
    memoryTableInstance = new MemoryTableFeature(options);
    await memoryTableInstance.initialize();
  }
  return memoryTableInstance;
}

export function destroyMemoryTable() {
  if (memoryTableInstance) {
    memoryTableInstance.destroy();
    memoryTableInstance = null;
  }
}

export async function getMemoryTableInstance() {
  if (!memoryTableInstance) {
    await initializeMemoryTable();
  }
  return memoryTableInstance;
}