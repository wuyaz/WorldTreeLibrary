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
import { getBlockEls, getRefBlockEls } from './blocks.js';
import { getUiRefs } from './refs.js';
import {
  PREPROMPT_PRESET_KEY,
  PREPROMPT_PRESET_ACTIVE_KEY,
  INSTRUCTION_PRESET_KEY,
  INSTRUCTION_PRESET_ACTIVE_KEY,
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
  let templateDialogTarget = null;
  let tableEditMode = false;
  let templateEditMode = false;
  let schemaSource = '';
  let pendingAiHistory = null;

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

  const refreshPromptPresetSelect = (selectEl, presets) => {
    if (!selectEl) return;
    const names = Object.keys(presets || {}).sort();
    selectEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('') || '<option value="">(无预设)</option>';
  };

  const refreshSchemaPresetSelect = (selectEl, presets) => {
    if (!selectEl) return;
    const names = Object.keys(presets || {}).sort();
    selectEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('') || '<option value="">(无预设)</option>';
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

  const appendHistory = (tableJson, tableMd, meta = {}) => {
    const key = getHistoryKey();
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const entry = { time: new Date().toISOString(), tableJson, table: tableMd };
    if (meta && typeof meta === 'object') {
      if (meta.aiCommandText) entry.aiCommandText = meta.aiCommandText;
      if (meta.aiRawText) entry.aiRawText = meta.aiRawText;
      if (meta.source) entry.source = meta.source;
    }
    list.push(entry);
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem(getHistoryIndexKey(), String(list.length - 1));
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
          fillable: sec.fillable,
          sendable: sec.sendable
        });
      });
      delBtn.addEventListener('click', () => {
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
      });

      sectionListEl.appendChild(item);
    });
  };

  const renderTemplateColumns = () => {
    const sec = templateState.sections.find(s => s.id === templateActiveSectionId) || templateState.sections[0];
    if (!columnListEl || !sec) return;
    columnListEl.innerHTML = '';
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

      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTemplateDialog('编辑列', { type: 'column', sectionId: sec.id, id: col.id }, {
          name: col.name,
          definition: col.definition,
          deleteRule: col.deleteRule,
          insertRule: col.insertRule,
          updateRule: col.updateRule
        });
      });
      delBtn.addEventListener('click', () => {
        const targetIdx = sec.columns.findIndex(c => c.id === col.id);
        if (targetIdx < 0) return;
        sec.columns.splice(targetIdx, 1);

        const sections = parseSections(tableMdEl?.value || '');
        const nextSections = sections.map((s) => {
          if (s.name !== (sec?.name || '')) return s;
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

  const saveTableForChat = async (tableMd, meta = {}) => {
    const metadata = getChatMetadata();
    const ctx = window.SillyTavern?.getContext?.();
    const wrapped = wrapTable(tableMd);
    const tableJson = parseMarkdownTableToJson(wrapped);
    tableJson.hiddenRows = hiddenRows || {};
    appendHistory(tableJson, wrapped, meta);
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
    if (tableMdEl) await saveTableForChat(ensureTableWrapper(tableMdEl.value), pendingAiHistory || {});
    pendingAiHistory = null;
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

  const resetAllDefaults = async () => {
    const presetData = window.__WTL_PRESETS__ || {};
    const defaultSchema = getDefaultSchemaText();
    const defaultPreprompt = getPresetTextByName(PREPROMPT_PRESET_KEY, '默认', '')
      || (Array.isArray(presetData?.preprompt?.['默认']) ? presetData.preprompt['默认'].join('\n') : String(presetData?.preprompt?.['默认'] || ''))
      || '';
    const defaultInstruction = getPresetTextByName(INSTRUCTION_PRESET_KEY, '默认', '')
      || (Array.isArray(presetData?.instruction?.['默认']) ? presetData.instruction['默认'].join('\n') : String(presetData?.instruction?.['默认'] || ''))
      || '';

    setPresetStore('wtl.openai.presets', presetData.openai);
    setPresetStore(PREPROMPT_PRESET_KEY, presetData.preprompt);
    setPresetStore(INSTRUCTION_PRESET_KEY, presetData.instruction);
    setPresetStore(SCHEMA_PRESET_KEY, presetData.schema);
    setPresetStore('wtl.order.presets', presetData.order);
    setPresetStore('wtl.refOrder.presets', presetData.refOrder);
    setPresetStore('wtl.blocks.presets', presetData.blocks);
    setPresetStore('wtl.refBlocks.presets', presetData.refBlocks);

    localStorage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, '默认');
    localStorage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, '默认');
    localStorage.setItem(SCHEMA_PRESET_ACTIVE_KEY, '默认');
    localStorage.setItem('wtl.order.presetActive', '默认');
    localStorage.setItem('wtl.refOrder.presetActive', '默认');
    localStorage.setItem('wtl.blocks.presetActive', '默认');
    localStorage.setItem('wtl.refBlocks.presetActive', '默认');

    setSchemaScopedPresets({});
    removeStorageByPrefix('wtl.schema.character.');

    if (schemaModeEl) schemaModeEl.value = defaults.schemaMode;
    if (sendModeEl) sendModeEl.value = defaults.sendMode;
    if (wbModeEl) wbModeEl.value = defaults.wbReadMode;
    if (wbManualEl) wbManualEl.value = defaults.wbManual;
    if (entryEl) entryEl.value = defaults.entry;

    setAutoUi(false);
    if (autoFloorsEl) autoFloorsEl.value = '12';
    if (autoEveryEl) autoEveryEl.value = '1';

    if (tableInjectToggleBtn) tableInjectToggleBtn.checked = defaults.tableInjectEnabled === 'true' || defaults.tableInjectEnabled === true;
    if (tablePosEl) tablePosEl.value = defaults.tablePos;
    if (tableRoleEl) tableRoleEl.value = defaults.tableRole;
    if (tableDepthEl) tableDepthEl.value = defaults.tableDepth;
    if (tableOrderEl) tableOrderEl.value = defaults.tableOrder;
    setDepthOnlyWhenFixed(tablePosEl, tableDepthEl);

    if (instInjectToggleEl) instInjectToggleEl.checked = defaults.instInjectEnabled === 'true' || defaults.instInjectEnabled === true;
    if (instPosEl) instPosEl.value = defaults.instPos;
    if (instRoleEl) instRoleEl.value = defaults.instRole;
    if (instDepthEl) instDepthEl.value = defaults.instDepth;
    if (instOrderEl) instOrderEl.value = defaults.instOrder;
    setDepthOnlyWhenFixed(instPosEl, instDepthEl);

    if (schemaInjectToggleEl) schemaInjectToggleEl.checked = defaults.schemaInjectEnabled === 'true' || defaults.schemaInjectEnabled === true;
    if (schemaPosEl) schemaPosEl.value = defaults.schemaPos;
    if (schemaRoleEl) schemaRoleEl.value = defaults.schemaRole;
    if (schemaDepthEl) schemaDepthEl.value = defaults.schemaDepth;
    if (schemaOrderEl) schemaOrderEl.value = defaults.schemaOrder;
    setDepthOnlyWhenFixed(schemaPosEl, schemaDepthEl);

    if (openaiUrlEl) openaiUrlEl.value = defaults.openaiUrl;
    if (openaiKeyEl) openaiKeyEl.value = defaults.openaiKey;
    if (openaiModelEl) openaiModelEl.value = defaults.openaiModel || '';
    if (openaiTempEl) openaiTempEl.value = defaults.openaiTemp;
    if (openaiMaxEl) openaiMaxEl.value = defaults.openaiMax;

    if (prePromptEl) prePromptEl.value = defaultPreprompt || '';
    if (instructionEl) instructionEl.value = defaultInstruction || '';
    if (editPrepromptBtn) editPrepromptBtn.textContent = '编辑';
    if (editInstructionBtn) editInstructionBtn.textContent = '编辑';

    refreshPromptPresetSelect(prepromptPresetEl, getPromptPresets(PREPROMPT_PRESET_KEY));
    refreshPromptPresetSelect(instructionPresetEl, getPromptPresets(INSTRUCTION_PRESET_KEY));
    if (prepromptPresetEl) prepromptPresetEl.value = '默认';
    if (instructionPresetEl) instructionPresetEl.value = '默认';
    if (prepromptPresetNameEl) prepromptPresetNameEl.value = '默认';
    if (instructionPresetNameEl) instructionPresetNameEl.value = '默认';

    refreshSchemaPresetSelect(schemaPresetEl, getSchemaPresets());
    if (schemaPresetEl) schemaPresetEl.value = '默认';
    if (schemaPresetNameEl) schemaPresetNameEl.value = '默认';
    updateSchemaBindRadios('global');
    if (schemaEffectiveEl) schemaEffectiveEl.textContent = '全局 · 默认';

    if (blockListEl) renderBlockList(getBlocksPreset() || []);
    if (refBlockListEl) renderRefBlockList(getRefBlocksPreset() || []);
    localStorage.removeItem('wtl.blockOrder');
    localStorage.removeItem('wtl.refBlockOrder');

    schemaSource = defaultSchema || '';
    templateState = parseSchemaToTemplate(schemaSource);
    templateActiveSectionId = templateState.sections[0]?.id || '';
    if (schemaEl) schemaEl.value = buildTemplatePrompt(templateState) || schemaSource;
    updateSchemaPreview();

    refreshOpenAIPresetSelect();
    await saveState();
    await syncTableInjection();
    await syncInstructionInjection();
    await syncSchemaInjection();
    refreshPromptPreview(true);
    await loadState();
    setStatus('已恢复默认');
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
      const ref = lastRef || await buildReferenceBundle({
        overrideChat: null,
        wbMode: wbModeEl?.value || 'auto',
        manualConfig: getManualConfig(),
        worldBookName: 'Current Chat'
      });
      const refBlocks = await formatReferenceText({
        ref,
        entryName: entryEl?.value || 'WorldTreeMemory',
        tableMd: tableMdEl?.value || '',
        instructionMd: instructionEl?.value || '',
        refBlockEls: getRefBlockEls(refBlockListEl),
        refBlocksPreset: getRefBlocksPreset() || [],
        refOrderPreset: getRefOrderPreset() || []
      });
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
        const summary = document.createElement('div');
        summary.className = 'wtl-editor-hint';
        summary.textContent = item?.source ? `来源：${item.source}` : '来源：手动/未知';
        modalCustomEl.appendChild(summary);
        if (item?.aiCommandText) {
          const label = document.createElement('div');
          label.className = 'wtl-badge';
          label.textContent = '填表指令（AI）';
          const block = document.createElement('div');
          block.className = 'wtl-modal-message';
          block.textContent = item.aiCommandText;
          modalCustomEl.appendChild(label);
          modalCustomEl.appendChild(block);
        }
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
      const ref = force
        ? await buildReferenceBundle({
          overrideChat: null,
          wbMode: wbModeEl?.value || 'auto',
          manualConfig: getManualConfig(),
          worldBookName: 'Current Chat'
        })
        : (lastRef || await buildReferenceBundle({
          overrideChat: null,
          wbMode: wbModeEl?.value || 'auto',
          manualConfig: getManualConfig(),
          worldBookName: 'Current Chat'
        }));
      const refBlocks = await formatReferenceText({
        ref,
        entryName: entryEl?.value || 'WorldTreeMemory',
        tableMd: tableMdEl?.value || '',
        instructionMd: instructionEl?.value || '',
        refBlockEls: getRefBlockEls(refBlockListEl),
        refBlocksPreset: getRefBlocksPreset() || [],
        refOrderPreset: getRefOrderPreset() || []
      });
      const promptText = buildPrompt({
        blockEls: getBlockEls(blockListEl),
        refTextBlocks: refBlocks,
        prePromptText: prePromptEl?.value || '',
        instructionText: instructionEl?.value || '',
        schemaText: schemaEl?.value || '',
        tableText: tableMdEl?.value || '',
        templateState,
        hiddenRows
      });
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
      const ref = await buildReferenceBundle({
        overrideChat,
        wbMode: wbModeEl?.value || 'auto',
        manualConfig: getManualConfig(),
        worldBookName: 'Current Chat'
      });
      lastRef = ref;
      const refBlocks = await formatReferenceText({
        ref,
        entryName: entryEl?.value || 'WorldTreeMemory',
        tableMd: tableMdEl?.value || '',
        instructionMd: instructionEl?.value || '',
        refBlockEls: getRefBlockEls(refBlockListEl),
        refBlocksPreset: getRefBlocksPreset() || [],
        refOrderPreset: getRefOrderPreset() || []
      });
      const promptText = buildPrompt({
        blockEls: getBlockEls(blockListEl),
        refTextBlocks: refBlocks,
        prePromptText: prePromptEl?.value || '',
        instructionText: instructionEl?.value || '',
        schemaText: schemaEl?.value || '',
        tableText: tableMdEl?.value || '',
        templateState,
        hiddenRows
      });
      localStorage.setItem('wtl.lastPrompt', promptText || '');
      if (logPromptBtn?.dataset?.active === 'true' && logContentEl) logContentEl.value = promptText || '';

      const sendMode = sendModeEl?.value || 'st';
      const aiText = await callAi({
        sendMode,
        promptText,
        logPrompt: (text) => {
          if (logPromptBtn?.dataset?.active === 'true' && logContentEl) logContentEl.value = text || '';
        },
        logAi: (text) => {
          if (logAiBtn?.dataset?.active === 'true' && logContentEl) logContentEl.value = text || '';
        },
        openai: {
          baseUrl: openaiUrlEl?.value || '',
          apiKey: openaiKeyEl?.value || '',
          model: openaiModelEl?.value || '',
          temperature: Number(openaiTempEl?.value || 0.7),
          maxTokens: Number(openaiMaxEl?.value || 1024)
        }
      });
      localStorage.setItem('wtl.lastAi', aiText || '');
      const cmds = parseCommands(extractEditPayload(aiText));
      pendingAiHistory = {
        aiCommandText: extractEditPayload(aiText) || '',
        aiRawText: aiText || '',
        source: sendMode === 'external' ? '第三方 API' : '酒馆'
      };
      const applied = applyCommands(stripTableWrapper(tableMdEl?.value || ''), cmds, templateState, hiddenRows);
      hiddenRows = applied?.hiddenRows || {};
      const wrapped = ensureTableWrapper(applied?.markdown || '');
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

  resetGlobalBtn?.addEventListener('click', () => {
    const confirmBtn = makeModalSaveButton('确认恢复', async () => {
      await resetAllDefaults();
    });
    openConfirmModal('全局恢复默认', '该操作将重置所有 WTL 设置为默认（预设/模板/顺序/注入设置等），是否继续？', [confirmBtn]);
  });

  clearTableBtn?.addEventListener('click', () => {
    const confirmBtn = makeModalSaveButton('确认清空', async () => {
      if (tableMdEl) tableMdEl.value = '';
      renderPreview('');
      await saveState();
      refreshPromptPreview(true);
      setStatus('表格已清空');
    });
    openConfirmModal('清空表格', '该操作将清空当前聊天表格内容，是否继续？', [confirmBtn]);
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
