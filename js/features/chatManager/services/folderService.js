// @ts-nocheck

const FOLDERS_KEY = 'wtl_chat_manager_folders';

const DEFAULT_FOLDERS = [
    { id: 'main', name: '主线', color: '#4CAF50', order: 0 },
    { id: 'side', name: '支线', color: '#2196F3', order: 1 },
    { id: 'daily', name: '日常', color: '#FF9800', order: 2 },
    { id: 'archived', name: '废案', color: '#9E9E9E', order: 3 },
];

export class FolderService {
    constructor() {
        this.folders = [...DEFAULT_FOLDERS];
        this.chatFolders = {};
        this.listeners = new Set();
    }

    load() {
        try {
            const raw = localStorage.getItem(FOLDERS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                this.folders = saved.folders || [...DEFAULT_FOLDERS];
                this.chatFolders = saved.chatFolders || {};
            }
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to load folders:', e);
        }
        return { folders: this.folders, chatFolders: this.chatFolders };
    }

    save() {
        try {
            localStorage.setItem(FOLDERS_KEY, JSON.stringify({
                folders: this.folders,
                chatFolders: this.chatFolders,
            }));
            this.notifyListeners();
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to save folders:', e);
        }
    }

    getAll() {
        return [...this.folders].sort((a, b) => a.order - b.order);
    }

    getById(folderId) {
        return this.folders.find(f => f.id === folderId);
    }

    create(name, color = '#4CAF50') {
        const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const order = this.folders.length;
        const folder = { id, name, color, order };
        this.folders.push(folder);
        this.save();
        return folder;
    }

    update(folderId, updates) {
        const index = this.folders.findIndex(f => f.id === folderId);
        if (index !== -1) {
            this.folders[index] = { ...this.folders[index], ...updates };
            this.save();
            return this.folders[index];
        }
        return null;
    }

    delete(folderId) {
        const index = this.folders.findIndex(f => f.id === folderId);
        if (index !== -1) {
            this.folders.splice(index, 1);
            for (const chatId in this.chatFolders) {
                if (this.chatFolders[chatId] === folderId) {
                    delete this.chatFolders[chatId];
                }
            }
            this.save();
            return true;
        }
        return false;
    }

    reorder(folderIds) {
        folderIds.forEach((id, order) => {
            const folder = this.folders.find(f => f.id === id);
            if (folder) {
                folder.order = order;
            }
        });
        this.save();
    }

    getChatsByFolder(folderId) {
        return Object.keys(this.chatFolders).filter(chatId => this.chatFolders[chatId] === folderId);
    }

    setChatFolder(chatId, folderId) {
        if (folderId) {
            this.chatFolders[chatId] = folderId;
        } else {
            delete this.chatFolders[chatId];
        }
        this.save();
    }

    getChatFolder(chatId) {
        return this.chatFolders[chatId] || null;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        for (const callback of this.listeners) {
            try {
                callback({ folders: this.folders, chatFolders: this.chatFolders });
            } catch (e) {
                console.error('[WTL ChatManager] Folder listener error:', e);
            }
        }
    }
}

export { FOLDERS_KEY, DEFAULT_FOLDERS };
