// 本地存储/预设工具

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
  chatManager: true
};

export function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return null; }
  }
  return null;
}

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

export const getBlocksPreset = () => getPresetFromStorage('wtl.blocks.presets', 'wtl.blocks.presetActive', []);
export const getRefBlocksPreset = () => getPresetFromStorage('wtl.refBlocks.presets', 'wtl.refBlocks.presetActive', []);
export const getOrderPreset = () => getPresetFromStorage('wtl.order.presets', 'wtl.order.presetActive', []);
export const getRefOrderPreset = () => getPresetFromStorage('wtl.refOrder.presets', 'wtl.refOrder.presetActive', []);
