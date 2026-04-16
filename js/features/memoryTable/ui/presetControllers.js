import { getPromptPresets, getSchemaPresets } from '../../../core/storage.js';

function populatePresetSelect(selectEl, presets) {
  if (!selectEl) return;
  const presetsObj = presets || {};
  const names = Object.keys(presetsObj).sort();
  selectEl.innerHTML = names.map((name) => `<option value="${name}">${name}</option>`).join('') || '<option value="">(无预设)</option>';
}

export function refreshTextPresetSelect(selectEl, presets) {
  if (!selectEl) return;
  if (typeof presets === 'string') {
    presets = getPromptPresets(presets);
  }
  populatePresetSelect(selectEl, presets);
}

export function refreshSchemaPresetSelect(selectEl, presets) {
  if (!selectEl) return;
  if (!presets) {
    presets = getSchemaPresets();
  }
  populatePresetSelect(selectEl, presets);
}

export function bindSchemaPresetGroup({
  schema,
  common,
  helpers
}) {
  return bindSchemaPresetControls({
    ...schema,
    ...common,
    ...helpers
  });
}

export function bindPromptPresetGroups({
  preprompt,
  instruction,
  common
}) {
  bindTextPresetControls({
    ...preprompt,
    ...common,
    labels: {
      subject: '破限提示',
      filename: 'wtl-preprompt-presets.json'
    }
  });

  bindTextPresetControls({
    ...instruction,
    ...common,
    labels: {
      subject: '填表指令',
      filename: 'wtl-instruction-presets.json'
    }
  });
}

export function bindTextPresetControls({
  selectEl,
  nameEl,
  textareaEl,
  loadBtn,
  saveBtn,
  renameBtn,
  deleteBtn,
  importBtn,
  fileEl,
  exportBtn,
  storageKey,
  activeStorageKey,
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
  labels
}) {
  selectEl?.addEventListener('change', () => {
    if (!selectEl || !nameEl) return;
    nameEl.value = selectEl.value || '';
  });

  loadBtn?.addEventListener('click', () => {
    if (!textareaEl || !selectEl) return;
    const value = loadTextPresetValue({
      storageKey,
      name: selectEl.value,
      getPromptPresets,
      setStatus
    });
    if (value === null) return;
    const name = selectEl.value || '';
    textareaEl.value = value;
    localStorage.setItem(activeStorageKey, name);
    if (nameEl) nameEl.value = name;
    refreshPromptPreview(true);
    setStatus(`${labels.subject}预设已载入`);
  });

  saveBtn?.addEventListener('click', () => {
    if (!textareaEl || !nameEl) return;
    const result = saveTextPresetValue({
      storageKey,
      name: nameEl.value,
      value: textareaEl.value || '',
      getPromptPresets,
      setPromptPresets,
      setStatus
    });
    if (!result) return;
    refreshTextPresetSelect(selectEl, result.presets);
    if (selectEl) selectEl.value = result.name;
    localStorage.setItem(activeStorageKey, result.name);
    setStatus(`${labels.subject}预设已保存`);
  });

  renameBtn?.addEventListener('click', () => {
    if (!selectEl || !nameEl) return;
    const result = renameTextPresetValue({
      storageKey,
      oldName: selectEl.value,
      newName: nameEl.value,
      getPromptPresets,
      setPromptPresets,
      setStatus
    });
    if (!result) return;
    refreshTextPresetSelect(selectEl, result.presets);
    selectEl.value = result.name;
    localStorage.setItem(activeStorageKey, result.name);
    setStatus(`${labels.subject}预设已重命名`);
  });

  deleteBtn?.addEventListener('click', () => {
    if (!selectEl) return;
    const result = deleteTextPresetValue({
      storageKey,
      name: selectEl.value,
      getPromptPresets,
      setPromptPresets,
      setStatus
    });
    if (!result) return;
    refreshTextPresetSelect(selectEl, result.presets);
    localStorage.removeItem(activeStorageKey);
    if (nameEl) nameEl.value = '';
    setStatus(`${labels.subject}预设已删除`);
  });

  importBtn?.addEventListener('click', () => {
    fileEl?.click();
  });

  fileEl?.addEventListener('change', async (e) => {
    await importPresetFile({
      file: e?.target?.files?.[0],
      currentPresets: getPromptPresets(storageKey),
      applyPresets: (presets) => {
        setPromptPresets(storageKey, presets);
        refreshTextPresetSelect(selectEl, presets);
      },
      onSuccess: () => setStatus(`${labels.subject}预设已导入`),
      onError: () => setStatus('导入失败'),
      resetInput: () => {
        if (fileEl) fileEl.value = '';
      }
    });
  });

  exportBtn?.addEventListener('click', () => {
    exportPresetFile({
      filename: labels.filename,
      presets: getPromptPresets(storageKey),
      downloadJson: downloadJsonFile
    });
  });
}

