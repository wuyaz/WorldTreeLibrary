export function reorderTemplateItems(list, draggedId, afterId) {
  const nextList = Array.isArray(list) ? [...list] : [];
  const idx = nextList.findIndex((item) => item?.id === draggedId);
  if (idx < 0) return nextList;
  const item = nextList.splice(idx, 1)[0];
  if (!afterId) {
    nextList.push(item);
    return nextList;
  }
  const afterIndex = nextList.findIndex((entry) => entry?.id === afterId);
  if (afterIndex < 0) {
    nextList.push(item);
    return nextList;
  }
  nextList.splice(afterIndex, 0, item);
  return nextList;
}

export function bindTemplateDrag(container, onDrop) {
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
    const ordered = Array.from(container.querySelectorAll('.wtl-editor-item'))
      .map((el) => el.dataset.id)
      .filter(Boolean);
    onDrop?.(ordered);
  });
}

function buildSectionDialogInit(sec) {
  return {
    name: sec.name,
    definition: sec.definition,
    deleteRule: sec.deleteRule,
    insertRule: sec.insertRule,
    updateRule: sec.updateRule,
    fillable: sec.fillable !== false,
    sendable: sec.sendable !== false
  };
}

function buildColumnDialogInit(col) {
  return {
    name: col.name,
    definition: col.definition,
    deleteRule: col.deleteRule,
    insertRule: col.insertRule,
    updateRule: col.updateRule,
    fillable: true
  };
}

function buildMarkdownFromSections({ tableMd, sections, parseMarkdownTableToJson, renderJsonToMarkdown }) {
  return renderJsonToMarkdown({
    title: parseMarkdownTableToJson(tableMd || '').title,
    sections: sections.map((section) => ({
      name: section.name,
      columns: section.header,
      rows: section.rows
    }))
  });
}

function renameMarkdownHeading(tableMd, fromName, toName) {
  const next = (tableMd || '').split('\n');
  for (let i = 0; i < next.length; i++) {
    const match = /^##\s+(.+)$/.exec(next[i].trim());
    if (match && match[1].trim() === fromName) {
      next[i] = `## ${toName}`;
      break;
    }
  }
  return next.join('\n');
}

function removeMarkdownSection(tableMd, name) {
  const next = (tableMd || '').split('\n');
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
  return out.join('\n').trim();
}

export function renderTemplateSectionsList({
  sectionListEl,
  templateState,
  templateActiveSectionId,
  setActiveTemplateSection,
  openTemplateDialog,
  onDeleteSection
}) {
  if (!sectionListEl) return;
  sectionListEl.innerHTML = '';
  templateState.sections.forEach((sec) => {
    const item = document.createElement('div');
    item.className = 'wtl-editor-item';
    item.dataset.id = sec.id;
    item.draggable = true;
    item.classList.toggle('active', sec.id === templateActiveSectionId);

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
      setActiveTemplateSection?.(sec.id);
    });
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTemplateDialog?.('编辑表格', { type: 'section', id: sec.id }, buildSectionDialogInit(sec));
    });
    delBtn.addEventListener('click', () => {
      onDeleteSection?.(sec);
    });

    sectionListEl.appendChild(item);
  });
}

export function renderTemplateColumnsList({
  columnListEl,
  activeSection,
  openTemplateDialog,
  onDeleteColumn
}) {
  if (!columnListEl || !activeSection) return;
  columnListEl.innerHTML = '';
  activeSection.columns.forEach((col) => {
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
      openTemplateDialog?.('编辑列', { type: 'column', sectionId: activeSection.id, id: col.id }, buildColumnDialogInit(col));
    });
    delBtn.addEventListener('click', () => {
      onDeleteColumn?.(col, activeSection);
    });

    columnListEl.appendChild(item);
  });
}

