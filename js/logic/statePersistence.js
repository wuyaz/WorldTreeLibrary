export function ensureAutoFillDefaults({ defaults = {} } = {}) {
  const autoFillInitKey = 'wtl.autoFillInitialized';
  const autoFillDefaultsVersionKey = 'wtl.autoFillDefaultsVersion';
  const autoFillDefaultsVersion = '2026-04-03-auto-on';
  if (!localStorage.getItem(autoFillInitKey) || localStorage.getItem(autoFillDefaultsVersionKey) !== autoFillDefaultsVersion) {
    localStorage.setItem('wtl.autoFillEnabled', String(defaults.autoFillEnabled ?? false));
    localStorage.setItem('wtl.autoFillFloors', String(defaults.autoFillFloors || '12'));
    localStorage.setItem('wtl.autoFillEvery', String(defaults.autoFillEvery || '1'));
    localStorage.setItem(autoFillInitKey, 'true');
    localStorage.setItem(autoFillDefaultsVersionKey, autoFillDefaultsVersion);
  }
  const autoFillEnabledStored = localStorage.getItem('wtl.autoFillEnabled');
  return {
    autoFillEnabledStored,
    autoFillEnabled: (autoFillEnabledStored ?? String(defaults.autoFillEnabled ?? false)) === 'true',
    autoFillFloors: localStorage.getItem('wtl.autoFillFloors') ?? String(defaults.autoFillFloors || '12'),
    autoFillEvery: localStorage.getItem('wtl.autoFillEvery') ?? String(defaults.autoFillEvery || '1')
  };
}

export function collectLoadStateSnapshot({
  defaults = {},
  getStoredOrDefault,
  setStoredIfEmpty,
  getDefaultPromptText,
  getOpenAIPresets,
  prepromptPresetKey,
  prepromptPresetActiveKey,
  instructionPresetKey,
  instructionPresetActiveKey
}) {
  let sendMode = getStoredOrDefault('wtl.sendMode', defaults.sendMode);
  if (sendMode === 'stMacro') {
    sendMode = 'st';
    localStorage.setItem('wtl.sendMode', sendMode);
  }

  const defaultOpenAIPreset = getOpenAIPresets()?.['默认'] || {};
  const autoFill = ensureAutoFillDefaults({ defaults });

  const snapshot = {
    wbReadMode: getStoredOrDefault('wtl.wbReadMode', defaults.wbReadMode),
    wbManual: getStoredOrDefault('wtl.wbManual', defaults.wbManual),
    entry: getStoredOrDefault('wtl.entry', defaults.entry),
    preprompt: setStoredIfEmpty('wtl.preprompt', getDefaultPromptText('preprompt', prepromptPresetKey, prepromptPresetActiveKey)),
    instruction: setStoredIfEmpty('wtl.instruction', getDefaultPromptText('instruction', instructionPresetKey, instructionPresetActiveKey)),
    sendMode,
    instMode: getStoredOrDefault('wtl.instMode', defaults.instMode || 'inject'),
    schemaSendMode: getStoredOrDefault('wtl.schemaSendMode', defaults.schemaSendMode || 'inject'),
    tableMode: getStoredOrDefault('wtl.tableMode', defaults.tableMode || 'inject'),
    openaiUrl: getStoredOrDefault('wtl.openaiUrl', defaultOpenAIPreset.url || ''),
    openaiKey: getStoredOrDefault('wtl.openaiKey', defaultOpenAIPreset.key || ''),
    openaiModel: getStoredOrDefault('wtl.openaiModel', defaultOpenAIPreset.model || ''),
    openaiTemp: getStoredOrDefault('wtl.openaiTemp', String(defaultOpenAIPreset.temp ?? '0.7')),
    openaiMax: getStoredOrDefault('wtl.openaiMax', String(defaultOpenAIPreset.max ?? '1024')),
    openaiStream: (localStorage.getItem('wtl.openaiStream') ?? String(defaultOpenAIPreset.stream ?? true)) === 'true',
    autoFillEnabledStored: autoFill.autoFillEnabledStored,
    autoFillEnabled: autoFill.autoFillEnabled,
    autoFillFloors: autoFill.autoFillFloors,
    autoFillEvery: autoFill.autoFillEvery,
    tablePos: getStoredOrDefault('wtl.tablePos', defaults.tablePos),
    tableRole: getStoredOrDefault('wtl.tableRole', defaults.tableRole),
    tableDepth: getStoredOrDefault('wtl.tableDepth', defaults.tableDepth),
    tableOrder: getStoredOrDefault('wtl.tableOrder', defaults.tableOrder),
    tableInjectEnabled: getStoredOrDefault('wtl.tableInjectEnabled', defaults.tableInjectEnabled),
    instInjectEnabled: getStoredOrDefault('wtl.instInjectEnabled', defaults.instInjectEnabled),
    instPos: getStoredOrDefault('wtl.instPos', defaults.instPos),
    instRole: getStoredOrDefault('wtl.instRole', defaults.instRole),
    instDepth: getStoredOrDefault('wtl.instDepth', defaults.instDepth),
    instOrder: getStoredOrDefault('wtl.instOrder', defaults.instOrder),
    schemaInjectEnabled: getStoredOrDefault('wtl.schemaInjectEnabled', defaults.schemaInjectEnabled),
    schemaPos: getStoredOrDefault('wtl.schemaPos', defaults.schemaPos),
    schemaRole: getStoredOrDefault('wtl.schemaRole', defaults.schemaRole),
    schemaDepth: getStoredOrDefault('wtl.schemaDepth', defaults.schemaDepth),
    schemaOrder: getStoredOrDefault('wtl.schemaOrder', defaults.schemaOrder)
  };

  return snapshot;
}

