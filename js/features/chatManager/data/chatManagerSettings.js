// @ts-nocheck

import { loadDefaults } from '../../../core/assets.js';
import { extension_settings, getContext } from '/scripts/extensions.js';
import { saveSettingsDebounced } from '/script.js';

const EXTENSION_NAME = 'WorldTreeLibrary';
const MORANDI_COLORS = [
  '#9E9E9E', '#A69080', '#B09090', '#90A6A0',
  '#A090B0', '#B0A090', '#90B0A0', '#A0A0B0',
  '#909AB0', '#B0A6A0', '#A0B0A6', '#B090A6'
];
const FOLDER_PRESETS_KEY = 'wtl_folder_presets';
const TAG_PRESETS_KEY = 'wtl_tag_presets';

let DEFAULT_SETTINGS = null;

async function loadDefaultSettings() {
  if (DEFAULT_SETTINGS) return DEFAULT_SETTINGS;
  try {
    const defaults = await loadDefaults();
    if (defaults?.chatManager) {
      DEFAULT_SETTINGS = defaults.chatManager;
    } else {
      DEFAULT_SETTINGS = {
        pageSize: 20,
        defaultView: 'time',
        sortBy: 'updated',
        sortDirection: 'desc',
        showArchived: true,
        autoRefresh: false,
        refreshInterval: 30000,
        previewLayers: 4,
        previewLines: 2,
      };
    }
  } catch (e) {
    console.warn('[WTL ChatManager] Failed to load defaults:', e);
    DEFAULT_SETTINGS = {
      pageSize: 20,
      defaultView: 'time',
      sortBy: 'updated',
      sortDirection: 'desc',
      showArchived: true,
      autoRefresh: false,
      refreshInterval: 30000,
      previewLayers: 4,
      previewLines: 2,
    };
  }
  return DEFAULT_SETTINGS;
}

export class ChatManagerSettings {
  constructor() {
    this.pageSize = 20;
    this.defaultView = 'time';
    this.folders = ['主线', '支线', '日常', '废案'];
    this.tags = ['高甜', '虐心', '战斗', 'R18'];
    this.folderColors = {};
    this.tagColors = {};
    this.sortBy = 'updated';
    this.sortDirection = 'desc';
    this.showArchived = true;
    this.autoRefresh = false;
    this.refreshInterval = 30000;
    this.previewLayers = 4;
    this.previewLines = 2;
    this._defaultsLoaded = false;
    this.folderPresets = {};
    this.tagPresets = {};
    this.currentFolderPreset = '';
    this.currentTagPreset = '';
  }

  clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  normalizeArray(values, fallback = []) {
    if (!Array.isArray(values)) return [...fallback];
    return values
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  normalizeColor(value) {
    const text = String(value ?? '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : '';
  }

  normalizeColorMap(map, allowedValues = []) {
    if (!map || typeof map !== 'object') return {};
    const allowed = new Set(allowedValues);
    return Object.entries(map).reduce((result, [key, value]) => {
      const name = String(key ?? '').trim();
      const color = this.normalizeColor(value);
      if (!name || !color || !allowed.has(name)) return result;
      result[name] = color;
      return result;
    }, {});
  }

  getRandomMorandiColor() {
    return MORANDI_COLORS[Math.floor(Math.random() * MORANDI_COLORS.length)];
  }

  async load() {
    // Load defaults first
    if (!this._defaultsLoaded) {
      const defaults = await loadDefaultSettings();
      if (defaults) {
        this.pageSize = defaults.pageSize ?? this.pageSize;
        this.defaultView = defaults.defaultView ?? this.defaultView;
        this.sortBy = defaults.sortBy ?? this.sortBy;
        this.sortDirection = defaults.sortDirection ?? this.sortDirection;
        this.showArchived = defaults.showArchived ?? this.showArchived;
        this.autoRefresh = defaults.autoRefresh ?? this.autoRefresh;
        this.refreshInterval = defaults.refreshInterval ?? this.refreshInterval;
        this.previewLayers = defaults.previewLayers ?? this.previewLayers;
        this.previewLines = defaults.previewLines ?? this.previewLines;
      }
      this._defaultsLoaded = true;
    }

    // Load from extension_settings
    try {
      if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
      }
      
      const data = extension_settings[EXTENSION_NAME].chatManager;
      
      if (data) {
        this.pageSize = this.clampNumber(data.pageSize, 5, 100, this.pageSize);
        this.defaultView = data.defaultView ?? this.defaultView;
        this.folders = this.normalizeArray(data.folders, this.folders);
        this.tags = this.normalizeArray(data.tags, this.tags);
        this.folderColors = this.normalizeColorMap(data.folderColors, this.folders);
        this.tagColors = this.normalizeColorMap(data.tagColors, this.tags);
        this.sortBy = data.sortBy ?? this.sortBy;
        this.sortDirection = data.sortDirection ?? this.sortDirection;
        this.showArchived = data.showArchived ?? this.showArchived;
        this.autoRefresh = data.autoRefresh ?? this.autoRefresh;
        this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
        this.previewLayers = this.clampNumber(data.previewLayers, 1, 12, this.previewLayers);
        this.previewLines = this.clampNumber(data.previewLines, 1, 6, this.previewLines);
      }
    } catch (e) {
      console.error('[WTL ChatManager] Failed to load settings:', e);
    }
  }

  save() {
    try {
      if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
      }
      
      extension_settings[EXTENSION_NAME].chatManager = {
        pageSize: this.pageSize,
        defaultView: this.defaultView,
        folders: this.folders,
        tags: this.tags,
        folderColors: this.folderColors,
        tagColors: this.tagColors,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        showArchived: this.showArchived,
        autoRefresh: this.autoRefresh,
        refreshInterval: this.refreshInterval,
        previewLayers: this.previewLayers,
        previewLines: this.previewLines,
      };
      
      saveSettingsDebounced();
    } catch (e) {
      console.error('[WTL ChatManager] Failed to save settings:', e);
    }
  }

