// @ts-nocheck
import { initConfig } from './config.js';
import { loadHtml } from './assets.js';

(function () { // 使用 IIFE 立即执行函数，避免变量污染全局作用域
  const init = async () => { // 主初始化入口：注册 UI、绑定事件
    const ctx = window.SillyTavern?.getContext?.(); // 读取 SillyTavern 运行上下文（包含事件、聊天信息等）
    if (!ctx || !window.ST_API?.ui) return; // 未获取到上下文或 UI API 不存在则直接退出

    const { defaults } = await initConfig();
    const { eventSource, event_types } = ctx; // 解构出事件总线与事件类型枚举

    let registered = false; // 标记是否已注册 UI，防止重复注册
    const register = async () => { // 注册抽屉页（顶部设置页签）的函数
      if (registered) return; // 已注册则不再执行
      registered = true; // 置位为已注册

      try { // 捕获注册 UI 的异常
        const html = await loadHtml('wtl-ui.html');
        await window.ST_API.ui.registerTopSettingsDrawer({ // 向 SillyTavern 注册顶部设置抽屉
          id: 'WorldTreeLibrary.topTab', // 抽屉唯一 ID
          icon: 'fa-solid fa-table fa-fw', // 抽屉图标（FontAwesome）
          title: 'WorldTreeLibrary', // 抽屉标题
          expanded: false, // 初始是否展开
          content: { // 抽屉内容配置
            kind: 'html', // 内容类型：HTML
            html
          },
          onOpen: () => {
            const root = document.getElementById('wtl-root');
            if (!root || root.dataset.bound === 'true') return;
            root.dataset.bound = 'true';

            const statusEl = document.getElementById('wtl-status');
            const pageMainEl = document.getElementById('wtl-page-main');
            const pageConfigEl = document.getElementById('wtl-page-config');
            const openConfigBtn = document.getElementById('wtl-open-config');
            const backMainBtn = document.getElementById('wtl-back-main');
            const batchBtn = document.getElementById('wtl-batch');
            const batchStartEl = document.getElementById('wtl-batch-start');
            const batchEndEl = document.getElementById('wtl-batch-end');
            const batchStepEl = document.getElementById('wtl-batch-step');

            const autoToggleBtn = document.getElementById('wtl-auto-toggle');
            const autoFloorsEl = document.getElementById('wtl-auto-floors');
            const autoEveryEl = document.getElementById('wtl-auto-every');

            const editTableBtn = document.getElementById('wtl-edit-table');
            const editTemplateBtn = document.getElementById('wtl-edit-template');
            const historyBackBtn = document.getElementById('wtl-history-back');
            const historyUndoBtn = document.getElementById('wtl-history-undo');
            const historyBtn = document.getElementById('wtl-history');
            const editPrepromptBtn = document.getElementById('wtl-edit-preprompt');
            const resetPrepromptBtn = document.getElementById('wtl-reset-preprompt');
            const editInstructionBtn = document.getElementById('wtl-edit-instruction');
            const resetInstructionBtn = document.getElementById('wtl-reset-instruction');
            const refreshSchemaBtn = document.getElementById('wtl-refresh-schema');
            const resetSchemaBtn = document.getElementById('wtl-reset-schema');
            const editSchemaBtn = document.getElementById('wtl-edit-schema');
            const templateEditorEl = document.getElementById('wtl-template-editor');

            const prepromptPresetEl = document.getElementById('wtl-preprompt-preset');
            const prepromptPresetNameEl = document.getElementById('wtl-preprompt-preset-name');
            const prepromptPresetLoadEl = document.getElementById('wtl-preprompt-preset-load');
            const prepromptPresetSaveEl = document.getElementById('wtl-preprompt-preset-save');
            const prepromptPresetRenameEl = document.getElementById('wtl-preprompt-preset-rename');
            const prepromptPresetDelEl = document.getElementById('wtl-preprompt-preset-del');
            const prepromptPresetImportEl = document.getElementById('wtl-preprompt-preset-import');
            const prepromptPresetExportEl = document.getElementById('wtl-preprompt-preset-export');
            const prepromptPresetFileEl = document.getElementById('wtl-preprompt-preset-file');

            const instructionPresetEl = document.getElementById('wtl-instruction-preset');
            const instructionPresetNameEl = document.getElementById('wtl-instruction-preset-name');
            const instructionPresetLoadEl = document.getElementById('wtl-instruction-preset-load');
            const instructionPresetSaveEl = document.getElementById('wtl-instruction-preset-save');
            const instructionPresetRenameEl = document.getElementById('wtl-instruction-preset-rename');
            const instructionPresetDelEl = document.getElementById('wtl-instruction-preset-del');
            const instructionPresetImportEl = document.getElementById('wtl-instruction-preset-import');
            const instructionPresetExportEl = document.getElementById('wtl-instruction-preset-export');
            const instructionPresetFileEl = document.getElementById('wtl-instruction-preset-file');
            const sectionListEl = document.getElementById('wtl-section-list');
            const columnListEl = document.getElementById('wtl-column-list');
            const sectionAddBtn = document.getElementById('wtl-section-add');
            const sectionApplyBtn = document.getElementById('wtl-section-apply');
            const columnAddBtn = document.getElementById('wtl-column-add');
            const editorOverlayEl = document.getElementById('wtl-editor-overlay');
            const editorDialogTitleEl = document.getElementById('wtl-editor-dialog-title');
            const editorDialogNameEl = document.getElementById('wtl-editor-dialog-name');
            const editorDialogDefEl = document.getElementById('wtl-editor-dialog-definition');
            const editorDialogDelEl = document.getElementById('wtl-editor-dialog-delete');
            const editorDialogAddEl = document.getElementById('wtl-editor-dialog-insert');
            const editorDialogEditEl = document.getElementById('wtl-editor-dialog-update');
            const editorDialogFillEl = document.getElementById('wtl-editor-dialog-fill');
            const editorDialogFillRowEl = document.getElementById('wtl-editor-dialog-fill-row');
            const editorDialogSendEl = document.getElementById('wtl-editor-dialog-send');
            const editorDialogSendRowEl = document.getElementById('wtl-editor-dialog-send-row');
            const editorDialogInsertRowEl = document.getElementById('wtl-editor-dialog-insert-row');
            const editorDialogUpdateRowEl = document.getElementById('wtl-editor-dialog-update-row');
            const editorDialogDeleteRowEl = document.getElementById('wtl-editor-dialog-delete-row');
            const editorDialogInsertToggleEl = document.getElementById('wtl-editor-dialog-insert-toggle');
            const editorDialogUpdateToggleEl = document.getElementById('wtl-editor-dialog-update-toggle');
            const editorDialogDeleteToggleEl = document.getElementById('wtl-editor-dialog-delete-toggle');
            const editorDialogInsertEnabledEl = document.getElementById('wtl-editor-dialog-insert-enabled');
            const editorDialogUpdateEnabledEl = document.getElementById('wtl-editor-dialog-update-enabled');
            const editorDialogDeleteEnabledEl = document.getElementById('wtl-editor-dialog-delete-enabled');
            const editorDialogSaveEl = document.getElementById('wtl-editor-dialog-save');
            const editorDialogCloseEl = document.getElementById('wtl-editor-dialog-close');
            const modalEl = document.getElementById('wtl-modal');
            const modalTitleEl = document.getElementById('wtl-modal-title');
            const modalContentEl = document.getElementById('wtl-modal-content');
            const modalCustomEl = document.getElementById('wtl-modal-custom');
            const modalActionsEl = document.getElementById('wtl-modal-actions');
            const modalCloseEl = document.getElementById('wtl-modal-close');
            const tableMdEl = document.getElementById('wtl-table-md');
            const schemaModeEl = document.getElementById('wtl-schema-mode');
            const schemaEl = document.getElementById('wtl-schema');
            const schemaPresetEl = document.getElementById('wtl-schema-preset');
            const schemaPresetNameEl = document.getElementById('wtl-schema-preset-name');
            const schemaPresetLoadEl = document.getElementById('wtl-schema-preset-load');
            const schemaPresetSaveEl = document.getElementById('wtl-schema-preset-save');
            const schemaPresetRenameEl = document.getElementById('wtl-schema-preset-rename');
            const schemaPresetDelEl = document.getElementById('wtl-schema-preset-del');
            const schemaPresetImportEl = document.getElementById('wtl-schema-preset-import');
            const schemaPresetExportEl = document.getElementById('wtl-schema-preset-export');
            const schemaPresetFileEl = document.getElementById('wtl-schema-preset-file');
            const schemaBindGlobalEl = document.getElementById('wtl-schema-bind-global');
            const schemaBindCharacterEl = document.getElementById('wtl-schema-bind-character');
            const schemaBindChatEl = document.getElementById('wtl-schema-bind-chat');
            const schemaBindCharacterNameEl = document.getElementById('wtl-schema-bind-character-name');
            const schemaBindChatNameEl = document.getElementById('wtl-schema-bind-chat-name');
            const schemaEffectiveEl = document.getElementById('wtl-schema-effective');
            const headEl = document.getElementById('wtl-preview-head');
            const bodyEl = document.getElementById('wtl-preview-body');
            const tableTabsEl = document.getElementById('wtl-table-tabs');
            const blockListEl = document.getElementById('wtl-block-list');
            const refBlockListEl = document.getElementById('wtl-ref-block-list');
            const blockAddEl = document.getElementById('wtl-block-add');
            const refBlockAddEl = document.getElementById('wtl-ref-block-add');
            const blockResetEl = document.getElementById('wtl-block-reset');
            const refBlockResetEl = document.getElementById('wtl-ref-block-reset');
            const wbModeEl = document.getElementById('wtl-wb-mode');
            const wbManualWrapEl = document.getElementById('wtl-wb-manual-wrap');
            const wbManualEl = document.getElementById('wtl-wb-manual');
            const wbManualUiEl = document.getElementById('wtl-wb-manual-ui');
            const wbManualRefreshEl = document.getElementById('wtl-wb-manual-refresh');
            const entryEl = document.getElementById('wtl-entry');
            const prePromptEl = document.getElementById('wtl-preprompt');
            const instructionEl = document.getElementById('wtl-instruction');
            const sendModeEl = document.getElementById('wtl-send-mode');
            const externalEl = document.getElementById('wtl-mode-external');
            const stModeEl = document.getElementById('wtl-mode-st');
            const instBlockEl = document.getElementById('wtl-inst-block');
            const schemaBlockEl = document.getElementById('wtl-schema-block');
            const tablePreviewEl = document.getElementById('wtl-table-preview');
            const logContentEl = document.getElementById('wtl-log-content');
            const logPromptBtn = document.getElementById('wtl-log-prompt');
            const logAiBtn = document.getElementById('wtl-log-ai');
            const logRefreshBtn = document.getElementById('wtl-log-refresh');

            // external 模式：左侧按钮切换
            const externalNavOrderBtn = document.getElementById('wtl-external-nav-order');
            const externalNavRefBtn = document.getElementById('wtl-external-nav-ref');
            const externalNavWbBtn = document.getElementById('wtl-external-nav-wb');
            const externalPanelOrderEl = document.getElementById('wtl-external-panel-order');
            const externalPanelRefEl = document.getElementById('wtl-external-panel-ref');
            const externalPanelWbEl = document.getElementById('wtl-external-panel-wb');

            const openaiPresetEl = document.getElementById('wtl-openai-preset');
            const openaiPresetNameEl = document.getElementById('wtl-openai-preset-name');
            const openaiPresetLoadEl = document.getElementById('wtl-openai-preset-load');
            const openaiPresetDelEl = document.getElementById('wtl-openai-preset-del');

            const openaiUrlEl = document.getElementById('wtl-openai-url');
            const openaiKeyEl = document.getElementById('wtl-openai-key');
            const openaiModelEl = document.getElementById('wtl-openai-model');
            const openaiRefreshEl = document.getElementById('wtl-openai-refresh');
            const openaiTempEl = document.getElementById('wtl-openai-temp');
            const openaiMaxEl = document.getElementById('wtl-openai-max');
            const externalSaveEl = document.getElementById('wtl-external-save');

            const tablePosEl = document.getElementById('wtl-table-pos');
            const tableRoleEl = document.getElementById('wtl-table-role');
            const tableDepthEl = document.getElementById('wtl-table-depth');
            const tableOrderEl = document.getElementById('wtl-table-order');
            const tableInjectToggleBtn = document.getElementById('wtl-table-inject-toggle');
 
            const instPosEl = document.getElementById('wtl-inst-pos');
            const instRoleEl = document.getElementById('wtl-inst-role');
            const instDepthEl = document.getElementById('wtl-inst-depth');
            const instOrderEl = document.getElementById('wtl-inst-order');
            const instInjectToggleEl = document.getElementById('wtl-inst-inject-toggle');
 
            const schemaPosEl = document.getElementById('wtl-schema-pos');
            const schemaRoleEl = document.getElementById('wtl-schema-role');
            const schemaDepthEl = document.getElementById('wtl-schema-depth');
            const schemaOrderEl = document.getElementById('wtl-schema-order');
            const schemaInjectToggleEl = document.getElementById('wtl-schema-inject-toggle');

            let running = false;
            let lastRef = null;
            let manualState = null;
            let activeSection = '';
            let tableSectionOrder = [];
            let hiddenRows = {};
            let templateState = { title: '记忆表格', sections: [] };
            let templateActiveSectionId = '';
            let templateDialogTarget = null;
            let tableEditMode = false;
            let templateEditMode = false;
            let schemaSource = '';

            const getCharacterName = () => {
              const ctx = window.SillyTavern?.getContext?.();
              const characterId = ctx?.characterId;
              const currentChar = characterId !== undefined && characterId !== null
                ? (ctx?.characters?.[characterId] ?? ctx?.characters?.[Number(characterId)])
                : null;
              const avatarFile = currentChar?.avatar || '';
              const nameFromAvatar = avatarFile.endsWith('.png') ? avatarFile.replace(/\.png$/i, '') : avatarFile;
              return currentChar?.name || nameFromAvatar || '';
            };

            const getChatKey = () => {
              const ctx = window.SillyTavern?.getContext?.();
              return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || 'default';
            };

            const getChatMetadata = () => {
              const ctx = window.SillyTavern?.getContext?.();
              return ctx?.chatMetadata || ctx?.chat?.metadata || null;
            };

            const wrapTable = (md) => {
              const content = (md || '').trim();
              if (!content) return '<WTL_Table>\n</WTL_Table>';
              if (content.includes('<WTL_Table>') && content.includes('</WTL_Table>')) return content;
              return `<WTL_Table>\n${content}\n</WTL_Table>`;
            };

            const safeParseJson = (value) => {
              if (!value) return null;
              if (typeof value === 'object') return value;
              if (typeof value === 'string') {
                try { return JSON.parse(value); } catch (e) { return null; }
              }
              return null;
            };

            const getTablePreviewForSend = (md) => {
              const raw = stripTableWrapper(md || '');
              const lines = raw.split('\n');
              let sectionIndex = 0;
              let inSection = false;
              let headerLine = null;
              let sepLine = null;
              const out = [];
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const headerMatch = /^##\s+(.+)$/.exec(line.trim());
                if (headerMatch) {
                  sectionIndex += 1;
                  inSection = true;
                  headerLine = null;
                  sepLine = null;
                  const meta = templateState?.sections?.[sectionIndex - 1];
                  if (meta && meta.sendable === false) {
                    inSection = false;
                    continue;
                  }
                  out.push(line);
                  continue;
                }
                if (!inSection) {
                  out.push(line);
                  continue;
                }
                if (line.trim().startsWith('|')) {
                  if (!headerLine) {
                    headerLine = line;
                    out.push(line);
                    continue;
                  }
                  if (!sepLine) {
                    sepLine = line;
                    out.push(line);
                    continue;
                  }
                  const rowIndex = Math.max(1, out.filter(l => l.trim().startsWith('|')).length - 2);
                  const hidden = Boolean(hiddenRows?.[String(sectionIndex)]?.[String(rowIndex)]);
                  if (!hidden) out.push(line);
                  continue;
                }
                out.push(line);
              }
              return wrapTable(out.join('\n').trim());
            };

            const getOpenAIPresets = () => {
              return safeParseJson(localStorage.getItem('wtl.openai.presets')) || {};
            };
            const setOpenAIPresets = (presets) => {
              localStorage.setItem('wtl.openai.presets', JSON.stringify(presets || {}));
            };

            const PREPROMPT_PRESET_KEY = 'wtl.preprompt.presets';
            const PREPROMPT_PRESET_ACTIVE_KEY = 'wtl.preprompt.presetActive';
            const INSTRUCTION_PRESET_KEY = 'wtl.instruction.presets';
            const INSTRUCTION_PRESET_ACTIVE_KEY = 'wtl.instruction.presetActive';
 
            const getPromptPresets = (key) => safeParseJson(localStorage.getItem(key)) || {};
            const setPromptPresets = (key, presets) => {
              localStorage.setItem(key, JSON.stringify(presets || {}));
            };
            const refreshPromptPresetSelect = (selectEl, presets) => {
              if (!selectEl) return;
              const names = Object.keys(presets || {}).sort();
              selectEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('') || '<option value="">(无预设)</option>';
            };
            const getPresetFromStorage = (storageKey, activeKey, fallback = undefined) => {
              const active = localStorage.getItem(activeKey) || '默认';
              const presets = safeParseJson(localStorage.getItem(storageKey)) || {};
              return presets[active] ?? fallback;
            };
            const getPresetTextByName = (storageKey, name, fallback = '') => {
              const presets = safeParseJson(localStorage.getItem(storageKey)) || {};
              const value = presets[name] ?? fallback;
              if (Array.isArray(value)) return value.join('\n');
              if (typeof value === 'string') return value;
              return fallback;
            };
            const getTextPresetFromStorage = (storageKey, activeKey, fallback = '') => {
              const value = getPresetFromStorage(storageKey, activeKey, fallback);
              if (Array.isArray(value)) return value.join('\n');
              if (typeof value === 'string') return value;
              return fallback;
            };
            const getDefaultPromptText = (presetType, storageKey, activeKey) => {
              let text = getTextPresetFromStorage(storageKey, activeKey, '');
              if (!text) text = getPresetTextByName(storageKey, '默认', '');
              if (!text && window.__WTL_PRESETS__?.[presetType]?.['默认']) {
                const fallback = window.__WTL_PRESETS__[presetType]['默认'];
                text = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
              }
              return text || '';
            };
            const getDefaultSchemaText = () => {
              let text = getTextPresetFromStorage('wtl.schema.presets', 'wtl.schema.presetActive', '');
              if (!text) text = getPresetTextByName('wtl.schema.presets', '默认', '');
              if (!text && window.__WTL_PRESETS__?.schema?.['默认']) {
                const fallback = window.__WTL_PRESETS__.schema['默认'];
                text = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
              }
              return text || '';
            };
            const getSchemaPresets = () => safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
            const setSchemaPresets = (presets) => {
              localStorage.setItem('wtl.schema.presets', JSON.stringify(presets || {}));
            };
            const refreshSchemaPresetSelect = (selectEl, presets) => {
              if (!selectEl) return;
              const names = Object.keys(presets || {}).sort();
              selectEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('') || '<option value="">(无预设)</option>';
            };
            const getSchemaScopedPresets = () => safeParseJson(localStorage.getItem('wtl.schema.presetsByScope')) || {};
            const setSchemaScopedPresets = (data) => {
              localStorage.setItem('wtl.schema.presetsByScope', JSON.stringify(data || {}));
            };
            const getSchemaScopeLabel = (scope) => ({ chat: '聊天', character: '角色', global: '全局' }[scope] || '全局');
            const getSchemaScope = () => {
              if (schemaBindChatEl?.checked) return 'chat';
              if (schemaBindCharacterEl?.checked) return 'character';
              return 'global';
            };
            const updateSchemaBindRadios = (scope) => {
              if (schemaBindGlobalEl) schemaBindGlobalEl.checked = scope === 'global';
              if (schemaBindCharacterEl) schemaBindCharacterEl.checked = scope === 'character';
              if (schemaBindChatEl) schemaBindChatEl.checked = scope === 'chat';
            };
            const getCurrentChatId = () => {
              const ctx = window.SillyTavern?.getContext?.();
              return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || '';
            };
            const getCurrentCharacterId = () => {
              const ctx = window.SillyTavern?.getContext?.();
              const characterId = ctx?.characterId || ctx?.character?.id || ctx?.character?.avatar || '';
              return characterId || '';
            };
            const getChatDisplayName = () => {
              const ctx = window.SillyTavern?.getContext?.();
              return ctx?.chat?.name || ctx?.chat?.file || ctx?.chatId || '当前聊天';
            };
            const getCharacterDisplayName = () => {
              const name = getCharacterName();
              return name || '当前角色';
            };
            const getSchemaScopedPresetName = (scope, chatId, charId) => {
              const map = getSchemaScopedPresets();
              if (scope === 'chat') return map?.chat?.[chatId] || '';
              if (scope === 'character') return map?.character?.[charId] || '';
              return map?.global || '';
            };
            const setSchemaScopedPresetName = (scope, name, chatId, charId) => {
              const map = getSchemaScopedPresets();
              if (scope === 'chat') {
                map.chat = map.chat || {};
                if (name) map.chat[chatId] = name; else delete map.chat[chatId];
              } else if (scope === 'character') {
                map.character = map.character || {};
                if (name) map.character[charId] = name; else delete map.character[charId];
              } else {
                map.global = name || '';
              }
              setSchemaScopedPresets(map);
            };
            const resolveSchemaByScope = () => {
              const chatId = getCurrentChatId();
              const charId = getCurrentCharacterId();
              const map = getSchemaScopedPresets();
              const presets = getSchemaPresets();
              const chatName = map?.chat?.[chatId];
              if (chatName && presets[chatName]) {
                return { scope: 'chat', name: chatName, text: presets[chatName] };
              }
              const charName = map?.character?.[charId];
              if (charName && presets[charName]) {
                return { scope: 'character', name: charName, text: presets[charName] };
              }
              const globalName = map?.global || localStorage.getItem('wtl.schema.presetActive') || '默认';
              const globalText = presets[globalName] || presets['默认'] || getDefaultSchemaText();
              return { scope: 'global', name: globalName || '默认', text: globalText || '' };
            };
            const getSchemaPreset = () => getDefaultSchemaText();
            const getBlocksPreset = () => getPresetFromStorage('wtl.blocks.presets', 'wtl.blocks.presetActive', []);
            const getRefBlocksPreset = () => getPresetFromStorage('wtl.refBlocks.presets', 'wtl.refBlocks.presetActive', []);
            const getOrderPreset = () => getPresetFromStorage('wtl.order.presets', 'wtl.order.presetActive', []);
            const getRefOrderPreset = () => getPresetFromStorage('wtl.refOrder.presets', 'wtl.refOrder.presetActive', []);
            const downloadJson = (filename, data) => {
              const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            };
            const refreshOpenAIPresetSelect = () => {
              if (!openaiPresetEl) return;
              const presets = getOpenAIPresets();
              const names = Object.keys(presets).sort();
              openaiPresetEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('') || `<option value="">(无预设)</option>`;
            };
            const loadOpenAIPresetByName = (name) => {
              const presets = getOpenAIPresets();
              const p = presets?.[name];
              if (!p) return false;
              if (openaiUrlEl && typeof p.url === 'string') openaiUrlEl.value = p.url;
              if (openaiKeyEl && typeof p.key === 'string') openaiKeyEl.value = p.key;
              if (openaiTempEl && p.temp !== undefined) openaiTempEl.value = String(p.temp);
              if (openaiMaxEl && p.max !== undefined) openaiMaxEl.value = String(p.max);
              if (openaiModelEl && typeof p.model === 'string') {
                openaiModelEl.innerHTML = `<option value="${p.model}">${p.model}</option>`;
                openaiModelEl.value = p.model;
              }
              if (openaiPresetNameEl) openaiPresetNameEl.value = name;
              return true;
            };

            const parseMarkdownTableToJson = (md) => {
              const raw = (md || '').replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
              const lines = raw.split('\n');
              let title = '记忆表格';
              for (const line of lines) {
                const match = /^#\s+(.+)$/.exec(line.trim());
                if (match) { title = match[1].trim(); break; }
              }
              const sections = [];
              let current = null;
              for (const line of lines) {
                const match = /^##\s+(.+)$/.exec(line.trim());
                if (match) {
                  if (current) sections.push(current);
                  current = { name: match[1].trim(), lines: [] };
                  continue;
                }
                if (current) current.lines.push(line);
              }
              if (current) sections.push(current);
              const normalized = sections.map((s) => {
                const rows = s.lines.filter(l => l.trim().startsWith('|'));
                if (!rows.length) return { name: s.name, columns: [], rows: [] };
                const header = rows[0].split('|').slice(1, -1).map(c => c.trim());
                const bodyRows = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
                return { name: s.name, columns: header, rows: bodyRows };
              });
              return { title, sections: normalized };
            };

            const renderJsonToMarkdown = (data) => {
              const title = (data?.title || '记忆表格').toString().trim() || '记忆表格';
              const sections = Array.isArray(data?.sections) ? data.sections : [];
              const blocks = sections.map((sec) => {
                const name = (sec?.name || '未命名').toString().trim() || '未命名';
                const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c ?? '').toString().trim() || '-') : [];
                const safeCols = cols.length ? cols : ['-'];
                const rows = Array.isArray(sec?.rows) ? sec.rows : [];
                const headerRow = `| ${safeCols.join(' | ')} |`;
                const sepRow = `| ${safeCols.map(() => '---').join(' | ')} |`;
                const body = rows.map((r) => {
                  const line = safeCols.map((_, idx) => (r?.[idx] ?? '')).join(' | ');
                  return `| ${line} |`;
                }).join('\n');
                return body ? `## ${name}\n${headerRow}\n${sepRow}\n${body}` : `## ${name}\n${headerRow}\n${sepRow}`;
              }).filter(Boolean).join('\n\n');
              const content = `# ${title}\n\n${blocks}`.trim();
              return wrapTable(content);
            };

            const buildEmptyTableFromTemplate = (tpl) => {
              const title = (tpl?.title || '记忆表格').toString().trim() || '记忆表格';
              const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
              const normalized = sections.map((sec) => {
                const name = (sec?.name || '未命名').toString().trim() || '未命名';
                const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c?.name ?? '').toString().trim() || '-') : [];
                const safeCols = cols.length ? cols : ['-'];
                return { name, columns: safeCols, rows: [] };
              });
              return { title, sections: normalized };
            };

            const loadTableForChat = async () => {
              const metadata = getChatMetadata();
              const chatKey = getChatKey();
              const metaJson = safeParseJson(metadata?.WorldTreeLibrary?.tableJson);
              const localJson = safeParseJson(localStorage.getItem(`wtl.tableJson.${chatKey}`));
              const tableJson = metaJson || localJson;
              if (tableJson) {
                hiddenRows = typeof tableJson.hiddenRows === 'object' && tableJson.hiddenRows ? tableJson.hiddenRows : {};
                return renderJsonToMarkdown(tableJson);
              }

              const schemaMode = localStorage.getItem('wtl.schemaMode') || defaults.schemaMode;
              const resolved = resolveSchemaByScope();
              const schema = resolved?.text || loadSchemaForMode(schemaMode) || getDefaultSchemaText();
              const template = parseSchemaToTemplate(schema || '');
              const defaultJson = buildEmptyTableFromTemplate(template);
              defaultJson.hiddenRows = {};
              hiddenRows = {};
              const tableMd = renderJsonToMarkdown(defaultJson);
              localStorage.setItem(`wtl.tableJson.${chatKey}`, JSON.stringify(defaultJson));
              localStorage.setItem(`wtl.table.${chatKey}`, tableMd);
              return tableMd;
            };

            const getHistoryKey = () => `wtl.history.${getChatKey()}`;
            const getHistoryIndexKey = () => `wtl.history.index.${getChatKey()}`;

            const appendHistory = (tableJson, tableMd) => {
              const key = getHistoryKey();
              const list = JSON.parse(localStorage.getItem(key) || '[]');
              list.push({ time: new Date().toISOString(), tableJson, table: tableMd });
              localStorage.setItem(key, JSON.stringify(list));
              localStorage.setItem(getHistoryIndexKey(), String(list.length - 1));
            };

            const randBase36 = (len) => {
              let out = '';
              while (out.length < len) out += Math.random().toString(36).slice(2);
              return out.slice(0, len);
            };
            const randLetters = (len) => {
              const letters = 'abcdefghijklmnopqrstuvwxyz';
              let out = '';
              for (let i = 0; i < len; i++) out += letters[Math.floor(Math.random() * letters.length)];
              return out;
            };
            const createSectionIdWithPrefix = (prefix, used) => {
              let id = '';
              let tries = 0;
              do {
                id = `${prefix}${randBase36(2)}`;
                tries++;
              } while (used.has(id) && tries < 200);
              used.add(id);
              return id;
            };
            const createColumnIdForSection = (sectionId, used) => {
              let id = '';
              let tries = 0;
              do {
                id = `${sectionId}_${randBase36(4)}`;
                tries++;
              } while (used.has(id) && tries < 500);
              used.add(id);
              return id;
            };
            const ensureTemplatePrefix = (tpl) => {
              if (!tpl.templatePrefix) tpl.templatePrefix = randLetters(2);
              return tpl.templatePrefix;
            };
            const createSectionIdInTemplate = (tpl) => {
              const used = new Set((tpl?.sections || []).map(s => s.id).filter(Boolean));
              const prefix = ensureTemplatePrefix(tpl);
              return createSectionIdWithPrefix(prefix, used);
            };
            const createColumnIdInTemplate = (tpl, sectionId) => {
              const sec = (tpl?.sections || []).find(s => s.id === sectionId);
              const used = new Set((sec?.columns || []).map(c => c.id).filter(Boolean));
              return createColumnIdForSection(sectionId, used);
            };

            const parseSchemaToTemplate = (schemaMd) => {
              let payload = null;
              const jsonMatch = /<WTL_Template\s+type="json">([\s\S]*?)<\/WTL_Template>/i.exec(schemaMd || '');
              if (jsonMatch) {
                try { payload = JSON.parse(jsonMatch[1]); } catch (e) { payload = null; }
              }
              if (payload && payload.sections) {
                const prefix = payload.templatePrefix || randLetters(2);
                const sectionIds = new Set();
                const normalized = {
                  title: (payload.title || '记忆表格').toString(),
                  templatePrefix: prefix,
                  sections: (payload.sections || []).map((sec) => {
                    let secId = sec.id;
                    if (!secId || sectionIds.has(secId)) {
                      secId = createSectionIdWithPrefix(prefix, sectionIds);
                    } else {
                      sectionIds.add(secId);
                    }
                    const columnIds = new Set();
                    return {
                      id: secId,
                      name: sec.name || '未命名',
                      definition: sec.definition || '',
                      deleteRule: sec.deleteRule || '',
                      insertRule: sec.insertRule || '',
                      updateRule: sec.updateRule || '',
                      fillable: sec.fillable !== false,
                      sendable: sec.sendable !== false,
                      columns: (sec.columns || []).map((col) => {
                        let colId = col.id;
                        if (!colId || columnIds.has(colId)) {
                          colId = createColumnIdForSection(secId, columnIds);
                        } else {
                          columnIds.add(colId);
                        }
                        return {
                          id: colId,
                          name: col.name || '列',
                          definition: col.definition || '',
                          deleteRule: col.deleteRule || '',
                          insertRule: col.insertRule || '',
                          updateRule: col.updateRule || ''
                        };
                      })
                    };
                  })
                };
                if (!normalized.sections.length) {
                  const secId = createSectionIdWithPrefix(prefix, sectionIds);
                  const colIds = new Set();
                  normalized.sections.push({ id: secId, name: '未命名', definition: '', deleteRule: '', insertRule: '', updateRule: '', fillable: true, sendable: true, columns: [{ id: createColumnIdForSection(secId, colIds), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }] });
                }
                return normalized;
              }

              const raw = (schemaMd || '').replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
              const lines = raw.split('\n');
              let title = '记忆表格';
              const templatePrefix = randLetters(2);
              for (const line of lines) {
                const match = /^#\s+(.+)$/.exec(line.trim());
                if (match) { title = match[1].trim(); break; }
              }
              const sections = [];
              const sectionIds = new Set();
              let current = null;
              for (const line of lines) {
                const match = /^##\s+(.+)$/.exec(line.trim());
                if (match) {
                  if (current) sections.push(current);
                  const secId = createSectionIdWithPrefix(templatePrefix, sectionIds);
                  current = { id: secId, name: match[1].trim(), definition: '', deleteRule: '', insertRule: '', updateRule: '', fillable: true, sendable: true, columns: [] };
                  continue;
                }
                if (!current) continue;
                if (line.trim().startsWith('|')) {
                  const cols = line.split('|').slice(1, -1).map(c => c.trim()).filter(Boolean);
                  if (cols.length && current.columns.length === 0) {
                    const colIds = new Set();
                    current.columns = cols.map((c) => ({ id: createColumnIdForSection(current.id, colIds), name: c, definition: '', deleteRule: '', insertRule: '', updateRule: '' }));
                  }
                }
              }
              if (current) sections.push(current);
              if (!sections.length) {
                const secId = createSectionIdWithPrefix(templatePrefix, sectionIds);
                const colIds = new Set();
                sections.push({ id: secId, name: '未命名', definition: '', deleteRule: '', insertRule: '', updateRule: '', fillable: true, sendable: true, columns: [{ id: createColumnIdForSection(secId, colIds), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }] });
              }
              return { title, templatePrefix, sections };
            };

            const templateToSchemaMarkdown = (tpl) => {
              const title = (tpl?.title || '记忆表格').toString().trim() || '记忆表格';
              const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
              const blocks = sections.map((sec) => {
                const name = (sec?.name || '未命名').toString().trim() || '未命名';
                const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c?.name ?? '').toString().trim() || '-') : [];
                const safeCols = cols.length ? cols : ['-'];
                const headerRow = `| ${safeCols.join(' | ')} |`;
                const sepRow = `| ${safeCols.map(() => '---').join(' | ')} |`;
                return `## ${name}\n${headerRow}\n${sepRow}`;
              }).filter(Boolean).join('\n\n');
              const content = `# ${title}\n\n${blocks}`.trim();
              const jsonMeta = `<WTL_Template type="json">${JSON.stringify(tpl || {}, null, 2)}</WTL_Template>`;
              return `${wrapTable(content)}\n\n${jsonMeta}`;
            };

            const updateSchemaPreview = () => {
              if (!schemaEl) return;
              schemaEl.value = buildTemplatePrompt(templateState) || schemaSource || templateToSchemaMarkdown(templateState);
            };

            const saveTemplateState = () => {
              if (!schemaEl || !schemaModeEl) return;
              const md = templateToSchemaMarkdown(templateState);
              schemaSource = md;
              schemaEl.value = buildTemplatePrompt(templateState) || md;
              saveSchemaForMode(schemaModeEl.value, md);
              saveState();
              refreshPromptPreview(true);
            };

            const setActiveTemplateSection = (sectionId) => {
              templateActiveSectionId = sectionId || '';
              if (sectionListEl) {
                sectionListEl.querySelectorAll('.wtl-editor-item').forEach((el) => {
                  el.classList.toggle('active', el.dataset.id === templateActiveSectionId);
                });
              }
              renderTemplateColumns();
            };

            const openTemplateDialog = (title, target, init = {}) => {
              if (!editorOverlayEl || !editorDialogNameEl || !editorDialogTitleEl) return;
              templateDialogTarget = target;
              editorDialogTitleEl.textContent = title || '编辑';
              editorDialogNameEl.value = init.name || '';
              if (editorDialogDefEl) editorDialogDefEl.value = init.definition || '';
              if (editorDialogDelEl) editorDialogDelEl.value = init.deleteRule || '';
              if (editorDialogAddEl) editorDialogAddEl.value = init.insertRule || '';
              if (editorDialogEditEl) editorDialogEditEl.value = init.updateRule || '';
              if (editorDialogFillEl) editorDialogFillEl.checked = init.fillable !== false;
              if (editorDialogSendEl) editorDialogSendEl.checked = init.sendable !== false;

              const isColumn = target?.type === 'column';
              const applyRuleToggle = (enabledEl, textareaEl, rowEl, toggleEl, enabled) => {
                if (enabledEl) enabledEl.checked = Boolean(enabled);
                if (toggleEl) toggleEl.style.display = isColumn ? 'flex' : 'none';
                if (rowEl && textareaEl) {
                  const show = isColumn ? Boolean(enabled) : true;
                  textareaEl.style.display = show ? 'block' : 'none';
                  textareaEl.disabled = isColumn ? !show : false;
                }
              };

              applyRuleToggle(editorDialogInsertEnabledEl, editorDialogAddEl, editorDialogInsertRowEl, editorDialogInsertToggleEl, (init.insertRule || '').trim().length > 0);
              applyRuleToggle(editorDialogUpdateEnabledEl, editorDialogEditEl, editorDialogUpdateRowEl, editorDialogUpdateToggleEl, (init.updateRule || '').trim().length > 0);
              applyRuleToggle(editorDialogDeleteEnabledEl, editorDialogDelEl, editorDialogDeleteRowEl, editorDialogDeleteToggleEl, (init.deleteRule || '').trim().length > 0);

              if (editorDialogFillRowEl) {
                editorDialogFillRowEl.style.display = target?.type === 'section' ? 'flex' : 'none';
              }
              if (editorDialogSendRowEl) {
                editorDialogSendRowEl.style.display = target?.type === 'section' ? 'flex' : 'none';
              }
              if (editorOverlayEl.parentElement !== document.body) {
                document.body.appendChild(editorOverlayEl);
              }
              editorOverlayEl.style.display = 'flex';
              editorDialogNameEl.focus();
            };

            const closeTemplateDialog = () => {
              templateDialogTarget = null;
              if (editorOverlayEl) editorOverlayEl.style.display = 'none';
            };

            const renderTemplateSections = () => {
              if (!sectionListEl) return;
              sectionListEl.innerHTML = '';
              templateState.sections.forEach((sec) => {
                const item = document.createElement('div');
                item.className = 'wtl-editor-item';
                item.dataset.id = sec.id;
                item.draggable = true;

                const title = document.createElement('div');
                title.className = 'wtl-editor-title';
                title.textContent = sec.name || '未命名';

                const hint = document.createElement('div');
                hint.className = 'wtl-editor-hint';
                hint.textContent = sec.definition || '';

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.flexDirection = 'column';
                left.appendChild(title);
                left.appendChild(hint);

                const actions = document.createElement('div');
                actions.className = 'wtl-editor-actions';

                const editBtn = document.createElement('button');
                editBtn.className = 'wtl-icon-btn';
                editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                editBtn.title = '编辑章节';

                const delBtn = document.createElement('button');
                delBtn.className = 'wtl-icon-btn';
                delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                delBtn.title = '删除章节';

                actions.appendChild(editBtn);
                actions.appendChild(delBtn);

                item.appendChild(left);
                item.appendChild(actions);

                item.addEventListener('click', (e) => {
                  if (e.target?.closest('.wtl-icon-btn')) return;
                  setActiveTemplateSection(sec.id);
                });
                editBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  openTemplateDialog('编辑表格', { type: 'section', id: sec.id }, {
                    name: sec.name,
                    definition: sec.definition,
                    deleteRule: sec.deleteRule,
                    insertRule: sec.insertRule,
                    updateRule: sec.updateRule,
                    fillable: sec.fillable !== false,
                    sendable: sec.sendable !== false
                  });
                });
                delBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const name = sec.name || '未命名';
                  const content = `确认删除页签：${name}\n\n删除后将移除模板章节与表格内容。`;
                  const confirmBtn = makeModalSaveButton('确认删除', () => {
                    templateState.sections = templateState.sections.filter(s => s.id !== sec.id);
                    if (templateActiveSectionId === sec.id) {
                      templateActiveSectionId = templateState.sections[0]?.id || '';
                    }
                    const next = (tableMdEl?.value || '').split('\n');
                    let inTarget = false;
                    const out = [];
                    for (const line of next) {
                      const match = /^##\s+(.+)$/.exec(line.trim());
                      if (match) {
                        inTarget = match[1].trim() === name;
                        if (!inTarget) out.push(line);
                        continue;
                      }
                      if (!inTarget) out.push(line);
                    }
                    const merged = out.join('\n').trim();
                    const finalMd = merged || templateToSchemaMarkdown({ title: templateState.title, sections: templateState.sections });
                    if (tableMdEl) tableMdEl.value = finalMd;
                    renderPreview(finalMd);
                    renderTemplateSections();
                    renderTemplateColumns();
                    updateSchemaPreview();
                    refreshPromptPreview(true);
                  });
                  openConfirmModal('删除页签', content, [confirmBtn]);
                });

                sectionListEl.appendChild(item);
              });
              if (!templateActiveSectionId && templateState.sections[0]) {
                setActiveTemplateSection(templateState.sections[0].id);
              } else {
                setActiveTemplateSection(templateActiveSectionId);
              }
            };

            const renderTemplateColumns = () => {
              if (!columnListEl) return;
              columnListEl.innerHTML = '';
              const sec = templateState.sections.find(s => s.id === templateActiveSectionId) || templateState.sections[0];
              if (!sec) return;
              sec.columns = Array.isArray(sec.columns) ? sec.columns : [];
              sec.columns.forEach((col) => {
                const item = document.createElement('div');
                item.className = 'wtl-editor-item';
                item.dataset.id = col.id;
                item.draggable = true;

                const title = document.createElement('div');
                title.className = 'wtl-editor-title';
                title.textContent = col.name || '未命名';

                const hint = document.createElement('div');
                hint.className = 'wtl-editor-hint';
                hint.textContent = col.definition || '';

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.flexDirection = 'column';
                left.appendChild(title);
                left.appendChild(hint);

                const actions = document.createElement('div');
                actions.className = 'wtl-editor-actions';

                const editBtn = document.createElement('button');
                editBtn.className = 'wtl-icon-btn';
                editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                editBtn.title = '编辑列';

                const delBtn = document.createElement('button');
                delBtn.className = 'wtl-icon-btn';
                delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                delBtn.title = '删除列';

                actions.appendChild(editBtn);
                actions.appendChild(delBtn);

                item.appendChild(left);
                item.appendChild(actions);

                item.addEventListener('click', (e) => {
                  if (e.target?.closest('.wtl-icon-btn')) return;
                  openTemplateDialog('编辑列', { type: 'column', id: col.id, sectionId: sec.id }, {
                    name: col.name,
                    definition: col.definition,
                    deleteRule: col.deleteRule,
                    insertRule: col.insertRule,
                    updateRule: col.updateRule,
                    fillable: true
                  });
                });
                editBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  openTemplateDialog('编辑列', { type: 'column', id: col.id, sectionId: sec.id }, {
                    name: col.name,
                    definition: col.definition,
                    deleteRule: col.deleteRule,
                    insertRule: col.insertRule,
                    updateRule: col.updateRule,
                    fillable: true
                  });
                });
                delBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const colName = col.name || '未命名';
                  const content = `确认删除列：${colName}\n\n删除后将移除模板列与表格列数据。`;
                  const confirmBtn = makeModalSaveButton('确认删除', () => {
                    sec.columns = sec.columns.filter(c => c.id !== col.id);
                    const sections = parseSections(tableMdEl?.value || '');
                    const nextSections = sections.map((s) => {
                      if (s.name !== (sec?.name || '')) return s;
                      const headerIndex = s.header.indexOf(col.name);
                      const header = s.header.filter(h => h !== col.name);
                      const rows = s.rows.map(r => r.filter((_, idx) => idx !== headerIndex));
                      return { ...s, header, rows };
                    });
                    const markdown = renderJsonToMarkdown({
                      title: parseMarkdownTableToJson(tableMdEl?.value || '').title,
                      sections: nextSections.map(s => ({ name: s.name, columns: s.header, rows: s.rows }))
                    });
                    if (tableMdEl) tableMdEl.value = markdown;
                    renderPreview(markdown);
                    renderTemplateColumns();
                    updateSchemaPreview();
                    refreshPromptPreview(true);
                  });
                  openConfirmModal('删除列', content, [confirmBtn]);
                });

                columnListEl.appendChild(item);
              });
            };

            const reorderTemplateItems = (list, draggedId, afterId) => {
              const idx = list.findIndex(i => i.id === draggedId);
              if (idx < 0) return list;
              const item = list.splice(idx, 1)[0];
              if (!afterId) {
                list.push(item);
                return list;
              }
              const afterIndex = list.findIndex(i => i.id === afterId);
              if (afterIndex < 0) {
                list.push(item);
                return list;
              }
              list.splice(afterIndex, 0, item);
              return list;
            };

            const bindTemplateDrag = (container, onDrop) => {
              if (!container) return;
              let dragged = null;
              container.addEventListener('dragstart', (e) => {
                const target = e.target;
                if (target && target.classList.contains('wtl-editor-item')) {
                  dragged = target;
                  target.classList.add('dragging');
                }
              });
              container.addEventListener('dragend', () => {
                if (dragged) dragged.classList.remove('dragging');
                dragged = null;
              });
              container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!dragged) return;
                const items = Array.from(container.querySelectorAll('.wtl-editor-item:not(.dragging)'));
                const after = items.find((el) => {
                  const rect = el.getBoundingClientRect();
                  return e.clientY < rect.top + rect.height / 2;
                });
                if (after) container.insertBefore(dragged, after);
                else container.appendChild(dragged);
              });
              container.addEventListener('drop', () => {
                if (!dragged) return;
                const ordered = Array.from(container.querySelectorAll('.wtl-editor-item')).map(el => el.dataset.id).filter(Boolean);
                onDrop(ordered);
              });
            };

            const showTemplateEditor = () => {
              if (templateEditorEl) templateEditorEl.style.display = 'block';
              templateState = parseSchemaToTemplate(schemaSource || schemaEl?.value || '');
              if (!templateState.sections.length) {
                const sectionId = createSectionIdInTemplate(templateState);
                templateState.sections.push({
                  id: sectionId,
                  name: '未命名',
                  definition: '',
                  deleteRule: '',
                  insertRule: '',
                  updateRule: '',
                  fillable: true,
                  sendable: true,
                  columns: [{ id: createColumnIdForSection(sectionId, new Set()), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }]
                });
              }
              templateActiveSectionId = templateState.sections[0]?.id || '';
              renderTemplateSections();
              renderTemplateColumns();
            };

            const hideTemplateEditor = () => {
              if (templateEditorEl) templateEditorEl.style.display = 'none';
            };

            const saveTableForChat = async (tableMd) => {
              const metadata = getChatMetadata();
              const ctx = window.SillyTavern?.getContext?.();
              const wrapped = wrapTable(tableMd);
              const tableJson = parseMarkdownTableToJson(wrapped);
              tableJson.hiddenRows = hiddenRows || {};
              appendHistory(tableJson, wrapped);
              if (metadata && typeof metadata === 'object') {
                metadata.WorldTreeLibrary = { ...(metadata.WorldTreeLibrary || {}), tableJson, table: wrapped };
                if (window.ST_API?.chatHistory?.update) {
                  try {
                    const payload = { metadata };
                    if (ctx?.chatId) payload.chatId = ctx.chatId;
                    if (ctx?.chat?.id) payload.id = ctx.chat.id;
                    if (ctx?.chat?.file) payload.file = ctx.chat.file;
                    await window.ST_API.chatHistory.update(payload);
                    return;
                  } catch (e) {
                    console.warn('[WorldTreeLibrary] chat metadata update failed, fallback localStorage', e);
                  }
                }
              }
              const chatKey = getChatKey();
              localStorage.setItem(`wtl.tableJson.${chatKey}`, JSON.stringify(tableJson));
              localStorage.setItem(`wtl.table.${chatKey}`, wrapped);
            };

            const getSchemaStorageKey = (mode) => {
              if (mode === 'character') {
                const name = getCharacterName() || 'unknown';
                return `wtl.schema.character.${name}`;
              }
              return 'wtl.schema';
            };

            const loadSchemaForMode = (mode) => {
              const key = getSchemaStorageKey(mode);
              return localStorage.getItem(key) || getSchemaPreset() || '';
            };

            const saveSchemaForMode = (mode, schemaValue) => {
              const key = getSchemaStorageKey(mode);
              localStorage.setItem(key, schemaValue);
            };

            const setAutoUi = (enabled) => {
              if (!autoToggleBtn) return;
              autoToggleBtn.dataset.active = enabled ? 'true' : 'false';
              const label = enabled ? '自动填表：开' : '自动填表：关';
              const span = autoToggleBtn.querySelector('span');
              if (span) span.textContent = label;
              const icon = autoToggleBtn.querySelector('i');
              if (icon) icon.className = enabled ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            };

            const setTableInjectUi = (enabled) => {
              if (!tableInjectToggleBtn) return;
              tableInjectToggleBtn.checked = Boolean(enabled);
            };

            const setDepthOnlyWhenFixed = (posEl, depthEl) => {
              if (!posEl || !depthEl) return;
              const isFixed = (posEl.value || '') === 'fixed';
              depthEl.disabled = !isFixed;
              depthEl.title = isFixed ? '' : '仅固定深度时生效';
            };

            const loadState = async () => {
              const table = await loadTableForChat();
              appendHistory(parseMarkdownTableToJson(table), table);
              const schemaMode = localStorage.getItem('wtl.schemaMode') || defaults.schemaMode;
              const presetSchemaActive = localStorage.getItem('wtl.schema.presetActive') || '默认';
              const presetOrderActive = localStorage.getItem('wtl.order.presetActive') || '默认';
              const presetRefOrderActive = localStorage.getItem('wtl.refOrder.presetActive') || '默认';
              const presetBlocksActive = localStorage.getItem('wtl.blocks.presetActive') || '默认';
              const presetRefBlocksActive = localStorage.getItem('wtl.refBlocks.presetActive') || '默认';

              const schemaPreset = getDefaultSchemaText();
              const orderPreset = (safeParseJson(localStorage.getItem('wtl.order.presets')) || {})[presetOrderActive];
              const refOrderPreset = (safeParseJson(localStorage.getItem('wtl.refOrder.presets')) || {})[presetRefOrderActive];
              const blocksPreset = (safeParseJson(localStorage.getItem('wtl.blocks.presets')) || {})[presetBlocksActive];
              const refBlocksPreset = (safeParseJson(localStorage.getItem('wtl.refBlocks.presets')) || {})[presetRefBlocksActive];

              const resolvedSchema = resolveSchemaByScope();
              const schema = resolvedSchema?.text || loadSchemaForMode(schemaMode) || schemaPreset;
              schemaSource = schema;
              templateState = parseSchemaToTemplate(schemaSource);
              templateActiveSectionId = templateState.sections[0]?.id || '';
              const blockOrder = JSON.parse(localStorage.getItem('wtl.blockOrder') || 'null') || blocksPreset || getBlocksPreset() || [];
              const refBlockOrder = JSON.parse(localStorage.getItem('wtl.refBlockOrder') || 'null') || refBlocksPreset || getRefBlocksPreset() || [];
              const wbReadMode = localStorage.getItem('wtl.wbReadMode') || defaults.wbReadMode;
              const wbManual = localStorage.getItem('wtl.wbManual') || defaults.wbManual;
              const entry = localStorage.getItem('wtl.entry') || defaults.entry;
              const preprompt = localStorage.getItem('wtl.preprompt') || getDefaultPromptText('preprompt', PREPROMPT_PRESET_KEY, PREPROMPT_PRESET_ACTIVE_KEY);
              const instruction = localStorage.getItem('wtl.instruction') || getDefaultPromptText('instruction', INSTRUCTION_PRESET_KEY, INSTRUCTION_PRESET_ACTIVE_KEY);
              const sendMode = localStorage.getItem('wtl.sendMode') || defaults.sendMode;
              const openaiUrl = localStorage.getItem('wtl.openaiUrl') || defaults.openaiUrl;
              const openaiKey = localStorage.getItem('wtl.openaiKey') || defaults.openaiKey;
              const openaiModel = localStorage.getItem('wtl.openaiModel') || defaults.openaiModel;
              const openaiTemp = localStorage.getItem('wtl.openaiTemp') || defaults.openaiTemp;
              const openaiMax = localStorage.getItem('wtl.openaiMax') || defaults.openaiMax;
 
              const autoFillEnabled = (localStorage.getItem('wtl.autoFillEnabled') || 'false') === 'true';
              const autoFillFloors = localStorage.getItem('wtl.autoFillFloors') || '12';
              const autoFillEvery = localStorage.getItem('wtl.autoFillEvery') || '1';
 
              const tablePos = localStorage.getItem('wtl.tablePos') || defaults.tablePos;
              const tableRole = localStorage.getItem('wtl.tableRole') || defaults.tableRole;
              const tableDepth = localStorage.getItem('wtl.tableDepth') || defaults.tableDepth;
              const tableOrder = localStorage.getItem('wtl.tableOrder') || defaults.tableOrder;
              const tableInjectEnabled = localStorage.getItem('wtl.tableInjectEnabled') || defaults.tableInjectEnabled;

              const instInjectEnabled = localStorage.getItem('wtl.instInjectEnabled') || defaults.instInjectEnabled;
              const instPos = localStorage.getItem('wtl.instPos') || defaults.instPos;
              const instRole = localStorage.getItem('wtl.instRole') || defaults.instRole;
              const instDepth = localStorage.getItem('wtl.instDepth') || defaults.instDepth;
              const instOrder = localStorage.getItem('wtl.instOrder') || defaults.instOrder;

              const schemaInjectEnabled = localStorage.getItem('wtl.schemaInjectEnabled') || defaults.schemaInjectEnabled;
              const schemaPos = localStorage.getItem('wtl.schemaPos') || defaults.schemaPos;
              const schemaRole = localStorage.getItem('wtl.schemaRole') || defaults.schemaRole;
              const schemaDepth = localStorage.getItem('wtl.schemaDepth') || defaults.schemaDepth;
              const schemaOrder = localStorage.getItem('wtl.schemaOrder') || defaults.schemaOrder;

              if (tableMdEl) tableMdEl.value = table;
              if (schemaEl) schemaEl.value = buildTemplatePrompt(templateState) || schema;
              if (schemaModeEl) schemaModeEl.value = schemaMode;
              if (wbModeEl) wbModeEl.value = wbReadMode;
              if (wbManualEl) wbManualEl.value = wbManual;
              if (wbManualWrapEl) wbManualWrapEl.style.display = wbReadMode === 'manual' ? 'block' : 'none';
              if (wbReadMode === 'manual') {
                const current = getManualConfig();
                renderManualWorldBookUI(current);
              }
              if (entryEl) entryEl.value = entry;
              if (prePromptEl) prePromptEl.value = preprompt;
              if (instructionEl) instructionEl.value = instruction;
              if (sendModeEl) sendModeEl.value = sendMode;

              const prepromptPresets = getPromptPresets(PREPROMPT_PRESET_KEY);
              const instructionPresets = getPromptPresets(INSTRUCTION_PRESET_KEY);
              refreshPromptPresetSelect(prepromptPresetEl, prepromptPresets);
              refreshPromptPresetSelect(instructionPresetEl, instructionPresets);
              const prepromptActive = localStorage.getItem(PREPROMPT_PRESET_ACTIVE_KEY) || '';
              const instructionActive = localStorage.getItem(INSTRUCTION_PRESET_ACTIVE_KEY) || '';
              if (prepromptPresetEl && prepromptActive) prepromptPresetEl.value = prepromptActive;
              if (instructionPresetEl && instructionActive) instructionPresetEl.value = instructionActive;
              if (prepromptPresetNameEl && prepromptActive) prepromptPresetNameEl.value = prepromptActive;
              if (instructionPresetNameEl && instructionActive) instructionPresetNameEl.value = instructionActive;

              const schemaPresets = getSchemaPresets();
              refreshSchemaPresetSelect(schemaPresetEl, schemaPresets);
              const effective = resolvedSchema || { scope: 'global', name: presetSchemaActive, text: schema };
              if (schemaPresetEl && effective?.name) schemaPresetEl.value = effective.name;
              if (schemaPresetNameEl) schemaPresetNameEl.value = effective?.name || '';
              if (schemaEffectiveEl) {
                const scopeLabel = getSchemaScopeLabel(effective?.scope || 'global');
                schemaEffectiveEl.textContent = `${scopeLabel} · ${effective?.name || '默认'}`;
              }

              const chatName = getChatDisplayName();
              const characterName = getCharacterDisplayName();
              if (schemaBindChatNameEl) schemaBindChatNameEl.textContent = chatName || '';
              if (schemaBindCharacterNameEl) schemaBindCharacterNameEl.textContent = characterName || '';
              updateSchemaBindRadios(getSchemaScope());

              refreshOpenAIPresetSelect();
              if (openaiUrlEl) openaiUrlEl.value = openaiUrl;
              if (openaiKeyEl) openaiKeyEl.value = openaiKey;
              if (openaiModelEl && openaiModel) {
                openaiModelEl.innerHTML = `<option value="${openaiModel}">${openaiModel}</option>`;
                openaiModelEl.value = openaiModel;
              }
              if (openaiTempEl) openaiTempEl.value = openaiTemp;
              if (openaiMaxEl) openaiMaxEl.value = openaiMax;

              setAutoUi(autoFillEnabled);
              if (autoFloorsEl) autoFloorsEl.value = autoFillFloors;
              if (autoEveryEl) autoEveryEl.value = autoFillEvery;

              if (tablePreviewEl) tablePreviewEl.value = getTablePreviewForSend(table);

              if (tablePosEl) tablePosEl.value = tablePos;
              if (tableRoleEl) tableRoleEl.value = tableRole;
              if (tableDepthEl) tableDepthEl.value = tableDepth;
              if (tableOrderEl) tableOrderEl.value = tableOrder;
              setTableInjectUi(tableInjectEnabled === 'true');
              setDepthOnlyWhenFixed(tablePosEl, tableDepthEl);

              if (instInjectToggleEl) instInjectToggleEl.checked = instInjectEnabled === 'true';
              if (instPosEl) instPosEl.value = instPos;
              if (instRoleEl) instRoleEl.value = instRole;
              if (instDepthEl) instDepthEl.value = instDepth;
              if (instOrderEl) instOrderEl.value = instOrder;
              setDepthOnlyWhenFixed(instPosEl, instDepthEl);

              if (schemaInjectToggleEl) schemaInjectToggleEl.checked = schemaInjectEnabled === 'true';
              if (schemaPosEl) schemaPosEl.value = schemaPos;
              if (schemaRoleEl) schemaRoleEl.value = schemaRole;
              if (schemaDepthEl) schemaDepthEl.value = schemaDepth;
              if (schemaOrderEl) schemaOrderEl.value = schemaOrder;
              setDepthOnlyWhenFixed(schemaPosEl, schemaDepthEl);

              if (blockListEl) {
                renderBlockList(blockOrder);
              }
              if (refBlockListEl) {
                renderRefBlockList(refBlockOrder);
              }

              if (stModeEl) stModeEl.style.display = sendMode === 'st' ? 'block' : 'none';
              if (externalEl) externalEl.style.display = sendMode === 'external' ? 'block' : 'none';
              if (instBlockEl) instBlockEl.style.display = sendMode === 'st' ? 'block' : 'none';
              if (schemaBlockEl) schemaBlockEl.style.display = sendMode === 'st' ? 'block' : 'none';

              if (templateEditorEl) templateEditorEl.style.display = 'none';
              templateState = parseSchemaToTemplate(schema);
              templateActiveSectionId = templateState.sections[0]?.id || '';

              renderPreview(table);
            };

            const saveState = async () => {
              if (tableMdEl) await saveTableForChat(ensureTableWrapper(tableMdEl.value));
              if (schemaModeEl) saveSchemaForMode(schemaModeEl.value, schemaSource || schemaEl?.value || '');
              if (schemaModeEl) localStorage.setItem('wtl.schemaMode', schemaModeEl.value);
              if (wbModeEl) localStorage.setItem('wtl.wbReadMode', wbModeEl.value);
              if (wbManualEl) localStorage.setItem('wtl.wbManual', wbManualEl.value);
              if (entryEl) localStorage.setItem('wtl.entry', entryEl.value);
              if (prePromptEl) localStorage.setItem('wtl.preprompt', prePromptEl.value);
              if (instructionEl) localStorage.setItem('wtl.instruction', instructionEl.value);
              if (sendModeEl) localStorage.setItem('wtl.sendMode', sendModeEl.value);

              if (autoToggleBtn) localStorage.setItem('wtl.autoFillEnabled', autoToggleBtn.dataset.active === 'true' ? 'true' : 'false');
              if (tableInjectToggleBtn) localStorage.setItem('wtl.tableInjectEnabled', tableInjectToggleBtn.checked ? 'true' : 'false');
              if (instInjectToggleEl) localStorage.setItem('wtl.instInjectEnabled', instInjectToggleEl.checked ? 'true' : 'false');
              if (schemaInjectToggleEl) localStorage.setItem('wtl.schemaInjectEnabled', schemaInjectToggleEl.checked ? 'true' : 'false');
              if (autoFloorsEl) localStorage.setItem('wtl.autoFillFloors', autoFloorsEl.value || '');
              if (autoEveryEl) localStorage.setItem('wtl.autoFillEvery', autoEveryEl.value || '');
 
              if (openaiUrlEl) localStorage.setItem('wtl.openaiUrl', openaiUrlEl.value);
              if (openaiKeyEl) localStorage.setItem('wtl.openaiKey', openaiKeyEl.value);
              if (openaiModelEl) localStorage.setItem('wtl.openaiModel', openaiModelEl.value);
              if (openaiTempEl) localStorage.setItem('wtl.openaiTemp', openaiTempEl.value);
              if (openaiMaxEl) localStorage.setItem('wtl.openaiMax', openaiMaxEl.value);

              if (tablePosEl) localStorage.setItem('wtl.tablePos', tablePosEl.value);
              if (tableRoleEl) localStorage.setItem('wtl.tableRole', tableRoleEl.value);
              if (tableDepthEl) localStorage.setItem('wtl.tableDepth', tableDepthEl.value);
              if (tableOrderEl) localStorage.setItem('wtl.tableOrder', tableOrderEl.value);

              if (instPosEl) localStorage.setItem('wtl.instPos', instPosEl.value);
              if (instRoleEl) localStorage.setItem('wtl.instRole', instRoleEl.value);
              if (instDepthEl) localStorage.setItem('wtl.instDepth', instDepthEl.value);
              if (instOrderEl) localStorage.setItem('wtl.instOrder', instOrderEl.value);

              if (schemaPosEl) localStorage.setItem('wtl.schemaPos', schemaPosEl.value);
              if (schemaRoleEl) localStorage.setItem('wtl.schemaRole', schemaRoleEl.value);
              if (schemaDepthEl) localStorage.setItem('wtl.schemaDepth', schemaDepthEl.value);
              if (schemaOrderEl) localStorage.setItem('wtl.schemaOrder', schemaOrderEl.value);

              if (blockListEl) {
                const blocks = Array.from(blockListEl.querySelectorAll('.wtl-block')).map((el) => ({
                  id: el.dataset.id,
                  label: el.dataset.label,
                  type: el.dataset.type,
                  field: el.dataset.field || undefined,
                  position: el.dataset.position || undefined,
                  hidden: el.dataset.hidden === 'true',
                  content: el.dataset.content || undefined,
                  prefix: el.dataset.prefix || undefined,
                  suffix: el.dataset.suffix || undefined,
                  usePrefix: el.dataset.usePrefix || undefined,
                  useSuffix: el.dataset.useSuffix || undefined
                }));
                localStorage.setItem('wtl.blockOrder', JSON.stringify(blocks));
              }
              if (refBlockListEl) {
                const blocks = Array.from(refBlockListEl.querySelectorAll('.wtl-block')).map((el) => ({
                  id: el.dataset.id,
                  label: el.dataset.label,
                  type: el.dataset.type,
                  field: el.dataset.field || undefined,
                  position: el.dataset.position || undefined,
                  hidden: el.dataset.hidden === 'true',
                  prefix: el.dataset.prefix || undefined,
                  suffix: el.dataset.suffix || undefined,
                  usePrefix: el.dataset.usePrefix || undefined,
                  useSuffix: el.dataset.useSuffix || undefined
                }));
                localStorage.setItem('wtl.refBlockOrder', JSON.stringify(blocks));
              }
            };

            const setStatus = (msg) => {
              if (statusEl) statusEl.textContent = `状态：${msg}`;
              console.log('[WorldTreeLibrary]', msg);
            };

            const normalizeBlocks = (blocks) => {
              const base = (getBlocksPreset() || []).map(b => ({ ...b }));
              const incoming = Array.isArray(blocks) ? blocks : [];
              const map = new Map(base.map(b => [b.id, b]));
              incoming.forEach((b) => {
                if (!b?.id) return;
                if (map.has(b.id)) {
                  const current = map.get(b.id);
                  map.set(b.id, { ...current, ...b });
                } else if (b.type === 'custom') {
                  map.set(b.id, { ...b, hidden: Boolean(b.hidden) });
                }
              });
              const used = new Set(incoming.map(b => b.id));
              const merged = [];
              incoming.forEach((b) => {
                const item = map.get(b.id);
                if (item) merged.push(item);
              });
              base.forEach((b) => {
                if (!used.has(b.id)) merged.push(b);
              });
              return merged.map((b) => {
                if (b.type === 'custom' && typeof b.content !== 'string') return { ...b, content: '' };
                return b;
              });
            };

            const normalizeRefBlocks = (blocks) => {
              const base = (getRefBlocksPreset() || []).map(b => ({ ...b }));
              const incomingRaw = Array.isArray(blocks) ? blocks : [];
              const incoming = incomingRaw.map((b) => {
                if (!b?.id) return b;
                if (b.id.startsWith('ref_') && !b.id.startsWith('ref_custom_')) return { ...b, id: b.id.replace(/^ref_/, '') };
                return b;
              }).filter((b) => b?.id && b.id !== 'chat');
              const map = new Map(base.map(b => [b.id, b]));
              incoming.forEach((b) => {
                if (!b?.id) return;
                if (map.has(b.id)) {
                  const current = map.get(b.id);
                  map.set(b.id, { ...current, ...b });
                } else {
                  map.set(b.id, { ...b, hidden: Boolean(b.hidden) });
                }
              });
              const used = new Set(incoming.map(b => b.id));
              const merged = [];
              incoming.forEach((b) => {
                const item = map.get(b.id);
                if (item) merged.push(item);
              });
              base.forEach((b) => {
                if (!used.has(b.id)) merged.push(b);
              });
              return merged;
            };

            const buildBlockLabel = (block) => block.label || block.id || '未知块';
            const ensureWrapperFlag = (value, fallback = false) => {
              if (value === 'true') return true;
              if (value === 'false') return false;
              return fallback;
            };

            const renderRefBlockList = (blocks) => {
              if (!refBlockListEl) return;
              const merged = normalizeRefBlocks(blocks);
              refBlockListEl.innerHTML = '';
              merged.forEach((block) => {
                const item = document.createElement('div');
                item.className = 'wtl-block';
                if (block.hidden) item.classList.add('is-hidden');
                item.setAttribute('draggable', 'true');
                item.dataset.id = block.id;
                item.dataset.label = block.label || block.id;
                item.dataset.type = block.type || '';
                if (block.field) item.dataset.field = block.field;
                if (block.position) item.dataset.position = block.position;
                item.dataset.hidden = block.hidden ? 'true' : 'false';
                item.dataset.prefix = block.prefix || '';
                item.dataset.suffix = block.suffix || '';
                item.dataset.usePrefix = ensureWrapperFlag(block.usePrefix, Boolean(block.prefix)) ? 'true' : 'false';
                item.dataset.useSuffix = ensureWrapperFlag(block.useSuffix, Boolean(block.suffix)) ? 'true' : 'false';

                const label = document.createElement('div');
                label.className = 'wtl-block-label';
                label.textContent = buildBlockLabel(block);

                const actions = document.createElement('div');
                actions.className = 'wtl-block-actions';

                const previewBtn = document.createElement('button');
                previewBtn.className = 'wtl-icon-btn';
                previewBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                previewBtn.title = '预览';

                const editBtn = document.createElement('button');
                editBtn.className = 'wtl-icon-btn';
                editBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
                editBtn.title = '编辑前缀/后缀';

                const editContentBtn = document.createElement('button');
                editContentBtn.className = 'wtl-icon-btn';
                editContentBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                editContentBtn.title = '编辑内容';

                const hideBtn = document.createElement('button');
                hideBtn.className = 'wtl-icon-btn';
                hideBtn.innerHTML = '<i class="fa-solid fa-ghost"></i>';
                hideBtn.title = '隐藏/显示';

                actions.appendChild(previewBtn);
                actions.appendChild(editBtn);
                if (block.type === 'custom') actions.appendChild(editContentBtn);
                actions.appendChild(hideBtn);

                item.appendChild(label);
                item.appendChild(actions);

                previewBtn.addEventListener('click', async () => {
                  await openBlockPreview(block, item);
                });

                editBtn.addEventListener('click', () => {
                  openBlockWrapperEdit(block, item);
                });

                editContentBtn.addEventListener('click', () => {
                  openBlockEdit(block);
                });

                hideBtn.addEventListener('click', () => {
                  const nextHidden = item.dataset.hidden !== 'true';
                  item.dataset.hidden = nextHidden ? 'true' : 'false';
                  item.classList.toggle('is-hidden', nextHidden);
                  saveState();
                  refreshPromptPreview(true);
                });

                refBlockListEl.appendChild(item);
              });
            };

            const renderBlockList = (blocks) => {
              if (!blockListEl) return;
              const merged = normalizeBlocks(blocks);
              blockListEl.innerHTML = '';
              merged.forEach((block) => {
                const item = document.createElement('div');
                item.className = 'wtl-block';
                if (block.hidden) item.classList.add('is-hidden');
                item.setAttribute('draggable', 'true');
                item.dataset.id = block.id;
                item.dataset.label = block.label || block.id;
                item.dataset.type = block.type || '';
                if (block.field) item.dataset.field = block.field;
                if (block.position) item.dataset.position = block.position;
                item.dataset.hidden = block.hidden ? 'true' : 'false';
                item.dataset.prefix = block.prefix || '';
                item.dataset.suffix = block.suffix || '';
                item.dataset.usePrefix = ensureWrapperFlag(block.usePrefix, Boolean(block.prefix)) ? 'true' : 'false';
                item.dataset.useSuffix = ensureWrapperFlag(block.useSuffix, Boolean(block.suffix)) ? 'true' : 'false';
                if (block.type === 'custom') item.dataset.content = block.content || '';

                const label = document.createElement('div');
                label.className = 'wtl-block-label';
                label.textContent = buildBlockLabel(block);

                const actions = document.createElement('div');
                actions.className = 'wtl-block-actions';

                const previewBtn = document.createElement('button');
                previewBtn.className = 'wtl-icon-btn';
                previewBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                previewBtn.title = '预览';

                const editBtn = document.createElement('button');
                editBtn.className = 'wtl-icon-btn';
                editBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
                editBtn.title = '编辑前缀/后缀';

                const hideBtn = document.createElement('button');
                hideBtn.className = 'wtl-icon-btn';
                hideBtn.innerHTML = '<i class="fa-solid fa-ghost"></i>';
                hideBtn.title = '隐藏/显示';

                const delBtn = document.createElement('button');
                delBtn.className = 'wtl-icon-btn';
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.title = '删除';

                const canDelete = block.type === 'custom';

                actions.appendChild(previewBtn);
                actions.appendChild(editBtn);
                actions.appendChild(hideBtn);
                if (canDelete) actions.appendChild(delBtn);

                item.appendChild(label);
                item.appendChild(actions);

                previewBtn.addEventListener('click', async () => {
                  await openBlockPreview(block, item);
                });

                editBtn.addEventListener('click', () => {
                  openBlockWrapperEdit(block, item);
                });

                hideBtn.addEventListener('click', () => {
                  const nextHidden = item.dataset.hidden !== 'true';
                  item.dataset.hidden = nextHidden ? 'true' : 'false';
                  item.classList.toggle('is-hidden', nextHidden);
                  saveState();
                  refreshPromptPreview(true);
                });

                delBtn.addEventListener('click', () => {
                  if (!canDelete) return;
                  item.remove();
                  saveState();
                  refreshPromptPreview(true);
                });

                blockListEl.appendChild(item);
              });
            };

            const openModal = (title, content, actions = [], customBuilder = null, options = {}) => {
              if (!modalEl || !modalTitleEl || !modalContentEl || !modalActionsEl) return;
              const { hideContent = false, readOnly = false } = options || {};
              modalTitleEl.textContent = title || '';
              modalContentEl.value = content || '';
              modalContentEl.readOnly = readOnly === true ? true : false;
              modalContentEl.style.display = hideContent ? 'none' : 'block';
              if (modalCustomEl) {
                modalCustomEl.innerHTML = '';
                if (typeof customBuilder === 'function') {
                  modalCustomEl.style.display = 'block';
                  customBuilder(modalCustomEl);
                } else if (hideContent && (content || '').length) {
                  modalCustomEl.style.display = 'block';
                  const message = document.createElement('div');
                  message.className = 'wtl-modal-message';
                  message.textContent = content || '';
                  modalCustomEl.appendChild(message);
                } else {
                  modalCustomEl.style.display = 'none';
                }
              }
              modalActionsEl.innerHTML = '';
              actions.forEach((btn) => modalActionsEl.appendChild(btn));
              modalEl.style.display = 'flex';
              if (!hideContent) modalContentEl.focus();
            };

            const openConfirmModal = (title, message, actions = []) => {
              const builder = (wrap) => {
                const messageEl = document.createElement('div');
                messageEl.className = 'wtl-modal-message';
                messageEl.textContent = message || '';
                wrap.appendChild(messageEl);
              };
              openModal(title, '', actions, builder, { hideContent: true, readOnly: true });
            };

            const closeModal = () => {
              if (modalEl) modalEl.style.display = 'none';
            };

            const makeModalSaveButton = (label, onSave) => {
              const btn = document.createElement('button');
              btn.className = 'menu_button';
              btn.textContent = label || '保存';
              btn.addEventListener('click', () => {
                const next = modalContentEl?.value || '';
                if (onSave) onSave(next);
                closeModal();
              });
              return btn;
            };

            const openBlockEdit = (block) => {
              const title = `编辑内容：${buildBlockLabel(block)}`;
              const value = getBlockText(block);
              const saveBtn = makeModalSaveButton('保存', (next) => {
                setBlockText(block, next);
                if (block.type === 'schema') {
                  templateState = parseSchemaToTemplate(schemaSource || schemaEl?.value || '');
                  templateActiveSectionId = templateState.sections[0]?.id || '';
                  updateSchemaPreview();
                }
                saveState();
                refreshPromptPreview(true);
              });
              openModal(title, value, [saveBtn]);
            };

            const saveTemplateDialogChanges = () => {
              if (!templateDialogTarget) return;
              const name = (editorDialogNameEl?.value || '').trim() || '未命名';
              const definition = (editorDialogDefEl?.value || '').trim();
              const rawDeleteRule = (editorDialogDelEl?.value || '').trim();
              const rawInsertRule = (editorDialogAddEl?.value || '').trim();
              const rawUpdateRule = (editorDialogEditEl?.value || '').trim();
              const enableDelete = editorDialogDeleteEnabledEl ? editorDialogDeleteEnabledEl.checked : true;
              const enableInsert = editorDialogInsertEnabledEl ? editorDialogInsertEnabledEl.checked : true;
              const enableUpdate = editorDialogUpdateEnabledEl ? editorDialogUpdateEnabledEl.checked : true;
              const deleteRule = enableDelete ? rawDeleteRule : '';
              const insertRule = enableInsert ? rawInsertRule : '';
              const updateRule = enableUpdate ? rawUpdateRule : '';
              const fillable = editorDialogFillEl ? editorDialogFillEl.checked : true;
              const sendable = editorDialogSendEl ? editorDialogSendEl.checked : true;
              if (templateDialogTarget.type === 'section') {
                if (!templateDialogTarget.id) {
                  const sectionId = createSectionIdInTemplate(templateState);
                  const section = {
                    id: sectionId,
                    name,
                    definition,
                    deleteRule,
                    insertRule,
                    updateRule,
                    fillable,
                    sendable,
                    columns: [{ id: createColumnIdForSection(sectionId, new Set()), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }]
                  };
                  templateState.sections.push(section);
                  templateActiveSectionId = section.id;

                  const tableMd = tableMdEl?.value || '';
                  const parsed = parseMarkdownTableToJson(tableMd);
                  parsed.sections = parsed.sections || [];
                  parsed.sections.push({ name, columns: ['列1'], rows: [] });
                  const nextMd = renderJsonToMarkdown(parsed);
                  if (tableMdEl) tableMdEl.value = nextMd;
                  renderPreview(nextMd);

                  renderTemplateSections();
                  renderTemplateColumns();
                  updateSchemaPreview();
                  refreshPromptPreview(true);
                  closeTemplateDialog();
                  return;
                }
                const sec = templateState.sections.find(s => s.id === templateDialogTarget.id);
                if (sec) {
                  const prevName = sec.name;
                  sec.name = name;
                  sec.definition = definition;
                  sec.deleteRule = deleteRule;
                  sec.insertRule = insertRule;
                  sec.updateRule = updateRule;
                  sec.fillable = fillable;
                  sec.sendable = sendable;
                  if (prevName && prevName !== name) {
                    const next = (tableMdEl?.value || '').split('\n');
                    for (let i = 0; i < next.length; i++) {
                      const match = /^##\s+(.+)$/.exec(next[i].trim());
                      if (match && match[1].trim() === prevName) {
                        next[i] = `## ${name}`;
                        break;
                      }
                    }
                    const merged = next.join('\n');
                    if (tableMdEl) tableMdEl.value = merged;
                    renderPreview(merged);
                  }
                }
                renderTemplateSections();
                renderTemplateColumns();
                updateSchemaPreview();
                refreshPromptPreview(true);
                closeTemplateDialog();
                return;
              }
              if (templateDialogTarget.type === 'column') {
                const sec = templateState.sections.find(s => s.id === templateDialogTarget.sectionId) || templateState.sections[0];
                if (!sec) return;
                if (!templateDialogTarget.id) {
                  const column = { id: createColumnIdInTemplate(templateState, sec.id), name, definition, deleteRule, insertRule, updateRule };
                  sec.columns = Array.isArray(sec.columns) ? sec.columns : [];
                  sec.columns.push(column);

                  const sections = parseSections(tableMdEl?.value || '');
                  const nextSections = sections.map((s) => {
                    if (s.name !== (sec?.name || '')) return s;
                    const header = [...s.header, name];
                    const rows = s.rows.map(r => [...r, '']);
                    return { ...s, header, rows };
                  });
                  const markdown = renderJsonToMarkdown({
                    title: parseMarkdownTableToJson(tableMdEl?.value || '').title,
                    sections: nextSections.map(s => ({ name: s.name, columns: s.header, rows: s.rows }))
                  });
                  if (tableMdEl) tableMdEl.value = markdown;
                  renderPreview(markdown);

                  renderTemplateColumns();
                  updateSchemaPreview();
                  refreshPromptPreview(true);
                  closeTemplateDialog();
                  return;
                }

                const col = sec?.columns?.find(c => c.id === templateDialogTarget.id);
                if (col) {
                  const prevName = col.name;
                  col.name = name;
                  col.definition = definition;
                  col.deleteRule = deleteRule;
                  col.insertRule = insertRule;
                  col.updateRule = updateRule;
                  if (prevName && prevName !== name) {
                    const sections = parseSections(tableMdEl?.value || '');
                    const nextSections = sections.map((s) => {
                      if (s.name !== (sec?.name || '')) return s;
                      const header = s.header.map((h) => (h === prevName ? name : h));
                      return { ...s, header };
                    });
                    const markdown = renderJsonToMarkdown({
                      title: parseMarkdownTableToJson(tableMdEl?.value || '').title,
                      sections: nextSections.map(s => ({ name: s.name, columns: s.header, rows: s.rows }))
                    });
                    if (tableMdEl) tableMdEl.value = markdown;
                    renderPreview(markdown);
                  }
                }
                renderTemplateColumns();
                updateSchemaPreview();
                refreshPromptPreview(true);
                closeTemplateDialog();
                return;
              }
              if (templateDialogTarget.type === 'tab') {
                const next = (tableMdEl?.value || '').split('\n');
                const targetName = templateDialogTarget.name || '';
                for (let i = 0; i < next.length; i++) {
                  const match = /^##\s+(.+)$/.exec(next[i].trim());
                  if (match && match[1].trim() === targetName) {
                    next[i] = `## ${name}`;
                    break;
                  }
                }
                const merged = next.join('\n');
                if (tableMdEl) tableMdEl.value = merged;
                renderPreview(merged);
                saveState();
                closeTemplateDialog();
                return;
              }
              if (templateDialogTarget.type === 'col') {
                const { sectionName, colName } = templateDialogTarget;
                const sections = parseSections(tableMdEl?.value || '');
                const nextSections = sections.map((s) => {
                  if (s.name !== sectionName) return s;
                  const header = s.header.map((h) => (h === colName ? name : h));
                  return { ...s, header };
                });
                const markdown = renderJsonToMarkdown({
                  title: parseMarkdownTableToJson(tableMdEl?.value || '').title,
                  sections: nextSections.map(s => ({ name: s.name, columns: s.header, rows: s.rows }))
                });
                if (tableMdEl) tableMdEl.value = markdown;
                renderPreview(markdown);
                saveState();
                closeTemplateDialog();
              }
            };

            const openBlockWrapperEdit = (block, el) => {
              const title = `包装设置：${buildBlockLabel(block)}`;
              const prefix = el?.dataset.prefix || '';
              const suffix = el?.dataset.suffix || '';
              const usePrefix = (el?.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
              const useSuffix = (el?.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
              let prefixToggle = null;
              let suffixToggle = null;
              let prefixInput = null;
              let suffixInput = null;
              const saveBtn = makeModalSaveButton('保存', () => {
                if (!prefixToggle || !suffixToggle || !prefixInput || !suffixInput) return;
                if (el) {
                  el.dataset.usePrefix = prefixToggle.checked ? 'true' : 'false';
                  el.dataset.useSuffix = suffixToggle.checked ? 'true' : 'false';
                  el.dataset.prefix = prefixInput.value || '';
                  el.dataset.suffix = suffixInput.value || '';
                }
                saveState();
                refreshPromptPreview(true);
              });
              openModal(title, '', [saveBtn], (wrap) => {
                wrap.innerHTML = '';
                const prefixRow = document.createElement('div');
                prefixRow.className = 'wtl-row';
                prefixToggle = document.createElement('input');
                prefixToggle.type = 'checkbox';
                prefixToggle.checked = usePrefix;
                const prefixLabel = document.createElement('label');
                prefixLabel.textContent = '启用前缀';
                prefixInput = document.createElement('input');
                prefixInput.className = 'text_pole';
                prefixInput.value = prefix;
                prefixInput.disabled = !prefixToggle.checked;
                prefixToggle.addEventListener('change', () => {
                  prefixInput.disabled = !prefixToggle.checked;
                });
                prefixRow.appendChild(prefixToggle);
                prefixRow.appendChild(prefixLabel);
                const prefixWrap = document.createElement('div');
                prefixWrap.className = 'wtl-row';
                prefixWrap.appendChild(prefixInput);

                const suffixRow = document.createElement('div');
                suffixRow.className = 'wtl-row';
                suffixToggle = document.createElement('input');
                suffixToggle.type = 'checkbox';
                suffixToggle.checked = useSuffix;
                const suffixLabel = document.createElement('label');
                suffixLabel.textContent = '启用后缀';
                suffixInput = document.createElement('input');
                suffixInput.className = 'text_pole';
                suffixInput.value = suffix;
                suffixInput.disabled = !suffixToggle.checked;
                suffixToggle.addEventListener('change', () => {
                  suffixInput.disabled = !suffixToggle.checked;
                });
                suffixRow.appendChild(suffixToggle);
                suffixRow.appendChild(suffixLabel);
                const suffixWrap = document.createElement('div');
                suffixWrap.className = 'wtl-row';
                suffixWrap.appendChild(suffixInput);

                wrap.appendChild(prefixRow);
                wrap.appendChild(prefixWrap);
                wrap.appendChild(suffixRow);
                wrap.appendChild(suffixWrap);
              }, { hideContent: true, readOnly: true });
            };

            const openBlockPreview = async (block, el) => {
              const title = `预览：${buildBlockLabel(block)}`;
              const content = await getBlockTextAsync(block, el);
              openModal(title, content || '', []);
            };

            if (modalCloseEl) {
              modalCloseEl.addEventListener('click', closeModal);
            }
            if (modalEl) {
              modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) closeModal();
              });
            }

            const findBlockElById = (id) => blockListEl?.querySelector(`.wtl-block[data-id="${id}"]`);
            const findRefBlockElById = (id) => refBlockListEl?.querySelector(`.wtl-block[data-id="${id}"]`);
            const findAnyBlockElById = (id) => findBlockElById(id) || findRefBlockElById(id);

            const getBlockText = (block) => {
              if (block.type === 'preprompt') return prePromptEl?.value || '';
              if (block.type === 'instruction') {
                const enabled = (instInjectToggleEl?.checked ?? true);
                if (!enabled) return '';
                return ensureEditWrapper(instructionEl?.value || '');
              }
              if (block.type === 'schema') return buildTemplatePrompt(templateState) || schemaEl?.value || '';
              if (block.type === 'table') return ensureTableWrapper(tableMdEl?.value || '');
              if (block.type === 'custom') return (block.content ?? findAnyBlockElById(block.id)?.dataset.content) || '';
              return '';
            };

            const setBlockText = (block, value) => {
              if (block.type === 'preprompt' && prePromptEl) prePromptEl.value = value;
              if (block.type === 'instruction' && instructionEl) instructionEl.value = value;
              if (block.type === 'schema' && schemaEl) {
                schemaEl.value = value;
                schemaSource = value;
              }
              if (block.type === 'table' && tableMdEl) tableMdEl.value = value;
              if (block.type === 'custom') {
                block.content = value;
                const el = findAnyBlockElById(block.id);
                if (el) el.dataset.content = value;
              }
            };

            const getBlockTextAsync = async (block, el) => {
              const prefix = el?.dataset.prefix || '';
              const suffix = el?.dataset.suffix || '';
              const usePrefix = (el?.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
              const useSuffix = (el?.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
              if (['preprompt','instruction','schema','table','system','custom'].includes(block.type)) {
                const base = getBlockText(block);
                return `${usePrefix ? prefix : ''}${base}${useSuffix ? suffix : ''}`.trim();
              }
              if (block.type === 'reference' || block.type === 'chat' || block.type === 'persona' || block.type === 'character' || block.type === 'worldBook') {
                const ref = lastRef || await buildReferenceBundle();
                const refBlocks = await formatReferenceText(ref);
                const target = refBlocks.find(b => b.id === block.id);
                const base = target ? target.text : '';
                return `${usePrefix ? prefix : ''}${base}${useSuffix ? suffix : ''}`.trim();
              }
              return '';
            };

            const addCustomBlock = () => {
              if (!blockListEl) return;
              const id = `custom_${Date.now()}`;
              const block = { id, label: '自定义提示词', type: 'custom', hidden: false, content: '', prefix: '', suffix: '', usePrefix: 'false', useSuffix: 'false' };
              const current = Array.from(blockListEl.querySelectorAll('.wtl-block')).map((el) => ({
                id: el.dataset.id,
                label: el.dataset.label,
                type: el.dataset.type,
                field: el.dataset.field || undefined,
                position: el.dataset.position || undefined,
                hidden: el.dataset.hidden === 'true',
                content: el.dataset.content || undefined,
                prefix: el.dataset.prefix || undefined,
                suffix: el.dataset.suffix || undefined,
                usePrefix: el.dataset.usePrefix || undefined,
                useSuffix: el.dataset.useSuffix || undefined
              }));
              current.push(block);
              renderBlockList(current);
              saveState();
              refreshPromptPreview(true);
              openBlockEdit(block);
            };

            if (blockAddEl) {
              blockAddEl.addEventListener('click', addCustomBlock);
            }

            const addCustomRefBlock = () => {
              if (!refBlockListEl) return;
              const id = `ref_custom_${Date.now()}`;
              const block = { id, label: '自定义提示词', type: 'custom', hidden: false, content: '', prefix: '', suffix: '', usePrefix: 'false', useSuffix: 'false' };
              const current = Array.from(refBlockListEl.querySelectorAll('.wtl-block')).map((el) => ({
                id: el.dataset.id,
                label: el.dataset.label,
                type: el.dataset.type,
                field: el.dataset.field || undefined,
                position: el.dataset.position || undefined,
                hidden: el.dataset.hidden === 'true',
                prefix: el.dataset.prefix || undefined,
                suffix: el.dataset.suffix || undefined,
                usePrefix: el.dataset.usePrefix || undefined,
                useSuffix: el.dataset.useSuffix || undefined
              }));
              current.push(block);
              renderRefBlockList(current);
              saveState();
              refreshPromptPreview(true);
              openBlockEdit(block);
            };

            if (refBlockAddEl) {
              refBlockAddEl.addEventListener('click', addCustomRefBlock);
            }

            const buildManualWorldBookTemplate = async () => {
              const template = { books: [] };
              let listRes = { worldBooks: [] };
              try {
                listRes = await window.ST_API.worldBook.list({ scope: 'global' });
              } catch (e) {
                console.warn('[WorldTreeLibrary] worldBook.list failed', e);
              }
              for (const b of listRes.worldBooks || []) {
                if (!b?.name) continue;
                try {
                  const res = await window.ST_API.worldBook.get({ name: b.name, scope: 'global' });
                  const entries = (res?.worldBook?.entries || []).map((e) => ({
                    index: e.index,
                    name: e.name,
                    content: e.content || '',
                    selected: false,
                    override: {
                      enabled: e.enabled,
                      activationMode: e.activationMode,
                      key: e.key,
                      secondaryKey: e.secondaryKey,
                      selectiveLogic: e.selectiveLogic,
                      role: e.role,
                      caseSensitive: e.caseSensitive,
                      excludeRecursion: e.excludeRecursion,
                      preventRecursion: e.preventRecursion,
                      probability: e.probability,
                      position: e.position,
                      order: e.order,
                      depth: e.depth,
                      other: e.other
                    }
                  }));
                  template.books.push({ name: b.name, scope: 'global', selected: false, includeAll: false, entries });
                } catch (e) {
                  console.warn('[WorldTreeLibrary] worldBook.get template failed', e);
                }
              }
              return template;
            };

            const normalizeManualConfig = (raw) => {
              const cfg = raw && typeof raw === 'object' ? raw : { books: [] };
              cfg.books = Array.isArray(cfg.books) ? cfg.books : [];
              cfg.books.forEach((b) => {
                b.scope = b.scope || 'global';
                b.selected = Boolean(b.selected);
                b.includeAll = Boolean(b.includeAll);
                b.entries = Array.isArray(b.entries) ? b.entries : [];
                b.entries.forEach((e) => {
                  e.selected = Boolean(e.selected);
                  e.name = e.name || '';
                  e.content = e.content || '';
                  e.override = e.override && typeof e.override === 'object' ? e.override : {};
                });
              });
              return cfg;
            };

            const getManualConfig = () => {
              let raw = { books: [] };
              try {
                raw = JSON.parse(wbManualEl?.value || '{"books": []}') || { books: [] };
              } catch (e) {
                console.warn('[WorldTreeLibrary] manual worldbook JSON invalid', e);
              }
              return normalizeManualConfig(raw);
            };

            const setManualConfig = (cfg) => {
              if (wbManualEl) wbManualEl.value = JSON.stringify(cfg, null, 2);
            };

            const mergeManualConfig = (template, current) => {
              const merged = normalizeManualConfig(JSON.parse(JSON.stringify(template)));
              const currentMap = new Map((current?.books || []).map(b => [b.name, b]));
              for (const b of merged.books) {
                const cur = currentMap.get(b.name);
                if (!cur) continue;
                b.selected = Boolean(cur.selected);
                b.includeAll = Boolean(cur.includeAll);
                const entryMap = new Map((cur.entries || []).map(e => [e.index, e]));
                b.entries.forEach((e) => {
                  const ce = entryMap.get(e.index);
                  if (!ce) return;
                  e.selected = Boolean(ce.selected);
                  e.name = ce.name || e.name;
                  e.content = ce.content || e.content;
                  e.override = { ...(e.override || {}), ...(ce.override || {}) };
                });
              }
              return merged;
            };

            const renderManualWorldBookUI = (cfg) => {
              if (!wbManualUiEl) return;
              manualState = normalizeManualConfig(cfg);
              wbManualUiEl.innerHTML = '';

              const sync = () => {
                if (!manualState) return;
                setManualConfig(manualState);
                saveState();
                refreshPromptPreview(true);
              };

              manualState.books.forEach((book) => {
                const bookWrap = document.createElement('div');
                bookWrap.className = 'wtl-wb-book';
                bookWrap.dataset.bookName = book.name;

                const head = document.createElement('div');
                head.className = 'wtl-row';

                const bookCheck = document.createElement('input');
                bookCheck.type = 'checkbox';
                bookCheck.checked = !!book.selected;
                bookCheck.addEventListener('change', () => {
                  book.selected = bookCheck.checked;
                  sync();
                });

                const title = document.createElement('strong');
                title.textContent = book.name;

                const includeAll = document.createElement('label');
                includeAll.className = 'wtl-badge';
                includeAll.style.display = 'inline-flex';
                includeAll.style.gap = '6px';
                includeAll.style.alignItems = 'center';
                const includeAllCheck = document.createElement('input');
                includeAllCheck.type = 'checkbox';
                includeAllCheck.checked = !!book.includeAll;
                includeAllCheck.addEventListener('change', () => {
                  book.includeAll = includeAllCheck.checked;
                  sync();
                });
                includeAll.appendChild(includeAllCheck);
                includeAll.appendChild(document.createTextNode('包含全书'));

                const toggle = document.createElement('button');
                toggle.className = 'menu_button';
                toggle.textContent = '展开';

                const selectAll = document.createElement('button');
                selectAll.className = 'menu_button';
                selectAll.textContent = '全选条目';

                const clearAll = document.createElement('button');
                clearAll.className = 'menu_button';
                clearAll.textContent = '清空条目';

                head.appendChild(bookCheck);
                head.appendChild(title);
                head.appendChild(includeAll);
                head.appendChild(toggle);
                head.appendChild(selectAll);
                head.appendChild(clearAll);

                const entriesWrap = document.createElement('div');
                entriesWrap.className = 'wtl-wb-entries';
                entriesWrap.style.display = 'none';

                toggle.addEventListener('click', () => {
                  const open = entriesWrap.style.display !== 'none';
                  entriesWrap.style.display = open ? 'none' : 'block';
                  toggle.textContent = open ? '展开' : '收起';
                });
                selectAll.addEventListener('click', () => {
                  book.entries.forEach(e => { e.selected = true; });
                  renderManualWorldBookUI(manualState);
                  sync();
                });
                clearAll.addEventListener('click', () => {
                  book.entries.forEach(e => { e.selected = false; });
                  renderManualWorldBookUI(manualState);
                  sync();
                });

                const normalizeKeyValue = (value) => {
                  if (Array.isArray(value)) return value.filter(Boolean).join(',');
                  return String(value ?? '').trim();
                };

                const parseKeyValue = (value) => {
                  return String(value || '')
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean);
                };

                const displayEntries = [...book.entries].sort((a, b) => {
                  const ao = Number(a?.override?.order ?? a?.order ?? 0);
                  const bo = Number(b?.override?.order ?? b?.order ?? 0);
                  if (ao !== bo) return ao - bo;
                  return (a?.index ?? 0) - (b?.index ?? 0);
                });

                displayEntries.forEach((entry) => {
                  const entryWrap = document.createElement('div');
                  entryWrap.className = 'wtl-wb-entry';
                  entryWrap.dataset.entryIndex = entry.index;

                  const entryHead = document.createElement('div');
                  entryHead.className = 'wtl-row';

                  const entryCheck = document.createElement('input');
                  entryCheck.type = 'checkbox';
                  entryCheck.checked = !!entry.selected;
                  entryCheck.addEventListener('change', () => {
                    entry.selected = entryCheck.checked;
                    sync();
                  });

                  const entryLabel = document.createElement('span');
                  const orderLabel = Number(entry?.override?.order ?? entry?.order ?? 0);
                  entryLabel.textContent = `${entry.name || '条目'} (#${entry.index}) [顺序:${orderLabel}]`;

                  const entryToggle = document.createElement('button');
                  entryToggle.className = 'menu_button wtl-wb-entry-toggle';
                  entryToggle.textContent = '详情';

                  entryHead.appendChild(entryCheck);
                  entryHead.appendChild(entryLabel);
                  entryHead.appendChild(entryToggle);

                  const detail = document.createElement('div');
                  detail.className = 'wtl-wb-entry-detail';

                  const mkInput = (labelText, value, onChange) => {
                    const wrap = document.createElement('div');
                    wrap.className = 'wtl-row';
                    const label = document.createElement('label');
                    label.textContent = labelText;
                    const input = document.createElement('input');
                    input.className = 'text_pole';
                    input.value = value ?? '';
                    input.addEventListener('input', () => onChange(input.value));
                    wrap.appendChild(label);
                    wrap.appendChild(input);
                    return wrap;
                  };

                  const mkNumber = (labelText, value, onChange) => {
                    const wrap = document.createElement('div');
                    wrap.className = 'wtl-row';
                    const label = document.createElement('label');
                    label.textContent = labelText;
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.step = '1';
                    input.className = 'text_pole';
                    input.value = value ?? '';
                    input.addEventListener('input', () => onChange(Number(input.value)));
                    wrap.appendChild(label);
                    wrap.appendChild(input);
                    return wrap;
                  };

                  const mkSelect = (labelText, value, options, onChange) => {
                    const wrap = document.createElement('div');
                    wrap.className = 'wtl-row';
                    const label = document.createElement('label');
                    label.textContent = labelText;
                    const select = document.createElement('select');
                    select.className = 'text_pole';
                    const normalized = options.map((o) => {
                      if (typeof o === 'string') return { value: o, label: o };
                      return { value: o.value, label: o.label };
                    });
                    select.innerHTML = normalized.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                    select.value = value ?? normalized[0]?.value;
                    select.addEventListener('change', () => onChange(select.value));
                    wrap.appendChild(label);
                    wrap.appendChild(select);
                    return wrap;
                  };

                  const mkTextarea = (labelText, value, onChange) => {
                    const wrap = document.createElement('div');
                    const label = document.createElement('label');
                    label.textContent = labelText;
                    const textarea = document.createElement('textarea');
                    textarea.className = 'text_pole';
                    textarea.rows = 3;
                    textarea.value = value ?? '';
                    textarea.addEventListener('input', () => onChange(textarea.value));
                    wrap.appendChild(label);
                    wrap.appendChild(textarea);
                    return wrap;
                  };

                  detail.appendChild(mkInput('名称', entry.name || '', (v) => { entry.name = v; sync(); }));
                  detail.appendChild(mkTextarea('内容', entry.content || '', (v) => { entry.content = v; sync(); }));

                  const override = entry.override || (entry.override = {});
                  detail.appendChild(mkSelect('插入位置', override.position || '', [
                    { value: 'beforeChar', label: '角色定义之前' },
                    { value: 'afterChar', label: '角色定义之后' },
                    { value: 'beforeEm', label: '示例消息之前' },
                    { value: 'afterEm', label: '示例消息之后' },
                    { value: 'beforeAn', label: '作者注释之前' },
                    { value: 'afterAn', label: '作者注释之后' },
                    { value: 'fixed', label: '固定深度' },
                    { value: 'outlet', label: 'Outlet' }
                  ], (v) => { override.position = v; sync(); }));
                  detail.appendChild(mkNumber('顺序', override.order ?? '', (v) => { override.order = Number.isFinite(v) ? v : 0; sync(); }));
                  detail.appendChild(mkNumber('深度', override.depth ?? '', (v) => { override.depth = Number.isFinite(v) ? v : 0; sync(); }));
                  detail.appendChild(mkSelect('触发模式', override.activationMode || '', [
                    { value: 'always', label: '总是触发' },
                    { value: 'conditional', label: '匹配关键词' },
                    { value: 'disabled', label: '禁用' }
                  ], (v) => { override.activationMode = v; sync(); }));
                  detail.appendChild(mkSelect('关键词逻辑', override.selectiveLogic || '', [
                    { value: 'andAny', label: '包含任一关键词（AND ANY）' },
                    { value: 'andAll', label: '包含全部关键词（AND ALL）' },
                    { value: 'orAll', label: '命中任一关键词（OR ALL）' },
                    { value: 'notAny', label: '不包含任一关键词（NOT ANY）' },
                    { value: 'notAll', label: '不包含全部关键词（NOT ALL）' }
                  ], (v) => { override.selectiveLogic = v; sync(); }));
                  detail.appendChild(mkInput('关键词', normalizeKeyValue(override.key ?? entry.key ?? ''), (v) => { override.key = parseKeyValue(v); sync(); }));
                  detail.appendChild(mkInput('副关键词', normalizeKeyValue(override.secondaryKey ?? entry.secondaryKey ?? ''), (v) => { override.secondaryKey = parseKeyValue(v); sync(); }));
                  detail.appendChild(mkInput('概率', override.probability ?? '', (v) => { override.probability = Number(v); sync(); }));
                  detail.appendChild(mkSelect('角色', override.role || '', [
                    { value: 'system', label: '系统' },
                    { value: 'user', label: '用户' },
                    { value: 'model', label: '模型' }
                  ], (v) => { override.role = v; sync(); }));

                  entryToggle.addEventListener('click', () => {
                    const open = detail.style.display !== 'none';
                    entriesWrap.querySelectorAll('.wtl-wb-entry-detail').forEach((el) => {
                      if (el !== detail) el.style.display = 'none';
                    });
                    entriesWrap.querySelectorAll('.wtl-wb-entry-toggle').forEach((btn) => {
                      if (btn !== entryToggle) btn.textContent = '详情';
                    });
                    detail.style.display = open ? 'none' : 'block';
                    entryToggle.textContent = open ? '详情' : '收起';
                  });

                  entryWrap.appendChild(entryHead);
                  entryWrap.appendChild(detail);
                  entriesWrap.appendChild(entryWrap);
                });

                bookWrap.appendChild(head);
                bookWrap.appendChild(entriesWrap);
                wbManualUiEl.appendChild(bookWrap);
              });
            };

            const stripTableWrapper = (md) => {
              return md.replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
            };

            const ensureTableWrapper = (md) => wrapTable(md);

            const extractEditPayload = (text) => {
              if (!text) return '';
              const match = text.match(/<WTL_TableEdit>([\s\S]*?)<\/WTL_TableEdit>/);
              return match ? match[1].trim() : text;
            };

            const ensureEditWrapper = (text) => {
              const content = (text || '').trim();
              if (!content) return '<WTL_TableEdit>\n</WTL_TableEdit>';
              if (content.includes('<WTL_TableEdit>') && content.includes('</WTL_TableEdit>')) return content;
              return `<WTL_TableEdit>\n${content}\n</WTL_TableEdit>`;
            };

            const parseSections = (md) => {
              const raw = stripTableWrapper(md);
              const lines = raw.split('\n');
              const sections = [];
              let current = null;
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = /^##\s+(.+)$/.exec(line.trim());
                if (match) {
                  if (current) sections.push(current);
                  current = { name: match[1].trim(), lines: [] };
                  continue;
                }
                if (current) current.lines.push(line);
              }
              if (current) sections.push(current);
              return sections.map((s) => {
                const rows = s.lines.filter(l => l.trim().startsWith('|'));
                if (!rows.length) return { name: s.name, header: [], rows: [] };
                const header = rows[0].split('|').slice(1, -1).map(c => c.trim());
                const bodyRows = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
                return { name: s.name, header, rows: bodyRows };
              });
            };

            const enableTableInlineEditing = () => {
              const tableEl = document.getElementById('wtl-table-view');
              if (!tableEl) return;
              tableEl.classList.add('wtl-table-editing');
              tableEl.querySelectorAll('tbody td').forEach((cell) => {
                if (cell.dataset.rowIndex === 'true') return;
                cell.setAttribute('contenteditable', 'true');
              });
            };

            const disableTableInlineEditing = () => {
              const tableEl = document.getElementById('wtl-table-view');
              if (!tableEl) return;
              tableEl.classList.remove('wtl-table-editing');
              tableEl.querySelectorAll('tbody td').forEach((cell) => {
                cell.removeAttribute('contenteditable');
              });
            };

            const clearHiddenForSection = (sectionIndex) => {
              const sk = String(sectionIndex);
              if (hiddenRows?.[sk]) hiddenRows[sk] = {};
            };

            const updateTableRows = (sectionIndex, updater) => {
              if (!tableMdEl) return;
              const data = parseMarkdownTableToJson(tableMdEl.value || '');
              const sections = Array.isArray(data.sections) ? data.sections : [];
              const section = sections[sectionIndex - 1];
              if (!section) return;
              section.columns = Array.isArray(section.columns) ? section.columns : [];
              section.rows = Array.isArray(section.rows) ? section.rows : [];
              const rows = section.rows;
              if (!section.columns.length) {
                const fallbackCols = rows[0]?.length ? rows[0].map((_, i) => `列${i + 1}`) : ['列1'];
                section.columns = fallbackCols;
              }
              updater(section, rows, section.columns);
              clearHiddenForSection(sectionIndex);
              const next = renderJsonToMarkdown(data);
              tableMdEl.value = next;
              renderPreview(next);
              saveState();
              refreshPromptPreview(true);
            };

            const moveRow = (sectionIndex, from, to) => {
              updateTableRows(sectionIndex, (section, rows) => {
                if (from < 1 || to < 1 || from > rows.length || to > rows.length) return;
                const [row] = rows.splice(from - 1, 1);
                rows.splice(to - 1, 0, row);
              });
            };

            const bindRowDrag = () => {
              const tableEl = document.getElementById('wtl-table-view');
              if (!tableEl) return;
              tableEl.querySelectorAll('tbody tr').forEach((rowEl) => {
                const indexCell = rowEl.querySelector('td.wtl-row-index');
                if (!indexCell) return;
                indexCell.setAttribute('draggable', 'true');

                indexCell.addEventListener('dragstart', (e) => {
                  if (!tableEditMode) {
                    e.preventDefault();
                    return;
                  }
                  const rowIndex = Number(indexCell.dataset.row || 0);
                  const sectionIndex = Number(indexCell.dataset.section || 0);
                  if (!rowIndex || !sectionIndex) {
                    e.preventDefault();
                    return;
                  }
                  const payload = JSON.stringify({ rowIndex, sectionIndex });
                  e.dataTransfer?.setData('text/plain', payload);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                  rowEl.classList.add('wtl-row-dragging');
                });

                indexCell.addEventListener('dragend', () => {
                  rowEl.classList.remove('wtl-row-dragging');
                });

                rowEl.addEventListener('dragover', (e) => {
                  if (!tableEditMode) return;
                  e.preventDefault();
                  rowEl.classList.add('wtl-row-dragover');
                });

                rowEl.addEventListener('dragleave', () => {
                  rowEl.classList.remove('wtl-row-dragover');
                });

                rowEl.addEventListener('drop', (e) => {
                  if (!tableEditMode) return;
                  e.preventDefault();
                  rowEl.classList.remove('wtl-row-dragover');
                  const raw = e.dataTransfer?.getData('text/plain') || '';
                  if (!raw) return;
                  try {
                    const data = JSON.parse(raw);
                    const from = Number(data.rowIndex || 0);
                    const section = Number(data.sectionIndex || 0);
                    const to = Number(indexCell.dataset.row || 0);
                    const targetSection = Number(indexCell.dataset.section || 0);
                    if (!from || !to || !section || section !== targetSection) return;
                    if (from === to) return;
                    moveRow(section, from, to);
                  } catch (err) {
                    return;
                  }
                });
              });
            };

            const applyPreviewEditsToMarkdown = () => {
              const tableEl = document.getElementById('wtl-table-view');
              if (!tableEl || !tableMdEl) return tableMdEl?.value || '';
              const headRow = tableEl.querySelector('thead tr');
              const bodyRows = Array.from(tableEl.querySelectorAll('tbody tr'));
              const headers = headRow
                ? Array.from(headRow.querySelectorAll('th'))
                  .filter(th => th.dataset.rowIndex !== 'true')
                  .map(th => th.querySelector('span')?.textContent?.trim() || th.textContent?.trim() || '')
                : [];

              const sections = parseSections(tableMdEl.value || '');
              const current = sections.find(s => s.name === activeSection) || sections[0];
              if (!current) return tableMdEl.value || '';

              current.header = headers;
              current.rows = bodyRows.map((row) => Array.from(row.querySelectorAll('td'))
                .filter(td => td.dataset.rowIndex !== 'true')
                .map(td => (td.textContent || '').trim()));

              const data = {
                title: parseMarkdownTableToJson(tableMdEl.value || '').title,
                sections: sections.map((s) => ({ name: s.name, columns: s.header, rows: s.rows }))
              };
              return renderJsonToMarkdown(data);
            };

            const renderTabs = (sections) => {
              if (!tableTabsEl) return;
              tableTabsEl.innerHTML = '';
              const names = sections.map(s => s.name);
              tableSectionOrder = names.slice();
              if (!activeSection || !names.includes(activeSection)) {
                activeSection = names[0] || '';
              }
              names.forEach((name) => {
                const tab = document.createElement('div');
                tab.className = `wtl-tab${name === activeSection ? ' active' : ''}${templateEditMode ? ' wtl-tab-editing' : ''}`;
                tab.dataset.name = name;
                tab.draggable = templateEditMode;

                const label = document.createElement('span');
                label.textContent = name;
                tab.appendChild(label);

                const pencil = document.createElement('button');
                pencil.className = 'wtl-pencil';
                pencil.type = 'button';
                pencil.innerHTML = '<i class="fa-solid fa-pen"></i>';
                pencil.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (!templateEditMode) return;
                  const sec = templateState.sections.find(s => s.name === name);
                  if (sec) {
                    openTemplateDialog('编辑表格', { type: 'section', id: sec.id }, {
                      name: sec.name,
                      definition: sec.definition,
                      deleteRule: sec.deleteRule,
                      insertRule: sec.insertRule,
                      updateRule: sec.updateRule,
                      fillable: sec.fillable !== false,
                      sendable: sec.sendable !== false
                    });
                    return;
                  }
                  openTemplateDialog('编辑页签', { type: 'tab', name }, { name });
                });
                tab.appendChild(pencil);

                const closeBtn = document.createElement('button');
                closeBtn.className = 'wtl-pencil';
                closeBtn.type = 'button';
                closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                closeBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (!templateEditMode) return;
                  const sec = templateState.sections.find(s => s.name === name);
                  const content = `确认删除页签：${name}\n\n删除后将移除模板章节与表格内容。`;
                  const confirmBtn = makeModalSaveButton('确认删除', () => {
                    if (sec) {
                      templateState.sections = templateState.sections.filter(s => s.id !== sec.id);
                      if (templateActiveSectionId === sec.id) {
                        templateActiveSectionId = templateState.sections[0]?.id || '';
                      }
                    }
                    const next = (tableMdEl?.value || '').split('\n');
                    let inTarget = false;
                    const out = [];
                    for (const line of next) {
                      const match = /^##\s+(.+)$/.exec(line.trim());
                      if (match) {
                        inTarget = match[1].trim() === name;
                        if (!inTarget) out.push(line);
                        continue;
                      }
                      if (!inTarget) out.push(line);
                    }
                    const merged = out.join('\n').trim();
                    const finalMd = merged || templateToSchemaMarkdown({ title: templateState.title, sections: templateState.sections });
                    if (tableMdEl) tableMdEl.value = finalMd;
                    renderPreview(finalMd);
                    renderTemplateSections();
                    renderTemplateColumns();
                    updateSchemaPreview();
                    refreshPromptPreview(true);
                  });
                  openConfirmModal('删除页签', content, [confirmBtn]);
                });
                tab.appendChild(closeBtn);

                tab.addEventListener('click', () => {
                  activeSection = name;
                  renderPreview(tableMdEl?.value || '');
                });
                tableTabsEl.appendChild(tab);
              });

              if (templateEditMode) {
                const addTab = document.createElement('div');
                addTab.className = 'wtl-tab wtl-tab-editing';
                addTab.dataset.name = 'add';

                const label = document.createElement('span');
                label.textContent = '+';
                addTab.appendChild(label);

                addTab.addEventListener('click', () => {
                  if (!templateEditMode) return;
                  openTemplateDialog('新建页签', { type: 'section', id: '' }, {
                    name: '新表格',
                    definition: '',
                    deleteRule: '',
                    insertRule: '',
                    updateRule: '',
                    fillable: true,
                    sendable: true
                  });
                });
                tableTabsEl.appendChild(addTab);
                bindDrag(tableTabsEl);
              }
            };

            const renderPreview = (md) => {
              if (!headEl || !bodyEl) return;
              const sections = parseSections(md);
              if (!sections.length) {
                headEl.innerHTML = '';
                bodyEl.innerHTML = '';
                if (tableTabsEl) tableTabsEl.innerHTML = '';
                return;
              }
              renderTabs(sections);
              const current = sections.find(s => s.name === activeSection) || sections[0];
              const header = current.header;
              const sectionIndex = Math.max(1, sections.findIndex(s => s.name === current.name) + 1);
              headEl.innerHTML = header.length
                ? `<tr>${['#', ...header].map((h, i) => {
                  if (i === 0) return `<th class="wtl-row-index" data-row-index="true"><span>#</span></th>`;
                  const label = h || '';
                  const pencil = `<button class="wtl-pencil" type="button" data-col="${label}"><i class="fa-solid fa-pen"></i></button>`;
                  const resizer = `<span class="wtl-col-resizer" data-col="${label}"></span>`;
                  return `<th draggable="${templateEditMode}" data-col="${label}"><span>${label}</span>${pencil}${resizer}</th>`;
                }).join('')}</tr>`
                : '';
              bodyEl.innerHTML = current.rows.map((row, idx) => {
                const rowIndex = idx + 1;
                const hidden = Boolean(hiddenRows?.[String(sectionIndex)]?.[String(rowIndex)]);
                const rowHead = `<td class="wtl-row-index" data-row-index="true" data-row="${rowIndex}" data-section="${sectionIndex}"><button type="button">${rowIndex}</button></td>`;
                const cells = header.map((_, colIdx) => {
                  const value = row[colIdx] || '—';
                  const resizer = `<span class="wtl-row-resizer"></span>`;
                  return `<td>${value}${resizer}</td>`;
                }).join('');
                return `<tr class="${hidden ? 'wtl-row-hidden' : ''}">${rowHead}${cells}</tr>`;
              }).join('');
              const previewTable = document.getElementById('wtl-table-view');
              if (previewTable) previewTable.classList.toggle('wtl-template-editing', templateEditMode);
              if (previewTable) previewTable.classList.toggle('wtl-table-editing', tableEditMode);
              if (tableEditMode) enableTableInlineEditing();
              if (!tableEditMode) disableTableInlineEditing();
              bindRowDrag();

              headEl.querySelectorAll('.wtl-pencil').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (!templateEditMode) return;
                  const colName = btn.dataset.col || '';
                  const sec = templateState.sections.find(s => s.name === current.name);
                  const col = sec?.columns?.find(c => c.name === colName);
                  if (sec && col) {
                    openTemplateDialog('编辑列', { type: 'column', id: col.id, sectionId: sec.id }, {
                      name: col.name,
                      definition: col.definition,
                      deleteRule: col.deleteRule,
                      insertRule: col.insertRule,
                      updateRule: col.updateRule,
                      fillable: true
                    });
                    return;
                  }
                  openTemplateDialog('编辑列名', { type: 'col', sectionName: current.name, colName }, { name: colName });
                });
              });

              bodyEl.querySelectorAll('td.wtl-row-index button').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (!tableEditMode) return;
                  const cell = btn.closest('td');
                  const rowIndex = Number(cell?.dataset.row || 0);
                  const sectionIndex = Number(cell?.dataset.section || 0);
                  if (!rowIndex || !sectionIndex) return;

                  document.querySelectorAll('.wtl-row-index-pop').forEach((el) => el.remove());

                  const pop = document.createElement('div');
                  pop.className = 'wtl-row-index-pop';

                  const addBtn = document.createElement('button');
                  addBtn.type = 'button';
                  addBtn.textContent = '插入';
                  addBtn.addEventListener('click', () => {
                    updateTableRows(sectionIndex, (section, rows, cols) => {
                      const filled = cols.map(() => '');
                      rows.splice(rowIndex, 0, filled);
                    });
                    pop.remove();
                  });

                  const copyBtn = document.createElement('button');
                  copyBtn.type = 'button';
                  copyBtn.textContent = '复制';
                  copyBtn.addEventListener('click', () => {
                    updateTableRows(sectionIndex, (section, rows, cols) => {
                      const src = rows[rowIndex - 1] || cols.map(() => '');
                      rows.splice(rowIndex, 0, src.slice());
                    });
                    pop.remove();
                  });

                  const delBtn = document.createElement('button');
                  delBtn.type = 'button';
                  delBtn.textContent = '删除';
                  delBtn.addEventListener('click', () => {
                    updateTableRows(sectionIndex, (section, rows) => {
                      if (rows[rowIndex - 1]) rows.splice(rowIndex - 1, 1);
                    });
                    pop.remove();
                  });

                  const upBtn = document.createElement('button');
                  upBtn.type = 'button';
                  upBtn.textContent = '上移';
                  upBtn.addEventListener('click', () => {
                    moveRow(sectionIndex, rowIndex, rowIndex - 1);
                    pop.remove();
                  });

                  const downBtn = document.createElement('button');
                  downBtn.type = 'button';
                  downBtn.textContent = '下移';
                  downBtn.addEventListener('click', () => {
                    moveRow(sectionIndex, rowIndex, rowIndex + 1);
                    pop.remove();
                  });

                  pop.append(addBtn, copyBtn, upBtn, downBtn, delBtn);
                  document.body.appendChild(pop);

                  const rect = btn.getBoundingClientRect();
                  const left = Math.min(rect.left + window.scrollX, window.innerWidth - pop.offsetWidth - 12);
                  const top = rect.bottom + window.scrollY + 6;
                  pop.style.left = `${left}px`;
                  pop.style.top = `${top}px`;

                  const handleOutside = (ev) => {
                    if (pop.contains(ev.target)) return;
                    pop.remove();
                    document.removeEventListener('click', handleOutside);
                  };
                  setTimeout(() => document.addEventListener('click', handleOutside), 0);
                });
              });

              headEl.querySelectorAll('.wtl-col-resizer').forEach((handle) => {
                if (handle.dataset.bound === '1') return;
                handle.dataset.bound = '1';
                handle.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const th = handle.closest('th');
                  if (!th) return;
                  const startX = e.clientX;
                  const startWidth = th.getBoundingClientRect().width;
                  const onMove = (evt) => {
                    const next = Math.max(40, startWidth + (evt.clientX - startX));
                    th.style.width = `${next}px`;
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                });
              });

              bodyEl.querySelectorAll('.wtl-row-resizer').forEach((handle) => {
                if (handle.dataset.bound === '1') return;
                handle.dataset.bound = '1';
                handle.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const td = handle.closest('td');
                  const tr = handle.closest('tr');
                  if (!td || !tr) return;
                  const startY = e.clientY;
                  const startHeight = tr.getBoundingClientRect().height;
                  const onMove = (evt) => {
                    const next = Math.max(24, startHeight + (evt.clientY - startY));
                    tr.style.height = `${next}px`;
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                });
              });
            };

            const reorderColumns = (md, sectionName, newOrder) => {
              if (!sectionName) return md;
              const lines = md.split('\n');
              let inSection = false;
              let headerIdx = -1;
              let sepIdx = -1;
              const rowIdxs = [];
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const headerMatch = /^##\s+(.+)$/.exec(line.trim());
                if (headerMatch) {
                  inSection = headerMatch[1].trim() === sectionName;
                  continue;
                }
                if (!inSection) continue;
                if (line.trim().startsWith('|')) {
                  if (headerIdx === -1) headerIdx = i;
                  else if (sepIdx === -1) sepIdx = i;
                  else rowIdxs.push(i);
                }
              }
              if (headerIdx === -1 || sepIdx === -1) return md;
              const headerCells = lines[headerIdx].split('|').slice(1, -1).map(c => c.trim());
              const indexMap = newOrder.map(name => headerCells.indexOf(name)).filter(i => i >= 0);
              if (indexMap.length !== headerCells.length) return md;
              const rebuildRow = (line) => {
                const cells = line.split('|').slice(1, -1).map(c => c.trim());
                const reordered = indexMap.map(idx => cells[idx] ?? '');
                return `| ${reordered.join(' | ')} |`;
              };
              lines[headerIdx] = rebuildRow(lines[headerIdx]);
              lines[sepIdx] = rebuildRow(lines[sepIdx]);
              rowIdxs.forEach((idx) => {
                lines[idx] = rebuildRow(lines[idx]);
              });
              return lines.join('\n');
            };

            const reorderSections = (md, newOrder) => {
              if (!newOrder.length) return md;
              const sections = [];
              const lines = md.split('\n');
              let current = null;
              for (const line of lines) {
                const match = /^##\s+(.+)$/.exec(line.trim());
                if (match) {
                  if (current) sections.push(current);
                  current = { name: match[1].trim(), lines: [line] };
                } else if (current) {
                  current.lines.push(line);
                }
              }
              if (current) sections.push(current);
              if (!sections.length) return md;
              const map = new Map(sections.map(s => [s.name, s.lines]));
              const ordered = [];
              newOrder.forEach((name) => {
                const block = map.get(name);
                if (block) ordered.push(block.join('\n'));
                map.delete(name);
              });
              for (const rest of map.values()) ordered.push(rest.join('\n'));
              return ordered.join('\n\n');
            };

            const escapeAttr = (value) => {
              return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            };

            const unescapeAttr = (value) => {
              return String(value ?? '')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
            };

            const extractWorldBookEntriesFromText = (text, entryMap) => {
              const raw = String(text || '');
              const re = /<WTL_WB_ENTRY([^>]*)>([\s\S]*?)<\/WTL_WB_ENTRY>/gi;
              const entries = [];
              let match;
              while ((match = re.exec(raw))) {
                const attrRaw = match[1] || '';
                const content = (match[2] || '').trim();
                if (!content) continue;
                const attrs = {};
                const attrRe = /(\w+)\s*=\s*"([^"]*)"/g;
                let m2;
                while ((m2 = attrRe.exec(attrRaw))) {
                  attrs[m2[1]] = unescapeAttr(m2[2]);
                }
                const idxKey = attrs.index !== undefined ? String(attrs.index) : '';
                const base = entryMap?.get(idxKey) || null;
                const name = attrs.name || base?.name || '条目';
                const position = attrs.position || base?.position || 'outlet';
                const order = Number.isFinite(Number(attrs.order)) ? Number(attrs.order) : (Number(base?.order) || 0);
                const depth = Number.isFinite(Number(attrs.depth)) ? Number(attrs.depth) : (Number(base?.depth) || 0);
                entries.push({
                  ...(base || {}),
                  name,
                  position,
                  order,
                  depth,
                  enabled: true,
                  content
                });
              }
              return entries;
            };

            const resolveAutoWorldBookEntries = async (entries) => {
              if (!Array.isArray(entries) || !entries.length) return [];
              if (!window.ST_API?.prompt?.buildRequest) return entries;

              const entryMap = new Map(entries.map(e => [String(e.index), e]));
              const taggedEntries = entries.map((e, i) => {
                const name = escapeAttr(e?.name || `条目${i + 1}`);
                const position = escapeAttr(e?.position || 'outlet');
                const order = Number(e?.order ?? 0);
                const depth = Number(e?.depth ?? 0);
                const index = Number.isFinite(Number(e?.index)) ? Number(e.index) : i;
                const tagOpen = `<WTL_WB_ENTRY name="${name}" position="${position}" order="${order}" depth="${depth}" index="${index}">`;
                const tagClose = `</WTL_WB_ENTRY>`;
                return {
                  ...e,
                  index,
                  enabled: e?.enabled !== false,
                  content: `${tagOpen}\n${e?.content || ''}\n${tagClose}`
                };
              });

              const tempBook = { name: `WTL_AUTO_${Date.now()}`, entries: taggedEntries };

              try {
                const res = await window.ST_API.prompt.buildRequest({ worldBook: { replace: tempBook } });
                const text = Array.isArray(res?.chatCompletionMessages)
                  ? res.chatCompletionMessages.map(m => m?.content || '').join('\n')
                  : (res?.textPrompt || '');
                const extracted = extractWorldBookEntriesFromText(text, entryMap);
                return extracted.length ? extracted : entries;
              } catch (e) {
                console.warn('[WorldTreeLibrary] auto worldBook resolve failed', e);
                return entries;
              }
            };

            const buildReferenceBundle = async (overrideChat = null) => {
              let characterData = null;
              try {
                const ctx = window.SillyTavern?.getContext?.();
                const characterId = ctx?.characterId;
                const currentChar = characterId !== undefined && characterId !== null
                  ? (ctx?.characters?.[characterId] ?? ctx?.characters?.[Number(characterId)])
                  : null;
                const avatarFile = currentChar?.avatar || '';
                const nameFromAvatar = avatarFile.endsWith('.png') ? avatarFile.replace(/\.png$/i, '') : avatarFile;
                const characterName = currentChar?.name || nameFromAvatar;

                if (characterName) {
                  const character = await window.ST_API.character.get({ name: characterName });
                  characterData = character.character;
                }
              } catch (e) {
                console.warn('[WorldTreeLibrary] character.get skipped', e);
              }

              let chat = overrideChat;
              if (!chat) {
                try {
                  chat = await window.ST_API.chatHistory.list({
                    format: 'openai',
                    mediaFormat: 'url',
                    includeSwipes: false
                  });
                  if (!chat?.messages?.length) {
                    chat = await window.ST_API.chatHistory.list({
                      format: 'gemini',
                      mediaFormat: 'url',
                      includeSwipes: false
                    });
                  }
                } catch (e) {
                  chat = await window.ST_API.chatHistory.list({
                    format: 'gemini',
                    mediaFormat: 'url',
                    includeSwipes: false
                  });
                }
              }

              const bookName = 'Current Chat';
              const mode = wbModeEl?.value || 'auto';
              const books = [];
              const selectedEntries = [];

              if (mode === 'manual') {
                const manual = getManualConfig();

                for (const b of manual.books || []) {
                  if (!b?.name || !b.selected) continue;
                  const scope = b.scope || 'global';
                  let fullEntries = [];
                  try {
                    const res = await window.ST_API.worldBook.get({ name: b.name, scope });
                    if (res?.worldBook) books.push(res.worldBook);
                    fullEntries = res?.worldBook?.entries || [];
                  } catch (e) {
                    console.warn('[WorldTreeLibrary] worldBook.get manual failed', e);
                  }

                  const entryMap = new Map();
                  for (const e of b?.entries || []) {
                    if (!e) continue;
                    const idx = typeof e.index === 'number' ? e.index : undefined;
                    if (idx === undefined) continue;
                    entryMap.set(idx, e);
                  }

                  const useAll = !!b.includeAll;
                  for (const entry of fullEntries) {
                    const cfg = entryMap.get(entry.index);
                    if (!useAll && !cfg?.selected) continue;
                    if (!cfg && useAll) {
                      selectedEntries.push(entry);
                      continue;
                    }
                    if (!cfg) continue;
                    const cfgOverride = cfg.override || {};
                    const pick = (key, fallback) => (cfg[key] ?? cfgOverride[key] ?? fallback);
                    const pickNum = (key, fallback) => {
                      const val = cfg[key] ?? cfgOverride[key];
                      return typeof val === 'number' ? val : fallback;
                    };
                    selectedEntries.push({
                      ...entry,
                      ...cfgOverride,
                      name: cfg.name || entry.name,
                      content: cfg.content || entry.content,
                      enabled: pick('enabled', entry.enabled),
                      activationMode: pick('activationMode', entry.activationMode),
                      key: pick('key', entry.key),
                      secondaryKey: pick('secondaryKey', entry.secondaryKey),
                      selectiveLogic: pick('selectiveLogic', entry.selectiveLogic),
                      role: pick('role', entry.role),
                      caseSensitive: pick('caseSensitive', entry.caseSensitive),
                      excludeRecursion: pick('excludeRecursion', entry.excludeRecursion),
                      preventRecursion: pick('preventRecursion', entry.preventRecursion),
                      probability: pickNum('probability', entry.probability),
                      position: pick('position', entry.position),
                      order: pickNum('order', entry.order),
                      depth: pickNum('depth', entry.depth),
                      other: { ...(entry.other || {}), ...(cfgOverride.other || {}), ...(cfg.other || {}) }
                    });
                  }
                }
              } else {
                const activeBooks = [];
                try {
                  const chatList = await window.ST_API.worldBook.list({ scope: 'chat' });
                  activeBooks.push(...(chatList.worldBooks || []));
                } catch (e) {
                  // ignore
                }
                try {
                  const charList = await window.ST_API.worldBook.list({ scope: 'character' });
                  activeBooks.push(...(charList.worldBooks || []));
                } catch (e) {
                  // ignore
                }

                const seen = new Set();
                for (const b of activeBooks) {
                  if (!b?.name || seen.has(b.name)) continue;
                  seen.add(b.name);
                  try {
                    const res = await window.ST_API.worldBook.get({ name: b.name, scope: b.scope });
                    if (res?.worldBook) books.push(res.worldBook);
                  } catch (e) {
                    console.warn('[WorldTreeLibrary] worldBook.get failed', e);
                  }
                }
              }

              if (!books.length && !selectedEntries.length) {
                try {
                  const res = await window.ST_API.worldBook.get({ name: 'Current Chat', scope: 'chat' });
                  if (res?.worldBook) books.push(res.worldBook);
                } catch (e) {
                  console.warn('[WorldTreeLibrary] worldBook.get fallback failed', e);
                }
              }

              const mergedEntries = selectedEntries.length ? selectedEntries : books.flatMap(b => b.entries || []);
              const resolvedEntries = await resolveAutoWorldBookEntries(mergedEntries);
              const worldBookRes = {
                worldBook: {
                  name: books.map(b => b.name).filter(Boolean).join(', ') || bookName,
                  entries: resolvedEntries
                }
              };
              const bundle = {
                character: characterData,
                chatHistory: chat,
                worldBook: worldBookRes?.worldBook || { name: bookName, entries: [] }
              };
              lastRef = bundle;
              return bundle;
            };

            const formatReferenceText = async (ref) => {
              const character = ref.character || {};
              const desc = character.description || character.charDescription || '';
              const personality = character.personality || character.charPersonality || '';
              const scenario = character.scenario || character.charScenario || '';
              const examples = Array.isArray(character.message) ? character.message.join('\n') : (character.mesExamples || character.mes_example || character.chatExample || '');

              const resolveMacro = async (macro, fallback) => {
                try {
                  const out = await window.ST_API.macros.process({ text: macro });
                  if (out?.ok) return out.text || '';
                } catch (e) {
                  console.warn('[WorldTreeLibrary] macros.process failed', e);
                }
                return fallback || '';
              };

              const charDesc = await resolveMacro('{{description}}', desc);
              const charPersonality = await resolveMacro('{{personality}}', personality);
              const charScenario = await resolveMacro('{{scenario}}', scenario);
              const charExamples = await resolveMacro('{{mesExamples}}', examples);
              const charDepth = await resolveMacro('{{charDepthPrompt}}', character.charDepthPrompt || '');

              const formatChatHistory = (messages) => {
                if (!Array.isArray(messages)) return '';
                return messages
                  .map((m) => {
                    const role = m.role || 'unknown';
                    if (typeof m.content === 'string' && m.content.trim()) return `[${role}] ${m.content}`;
                    if (Array.isArray(m.parts)) {
                      const text = m.parts.map(p => ('text' in p ? p.text : '')).join(' ').trim();
                      return text ? `[${role}] ${text}` : '';
                    }
                    return '';
                  })
                  .filter(Boolean)
                  .join('\n');
              };

              let personaText = '';
              try {
                const personaOut = await window.ST_API.macros.process({ text: '{{persona}}' });
                if (personaOut?.ok) personaText = personaOut.text || '';
              } catch (e) {
                console.warn('[WorldTreeLibrary] persona macro failed', e);
              }

              const formatWorldBookEntries = (entries, position) => {
                if (!Array.isArray(entries)) return '';
                const baseName = entryEl?.value || 'WorldTreeMemory';
                const excludeNames = new Set([`${baseName}__table`, `${baseName}__instruction`]);
                const tableContent = (tableMdEl?.value || '').trim();
                const instructionContent = (instructionEl?.value || '').trim();
                return entries
                  .filter(e => e && e.enabled !== false && !excludeNames.has(e.name))
                  .filter(e => {
                    const content = (e.content || '').trim();
                    if (!content) return false;
                    if (tableContent && content === tableContent) return false;
                    if (instructionContent && content === instructionContent) return false;
                    return true;
                  })
                  .filter(e => (position ? e.position === position : true))
                  .slice()
                  .sort((a, b) => {
                    if (a.position === 'fixed' && b.position === 'fixed') {
                      const da = Number(a.depth ?? 0);
                      const db = Number(b.depth ?? 0);
                      if (da !== db) return da - db;
                    }
                    return Number(a.order ?? 0) - Number(b.order ?? 0);
                  })
                  .map((e) => {
                    const entryHeader = `【${e.name || '条目'}】`;
                    const content = (e.content || '').trim();
                    if (!content) return '';
                    return `${entryHeader}\n${content}`.trim();
                  })
                  .filter(Boolean)
                  .join('\n\n');
              };

              const characterBlocks = [
                { id: 'character_desc', label: '角色卡-描述', text: charDesc },
                { id: 'character_personality', label: '角色卡-性格', text: charPersonality },
                { id: 'character_scenario', label: '角色卡-场景', text: charScenario },
                { id: 'character_examples', label: '角色卡-示例对话', text: charExamples },
                { id: 'character_depth', label: '角色卡-深度提示', text: charDepth }
              ];

              const personaBlock = { id: 'persona', label: '用户信息', text: personaText };
              const chatBlock = { id: 'chat', label: '聊天记录', text: formatChatHistory(ref.chatHistory.messages) };

              const worldBookPositions = [
                { id: 'wb_beforeChar', label: '世界书-角色定义之前', position: 'beforeChar' },
                { id: 'wb_afterChar', label: '世界书-角色定义之后', position: 'afterChar' },
                { id: 'wb_beforeEm', label: '世界书-示例消息之前', position: 'beforeEm' },
                { id: 'wb_afterEm', label: '世界书-示例消息之后', position: 'afterEm' },
                { id: 'wb_beforeAn', label: '世界书-作者注释之前', position: 'beforeAn' },
                { id: 'wb_afterAn', label: '世界书-作者注释之后', position: 'afterAn' },
                { id: 'wb_fixed', label: '世界书-固定深度', position: 'fixed' },
                { id: 'wb_outlet', label: '世界书-Outlet', position: 'outlet' }
              ].map((p) => ({
                id: p.id,
                label: p.label,
                text: formatWorldBookEntries(ref.worldBook.entries, p.position)
              }));

              const refBlockEls = Array.from(refBlockListEl?.querySelectorAll('.wtl-block') || []);
              const customRefBlocks = refBlockEls
                .filter(el => (el.dataset.type || '') === 'custom')
                .map(el => ({
                  id: el.dataset.id || '',
                  label: el.dataset.label || '自定义提示词',
                  text: el.dataset.content || ''
                }))
                .filter(b => b.id);

              const refMap = new Map([
                ['persona', personaBlock],
                ...characterBlocks.map(b => [b.id, b]),
                ...worldBookPositions.map(b => [b.id, b]),
                ...customRefBlocks.map(b => [b.id, b])
              ]);

              const wrapperMap = new Map(refBlockEls.map(el => [
                el.dataset.id || '',
                {
                  prefix: el.dataset.prefix || '',
                  suffix: el.dataset.suffix || '',
                  usePrefix: (el.dataset.usePrefix ?? (el.dataset.prefix ? 'true' : 'false')) === 'true',
                  useSuffix: (el.dataset.useSuffix ?? (el.dataset.suffix ? 'true' : 'false')) === 'true'
                }
              ]));

              const refOrder = refBlockEls.map((el) => el.dataset.id || '').filter(Boolean);
              const baseRefBlocks = getRefBlocksPreset() || [];
              const labelToId = new Map(baseRefBlocks.map(b => [b.label, b.id]));
              const refOrderPreset = getRefOrderPreset();
              const fallbackOrder = (refOrderPreset || []).map(label => labelToId.get(label)).filter(Boolean);
              const order = refOrder.length ? refOrder : (fallbackOrder.length ? fallbackOrder : baseRefBlocks.map(b => b.id));

              const referenceSections = order
                .map((id) => {
                  const base = refMap.get(id);
                  if (!base) return null;
                  const wrap = wrapperMap.get(id);
                  if (!wrap) return base;
                  const wrappedText = `${wrap.usePrefix ? wrap.prefix : ''}${base.text || ''}${wrap.useSuffix ? wrap.suffix : ''}`;
                  return { ...base, text: wrappedText };
                })
                .filter(Boolean)
                .filter(b => (b.text || '').trim());

              const referenceBlock = {
                id: 'reference',
                label: '参考信息',
                text: referenceSections.map(b => `【${b.label}】\n${b.text}`).join('\n\n')
              };

              return [referenceBlock, chatBlock, personaBlock, ...characterBlocks, ...worldBookPositions];
            };

            const buildTemplatePrompt = (tpl) => {
              const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
              if (!sections.length) return schemaEl?.value || '';

              const normalizeLines = (text) => (text || '').split('\n').map(line => line.trim()).filter(Boolean);
              const formatList = (text, indent = '') => {
                const lines = normalizeLines(text);
                if (!lines.length) return '';
                return lines.map(line => (line.startsWith('-') ? `${indent}${line}` : `${indent}- ${line}`)).join('\n');
              };
              const formatRuleBlock = (label, text) => {
                const list = formatList(text);
                if (!list) return '';
                return `【${label}】:\n${list}`;
              };
              const formatColumnRule = (label, text) => {
                const lines = normalizeLines(text);
                if (!lines.length) return [];
                const first = `    - ${label}：${lines[0]}`;
                const rest = lines.slice(1).map(line => `      ${line}`);
                return [first, ...rest];
              };

              return sections.map((sec, idx) => {
                const name = (sec?.name || '').trim() || '未命名';
                const definition = (sec?.definition || '').trim();
                const header = `# ${idx + 1}_${name}${definition ? `：${definition}` : ''}`;
                const parts = [header];

                const insertBlock = formatRuleBlock('增加条件', sec?.insertRule);
                if (insertBlock) parts.push(insertBlock);
                const updateBlock = formatRuleBlock('修改条件', sec?.updateRule);
                if (updateBlock) parts.push(updateBlock);
                const deleteBlock = formatRuleBlock('删除条件', sec?.deleteRule);
                if (deleteBlock) parts.push(deleteBlock);

                const columns = Array.isArray(sec?.columns) ? sec.columns : [];
                if (columns.length) {
                  const fieldLines = ['【字段详解】'];
                  columns.forEach((col, colIdx) => {
                    const colName = (col?.name || '').trim() || '未命名';
                    const colDef = (col?.definition || '').trim();
                    fieldLines.push(`[${colIdx + 1}_${colName}]${colDef ? `：${colDef}` : ''}`);

                    const colInsert = formatColumnRule('增加条件', col?.insertRule);
                    const colUpdate = formatColumnRule('编辑条件', col?.updateRule);
                    const colDelete = formatColumnRule('删除条件', col?.deleteRule);
                    [...colInsert, ...colUpdate, ...colDelete].forEach(line => fieldLines.push(line));
                  });
                  parts.push(fieldLines.join('\n'));
                }

                const body = parts.join('\n');
                return `<${name}_模板>\n${body}\n<${name}_模板>`;
              }).join('\n\n');
            };

            const buildPrompt = (refTextBlocks) => {
              const blockEls = Array.from(blockListEl?.querySelectorAll('.wtl-block') || []);
              const refMap = new Map(refTextBlocks.map(b => [b.id, b]));
              const outputs = [];

              const filterHiddenRowsFromMarkdown = (md, fillableOnly = false, sendableOnly = false) => {
                const raw = stripTableWrapper(md || '');
                const lines = raw.split('\n');
                let sectionIndex = 0;
                let inSection = false;
                let skipSection = false;
                let headerLine = null;
                let sepLine = null;
                const out = [];
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const headerMatch = /^##\s+(.+)$/.exec(line.trim());
                  if (headerMatch) {
                    sectionIndex += 1;
                    inSection = true;
                    skipSection = false;
                    headerLine = null;
                    sepLine = null;
                    const meta = templateState?.sections?.[sectionIndex - 1];
                    if (fillableOnly && meta && meta.fillable === false) {
                      skipSection = true;
                      inSection = false;
                      continue;
                    }
                    if (sendableOnly && meta && meta.sendable === false) {
                      skipSection = true;
                      inSection = false;
                      continue;
                    }
                    out.push(line);
                    continue;
                  }
                  if (skipSection) continue;
                  if (!inSection) {
                    out.push(line);
                    continue;
                  }
                  if (line.trim().startsWith('|')) {
                    if (!headerLine) {
                      headerLine = line;
                      out.push(line);
                      continue;
                    }
                    if (!sepLine) {
                      sepLine = line;
                      out.push(line);
                      continue;
                    }
                    const rowIndex = Math.max(1, out.filter(l => l.trim().startsWith('|')).length - 2);
                    const hidden = Boolean(hiddenRows?.[String(sectionIndex)]?.[String(rowIndex)]);
                    if (!hidden) out.push(line);
                    continue;
                  }
                  out.push(line);
                }
                return wrapTable(out.join('\n').trim());
              };

              blockEls.forEach((el) => {
                if (el.dataset.hidden === 'true') return;
                const type = el.dataset.type || '';
                const id = el.dataset.id || '';
                const prefix = el.dataset.prefix || '';
                const suffix = el.dataset.suffix || '';
                const usePrefix = (el.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
                const useSuffix = (el.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
                let content = '';
                if (type === 'preprompt') content = prePromptEl?.value || '';
                if (type === 'instruction') content = instructionEl?.value || '';
                if (type === 'schema') content = buildTemplatePrompt(templateState) || schemaEl?.value || '';
                if (type === 'table') content = filterHiddenRowsFromMarkdown(tableMdEl?.value || '', true, true);
                if (type === 'custom') content = el.dataset.content || '';
                if (['reference','chat','persona','character','worldBook'].includes(type)) {
                  content = refMap.get(id)?.text || '';
                }
                const wrapped = `${usePrefix ? prefix : ''}${content}${useSuffix ? suffix : ''}`;
                if ((wrapped || '').trim()) outputs.push(wrapped);
              });
              return outputs.join('\n\n');
            };

            const callOpenAI = async (promptText) => {
              const baseUrl = openaiUrlEl?.value || '';
              const apiKey = openaiKeyEl?.value || '';
              const model = openaiModelEl?.value || '';
              const temperature = Number(openaiTempEl?.value || 0.7);
              const maxTokens = Number(openaiMaxEl?.value || 1024);
              if (!baseUrl || !apiKey || !model) throw new Error('请先配置 OpenAI URL/Key/模型');

              const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model,
                  temperature,
                  max_tokens: maxTokens,
                  messages: [
                    { role: 'user', content: promptText }
                  ]
                })
              });
              const data = await res.json();
              return data?.choices?.[0]?.message?.content || '';
            };

            const callAi = async (promptText) => {
              const sendMode = sendModeEl?.value || 'st';
              if (logContentEl && logPromptBtn?.dataset?.active === 'true') logContentEl.value = promptText || '';
              if (sendMode === 'external') {
                const aiText = await callOpenAI(promptText);
                if (logContentEl && logAiBtn?.dataset?.active === 'true') logContentEl.value = aiText || '';
                return aiText;
              }
              const res = await window.ST_API.prompt.generate({
                writeToChat: false,
                timeoutMs: 60000,
                extraBlocks: [
                  { role: 'user', content: promptText }
                ]
              });
              const text = res.text || '';
              if (logContentEl && logAiBtn?.dataset?.active === 'true') logContentEl.value = text;
              return text;
            };

            const buildHistoryItem = (index, item, total) => {
              const title = document.createElement('div');
              title.className = 'wtl-row';
              title.style.justifyContent = 'space-between';
              const label = document.createElement('div');
              label.textContent = `历史记录 #${index + 1}/${total}`;
              const time = document.createElement('div');
              time.className = 'wtl-editor-hint';
              time.textContent = item?.time ? new Date(item.time).toLocaleString() : '';
              title.appendChild(label);
              title.appendChild(time);
              return title;
            };

            const openHistoryModal = () => {
              const list = JSON.parse(localStorage.getItem(getHistoryKey()) || '[]');
              const total = list.length;
              let idx = Number(localStorage.getItem(getHistoryIndexKey()) || total - 1);
              if (!Number.isFinite(idx) || idx < 0) idx = total - 1;
              if (idx >= total) idx = total - 1;
              const render = () => {
                const item = list[idx];
                const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
                if (modalCustomEl) {
                  modalCustomEl.innerHTML = '';
                  modalCustomEl.appendChild(buildHistoryItem(idx, item, total));
                }
                modalContentEl.value = md || '';
                modalContentEl.readOnly = true;
              };
              const prevBtn = document.createElement('button');
              prevBtn.className = 'menu_button';
              prevBtn.textContent = '上一个';
              prevBtn.addEventListener('click', () => {
                if (idx > 0) { idx -= 1; render(); }
              });
              const nextBtn = document.createElement('button');
              nextBtn.className = 'menu_button';
              nextBtn.textContent = '下一个';
              nextBtn.addEventListener('click', () => {
                if (idx < total - 1) { idx += 1; render(); }
              });
              const restoreBtn = document.createElement('button');
              restoreBtn.className = 'menu_button';
              restoreBtn.textContent = '恢复此版本';
              restoreBtn.addEventListener('click', async () => {
                const item = list[idx];
                const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
                if (tableMdEl) tableMdEl.value = md || '';
                const json = item?.tableJson || parseMarkdownTableToJson(md || '');
                hiddenRows = json.hiddenRows || {};
                renderPreview(md || '');
                await saveState();
                localStorage.setItem(getHistoryIndexKey(), String(idx));
                closeModal();
              });
              const closeBtn = document.createElement('button');
              closeBtn.className = 'menu_button';
              closeBtn.textContent = '关闭';
              closeBtn.addEventListener('click', closeModal);
              const actions = [prevBtn, nextBtn, restoreBtn, closeBtn];
              openModal('回溯表格', '', actions, () => {
                if (modalCustomEl) modalCustomEl.appendChild(buildHistoryItem(idx, list[idx], total));
              });
              render();
            };

            const restoreHistoryByOffset = async (delta) => {
              const list = JSON.parse(localStorage.getItem(getHistoryKey()) || '[]');
              const total = list.length;
              if (!total) {
                setStatus('无历史可回溯');
                return;
              }

              let idx = Number(localStorage.getItem(getHistoryIndexKey()) || total - 1);
              if (!Number.isFinite(idx) || idx < 0) idx = total - 1;
              if (idx >= total) idx = total - 1;

              const next = Math.max(0, Math.min(total - 1, idx + delta));
              if (next === idx) {
                setStatus(delta < 0 ? '已是最早版本' : '已是最新版本');
                return;
              }

              const item = list[next];
              const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
              if (tableMdEl) tableMdEl.value = md || '';
              const json = item?.tableJson || parseMarkdownTableToJson(md || '');
              hiddenRows = json.hiddenRows || {};
              renderPreview(md || '');
              await saveState();
              localStorage.setItem(getHistoryIndexKey(), String(next));
              setStatus(delta < 0 ? '已回退' : '已撤销回退');
            };

            const getChatMessagesSlice = (messages, start, end) => {
              if (!Array.isArray(messages)) return [];
              const s = Math.max(1, start || 1);
              const e = Math.min(messages.length, end || messages.length);
              const slice = messages.slice(s - 1, e);
              return slice;
            };

            const buildBatchChatOverride = async (start, end) => {
              const chat = await window.ST_API.chatHistory.list({
                format: 'openai',
                mediaFormat: 'url',
                includeSwipes: false
              }).catch(async () => {
                return window.ST_API.chatHistory.list({
                  format: 'gemini',
                  mediaFormat: 'url',
                  includeSwipes: false
                });
              });
              const messages = chat?.messages || [];
              const slice = getChatMessagesSlice(messages, start, end);
              return { ...chat, messages: slice };
            };

            const runBatchFill = async () => {
              const start = Number(batchStartEl?.value || 1);
              const end = Number(batchEndEl?.value || 1);
              const step = Math.max(1, Number(batchStepEl?.value || 1));
              if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1 || end < start) {
                setStatus('批量参数无效');
                return;
              }
              const totalBatches = Math.ceil((end - start + 1) / step);
              for (let i = 0; i < totalBatches; i++) {
                const s = start + i * step;
                const e = Math.min(end, s + step - 1);
                setStatus(`批量填表中 (${s}-${e})`);
                const override = await buildBatchChatOverride(s, e);
                await runFillOnce(override);
              }
              setStatus('批量完成');
            };

            const refreshModels = async () => {
              const baseUrl = openaiUrlEl?.value || '';
              const apiKey = openaiKeyEl?.value || '';
              if (!baseUrl || !apiKey) throw new Error('请先填写 OpenAI URL/Key');
              const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
              });
              const data = await res.json();
              const models = (data.data || []).map(m => m.id).sort();
              if (openaiModelEl) {
                openaiModelEl.innerHTML = models.map(id => `<option value="${id}">${id}</option>`).join('');
                if (models[0]) openaiModelEl.value = models[0];
              }
            };

            const parseCommands = (text) => {
              const raw = (text || '')
                .replace(/<WTL_TableEdit>/g, '')
                .replace(/<\/WTL_TableEdit>/g, '')
                .trim();

              const splitTopLevel = (input) => {
                const s = (input || '').trim();
                const out = [];
                let cur = '';
                let depth = 0;
                let quote = null;
                let prev = '';
                for (let i = 0; i < s.length; i++) {
                  const ch = s[i];
                  if (quote) {
                    cur += ch;
                    if (ch === quote && prev !== '\\') quote = null;
                    prev = ch;
                    continue;
                  }
                  if (ch === '"' || ch === "'") {
                    quote = ch;
                    cur += ch;
                    prev = ch;
                    continue;
                  }
                  if (ch === '(') {
                    depth += 1;
                    cur += ch;
                    prev = ch;
                    continue;
                  }
                  if (ch === ')' && depth > 0) {
                    depth -= 1;
                    cur += ch;
                    prev = ch;
                    continue;
                  }
                  if (ch === ',' && depth === 0) {
                    const part = cur.trim();
                    if (part) out.push(part);
                    cur = '';
                    prev = ch;
                    continue;
                  }
                  cur += ch;
                  prev = ch;
                }
                const last = cur.trim();
                if (last) out.push(last);
                return out;
              };

              const unquote = (v) => {
                const t = (v ?? '').toString().trim();
                if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
                  return t.slice(1, -1);
                }
                return t;
              };

              const parseBool = (v) => {
                const t = (v ?? '').toString().trim().toLowerCase();
                if (['true', '1', 'yes', 'y'].includes(t)) return true;
                if (['false', '0', 'no', 'n'].includes(t)) return false;
                return null;
              };

              const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
              const cmds = [];

              for (const line of lines) {
                const m = /^(update|delete|insert|hide|move)\[(.*)\]$/.exec(line);
                if (!m) continue;
                const type = m[1];
                const args = splitTopLevel(m[2]).map(a => a.trim()).filter(Boolean);

                const sIdx = parseInt(args[0], 10);
                const rIdx = parseInt(args[1], 10);
                if (!Number.isFinite(sIdx) || sIdx < 1) continue;

                if (type === 'update') {
                  if (!Number.isFinite(rIdx) || rIdx < 1) continue;
                  const cells = [];
                  for (const token of args.slice(2)) {
                    // 兼容：2:苹果 / 2(苹果) / 2("a,b")
                    let mm = /^(\d+)\s*:\s*(.+)$/.exec(token);
                    if (mm) {
                      const col = parseInt(mm[1], 10);
                      const value = unquote(mm[2]);
                      if (Number.isFinite(col) && col >= 1) cells.push({ col, value });
                      continue;
                    }
                    mm = /^(\d+)\s*\(\s*([\s\S]*)\s*\)$/.exec(token);
                    if (mm) {
                      const col = parseInt(mm[1], 10);
                      const value = unquote(mm[2]);
                      if (Number.isFinite(col) && col >= 1) cells.push({ col, value });
                    }
                  }
                  if (!cells.length) continue;
                  cmds.push({ type: 'update', section: sIdx, row: rIdx, cells });
                  continue;
                }

                if (type === 'delete') {
                  if (!Number.isFinite(rIdx) || rIdx < 1) continue;
                  cmds.push({ type: 'delete', section: sIdx, row: rIdx });
                  continue;
                }

                if (type === 'insert') {
                  if (!Number.isFinite(rIdx) || rIdx < 1) continue;

                  const cells = [];
                  let sawCell = false;
                  const positional = [];

                  for (const token of args.slice(2)) {
                    // 兼容：2:苹果 / 2(苹果) / 2("a,b")
                    let mm = /^(\d+)\s*:\s*(.+)$/.exec(token);
                    if (mm) {
                      const col = parseInt(mm[1], 10);
                      const value = unquote(mm[2]);
                      if (Number.isFinite(col) && col >= 1) {
                        cells.push({ col, value });
                        sawCell = true;
                      }
                      continue;
                    }

                    mm = /^(\d+)\s*\(\s*([\s\S]*)\s*\)$/.exec(token);
                    if (mm) {
                      const col = parseInt(mm[1], 10);
                      const value = unquote(mm[2]);
                      if (Number.isFinite(col) && col >= 1) {
                        cells.push({ col, value });
                        sawCell = true;
                      }
                      continue;
                    }

                    positional.push(unquote(token));
                  }

                  if (sawCell) {
                    cmds.push({ type: 'insert', section: sIdx, row: rIdx, cells });
                  } else {
                    cmds.push({ type: 'insert', section: sIdx, row: rIdx, values: positional });
                  }
                  continue;
                }

                if (type === 'hide') {
                  if (!Number.isFinite(rIdx) || rIdx < 1) continue;
                  const b = parseBool(args[2]);
                  if (b === null) continue;
                  cmds.push({ type: 'hide', section: sIdx, row: rIdx, hidden: b });
                  continue;
                }

                if (type === 'move') {
                  const from = rIdx;
                  const to = parseInt(args[2], 10);
                  if (!Number.isFinite(from) || from < 1 || !Number.isFinite(to) || to < 1) continue;
                  cmds.push({ type: 'move', section: sIdx, from, to });
                  continue;
                }
              }
              return cmds;
            };

            const applyCommands = (md, cmds) => {
              const data = parseMarkdownTableToJson(md);
              data.sections = Array.isArray(data.sections) ? data.sections : [];
              const fillableSections = Array.isArray(templateState?.sections) ? templateState.sections : [];

              const ensureRow = (section, rowIndex) => {
                section.columns = Array.isArray(section.columns) ? section.columns : [];
                section.rows = Array.isArray(section.rows) ? section.rows : [];
                const cols = section.columns;
                const rows = section.rows;
                while (rows.length < rowIndex) rows.push(cols.map(() => ''));
                if (!Array.isArray(rows[rowIndex - 1])) rows[rowIndex - 1] = cols.map(() => '');
                return rows[rowIndex - 1];
              };

              const sectionKey = (sectionIndex) => String(sectionIndex);
              hiddenRows = hiddenRows && typeof hiddenRows === 'object' ? hiddenRows : {};

              const setHidden = (sectionIndex, rowIndex, hidden) => {
                const sk = sectionKey(sectionIndex);
                if (!hiddenRows[sk] || typeof hiddenRows[sk] !== 'object') hiddenRows[sk] = {};
                hiddenRows[sk][String(rowIndex)] = Boolean(hidden);
              };

              const isHidden = (sectionIndex, rowIndex) => {
                const sk = sectionKey(sectionIndex);
                return Boolean(hiddenRows?.[sk]?.[String(rowIndex)]);
              };

              for (const cmd of cmds) {
                const sectionIndex = Number(cmd.section);
                if (!Number.isFinite(sectionIndex) || sectionIndex < 1) continue;
                const meta = fillableSections[sectionIndex - 1];
                if (meta && meta.fillable === false) continue;
                const section = data.sections[sectionIndex - 1];
                if (!section) continue;
                section.columns = Array.isArray(section.columns) ? section.columns : [];
                section.rows = Array.isArray(section.rows) ? section.rows : [];
                const rows = section.rows;

                if (cmd.type === 'update') {
                  const rowIndex = Number(cmd.row);
                  if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
                  const row = ensureRow(section, rowIndex);
                  (cmd.cells || []).forEach(({ col, value }) => {
                    const colIndex = Number(col);
                    if (!Number.isFinite(colIndex) || colIndex < 1) return;
                    row[colIndex - 1] = (value ?? '').toString();
                  });
                }

                if (cmd.type === 'delete') {
                  const rowIndex = Number(cmd.row);
                  if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
                  if (rows[rowIndex - 1]) rows.splice(rowIndex - 1, 1);
                  // 删除后隐藏索引可能错位：清空该 section 的隐藏映射
                  const sk = sectionKey(sectionIndex);
                  if (hiddenRows[sk]) hiddenRows[sk] = {};
                }

                if (cmd.type === 'insert') {
                  const rowIndex = Number(cmd.row);
                  if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;

                  section.columns = Array.isArray(section.columns) ? section.columns : [];
                  const normalizedCols = section.columns;

                  const ensureColumns = (n) => {
                    if (normalizedCols.length) return;
                    const count = Math.max(1, Number(n) || 1);
                    section.columns = Array.from({ length: count }, (_, i) => `列${i + 1}`);
                  };

                  let filled = [];

                  if (Array.isArray(cmd.cells) && cmd.cells.length) {
                    const maxCol = cmd.cells.reduce((m, c) => Math.max(m, Number(c?.col) || 0), 0);
                    ensureColumns(maxCol);
                    const colsNow = section.columns;
                    filled = colsNow.map(() => '-');
                    cmd.cells.forEach(({ col, value }) => {
                      const colIndex = Number(col);
                      if (!Number.isFinite(colIndex) || colIndex < 1) return;
                      if (colIndex > filled.length) {
                        // 若列数不足，扩展列并补齐
                        while (section.columns.length < colIndex) section.columns.push(`列${section.columns.length + 1}`);
                        while (filled.length < colIndex) filled.push('-');
                      }
                      filled[colIndex - 1] = (value ?? '').toString();
                    });
                  } else {
                    const values = Array.isArray(cmd.values) ? cmd.values.map(v => (v ?? '').toString().trim()) : [];
                    ensureColumns(values.length);
                    filled = section.columns.map((_, i) => values[i] ?? '');
                  }

                  if (rowIndex >= 1 && rowIndex <= rows.length + 1) rows.splice(rowIndex - 1, 0, filled);
                  else rows.push(filled);

                  // 插入后隐藏索引可能错位：清空该 section 的隐藏映射
                  const sk = sectionKey(sectionIndex);
                  if (hiddenRows[sk]) hiddenRows[sk] = {};
                }

                if (cmd.type === 'hide') {
                  const rowIndex = Number(cmd.row);
                  if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
                  setHidden(sectionIndex, rowIndex, Boolean(cmd.hidden));
                }

                if (cmd.type === 'move') {
                  const from = Number(cmd.from);
                  const to = Number(cmd.to);
                  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) continue;
                  if (!rows[from - 1] || !rows[to - 1]) continue;
                  const tmp = rows[from - 1];
                  rows[from - 1] = rows[to - 1];
                  rows[to - 1] = tmp;
                  // 交换后隐藏映射也要交换
                  const fromHidden = isHidden(sectionIndex, from);
                  const toHidden = isHidden(sectionIndex, to);
                  setHidden(sectionIndex, from, toHidden);
                  setHidden(sectionIndex, to, fromHidden);
                }
              }

              return renderJsonToMarkdown(data);
            };

            const syncTableInjection = async () => {
              if (!window.ST_API?.worldBook) return;
              const enabled = Boolean(tableInjectToggleBtn?.checked);
              const baseName = entryEl?.value || 'WorldTreeMemory';
              const entryName = `${baseName}__table`;
              const content = getTablePreviewForSend(tableMdEl?.value || '');
              const position = tablePosEl?.value || defaults.tablePos;
              const role = tableRoleEl?.value || defaults.tableRole;
              const depth = Number(tableDepthEl?.value || defaults.tableDepth);
              const order = Number(tableOrderEl?.value || defaults.tableOrder);
              const bookName = 'Current Chat';
              const scope = 'chat';

              let book = null;
              try {
                const res = await window.ST_API.worldBook.get({ name: bookName, scope });
                book = res?.worldBook || null;
              } catch (e) {
                console.warn('[WorldTreeLibrary] worldBook.get failed', e);
                return;
              }
              if (!book) return;

              const existing = (book.entries || []).find(e => e?.name === entryName);
              if (!enabled) {
                if (existing) {
                  await window.ST_API.worldBook.updateEntry({
                    name: bookName,
                    scope,
                    index: existing.index,
                    patch: { enabled: false }
                  });
                }
                return;
              }

              const patch = {
                name: entryName,
                content,
                enabled: true,
                activationMode: 'always',
                position,
                role,
                depth: Number.isFinite(depth) ? depth : Number(defaults.tableDepth || 4),
                order: Number.isFinite(order) ? order : Number(defaults.tableOrder || 0)
              };

              if (!existing) {
                await window.ST_API.worldBook.createEntry({
                  name: bookName,
                  scope,
                  entry: patch
                });
                return;
              }

              await window.ST_API.worldBook.updateEntry({
                name: bookName,
                scope,
                index: existing.index,
                patch
              });
            };

            const syncInstructionInjection = async () => {
              if (!window.ST_API?.worldBook) return;
              const enabled = Boolean(instInjectToggleEl?.checked);
              const baseName = entryEl?.value || 'WorldTreeMemory';
              const entryName = `${baseName}__instruction`;
              const content = (instructionEl?.value || '').trim();
              const position = instPosEl?.value || defaults.instPos;
              const role = instRoleEl?.value || defaults.instRole;
              const depth = Number(instDepthEl?.value || defaults.instDepth);
              const order = Number(instOrderEl?.value || defaults.instOrder);
              const bookName = 'Current Chat';
              const scope = 'chat';

              let book = null;
              try {
                const res = await window.ST_API.worldBook.get({ name: bookName, scope });
                book = res?.worldBook || null;
              } catch (e) {
                console.warn('[WorldTreeLibrary] worldBook.get failed', e);
                return;
              }
              if (!book) return;

              const existing = (book.entries || []).find(e => e?.name === entryName);
              if (!enabled) {
                if (existing) {
                  await window.ST_API.worldBook.updateEntry({
                    name: bookName,
                    scope,
                    index: existing.index,
                    patch: { enabled: false }
                  });
                }
                return;
              }

              const patch = {
                name: entryName,
                content,
                enabled: true,
                activationMode: 'always',
                position,
                role,
                depth: Number.isFinite(depth) ? depth : Number(defaults.instDepth || 4),
                order: Number.isFinite(order) ? order : Number(defaults.instOrder || 0)
              };

              if (!existing) {
                await window.ST_API.worldBook.createEntry({
                  name: bookName,
                  scope,
                  entry: patch
                });
                return;
              }

              await window.ST_API.worldBook.updateEntry({
                name: bookName,
                scope,
                index: existing.index,
                patch
              });
            };

            const syncSchemaInjection = async () => {
              if (!window.ST_API?.worldBook) return;
              const enabled = Boolean(schemaInjectToggleEl?.checked);
              const baseName = entryEl?.value || 'WorldTreeMemory';
              const entryName = `${baseName}__schema`;
              const content = (schemaEl?.value || '').trim();
              const position = schemaPosEl?.value || defaults.schemaPos;
              const role = schemaRoleEl?.value || defaults.schemaRole;
              const depth = Number(schemaDepthEl?.value || defaults.schemaDepth);
              const order = Number(schemaOrderEl?.value || defaults.schemaOrder);
              const bookName = 'Current Chat';
              const scope = 'chat';

              let book = null;
              try {
                const res = await window.ST_API.worldBook.get({ name: bookName, scope });
                book = res?.worldBook || null;
              } catch (e) {
                console.warn('[WorldTreeLibrary] worldBook.get failed', e);
                return;
              }
              if (!book) return;

              const existing = (book.entries || []).find(e => e?.name === entryName);
              if (!enabled) {
                if (existing) {
                  await window.ST_API.worldBook.updateEntry({
                    name: bookName,
                    scope,
                    index: existing.index,
                    patch: { enabled: false }
                  });
                }
                return;
              }

              const patch = {
                name: entryName,
                content,
                enabled: true,
                activationMode: 'always',
                position,
                role,
                depth: Number.isFinite(depth) ? depth : Number(defaults.schemaDepth || 4),
                order: Number.isFinite(order) ? order : Number(defaults.schemaOrder || 2)
              };

              if (!existing) {
                await window.ST_API.worldBook.createEntry({
                  name: bookName,
                  scope,
                  entry: patch
                });
                return;
              }

              await window.ST_API.worldBook.updateEntry({
                name: bookName,
                scope,
                index: existing.index,
                patch
              });
            };

            // 记忆表格按聊天窗口保存，不回写世界书

            const ensureHooks = async () => {
              if (window.__wtlHooksInstalled) return;
              window.__wtlHooksInstalled = true;
              await window.ST_API.hooks.install({
                id: 'WorldTreeLibrary.hooks',
                intercept: {
                  targets: ['sendButton', 'sendEnter'],
                  block: { sendButton: true, sendEnter: true },
                  onlyWhenSendOnEnter: true
                },
                broadcast: { target: 'dom' }
              });

              window.addEventListener('st-api-wrapper:intercept', async (e) => {
                const p = e.detail;
                if (p.target !== 'sendButton' && p.target !== 'sendEnter') return;
                const sendMode = sendModeEl?.value || 'st';

                await refreshPromptPreview(true);

                try {
                  await saveState();
                  if (tableInjectToggleBtn?.checked) {
                    await syncTableInjection();
                  }
                  if (instInjectToggleEl?.checked) {
                    await syncInstructionInjection();
                  }
                  if (schemaInjectToggleEl?.checked) {
                    await syncSchemaInjection();
                  }
                } catch (err) {
                  console.warn('[WorldTreeLibrary] inject failed', err);
                }

                if (sendMode !== 'st') {
                  await window.ST_API.hooks.bypassOnce({ id: 'WorldTreeLibrary.hooks', target: 'sendButton' });
                  document.getElementById('send_but')?.click();
                  return;
                }

                try {
                  await window.ST_API.hooks.bypassOnce({ id: 'WorldTreeLibrary.hooks', target: 'sendButton' });
                  document.getElementById('send_but')?.click();
                } catch (err) {
                  console.warn('[WorldTreeLibrary] inject failed', err);
                }
              });
            };

            const bindDrag = (container) => {
              if (!container) return;
              let dragged = null;
              container.addEventListener('dragstart', (e) => {
                const target = e.target;
                if (!target) return;
                if (target.classList.contains('wtl-tab')) {
                  dragged = target;
                  target.classList.add('dragging');
                  return;
                }
                if (target.classList.contains('wtl-chip') || target.classList.contains('wtl-block')) {
                  dragged = target;
                  target.classList.add('dragging');
                }
              });
              container.addEventListener('dragend', () => {
                if (dragged) dragged.classList.remove('dragging');
                dragged = null;
              });
              container.addEventListener('dragover', (e) => {
                e.preventDefault();
                let selector = '.wtl-chip:not(.dragging)';
                let axis = 'y';
                if (dragged?.classList.contains('wtl-block')) {
                  selector = '.wtl-block:not(.dragging)';
                }
                if (dragged?.classList.contains('wtl-tab')) {
                  selector = '.wtl-tab:not(.dragging)';
                  axis = 'x';
                }
                const items = Array.from(container.querySelectorAll(selector));
                const after = items.find((el) => {
                  const rect = el.getBoundingClientRect();
                  return axis === 'x'
                    ? e.clientX < rect.left + rect.width / 2
                    : e.clientY < rect.top + rect.height / 2;
                });
                if (dragged) {
                  if (after) {
                    container.insertBefore(dragged, after);
                  } else {
                    container.appendChild(dragged);
                  }
                }
              });
            };

            const refreshPromptPreview = async (force = false) => {
              if (!logContentEl) return;
              try {
                const ref = force ? await buildReferenceBundle() : (lastRef || await buildReferenceBundle());
                const refBlocks = await formatReferenceText(ref);
                const promptText = buildPrompt(refBlocks);
                localStorage.setItem('wtl.lastPrompt', promptText || '');
                if (logPromptBtn?.dataset?.active === 'true') logContentEl.value = promptText || '';
              } catch (e) {
                console.warn('[WorldTreeLibrary] preview build failed', e);
              }
            };

            openConfigBtn?.addEventListener('click', () => {
              if (pageMainEl) pageMainEl.style.display = 'none';
              if (pageConfigEl) pageConfigEl.style.display = 'block';
              hideTemplateEditor();
            });
            backMainBtn?.addEventListener('click', () => {
              if (pageConfigEl) pageConfigEl.style.display = 'none';
              if (pageMainEl) pageMainEl.style.display = 'block';
              hideTemplateEditor();
            });

            logPromptBtn?.addEventListener('click', async () => {
              if (!logPromptBtn || !logAiBtn || !logContentEl) return;
              logPromptBtn.dataset.active = 'true';
              logAiBtn.dataset.active = 'false';
              const cached = localStorage.getItem('wtl.lastPrompt') || '';
              logContentEl.value = cached;
              await refreshPromptPreview(true);
            });

            // 进入配置页时，如当前显示 prompt 预览，则立即刷新一次
            openConfigBtn?.addEventListener('click', () => {
              if ((sendModeEl?.value || 'st') === 'external' && logPromptBtn?.dataset?.active === 'true') {
                refreshPromptPreview(true);
              }
            });
            logRefreshBtn?.addEventListener('click', async () => {
              if (logPromptBtn?.dataset?.active === 'true') {
                await refreshPromptPreview(true);
                return;
              }
              if (logAiBtn?.dataset?.active === 'true') {
                if (logContentEl) logContentEl.value = localStorage.getItem('wtl.lastAi') || '';
                return;
              }
              await refreshPromptPreview(true);
            });
            refreshSchemaBtn?.addEventListener('click', () => {
              updateSchemaPreview();
              setStatus('模板预览已刷新');
            });
            logAiBtn?.addEventListener('click', () => {
              if (!logPromptBtn || !logAiBtn || !logContentEl) return;
              logPromptBtn.dataset.active = 'false';
              logAiBtn.dataset.active = 'true';
              const cached = localStorage.getItem('wtl.lastAi') || '';
              logContentEl.value = cached;
            });

            const setExternalLeftTab = (tab) => {
              const isOrder = tab === 'order';
              const isRef = tab === 'ref';
              const isWb = tab === 'wb';
              if (externalNavOrderBtn) externalNavOrderBtn.dataset.active = isOrder ? 'true' : 'false';
              if (externalNavRefBtn) externalNavRefBtn.dataset.active = isRef ? 'true' : 'false';
              if (externalNavWbBtn) externalNavWbBtn.dataset.active = isWb ? 'true' : 'false';
              if (externalPanelOrderEl) externalPanelOrderEl.style.display = isOrder ? 'block' : 'none';
              if (externalPanelRefEl) externalPanelRefEl.style.display = isRef ? 'block' : 'none';
              if (externalPanelWbEl) externalPanelWbEl.style.display = isWb ? 'block' : 'none';
            };

            externalNavOrderBtn?.addEventListener('click', () => setExternalLeftTab('order'));
            externalNavRefBtn?.addEventListener('click', () => setExternalLeftTab('ref'));
            externalNavWbBtn?.addEventListener('click', () => setExternalLeftTab('wb'));

            sendModeEl?.addEventListener('change', () => {
              const mode = sendModeEl.value;
              if (stModeEl) stModeEl.style.display = mode === 'st' ? 'block' : 'none';
              if (externalEl) externalEl.style.display = mode === 'external' ? 'block' : 'none';
              if (instBlockEl) instBlockEl.style.display = mode === 'st' ? 'block' : 'none';
              if (mode === 'external') {
                setExternalLeftTab('order');
                refreshPromptPreview(true);
              }
            });

            // 外部模式预览：自动刷新（仅配置页打开时生效）
            let __wtlPreviewTimer = null;
            const ensurePreviewAutoRefresh = () => {
              if (__wtlPreviewTimer) return;
              __wtlPreviewTimer = setInterval(() => {
                const isConfigOpen = pageConfigEl && pageConfigEl.style.display !== 'none';
                const isExternal = (sendModeEl?.value || 'st') === 'external';
                if (!isConfigOpen || !isExternal) return;

                if (logPromptBtn?.dataset?.active === 'true') {
                  refreshPromptPreview(true);
                } else if (logAiBtn?.dataset?.active === 'true') {
                  if (logContentEl) logContentEl.value = localStorage.getItem('wtl.lastAi') || '';
                }
              }, 1500);
            };
            ensurePreviewAutoRefresh();

            if ((sendModeEl?.value || 'st') === 'external') {
              setExternalLeftTab('order');
            }

            schemaModeEl?.addEventListener('change', () => {
              if (!schemaModeEl || !schemaEl) return;
              const nextSchema = loadSchemaForMode(schemaModeEl.value);
              schemaSource = nextSchema;
              templateState = parseSchemaToTemplate(nextSchema);
              templateActiveSectionId = templateState.sections[0]?.id || '';
              schemaEl.value = buildTemplatePrompt(templateState) || nextSchema;
              saveState();
              refreshPromptPreview(true);
            });

            wbModeEl?.addEventListener('change', () => {
              if (wbManualWrapEl) wbManualWrapEl.style.display = wbModeEl.value === 'manual' ? 'block' : 'none';
              if (wbModeEl.value === 'manual') {
                const current = getManualConfig();
                buildManualWorldBookTemplate().then((template) => {
                  const merged = mergeManualConfig(template, current);
                  setManualConfig(merged);
                  renderManualWorldBookUI(merged);
                  saveState();
                  refreshPromptPreview(true);
                });
              } else {
                saveState();
                refreshPromptPreview(true);
              }
            });
            wbManualEl?.addEventListener('input', () => {
              saveState();
              refreshPromptPreview(true);
            });
            wbManualRefreshEl?.addEventListener('click', async () => {
              const template = await buildManualWorldBookTemplate();
              const current = getManualConfig();
              const merged = mergeManualConfig(template, current);
              setManualConfig(merged);
              renderManualWorldBookUI(merged);
              saveState();
              refreshPromptPreview(true);
            });

            openaiRefreshEl?.addEventListener('click', async () => {
              try {
                await refreshModels();
                setStatus('模型已刷新');
              } catch (e) {
                setStatus('模型刷新失败');
                console.warn('[WorldTreeLibrary]', e);
              }
            });

            openaiPresetLoadEl?.addEventListener('click', async () => {
              const name = (openaiPresetEl?.value || '').toString();
              if (!name) return;
              const ok = loadOpenAIPresetByName(name);
              if (ok) {
                await saveState();
                setStatus('已加载预设');
              }
            });

            openaiPresetDelEl?.addEventListener('click', async () => {
              const name = (openaiPresetEl?.value || '').toString();
              if (!name) return;
              const presets = getOpenAIPresets();
              if (presets?.[name]) {
                delete presets[name];
                setOpenAIPresets(presets);
                refreshOpenAIPresetSelect();
                await saveState();
                setStatus('已删除预设');
              }
            });

            externalSaveEl?.addEventListener('click', async () => {
              const name = (openaiPresetNameEl?.value || '').toString().trim() || '默认';
              const presets = getOpenAIPresets();
              presets[name] = {
                url: openaiUrlEl?.value || '',
                key: openaiKeyEl?.value || '',
                model: openaiModelEl?.value || '',
                temp: openaiTempEl?.value || '',
                max: openaiMaxEl?.value || ''
              };
              setOpenAIPresets(presets);
              refreshOpenAIPresetSelect();
              if (openaiPresetEl) openaiPresetEl.value = name;
              await saveState();
              setStatus('预设已保存');
            });

            const runFillOnce = async (overrideChat = null) => {
              if (running) return;
              running = true;
              setStatus('填表中');
              try {
                const ref = await buildReferenceBundle(overrideChat);
                lastRef = ref;
                const refBlocks = await formatReferenceText(ref);
                const promptText = buildPrompt(refBlocks);
                localStorage.setItem('wtl.lastPrompt', promptText || '');
                if (logPromptBtn?.dataset?.active === 'true' && logContentEl) logContentEl.value = promptText || '';
                const aiText = await callAi(promptText);
                localStorage.setItem('wtl.lastAi', aiText || '');
                const cmds = parseCommands(extractEditPayload(aiText));
                const newTable = applyCommands(stripTableWrapper(tableMdEl?.value || ''), cmds);
                const wrapped = ensureTableWrapper(newTable);
                if (tableMdEl) tableMdEl.value = wrapped;
                renderPreview(wrapped);
                await saveState();
                setStatus('完成');
              } catch (e) {
                setStatus('失败');
                console.warn('[WorldTreeLibrary]', e);
              } finally {
                running = false;
              }
            };

            document.getElementById('wtl-run')?.addEventListener('click', async () => {
              await runFillOnce();
            });

            autoToggleBtn?.addEventListener('click', async () => {
              const enabled = autoToggleBtn.dataset.active === 'true';
              const next = !enabled;
              setAutoUi(next);
              await saveState();
              setStatus(next ? '自动填表：已开启' : '自动填表：已关闭');
            });

            tableInjectToggleBtn?.addEventListener('change', async () => {
              const next = Boolean(tableInjectToggleBtn.checked);
              setTableInjectUi(next);
              await saveState();
              await syncTableInjection();
              setStatus(next ? '表格注入：已开启' : '表格注入：已关闭');
            });
            instInjectToggleEl?.addEventListener('change', async () => {
              const next = Boolean(instInjectToggleEl.checked);
              await saveState();
              await syncInstructionInjection();
              setStatus(next ? '指令注入：已开启' : '指令注入：已关闭');
            });
            schemaInjectToggleEl?.addEventListener('change', async () => {
              const next = Boolean(schemaInjectToggleEl.checked);
              await saveState();
              await syncSchemaInjection();
              setStatus(next ? '模板注入：已开启' : '模板注入：已关闭');
            });
            tablePosEl?.addEventListener('change', async () => {
              setDepthOnlyWhenFixed(tablePosEl, tableDepthEl);
              await saveState();
            });
            instPosEl?.addEventListener('change', async () => {
              setDepthOnlyWhenFixed(instPosEl, instDepthEl);
              await saveState();
            });
            schemaPosEl?.addEventListener('change', async () => {
              setDepthOnlyWhenFixed(schemaPosEl, schemaDepthEl);
              await saveState();
            });
            autoFloorsEl?.addEventListener('input', () => {
              saveState();
            });
            autoEveryEl?.addEventListener('input', () => {
              saveState();
            });

            document.getElementById('wtl-stop')?.addEventListener('click', () => {
              running = false;
              setStatus('已停止');
            });
            // 表格模板仅预览：不提供编辑按钮逻辑
            document.getElementById('wtl-clear')?.addEventListener('click', () => {
              if (tableMdEl) tableMdEl.value = '';
              renderPreview('');
              saveState();
              setStatus('表格已清空');
            });
            document.getElementById('wtl-save')?.addEventListener('click', async () => {
              await saveState();
              renderPreview(tableMdEl?.value || '');
              setStatus('已保存');
            });

              tableMdEl?.addEventListener('input', () => {
                renderPreview(tableMdEl.value);
                refreshPromptPreview(true);
              });
              prePromptEl?.addEventListener('input', () => {
                refreshPromptPreview(true);
              });
              instructionEl?.addEventListener('input', () => {
                refreshPromptPreview(true);
              });
              schemaEl?.addEventListener('input', () => {
                schemaSource = schemaEl.value;
                if (schemaModeEl) saveSchemaForMode(schemaModeEl.value, schemaSource);
                templateState = parseSchemaToTemplate(schemaSource);
                templateActiveSectionId = templateState.sections[0]?.id || '';
                refreshPromptPreview(true);
              });

              const updateSchemaEffectiveUi = () => {
                const effective = resolveSchemaByScope();
                if (schemaEffectiveEl) {
                  const scopeLabel = getSchemaScopeLabel(effective?.scope || 'global');
                  schemaEffectiveEl.textContent = `${scopeLabel} · ${effective?.name || '默认'}`;
                }
                if (schemaPresetEl && effective?.name) schemaPresetEl.value = effective.name;
                if (schemaPresetNameEl) schemaPresetNameEl.value = effective?.name || '';
              };

              schemaPresetEl?.addEventListener('change', () => {
                if (!schemaPresetEl || !schemaPresetNameEl) return;
                schemaPresetNameEl.value = schemaPresetEl.value || '';
              });
              schemaPresetLoadEl?.addEventListener('click', () => {
                if (!schemaEl || !schemaPresetEl) return;
                const name = schemaPresetEl.value || '';
                const presets = getSchemaPresets();
                if (!name || !presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                schemaSource = presets[name];
                schemaEl.value = schemaSource;
                localStorage.setItem('wtl.schema.presetActive', name);
                templateState = parseSchemaToTemplate(schemaSource);
                templateActiveSectionId = templateState.sections[0]?.id || '';
                updateSchemaPreview();
                refreshPromptPreview(true);
                setStatus('模板预设已载入');
              });
              schemaPresetSaveEl?.addEventListener('click', () => {
                if (!schemaEl || !schemaPresetNameEl) return;
                const name = schemaPresetNameEl.value.trim();
                if (!name) {
                  setStatus('请输入预设名');
                  return;
                }
                const presets = getSchemaPresets();
                presets[name] = schemaEl.value || '';
                setSchemaPresets(presets);
                refreshSchemaPresetSelect(schemaPresetEl, presets);
                if (schemaPresetEl) schemaPresetEl.value = name;
                localStorage.setItem('wtl.schema.presetActive', name);

                const scope = getSchemaScope();
                const map = getSchemaScopedPresets();
                const chatId = getCurrentChatId();
                const charId = getCurrentCharacterId();
                if (scope === 'chat') {
                  map.chat = map.chat || {};
                  if (chatId) map.chat[chatId] = name;
                } else if (scope === 'character') {
                  map.character = map.character || {};
                  if (charId) map.character[charId] = name;
                } else {
                  map.global = name;
                }
                setSchemaScopedPresets(map);
                updateSchemaEffectiveUi();
                setStatus('模板预设已保存');
              });
              schemaPresetRenameEl?.addEventListener('click', () => {
                if (!schemaPresetEl || !schemaPresetNameEl) return;
                const oldName = schemaPresetEl.value || '';
                const newName = schemaPresetNameEl.value.trim();
                if (!oldName || !newName) {
                  setStatus('请选择并填写新预设名');
                  return;
                }
                const presets = getSchemaPresets();
                if (!presets[oldName]) {
                  setStatus('未找到预设');
                  return;
                }
                presets[newName] = presets[oldName];
                if (newName !== oldName) delete presets[oldName];
                setSchemaPresets(presets);
                refreshSchemaPresetSelect(schemaPresetEl, presets);
                schemaPresetEl.value = newName;
                localStorage.setItem('wtl.schema.presetActive', newName);

                const map = getSchemaScopedPresets();
                if (map.global === oldName) map.global = newName;
                if (map.chat) {
                  Object.keys(map.chat).forEach((k) => {
                    if (map.chat[k] === oldName) map.chat[k] = newName;
                  });
                }
                if (map.character) {
                  Object.keys(map.character).forEach((k) => {
                    if (map.character[k] === oldName) map.character[k] = newName;
                  });
                }
                setSchemaScopedPresets(map);
                updateSchemaEffectiveUi();
                setStatus('模板预设已重命名');
              });
              schemaPresetDelEl?.addEventListener('click', () => {
                if (!schemaPresetEl) return;
                const name = schemaPresetEl.value || '';
                if (!name) {
                  setStatus('请选择要删除的预设');
                  return;
                }
                const presets = getSchemaPresets();
                if (!presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                delete presets[name];
                setSchemaPresets(presets);
                refreshSchemaPresetSelect(schemaPresetEl, presets);
                const active = localStorage.getItem('wtl.schema.presetActive') || '';
                if (active === name) localStorage.removeItem('wtl.schema.presetActive');

                const map = getSchemaScopedPresets();
                if (map.global === name) map.global = '默认';
                if (map.chat) {
                  Object.keys(map.chat).forEach((k) => {
                    if (map.chat[k] === name) delete map.chat[k];
                  });
                }
                if (map.character) {
                  Object.keys(map.character).forEach((k) => {
                    if (map.character[k] === name) delete map.character[k];
                  });
                }
                setSchemaScopedPresets(map);
                if (schemaPresetNameEl) schemaPresetNameEl.value = '';
                updateSchemaEffectiveUi();
                setStatus('模板预设已删除');
              });
              schemaPresetImportEl?.addEventListener('click', () => {
                schemaPresetFileEl?.click();
              });
              schemaPresetFileEl?.addEventListener('change', async (e) => {
                const file = e?.target?.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = safeParseJson(text) || {};
                  const presets = { ...getSchemaPresets(), ...data };
                  setSchemaPresets(presets);
                  refreshSchemaPresetSelect(schemaPresetEl, presets);
                  setStatus('模板预设已导入');
                } catch (err) {
                  setStatus('导入失败');
                }
                if (schemaPresetFileEl) schemaPresetFileEl.value = '';
              });
              schemaPresetExportEl?.addEventListener('click', () => {
                const presets = getSchemaPresets();
                downloadJson('wtl-schema-presets.json', presets);
              });

              schemaBindGlobalEl?.addEventListener('change', () => {
                updateSchemaBindRadios(getSchemaScope());
                updateSchemaEffectiveUi();
              });
              schemaBindCharacterEl?.addEventListener('change', () => {
                updateSchemaBindRadios(getSchemaScope());
                updateSchemaEffectiveUi();
              });
              schemaBindChatEl?.addEventListener('change', () => {
                updateSchemaBindRadios(getSchemaScope());
                updateSchemaEffectiveUi();
              });

              prepromptPresetEl?.addEventListener('change', () => {
                if (!prepromptPresetEl || !prepromptPresetNameEl) return;
                prepromptPresetNameEl.value = prepromptPresetEl.value || '';
              });
              prepromptPresetLoadEl?.addEventListener('click', () => {
                if (!prePromptEl || !prepromptPresetEl) return;
                const name = prepromptPresetEl.value || '';
                const presets = getPromptPresets(PREPROMPT_PRESET_KEY);
                if (!name || !presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                prePromptEl.value = presets[name];
                localStorage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, name);
                if (prepromptPresetNameEl) prepromptPresetNameEl.value = name;
                refreshPromptPreview(true);
                setStatus('破限提示预设已载入');
              });
              prepromptPresetSaveEl?.addEventListener('click', () => {
                if (!prePromptEl || !prepromptPresetNameEl) return;
                const name = prepromptPresetNameEl.value.trim();
                if (!name) {
                  setStatus('请输入预设名');
                  return;
                }
                const presets = getPromptPresets(PREPROMPT_PRESET_KEY);
                presets[name] = prePromptEl.value || '';
                setPromptPresets(PREPROMPT_PRESET_KEY, presets);
                refreshPromptPresetSelect(prepromptPresetEl, presets);
                if (prepromptPresetEl) prepromptPresetEl.value = name;
                localStorage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, name);
                setStatus('破限提示预设已保存');
              });
              prepromptPresetRenameEl?.addEventListener('click', () => {
                if (!prepromptPresetEl || !prepromptPresetNameEl) return;
                const oldName = prepromptPresetEl.value || '';
                const newName = prepromptPresetNameEl.value.trim();
                if (!oldName || !newName) {
                  setStatus('请选择并填写新预设名');
                  return;
                }
                const presets = getPromptPresets(PREPROMPT_PRESET_KEY);
                if (!presets[oldName]) {
                  setStatus('未找到预设');
                  return;
                }
                presets[newName] = presets[oldName];
                if (newName !== oldName) delete presets[oldName];
                setPromptPresets(PREPROMPT_PRESET_KEY, presets);
                refreshPromptPresetSelect(prepromptPresetEl, presets);
                prepromptPresetEl.value = newName;
                localStorage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, newName);
                setStatus('破限提示预设已重命名');
              });
              prepromptPresetDelEl?.addEventListener('click', () => {
                if (!prepromptPresetEl) return;
                const name = prepromptPresetEl.value || '';
                if (!name) {
                  setStatus('请选择要删除的预设');
                  return;
                }
                const presets = getPromptPresets(PREPROMPT_PRESET_KEY);
                if (!presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                delete presets[name];
                setPromptPresets(PREPROMPT_PRESET_KEY, presets);
                refreshPromptPresetSelect(prepromptPresetEl, presets);
                localStorage.removeItem(PREPROMPT_PRESET_ACTIVE_KEY);
                if (prepromptPresetNameEl) prepromptPresetNameEl.value = '';
                setStatus('破限提示预设已删除');
              });
              prepromptPresetImportEl?.addEventListener('click', () => {
                prepromptPresetFileEl?.click();
              });
              prepromptPresetFileEl?.addEventListener('change', async (e) => {
                const file = e?.target?.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = safeParseJson(text) || {};
                  const presets = { ...getPromptPresets(PREPROMPT_PRESET_KEY), ...data };
                  setPromptPresets(PREPROMPT_PRESET_KEY, presets);
                  refreshPromptPresetSelect(prepromptPresetEl, presets);
                  setStatus('破限提示预设已导入');
                } catch (err) {
                  setStatus('导入失败');
                }
                if (prepromptPresetFileEl) prepromptPresetFileEl.value = '';
              });
              prepromptPresetExportEl?.addEventListener('click', () => {
                const presets = getPromptPresets(PREPROMPT_PRESET_KEY);
                downloadJson('wtl-preprompt-presets.json', presets);
              });

              instructionPresetEl?.addEventListener('change', () => {
                if (!instructionPresetEl || !instructionPresetNameEl) return;
                instructionPresetNameEl.value = instructionPresetEl.value || '';
              });
              instructionPresetLoadEl?.addEventListener('click', () => {
                if (!instructionEl || !instructionPresetEl) return;
                const name = instructionPresetEl.value || '';
                const presets = getPromptPresets(INSTRUCTION_PRESET_KEY);
                if (!name || !presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                instructionEl.value = presets[name];
                localStorage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, name);
                if (instructionPresetNameEl) instructionPresetNameEl.value = name;
                refreshPromptPreview(true);
                setStatus('填表指令预设已载入');
              });
              instructionPresetSaveEl?.addEventListener('click', () => {
                if (!instructionEl || !instructionPresetNameEl) return;
                const name = instructionPresetNameEl.value.trim();
                if (!name) {
                  setStatus('请输入预设名');
                  return;
                }
                const presets = getPromptPresets(INSTRUCTION_PRESET_KEY);
                presets[name] = instructionEl.value || '';
                setPromptPresets(INSTRUCTION_PRESET_KEY, presets);
                refreshPromptPresetSelect(instructionPresetEl, presets);
                if (instructionPresetEl) instructionPresetEl.value = name;
                localStorage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, name);
                setStatus('填表指令预设已保存');
              });
              instructionPresetRenameEl?.addEventListener('click', () => {
                if (!instructionPresetEl || !instructionPresetNameEl) return;
                const oldName = instructionPresetEl.value || '';
                const newName = instructionPresetNameEl.value.trim();
                if (!oldName || !newName) {
                  setStatus('请选择并填写新预设名');
                  return;
                }
                const presets = getPromptPresets(INSTRUCTION_PRESET_KEY);
                if (!presets[oldName]) {
                  setStatus('未找到预设');
                  return;
                }
                presets[newName] = presets[oldName];
                if (newName !== oldName) delete presets[oldName];
                setPromptPresets(INSTRUCTION_PRESET_KEY, presets);
                refreshPromptPresetSelect(instructionPresetEl, presets);
                instructionPresetEl.value = newName;
                localStorage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, newName);
                setStatus('填表指令预设已重命名');
              });
              instructionPresetDelEl?.addEventListener('click', () => {
                if (!instructionPresetEl) return;
                const name = instructionPresetEl.value || '';
                if (!name) {
                  setStatus('请选择要删除的预设');
                  return;
                }
                const presets = getPromptPresets(INSTRUCTION_PRESET_KEY);
                if (!presets[name]) {
                  setStatus('未找到预设');
                  return;
                }
                delete presets[name];
                setPromptPresets(INSTRUCTION_PRESET_KEY, presets);
                refreshPromptPresetSelect(instructionPresetEl, presets);
                localStorage.removeItem(INSTRUCTION_PRESET_ACTIVE_KEY);
                if (instructionPresetNameEl) instructionPresetNameEl.value = '';
                setStatus('填表指令预设已删除');
              });
              instructionPresetImportEl?.addEventListener('click', () => {
                instructionPresetFileEl?.click();
              });
              instructionPresetFileEl?.addEventListener('change', async (e) => {
                const file = e?.target?.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = safeParseJson(text) || {};
                  const presets = { ...getPromptPresets(INSTRUCTION_PRESET_KEY), ...data };
                  setPromptPresets(INSTRUCTION_PRESET_KEY, presets);
                  refreshPromptPresetSelect(instructionPresetEl, presets);
                  setStatus('填表指令预设已导入');
                } catch (err) {
                  setStatus('导入失败');
                }
                if (instructionPresetFileEl) instructionPresetFileEl.value = '';
              });
              instructionPresetExportEl?.addEventListener('click', () => {
                const presets = getPromptPresets(INSTRUCTION_PRESET_KEY);
                downloadJson('wtl-instruction-presets.json', presets);
              });

              editPrepromptBtn?.addEventListener('click', async () => {
                if (!prePromptEl || !editPrepromptBtn) return;
                const editing = prePromptEl.readOnly === false;
                if (!editing) {
                  prePromptEl.readOnly = false;
                  editPrepromptBtn.textContent = '保存';
                  prePromptEl.focus();
                  return;
                }
                prePromptEl.readOnly = true;
                editPrepromptBtn.textContent = '编辑';
                await saveState();
                refreshPromptPreview(true);
                setStatus('破限提示已保存');
              });

              editInstructionBtn?.addEventListener('click', async () => {
                if (!instructionEl || !editInstructionBtn) return;
                const editing = instructionEl.readOnly === false;
                if (!editing) {
                  instructionEl.readOnly = false;
                  editInstructionBtn.textContent = '保存';
                  instructionEl.focus();
                  return;
                }
                instructionEl.readOnly = true;
                editInstructionBtn.textContent = '编辑';
                await saveState();
                refreshPromptPreview(true);
                setStatus('填表指令已保存');
              });

              resetPrepromptBtn?.addEventListener('click', async () => {
                if (!prePromptEl) return;
                const confirmBtn = makeModalSaveButton('确认恢复', async () => {
                  let nextValue = getPresetTextByName(PREPROMPT_PRESET_KEY, '默认', '');
                  if (!nextValue && window.__WTL_PRESETS__?.preprompt?.['默认']) {
                    const fallback = window.__WTL_PRESETS__.preprompt['默认'];
                    nextValue = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
                  }
                  prePromptEl.value = nextValue || '';
                  prePromptEl.readOnly = true;
                  if (editPrepromptBtn) editPrepromptBtn.textContent = '编辑';
                  localStorage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, '默认');
                  if (prepromptPresetEl) prepromptPresetEl.value = '默认';
                  if (prepromptPresetNameEl) prepromptPresetNameEl.value = '默认';
                  await saveState();
                  refreshPromptPreview(true);
                  setStatus('破限提示已恢复默认');
                });
                openConfirmModal('恢复默认破限提示', '该操作将覆盖当前破限提示内容，是否继续？', [confirmBtn]);
              });

              resetInstructionBtn?.addEventListener('click', async () => {
                if (!instructionEl) return;
                const confirmBtn = makeModalSaveButton('确认恢复', async () => {
                  let nextValue = getPresetTextByName(INSTRUCTION_PRESET_KEY, '默认', '');
                  if (!nextValue && window.__WTL_PRESETS__?.instruction?.['默认']) {
                    const fallback = window.__WTL_PRESETS__.instruction['默认'];
                    nextValue = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
                  }
                  instructionEl.value = nextValue || '';
                  instructionEl.readOnly = true;
                  if (editInstructionBtn) editInstructionBtn.textContent = '编辑';
                  localStorage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, '默认');
                  if (instructionPresetEl) instructionPresetEl.value = '默认';
                  if (instructionPresetNameEl) instructionPresetNameEl.value = '默认';
                  await saveState();
                  refreshPromptPreview(true);
                  setStatus('填表指令已恢复默认');
                });
                openConfirmModal('恢复默认填表指令', '该操作将覆盖当前填表指令内容，是否继续？', [confirmBtn]);
              });

              resetSchemaBtn?.addEventListener('click', async () => {
                const confirmBtn = makeModalSaveButton('确认恢复', async () => {
                  const nextSchema = getSchemaPreset() || '';
                  schemaSource = nextSchema;
                  templateState = parseSchemaToTemplate(nextSchema);
                  templateActiveSectionId = templateState.sections[0]?.id || '';
                  const nextTable = renderJsonToMarkdown(buildEmptyTableFromTemplate(templateState));
                  if (schemaEl) schemaEl.value = buildTemplatePrompt(templateState) || nextSchema;
                  if (tableMdEl) tableMdEl.value = nextTable;
                  renderPreview(nextTable);
                  renderTemplateSections();
                  renderTemplateColumns();
                  updateSchemaPreview();
                  await saveState();
                  refreshPromptPreview(true);
                  setStatus('表格模板已恢复默认');
                });
                openConfirmModal('恢复默认表格模板', '该操作将覆盖当前表格模板与表格内容，是否继续？', [confirmBtn]);
              });

              blockResetEl?.addEventListener('click', () => {
                const confirmBtn = makeModalSaveButton('确认恢复', async () => {
                  renderBlockList(getBlocksPreset() || []);
                  localStorage.removeItem('wtl.blockOrder');
                  await saveState();
                  refreshPromptPreview(true);
                  setStatus('提示词顺序已恢复默认');
                });
                openConfirmModal('恢复默认提示词顺序', '该操作将覆盖当前提示词顺序与自定义提示词，是否继续？', [confirmBtn]);
              });

              refBlockResetEl?.addEventListener('click', () => {
                const confirmBtn = makeModalSaveButton('确认恢复', async () => {
                  renderRefBlockList(getRefBlocksPreset() || []);
                  localStorage.removeItem('wtl.refBlockOrder');
                  await saveState();
                  refreshPromptPreview(true);
                  setStatus('参考信息顺序已恢复默认');
                });
                openConfirmModal('恢复默认参考信息顺序', '该操作将覆盖当前参考信息顺序与自定义提示词，是否继续？', [confirmBtn]);
              });

              historyBackBtn?.addEventListener('click', async () => {
                await restoreHistoryByOffset(-1);
              });
              historyUndoBtn?.addEventListener('click', async () => {
                await restoreHistoryByOffset(1);
              });
              historyBtn?.addEventListener('click', () => {
                openHistoryModal();
              });

              editTableBtn?.addEventListener('click', async () => {
                tableEditMode = !tableEditMode;
                if (editTableBtn) {
                  const label = tableEditMode ? '保存表格' : '编辑表格';
                  editTableBtn.querySelector('span') ? editTableBtn.querySelector('span').textContent = label : (editTableBtn.textContent = label);
                }

                if (tableEditMode) {
                  renderPreview(tableMdEl?.value || '');
                  setStatus('编辑表格：可直接修改单元格');
                  return;
                }

                const nextMd = applyPreviewEditsToMarkdown();
                if (tableMdEl) tableMdEl.value = nextMd;
                disableTableInlineEditing();
                renderPreview(nextMd);
                await saveState();
                refreshPromptPreview(true);
                setStatus('表格已保存');
              });

              editTemplateBtn?.addEventListener('click', async () => {
                templateEditMode = !templateEditMode;
                if (editTemplateBtn) {
                  const label = templateEditMode ? '保存模板' : '编辑模板';
                  editTemplateBtn.querySelector('span') ? editTemplateBtn.querySelector('span').textContent = label : (editTemplateBtn.textContent = label);
                }

                if (templateEditMode) {
                  renderPreview(tableMdEl?.value || '');
                  setStatus('编辑模板：可拖拽页签/列并点击铅笔编辑');
                  return;
                }

                const cols = Array.from(headEl?.querySelectorAll('th') || []).map(th => th.dataset.col).filter(Boolean);
                if (cols.length) {
                  const next = reorderColumns(tableMdEl?.value || '', activeSection, cols);
                  if (tableMdEl) tableMdEl.value = next;
                }
                renderPreview(tableMdEl?.value || '');
                updateSchemaPreview();
                await saveState();
                refreshPromptPreview(true);
                setStatus('模板已保存');
              });

              sectionAddBtn?.addEventListener('click', () => {
                openTemplateDialog('新建页签', { type: 'section', id: '' }, {
                  name: '新表格',
                  definition: '',
                  deleteRule: '',
                  insertRule: '',
                  updateRule: '',
                  fillable: true,
                  sendable: true
                });
              });

              columnAddBtn?.addEventListener('click', () => {
                openTemplateDialog('新建列', { type: 'column', id: '', sectionId: templateActiveSectionId }, {
                  name: '新列',
                  definition: '',
                  deleteRule: '',
                  insertRule: '',
                  updateRule: ''
                });
              });

              sectionApplyBtn?.addEventListener('click', () => {
                saveTemplateState();
                setStatus('模板已更新');
              });

              editorDialogSaveEl?.addEventListener('click', () => {
                saveTemplateDialogChanges();
              });

              const bindRuleToggle = (enabledEl, textareaEl) => {
                if (!enabledEl || !textareaEl) return;
                enabledEl.addEventListener('change', () => {
                  const show = enabledEl.checked;
                  textareaEl.style.display = show ? 'block' : 'none';
                  textareaEl.disabled = !show;
                });
              };
              bindRuleToggle(editorDialogInsertEnabledEl, editorDialogAddEl);
              bindRuleToggle(editorDialogUpdateEnabledEl, editorDialogEditEl);
              bindRuleToggle(editorDialogDeleteEnabledEl, editorDialogDelEl);

              editorDialogCloseEl?.addEventListener('click', () => {
                closeTemplateDialog();
              });

              editorOverlayEl?.addEventListener('click', (e) => {
                if (e.target === editorOverlayEl) closeTemplateDialog();
              });

              if (sectionListEl) {
                bindTemplateDrag(sectionListEl, (ordered) => {
                  templateState.sections = ordered.map((id) => templateState.sections.find(s => s.id === id)).filter(Boolean);
                  renderTemplateSections();
                  updateSchemaPreview();
                  refreshPromptPreview(true);
                });
              }
              if (columnListEl) {
                bindTemplateDrag(columnListEl, (ordered) => {
                  const sec = templateState.sections.find(s => s.id === templateActiveSectionId) || templateState.sections[0];
                  if (!sec) return;
                  sec.columns = ordered.map((id) => sec.columns.find(c => c.id === id)).filter(Boolean);
                  renderTemplateColumns();
                  updateSchemaPreview();
                  refreshPromptPreview(true);
                });
              }

              batchBtn?.addEventListener('click', async () => {
                await runBatchFill();
              });

              tableTabsEl?.addEventListener('dragend', async () => {
                if (!tableTabsEl || !templateEditMode) return;
                const ordered = Array.from(tableTabsEl.querySelectorAll('.wtl-tab')).map(el => el.dataset.name).filter(Boolean);
                if (!ordered.length) return;
                tableSectionOrder = ordered;
                const next = reorderSections(tableMdEl?.value || '', ordered);
                if (tableMdEl) tableMdEl.value = next;
                renderPreview(next);
                await saveState();
              });

              headEl?.addEventListener('dragstart', (e) => {
                if (!templateEditMode) return;
                const target = e.target;
                if (target && target.tagName === 'TH') {
                  target.classList.add('dragging');
                }
              });
              headEl?.addEventListener('dragend', async () => {
                if (!templateEditMode) return;
                const target = headEl.querySelector('th.dragging');
                if (target) target.classList.remove('dragging');
                const cols = Array.from(headEl.querySelectorAll('th')).map(th => th.dataset.col).filter(Boolean);
                if (!cols.length) return;
                const next = reorderColumns(tableMdEl?.value || '', activeSection, cols);
                if (tableMdEl) tableMdEl.value = next;
                renderPreview(next);
                await saveState();
              });
              headEl?.addEventListener('dragover', (e) => {
                if (!templateEditMode) return;
                e.preventDefault();
                const dragging = headEl.querySelector('th.dragging');
                if (!dragging) return;
                const row = dragging.parentElement;
                if (!row) return;
                const ths = Array.from(headEl.querySelectorAll('th:not(.dragging)'));
                const after = ths.find((el) => {
                  const rect = el.getBoundingClientRect();
                  return e.clientX < rect.left + rect.width / 2;
                });
                if (after && after.parentElement === row) row.insertBefore(dragging, after);
                else row.appendChild(dragging);
              });
