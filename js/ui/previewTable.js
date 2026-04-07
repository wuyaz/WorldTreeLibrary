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

export function bindGenericDrag(container) {
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
      if (after) container.insertBefore(dragged, after);
      else container.appendChild(dragged);
    }
  });
}

export function bindPreviewRowDrag({
  tableEditMode,
  moveRow
}) {
  const tableEl = document.getElementById('wtl-table-view');
  if (!tableEl) return;
  tableEl.querySelectorAll('tbody tr').forEach((rowEl) => {
    const indexCell = rowEl.querySelector('td.wtl-row-index');
    if (!indexCell) return;
    indexCell.setAttribute('draggable', 'true');

    indexCell.addEventListener('dragstart', (e) => {
      if (!tableEditMode()) {
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
      if (!tableEditMode()) return;
      e.preventDefault();
      rowEl.classList.add('wtl-row-dragover');
    });

    rowEl.addEventListener('dragleave', () => {
      rowEl.classList.remove('wtl-row-dragover');
    });

    rowEl.addEventListener('drop', (e) => {
      if (!tableEditMode()) return;
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
}

export function renderPreviewTabs({
  tableTabsEl,
  sections,
  activeSection,
  templateEditMode,
  templateState,
  openTemplateDialog,
  makeModalSaveButton,
  openConfirmModal,
  templateToSchemaMarkdown,
  getTableMarkdown,
  setTableMarkdown,
  setTemplateState,
  templateActiveSectionId,
  setTemplateActiveSectionId,
  renderPreview,
  renderTemplateSections,
  renderTemplateColumns,
  updateSchemaPreview,
  refreshPromptPreview,
  setActiveSection,
  setTableSectionOrder,
  bindDrag
}) {
  if (!tableTabsEl) return;
  tableTabsEl.innerHTML = '';
  const names = sections.map((s) => s.name);
  setTableSectionOrder(names.slice());
  let nextActive = activeSection;
  if (!nextActive || !names.includes(nextActive)) {
    nextActive = names[0] || '';
    setActiveSection(nextActive);
  }

  names.forEach((name) => {
    const tab = document.createElement('div');
    tab.className = `wtl-tab${name === nextActive ? ' active' : ''}${templateEditMode() ? ' wtl-tab-editing' : ''}`;
    tab.dataset.name = name;
    tab.draggable = templateEditMode();

    const label = document.createElement('span');
    label.textContent = name;
    tab.appendChild(label);

    const pencil = document.createElement('button');
    pencil.className = 'wtl-pencil';
    pencil.type = 'button';
    pencil.innerHTML = '<i class="fa-solid fa-pen"></i>';
    pencil.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!templateEditMode()) return;
      const sec = templateState().sections.find((s) => s.name === name);
      if (sec) {
        openTemplateDialog('编辑表格', { type: 'section', id: sec.id }, buildSectionDialogInit(sec));
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
      if (!templateEditMode()) return;
      const sec = templateState().sections.find((s) => s.name === name);
      const content = `确认删除页签：${name}\n\n删除后将移除模板章节与表格内容。`;
      const confirmBtn = makeModalSaveButton('确认删除', () => {
        const nextTemplateState = templateState();
        if (sec) {
          nextTemplateState.sections = nextTemplateState.sections.filter((s) => s.id !== sec.id);
          setTemplateState(nextTemplateState);
          if (templateActiveSectionId() === sec.id) {
            setTemplateActiveSectionId(nextTemplateState.sections[0]?.id || '');
          }
        }
        const next = (getTableMarkdown() || '').split('\n');
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
        const finalMd = merged || templateToSchemaMarkdown({ title: nextTemplateState.title, sections: nextTemplateState.sections });
        setTableMarkdown(finalMd);
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
      setActiveSection(name);
      renderPreview(getTableMarkdown() || '');
    });
    tableTabsEl.appendChild(tab);
  });

  if (templateEditMode()) {
    const addTab = document.createElement('div');
    addTab.className = 'wtl-tab wtl-tab-editing';
    addTab.dataset.name = 'add';

    const label = document.createElement('span');
    label.textContent = '+';
    addTab.appendChild(label);

    addTab.addEventListener('click', () => {
      if (!templateEditMode()) return;
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
}

export function renderTablePreview({
  md,
  headEl,
  bodyEl,
  tableTabsEl,
  parseSections,
  hiddenRows,
  templateEditMode,
  tableEditMode,
  enableTableInlineEditing,
  disableTableInlineEditing,
  bindRowDrag,
  templateState,
  openTemplateDialog,
  updateTableRows,
  moveRow,
  activeSection,
  setActiveSection,
  tableSectionOrder,
  setTableSectionOrder,
  renderTabs
}) {
  if (!headEl || !bodyEl) return;
  const sections = parseSections(md);
  if (!sections.length) {
    headEl.innerHTML = '';
    bodyEl.innerHTML = '';
    if (tableTabsEl) tableTabsEl.innerHTML = '';
    return;
  }

  renderTabs(sections);
  const current = sections.find((s) => s.name === activeSection()) || sections[0];
  const header = current.header;
  const sectionIndex = Math.max(1, sections.findIndex((s) => s.name === current.name) + 1);

  headEl.innerHTML = header.length
    ? `<tr>${['#', ...header].map((h, i) => {
      if (i === 0) return `<th class="wtl-row-index" data-row-index="true"><span>#</span></th>`;
      const label = h || '';
      const pencil = `<button class="wtl-pencil" type="button" data-col="${label}"><i class="fa-solid fa-pen"></i></button>`;
      const resizer = `<span class="wtl-col-resizer" data-col="${label}"></span>`;
      return `<th draggable="${templateEditMode()}" data-col="${label}"><span>${label}</span>${pencil}${resizer}</th>`;
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
  if (previewTable) previewTable.classList.toggle('wtl-template-editing', templateEditMode());
  if (previewTable) previewTable.classList.toggle('wtl-table-editing', tableEditMode());
  if (tableEditMode()) enableTableInlineEditing();
  if (!tableEditMode()) disableTableInlineEditing();
  bindRowDrag();

  headEl.querySelectorAll('.wtl-pencil').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!templateEditMode()) return;
      const colName = btn.dataset.col || '';
      const sec = templateState().sections.find((s) => s.name === current.name);
      const col = sec?.columns?.find((c) => c.name === colName);
      if (sec && col) {
        openTemplateDialog('编辑列', { type: 'column', id: col.id, sectionId: sec.id }, buildColumnDialogInit(col));
        return;
      }
      openTemplateDialog('编辑列名', { type: 'col', sectionName: current.name, colName }, { name: colName });
    });
  });

  bodyEl.querySelectorAll('td.wtl-row-index button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!tableEditMode()) return;
      const cell = btn.closest('td');
      const rowIndex = Number(cell?.dataset.row || 0);
      const rowSectionIndex = Number(cell?.dataset.section || 0);
      if (!rowIndex || !rowSectionIndex) return;

      document.querySelectorAll('.wtl-row-index-pop').forEach((el) => el.remove());

      const pop = document.createElement('div');
      pop.className = 'wtl-row-index-pop';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = '插入';
      addBtn.addEventListener('click', () => {
        updateTableRows(rowSectionIndex, (section, rows, cols) => {
          const filled = cols.map(() => '');
          rows.splice(rowIndex, 0, filled);
        });
        pop.remove();
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = '复制';
      copyBtn.addEventListener('click', () => {
        updateTableRows(rowSectionIndex, (section, rows, cols) => {
          const src = rows[rowIndex - 1] || cols.map(() => '');
          rows.splice(rowIndex, 0, src.slice());
        });
        pop.remove();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => {
        updateTableRows(rowSectionIndex, (section, rows) => {
          if (rows[rowIndex - 1]) rows.splice(rowIndex - 1, 1);
        });
        pop.remove();
      });

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.textContent = '上移';
      upBtn.addEventListener('click', () => {
        moveRow(rowSectionIndex, rowIndex, rowIndex - 1);
        pop.remove();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.textContent = '下移';
      downBtn.addEventListener('click', () => {
        moveRow(rowSectionIndex, rowIndex, rowIndex + 1);
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
}
