import { stripTableWrapper, wrapTable } from '../data/markdown.js';

export function createPromptMacroController({
  defaults,
  localStorageRef,
  sendModeEl,
  instModeEl,
  schemaModeSendEl,
  tableModeEl,
  stModeEl,
  externalEl,
  instBlockEl,
  schemaBlockEl,
  tableInjectToggleBtn,
  tablePosEl,
  tableRoleEl,
  tableDepthEl,
  tableOrderEl,
  instInjectToggleEl,
  instPosEl,
  instRoleEl,
  instDepthEl,
  instOrderEl,
  schemaInjectToggleEl,
  schemaPosEl,
  schemaRoleEl,
  schemaDepthEl,
  schemaOrderEl,
  prePromptEl,
  instructionEl,
  schemaEl,
  schemaModeEl,
  getDefaultPromptValues,
  saveSchemaForMode,
  parseSchemaToTemplate,
  buildTemplatePrompt,
  getTemplateState,
  setTemplateState,
  setTemplateActiveSectionId,
  getTableMarkdown,
  getHiddenRows,
  updateSchemaPreview,
  getSendModeFlags,
  setModeConfigVisibility
}) {
  let macroRegistered = false;

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
        const meta = getTemplateState()?.sections?.[sectionIndex - 1];
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
        const rowIndex = Math.max(1, out.filter((l) => l.trim().startsWith('|')).length - 2);
        const hidden = Boolean(getHiddenRows()?.[String(sectionIndex)]?.[String(rowIndex)]);
        if (!hidden) out.push(line);
        continue;
      }
      out.push(line);
    }
    return wrapTable(out.join('\n').trim());
  };

  const syncPromptMacros = async () => {
    const macros = window.ST_API?.macros;
    if (!macros?.register) return;
    const payload = {
      instruction: instructionEl?.value || '',
      template: buildTemplatePrompt(getTemplateState()) || schemaEl?.value || '',
      table: getTablePreviewForSend(getTableMarkdown())
    };
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
      const nextTemplateState = parseSchemaToTemplate(fallback.schema);
      setTemplateState(nextTemplateState);
      setTemplateActiveSectionId(nextTemplateState.sections[0]?.id || '');
      if (syncSchema && schemaModeEl) saveSchemaForMode(schemaModeEl.value, fallback.schema);
      updateSchemaPreview();
      changed = true;
    }

    return changed;
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
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前填表指令。',
      ensureMacroHelpBlock
    });

    setModeConfigVisibility({
      mode: schemaModeSendEl?.value || defaults.schemaSendMode || 'inject',
      fieldIds: ['wtl-schema-inject-toggle', 'wtl-schema-pos', 'wtl-schema-role', 'wtl-schema-depth', 'wtl-schema-order'],
      helpHost: schemaBlockEl,
      helpId: 'wtl-schema-macro-help',
      macroName: '{{WTL_TableTemplate}}',
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前表格模板。',
      ensureMacroHelpBlock
    });

    setModeConfigVisibility({
      mode: tableModeEl?.value || defaults.tableMode || 'inject',
      fieldIds: ['wtl-table-inject-toggle', 'wtl-table-pos', 'wtl-table-role', 'wtl-table-depth', 'wtl-table-order'],
      helpHost: tableModeEl?.parentElement,
      helpId: 'wtl-table-macro-help',
      macroName: '{{WTL_TableLatest}}',
      usageText: '将该宏填写到预设或系统提示词的目标位置，发送时会自动替换为当前表格内容。',
      ensureMacroHelpBlock
    });
  };

  const getStoredOrDefault = (key, fallback = '') => {
    const raw = localStorageRef.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const text = String(raw);
    if (!text.trim() || text === 'undefined' || text === 'null') return fallback;
    return text;
  };

  const setStoredIfEmpty = (key, fallback = '') => {
    const raw = localStorageRef.getItem(key);
    const text = raw === null || raw === undefined ? '' : String(raw);
    const empty = !text.trim() || text === 'undefined' || text === 'null';
    if (empty && fallback !== undefined && fallback !== null && String(fallback).trim()) {
      localStorageRef.setItem(key, String(fallback));
      return String(fallback);
    }
    return empty ? '' : text;
  };

  return {
    getStoredOrDefault,
    setStoredIfEmpty,
    getTablePreviewForSend,
    syncPromptMacros,
    applyAllPromptMacros,
    ensurePromptFieldDefaults,
    refreshModeUi
  };
}