export function saveTemplateDialogChanges({
  templateDialogTarget,
  formState,
  templateState,
  tableMd,
  createSectionIdInTemplate,
  createColumnIdForSection,
  createColumnIdInTemplate,
  parseMarkdownTableToJson,
  parseSections,
  renderJsonToMarkdown,
  templateToSchemaMarkdown,
  onTemplateStateChange,
  onTableMarkdownChange,
  onTemplateActiveSectionChange,
  onAfterChange,
  closeTemplateDialog
}) {
  if (!templateDialogTarget) return false;

  const name = (formState.name || '').trim() || '未命名';
  const definition = (formState.definition || '').trim();
  const deleteRule = formState.enableDelete ? (formState.deleteRule || '').trim() : '';
  const insertRule = formState.enableInsert ? (formState.insertRule || '').trim() : '';
  const updateRule = formState.enableUpdate ? (formState.updateRule || '').trim() : '';
  const fillable = formState.fillable !== false;
  const sendable = formState.sendable !== false;

  if (templateDialogTarget.type === 'section') {
    if (!templateDialogTarget.id) {
      const nextTemplateState = templateState;
      const sectionId = createSectionIdInTemplate(nextTemplateState);
      const section = {
        id: sectionId,
        name,
        definition,
        deleteRule,
        insertRule,
        updateRule,
        fillable,
        sendable,
        columns: [{
          id: createColumnIdForSection(sectionId, new Set()),
          name: '列1',
          definition: '',
          deleteRule: '',
          insertRule: '',
          updateRule: ''
        }]
      };
      nextTemplateState.sections.push(section);
      onTemplateStateChange?.(nextTemplateState);
      onTemplateActiveSectionChange?.(section.id);

      const parsed = parseMarkdownTableToJson(tableMd || '');
      parsed.sections = parsed.sections || [];
      parsed.sections.push({ name, columns: ['列1'], rows: [] });
      onTableMarkdownChange?.(renderJsonToMarkdown(parsed));
      onAfterChange?.();
      closeTemplateDialog?.();
      return true;
    }

    const sec = templateState.sections.find((entry) => entry.id === templateDialogTarget.id);
    if (sec) {
      const prevName = sec.name;
      sec.name = name;
      sec.definition = definition;
      sec.deleteRule = deleteRule;
      sec.insertRule = insertRule;
      sec.updateRule = updateRule;
      sec.fillable = fillable;
      sec.sendable = sendable;
      onTemplateStateChange?.(templateState);
      if (prevName && prevName !== name) {
        onTableMarkdownChange?.(renameMarkdownHeading(tableMd, prevName, name));
      }
    }

    onAfterChange?.();
    closeTemplateDialog?.();
    return true;
  }

  if (templateDialogTarget.type === 'column') {
    const sec = templateState.sections.find((entry) => entry.id === templateDialogTarget.sectionId) || templateState.sections[0];
    if (!sec) return false;

    if (!templateDialogTarget.id) {
      const column = {
        id: createColumnIdInTemplate(templateState, sec.id),
        name,
        definition,
        deleteRule,
        insertRule,
        updateRule
      };
      sec.columns = Array.isArray(sec.columns) ? sec.columns : [];
      sec.columns.push(column);
      onTemplateStateChange?.(templateState);

      const sections = parseSections(tableMd || '');
      const nextSections = sections.map((section) => {
        if (section.name !== (sec.name || '')) return section;
        return {
          ...section,
          header: [...section.header, name],
          rows: section.rows.map((row) => [...row, ''])
        };
      });
      onTableMarkdownChange?.(buildMarkdownFromSections({
        tableMd,
        sections: nextSections,
        parseMarkdownTableToJson,
        renderJsonToMarkdown
      }));
      onAfterChange?.();
      closeTemplateDialog?.();
      return true;
    }

    const col = sec.columns?.find((entry) => entry.id === templateDialogTarget.id);
    if (col) {
      const prevName = col.name;
      col.name = name;
      col.definition = definition;
      col.deleteRule = deleteRule;
      col.insertRule = insertRule;
      col.updateRule = updateRule;
      onTemplateStateChange?.(templateState);
      if (prevName && prevName !== name) {
        const sections = parseSections(tableMd || '');
        const nextSections = sections.map((section) => {
          if (section.name !== (sec.name || '')) return section;
          return {
            ...section,
            header: section.header.map((header) => (header === prevName ? name : header))
          };
        });
        onTableMarkdownChange?.(buildMarkdownFromSections({
          tableMd,
          sections: nextSections,
          parseMarkdownTableToJson,
          renderJsonToMarkdown
        }));
      }
    }

    onAfterChange?.();
    closeTemplateDialog?.();
    return true;
  }

  if (templateDialogTarget.type === 'tab') {
    onTableMarkdownChange?.(renameMarkdownHeading(tableMd, templateDialogTarget.name || '', name));
    closeTemplateDialog?.();
    return true;
  }

  if (templateDialogTarget.type === 'col') {
    const sections = parseSections(tableMd || '');
    const nextSections = sections.map((section) => {
      if (section.name !== (templateDialogTarget.sectionName || '')) return section;
      return {
        ...section,
        header: section.header.map((header) => (header === templateDialogTarget.colName ? name : header))
      };
    });
    onTableMarkdownChange?.(buildMarkdownFromSections({
      tableMd,
      sections: nextSections,
      parseMarkdownTableToJson,
      renderJsonToMarkdown
    }));
    closeTemplateDialog?.();
    return true;
  }

  if (templateDialogTarget.type === 'delete-tab') {
    const merged = removeMarkdownSection(tableMd, templateDialogTarget.name || '');
    const fallback = merged || templateToSchemaMarkdown({ title: templateState.title, sections: templateState.sections });
    onTableMarkdownChange?.(fallback);
    closeTemplateDialog?.();
    return true;
  }

  return false;
}

