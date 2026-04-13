// @ts-nocheck
/**
 * Configuration Manager for World Tree Library
 * Handles merging defaults with user configs and managing feature flags
 */

import { ensureWtlStyle, loadDefaults, loadPreset } from './assets.js';
import { safeParseJson } from '../shared/utils/index.js';

// Default configuration structure
const DEFAULT_CONFIG = {
  ui: {
    theme: 'auto',
    fontSize: 'normal',
    compactMode: false,
    animations: true
  },
  features: {
    memoryTable: true,
    chatManager: true,
    worldBookGenerator: false
  },
  memoryTable: {
    autoSave: true,
    autoSaveInterval: 5000,
    maxHistoryEntries: 50,
    defaultTemplate: 'default'
  },
  chatManager: {
    itemsPerPage: 20,
    defaultSort: 'time',
    showPinnedFirst: true,
    enableBatchOperations: true
  }
};

// Configuration keys
const CONFIG_KEYS = {
  USER_CONFIG: 'wtl.userConfig',
  FEATURE_FLAGS: 'wtl.featureFlags',
  DEFAULTS_LOADED: 'wtl.defaultsLoaded'
};

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Load and merge configurations
 */
export async function loadConfig() {
  try {
    // Load defaults from assets
    const defaultsData = (await loadDefaults()) || {};
    
    // Load user config from localStorage
    const userConfig = safeParseJson(localStorage.getItem(CONFIG_KEYS.USER_CONFIG)) || {};
    
    // Merge defaults with user config (user config takes precedence)
    const mergedConfig = deepMerge(DEFAULT_CONFIG, defaultsData);
    const finalConfig = deepMerge(mergedConfig, userConfig);
    
    // Load presets
    const presetData = {
      openai: (await loadPreset('openai')) || {},
      preprompt: (await loadPreset('preprompt')) || {},
      instruction: (await loadPreset('instruction')) || {},
      schema: (await loadPreset('schema')) || {},
      order: (await loadPreset('order')) || {},
      refOrder: (await loadPreset('refOrder')) || {},
      blocks: (await loadPreset('blocks')) || {},
      refBlocks: (await loadPreset('refBlocks')) || {}
    };
    
    // Store in window for global access
    window.__WTL_DEFAULTS__ = defaultsData;
    window.__WTL_CONFIG__ = finalConfig;
    window.__WTL_PRESETS__ = presetData;
    
    // Ensure CSS is loaded
    await ensureWtlStyle();
    
    // Seed preset storage if needed
    seedPresetStorage(presetData);
    
    // Mark defaults as loaded
    localStorage.setItem(CONFIG_KEYS.DEFAULTS_LOADED, 'true');
    
    return {
      config: finalConfig,
      defaults: defaultsData,
      presets: presetData,
      userConfig
    };
  } catch (error) {
    console.error('[WTL] Failed to load config:', error);
    return {
      config: DEFAULT_CONFIG,
      defaults: {},
      presets: {},
      userConfig: {}
    };
  }
}

/**
 * Save user configuration
 */
export function saveUserConfig(userConfig) {
  try {
    const currentConfig = safeParseJson(localStorage.getItem(CONFIG_KEYS.USER_CONFIG)) || {};
    const mergedConfig = deepMerge(currentConfig, userConfig);
    localStorage.setItem(CONFIG_KEYS.USER_CONFIG, JSON.stringify(mergedConfig));
    
    // Update global config
    if (window.__WTL_CONFIG__) {
      window.__WTL_CONFIG__ = deepMerge(window.__WTL_CONFIG__, userConfig);
    }
    
    return mergedConfig;
  } catch (error) {
    console.error('[WTL] Failed to save user config:', error);
    return null;
  }
}

/**
 * Get specific config value
 */