export function seedStoredLoadStateSnapshot({ snapshot, defaults = {}, setStoredIfEmpty }) {
  setStoredIfEmpty('wtl.schemaMode', defaults.schemaMode);
  setStoredIfEmpty('wtl.wbReadMode', snapshot.wbReadMode);
  setStoredIfEmpty('wtl.wbManual', snapshot.wbManual);
  setStoredIfEmpty('wtl.entry', snapshot.entry);
  setStoredIfEmpty('wtl.sendMode', snapshot.sendMode);
  setStoredIfEmpty('wtl.instMode', snapshot.instMode);
  setStoredIfEmpty('wtl.schemaSendMode', snapshot.schemaSendMode);
  setStoredIfEmpty('wtl.tableMode', snapshot.tableMode);
  setStoredIfEmpty('wtl.openaiUrl', snapshot.openaiUrl);
  setStoredIfEmpty('wtl.openaiKey', snapshot.openaiKey);
  setStoredIfEmpty('wtl.openaiModel', snapshot.openaiModel);
  setStoredIfEmpty('wtl.openaiTemp', snapshot.openaiTemp);
  setStoredIfEmpty('wtl.openaiMax', snapshot.openaiMax);
  setStoredIfEmpty('wtl.autoFillFloors', snapshot.autoFillFloors);
  setStoredIfEmpty('wtl.autoFillEvery', snapshot.autoFillEvery);
  setStoredIfEmpty('wtl.tablePos', snapshot.tablePos);
  setStoredIfEmpty('wtl.tableRole', snapshot.tableRole);
  setStoredIfEmpty('wtl.tableDepth', snapshot.tableDepth);
  setStoredIfEmpty('wtl.tableOrder', snapshot.tableOrder);
  setStoredIfEmpty('wtl.tableInjectEnabled', snapshot.tableInjectEnabled);
  setStoredIfEmpty('wtl.instPos', snapshot.instPos);
  setStoredIfEmpty('wtl.instRole', snapshot.instRole);
  setStoredIfEmpty('wtl.instDepth', snapshot.instDepth);
  setStoredIfEmpty('wtl.instOrder', snapshot.instOrder);
  setStoredIfEmpty('wtl.instInjectEnabled', snapshot.instInjectEnabled);
  setStoredIfEmpty('wtl.schemaPos', snapshot.schemaPos);
  setStoredIfEmpty('wtl.schemaRole', snapshot.schemaRole);
  setStoredIfEmpty('wtl.schemaDepth', snapshot.schemaDepth);
  setStoredIfEmpty('wtl.schemaOrder', snapshot.schemaOrder);
  setStoredIfEmpty('wtl.schemaInjectEnabled', snapshot.schemaInjectEnabled);
}

export function persistCoreUiState({
  ensurePromptFieldDefaults,
  saveTable,
  pendingAiHistory,
  schemaMode,
  saveSchemaForMode,
  schemaSource,
  schemaValue,
  values = {},
  blockOrder = null,
  refBlockOrder = null,
  syncPromptMacros
}) {
  ensurePromptFieldDefaults({ syncSchema: true });
  return (async () => {
    await saveTable(pendingAiHistory || {});
    if (schemaMode) saveSchemaForMode(schemaMode, schemaSource || schemaValue || '');
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) localStorage.setItem(key, value);
    });
    if (blockOrder) localStorage.setItem('wtl.blockOrder', JSON.stringify(blockOrder));
    if (refBlockOrder) localStorage.setItem('wtl.refBlockOrder', JSON.stringify(refBlockOrder));
    await syncPromptMacros();
  })();
}