blockListEl?.addEventListener('dragend', () => {
              saveState();
              refreshPromptPreview(true);
            });
            refBlockListEl?.addEventListener('dragend', () => {
              saveState();
              refreshPromptPreview(true);
            });

            bindDrag(blockListEl);
            bindDrag(refBlockListEl);

            loadState();
            if (logPromptBtn) logPromptBtn.dataset.active = 'true';
            if (logAiBtn) logAiBtn.dataset.active = 'false';
            const cached = localStorage.getItem('wtl.lastPrompt') || '';
            if (logContentEl) logContentEl.value = cached;
            refreshPromptPreview(true);
            ensureHooks();

            editTableBtn?.addEventListener('click', () => {
              setStatus('拖拽表头以调整列顺序');
            });

            if (!window.__wtlChatHook) {
              window.__wtlChatHook = true;
              if (event_types?.CHAT_CHANGED) {
                eventSource.on(event_types.CHAT_CHANGED, () => refreshPromptPreview(true));
              }
              if (event_types?.CHAT_LOADED) {
                eventSource.on(event_types.CHAT_LOADED, () => refreshPromptPreview(true));
              }
              if (event_types?.CHAT_CHANGED_MANUALLY) {
                eventSource.on(event_types.CHAT_CHANGED_MANUALLY, () => refreshPromptPreview(true));
              }
            }
          }
        });
      } catch (e) {
        console.warn('[WorldTreeLibrary] Top tab registration skipped:', e);
      }
    };

    eventSource.on(event_types.APP_READY, register);
    register();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
