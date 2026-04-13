// @ts-nocheck

const SETTINGS_KEY = 'wtl_chat_manager_settings';

export class ChatManagerSettings {
  constructor() {
    this.pageSize = 20;
    this.defaultView = 'time';
    this.folders = ['主线', '支线', '日常', '废案'];
    this.tags = ['高甜', '虐心', '战斗', 'R18'];
    this.sortBy = 'updated';
    this.sortDirection = 'desc';
    this.showArchived = true;
    this.autoRefresh = false;
    this.refreshInterval = 30000;
    this.previewLayers = 4;
    this.previewLines = 2;
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.pageSize = data.pageSize ?? this.pageSize;
      this.defaultView = data.defaultView ?? this.defaultView;
      this.folders = data.folders ?? this.folders;
      this.tags = data.tags ?? this.tags;
      this.sortBy = data.sortBy ?? this.sortBy;
      this.sortDirection = data.sortDirection ?? this.sortDirection;
      this.showArchived = data.showArchived ?? this.showArchived;
      this.autoRefresh = data.autoRefresh ?? this.autoRefresh;
      this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
      this.previewLayers = data.previewLayers ?? this.previewLayers;
      this.previewLines = data.previewLines ?? this.previewLines;
    } catch (e) {
      console.warn('[WTL ChatManager] Failed to load settings:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        pageSize: this.pageSize,
        defaultView: this.defaultView,
        folders: this.folders,
        tags: this.tags,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        showArchived: this.showArchived,
        autoRefresh: this.autoRefresh,
        refreshInterval: this.refreshInterval,
        previewLayers: this.previewLayers,
        previewLines: this.previewLines,
      }));
    } catch (e) {
      console.warn('[WTL ChatManager] Failed to save settings:', e);
    }
  }

  addFolder(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed || this.folders.includes(trimmed)) return false;
    this.folders.push(trimmed);
    this.save();
    return true;
  }

  removeFolder(name) {
    const index = this.folders.indexOf(name);
    if (index === -1) return false;
    this.folders.splice(index, 1);
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
    this.save();
    return true;
  }

  addTag(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed || this.tags.includes(trimmed)) return false;
    this.tags.push(trimmed);
    this.save();
    return true;
  }

  removeTag(name) {
    const index = this.tags.indexOf(name);
    if (index === -1) return false;
    this.tags.splice(index, 1);
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
    this.save();
    return true;
  }
}

export { SETTINGS_KEY };
