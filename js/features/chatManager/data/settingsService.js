// @ts-nocheck

const SETTINGS_KEY = 'wtl_chat_manager_settings';

const DEFAULT_SETTINGS = {
    itemsPerPage: 20,
    defaultSortBy: 'updated',
    defaultSortDirection: 'desc',
    defaultViewMode: 'time',
    expandOnLoad: false,
    showMessageCount: true,
    showCharacterAvatar: true,
    dateFormat: 'relative',
    confirmBeforeDelete: true,
    autoRefresh: false,
    autoRefreshInterval: 30000,
};

export class SettingsService {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.listeners = new Set();
    }

    load() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                this.settings = { ...DEFAULT_SETTINGS, ...saved };
            }
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to load settings:', e);
        }
        return this.settings;
    }

    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
            this.notifyListeners();
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to save settings:', e);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    getAll() {
        return { ...this.settings };
    }

    setAll(newSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...newSettings };
        this.save();
    }

    reset() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.save();
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        for (const callback of this.listeners) {
            try {
                callback(this.settings);
            } catch (e) {
                console.error('[WTL ChatManager] Settings listener error:', e);
            }
        }
    }
}

export { SETTINGS_KEY, DEFAULT_SETTINGS };
