// @ts-nocheck
/**
 * ViewRenderer.js - 统一视图渲染器 (重构版)
 */

export class ViewRenderer {
  constructor(root) {
    this.root = root;
    this.cache = new Map();
  }

  initialize() {
    this.tableHead = this.root?.querySelector('#wtl-preview-head');
    this.tableBody = this.root?.querySelector('#wtl-preview-body');
    this.tableEl = this.root?.querySelector('#wtl-table-view');
    this.sectionTabsEl = this.root?.querySelector('#wtl-section-tabs');
    this.statusEl = this.root?.querySelector('#wtl-status');
    this.rowCountEl = this.root?.querySelector('#wtl-row-count');
    this.lastSavedEl = this.root?.querySelector('#wtl-last-saved');
  }

  getElement(id) {
    if (!this.cache.has(id)) {
      const el = this.root?.querySelector(`#${id}`) || document.getElementById(id);
      if (el) this.cache.set(id, el);
    }
    return this.cache.get(id);
  }

  clearCache() { this.cache.clear(); }

  // ========== 状态 ==========
  updateStatus(message, type = 'info') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.className = `wtl-status-${type}`;
    setTimeout(() => {
      if (this.statusEl.textContent === message) {
        this.statusEl.textContent = '';
        this.statusEl.className = '';
      }
    }, 3000);
  }

  // ========== 页面切换 ==========
  showWorkspacePage() {
    const main = this.getElement('wtl-page-main');
    const config = this.getElement('wtl-page-config');
    if (main) main.style.display = '';
    if (config) config.style.display = 'none';
  }

  showSettingsPage() {
    const main = this.getElement('wtl-page-main');
    const config = this.getElement('wtl-page-config');
    if (main) main.style.display = 'none';
    if (config) config.style.display = '';
  }

  // ========== 章节标签 ==========
  renderSectionTabs(sections, activeSection, templateMode = false) {
    const el = this.sectionTabsEl;
    if (!el) return;
    if (!sections || sections.length === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = sections.map((section, idx) => {
      const name = section.name || `表格${idx + 1}`;
      const isActive = idx === activeSection;
      const drag = templateMode
        ? `<i class="fa-solid fa-grip-vertical wtl-drag-handle" aria-hidden="true"></i>`
        : '';
      const editIcon = templateMode
        ? `<i class="fa-solid fa-pen wtl-table-header-edit-icon" data-section-idx="${idx}" aria-hidden="true"></i>`
        : '';
      return `<button class="wtl-section-tab wtl-chat-manager-pill${isActive ? ' is-active' : ''}" data-section-idx="${idx}" ${templateMode ? 'draggable="true"' : ''}>${drag}${this.escapeHtml(name)}${editIcon}</button>`;
    }).join('');

    this.initTabsArrows();
  }

  initTabsArrows() {
    const tabsEl = this.sectionTabsEl;
    const leftArrow = this.root?.querySelector('#wtl-tabs-arrow-left');
    const rightArrow = this.root?.querySelector('#wtl-tabs-arrow-right');
    if (!tabsEl || !leftArrow || !rightArrow) return;

    const updateArrows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = tabsEl;
      leftArrow.classList.toggle('is-visible', scrollLeft > 2);
      rightArrow.classList.toggle('is-visible', scrollLeft + clientWidth < scrollWidth - 2);
    };

    leftArrow.onclick = () => { tabsEl.scrollLeft -= 150; };
    rightArrow.onclick = () => { tabsEl.scrollLeft += 150; };
    tabsEl.removeEventListener('scroll', tabsEl._wtlArrowHandler);
    tabsEl._wtlArrowHandler = updateArrows;
    tabsEl.addEventListener('scroll', updateArrows);
    updateArrows();
  }

  setActiveTab(sectionIdx) {
    if (!this.sectionTabsEl) return;
    const tabs = this.sectionTabsEl.querySelectorAll('.wtl-section-tab');
    tabs.forEach((tab, idx) => tab.classList.toggle('is-active', idx === sectionIdx));
  }

  // ========== 表格渲染 ==========
  renderTable(tableData, options = {}) {
    if (!this.tableHead || !this.tableBody) return;

    const { hiddenRows = {}, sectionIndex = 0, editMode = false, templateMode = false } = options;
    const sections = tableData?.sections || [];

    if (this.tableEl) {
      this.tableEl.classList.toggle('wtl-table-template-mode', templateMode);
    }

    if (sections.length === 0) {
      this.tableHead.innerHTML = '';
      this.tableBody.innerHTML = '';
      this.updateRowCount(0);
      return;
    }

    const section = sections[sectionIndex] || sections[0];
    const columns = section?.columns || [];
    const rows = section?.rows || [];
    const sectionNum = sectionIndex + 1;

    // 始终以非编辑模式渲染（编辑模式通过 toggleEditMode 切换，不重建 DOM）
    this.tableHead.innerHTML = this._renderHeader(columns, templateMode, false);
    this.tableBody.innerHTML = this._renderBody(rows, columns, hiddenRows, sectionNum, false);
    this.updateRowCount(rows.length);

    if (editMode) {
      // 如果初始就是编辑模式，直接切换过去
      this.toggleEditMode(true);
    }
  }

  /**
   * 切换编辑模式（不重建表格 DOM，只切换类名和行头内容）
   * @param {boolean} enable - 是否启用编辑模式
   */
  toggleEditMode(enable) {
    if (!this.tableEl || !this.tableBody) return;

    this.tableEl.classList.toggle('wtl-table-editable', enable);

    // 切换数据单元格的 contenteditable
    this.tableBody.querySelectorAll('td[data-col-idx]').forEach(cell => {
      if (enable) {
        cell.setAttribute('contenteditable', 'true');
      } else {
        cell.removeAttribute('contenteditable');
      }
    });

    // 切换行头内容（保留行高调整手柄）
    const indexTds = this.tableBody.querySelectorAll('.wtl-row-index');
    indexTds.forEach(td => {
      const rowNum = td.getAttribute('data-row');
      const rowIdx = td.getAttribute('data-row-idx');
      const sectionNum = td.getAttribute('data-section');
      // 保留行高调整手柄
      const resizeHandle = td.querySelector('.wtl-row-resize-handle');
      const resizeHtml = resizeHandle ? resizeHandle.outerHTML : '';
      if (enable) {
        td.classList.add('wtl-row-index-edit');
        td.innerHTML = `
          <i class="fa-solid fa-grip-vertical wtl-row-drag-handle" aria-hidden="true"></i>
          <span class="wtl-row-index-num">${rowNum}</span>
          <i class="fa-solid fa-caret-right wtl-row-action-toggle" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="展开操作"></i>
          <span class="wtl-row-action-panel"></span>
          ${resizeHtml}
        `;
      } else {
        td.classList.remove('wtl-row-index-edit');
        td.innerHTML = `<span>${rowNum}</span>${resizeHtml}`;
      }
    });

    // 切换表头角落内容
    const cornerTh = this.tableHead?.querySelector('.wtl-row-index-header');
    if (cornerTh) {
      cornerTh.innerHTML = enable
        ? '<i class="fa-solid fa-grip-vertical" style="opacity:0.4;font-size:10px"></i>'
        : '#';
    }

    // 绑定/解绑事件
    if (enable) {
      this._bindRowDrag();
      this._bindRowActions();
    } else {
      this._unbindRowDrag();
      this._unbindRowActions();
    }
  }

  _renderHeader(columns, templateMode, editMode = false) {
    if (!columns.length) return '';
    const cornerContent = editMode ? '<i class="fa-solid fa-grip-vertical" style="opacity:0.4;font-size:10px"></i>' : '#';
    const cornerTh = `<th class="wtl-row-index-header" data-col-idx="-1">${cornerContent}</th>`;
    const cells = columns.map((col, idx) => {
      const name = typeof col === 'string' ? col : (col.name || col);
      const drag = templateMode ? `<i class="fa-solid fa-grip-vertical wtl-table-col-drag-handle" aria-hidden="true"></i>` : '';
      const edit = templateMode ? `<i class="fa-solid fa-pen wtl-table-header-edit-icon" data-col-idx="${idx}" aria-hidden="true"></i>` : '';
      const resizeHandle = `<div class="wtl-col-resize-handle" data-col-idx="${idx}"></div>`;
      return `<th data-col-idx="${idx}" ${templateMode ? 'draggable="true"' : ''}>${drag}${this.escapeHtml(name)}${edit}${resizeHandle}</th>`;
    }).join('');
    return `<tr>${cornerTh}${cells}</tr>`;
  }

  _renderBody(rows, columns, hiddenRows, sectionNum, editMode) {
    if (!rows.length) {
      const addRow = editMode ? `<tr class="wtl-add-row-tr"><td class="wtl-row-index"></td><td colspan="${columns.length || 1}" class="wtl-add-row-cell"><button class="wtl-add-row-btn" data-action="add-row" data-row-idx="0" data-section="${sectionNum}" title="添加新行"><i class="fa-solid fa-plus"></i></button></td></tr>` : '';
      return `<tr><td class="wtl-row-index wtl-row-index-empty"></td><td colspan="${columns.length || 1}" class="wtl-empty-state">暂无数据</td></tr>${addRow}`;
    }
    const rowsHtml = rows.map((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const hidden = hiddenRows?.[sectionNum]?.[rowNum];
      const cls = hidden ? ' wtl-row-hidden' : '';
      const editable = editMode ? ' contenteditable="true"' : '';
      const rowResizeHandle = editMode ? '' : `<div class="wtl-row-resize-handle" data-row-idx="${rowIdx}"></div>`;
      // 编辑模式行头：左边把手 + 中间数字 + 右边小三角 + 操作面板
      const indexContent = editMode
        ? `<i class="fa-solid fa-grip-vertical wtl-row-drag-handle" aria-hidden="true"></i><span class="wtl-row-index-num">${rowNum}</span><i class="fa-solid fa-caret-right wtl-row-action-toggle" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="展开操作"></i><span class="wtl-row-action-panel"></span>`
        : `<span>${rowNum}</span>`;
      const indexTd = `<td class="wtl-row-index${editMode ? ' wtl-row-index-edit' : ''}" data-row-idx="${rowIdx}" data-row="${rowNum}" data-section="${sectionNum}">${indexContent}${rowResizeHandle}</td>`;
      const cells = columns.map((_, colIdx) => {
        const val = row?.[colIdx] ?? '';
        return `<td${editable} class="wtl-data-cell" data-row-idx="${rowIdx}" data-col-idx="${colIdx}">${this.escapeHtml(val)}</td>`;
      }).join('');
      return `<tr class="wtl-table-row${cls}" data-row="${rowNum}" data-row-idx="${rowIdx}" data-section="${sectionNum}">${indexTd}${cells}</tr>`;
    }).join('');
    const addRow = editMode ? `<tr class="wtl-add-row-tr"><td class="wtl-row-index"></td><td colspan="${columns.length || 1}" class="wtl-add-row-cell"><button class="wtl-add-row-btn" data-action="add-row" data-row-idx="${rows.length}" data-section="${sectionNum}" title="添加新行"><i class="fa-solid fa-plus"></i></button></td></tr>` : '';
    return rowsHtml + addRow;
  }

  updateCell(rowIdx, colIdx, value) {
    const cell = this.root?.querySelector(`td[data-row-idx="${rowIdx}"][data-col-idx="${colIdx}"]`);
    if (cell) cell.textContent = value;
  }

  updateRowCount(count) {
    if (this.rowCountEl) this.rowCountEl.textContent = `${count} 行`;
  }

  updateLastSaved(text) {
    if (this.lastSavedEl) this.lastSavedEl.textContent = text;
  }

  // ========== 按钮状态 ==========
  updateRunButton(running) {
    const btn = this.getElement('wtl-run');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    if (running) {
      btn.classList.add('wtl-btn-danger'); btn.classList.remove('wtl-btn-primary');
      if (icon) icon.className = 'fa-solid fa-stop';
      if (span) span.textContent = '填表中(点击停止)';
    } else {
      btn.classList.remove('wtl-btn-danger'); btn.classList.add('wtl-btn-primary');
      if (icon) icon.className = 'fa-solid fa-play';
      if (span) span.textContent = '立即填表';
    }
  }

  updateEditTableButton(editMode) {
    const btn = this.getElement('wtl-edit-table');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (editMode) {
      btn.classList.add('is-editing');
      btn.title = '保存并退出编辑';
      if (icon) icon.className = 'fa-solid fa-floppy-disk';
    } else {
      btn.classList.remove('is-editing');
      btn.title = '编辑表格';
      if (icon) icon.className = 'fa-solid fa-pencil';
    }
  }

  updateHistoryButtons(canUndo, canRedo) {
    const undo = this.getElement('wtl-history-back');
    const redo = this.getElement('wtl-history-undo');
    if (undo) undo.disabled = !canUndo;
    if (redo) redo.disabled = !canRedo;
  }

  // ========== 功能禁用 ==========
  updateFeatureDisabled(disabled) {
    const notice = this.getElement('wtl-memory-feature-disabled');
    // Always show table area — never hide it
    if (notice) notice.style.display = 'none';
  }

  // ========== 模态 ==========
  showModal(id, opts = {}) {
    const modal = this.getElement(id);
    if (!modal) return;
    modal.style.display = 'flex';
    if (opts.title) {
      const t = modal.querySelector('.wtl-modal-header h4');
      if (t) t.textContent = opts.title;
    }
  }

  hideModal(id) {
    const modal = this.getElement(id);
    if (modal) modal.style.display = 'none';
  }

  // ========== 内联编辑 ==========
  enableInlineEditing(onChange) {
    if (!this.tableBody) return;
    this.tableBody.querySelectorAll('td[data-col-idx]').forEach(cell => {
      cell.setAttribute('contenteditable', 'true');
      cell.addEventListener('blur', (e) => {
        if (onChange) {
          const row = e.target.closest('tr');
          const rowIdx = parseInt(row?.dataset?.rowIdx ?? 0);
          const colIdx = parseInt(e.target?.dataset?.colIdx ?? 0);
          onChange({ rowIndex: rowIdx, colIndex: colIdx, value: e.target.textContent });
        }
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Escape') e.target.blur();
      });
    });
  }

  disableInlineEditing() {
    if (!this.tableBody) return;
    this.tableBody.querySelectorAll('td[data-col-idx]').forEach(cell => cell.removeAttribute('contenteditable'));
  }

  bindResizeHandles() {
    if (!this.tableEl) return;
    this.unbindResizeHandles();

    this._onColResize = (e) => {
      const handle = e.target.closest('.wtl-col-resize-handle');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      const th = handle.closest('th');
      if (!th) return;
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const onMove = (evt) => {
        const next = Math.max(40, startWidth + (evt.clientX - startX));
        th.style.width = `${next}px`;
        th.style.minWidth = `${next}px`;
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    this._onRowResize = (e) => {
      const handle = e.target.closest('.wtl-row-resize-handle');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      const tr = handle.closest('tr');
      if (!tr) return;
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
    };

    this.tableHead?.addEventListener('mousedown', this._onColResize);
    this.tableBody?.addEventListener('mousedown', this._onRowResize);
  }

  unbindResizeHandles() {
    if (this._onColResize) {
      this.tableHead?.removeEventListener('mousedown', this._onColResize);
      this._onColResize = null;
    }
    if (this._onRowResize) {
      this.tableBody?.removeEventListener('mousedown', this._onRowResize);
      this._onRowResize = null;
    }
  }

  // ========== 行拖拽与操作面板 ==========

  /**
   * 绑定行拖拽排序（编辑模式下）
   * 只在拖拽把手上按下时才设置行 draggable，
   * 避免在 contenteditable 单元格上误触发拖拽
   */
  _bindRowDrag() {
    if (!this.tableBody) return;
    const rows = this.tableBody.querySelectorAll('tr.wtl-table-row');
    rows.forEach(row => {
      const handle = row.querySelector('.wtl-row-drag-handle');
      if (!handle) return;
      handle.addEventListener('mousedown', () => {
        row.setAttribute('draggable', 'true');
      });
      row.addEventListener('dragend', () => {
        row.removeAttribute('draggable');
      });
      row.addEventListener('mouseup', () => {
        setTimeout(() => {
          if (!row.classList.contains('wtl-dragging')) {
            row.removeAttribute('draggable');
          }
        }, 100);
      });
    });
  }

  /**
   * 绑定行操作面板（编辑模式下）
   * 点击小三角展开/收起操作面板
   */
  _bindRowActions() {
    if (!this.tableBody) return;
    const toggles = this.tableBody.querySelectorAll('.wtl-row-action-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const rowIdx = toggle.dataset.rowIdx;
        const sectionNum = toggle.dataset.section;
        const row = toggle.closest('tr.wtl-table-row');
        if (!row) return;

        // 获取当前行的操作面板（在行头 td 内）
        const indexTd = row.querySelector('.wtl-row-index');
        if (!indexTd) return;
        const panel = indexTd.querySelector('.wtl-row-action-panel');
        if (!panel) return;

        // 检查当前行的面板是否已展开
        if (panel.classList.contains('is-open')) {
          // 收起当前行的面板（先触发过渡动画，再清除内容）
          panel.classList.remove('is-open');
          toggle.classList.remove('is-open');
          toggle.className = 'fa-solid fa-caret-right wtl-row-action-toggle';
          row.classList.remove('is-panel-open');
          // 延迟清除内容，让淡出动画完成
          setTimeout(() => {
            if (!panel.classList.contains('is-open')) {
              panel.innerHTML = '';
            }
          }, 280);
          return;
        }

        // 收起其他行已展开的面板
        const openRows = this.tableBody.querySelectorAll('tr.wtl-table-row.is-panel-open');
        openRows.forEach(openRow => {
          openRow.classList.remove('is-panel-open');
          const openPanel = openRow.querySelector('.wtl-row-action-panel.is-open');
          if (openPanel) {
            openPanel.classList.remove('is-open');
            // 延迟清除内容，让淡出动画完成
            const panelToClear = openPanel;
            setTimeout(() => {
              if (!panelToClear.classList.contains('is-open')) {
                panelToClear.innerHTML = '';
              }
            }, 280);
          }
          const openToggle = openRow.querySelector('.wtl-row-action-toggle.is-open');
          if (openToggle) {
            openToggle.classList.remove('is-open');
            openToggle.className = 'fa-solid fa-caret-right wtl-row-action-toggle';
          }
        });

        // 展开当前行的面板
        toggle.classList.add('is-open');
        toggle.className = 'fa-solid fa-caret-down wtl-row-action-toggle';
        panel.classList.add('is-open');
        row.classList.add('is-panel-open');
        const isHidden = row.classList.contains('wtl-row-hidden');
        const hideIcon = isHidden ? 'fa-eye' : 'fa-ghost';
        const hideTitle = isHidden ? '显示该行' : '隐藏该行';
        panel.innerHTML = `
          <button class="wtl-row-action-btn" data-action="move-up" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="上移该行"><i class="fa-solid fa-arrow-up"></i></button>
          <button class="wtl-row-action-btn" data-action="move-down" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="下移该行"><i class="fa-solid fa-arrow-down"></i></button>
          <button class="wtl-row-action-btn" data-action="hide-row" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="${hideTitle}"><i class="fa-solid ${hideIcon}"></i></button>
          <button class="wtl-row-action-btn wtl-row-action-btn-danger" data-action="delete-row" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="删除该行"><i class="fa-solid fa-trash"></i></button>
        `;
      });
    });
  }

  /** 解绑行拖拽事件 */
  _unbindRowDrag() {
    if (!this.tableBody) return;
    const rows = this.tableBody.querySelectorAll('tr.wtl-table-row');
    rows.forEach(row => {
      row.removeAttribute('draggable');
      // 移除通过 _bindRowDrag 添加的监听器比较困难，
      // 但切换编辑模式时会重建行头内容，旧元素已被移除
    });
  }

  /** 解绑行操作面板事件 */
  _unbindRowActions() {
    if (!this.tableBody) return;
    // 切换编辑模式时会重建行头内容，旧的小三角元素已被移除
  }

  // ========== 编排 ==========
  renderOrchestratorBlocks(blocks) {
    const list = this.getElement('wtl-prompt-blocks');
    if (!list) return;
    list.innerHTML = blocks.map(b => `
      <div class="wtl-orchestrator-item${b.muted ? ' muted' : ''}" data-block="${b.id}" draggable="true">
        <div class="wtl-orchestrator-handle"><i class="fa-solid fa-grip-vertical"></i></div>
        <div class="wtl-orchestrator-content"><span class="wtl-orchestrator-name">${this.escapeHtml(b.name)}</span></div>
        <div class="wtl-orchestrator-actions">
          <button class="menu_button" data-action="preview" title="预览"><i class="fa-solid fa-eye"></i></button>
          <button class="menu_button" data-action="config" title="配置"><i class="fa-solid fa-gear"></i></button>
          <button class="menu_button" data-action="mute" title="静音"><i class="fa-solid fa-volume-xmark"></i></button>
          ${b.custom ? `<button class="menu_button" data-action="delete" title="删除"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>`).join('');
  }

  // ========== 工具 ==========
  escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  show(id) { const el = this.getElement(id); if (el) el.style.display = ''; }
  hide(id) { const el = this.getElement(id); if (el) el.style.display = 'none'; }
  toggle(id, show) { const el = this.getElement(id); if (el) el.style.display = show ? '' : 'none'; }
  getInputValue(id) { return this.getElement(id)?.value ?? ''; }
  setInputValue(id, val) { const el = this.getElement(id); if (el) el.value = val; }
  getCheckboxValue(id) { return this.getElement(id)?.checked ?? false; }
  setCheckboxValue(id, checked) { const el = this.getElement(id); if (el) el.checked = checked; }

  destroy() {
    this.unbindResizeHandles();
    this.clearCache();
    this.root = null;
    this.tableHead = null;
    this.tableBody = null;
    this.tableEl = null;
    this.sectionTabsEl = null;
    this.statusEl = null;
    this.rowCountEl = null;
    this.lastSavedEl = null;
  }
}

export function createViewRenderer(root) {
  return new ViewRenderer(root);
}
