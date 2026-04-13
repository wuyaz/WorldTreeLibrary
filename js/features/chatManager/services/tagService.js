// @ts-nocheck

const TAGS_KEY = 'wtl_chat_manager_tags';

const DEFAULT_TAGS = [
    { id: 'sweet', name: '高甜', color: '#E91E63', order: 0 },
    { id: 'angst', name: '虐心', color: '#673AB7', order: 1 },
    { id: 'battle', name: '战斗', color: '#F44336', order: 2 },
    { id: 'r18', name: 'R18', color: '#FF5722', order: 3 },
];

export class TagService {
    constructor() {
        this.tags = [...DEFAULT_TAGS];
        this.chatTags = {};
        this.listeners = new Set();
    }

    load() {
        try {
            const raw = localStorage.getItem(TAGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                this.tags = saved.tags || [...DEFAULT_TAGS];
                this.chatTags = saved.chatTags || {};
            }
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to load tags:', e);
        }
        return { tags: this.tags, chatTags: this.chatTags };
    }

    save() {
        try {
            localStorage.setItem(TAGS_KEY, JSON.stringify({
                tags: this.tags,
                chatTags: this.chatTags,
            }));
            this.notifyListeners();
        } catch (e) {
            console.warn('[WTL ChatManager] Failed to save tags:', e);
        }
    }

    getAll() {
        return [...this.tags].sort((a, b) => a.order - b.order);
    }

    getById(tagId) {
        return this.tags.find(t => t.id === tagId);
    }

    create(name, color = '#4CAF50') {
        const id = `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const order = this.tags.length;
        const tag = { id, name, color, order };
        this.tags.push(tag);
        this.save();
        return tag;
    }

    update(tagId, updates) {
        const index = this.tags.findIndex(t => t.id === tagId);
        if (index !== -1) {
            this.tags[index] = { ...this.tags[index], ...updates };
            this.save();
            return this.tags[index];
        }
        return null;
    }

    delete(tagId) {
        const index = this.tags.findIndex(t => t.id === tagId);
        if (index !== -1) {
            this.tags.splice(index, 1);
            for (const chatId in this.chatTags) {
                this.chatTags[chatId] = this.chatTags[chatId].filter(t => t !== tagId);
                if (this.chatTags[chatId].length === 0) {
                    delete this.chatTags[chatId];
                }
            }
            this.save();
            return true;
        }
        return false;
    }

    reorder(tagIds) {
        tagIds.forEach((id, order) => {
            const tag = this.tags.find(t => t.id === id);
            if (tag) {
                tag.order = order;
            }
        });
        this.save();
    }

    getChatsByTag(tagId) {
        return Object.keys(this.chatTags).filter(chatId => this.chatTags[chatId].includes(tagId));
    }

    addTagToChat(chatId, tagId) {
        if (!this.chatTags[chatId]) {
            this.chatTags[chatId] = [];
        }
        if (!this.chatTags[chatId].includes(tagId)) {
            this.chatTags[chatId].push(tagId);
            this.save();
        }
    }

    removeTagFromChat(chatId, tagId) {
        if (this.chatTags[chatId]) {
            this.chatTags[chatId] = this.chatTags[chatId].filter(t => t !== tagId);
            if (this.chatTags[chatId].length === 0) {
                delete this.chatTags[chatId];
            }
            this.save();
        }
    }

    setChatTags(chatId, tagIds) {
        if (tagIds && tagIds.length > 0) {
            this.chatTags[chatId] = [...tagIds];
        } else {
            delete this.chatTags[chatId];
        }
        this.save();
    }

    getChatTags(chatId) {
        return this.chatTags[chatId] || [];
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        for (const callback of this.listeners) {
            try {
                callback({ tags: this.tags, chatTags: this.chatTags });
            } catch (e) {
                console.error('[WTL ChatManager] Tag listener error:', e);
            }
        }
    }
}

export { TAGS_KEY, DEFAULT_TAGS };
