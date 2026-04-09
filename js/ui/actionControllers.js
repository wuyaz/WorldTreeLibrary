export function createAutoRefreshController({
  pageConfigEl,
  sendModeEl,
  logPromptBtn,
  logAiBtn,
  logContentEl,
  refreshPromptPreview
}) {
  let previewTimer = null;

  const ensurePreviewAutoRefresh = () => {
    if (previewTimer) return;
    previewTimer = setInterval(() => {
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

  return {
    ensurePreviewAutoRefresh
  };
}

export function bindWorldBookControls({
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
}) {
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
}

export function bindOpenAiPresetControls({
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
}) {
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
      max: openaiMaxEl?.value || '',
      stream: openaiStreamEl?.checked !== false
    };
    setOpenAIPresets(presets);
    refreshOpenAIPresetSelect();
    if (openaiPresetEl) openaiPresetEl.value = name;
    await saveState();
    setStatus('预设已保存');
  });
}

export function createFillController({
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
  templateState,
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
  onPendingAiHistory,
  onLastRef,
  getRunning,
  setRunning
}) {
  const runFillOnce = async (overrideChat = null) => {
    if (getRunning()) return;
    setRunning(true);
    setStatus('填表中');
    notifyStatus('info', '开始填表');
    try {
      const ref = await buildReferenceBundle({
        overrideChat,
        wbMode: wbModeEl?.value || 'auto',
        manualConfig: getManualConfig(),
        worldBookName: 'Current Chat'
      });
      onLastRef(ref);
      const refBlocks = await formatReferenceText({
        ref,
        entryName: entryEl?.value || 'WorldTreeMemory',
        tableMd: tableMdEl?.value || '',
        instructionMd: instructionEl?.value || '',
        refBlockEls: getRefBlockEls(refBlockListEl),
        refBlocksPreset: getRefBlocksPreset() || [],
        refOrderPreset: getRefOrderPreset() || []
      });
      const promptTextRaw = buildPrompt({
        blockEls: getBlockEls(blockListEl),
        refTextBlocks: refBlocks,
        prePromptText: prePromptEl?.value || '',
        instructionText: instructionEl?.value || '',
        schemaText: schemaEl?.value || '',
        tableText: tableMdEl?.value || '',
        templateState: templateState(),
        hiddenRows: hiddenRowsRef.get()
      });
      const promptText = await applyAllPromptMacros(promptTextRaw);
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
          maxTokens: Number(openaiMaxEl?.value || 1024),
          stream: openaiStreamEl?.checked !== false
        }
      });
      localStorage.setItem('wtl.lastAi', aiText || '');
      const editPayload = extractEditPayload(aiText);
      const cmds = parseCommands(editPayload);
      onPendingAiHistory({
        aiCommandText: editPayload || '',
        aiRawText: aiText || '',
        source: sendMode === 'external' ? '第三方 API' : '酒馆'
      });
      const applied = applyCommands(stripTableWrapper(tableMdEl?.value || ''), cmds, templateState(), hiddenRowsRef.get());
      hiddenRowsRef.set(applied?.hiddenRows || {});
      const wrapped = ensureTableWrapper(applied?.markdown || '');
      if (tableMdEl) tableMdEl.value = wrapped;
      renderPreview(wrapped);
      await saveState();
      setStatus('完成');
      notifyStatus('success', '填表完成');
    } catch (e) {
      setStatus('失败');
      notifyStatus('error', '填表失败');
      console.warn('[WorldTreeLibrary]', e);
    } finally {
      setRunning(false);
    }
  };

  return { runFillOnce };
}

export function bindRuntimeModeControls({
  autoToggleBtn,
  tableInjectToggleBtn,
  instInjectToggleEl,
  schemaInjectToggleEl,
  tablePosEl,
  tableDepthEl,
  instPosEl,
  instDepthEl,
  schemaPosEl,
  schemaDepthEl,
  autoFloorsEl,
  autoEveryEl,
  tableMdEl,
  setAutoUi,
  setTableInjectUi,
  setDepthOnlyWhenFixed,
  saveState,
  syncTableInjection,
  syncInstructionInjection,
  syncSchemaInjection,
  renderPreview,
  refreshPromptPreview,
  setStatus
}) {
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
}

export function bindCommonActionControls({
  runBtn,
  stopBtn,
  clearBtn,
  saveBtn,
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
  getRunning,
  setRunning,
  runFillOnce
}) {
  runBtn?.addEventListener('click', async () => {
    await runFillOnce();
  });

  stopBtn?.addEventListener('click', () => {
    if (!getRunning()) return;
    setRunning(false);
    setStatus('已停止');
  });

  clearBtn?.addEventListener('click', () => {
    if (tableMdEl) tableMdEl.value = '';
    renderPreview('');
    saveState();
    setStatus('表格已清空');
  });

  saveBtn?.addEventListener('click', async () => {
    await saveState();
    renderPreview(tableMdEl?.value || '');
    setStatus('已保存');
  });

  resetGlobalBtn?.addEventListener('click', () => {
    const confirmBtn = makeModalSaveButton('确认恢复', async () => {
      resetGlobalBtn.disabled = true;
      try {
        await resetAllDefaults();
      } finally {
        resetGlobalBtn.disabled = false;
      }
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
}
