// UI 绑定与交互逻辑（从 main.js 抽离）
import {
  wrapTable,
  stripTableWrapper,
  ensureTableWrapper,
  parseSections,
  parseMarkdownTableToJson,
  renderJsonToMarkdown,
  buildEmptyTableFromTemplate
} from '../table/markdown.js';
import {
  randBase36,
  randLetters,
  createSectionIdWithPrefix,
  createColumnIdForSection,
  ensureTemplatePrefix,
  createSectionIdInTemplate,
  createColumnIdInTemplate,
  parseSchemaToTemplate,
  templateToSchemaMarkdown,
  buildTemplatePrompt
} from '../table/template.js';
import { extractEditPayload, ensureEditWrapper, parseCommands } from '../table/commands.js';
import { applyCommands } from '../table/apply.js';
import { buildReferenceBundle, formatReferenceText } from '../logic/reference.js';
import { buildPrompt } from '../logic/prompt.js';
import { callAi } from '../logic/ai.js';
import {
  getCharacterNameFromContext,
  getChatKeyFromContext,
  getChatMetadataFromContext,
  loadTableForChatState,
  saveTableForChatState,
  reloadStateForCurrentChat as reloadChatState
} from '../logic/chatState.js';
import {
  ensureAutoFillDefaults,
  collectLoadStateSnapshot,
  seedStoredLoadStateSnapshot,
  persistCoreUiState
} from '../logic/statePersistence.js';
import {
  buildManagedPromptInjectionItems,
  getManagedPromptInjectionEntryName
} from '../logic/injection.js';
import { getBlockEls, getRefBlockEls, serializeBlockOrder } from './blocks.js';
import { createModalController } from './modal.js';
import {
  updateTableRows as updatePreviewTableRows,
  moveTableRow,
  applyPreviewEditsToMarkdown as applyTablePreviewEdits,
  reorderColumnsInMarkdown,
  reorderSectionsInMarkdown
} from './tablePreview.js';
import {
  loadTextPresetValue,
  saveTextPresetValue,
  renameTextPresetValue,
  deleteTextPresetValue,
  importJsonPresets,
  saveSchemaPresetValue,
  renameSchemaPresetValue,
  deleteSchemaPresetValue
} from './presets.js';
import { importPresetFile, exportPresetFile } from './presetFiles.js';
import { createHistoryModalController, downloadJsonFile } from './history.js';
import {
  bindSchemaPresetControls,
  bindTextPresetControls,
  refreshSchemaPresetSelect,
  refreshTextPresetSelect
} from './presetControllers.js';
import {
  createBatchController,
  createOpenAiModelController,
  createPromptPreviewController,
  createHookController,
  createManagedPromptInjectionController
} from './runtimeControllers.js';
import {
  createAutoRefreshController,
  bindWorldBookControls,
  bindOpenAiPresetControls,
  createFillController,
  bindCommonActionControls
} from './actionControllers.js';
import { createStateController } from './stateControllers.js';
import {
  createPromptMacroController,
  getDefaultSendModeFlags,
  setModeConfigVisibility
} from './promptControllers.js';
import {
  bindPageControls,
  bindModeControls,
  createExternalTabController
} from './pageControllers.js';
import {
  createTemplateEditorController,
  renderTemplateSectionsList,
  renderTemplateColumnsList,
  saveTemplateDialogChanges as saveTemplateDialogChangesWithController
} from './templateEditor.js';
import {
  bindGenericDrag,
  bindPreviewRowDrag,
  renderPreviewTabs,
  renderTablePreview
} from './previewTable.js';
import { renderManualWorldBookEditor } from './manualWorldBook.js';
import {
  buildManualWorldBookTemplate,
  normalizeManualWorldBookConfig,
  readManualWorldBookConfig,
  serializeManualWorldBookConfig,
  mergeManualWorldBookConfig
} from './manualWorldBookState.js';
import {
  bindResetAndHistoryControls,
  bindTemplateEditingControls
} from './editorControllers.js';
import { createBlockEditorController } from './blockEditor.js';
import { createBlockModalController } from './blockModalController.js';
import { getUiRefs } from './refs.js';
import {
  PREPROMPT_PRESET_KEY,
  PREPROMPT_PRESET_ACTIVE_KEY,
  INSTRUCTION_PRESET_KEY,
  INSTRUCTION_PRESET_ACTIVE_KEY,
  SCHEMA_PRESET_KEY,
  SCHEMA_PRESET_ACTIVE_KEY,
  safeParseJson,
  getOpenAIPresets,
  setOpenAIPresets,
  getPromptPresets,
  setPromptPresets,
  getPresetFromStorage,
  getPresetTextByName,
  getTextPresetFromStorage,
  getDefaultPromptText,
  getDefaultSchemaText,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScopedPresets,
  setSchemaScopedPresets,
  getBlocksPreset,
  getRefBlocksPreset,
  getOrderPreset,
  getRefOrderPreset
} from '../storage.js';

