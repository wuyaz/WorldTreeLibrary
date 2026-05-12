// @ts-nocheck
/**
 * Core Settings Manager
 * 
 * 功能: 提供统一的设置管理接口，使用SillyTavern的extension_settings存储用户配置
 * 应该写入: 设置读写接口、默认值管理、设置验证、配置导入导出
 * 不应该写入: UI操作、业务逻辑、事件处理、状态管理
 * 
 * 被使用: 所有feature的模块 (memoryTable, chatManager等)
 * 使用文件: script.js (extension_settings, saveSettingsDebounced), assets.js (loadDefaults)
 * 
 * 注意: 这是所有feature设置的统一入口，确保配置管理的一致性
 */

import { extension_settings } from '/scripts/extensions.js';
import { saveSettingsDebounced } from '/script.js';
import { loadDefaults } from './assets.js';

const EXTENSION_NAME = 'WorldTreeLibrary';

let DEFAULT_SETTINGS = null;

/**
 * Load default settings from defaults.json
 */
async function loadDefaultSettings() {
  if (DEFAULT_SETTINGS) return DEFAULT_SETTINGS;
  
  try {
    const defaults = await loadDefaults();
    DEFAULT_SETTINGS = defaults || {};
    return DEFAULT_SETTINGS;
  } catch (e) {
    console.warn('[WTL Settings] Failed to load defaults:', e);
    return {};
  }
}

/**
 * Ensure extension settings structure exists
 */
async function ensureSettingsStructure() {
  if (!extension_settings[EXTENSION_NAME]) {
    extension_settings[EXTENSION_NAME] = {};
  }
  
  return extension_settings[EXTENSION_NAME];
}

/**
 * Get feature settings
 * @param {string} featureName - Feature name (e.g., 'memoryTable', 'chatManager')
 */
export async function getFeatureSettings(featureName) {
  await ensureSettingsStructure();
  
  if (!extension_settings[EXTENSION_NAME][featureName]) {
    const defaults = await loadDefaultSettings();
    extension_settings[EXTENSION_NAME][featureName] = defaults[featureName] 
      ? { ...defaults[featureName] } 
      : {};
    saveSettingsDebounced();
  }
  
  return extension_settings[EXTENSION_NAME][featureName];
}

/**
 * Get a specific setting value
 * @param {string} featureName - Feature name
 * @param {string} key - Setting key (supports nested keys like 'openai.url')
 * @param {any} defaultValue - Default value if not found
 */
export async function getSetting(featureName, key, defaultValue = null) {
  const settings = await getFeatureSettings(featureName);
  
  // Handle nested keys like 'openai.url'
  const keys = key.split('.');
  let value = settings;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Try to get from defaults
      const defaults = await loadDefaultSettings();
      let defaultVal = defaults[featureName];
      for (const k of keys) {
        if (defaultVal && typeof defaultVal === 'object' && k in defaultVal) {
          defaultVal = defaultVal[k];
        } else {
          return defaultValue;
        }
      }
      return defaultVal !== undefined ? defaultVal : defaultValue;
    }
  }
  
  return value !== undefined ? value : defaultValue;
}

/**
 * Set a specific setting value
 * @param {string} featureName - Feature name
 * @param {string} key - Setting key (supports nested keys)
 * @param {any} value - Value to set
 */
export async function setSetting(featureName, key, value) {
  await ensureSettingsStructure();
  
  if (!extension_settings[EXTENSION_NAME][featureName]) {
    const defaults = await loadDefaultSettings();
    extension_settings[EXTENSION_NAME][featureName] = defaults[featureName] 
      ? { ...defaults[featureName] } 
      : {};
  }
  
  const settings = extension_settings[EXTENSION_NAME][featureName];
  
  // Handle nested keys like 'openai.url'
  const keys = key.split('.');
  let target = settings;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!target[k] || typeof target[k] !== 'object') {
      target[k] = {};
    }
    target = target[k];
  }
  
  target[keys[keys.length - 1]] = value;
  saveSettingsDebounced();
  
  return value;
}

/**
 * Update multiple settings at once
 * @param {string} featureName - Feature name
 * @param {object} newSettings - Settings to update
 */
export async function updateSettings(featureName, newSettings) {
  await ensureSettingsStructure();
  
  if (!extension_settings[EXTENSION_NAME][featureName]) {
    const defaults = await loadDefaultSettings();
    extension_settings[EXTENSION_NAME][featureName] = defaults[featureName] 
      ? { ...defaults[featureName] } 
      : {};
  }
  
  const settings = extension_settings[EXTENSION_NAME][featureName];
  deepMerge(settings, newSettings);
  saveSettingsDebounced();
  
  return settings;
}

/**
 * Reset feature settings to defaults
 * @param {string} featureName - Feature name
 */
export async function resetFeatureSettings(featureName) {
  const defaults = await loadDefaultSettings();
  extension_settings[EXTENSION_NAME][featureName] = defaults[featureName] 
    ? { ...defaults[featureName] } 
    : {};
  saveSettingsDebounced();
  
  return extension_settings[EXTENSION_NAME][featureName];
}

/**
 * Reset a specific setting to default
 * @param {string} featureName - Feature name
 * @param {string} key - Setting key
 */
export async function resetSetting(featureName, key) {
  const defaults = await loadDefaultSettings();
  const keys = key.split('.');
  
  let defaultValue = defaults[featureName];
  for (const k of keys) {
    if (defaultValue && typeof defaultValue === 'object' && k in defaultValue) {
      defaultValue = defaultValue[k];
    } else {
      return null;
    }
  }
  
  await setSetting(featureName, key, defaultValue);
  return defaultValue;
}

/**
 * Reset all settings to defaults
 */
export async function resetAllSettings() {
  const defaults = await loadDefaultSettings();
  extension_settings[EXTENSION_NAME] = JSON.parse(JSON.stringify(defaults));
  saveSettingsDebounced();
  
  return extension_settings[EXTENSION_NAME];
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Export all settings for debugging
 */
export async function exportAllSettings() {
  await ensureSettingsStructure();
  return JSON.stringify(extension_settings[EXTENSION_NAME], null, 2);
}

/**
 * Import settings from JSON
 */
export async function importAllSettings(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    extension_settings[EXTENSION_NAME] = imported;
    saveSettingsDebounced();
    return true;
  } catch (e) {
    console.error('[WTL Settings] Failed to import settings:', e);
    return false;
  }
}

// Export default settings loader for backward compatibility
export { loadDefaultSettings };