  addFolder(name, color = '') {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed || this.folders.includes(trimmed)) return false;
    this.folders.push(trimmed);
    const normalizedColor = this.normalizeColor(color) || this.getRandomMorandiColor();
    if (normalizedColor) this.folderColors[trimmed] = normalizedColor;
    this.save();
    return true;
  }

  removeFolder(name) {
    const index = this.folders.indexOf(name);
    if (index === -1) return false;
    this.folders.splice(index, 1);
    delete this.folderColors[name];
    this.save();
    return true;
  }

  renameFolder(oldName, newName) {
    if (!newName || typeof newName !== 'string') return false;
    const trimmed = newName.trim();
    if (!trimmed || this.folders.includes(trimmed)) return false;
    const index = this.folders.indexOf(oldName);
    if (index === -1) return false;
    this.folders[index] = trimmed;
    if (this.folderColors[oldName]) {
      this.folderColors[trimmed] = this.folderColors[oldName];
      delete this.folderColors[oldName];
    }
    this.save();
    return true;
  }

  addTag(name, color = '') {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed || this.tags.includes(trimmed)) return false;
    this.tags.push(trimmed);
    const normalizedColor = this.normalizeColor(color) || this.getRandomMorandiColor();
    if (normalizedColor) this.tagColors[trimmed] = normalizedColor;
    this.save();
    return true;
  }

  removeTag(name) {
    const index = this.tags.indexOf(name);
    if (index === -1) return false;
    this.tags.splice(index, 1);
    delete this.tagColors[name];
    this.save();
    return true;
  }

  renameTag(oldName, newName) {
    if (!newName || typeof newName !== 'string') return false;
    const trimmed = newName.trim();
    if (!trimmed || this.tags.includes(trimmed)) return false;
    const index = this.tags.indexOf(oldName);
    if (index === -1) return false;
    this.tags[index] = trimmed;
    if (this.tagColors[oldName]) {
      this.tagColors[trimmed] = this.tagColors[oldName];
      delete this.tagColors[oldName];
    }
    this.save();
    return true;
  }

  getFolderColor(name) {
    return this.folderColors[name] || '';
  }

  getTagColor(name) {
    return this.tagColors[name] || '';
  }

  setFolderColor(name, color) {
    return this.setItemColor(this.folderColors, this.folders, name, color);
  }

  setTagColor(name, color) {
    return this.setItemColor(this.tagColors, this.tags, name, color);
  }

  clearFolderColor(name) {
    return this.clearItemColor(this.folderColors, name);
  }

  clearTagColor(name) {
    return this.clearItemColor(this.tagColors, name);
  }

  setItemColor(map, list, name, color) {
    if (!list.includes(name)) return false;
    const normalizedColor = this.normalizeColor(color);
    if (!normalizedColor) return this.clearItemColor(map, name);
    map[name] = normalizedColor;
    this.save();
    return true;
  }

  clearItemColor(map, name) {
    if (!Object.prototype.hasOwnProperty.call(map, name)) return false;
    delete map[name];
    this.save();
    return true;
  }

  moveFolder(name, direction) {
    return this.moveItem(this.folders, name, direction);
  }

  moveTag(name, direction) {
    return this.moveItem(this.tags, name, direction);
  }

  moveItem(list, name, direction) {
    const index = list.indexOf(name);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return false;

    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    this.save();
    return true;
  }

  updateDisplaySettings({ pageSize, previewLines, previewLayers, defaultView } = {}) {
    this.pageSize = this.clampNumber(pageSize, 5, 100, this.pageSize);
    this.previewLines = this.clampNumber(previewLines, 1, 6, this.previewLines);
    this.previewLayers = this.clampNumber(previewLayers, 1, 12, this.previewLayers);
    if (defaultView) {
      this.defaultView = defaultView;
    }
    this.save();
  }

  async reset() {
    const defaults = await loadDefaultSettings();
    if (defaults) {
      this.pageSize = defaults.pageSize ?? 20;
      this.defaultView = defaults.defaultView ?? 'time';
      this.sortBy = defaults.sortBy ?? 'updated';
      this.sortDirection = defaults.sortDirection ?? 'desc';
      this.showArchived = defaults.showArchived ?? true;
      this.autoRefresh = defaults.autoRefresh ?? false;
      this.refreshInterval = defaults.refreshInterval ?? 30000;
      this.previewLayers = defaults.previewLayers ?? 4;
      this.previewLines = defaults.previewLines ?? 2;
    }
    this.folders = ['主线', '支线', '日常', '废案'];
    this.tags = ['高甜', '虐心', '战斗', 'R18'];
    this.folderColors = {};
    this.tagColors = {};
    this.save();
  }

  loadPresets(type) {
    try {
      const key = type === 'folder' ? FOLDER_PRESETS_KEY : TAG_PRESETS_KEY;
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[WTL ChatManager] Failed to load ${type} presets:`, e);
      return {};
    }
  }

  savePresets(type, presets) {
    try {
      const key = type === 'folder' ? FOLDER_PRESETS_KEY : TAG_PRESETS_KEY;
      localStorage.setItem(key, JSON.stringify(presets));
    } catch (e) {
      console.error(`[WTL ChatManager] Failed to save ${type} presets:`, e);
    }
  }

  getPresetList(type) {
    const presets = this.loadPresets(type);
    return Object.keys(presets).sort();
  }

  loadPreset(type, presetName) {
    const presets = this.loadPresets(type);
    const preset = presets[presetName];
    if (!preset) return false;

    if (type === 'folder') {
      this.folders = [...preset.items];
      this.folderColors = { ...preset.colors };
      this.currentFolderPreset = presetName;
    } else {
      this.tags = [...preset.items];
      this.tagColors = { ...preset.colors };
      this.currentTagPreset = presetName;
    }
    this.save();
    return true;
  }

  saveCurrentAsPreset(type, presetName) {
    if (!presetName || !presetName.trim()) return false;
    
    const presets = this.loadPresets(type);
    presets[presetName.trim()] = {
      items: type === 'folder' ? [...this.folders] : [...this.tags],
      colors: type === 'folder' ? { ...this.folderColors } : { ...this.tagColors },
      updatedAt: new Date().toISOString(),
    };
    
    this.savePresets(type, presets);
    
    if (type === 'folder') {
      this.currentFolderPreset = presetName.trim();
    } else {
      this.currentTagPreset = presetName.trim();
    }
    
    return true;
  }

  deletePreset(type, presetName) {
    const presets = this.loadPresets(type);
    if (!presets[presetName]) return false;
    
    delete presets[presetName];
    this.savePresets(type, presets);
    
    if (type === 'folder' && this.currentFolderPreset === presetName) {
      this.currentFolderPreset = '';
    } else if (type === 'tag' && this.currentTagPreset === presetName) {
      this.currentTagPreset = '';
    }
    
    return true;
  }

  async loadDefaultPreset(type) {
    try {
      const response = await fetch(`/scripts/extensions/third-party/WorldTreeLibrary/assets/presets/${type}s.json`);
      if (!response.ok) return false;
      
      const defaultPreset = await response.json();
      if (!Array.isArray(defaultPreset)) return false;
      
      const items = defaultPreset.sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => item.name);
      const colors = {};
      defaultPreset.forEach(item => {
        if (item.name && item.color) {
          colors[item.name] = item.color;
        }
      });
      
      if (type === 'folder') {
        this.folders = items;
        this.folderColors = colors;
        this.currentFolderPreset = '';
      } else {
        this.tags = items;
        this.tagColors = colors;
        this.currentTagPreset = '';
      }
      
      this.save();
      return true;
    } catch (e) {
      console.warn(`[WTL ChatManager] Failed to load default ${type} preset:`, e);
      return false;
    }
  }
}

export { MORANDI_COLORS };