export function getConfig(path, defaultValue = null) {
  if (!window.__WTL_CONFIG__) {
    return defaultValue;
  }
  
  const parts = path.split('.');
  let value = window.__WTL_CONFIG__;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Set specific config value
 */
export function setConfig(path, value) {
  if (!window.__WTL_CONFIG__) {
    window.__WTL_CONFIG__ = { ...DEFAULT_CONFIG };
  }
  
  const parts = path.split('.');
  const lastPart = parts.pop();
  let target = window.__WTL_CONFIG__;
  
  for (const part of parts) {
    if (!target[part] || typeof target[part] !== 'object') {
      target[part] = {};
    }
    target = target[part];
  }
  
  target[lastPart] = value;
  
  // Save to user config
  const userConfig = safeParseJson(localStorage.getItem(CONFIG_KEYS.USER_CONFIG)) || {};
  const newUserConfig = { ...userConfig };
  let userTarget = newUserConfig;
  
  for (const part of parts) {
    if (!userTarget[part] || typeof userTarget[part] !== 'object') {
      userTarget[part] = {};
    }
    userTarget = userTarget[part];
  }
  
  userTarget[lastPart] = value;
  localStorage.setItem(CONFIG_KEYS.USER_CONFIG, JSON.stringify(newUserConfig));
  
  return value;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  localStorage.removeItem(CONFIG_KEYS.USER_CONFIG);
  window.__WTL_CONFIG__ = deepMerge(DEFAULT_CONFIG, window.__WTL_DEFAULTS__ || {});
  return window.__WTL_CONFIG__;
}

/**
 * Get feature flags
 */
export function getFeatureFlags() {
  const flags = safeParseJson(localStorage.getItem(CONFIG_KEYS.FEATURE_FLAGS)) || {};
  const configFlags = getConfig('features', {});
  
  // Merge with config (config takes precedence)
  return { ...flags, ...configFlags };
}

/**
 * Set feature flags
 */
export function setFeatureFlags(flags) {
  const currentFlags = getFeatureFlags();
  const newFlags = { ...currentFlags, ...flags };
  localStorage.setItem(CONFIG_KEYS.FEATURE_FLAGS, JSON.stringify(newFlags));
  
  // Also update config
  setConfig('features', newFlags);
  
  return newFlags;
}

/**
 * Seed preset storage (copied from original config.js)
 */
function seedPresetStorage(data = {}) {
  const ensurePresetStore = (key, payload) => {
    if (!payload) return;
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(payload || {}));
      return;
    }
    try {
      const parsed = JSON.parse(raw || '');
      const isEmpty = !parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0;
      if (isEmpty) {
        localStorage.setItem(key, JSON.stringify(payload || {}));
      }
    } catch (e) {
      localStorage.setItem(key, JSON.stringify(payload || {}));
    }
  };

  try {
    ensurePresetStore('wtl.openai.presets', data.openai);
    ensurePresetStore('wtl.preprompt.presets', data.preprompt);
    ensurePresetStore('wtl.instruction.presets', data.instruction);
    ensurePresetStore('wtl.schema.presets', data.schema);
    ensurePresetStore('wtl.order.presets', data.order);
    ensurePresetStore('wtl.refOrder.presets', data.refOrder);
    ensurePresetStore('wtl.blocks.presets', data.blocks);
    ensurePresetStore('wtl.refBlocks.presets', data.refBlocks);

    if (!localStorage.getItem('wtl.preprompt.presetActive')) {
      localStorage.setItem('wtl.preprompt.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.instruction.presetActive')) {
      localStorage.setItem('wtl.instruction.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.schema.presetActive')) {
      localStorage.setItem('wtl.schema.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.order.presetActive')) {
      localStorage.setItem('wtl.order.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.refOrder.presetActive')) {
      localStorage.setItem('wtl.refOrder.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.blocks.presetActive')) {
      localStorage.setItem('wtl.blocks.presetActive', '默认');
    }
    if (!localStorage.getItem('wtl.refBlocks.presetActive')) {
      localStorage.setItem('wtl.refBlocks.presetActive', '默认');
    }
  } catch (err) {
    console.warn('[WTL] failed to seed presets', err);
  }
}

// Export the original initConfig for backward compatibility
export const initConfig = loadConfig;