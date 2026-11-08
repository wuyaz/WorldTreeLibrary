// 注册扩展栏设置面板
import { getFeatureFlags, setFeatureFlags } from '../../core/storage.js';
import * as DataManager from '../../core/dataManager.js';
import { exportAllSettings, importAllSettings, resetAllSettings } from '../../core/settingsManager.js';

const FEATURE_SETTINGS_PANEL_ID = 'WorldTreeLibrary.features';

function renderFeatureSettingsHtml() {
  return `
    <div id="wtl-feature-settings" style="display:flex; flex-direction:column; gap:16px; color:var(--SmartThemeBodyColor);">
      <style>
        #wtl-feature-settings .wtl-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        #wtl-feature-settings .wtl-section-title {
          font-weight: 600;
          margin: 0;
        }
        #wtl-feature-settings .wtl-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          padding: 6px 0;
        }
        #wtl-feature-settings .wtl-checkbox-row input[type="checkbox"] {
          margin-top: 2px;
          flex-shrink: 0;
        }
        #wtl-feature-settings .wtl-checkbox-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        #wtl-feature-settings .wtl-checkbox-title {
          font-weight: 500;
          font-size: 13px;
        }
        #wtl-feature-settings .wtl-checkbox-desc {
          font-size: 11px;
          opacity: 0.65;
          line-height: 1.4;
        }
        #wtl-feature-settings .wtl-divider {
          border: none;
          border-top: 1px solid var(--SmartThemeBorderColor);
          opacity: 0.4;
          margin: 0;
        }
        #wtl-feature-settings .wtl-btn-row {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
          overflow-x: auto;
        }
        #wtl-feature-settings .wtl-btn-row button {
          white-space: nowrap;
        }
        #wtl-feature-settings .wtl-btn-row button {
          font-size: 12px;
          padding: 4px 10px;
          min-width: auto;
        }
        #wtl-feature-settings .wtl-settings-preview {
          width: 100%;
          min-height: 80px;
          max-height: 200px;
          font-size: 11px;
          font-family: var(--mono-font, monospace);
          background: color-mix(in srgb, var(--SmartThemeBgColor) 90%, transparent);
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 6px;
          padding: 8px;
          color: var(--SmartThemeBodyColor);
          resize: vertical;
          box-sizing: border-box;
        }
        #wtl-feature-settings .wtl-data-stats {
          font-size: 11px;
          opacity: 0.7;
          line-height: 1.5;
          word-break: break-all;
        }
      </style>

      <div>
        <div class="wtl-section-title">功能开关</div>
        <label class="wtl-checkbox-row">
          <input id="wtl-feature-memory-toggle" type="checkbox" />
          <div class="wtl-checkbox-copy">
            <div class="wtl-checkbox-title">记忆表格</div>
            <div class="wtl-checkbox-desc">控制 WorldTreeLibrary 主工作台与填表页签显示。</div>
          </div>
        </label>
        <label class="wtl-checkbox-row">
          <input id="wtl-feature-chat-toggle" type="checkbox" />
          <div class="wtl-checkbox-copy">
            <div class="wtl-checkbox-title">聊天管理</div>
            <div class="wtl-checkbox-desc">控制欢迎页聊天管理器注入、预览和快速跳转功能。</div>
          </div>
        </label>
        <label class="wtl-checkbox-row">
          <input id="wtl-feature-debug-toggle" type="checkbox" />
          <div class="wtl-checkbox-copy">
            <div class="wtl-checkbox-title">调试功能</div>
            <div class="wtl-checkbox-desc">开启后填表每一步都会弹出 alert 确认弹窗，用于调试填表流程。</div>
          </div>
        </label>
      </div>

      <hr class="wtl-divider">

      <div>
        <div class="wtl-section-header">
          <div class="wtl-section-title">用户设置</div>
          <div class="wtl-btn-row">
            <button id="wtl-settings-export" class="menu_button">导出</button>
            <button id="wtl-settings-import" class="menu_button">导入</button>
            <button id="wtl-settings-reset" class="menu_button">重置</button>
          </div>
        </div>
        <textarea id="wtl-settings-preview" class="wtl-settings-preview" readonly placeholder="加载中..."></textarea>
        <input id="wtl-settings-import-file" type="file" accept=".json" style="display:none;">
      </div>

      <hr class="wtl-divider">

      <div>
        <div class="wtl-section-header">
          <div class="wtl-section-title">本地数据</div>
          <div class="wtl-btn-row">
            <button id="wtl-data-export" class="menu_button">导出</button>
            <button id="wtl-data-import" class="menu_button">导入</button>
            <button id="wtl-data-delete-all" class="menu_button" style="color:#dc3545;">删除全部</button>
          </div>
        </div>
        <div id="wtl-data-stats" class="wtl-data-stats">加载中...</div>
        <div class="wtl-btn-row" style="margin-top:8px;">
          <button id="wtl-data-delete-tables" class="menu_button">仅删表格</button>
          <button id="wtl-data-delete-presets" class="menu_button">仅删预设</button>
          <button id="wtl-data-delete-chat" class="menu_button">仅删聊天数据</button>
        </div>
        <input id="wtl-data-import-file" type="file" accept=".json" style="display:none;">
      </div>
    </div>
  `;
}