export function createTemplateEditorController({
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
  getSchemaSource,
  getSchemaValue,
  getTemplateState,
  setTemplateState,
  setTemplateActiveSectionId,
  renderTemplateSections,
  renderTemplateColumns
}) {
  let templateDialogTarget = null;

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

    applyRuleToggle(
      editorDialogInsertEnabledEl,
      editorDialogAddEl,
      editorDialogInsertRowEl,
      editorDialogInsertToggleEl,
      (init.insertRule || '').trim().length > 0
    );
    applyRuleToggle(
      editorDialogUpdateEnabledEl,
      editorDialogEditEl,
      editorDialogUpdateRowEl,
      editorDialogUpdateToggleEl,
      (init.updateRule || '').trim().length > 0
    );
    applyRuleToggle(
      editorDialogDeleteEnabledEl,
      editorDialogDelEl,
      editorDialogDeleteRowEl,
      editorDialogDeleteToggleEl,
      (init.deleteRule || '').trim().length > 0
    );

    if (editorDialogFillEl?.parentElement) {
      editorDialogFillEl.parentElement.style.display = target?.type === 'section' ? 'flex' : 'none';
    }
    if (editorDialogSendEl?.parentElement) {
      editorDialogSendEl.parentElement.style.display = target?.type === 'section' ? 'flex' : 'none';
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

  const showTemplateEditor = () => {
    if (templateEditorEl) templateEditorEl.style.display = 'block';
    let templateState = parseSchemaToTemplate(getSchemaSource?.() || getSchemaValue?.() || '');
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
        columns: [{
          id: createColumnIdForSection(sectionId, new Set()),
          name: '列1',
          definition: '',
          deleteRule: '',
          insertRule: '',
          updateRule: ''
        }]
      });
    }
    setTemplateState?.(templateState);
    setTemplateActiveSectionId?.(templateState.sections[0]?.id || '');
    renderTemplateSections?.();
    renderTemplateColumns?.();
  };

  const hideTemplateEditor = () => {
    if (templateEditorEl) templateEditorEl.style.display = 'none';
  };

  return {
    openTemplateDialog,
    closeTemplateDialog,
    showTemplateEditor,
    hideTemplateEditor,
    bindTemplateDrag: (container, onDrop) => bindTemplateDrag(container, onDrop),
    reorderTemplateItems,
    getTemplateDialogTarget: () => templateDialogTarget,
    clearTemplateDialogTarget: () => {
      templateDialogTarget = null;
    },
    getTemplateState: () => getTemplateState?.()
  };
}