export function bindWorldTreeUi({ root, ctx, defaults }) {
  if (!root) return;
  const { eventSource, event_types } = ctx || {};

  const ui = getUiRefs();
  const {
    statusEl,
    pageMainEl,
    pageConfigEl,
    openConfigBtn,
    backMainBtn,
    batchBtn,
    batchStartEl,
    batchEndEl,
    batchStepEl,
    autoToggleBtn,
    autoFloorsEl,
    autoEveryEl,
    editTableBtn,
    editTemplateBtn,
    resetGlobalBtn,
    clearTableBtn,
    historyBackBtn,
    historyUndoBtn,
    historyBtn,
    editPrepromptBtn,
    resetPrepromptBtn,
    editInstructionBtn,
    resetInstructionBtn,
    refreshSchemaBtn,
    resetSchemaBtn,
    editSchemaBtn,
    templateEditorEl,
    prepromptPresetEl,
    prepromptPresetNameEl,
    prepromptPresetLoadEl,
    prepromptPresetSaveEl,
    prepromptPresetRenameEl,
    prepromptPresetDelEl,
    prepromptPresetImportEl,
    prepromptPresetExportEl,
    prepromptPresetFileEl,
    instructionPresetEl,
    instructionPresetNameEl,
    instructionPresetLoadEl,
    instructionPresetSaveEl,
    instructionPresetRenameEl,
    instructionPresetDelEl,
    instructionPresetImportEl,
    instructionPresetExportEl,
    instructionPresetFileEl,
    sectionListEl,
    columnListEl,
    sectionAddBtn,
    sectionApplyBtn,
    columnAddBtn,
    editorOverlayEl,
    editorDialogTitleEl,
    editorDialogNameEl,
    editorDialogDefEl,
    editorDialogDelEl,
    editorDialogAddEl,
    editorDialogEditEl,
    editorDialogFillEl,
    editorDialogFillRowEl,
    editorDialogSendEl,
    editorDialogSendRowEl,
    editorDialogInsertRowEl,
    editorDialogUpdateRowEl,
    editorDialogDeleteRowEl,
    editorDialogInsertToggleEl,
    editorDialogUpdateToggleEl,
    editorDialogDeleteToggleEl,
    editorDialogInsertEnabledEl,
    editorDialogUpdateEnabledEl,
    editorDialogDeleteEnabledEl,
    editorDialogSaveEl,
    editorDialogCloseEl,
    modalEl,
    modalTitleEl,
    modalContentEl,
    modalCustomEl,
    modalActionsEl,
    modalCloseEl,
    tableMdEl,
    schemaModeEl,
    schemaEl,
    schemaPresetEl,
    schemaPresetNameEl,
    schemaPresetLoadEl,
    schemaPresetSaveEl,
    schemaPresetRenameEl,
    schemaPresetDelEl,
    schemaPresetImportEl,
    schemaPresetExportEl,
    schemaPresetFileEl,
    schemaBindGlobalEl,
    schemaBindCharacterEl,
    schemaBindChatEl,
    schemaBindCharacterNameEl,
    schemaBindChatNameEl,
    schemaEffectiveEl,
    headEl,
    bodyEl,
    tableTabsEl,
    blockListEl,
    refBlockListEl,
    blockAddEl,
    refBlockAddEl,
    blockResetEl,
    refBlockResetEl,
    wbModeEl,
    wbManualWrapEl,
    wbManualEl,
    wbManualUiEl,
    wbManualRefreshEl,
    entryEl,
    prePromptEl,
    instructionEl,
    sendModeEl,
    externalEl,
    stModeEl,
    instBlockEl,
    schemaBlockEl,
    instModeEl,
    schemaModeSendEl,
    tableModeEl,
    tablePreviewEl,
    logContentEl,
    logPromptBtn,
    logAiBtn,
    logRefreshBtn,
    externalNavOrderBtn,
    externalNavRefBtn,
    externalNavWbBtn,
    externalPanelOrderEl,
    externalPanelRefEl,
    externalPanelWbEl,
    openaiPresetEl,
    openaiPresetNameEl,
    openaiPresetLoadEl,
    openaiPresetDelEl,
    openaiUrlEl,
    openaiKeyEl,
    openaiModelEl,
    openaiRefreshEl,
    openaiTempEl,
    openaiMaxEl,
    openaiStreamEl,
    externalSaveEl,
    tablePosEl,
    tableRoleEl,
    tableDepthEl,
    tableOrderEl,
    tableInjectToggleBtn,
    instPosEl,
    instRoleEl,
    instDepthEl,
    instOrderEl,
    instInjectToggleEl,
    schemaPosEl,
    schemaRoleEl,
    schemaDepthEl,
    schemaOrderEl,
    schemaInjectToggleEl
  } = ui;

  let running = false;
  let lastRef = null;
  let manualState = null;
  let activeSection = '';
  let tableSectionOrder = [];
  let hiddenRows = {};
  let templateState = { title: '记忆表格', sections: [] };
  let templateActiveSectionId = '';
  let tableEditMode = false;
  let templateEditMode = false;
  let schemaSource = '';
  let pendingAiHistory = null;
  let macroRegistered = false;
  let currentChatStateKey = '';
  let runtimeInjectedInput = null;

  const getCharacterName = () => getCharacterNameFromContext(window.SillyTavern?.getContext?.());

  const getChatKey = () => getChatKeyFromContext(window.SillyTavern?.getContext?.());

  const getChatMetadata = () => getChatMetadataFromContext(window.SillyTavern?.getContext?.());

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
    if (openaiStreamEl && p.stream !== undefined) openaiStreamEl.checked = p.stream !== false;
    if (openaiModelEl && typeof p.model === 'string') {
      openaiModelEl.innerHTML = `<option value="${p.model}">${p.model}</option>`;
      openaiModelEl.value = p.model;
    }
    if (openaiPresetNameEl) openaiPresetNameEl.value = name;
    return true;
  };

  const loadTableForChat = async () => {
    const hiddenRowsRef = { value: hiddenRows };
    const tableMd = await loadTableForChatState({
      ctx: window.SillyTavern?.getContext?.(),
      defaults,
      safeParseJson,
      renderJsonToMarkdown,
      parseSchemaToTemplate,
      buildEmptyTableFromTemplate,
      getDefaultSchemaText,
      resolveSchemaByScope,
      loadSchemaForMode,
      hiddenRowsRef
    });
    hiddenRows = hiddenRowsRef.value;
    return tableMd;
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

  const renderTemplateSections = () => {
    renderTemplateSectionsList({
      sectionListEl,
      templateState,
      templateActiveSectionId,
      setActiveTemplateSection,
      openTemplateDialog,
      onDeleteSection: (sec) => {
        const idx = templateState.sections.findIndex(s => s.id === sec.id);
        if (idx < 0) return;
        templateState.sections.splice(idx, 1);
        if (templateState.sections[0]) {
          templateActiveSectionId = templateState.sections[0].id;
        }
        const nextSections = parseSections(tableMdEl?.value || '').filter(s => s.name !== sec.name);
        const markdown = renderJsonToMarkdown({
          title: parseMarkdownTableToJson(tableMdEl?.value || '').title,
          sections: nextSections.map(s => ({ name: s.name, columns: s.header, rows: s.rows }))
        });
        if (tableMdEl) tableMdEl.value = markdown;
        renderPreview(markdown);
        renderTemplateSections();
        renderTemplateColumns();
        updateSchemaPreview();
        refreshPromptPreview(true);
      }
    });
  };

  const renderTemplateColumns = () => {
    const sec = templateState.sections.find(s => s.id === templateActiveSectionId) || templateState.sections[0];
    renderTemplateColumnsList({
      columnListEl,
      activeSection: sec,
      openTemplateDialog,
      onDeleteColumn: (col, activeSectionDef) => {
        const targetIdx = activeSectionDef.columns.findIndex(c => c.id === col.id);
        if (targetIdx < 0) return;
        activeSectionDef.columns.splice(targetIdx, 1);

        const sections = parseSections(tableMdEl?.value || '');
        const nextSections = sections.map((s) => {
          if (s.name !== (activeSectionDef?.name || '')) return s;
          const nextHeader = s.header.filter((_, idx) => idx !== targetIdx);
          const nextRows = s.rows.map(r => r.filter((_, idx) => idx !== targetIdx));
          return { ...s, header: nextHeader, rows: nextRows };
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
      }
    });
  };

  const {
    openTemplateDialog,
    closeTemplateDialog,
    showTemplateEditor,
    hideTemplateEditor,
    bindTemplateDrag,
    reorderTemplateItems,
    getTemplateDialogTarget,
    clearTemplateDialogTarget
  } = createTemplateEditorController({
    templateEditorEl,
    editorOverlayEl,
    editorDialogTitleEl,
    editorDialogNameEl,
    editorDialogDefEl,
    editorDialogDelEl,
    editorDialogAddEl,
    editorDialogEditEl,
    editorDialogFillEl,
    editorDialogSendEl,
    editorDialogInsertEnabledEl,
    editorDialogUpdateEnabledEl,
    editorDialogDeleteEnabledEl,
    editorDialogInsertRowEl,
    editorDialogUpdateRowEl,
    editorDialogDeleteRowEl,
    editorDialogInsertToggleEl,
    editorDialogUpdateToggleEl,
    editorDialogDeleteToggleEl,
    parseSchemaToTemplate,
    createSectionIdInTemplate,
    createColumnIdForSection,
    getSchemaSource: () => schemaSource,
    getSchemaValue: () => schemaEl?.value || '',
    getTemplateState: () => templateState,
    setTemplateState: (value) => {
      templateState = value;
    },
    setTemplateActiveSectionId: (value) => {
      templateActiveSectionId = value || '';
    },
    renderTemplateSections,
    renderTemplateColumns
  });

  const saveTableForChat = async (tableMd, meta = {}) => {
    await saveTableForChatState({
      ctx: window.SillyTavern?.getContext?.(),
      tableMd,
      meta,
      hiddenRows,
      wrapTable,
      parseMarkdownTableToJson,
      appendHistory
    });
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

  const getPromptMacroPayload = () => ({
    instruction: instructionEl?.value || '',
    template: buildTemplatePrompt(templateState) || schemaEl?.value || '',
    table: getTablePreviewForSend(tableMdEl?.value || '')
  });

  const syncPromptMacros = async () => {
    const macros = window.ST_API?.macros;
    if (!macros?.register) return;
    const payload = getPromptMacroPayload();
    const defs = [
      ['WTL_TableInstruction', 'WorldTreeLibrary 填表指令', () => payload.instruction],
      ['WTL_TableTemplate', 'WorldTreeLibrary 表格模板', () => payload.template],
      ['WTL_TableLatest', 'WorldTreeLibrary 当前表格', () => payload.table]
    ];
    if (macroRegistered && macros.unregister) {
      for (const [name] of defs) {
        try {
          await macros.unregister({ name });
        } catch (e) {
          console.warn('[WorldTreeLibrary] macro.unregister failed', name, e);
        }
      }
    }
    for (const [name, description, handler] of defs) {
      await macros.register({
        name,
        options: {
          category: 'custom',
          description,
          handler,
          ensureExperimentalMacroEngine: true
        }
      });
    }
    macroRegistered = true;
  };

  const applyAllPromptMacros = async (text) => {
    const input = String(text || '');
    const macros = window.ST_API?.macros;
    if (!input.trim() || !macros?.process) return input;
    try {
      const res = await macros.process({ text: input, env: {} });
      return res?.text || input;
    } catch (e) {
      console.warn('[WorldTreeLibrary] macros.process failed', e);
      return input;
    }
  };

  const getSendModeFlags = () => {
    const rawMode = sendModeEl?.value || defaults.sendMode || 'st';
    const mode = rawMode === 'stMacro' ? 'st' : rawMode;
    return {
      mode,
      isExternal: mode === 'external',
      isStLike: mode === 'st'
    };
  };

  const getDefaultPromptValues = () => ({
    preprompt: getDefaultPromptText('preprompt', PREPROMPT_PRESET_KEY, PREPROMPT_PRESET_ACTIVE_KEY) || '',
    instruction: getDefaultPromptText('instruction', INSTRUCTION_PRESET_KEY, INSTRUCTION_PRESET_ACTIVE_KEY) || '',
    schema: resolveSchemaByScope()?.text || loadSchemaForMode(schemaModeEl?.value || defaults.schemaMode) || getDefaultSchemaText() || ''
  });

  const ensurePromptFieldDefaults = ({ syncSchema = false } = {}) => {
    const fallback = getDefaultPromptValues();
    let changed = false;

    if (prePromptEl && !String(prePromptEl.value || '').trim() && fallback.preprompt) {
      prePromptEl.value = fallback.preprompt;
      changed = true;
    }

    if (instructionEl && !String(instructionEl.value || '').trim() && fallback.instruction) {
      instructionEl.value = fallback.instruction;
      changed = true;
    }

    if (schemaEl && !String(schemaEl.value || '').trim() && fallback.schema) {
      schemaEl.value = fallback.schema;
      schemaSource = fallback.schema;
      if (syncSchema && schemaModeEl) saveSchemaForMode(schemaModeEl.value, schemaSource);
      templateState = parseSchemaToTemplate(schemaSource);
      templateActiveSectionId = templateState.sections[0]?.id || '';
      updateSchemaPreview();
      changed = true;
    }

    return changed;
  };

  const getStoredOrDefault = (key, fallback = '') => {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const text = String(raw);
    if (!text.trim() || text === 'undefined' || text === 'null') return fallback;
    return text;
  };

  const setStoredIfEmpty = (key, fallback = '') => {
    const raw = localStorage.getItem(key);
    const text = raw === null || raw === undefined ? '' : String(raw);
    const empty = !text.trim() || text === 'undefined' || text === 'null';
    if (empty && fallback !== undefined && fallback !== null && String(fallback).trim()) {
      localStorage.setItem(key, String(fallback));
      return String(fallback);
    }
    return empty ? '' : text;
  };

  const ensureMacroHelpBlock = (id, macroName, usageText) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'wtl-badge';
      el.style.marginTop = '8px';
      el.style.whiteSpace = 'pre-wrap';
    }
    el.textContent = `宏名：${macroName}\n用法：${usageText}`;
    return el;
  };

  const setModeConfigVisibility = ({ mode, fieldIds = [], helpHost = null, helpId = '', macroName = '', usageText = '' }) => {
    const isMacro = mode === 'macro';
    fieldIds.forEach((id) => {
      const field = document.getElementById(id);
      if (!field) return;
      const label = field.previousElementSibling;
      if (label?.tagName === 'LABEL') label.style.display = isMacro ? 'none' : '';
      const row = field.closest('.wtl-row');
      if (row && row.contains(field) && row.children.length <= 3) {
        row.style.display = isMacro ? 'none' : '';
      } else {
        field.style.display = isMacro ? 'none' : '';
      }
    });

    if (!helpHost || !helpId || !macroName) return;
    const help = ensureMacroHelpBlock(helpId, macroName, usageText);
    if (!help.parentElement) helpHost.appendChild(help);
    help.style.display = isMacro ? 'block' : 'none';
  };

  const refreshModeUi = () => {
    const { isExternal, isStLike } = getSendModeFlags();
    if (stModeEl) stModeEl.style.display = isStLike ? 'block' : 'none';
    if (externalEl) externalEl.style.display = isExternal ? 'block' : 'none';
    if (instBlockEl) instBlockEl.style.display = isStLike ? 'block' : 'none';
    if (schemaBlockEl) schemaBlockEl.style.display = isStLike ? 'block' : 'none';

    setModeConfigVisibility({
      mode: instModeEl?.value || defaults.instMode || 'inject',
      fieldIds: ['wtl-inst-inject-toggle', 'wtl-inst-pos', 'wtl-inst-role', 'wtl-inst-depth', 'wtl-inst-order'],
      helpHost: instBlockEl,
      helpId: 'wtl-inst-macro-help',
      macroName: '{{WTL_TableInstruction}}',
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前填表指令。'
    });

    setModeConfigVisibility({
      mode: schemaModeSendEl?.value || defaults.schemaSendMode || 'inject',
      fieldIds: ['wtl-schema-inject-toggle', 'wtl-schema-pos', 'wtl-schema-role', 'wtl-schema-depth', 'wtl-schema-order'],
      helpHost: schemaBlockEl,
      helpId: 'wtl-schema-macro-help',
      macroName: '{{WTL_TableTemplate}}',
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前表格模板。'
    });

    setModeConfigVisibility({
      mode: tableModeEl?.value || defaults.tableMode || 'inject',
      fieldIds: ['wtl-table-inject-toggle', 'wtl-table-pos', 'wtl-table-role', 'wtl-table-depth', 'wtl-table-order'],
      helpHost: tableModeEl?.parentElement,
      helpId: 'wtl-table-macro-help',
      macroName: '{{WTL_TableLatest}}',
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前表格内容。'
    });
  };

  const stateRef = {
    get manualState() {
      return manualState;
    },
    set manualState(value) {
      manualState = value;
    },
    get activeSection() {
      return activeSection;
    },
    set activeSection(value) {
      activeSection = value;
    },
    get tableSectionOrder() {
      return tableSectionOrder;
    },
    set tableSectionOrder(value) {
      tableSectionOrder = value;
    },
    get hiddenRows() {
      return hiddenRows;
    },
    set hiddenRows(value) {
      hiddenRows = value;
    },
    get templateState() {
      return templateState;
    },
    set templateState(value) {
      templateState = value;
    },
    get templateActiveSectionId() {
      return templateActiveSectionId;
    },
    set templateActiveSectionId(value) {
      templateActiveSectionId = value;
    },
    get schemaSource() {
      return schemaSource;
    },
    set schemaSource(value) {
      schemaSource = value;
    },
    get pendingAiHistory() {
      return pendingAiHistory;
    },
    set pendingAiHistory(value) {
      pendingAiHistory = value;
    },
    get currentChatStateKey() {
      return currentChatStateKey;
    },
    set currentChatStateKey(value) {
      currentChatStateKey = value;
    },
    get lastRef() {
      return lastRef;
    },
    set lastRef(value) {
      lastRef = value;
    }
  };

  const {
    loadState,
    saveState,
    resetAllDefaults,
    reloadStateForCurrentChat
  } = createStateController({
    defaults,
    localStorageRef: localStorage,
    getChatKey,
    loadTableForChat,
    saveTableForChat,
    collectLoadStateSnapshot,
    seedStoredLoadStateSnapshot,
    persistCoreUiState,
    getStoredOrDefault,
    setStoredIfEmpty,
    getDefaultPromptText,
    getOpenAIPresets,
    getPromptPresets,
    getSchemaPresets,
    getSchemaScopedPresets,
    setSchemaScopedPresets,
    getPresetTextByName,
    getDefaultSchemaText,
    getBlocksPreset,
    getRefBlocksPreset,
    PREPROMPT_PRESET_KEY,
    PREPROMPT_PRESET_ACTIVE_KEY,
    INSTRUCTION_PRESET_KEY,
    INSTRUCTION_PRESET_ACTIVE_KEY,
    SCHEMA_PRESET_KEY,
    SCHEMA_PRESET_ACTIVE_KEY,
    safeParseJson,
    refreshPromptPresetSelect,
    refreshSchemaPresetSelect,
    refreshOpenAIPresetSelect,
    updateSchemaBindRadios,
    getSchemaScope,
    getSchemaScopeLabel,
    getChatDisplayName,
    getCharacterDisplayName,
    resolveSchemaByScope,
    parseSchemaToTemplate,
    buildTemplatePrompt,
    renderJsonToMarkdown,
    buildEmptyTableFromTemplate,
    ensureTableWrapper,
    serializeBlockOrder,
    renderBlockList,
    renderRefBlockList,
    renderPreview,
    refreshModeUi,
    syncPromptMacros,
    syncTableInjection,
    syncInstructionInjection,
    syncSchemaInjection,
    refreshPromptPreview,
    setAutoUi,
    setTableInjectUi,
    setDepthOnlyWhenFixed,
    ensurePromptFieldDefaults,
    updateSchemaPreview,
    renderManualWorldBookUI,
    removeStorageByPrefix,
    setPresetStore,
    getSchemaPreset,
    loadSchemaForMode,
    saveSchemaForMode,
    ui,
    state: stateRef,
    setStatus,
    appendHistory,
    reloadChatState
  });

  const removeStorageByPrefix = (prefix) => {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  };

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
      if (isEmpty) localStorage.setItem(key, JSON.stringify(payload || {}));
    } catch (e) {
      localStorage.setItem(key, JSON.stringify(payload || {}));
    }
  };

  const setPresetStore = (key, payload) => {
    localStorage.setItem(key, JSON.stringify(payload || {}));
  };


  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = `状态：${msg}`;
    console.log('[WorldTreeLibrary]', msg);
  };

  const notifyStatus = (type, msg) => {
    const toast = window?.toastr;
    if (!toast || typeof toast[type] !== 'function') return;
    toast[type](msg, 'WorldTreeLibrary');
  };


  const {
    openModal,
    openConfirmModal,
    closeModal,
    makeModalSaveButton
  } = createModalController({
    modalEl,
    modalTitleEl,
    modalContentEl,
    modalCustomEl,
    modalActionsEl
  });

  const findBlockElById = (id) => blockListEl?.querySelector(`.wtl-block[data-id="${id}"]`);
  const findRefBlockElById = (id) => refBlockListEl?.querySelector(`.wtl-block[data-id="${id}"]`);
  const findAnyBlockElById = (id) => findBlockElById(id) || findRefBlockElById(id);

  const {
    openBlockEdit,
    openBlockWrapperEdit,
    openBlockPreview
  } = createBlockModalController({
    openModal,
    makeModalSaveButton,
    buildReferenceBundle,
    formatReferenceText,
    getManualConfig,
    getWbMode: () => wbModeEl?.value || 'auto',
    getEntryName: () => entryEl?.value || 'WorldTreeMemory',
    getTableMarkdown: () => tableMdEl?.value || '',
    getInstructionMarkdown: () => {
      const enabled = instInjectToggleEl?.checked ?? true;
      return enabled ? (instructionEl?.value || '') : '';
    },
    getSchemaValue: () => schemaEl?.value || '',
    getSchemaSource: () => schemaSource,
    setSchemaSource: (value) => {
      schemaSource = value;
    },
    getTemplateState: () => templateState,
    setTemplateState: (value) => {
      templateState = value;
    },
    setTemplateActiveSectionId: (value) => {
      templateActiveSectionId = value;
    },
    updateSchemaPreview,
    saveState,
    refreshPromptPreview,
    findAnyBlockElById,
    refBlockListEl,
    getRefBlocksPreset,
    getRefOrderPreset,
    getLastRef: () => lastRef,
    setLastRef: (value) => {
      lastRef = value;
    },
    getPrePromptText: () => prePromptEl?.value || '',
    setPrePromptText: (value) => {
      if (prePromptEl) prePromptEl.value = value;
    },
    setInstructionText: (value) => {
      if (instructionEl) instructionEl.value = value;
    },
    setSchemaText: (value) => {
      if (schemaEl) schemaEl.value = value;
    },
    setTableMarkdown: (value) => {
      if (tableMdEl) tableMdEl.value = value;
    }
  });

  const {
    renderBlockList,
    renderRefBlockList
  } = createBlockEditorController({
    blockListEl,
    refBlockListEl,
    getBlocksPreset,
    getRefBlocksPreset,
    saveState,
    refreshPromptPreview,
    openBlockPreview,
    openBlockWrapperEdit,
    openBlockEdit,
    blockAddEl,
    refBlockAddEl
  });

  const saveTemplateDialogChanges = () => {
    const templateDialogTarget = getTemplateDialogTarget();
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

  if (modalCloseEl) {
    modalCloseEl.addEventListener('click', closeModal);
  }
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
  }



  const getManualConfig = () => readManualWorldBookConfig(wbManualEl?.value || '{"books": []}');

  const setManualConfig = (cfg) => {
    if (wbManualEl) wbManualEl.value = serializeManualWorldBookConfig(cfg);
  };

  let manualWorldBookEditor = null;

  const renderManualWorldBookUI = (cfg) => {
    manualState = normalizeManualWorldBookConfig(cfg);
    if (!wbManualUiEl) return;
    manualWorldBookEditor = renderManualWorldBookEditor({
      host: wbManualUiEl,
      normalizeManualConfig: normalizeManualWorldBookConfig,
      getConfig: () => manualState,
      setConfig: (value) => {
        manualState = normalizeManualWorldBookConfig(value);
        setManualConfig(manualState);
      },
      saveState,
      refreshPromptPreview
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

  const updateTableRows = (sectionIndex, updater) => {
    if (!tableMdEl) return;
    const result = updatePreviewTableRows({
      tableMd: tableMdEl.value || '',
      sectionIndex,
      hiddenRows,
      updater
    });
    hiddenRows = result.hiddenRows;
    tableMdEl.value = result.nextMarkdown;
    renderPreview(result.nextMarkdown);
    saveState();
    refreshPromptPreview(true);
  };

  const moveRow = (sectionIndex, from, to) => {
    if (!tableMdEl) return;
    const result = moveTableRow({
      tableMd: tableMdEl.value || '',
      sectionIndex,
      from,
      to,
      hiddenRows
    });
    hiddenRows = result.hiddenRows;
    tableMdEl.value = result.nextMarkdown;
    renderPreview(result.nextMarkdown);
    saveState();
    refreshPromptPreview(true);
  };

  const bindRowDrag = () => {
    bindPreviewRowDrag({
      tableEditMode: () => tableEditMode,
      moveRow
    });
  };

  const applyPreviewEditsToMarkdown = () => {
    const tableEl = document.getElementById('wtl-table-view');
    return applyTablePreviewEdits({
      tableMd: tableMdEl?.value || '',
      tableEl,
      activeSection
    });
  };

  const renderTabs = (sections) => {
    renderPreviewTabs({
      tableTabsEl,
      sections,
      activeSection,
      templateEditMode: () => templateEditMode,
      templateState: () => templateState,
      openTemplateDialog,
      makeModalSaveButton,
      openConfirmModal,
      templateToSchemaMarkdown,
      getTableMarkdown: () => tableMdEl?.value || '',
      setTableMarkdown: (value) => {
        if (tableMdEl) tableMdEl.value = value;
      },
      setTemplateState: (value) => {
        templateState = value;
      },
      templateActiveSectionId: () => templateActiveSectionId,
      setTemplateActiveSectionId: (value) => {
        templateActiveSectionId = value || '';
      },
      renderPreview,
      renderTemplateSections,
      renderTemplateColumns,
      updateSchemaPreview,
      refreshPromptPreview,
      setActiveSection: (value) => {
        activeSection = value || '';
      },
      setTableSectionOrder: (value) => {
        tableSectionOrder = Array.isArray(value) ? value : [];
      },
      bindDrag: bindGenericDrag
    });
  };

  const renderPreview = (md) => {
    renderTablePreview({
      md,
      headEl,
      bodyEl,
      tableTabsEl,
      parseSections,
      hiddenRows,
      templateEditMode: () => templateEditMode,
      tableEditMode: () => tableEditMode,
      enableTableInlineEditing,
      disableTableInlineEditing,
      bindRowDrag,
      templateState: () => templateState,
      openTemplateDialog,
      updateTableRows,
      moveRow,
      activeSection: () => activeSection,
      setActiveSection: (value) => {
        activeSection = value || '';
      },
      tableSectionOrder: () => tableSectionOrder,
      setTableSectionOrder: (value) => {
        tableSectionOrder = Array.isArray(value) ? value : [];
      },
      renderTabs
    });
  };

  const reorderColumns = reorderColumnsInMarkdown;

  const reorderSections = reorderSectionsInMarkdown;

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

  const {
    openHistoryModal,
    restoreHistoryByOffset,
    appendHistory,
    getHistoryKey,
    getHistoryIndexKey
  } = createHistoryModalController({
    getChatKey,
    modalCustomEl,
    modalContentEl,
    openModal,
    closeModal,
    saveState,
    setStatus,
    renderPreview,
    renderJsonToMarkdown,
    parseMarkdownTableToJson,
    getTableMarkdown: () => tableMdEl?.value || '',
    setTableMarkdown: (value) => {
      if (tableMdEl) tableMdEl.value = value || '';
    },
    getHiddenRows: () => hiddenRows,
    setHiddenRows: (value) => {
      hiddenRows = value || {};
    }
  });

  const { runBatchFill } = createBatchController({
    batchStartEl,
    batchEndEl,
    batchStepEl,
    setStatus,
    runFillOnce
  });

  const { refreshModels } = createOpenAiModelController({
    openaiUrlEl,
    openaiKeyEl,
    openaiModelEl
  });

  const getManagedPromptInjectionItems = () => buildManagedPromptInjectionItems({
    defaults,
    entryName: entryEl?.value || 'WorldTreeMemory',
    instruction: {
      enabled: Boolean(instInjectToggleEl?.checked),
      mode: instModeEl?.value || defaults.instMode || 'inject',
      content: instructionEl?.value || '',
      position: instPosEl?.value || defaults.instPos,
      role: instRoleEl?.value || defaults.instRole,
      depth: instDepthEl?.value || defaults.instDepth,
      order: instOrderEl?.value || defaults.instOrder
    },
    schema: {
      enabled: Boolean(schemaInjectToggleEl?.checked),
      mode: schemaModeSendEl?.value || defaults.schemaSendMode || 'inject',
      content: schemaEl?.value || '',
      position: schemaPosEl?.value || defaults.schemaPos,
      role: schemaRoleEl?.value || defaults.schemaRole,
      depth: schemaDepthEl?.value || defaults.schemaDepth,
      order: schemaOrderEl?.value || defaults.schemaOrder
    },
    table: {
      enabled: Boolean(tableInjectToggleBtn?.checked),
      mode: tableModeEl?.value || defaults.tableMode || 'inject',
      content: tableMdEl?.value || '',
      position: tablePosEl?.value || defaults.tablePos,
      role: tableRoleEl?.value || defaults.tableRole,
      depth: tableDepthEl?.value || defaults.tableDepth,
      order: tableOrderEl?.value || defaults.tableOrder
    },
    getTablePreviewForSend
  });

  const runtimeInjectedInputRef = {
    get current() {
      return runtimeInjectedInput;
    },
    set current(value) {
      runtimeInjectedInput = value;
    }
  };

  const {
    restoreManagedPromptInput,
    applyManagedPromptInjection,
    syncManagedPromptInjections,
    syncTableInjection,
    syncInstructionInjection,
    syncSchemaInjection
  } = createManagedPromptInjectionController({
    getSendModeFlags,
    getManagedPromptInjectionItems,
    runtimeInjectedInputRef
  });

  const bindDrag = bindGenericDrag;

  const { refreshPromptPreview } = createPromptPreviewController({
    logContentEl,
    logPromptBtn,
    buildReferenceBundle,
    formatReferenceText,
    buildPrompt,
    applyAllPromptMacros,
    getManualConfig,
    getWbMode: () => wbModeEl?.value || 'auto',
    getEntryName: () => entryEl?.value || 'WorldTreeMemory',
    getTableMarkdown: () => tableMdEl?.value || '',
    getInstructionMarkdown: () => instructionEl?.value || '',
    refBlockListEl,
    getRefBlocksPreset,
    getRefOrderPreset,
    blockListEl,
    getPrePromptText: () => prePromptEl?.value || '',
    getSchemaText: () => schemaEl?.value || '',
    getTemplateState: () => templateState,
    getHiddenRows: () => hiddenRows,
    getLastRef: () => lastRef,
    setLastRef: (value) => {
      lastRef = value;
    }
  });

  const { ensureHooks } = createHookController({
    getSendModeFlags,
    refreshPromptPreview,
    saveState,
    tableInjectToggleBtn,
    instInjectToggleEl,
    schemaInjectToggleEl,
    syncTableInjection,
    syncInstructionInjection,
    syncSchemaInjection,
    applyManagedPromptInjection,
    restoreManagedPromptInput
  });

  bindPageControls({
    openConfigBtn,
    backMainBtn,
    pageMainEl,
    pageConfigEl,
    hideTemplateEditor,
    sendModeEl,
    logPromptBtn,
    logAiBtn,
    logContentEl,
    logRefreshBtn,
    refreshSchemaBtn,
    refreshPromptPreview,
    updateSchemaPreview,
    setStatus
  });

  const { setExternalLeftTab } = createExternalTabController({
    externalNavOrderBtn,
    externalNavRefBtn,
    externalNavWbBtn,
    externalPanelOrderEl,
    externalPanelRefEl,
    externalPanelWbEl
  });

  bindModeControls({
    sendModeEl,
    instModeEl,
    schemaModeSendEl,
    tableModeEl,
    refreshModeUi,
    saveState,
    setExternalLeftTab,
    syncInstructionInjection,
    syncSchemaInjection,
    syncTableInjection,
    refreshPromptPreview
  });

  const { ensurePreviewAutoRefresh } = createAutoRefreshController({
    pageConfigEl,
    sendModeEl,
    logPromptBtn,
    logAiBtn,
    logContentEl,
    refreshPromptPreview
  });
  ensurePreviewAutoRefresh();

  if ((sendModeEl?.value || 'st') === 'external') {
    setExternalLeftTab('order');
  }
  refreshModeUi();

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

  bindWorldBookControls({
    wbModeEl,
    wbManualWrapEl,
    wbManualEl,
    wbManualRefreshEl,
    buildManualWorldBookTemplate,
    getManualConfig,
    mergeManualConfig,
    setManualConfig,
    renderManualWorldBookUI,
    saveState,
    refreshPromptPreview
  });

  bindOpenAiPresetControls({
    openaiRefreshEl,
    openaiPresetLoadEl,
    openaiPresetDelEl,
    externalSaveEl,
    openaiPresetEl,
    openaiPresetNameEl,
    openaiUrlEl,
    openaiKeyEl,
    openaiModelEl,
    openaiTempEl,
    openaiMaxEl,
    openaiStreamEl,
    refreshModels,
    loadOpenAIPresetByName,
    getOpenAIPresets,
    setOpenAIPresets,
    refreshOpenAIPresetSelect,
    saveState,
    setStatus
  });

  const hiddenRowsRef = {
    get: () => hiddenRows,
    set: (value) => {
      hiddenRows = value || {};
    }
  };

  const { runFillOnce } = createFillController({
    buildReferenceBundle,
    formatReferenceText,
    getManualConfig,
    wbModeEl,
    entryEl,
    tableMdEl,
    instructionEl,
    refBlockListEl,
    getRefBlocksPreset,
    getRefOrderPreset,
    blockListEl,
    prePromptEl,
    schemaEl,
    templateState: () => templateState,
    hiddenRowsRef,
    buildPrompt,
    applyAllPromptMacros,
    logPromptBtn,
    logAiBtn,
    logContentEl,
    sendModeEl,
    callAi,
    openaiUrlEl,
    openaiKeyEl,
    openaiModelEl,
    openaiTempEl,
    openaiMaxEl,
    openaiStreamEl,
    parseCommands,
    extractEditPayload,
    applyCommands,
    stripTableWrapper,
    ensureTableWrapper,
    renderPreview,
    saveState,
    setStatus,
    notifyStatus,
    getRefBlockEls,
    getBlockEls,
    onPendingAiHistory: (value) => {
      pendingAiHistory = value;
    },
    onLastRef: (value) => {
      lastRef = value;
    },
    getRunning: () => running,
    setRunning: (value) => {
      running = Boolean(value);
    }
  });

  bindCommonActionControls({
    runBtn: document.getElementById('wtl-run'),
    stopBtn: document.getElementById('wtl-stop'),
    clearBtn: document.getElementById('wtl-clear'),
    saveBtn: document.getElementById('wtl-save'),
    resetGlobalBtn,
    clearTableBtn,
    makeModalSaveButton,
    openConfirmModal,
    resetAllDefaults,
    tableMdEl,
    renderPreview,
    saveState,
    refreshPromptPreview,
    setStatus,
    getRunning: () => running,
    setRunning: (value) => {
      running = Boolean(value);
    },
    runFillOnce
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

  tableMdEl?.addEventListener('input', () => {
    renderPreview(tableMdEl.value);
    refreshPromptPreview(true);
  });
  prePromptEl?.addEventListener('input', () => {
    if (!String(prePromptEl.value || '').trim()) {
      ensurePromptFieldDefaults();
    }
    refreshPromptPreview(true);
  });
  prePromptEl?.addEventListener('blur', async () => {
    if (!ensurePromptFieldDefaults()) return;
    await saveState();
    refreshPromptPreview(true);
  });
  instructionEl?.addEventListener('input', () => {
    if (!String(instructionEl.value || '').trim()) {
      ensurePromptFieldDefaults();
    }
    refreshPromptPreview(true);
  });
  instructionEl?.addEventListener('blur', async () => {
    if (!ensurePromptFieldDefaults()) return;
    await saveState();
    refreshPromptPreview(true);
  });
  schemaEl?.addEventListener('input', () => {
    if (!String(schemaEl.value || '').trim()) {
      ensurePromptFieldDefaults({ syncSchema: true });
    }
    schemaSource = schemaEl.value;
    if (schemaModeEl) saveSchemaForMode(schemaModeEl.value, schemaSource);
    templateState = parseSchemaToTemplate(schemaSource);
    templateActiveSectionId = templateState.sections[0]?.id || '';
    updateSchemaPreview();
    refreshPromptPreview(true);
  });
  schemaEl?.addEventListener('blur', async () => {
    if (!ensurePromptFieldDefaults({ syncSchema: true })) return;
    await saveState();
    refreshPromptPreview(true);
  });

  const { updateSchemaEffectiveUi } = bindSchemaPresetControls({
    schemaPresetEl,
    schemaPresetNameEl,
    schemaPresetLoadEl,
    schemaPresetSaveEl,
    schemaPresetRenameEl,
    schemaPresetDelEl,
    schemaPresetImportEl,
    schemaPresetFileEl,
    schemaPresetExportEl,
    schemaBindGlobalEl,
    schemaBindCharacterEl,
    schemaBindChatEl,
    schemaEl,
    schemaEffectiveEl,
    getSchemaPresets,
    setSchemaPresets,
    getSchemaScope,
    getSchemaScopeLabel,
    getSchemaScopedPresets,
    setSchemaScopedPresets,
    getCurrentChatId,
    getCurrentCharacterId,
    resolveSchemaByScope,
    parseSchemaToTemplate,
    updateSchemaPreview,
    refreshPromptPreview,
    importPresetFile,
    exportPresetFile,
    downloadJsonFile,
    saveSchemaPresetValue,
    renameSchemaPresetValue,
    deleteSchemaPresetValue,
    updateSchemaBindRadios,
    onSchemaLoaded: ({ schemaSource: nextSchemaSource, templateState: nextTemplateState }) => {
      schemaSource = nextSchemaSource;
      templateState = nextTemplateState;
      templateActiveSectionId = templateState.sections[0]?.id || '';
    },
    setStatus
  });

  bindTextPresetControls({
    selectEl: prepromptPresetEl,
    nameEl: prepromptPresetNameEl,
    textareaEl: prePromptEl,
    loadBtn: prepromptPresetLoadEl,
    saveBtn: prepromptPresetSaveEl,
    renameBtn: prepromptPresetRenameEl,
    deleteBtn: prepromptPresetDelEl,
    importBtn: prepromptPresetImportEl,
    fileEl: prepromptPresetFileEl,
    exportBtn: prepromptPresetExportEl,
    storageKey: PREPROMPT_PRESET_KEY,
    activeStorageKey: PREPROMPT_PRESET_ACTIVE_KEY,
    getPromptPresets,
    setPromptPresets,
    loadTextPresetValue,
    saveTextPresetValue,
    renameTextPresetValue,
    deleteTextPresetValue,
    importPresetFile,
    exportPresetFile,
    downloadJsonFile,
    refreshPromptPreview,
    setStatus,
    labels: {
      subject: '破限提示',
      filename: 'wtl-preprompt-presets.json'
    }
  });

  bindTextPresetControls({
    selectEl: instructionPresetEl,
    nameEl: instructionPresetNameEl,
    textareaEl: instructionEl,
    loadBtn: instructionPresetLoadEl,
    saveBtn: instructionPresetSaveEl,
    renameBtn: instructionPresetRenameEl,
    deleteBtn: instructionPresetDelEl,
    importBtn: instructionPresetImportEl,
    fileEl: instructionPresetFileEl,
    exportBtn: instructionPresetExportEl,
    storageKey: INSTRUCTION_PRESET_KEY,
    activeStorageKey: INSTRUCTION_PRESET_ACTIVE_KEY,
    getPromptPresets,
    setPromptPresets,
    loadTextPresetValue,
    saveTextPresetValue,
    renameTextPresetValue,
    deleteTextPresetValue,
    importPresetFile,
    exportPresetFile,
    downloadJsonFile,
    refreshPromptPreview,
    setStatus,
    labels: {
      subject: '填表指令',
      filename: 'wtl-instruction-presets.json'
    }
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

  bindResetAndHistoryControls({
    resetSchemaBtn,
    blockResetEl,
    refBlockResetEl,
    historyBackBtn,
    historyUndoBtn,
    historyBtn,
    makeModalSaveButton,
    openConfirmModal,
    getSchemaPreset,
    parseSchemaToTemplate,
    renderJsonToMarkdown,
    buildEmptyTableFromTemplate,
    buildTemplatePrompt,
    schemaEl,
    tableMdEl,
    renderPreview,
    renderTemplateSections,
    renderTemplateColumns,
    updateSchemaPreview,
    saveState,
    refreshPromptPreview,
    setStatus,
    getBlocksPreset,
    renderBlockList,
    getRefBlocksPreset,
    renderRefBlockList,
    restoreHistoryByOffset,
    openHistoryModal,
    onSchemaReset: ({ schemaSource: nextSchemaSource, templateState: nextTemplateState }) => {
      schemaSource = nextSchemaSource;
      templateState = nextTemplateState;
      templateActiveSectionId = templateState.sections[0]?.id || '';
    }
  });

  bindTemplateEditingControls({
    editTableBtn,
    editTemplateBtn,
    sectionAddBtn,
    columnAddBtn,
    sectionApplyBtn,
    editorDialogSaveEl,
    editorDialogCloseEl,
    editorOverlayEl,
    editorDialogInsertEnabledEl,
    editorDialogAddEl,
    editorDialogUpdateEnabledEl,
    editorDialogEditEl,
    editorDialogDeleteEnabledEl,
    editorDialogDelEl,
    sectionListEl,
    columnListEl,
    tableTabsEl,
    headEl,
    bindTemplateDrag,
    openTemplateDialog,
    closeTemplateDialog,
    saveTemplateDialogChanges,
    saveTemplateState,
    renderPreview,
    applyPreviewEditsToMarkdown,
    disableTableInlineEditing,
    saveState,
    refreshPromptPreview,
    updateSchemaPreview,
    reorderColumns,
    reorderSections,
    tableMdEl,
    getTemplateEditMode: () => templateEditMode,
    setTemplateEditMode: (value) => {
      templateEditMode = Boolean(value);
    },
    getTableEditMode: () => tableEditMode,
    setTableEditMode: (value) => {
      tableEditMode = Boolean(value);
    },
    getActiveSection: () => activeSection,
    getTemplateState: () => templateState,
    setTemplateState: (value) => {
      templateState = value;
    },
    getTemplateActiveSectionId: () => templateActiveSectionId,
    setTableSectionOrder: (value) => {
      tableSectionOrder = value;
    },
    renderTemplateSections,
    renderTemplateColumns,
    setStatus
  });

  batchBtn?.addEventListener('click', async () => {
    await runBatchFill();
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

  if (!window.__wtlChatHook) {
    window.__wtlChatHook = true;
    if (event_types?.CHAT_CHANGED) {
      eventSource.on(event_types.CHAT_CHANGED, () => reloadStateForCurrentChat());
    }
    if (event_types?.CHAT_LOADED) {
      eventSource.on(event_types.CHAT_LOADED, () => reloadStateForCurrentChat());
    }
    if (event_types?.CHAT_CHANGED_MANUALLY) {
      eventSource.on(event_types.CHAT_CHANGED_MANUALLY, () => reloadStateForCurrentChat());
    }
  }
}
