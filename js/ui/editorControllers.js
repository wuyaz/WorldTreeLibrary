export function bindResetAndHistoryControls({
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
  onSchemaReset
}) {
  resetSchemaBtn?.addEventListener('click', async () => {
    const confirmBtn = makeModalSaveButton('确认恢复', async () => {
      const nextSchema = getSchemaPreset() || '';
      const nextTemplateState = parseSchemaToTemplate(nextSchema);
      const nextTable = renderJsonToMarkdown(buildEmptyTableFromTemplate(nextTemplateState));
      onSchemaReset?.({ schemaSource: nextSchema, templateState: nextTemplateState });
      if (schemaEl) schemaEl.value = buildTemplatePrompt(nextTemplateState) || nextSchema;
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
}

export function bindTemplateEditingControls({
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
  getTemplateEditMode,
  setTemplateEditMode,
  getTableEditMode,
  setTableEditMode,
  getActiveSection,
  getTemplateState,
  setTemplateState,
  getTemplateActiveSectionId,
  setTableSectionOrder,
  renderTemplateSections,
  renderTemplateColumns,
  setStatus
}) {
  editTableBtn?.addEventListener('click', async () => {
    const nextMode = !getTableEditMode();
    setTableEditMode(nextMode);
    if (editTableBtn) {
      const label = nextMode ? '保存表格' : '编辑表格';
      editTableBtn.querySelector('span') ? editTableBtn.querySelector('span').textContent = label : (editTableBtn.textContent = label);
    }

    if (nextMode) {
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

  editTableBtn?.addEventListener('click', () => {
    setStatus('拖拽表头以调整列顺序');
  });

  editTemplateBtn?.addEventListener('click', async () => {
    const nextMode = !getTemplateEditMode();
    setTemplateEditMode(nextMode);
    if (editTemplateBtn) {
      const label = nextMode ? '保存模板' : '编辑模板';
      editTemplateBtn.querySelector('span') ? editTemplateBtn.querySelector('span').textContent = label : (editTemplateBtn.textContent = label);
    }

    if (nextMode) {
      renderPreview(tableMdEl?.value || '');
      setStatus('编辑模板：可拖拽页签/列并点击铅笔编辑');
      return;
    }

    const cols = Array.from(headEl?.querySelectorAll('th') || []).map((th) => th.dataset.col).filter(Boolean);
    if (cols.length) {
      const next = reorderColumns(tableMdEl?.value || '', getActiveSection(), cols);
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
    openTemplateDialog('新建列', { type: 'column', id: '', sectionId: getTemplateActiveSectionId() }, {
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
      const templateState = getTemplateState();
      templateState.sections = ordered.map((id) => templateState.sections.find((s) => s.id === id)).filter(Boolean);
      setTemplateState(templateState);
      renderTemplateSections();
      updateSchemaPreview();
      refreshPromptPreview(true);
    });
  }

  if (columnListEl) {
    bindTemplateDrag(columnListEl, (ordered) => {
      const templateState = getTemplateState();
      const sec = templateState.sections.find((s) => s.id === getTemplateActiveSectionId()) || templateState.sections[0];
      if (!sec) return;
      sec.columns = ordered.map((id) => sec.columns.find((c) => c.id === id)).filter(Boolean);
      setTemplateState(templateState);
      renderTemplateColumns();
      updateSchemaPreview();
      refreshPromptPreview(true);
    });
  }

  tableTabsEl?.addEventListener('dragend', async () => {
    if (!tableTabsEl || !getTemplateEditMode()) return;
    const ordered = Array.from(tableTabsEl.querySelectorAll('.wtl-tab')).map((el) => el.dataset.name).filter(Boolean);
    if (!ordered.length) return;
    setTableSectionOrder(ordered);
    const next = reorderSections(tableMdEl?.value || '', ordered);
    if (tableMdEl) tableMdEl.value = next;
    renderPreview(next);
    await saveState();
  });

  headEl?.addEventListener('dragstart', (e) => {
    if (!getTemplateEditMode()) return;
    const target = e.target;
    if (target && target.tagName === 'TH') {
      target.classList.add('dragging');
    }
  });

  headEl?.addEventListener('dragend', async () => {
    if (!getTemplateEditMode()) return;
    const target = headEl.querySelector('th.dragging');
    if (target) target.classList.remove('dragging');
    const cols = Array.from(headEl.querySelectorAll('th')).map((th) => th.dataset.col).filter(Boolean);
    if (!cols.length) return;
    const next = reorderColumns(tableMdEl?.value || '', getActiveSection(), cols);
    if (tableMdEl) tableMdEl.value = next;
    renderPreview(next);
    await saveState();
  });

  headEl?.addEventListener('dragover', (e) => {
    if (!getTemplateEditMode()) return;
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
}
