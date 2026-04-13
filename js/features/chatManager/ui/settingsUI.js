// @ts-nocheck
/**
 * Settings UI Controller for Chat Manager
 */

import eventBus, { EVENTS } from '../../../core/eventBus.js';

export class SettingsUI {
    constructor(dataService, settingsService, folderService, tagService) {
        this.dataService = dataService;
        this.settingsService = settingsService;
        this.folderService = folderService;
        this.tagService = tagService;
        this.modal = null;
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            return;
        }

        this.createModal();
        document.body.appendChild(this.modal);
        this.modal.style.display = 'flex';
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'wtl-chat-settings-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
        `;

        const container = document.createElement('div');
        container.className = 'wtl-chat-settings-container';
        container.style.cssText = `
            background: var(--SmartThemeBlurTintColor, #1a1a1a);
            border: 1px solid var(--SmartThemeBorderColor, #333);
            border-radius: 12px;
            width: 600px;
            max-width: 90%;
            max-height: 80%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        container.innerHTML = `
            <div class="wtl-settings-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
            ">
                <h3 style="margin: 0; color: var(--SmartThemeBodyColor);">聊天管理器设置</h3>
                <button class="wtl-settings-close" style="
                    background: transparent;
                    border: none;
                    color: var(--SmartThemeBodyColor);
                    cursor: pointer;
                    font-size: 20px;
                ">×</button>
            </div>
            <div class="wtl-settings-body" style="
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            ">
                ${this.renderGeneralSettings()}
                ${this.renderFolderSettings()}
                ${this.renderTagSettings()}
            </div>
            <div class="wtl-settings-footer" style="
                padding: 16px 20px;
                border-top: 1px solid var(--SmartThemeBorderColor, #333);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            ">
                <button class="wtl-settings-reset" style="
                    padding: 8px 16px;
                    background: transparent;
                    border: 1px solid var(--SmartThemeBorderColor, #333);
                    color: var(--SmartThemeBodyColor);
                    border-radius: 6px;
                    cursor: pointer;
                ">恢复默认</button>
                <button class="wtl-settings-save" style="
                    padding: 8px 16px;
                    background: var(--SmartThemeQuoteColor, #4CAF50);
                    border: none;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">保存</button>
            </div>
        `;

        this.modal.appendChild(container);
        this.bindEvents(container);
    }

    renderGeneralSettings() {
        const settings = this.settingsService.getAll();
        return `
            <div class="wtl-settings-section" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); border-bottom: 1px solid var(--SmartThemeBorderColor, #333); padding-bottom: 8px;">
                    通用设置
                </h4>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">每页显示数量</label>
                    <input type="number" class="wtl-input-items-per-page" value="${settings.itemsPerPage}" min="5" max="100" style="
                        width: 80px;
                        padding: 6px 10px;
                        background: var(--SmartThemeBlurTintColor, #1a1a1a);
                        border: 1px solid var(--SmartThemeBorderColor, #333);
                        border-radius: 4px;
                        color: var(--SmartThemeBodyColor);
                    ">
                </div>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">默认排序</label>
                    <select class="wtl-select-default-sort" style="
                        flex: 1;
                        padding: 6px 10px;
                        background: var(--SmartThemeBlurTintColor, #1a1a1a);
                        border: 1px solid var(--SmartThemeBorderColor, #333);
                        border-radius: 4px;
                        color: var(--SmartThemeBodyColor);
                    ">
                        <option value="updated" ${settings.defaultSortBy === 'updated' ? 'selected' : ''}>最近更新</option>
                        <option value="created" ${settings.defaultSortBy === 'created' ? 'selected' : ''}>创建时间</option>
                        <option value="name" ${settings.defaultSortBy === 'name' ? 'selected' : ''}>名称</option>
                        <option value="character" ${settings.defaultSortBy === 'character' ? 'selected' : ''}>角色</option>
                    </select>
                </div>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">默认视图</label>
                    <select class="wtl-select-default-view" style="
                        flex: 1;
                        padding: 6px 10px;
                        background: var(--SmartThemeBlurTintColor, #1a1a1a);
                        border: 1px solid var(--SmartThemeBorderColor, #333);
                        border-radius: 4px;
                        color: var(--SmartThemeBodyColor);
                    ">
                        <option value="time" ${settings.defaultViewMode === 'time' ? 'selected' : ''}>时间顺序</option>
                        <option value="character" ${settings.defaultViewMode === 'character' ? 'selected' : ''}>角色分类</option>
                        <option value="folder" ${settings.defaultViewMode === 'folder' ? 'selected' : ''}>文件夹</option>
                        <option value="tag" ${settings.defaultViewMode === 'tag' ? 'selected' : ''}>标签</option>
                    </select>
                </div>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">展开时加载</label>
                    <input type="checkbox" class="wtl-checkbox-expand-load" ${settings.expandOnLoad ? 'checked' : ''} style="
                        width: 18px;
                        height: 18px;
                    ">
                </div>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">显示消息数量</label>
                    <input type="checkbox" class="wtl-checkbox-show-count" ${settings.showMessageCount ? 'checked' : ''} style="
                        width: 18px;
                        height: 18px;
                    ">
                </div>
                <div class="wtl-settings-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <label style="min-width: 120px; color: var(--SmartThemeBodyColor);">删除前确认</label>
                    <input type="checkbox" class="wtl-checkbox-confirm-delete" ${settings.confirmBeforeDelete ? 'checked' : ''} style="
                        width: 18px;
                        height: 18px;
                    ">
                </div>
            </div>
        `;
    }

    renderFolderSettings() {
        const folders = this.folderService.getAll();
        return `
            <div class="wtl-settings-section" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); border-bottom: 1px solid var(--SmartThemeBorderColor, #333); padding-bottom: 8px;">
                    文件夹管理
                </h4>
                <div class="wtl-folder-list" style="margin-bottom: 12px;">
                    ${folders.map(folder => `
                        <div class="wtl-folder-item" data-folder-id="${folder.id}" style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding: 8px;
                            margin-bottom: 4px;
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 4px;
                        ">
                            <div style="width: 16px; height: 16px; background: ${folder.color}; border-radius: 50%;"></div>
                            <span class="wtl-folder-name" style="flex: 1; color: var(--SmartThemeBodyColor);">${folder.name}</span>
                            <button class="wtl-folder-edit" style="
                                background: transparent;
                                border: none;
                                color: var(--SmartThemeBodyColor);
                                cursor: pointer;
                                padding: 4px;
                            "><i class="fa-solid fa-edit"></i></button>
                            <button class="wtl-folder-delete" style="
                                background: transparent;
                                border: none;
                                color: #f44336;
                                cursor: pointer;
                                padding: 4px;
                            "><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `).join('')}
                </div>
                <button class="wtl-add-folder" style="
                    width: 100%;
                    padding: 8px;
                    background: transparent;
                    border: 1px dashed var(--SmartThemeBorderColor, #333);
                    color: var(--SmartThemeBodyColor);
                    border-radius: 4px;
                    cursor: pointer;
                ">+ 添加文件夹</button>
            </div>
        `;
    }

    renderTagSettings() {
        const tags = this.tagService.getAll();
        return `
            <div class="wtl-settings-section">
                <h4 style="margin: 0 0 12px 0; color: var(--SmartThemeBodyColor); border-bottom: 1px solid var(--SmartThemeBorderColor, #333); padding-bottom: 8px;">
                    标签管理
                </h4>
                <div class="wtl-tag-list" style="margin-bottom: 12px;">
                    ${tags.map(tag => `
                        <div class="wtl-tag-item" data-tag-id="${tag.id}" style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding: 8px;
                            margin-bottom: 4px;
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 4px;
                        ">
                            <div style="width: 16px; height: 16px; background: ${tag.color}; border-radius: 50%;"></div>
                            <span class="wtl-tag-name" style="flex: 1; color: var(--SmartThemeBodyColor);">${tag.name}</span>
                            <button class="wtl-tag-edit" style="
                                background: transparent;
                                border: none;
                                color: var(--SmartThemeBodyColor);
                                cursor: pointer;
                                padding: 4px;
                            "><i class="fa-solid fa-edit"></i></button>
                            <button class="wtl-tag-delete" style="
                                background: transparent;
                                border: none;
                                color: #f44336;
                                cursor: pointer;
                                padding: 4px;
                            "><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `).join('')}
                </div>
                <button class="wtl-add-tag" style="
                    width: 100%;
                    padding: 8px;
                    background: transparent;
                    border: 1px dashed var(--SmartThemeBorderColor, #333);
                    color: var(--SmartThemeBodyColor);
                    border-radius: 4px;
                    cursor: pointer;
                ">+ 添加标签</button>
            </div>
        `;
    }

    bindEvents(container) {
        container.querySelector('.wtl-settings-close').addEventListener('click', () => this.hide());
        container.querySelector('.wtl-settings-save').addEventListener('click', () => this.saveSettings());
        container.querySelector('.wtl-settings-reset').addEventListener('click', () => this.resetSettings());

        container.querySelector('.wtl-add-folder').addEventListener('click', () => this.addFolder());
        container.querySelectorAll('.wtl-folder-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folderId = e.target.closest('.wtl-folder-item').dataset.folderId;
                this.editFolder(folderId);
            });
        });
        container.querySelectorAll('.wtl-folder-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folderId = e.target.closest('.wtl-folder-item').dataset.folderId;
                this.deleteFolder(folderId);
            });
        });

        container.querySelector('.wtl-add-tag').addEventListener('click', () => this.addTag());
        container.querySelectorAll('.wtl-tag-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = e.target.closest('.wtl-tag-item').dataset.tagId;
                this.editTag(tagId);
            });
        });
        container.querySelectorAll('.wtl-tag-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = e.target.closest('.wtl-tag-item').dataset.tagId;
                this.deleteTag(tagId);
            });
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    saveSettings() {
        const container = this.modal.querySelector('.wtl-settings-body');
        const newSettings = {
            itemsPerPage: parseInt(container.querySelector('.wtl-input-items-per-page').value) || 20,
            defaultSortBy: container.querySelector('.wtl-select-default-sort').value,
            defaultViewMode: container.querySelector('.wtl-select-default-view').value,
            expandOnLoad: container.querySelector('.wtl-checkbox-expand-load').checked,
            showMessageCount: container.querySelector('.wtl-checkbox-show-count').checked,
            confirmBeforeDelete: container.querySelector('.wtl-checkbox-confirm-delete').checked,
        };

        this.settingsService.setAll(newSettings);
        eventBus.emit(EVENTS.CONFIG_CHANGED, { settings: newSettings });
        this.hide();
    }

    resetSettings() {
        if (confirm('确定要恢复默认设置吗？')) {
            this.settingsService.reset();
            this.hide();
            this.show();
        }
    }

    addFolder() {
        const name = prompt('请输入文件夹名称：');
        if (name) {
            const color = prompt('请输入颜色（如 #4CAF50）：', '#4CAF50') || '#4CAF50';
            this.folderService.create(name, color);
            this.refresh();
        }
    }

    editFolder(folderId) {
        const folder = this.folderService.getById(folderId);
        if (!folder) return;

        const name = prompt('修改文件夹名称：', folder.name);
        if (name !== null) {
            const color = prompt('修改颜色：', folder.color);
            if (color !== null) {
                this.folderService.update(folderId, { name, color });
                this.refresh();
            }
        }
    }

    deleteFolder(folderId) {
        if (confirm('确定要删除此文件夹吗？聊天将移出该文件夹。')) {
            this.folderService.delete(folderId);
            this.refresh();
        }
    }

    addTag() {
        const name = prompt('请输入标签名称：');
        if (name) {
            const color = prompt('请输入颜色（如 #E91E63）：', '#E91E63') || '#E91E63';
            this.tagService.create(name, color);
            this.refresh();
        }
    }

    editTag(tagId) {
        const tag = this.tagService.getById(tagId);
        if (!tag) return;

        const name = prompt('修改标签名称：', tag.name);
        if (name !== null) {
            const color = prompt('修改颜色：', tag.color);
            if (color !== null) {
                this.tagService.update(tagId, { name, color });
                this.refresh();
            }
        }
    }

    deleteTag(tagId) {
        if (confirm('确定要删除此标签吗？')) {
            this.tagService.delete(tagId);
            this.refresh();
        }
    }

    refresh() {
        if (this.modal) {
            const isVisible = this.modal.style.display !== 'none';
            this.modal.remove();
            this.modal = null;
            if (isVisible) {
                this.show();
            }
        }
    }

    destroy() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}
