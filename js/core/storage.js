// 本地存储/预设工具
import { safeParseJson } from '../shared/utils/index.js';

// Re-export safeParseJson for other modules
export { safeParseJson };

export const PREPROMPT_PRESET_KEY = 'wtl.preprompt.presets';
export const PREPROMPT_PRESET_ACTIVE_KEY = 'wtl.preprompt.presetActive';
export const INSTRUCTION_PRESET_KEY = 'wtl.instruction.presets';
export const INSTRUCTION_PRESET_ACTIVE_KEY = 'wtl.instruction.presetActive';
export const SCHEMA_PRESET_KEY = 'wtl.schema.presets';
export const SCHEMA_PRESET_ACTIVE_KEY = 'wtl.schema.presetActive';
export const SCHEMA_PRESET_SCOPE_KEY = 'wtl.schema.presetsByScope';
export const FEATURE_FLAGS_KEY = 'wtl.featureFlags';

export const DEFAULT_FEATURE_FLAGS = {
  memoryTable: true,
  chatManager: true,
  debugMode: false
};

export function getOpenAIPresets() {
  return safeParseJson(localStorage.getItem('wtl.openai.presets')) || {};
}

export function setOpenAIPresets(presets) {
  localStorage.setItem('wtl.openai.presets', JSON.stringify(presets || {}));
}

export const getPromptPresets = (key) => safeParseJson(localStorage.getItem(key)) || {};

export const setPromptPresets = (key, presets) => {
  localStorage.setItem(key, JSON.stringify(presets || {}));
};

export const getPresetFromStorage = (storageKey, activeKey, fallback = undefined) => {
  const active = localStorage.getItem(activeKey) || '默认';
  const presets = safeParseJson(localStorage.getItem(storageKey)) || {};
  return presets[active] ?? fallback;
};

export const getPresetTextByName = (storageKey, name, fallback = '') => {
  const presets = safeParseJson(localStorage.getItem(storageKey)) || {};
  const value = presets[name] ?? fallback;
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') return value;
  return fallback;
};

export const getTextPresetFromStorage = (storageKey, activeKey, fallback = '') => {
  const value = getPresetFromStorage(storageKey, activeKey, fallback);
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') return value;
  return fallback;
};

export const getDefaultPromptText = (presetType, storageKey, activeKey) => {
  let text = getTextPresetFromStorage(storageKey, activeKey, '');
  if (!text) text = getPresetTextByName(storageKey, '默认', '');
  if (!text && window.__WTL_PRESETS__?.[presetType]?.['默认']) {
    const fallback = window.__WTL_PRESETS__[presetType]['默认'];
    text = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
  }
  return text || '';
};

export const getDefaultSchemaText = () => {
  let text = getTextPresetFromStorage(SCHEMA_PRESET_KEY, SCHEMA_PRESET_ACTIVE_KEY, '');
  if (!text) text = getPresetTextByName(SCHEMA_PRESET_KEY, '默认', '');
  if (!text && window.__WTL_PRESETS__?.schema?.['默认']) {
    const fallback = window.__WTL_PRESETS__.schema['默认'];
    text = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
  }
  return text || '';
};

export const getSchemaPresets = () => safeParseJson(localStorage.getItem(SCHEMA_PRESET_KEY)) || {};

export const setSchemaPresets = (presets) => {
  localStorage.setItem(SCHEMA_PRESET_KEY, JSON.stringify(presets || {}));
};

export const getSchemaScopedPresets = () => safeParseJson(localStorage.getItem(SCHEMA_PRESET_SCOPE_KEY)) || {};

export const setSchemaScopedPresets = (data) => {
  localStorage.setItem(SCHEMA_PRESET_SCOPE_KEY, JSON.stringify(data || {}));
};

export const getFeatureFlags = () => {
  const parsed = safeParseJson(localStorage.getItem(FEATURE_FLAGS_KEY)) || {};
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...(parsed && typeof parsed === 'object' ? parsed : {})
  };
};

export const setFeatureFlags = (flags) => {
  const next = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(flags && typeof flags === 'object' ? flags : {})
  };
  localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(next));
  return next;
};

// ===== Blocks/Order/RefOrder 预设存储 =====

export const BLOCKS_PRESET_KEY = 'wtl.blocks.presets';
export const BLOCKS_PRESET_ACTIVE_KEY = 'wtl.blocks.presetActive';
export const REF_BLOCKS_PRESET_KEY = 'wtl.refBlocks.presets';
export const REF_BLOCKS_PRESET_ACTIVE_KEY = 'wtl.refBlocks.presetActive';
export const ORDER_PRESET_KEY = 'wtl.order.presets';
export const ORDER_PRESET_ACTIVE_KEY = 'wtl.order.presetActive';
export const REF_ORDER_PRESET_KEY = 'wtl.refOrder.presets';
export const REF_ORDER_PRESET_ACTIVE_KEY = 'wtl.refOrder.presetActive';

export const getBlocksPreset = () => getPresetFromStorage(BLOCKS_PRESET_KEY, BLOCKS_PRESET_ACTIVE_KEY, []);
export const getRefBlocksPreset = () => getPresetFromStorage(REF_BLOCKS_PRESET_KEY, REF_BLOCKS_PRESET_ACTIVE_KEY, []);
export const getOrderPreset = () => getPresetFromStorage(ORDER_PRESET_KEY, ORDER_PRESET_ACTIVE_KEY, []);
export const getRefOrderPreset = () => getPresetFromStorage(REF_ORDER_PRESET_KEY, REF_ORDER_PRESET_ACTIVE_KEY, []);

/** 获取所有 blocks 预设（对象） */
export const getBlocksPresets = () => safeParseJson(localStorage.getItem(BLOCKS_PRESET_KEY)) || {};

/** 保存所有 blocks 预设 */
export const setBlocksPresets = (presets) => {
  localStorage.setItem(BLOCKS_PRESET_KEY, JSON.stringify(presets || {}));
};

/** 获取当前激活的 blocks 预设名称 */
export const getBlocksPresetActive = () => localStorage.getItem(BLOCKS_PRESET_ACTIVE_KEY) || '默认';

/** 设置当前激活的 blocks 预设名称 */
export const setBlocksPresetActive = (name) => {
  localStorage.setItem(BLOCKS_PRESET_ACTIVE_KEY, name || '默认');
};

/** 获取所有 refBlocks 预设 */
export const getRefBlocksPresets = () => safeParseJson(localStorage.getItem(REF_BLOCKS_PRESET_KEY)) || {};

/** 保存所有 refBlocks 预设 */
export const setRefBlocksPresets = (presets) => {
  localStorage.setItem(REF_BLOCKS_PRESET_KEY, JSON.stringify(presets || {}));
};

/** 获取所有 order 预设 */
export const getOrderPresets = () => safeParseJson(localStorage.getItem(ORDER_PRESET_KEY)) || {};

/** 保存所有 order 预设 */
export const setOrderPresets = (presets) => {
  localStorage.setItem(ORDER_PRESET_KEY, JSON.stringify(presets || {}));
};

/** 获取所有 refOrder 预设 */
export const getRefOrderPresets = () => safeParseJson(localStorage.getItem(REF_ORDER_PRESET_KEY)) || {};

/** 保存所有 refOrder 预设 */
export const setRefOrderPresets = (presets) => {
  localStorage.setItem(REF_ORDER_PRESET_KEY, JSON.stringify(presets || {}));
};