function showToast(message, type = 'info') {
  if (window.toastr && typeof window.toastr[type] === 'function') {
    window.toastr[type](message);
  } else {
    console.log(`[WTL] ${message}`);
  }
}

function downloadJson(filename, jsonString) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function promptFileImport(accept = '.json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

async function refreshSettingsPreview(textarea) {
  try {
    const json = await exportAllSettings();
    textarea.value = json || '{}';
  } catch (e) {
    textarea.value = '无法加载设置: ' + e.message;
  }
}

function refreshDataStats(el) {
  try {
    const stats = DataManager.getAllDataStats();
    el.textContent = [
      `存储表格: ${stats.tables}`,
      `Schema预设: ${stats.schemaPresets}`,
      `Preprompt预设: ${stats.prepromptPresets}`,
      `指令预设: ${stats.instructionPresets}`,
      `Blocks预设: ${stats.blocksPresets}`,
      `RefBlocks预设: ${stats.refBlocksPresets}`,
      `Order预设: ${stats.orderPresets}`,
      `RefOrder预设: ${stats.refOrderPresets}`,
      `聊天管理: ${stats.chatManagerEntries}`
    ].join('  |  ');
  } catch (e) {
    el.textContent = '无法加载数据统计: ' + e.message;
  }
}

export async function registerFeatureSettingsPanel(options = {}) {
  const { onChange } = options;
  const ST_API = window.ST_API;
  if (!ST_API?.ui?.registerSettingsPanel) {
    console.warn('[WorldTreeLibrary] registerFeatureSettingsPanel skipped: ST_API not ready');
    return null;
  }

  const syncUi = () => {
    const flags = getFeatureFlags();
    const memoryToggleEl = document.querySelector('#wtl-feature-memory-toggle');
    const chatToggleEl = document.querySelector('#wtl-feature-chat-toggle');
    const debugToggleEl = document.querySelector('#wtl-feature-debug-toggle');
    if (memoryToggleEl) memoryToggleEl.checked = flags.memoryTable !== false;
    if (chatToggleEl) chatToggleEl.checked = flags.chatManager !== false;
    if (debugToggleEl) debugToggleEl.checked = flags.debugMode === true;
  };

  return ST_API.ui.registerSettingsPanel({
    id: FEATURE_SETTINGS_PANEL_ID,
    title: 'WorldTreeLibrary',
    target: 'right',
    expanded: false,
    content: {
      kind: 'render',
      render: (container) => {
        container.innerHTML = renderFeatureSettingsHtml();
        const root = container.querySelector('#wtl-feature-settings');
        if (!root) return;

        const settingsPreview = root.querySelector('#wtl-settings-preview');
        const dataStatsEl = root.querySelector('#wtl-data-stats');

        root.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          const current = getFeatureFlags();
          let next = current;
          if (target.id === 'wtl-feature-memory-toggle') {
            next = setFeatureFlags({ ...current, memoryTable: target.checked });
          }
          if (target.id === 'wtl-feature-chat-toggle') {
            next = setFeatureFlags({ ...current, chatManager: target.checked });
          }
          if (target.id === 'wtl-feature-debug-toggle') {
            next = setFeatureFlags({ ...current, debugMode: target.checked });
          }
          syncUi();
          if (typeof onChange === 'function') onChange(next);
        });

        root.querySelector('#wtl-settings-export').addEventListener('click', async () => {
          try {
            const json = await exportAllSettings();
            downloadJson('worldtree-settings.json', json);
            showToast('用户设置已导出', 'success');
          } catch (e) {
            showToast('导出失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-settings-import').addEventListener('click', async () => {
          const content = await promptFileImport('.json');
          if (!content) return;
          const success = await importAllSettings(content);
          if (success) {
            showToast('用户设置已导入', 'success');
            if (settingsPreview) refreshSettingsPreview(settingsPreview);
            syncUi();
          } else {
            showToast('导入失败: 无效的JSON格式', 'error');
          }
        });

        root.querySelector('#wtl-settings-reset').addEventListener('click', async () => {
          if (!confirm('确定要重置所有用户设置到默认值吗？此操作不可撤销。')) return;
          try {
            await resetAllSettings();
            showToast('用户设置已重置', 'success');
            if (settingsPreview) refreshSettingsPreview(settingsPreview);
            syncUi();
          } catch (e) {
            showToast('重置失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-data-export').addEventListener('click', () => {
          try {
            const json = DataManager.exportLocalData();
            downloadJson('worldtree-data.json', json);
            showToast('本地数据已导出', 'success');
          } catch (e) {
            showToast('导出失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-data-import').addEventListener('click', async () => {
          const content = await promptFileImport('.json');
          if (!content) return;
          const result = DataManager.importLocalData(content);
          if (result.success) {
            showToast(`已导入 ${result.importedCount} 条数据`, 'success');
            if (dataStatsEl) refreshDataStats(dataStatsEl);
          } else {
            showToast('导入失败: ' + result.error, 'error');
          }
        });

        root.querySelector('#wtl-data-delete-all').addEventListener('click', () => {
          if (!confirm('确定要删除所有 WorldTreeLibrary 本地数据吗？此操作不可撤销。')) return;
          try {
            const count = DataManager.deleteLocalData('all');
            showToast(`已删除 ${count} 条数据`, 'success');
            if (dataStatsEl) refreshDataStats(dataStatsEl);
          } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-data-delete-tables').addEventListener('click', () => {
          if (!confirm('确定要删除所有存储的表格数据吗？')) return;
          try {
            const count = DataManager.deleteLocalData('tables');
            showToast(`已删除 ${count} 条表格数据`, 'success');
            if (dataStatsEl) refreshDataStats(dataStatsEl);
          } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-data-delete-presets').addEventListener('click', () => {
          if (!confirm('确定要删除所有预设数据吗？')) return;
          try {
            const count = DataManager.deleteLocalData('presets');
            showToast(`已删除 ${count} 条预设数据`, 'success');
            if (dataStatsEl) refreshDataStats(dataStatsEl);
          } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
          }
        });

        root.querySelector('#wtl-data-delete-chat').addEventListener('click', () => {
          if (!confirm('确定要删除所有聊天管理数据吗？')) return;
          try {
            const count = DataManager.deleteLocalData('chatManager');
            showToast(`已删除 ${count} 条聊天管理数据`, 'success');
            if (dataStatsEl) refreshDataStats(dataStatsEl);
          } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
          }
        });

        syncUi();
        if (settingsPreview) refreshSettingsPreview(settingsPreview);
        if (dataStatsEl) refreshDataStats(dataStatsEl);

        return () => {
          root.removeEventListener('change', () => {});
        };
      }
    }
  });
}
