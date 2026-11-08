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
  schemaModeCopyEl,
  schemaModeDisplayEl,
  onSendModeChange,
  onInstModeChange,
  onSchemaModeChange
}) {
  sendModeEl?.addEventListener('change', () => {
    onSendModeChange?.(sendModeEl.value);
  });

  instModeEl?.addEventListener('change', () => {
    onInstModeChange?.(instModeEl.value);
  });

  schemaModeSendEl?.addEventListener('change', () => {
    onSchemaModeChange?.('send', schemaModeSendEl.value);
  });

  schemaModeCopyEl?.addEventListener('change', () => {
    onSchemaModeChange?.('copy', schemaModeCopyEl.value);
  });

  schemaModeDisplayEl?.addEventListener('change', () => {
    onSchemaModeChange?.('display', schemaModeDisplayEl.value);
  });
}

/**
 * 绑定模式切换控制（模块2 → 模块3/4 显示/隐藏）
 * 当 sendMode 改变时，显示/隐藏 ST 设置和 External 设置区域
 */
export function bindModeSwitchControls({
  sendModeEl,
  stSettingsEl,
  externalEl,
  onSendModeChange
}) {
  const updateModeVisibility = () => {
    const mode = sendModeEl?.value || 'st';
    const isExternal = mode === 'external';
    if (stSettingsEl) stSettingsEl.style.display = isExternal ? 'none' : 'block';
    if (externalEl) externalEl.style.display = isExternal ? 'block' : 'none';
  };

  sendModeEl?.addEventListener('change', () => {
    updateModeVisibility();
    onSendModeChange?.(sendModeEl.value);
  });

  // 初始状态
  updateModeVisibility();

  return { updateModeVisibility };
}
