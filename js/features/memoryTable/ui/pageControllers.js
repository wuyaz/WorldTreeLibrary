export function createExternalTabController({
  externalNavOrderBtn,
  externalNavRefBtn,
  externalNavWbBtn,
  externalPanelOrderEl,
  externalPanelRefEl,
  externalPanelWbEl
}) {
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

  return { setExternalLeftTab };
}

export function bindPageControls({
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
}) {
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
}

export function bindModeControls({
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
}) {
  sendModeEl?.addEventListener('change', async () => {
    const mode = sendModeEl.value;
    refreshModeUi();
    await saveState();
    if (mode === 'external') {
      setExternalLeftTab('order');
    }
    refreshPromptPreview(true);
  });

  instModeEl?.addEventListener('change', async () => {
    refreshModeUi();
    await saveState();
    await syncInstructionInjection();
    refreshPromptPreview(true);
  });

  schemaModeSendEl?.addEventListener('change', async () => {
    refreshModeUi();
    await saveState();
    await syncSchemaInjection();
    refreshPromptPreview(true);
  });

  tableModeEl?.addEventListener('change', async () => {
    refreshModeUi();
    await saveState();
    await syncTableInjection();
    refreshPromptPreview(true);
  });
}
