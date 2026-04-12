export function createStateController({
  defaults,
  localStorageRef,
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
  refreshTextPresetSelect,
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
  state,
  setStatus,
  appendHistory,
  reloadChatState
}) {
  const storage = localStorageRef || window.localStorage;

  const {
    tableMdEl,
    schemaModeEl,
    schemaEl,
    schemaPresetEl,
    schemaPresetNameEl,
    schemaBindCharacterNameEl,
    schemaBindChatNameEl,
    schemaEffectiveEl,
    wbModeEl,
    wbManualEl,
    wbManualWrapEl,
    entryEl,
    prePromptEl,
    instructionEl,
    sendModeEl,
    instModeEl,
    schemaModeSendEl,
    tableModeEl,
    prepromptPresetEl,
    prepromptPresetNameEl,
    instructionPresetEl,
    instructionPresetNameEl,
    openaiUrlEl,
    openaiKeyEl,
    openaiModelEl,
    openaiTempEl,
    openaiMaxEl,
    openaiStreamEl,
    autoFloorsEl,
    autoEveryEl,
    tablePreviewEl,
    tablePosEl,
    tableRoleEl,
    tableDepthEl,
    tableOrderEl,
    tableInjectToggleBtn,
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
    blockListEl,
    refBlockListEl,
    templateEditorEl,
    editPrepromptBtn,
    editInstructionBtn,
    openaiPresetEl,
    openaiPresetNameEl,
    logPromptBtn,
    logAiBtn,
    logContentEl,
    autoToggleBtn
  } = ui;

  const loadState = async () => {
    state.currentChatStateKey = getChatKey();
    const table = await loadTableForChat();
    const schemaMode = getStoredOrDefault('wtl.schemaMode', defaults.schemaMode);
    const presetSchemaActive = storage.getItem('wtl.schema.presetActive') || '默认';
    const presetOrderActive = storage.getItem('wtl.order.presetActive') || '默认';
    const presetRefOrderActive = storage.getItem('wtl.refOrder.presetActive') || '默认';
    const presetBlocksActive = storage.getItem('wtl.blocks.presetActive') || '默认';
    const presetRefBlocksActive = storage.getItem('wtl.refBlocks.presetActive') || '默认';

    const schemaPreset = getDefaultSchemaText() || '';
    const orderPreset = (safeParseJson(storage.getItem('wtl.order.presets')) || {})[presetOrderActive];
    const refOrderPreset = (safeParseJson(storage.getItem('wtl.refOrder.presets')) || {})[presetRefOrderActive];
    const blocksPreset = (safeParseJson(storage.getItem('wtl.blocks.presets')) || {})[presetBlocksActive];
    const refBlocksPreset = (safeParseJson(storage.getItem('wtl.refBlocks.presets')) || {})[presetRefBlocksActive];

    const resolvedSchema = resolveSchemaByScope();
    let schema = resolvedSchema?.text || loadSchemaForMode(schemaMode) || schemaPreset;
    if (!schema || !String(schema).trim()) {
      schema = schemaPreset || '';
      saveSchemaForMode(schemaMode, schema);
    }
    state.schemaSource = schema;
    state.templateState = parseSchemaToTemplate(state.schemaSource);
    state.templateActiveSectionId = state.templateState.sections[0]?.id || '';

    const blockOrder = JSON.parse(storage.getItem('wtl.blockOrder') || 'null') || blocksPreset || getBlocksPreset() || [];
    const refBlockOrder = JSON.parse(storage.getItem('wtl.refBlockOrder') || 'null') || refBlocksPreset || getRefBlocksPreset() || [];
    if (!blockOrder?.length && (blocksPreset || getBlocksPreset())?.length) {
      storage.setItem('wtl.blockOrder', JSON.stringify(blocksPreset || getBlocksPreset() || []));
    }
    if (!refBlockOrder?.length && (refBlocksPreset || getRefBlocksPreset())?.length) {
      storage.setItem('wtl.refBlockOrder', JSON.stringify(refBlocksPreset || getRefBlocksPreset() || []));
    }

    const loadSnapshot = collectLoadStateSnapshot({
      defaults,
      getStoredOrDefault,
      setStoredIfEmpty,
      getDefaultPromptText,
      getOpenAIPresets,
      prepromptPresetKey: PREPROMPT_PRESET_KEY,
      prepromptPresetActiveKey: PREPROMPT_PRESET_ACTIVE_KEY,
      instructionPresetKey: INSTRUCTION_PRESET_KEY,
      instructionPresetActiveKey: INSTRUCTION_PRESET_ACTIVE_KEY
    });

    const {
      wbReadMode,
      wbManual,
      entry,
      preprompt,
      instruction,
      sendMode,
      instMode,
      schemaSendMode,
      tableMode,
      openaiUrl,
      openaiKey,
      openaiModel,
      openaiTemp,
      openaiMax,
      openaiStream,
      autoFillEnabledStored,
      autoFillEnabled,
      autoFillFloors,
      autoFillEvery,
      tablePos,
      tableRole,
      tableDepth,
      tableOrder,
      tableInjectEnabled,
      instInjectEnabled,
      instPos,
      instRole,
      instDepth,
      instOrder,
      schemaInjectEnabled,
      schemaPos,
      schemaRole,
      schemaDepth,
      schemaOrder
    } = loadSnapshot;

    seedStoredLoadStateSnapshot({
      snapshot: loadSnapshot,
      defaults,
      setStoredIfEmpty
    });

    if (tableMdEl) tableMdEl.value = table;
    if (schemaEl) schemaEl.value = buildTemplatePrompt(state.templateState) || schema;
    if (schemaModeEl) schemaModeEl.value = schemaMode;
    if (wbModeEl) wbModeEl.value = wbReadMode;
    if (wbManualEl) wbManualEl.value = wbManual;
    if (wbManualWrapEl) wbManualWrapEl.style.display = wbReadMode === 'manual' ? 'block' : 'none';
    if (wbReadMode === 'manual') {
      renderManualWorldBookUI(state.manualState);
    }
    if (entryEl) entryEl.value = entry;
    if (prePromptEl) prePromptEl.value = preprompt;
    if (instructionEl) instructionEl.value = instruction;
    if (sendModeEl) sendModeEl.value = sendMode;
    if (instModeEl) instModeEl.value = instMode;
    if (schemaModeSendEl) schemaModeSendEl.value = schemaSendMode;
    if (tableModeEl) tableModeEl.value = tableMode;

    const prepromptPresets = getPromptPresets(PREPROMPT_PRESET_KEY);
    const instructionPresets = getPromptPresets(INSTRUCTION_PRESET_KEY);
    refreshTextPresetSelect(prepromptPresetEl, prepromptPresets);
    refreshTextPresetSelect(instructionPresetEl, instructionPresets);
    const prepromptActive = storage.getItem(PREPROMPT_PRESET_ACTIVE_KEY) || '';
    const instructionActive = storage.getItem(INSTRUCTION_PRESET_ACTIVE_KEY) || '';
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
    if (openaiStreamEl) openaiStreamEl.checked = openaiStream;

    setAutoUi(autoFillEnabled);
    if (autoFloorsEl) autoFloorsEl.value = autoFillFloors;
    if (autoEveryEl) autoEveryEl.value = autoFillEvery;

    if (tablePreviewEl) tablePreviewEl.value = table;

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

    if (blockListEl) renderBlockList(blockOrder);
    if (refBlockListEl) renderRefBlockList(refBlockOrder);

    const restoredDefaultsOnLoad = ensurePromptFieldDefaults({ syncSchema: true });

    refreshModeUi();

    if (templateEditorEl) templateEditorEl.style.display = 'none';
    state.templateState = parseSchemaToTemplate(schema);
    state.templateActiveSectionId = state.templateState.sections[0]?.id || '';

    renderPreview(table);
    if (restoredDefaultsOnLoad) {
      await saveState();
    }
    if (autoFillEnabledStored === null) {
      await saveState();
    }
    await syncPromptMacros();
  };

  const saveState = async () => {
    const blockOrder = serializeBlockOrder(blockListEl);
    const refBlockOrder = serializeBlockOrder(refBlockListEl);

    await persistCoreUiState({
      ensurePromptFieldDefaults,
      saveTable: async (meta) => {
        if (tableMdEl) await saveTableForChat(ensureTableWrapper(tableMdEl.value), meta);
      },
      pendingAiHistory: state.pendingAiHistory,
      schemaMode: schemaModeEl?.value,
      saveSchemaForMode,
      schemaSource: state.schemaSource,
      schemaValue: schemaEl?.value || '',
      values: {
        'wtl.schemaMode': schemaModeEl?.value,
        'wtl.wbReadMode': wbModeEl?.value,
        'wtl.wbManual': wbManualEl?.value,
        'wtl.entry': entryEl?.value,
        'wtl.preprompt': prePromptEl?.value,
        'wtl.instruction': instructionEl?.value,
        'wtl.sendMode': sendModeEl?.value,
        'wtl.instMode': instModeEl?.value || 'inject',
        'wtl.schemaSendMode': schemaModeSendEl?.value || 'inject',
        'wtl.tableMode': tableModeEl?.value || 'inject',
        'wtl.autoFillEnabled': autoToggleBtn ? (autoToggleBtn.dataset.active === 'true' ? 'true' : 'false') : undefined,
        'wtl.tableInjectEnabled': tableInjectToggleBtn ? (tableInjectToggleBtn.checked ? 'true' : 'false') : undefined,
        'wtl.instInjectEnabled': instInjectToggleEl ? (instInjectToggleEl.checked ? 'true' : 'false') : undefined,
        'wtl.schemaInjectEnabled': schemaInjectToggleEl ? (schemaInjectToggleEl.checked ? 'true' : 'false') : undefined,
        'wtl.autoFillFloors': autoFloorsEl?.value || '',
        'wtl.autoFillEvery': autoEveryEl?.value || '',
        'wtl.openaiUrl': openaiUrlEl?.value,
        'wtl.openaiKey': openaiKeyEl?.value,
        'wtl.openaiModel': openaiModelEl?.value,
        'wtl.openaiTemp': openaiTempEl?.value,
        'wtl.openaiMax': openaiMaxEl?.value,
        'wtl.openaiStream': openaiStreamEl ? (openaiStreamEl.checked ? 'true' : 'false') : undefined,
        'wtl.tablePos': tablePosEl?.value,
        'wtl.tableRole': tableRoleEl?.value,
        'wtl.tableDepth': tableDepthEl?.value,
        'wtl.tableOrder': tableOrderEl?.value,
        'wtl.instPos': instPosEl?.value,
        'wtl.instRole': instRoleEl?.value,
        'wtl.instDepth': instDepthEl?.value,
        'wtl.instOrder': instOrderEl?.value,
        'wtl.schemaPos': schemaPosEl?.value,
        'wtl.schemaRole': schemaRoleEl?.value,
        'wtl.schemaDepth': schemaDepthEl?.value,
        'wtl.schemaOrder': schemaOrderEl?.value
      },
      blockOrder,
      refBlockOrder,
      syncPromptMacros
    });
    state.pendingAiHistory = null;
  };

  const resetAllDefaults = async () => {
    const presetData = window.__WTL_PRESETS__ || {};
    const readPresetText = (group, name = '默认') => {
      const raw = presetData?.[group]?.[name];
      if (Array.isArray(raw)) return raw.join('\n');
      if (typeof raw === 'string') return raw;
      return '';
    };

    const defaultSchema = readPresetText('schema') || getDefaultSchemaText() || '';
    const defaultPreprompt = readPresetText('preprompt')
      || getPresetTextByName(PREPROMPT_PRESET_KEY, '默认', '')
      || '';
    const defaultInstruction = readPresetText('instruction')
      || getPresetTextByName(INSTRUCTION_PRESET_KEY, '默认', '')
      || '';

    const resetKeys = [
      'wtl.preprompt',
      'wtl.instruction',
      'wtl.schema',
      'wtl.schemaMode',
      'wtl.wbReadMode',
      'wtl.wbManual',
      'wtl.entry',
      'wtl.sendMode',
      'wtl.instMode',
      'wtl.schemaSendMode',
      'wtl.tableMode',
      'wtl.openaiUrl',
      'wtl.openaiKey',
      'wtl.openaiModel',
      'wtl.openaiTemp',
      'wtl.openaiMax',
      'wtl.openaiStream',
      'wtl.autoFillEnabled',
      'wtl.autoFillFloors',
      'wtl.autoFillEvery',
      'wtl.autoFillInitialized',
      'wtl.autoFillDefaultsVersion',
      'wtl.tablePos',
      'wtl.tableRole',
      'wtl.tableDepth',
      'wtl.tableOrder',
      'wtl.tableInjectEnabled',
      'wtl.instPos',
      'wtl.instRole',
      'wtl.instDepth',
      'wtl.instOrder',
      'wtl.instInjectEnabled',
      'wtl.schemaPos',
      'wtl.schemaRole',
      'wtl.schemaDepth',
      'wtl.schemaOrder',
      'wtl.schemaInjectEnabled',
      'wtl.blockOrder',
      'wtl.refBlockOrder'
    ];
    resetKeys.forEach((key) => storage.removeItem(key));

    setPresetStore('wtl.openai.presets', presetData.openai);
    setPresetStore(PREPROMPT_PRESET_KEY, presetData.preprompt);
    setPresetStore(INSTRUCTION_PRESET_KEY, presetData.instruction);
    setPresetStore(SCHEMA_PRESET_KEY, presetData.schema);
    setPresetStore('wtl.order.presets', presetData.order);
    setPresetStore('wtl.refOrder.presets', presetData.refOrder);
    setPresetStore('wtl.blocks.presets', presetData.blocks);
    setPresetStore('wtl.refBlocks.presets', presetData.refBlocks);

    storage.setItem(PREPROMPT_PRESET_ACTIVE_KEY, '默认');
    storage.setItem(INSTRUCTION_PRESET_ACTIVE_KEY, '默认');
    storage.setItem(SCHEMA_PRESET_ACTIVE_KEY, '默认');
    storage.setItem('wtl.order.presetActive', '默认');
    storage.setItem('wtl.refOrder.presetActive', '默认');
    storage.setItem('wtl.blocks.presetActive', '默认');
    storage.setItem('wtl.refBlocks.presetActive', '默认');

    setSchemaScopedPresets({});
    storage.removeItem('wtl.schema.presetsByScope');
    removeStorageByPrefix('wtl.schema.character.');

    if (schemaModeEl) schemaModeEl.value = defaults.schemaMode;
    if (sendModeEl) sendModeEl.value = defaults.sendMode;
    if (instModeEl) instModeEl.value = defaults.instMode || 'inject';
    if (schemaModeSendEl) schemaModeSendEl.value = defaults.schemaSendMode || 'inject';
    if (tableModeEl) tableModeEl.value = defaults.tableMode || 'inject';
    if (wbModeEl) wbModeEl.value = defaults.wbReadMode;
    if (wbManualEl) wbManualEl.value = defaults.wbManual;
    if (entryEl) entryEl.value = defaults.entry;

    setAutoUi(defaults.autoFillEnabled === true || defaults.autoFillEnabled === 'true');
    if (autoFloorsEl) autoFloorsEl.value = defaults.autoFillFloors || '12';
    if (autoEveryEl) autoEveryEl.value = defaults.autoFillEvery || '1';

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

    const defaultOpenAIPreset = getOpenAIPresets()?.['默认'] || {};
    if (openaiUrlEl) openaiUrlEl.value = defaultOpenAIPreset.url || '';
    if (openaiKeyEl) openaiKeyEl.value = defaultOpenAIPreset.key || '';
    if (openaiModelEl) openaiModelEl.value = defaultOpenAIPreset.model || '';
    if (openaiTempEl) openaiTempEl.value = String(defaultOpenAIPreset.temp ?? '0.7');
    if (openaiMaxEl) openaiMaxEl.value = String(defaultOpenAIPreset.max ?? '1024');
    if (openaiStreamEl) openaiStreamEl.checked = defaultOpenAIPreset.stream !== false;

    if (prePromptEl) prePromptEl.value = defaultPreprompt || '';
    if (instructionEl) instructionEl.value = defaultInstruction || '';
    if (editPrepromptBtn) editPrepromptBtn.textContent = '编辑';
    if (editInstructionBtn) editInstructionBtn.textContent = '编辑';

    refreshTextPresetSelect(prepromptPresetEl, getPromptPresets(PREPROMPT_PRESET_KEY));
    refreshTextPresetSelect(instructionPresetEl, getPromptPresets(INSTRUCTION_PRESET_KEY));
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

    state.schemaSource = defaultSchema || '';
    state.templateState = parseSchemaToTemplate(state.schemaSource);
    state.templateActiveSectionId = state.templateState.sections[0]?.id || '';
    if (schemaEl) schemaEl.value = buildTemplatePrompt(state.templateState) || state.schemaSource;
    updateSchemaPreview();

    state.hiddenRows = {};
    state.tableSectionOrder = [];
    state.activeSection = state.templateState.sections[0]?.name || '';
    const resetTable = ensureTableWrapper(renderJsonToMarkdown(buildEmptyTableFromTemplate(state.templateState)));
    if (tableMdEl) tableMdEl.value = resetTable;
    renderPreview(resetTable);

    refreshOpenAIPresetSelect();
    refreshModeUi();
    await saveState();
    await syncPromptMacros();
    await syncTableInjection();
    await syncInstructionInjection();
    await syncSchemaInjection();
    refreshPromptPreview(true);
    setStatus('已恢复默认');
  };

  const reloadStateForCurrentChat = async () => {
    state.currentChatStateKey = await reloadChatState({
      getCtx: () => window.SillyTavern?.getContext?.(),
      currentChatStateKey: state.currentChatStateKey,
      loadState,
      onChatChanged: () => {
        state.lastRef = null;
        state.pendingAiHistory = null;
      },
      getPromptCache: () => storage.getItem('wtl.lastPrompt') || '',
      getAiCache: () => storage.getItem('wtl.lastAi') || '',
      isPromptLogActive: () => logPromptBtn?.dataset.active === 'true',
      isAiLogActive: () => logAiBtn?.dataset.active === 'true',
      setLogContent: (value) => {
        if (logContentEl) logContentEl.value = value || '';
      },
      refreshPromptPreview
    });
  };

  return {
    loadState,
    saveState,
    resetAllDefaults,
    reloadStateForCurrentChat
  };
}