export function getDefaultSendModeFlags({ sendModeEl, defaults }) {
  const rawMode = sendModeEl?.value || defaults.sendMode || 'st';
  const mode = rawMode === 'stMacro' ? 'st' : rawMode;
  return {
    mode,
    isExternal: mode === 'external',
    isStLike: mode === 'st'
  };
}

export function bindPromptInputControls({
  prePromptEl,
  instructionEl,
  schemaEl,
  schemaModeEl,
  parseSchemaToTemplate,
  saveSchemaForMode,
  ensurePromptFieldDefaults,
  updateSchemaPreview,
  refreshPromptPreview,
  saveState,
  getSchemaSource,
  setSchemaSource,
  getTemplateState,
  setTemplateState,
  setTemplateActiveSectionId
}) {
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
    setSchemaSource(schemaEl.value);
    if (schemaModeEl) saveSchemaForMode(schemaModeEl.value, getSchemaSource());
    const nextTemplateState = parseSchemaToTemplate(getSchemaSource());
    setTemplateState(nextTemplateState);
    setTemplateActiveSectionId(nextTemplateState.sections[0]?.id || '');
    updateSchemaPreview();
    refreshPromptPreview(true);
  });

  schemaEl?.addEventListener('blur', async () => {
    if (!ensurePromptFieldDefaults({ syncSchema: true })) return;
    await saveState();
    refreshPromptPreview(true);
  });
}

export function bindPromptEditorControls({
  editPrepromptBtn,
  resetPrepromptBtn,
  editInstructionBtn,
  resetInstructionBtn,
  prePromptEl,
  instructionEl,
  prepromptPresetEl,
  prepromptPresetNameEl,
  instructionPresetEl,
  instructionPresetNameEl,
  PREPROMPT_PRESET_KEY,
  PREPROMPT_PRESET_ACTIVE_KEY,
  INSTRUCTION_PRESET_KEY,
  INSTRUCTION_PRESET_ACTIVE_KEY,
  getPresetTextByName,
  makeModalSaveButton,
  openConfirmModal,
  saveState,
  refreshPromptPreview,
  setStatus,
  localStorageRef
}) {
  const resolvePresetDefaultText = (presetKey, groupKey) => {
    let nextValue = getPresetTextByName(presetKey, '默认', '');
    if (!nextValue && window.__WTL_PRESETS__?.[groupKey]?.['默认']) {
      const fallback = window.__WTL_PRESETS__[groupKey]['默认'];
      nextValue = Array.isArray(fallback) ? fallback.join('\n') : String(fallback || '');
    }
    return nextValue || '';
  };

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
      prePromptEl.value = resolvePresetDefaultText(PREPROMPT_PRESET_KEY, 'preprompt');
      prePromptEl.readOnly = true;
      if (editPrepromptBtn) editPrepromptBtn.textContent = '编辑';
      localStorageRef.setItem(PREPROMPT_PRESET_ACTIVE_KEY, '默认');
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
      instructionEl.value = resolvePresetDefaultText(INSTRUCTION_PRESET_KEY, 'instruction');
      instructionEl.readOnly = true;
      if (editInstructionBtn) editInstructionBtn.textContent = '编辑';
      localStorageRef.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, '默认');
      if (instructionPresetEl) instructionPresetEl.value = '默认';
      if (instructionPresetNameEl) instructionPresetNameEl.value = '默认';
      await saveState();
      refreshPromptPreview(true);
      setStatus('填表指令已恢复默认');
    });
    openConfirmModal('恢复默认填表指令', '该操作将覆盖当前填表指令内容，是否继续？', [confirmBtn]);
  });
}

export function setModeConfigVisibility({ mode, fieldIds = [], helpHost = null, helpId = '', macroName = '', usageText = '', ensureMacroHelpBlock }) {
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

  if (!helpHost || !helpId || !macroName || typeof ensureMacroHelpBlock !== 'function') return;
  const help = ensureMacroHelpBlock(helpId, macroName, usageText);
  if (!help.parentElement) helpHost.appendChild(help);
  help.style.display = isMacro ? 'block' : 'none';
}