export function createSchemaPresetHelpers({
  schemaBindGlobalEl,
  schemaBindCharacterEl,
  schemaBindChatEl,
  getSchemaScopedPresets,
  getSchemaPresets,
  getDefaultSchemaText,
  getCurrentChatId,
  getCurrentCharacterId,
  localStorageRef
}) {
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
    const globalName = map?.global || localStorageRef.getItem('wtl.schema.presetActive') || '默认';
    const globalText = presets[globalName] || presets['默认'] || getDefaultSchemaText();
    return { scope: 'global', name: globalName || '默认', text: globalText || '' };
  };

  return {
    getSchemaScopeLabel,
    getSchemaScope,
    updateSchemaBindRadios,
    resolveSchemaByScope
  };
}

export function createOpenAiPresetHelpers({
  openaiPresetEl,
  openaiPresetNameEl,
  openaiUrlEl,
  openaiKeyEl,
  openaiTempEl,
  openaiMaxEl,
  openaiStreamEl,
  openaiModelEl,
  getOpenAIPresets
}) {
  const refreshOpenAIPresetSelect = () => {
    if (!openaiPresetEl) return;
    const presets = getOpenAIPresets();
    const names = Object.keys(presets).sort();
    openaiPresetEl.innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('') || `<option value="">(无预设)</option>`;
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

  return {
    refreshOpenAIPresetSelect,
    loadOpenAIPresetByName
  };
}

export function bindSchemaPresetControls({
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
  onSchemaLoaded,
  setStatus
}) {
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
    const schemaSource = presets[name];
    schemaEl.value = schemaSource;
    localStorage.setItem('wtl.schema.presetActive', name);
    const templateState = parseSchemaToTemplate(schemaSource);
    onSchemaLoaded({ schemaSource, templateState });
    updateSchemaPreview();
    refreshPromptPreview(true);
    setStatus('模板预设已载入');
  });

  schemaPresetSaveEl?.addEventListener('click', () => {
    if (!schemaEl || !schemaPresetNameEl) return;
    const result = saveSchemaPresetValue({
      name: schemaPresetNameEl.value,
      value: schemaEl.value || '',
      getSchemaPresets,
      setSchemaPresets,
      getSchemaScope,
      getSchemaScopedPresets,
      setSchemaScopedPresets,
      getCurrentChatId,
      getCurrentCharacterId,
      setStatus
    });
    if (!result) return;
    refreshSchemaPresetSelect(schemaPresetEl, result.presets);
    if (schemaPresetEl) schemaPresetEl.value = result.name;
    localStorage.setItem('wtl.schema.presetActive', result.name);
    updateSchemaEffectiveUi();
    setStatus('模板预设已保存');
  });

  schemaPresetRenameEl?.addEventListener('click', () => {
    if (!schemaPresetEl || !schemaPresetNameEl) return;
    const result = renameSchemaPresetValue({
      oldName: schemaPresetEl.value,
      newName: schemaPresetNameEl.value,
      getSchemaPresets,
      setSchemaPresets,
      getSchemaScopedPresets,
      setSchemaScopedPresets,
      setStatus
    });
    if (!result) return;
    refreshSchemaPresetSelect(schemaPresetEl, result.presets);
    schemaPresetEl.value = result.name;
    localStorage.setItem('wtl.schema.presetActive', result.name);
    updateSchemaEffectiveUi();
    setStatus('模板预设已重命名');
  });

  schemaPresetDelEl?.addEventListener('click', () => {
    if (!schemaPresetEl) return;
    const result = deleteSchemaPresetValue({
      name: schemaPresetEl.value,
      getSchemaPresets,
      setSchemaPresets,
      getSchemaScopedPresets,
      setSchemaScopedPresets,
      setStatus
    });
    if (!result) return;
    refreshSchemaPresetSelect(schemaPresetEl, result.presets);
    const active = localStorage.getItem('wtl.schema.presetActive') || '';
    if (active === result.name) localStorage.removeItem('wtl.schema.presetActive');
    if (schemaPresetNameEl) schemaPresetNameEl.value = '';
    updateSchemaEffectiveUi();
    setStatus('模板预设已删除');
  });

  schemaPresetImportEl?.addEventListener('click', () => {
    schemaPresetFileEl?.click();
  });

  schemaPresetFileEl?.addEventListener('change', async (e) => {
    await importPresetFile({
      file: e?.target?.files?.[0],
      currentPresets: getSchemaPresets(),
      applyPresets: (presets) => {
        setSchemaPresets(presets);
        refreshSchemaPresetSelect(schemaPresetEl, presets);
      },
      onSuccess: () => setStatus('模板预设已导入'),
      onError: () => setStatus('导入失败'),
      resetInput: () => {
        if (schemaPresetFileEl) schemaPresetFileEl.value = '';
      }
    });
  });

  schemaPresetExportEl?.addEventListener('click', () => {
    exportPresetFile({
      filename: 'wtl-schema-presets.json',
      presets: getSchemaPresets(),
      downloadJson: downloadJsonFile
    });
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

  return {
    updateSchemaEffectiveUi
  };
}
