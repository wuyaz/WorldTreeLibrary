// @ts-nocheck
/**
 * Core Data Manager - 本地数据管理
 * 
 * 功能: 提供localStorage数据的统计、导出、导入和删除功能
 * 应该写入: 数据统计函数、数据导出/导入、数据清理
 * 不应该写入: UI操作、业务逻辑、事件处理
 * 
 * 被使用: registerSettingsPanel.js
 * 使用文件: storage.js (safeParseJson)
 */

import { safeParseJson } from './storage.js';

const STORAGE_PREFIXES = {
  tables: 'wtl.tableJson.',
  schemaPresets: 'wtl.schema.presets',
  prepromptPresets: 'wtl.preprompt.presets',
  instructionPresets: 'wtl.instruction.presets',
  blocksPresets: 'wtl.blocks.presets',
  refBlocksPresets: 'wtl.refBlocks.presets',
  orderPresets: 'wtl.order.presets',
  refOrderPresets: 'wtl.refOrder.presets',
  chatManager: 'wtl.chatManager.'
};

export function countStoredTables() {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIXES.tables)) {
      count++;
    }
  }
  return count;
}

export function countPresets(type) {
  const presetMap = {
    schema: STORAGE_PREFIXES.schemaPresets,
    preprompt: STORAGE_PREFIXES.prepromptPresets,
    instruction: STORAGE_PREFIXES.instructionPresets,
    blocks: STORAGE_PREFIXES.blocksPresets,
    refBlocks: STORAGE_PREFIXES.refBlocksPresets,
    order: STORAGE_PREFIXES.orderPresets,
    refOrder: STORAGE_PREFIXES.refOrderPresets
  };

  const key = presetMap[type];
  if (!key) return 0;

  const data = safeParseJson(localStorage.getItem(key));
  if (!data || typeof data !== 'object') return 0;
  return Object.keys(data).length;
}

export function countChatManagerData() {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIXES.chatManager)) {
      count++;
    }
  }
  return count;
}

export function getAllDataStats() {
  return {
    tables: countStoredTables(),
    schemaPresets: countPresets('schema'),
    prepromptPresets: countPresets('preprompt'),
    instructionPresets: countPresets('instruction'),
    blocksPresets: countPresets('blocks'),
    refBlocksPresets: countPresets('refBlocks'),
    orderPresets: countPresets('order'),
    refOrderPresets: countPresets('refOrder'),
    chatManagerEntries: countChatManagerData()
  };
}

export function exportLocalData() {
  const data = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('wtl.')) {
      data[key] = localStorage.getItem(key);
    }
  }
  
  return JSON.stringify(data, null, 2);
}

export function importLocalData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data format');
    }

    let importedCount = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('wtl.')) {
        localStorage.setItem(key, value);
        importedCount++;
      }
    }
    
    return { success: true, importedCount };
  } catch (error) {
    console.error('[WTL DataManager] Import failed:', error);
    return { success: false, error: error.message };
  }
}

export function deleteLocalData(type = 'all') {
  const keysToDelete = [];
  
  if (type === 'all') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wtl.')) {
        keysToDelete.push(key);
      }
    }
  } else if (type === 'tables') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIXES.tables)) {
        keysToDelete.push(key);
      }
    }
  } else if (type === 'presets') {
    const presetKeys = [
      STORAGE_PREFIXES.schemaPresets,
      STORAGE_PREFIXES.prepromptPresets,
      STORAGE_PREFIXES.instructionPresets,
      STORAGE_PREFIXES.blocksPresets,
      STORAGE_PREFIXES.refBlocksPresets,
      STORAGE_PREFIXES.orderPresets,
      STORAGE_PREFIXES.refOrderPresets
    ];
    for (const prefix of presetKeys) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
    }
  } else if (type === 'chatManager') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIXES.chatManager)) {
        keysToDelete.push(key);
      }
    }
  }

  for (const key of keysToDelete) {
    localStorage.removeItem(key);
  }
  
  return keysToDelete.length;
}
