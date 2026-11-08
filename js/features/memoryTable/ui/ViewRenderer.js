
import { escapeHtml } from '../../../shared/ui/escape.js';// @ts-nocheck
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
      return `<button class="wtl-section-tab wtl-chat-manager-pill${isActive ? ' is-active' : ''}" data-section-idx="${idx}" ${templateMode ? 'draggable="true"' : ''}>${drag}${escapeHtml(name)}${editIcon}</button>`;
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
      this._bindSwipeDelete();
    } else {
      this._unbindRowDrag();
      this._unbindSwipeDelete();
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
      return `<th data-col-idx="${idx}" ${templateMode ? 'draggable="true"' : ''}>${drag}${escapeHtml(name)}${edit}${resizeHandle}</th>`;
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
      // 编辑模式行头：左边把手 + 中间数字
      const indexContent = editMode
        ? `<i class="fa-solid fa-grip-vertical wtl-row-drag-handle" aria-hidden="true"></i><span class="wtl-row-index-num">${rowNum}</span>`
        : `<span>${rowNum}</span>`;
      const indexTd = `<td class="wtl-row-index${editMode ? ' wtl-row-index-edit' : ''}" data-row-idx="${rowIdx}" data-row="${rowNum}" data-section="${sectionNum}">${indexContent}${rowResizeHandle}</td>`;
      const cells = columns.map((_, colIdx) => {
        const val = row?.[colIdx] ?? '';
        return `<td${editable} class="wtl-data-cell" data-row-idx="${rowIdx}" data-col-idx="${colIdx}">${escapeHtml(val)}</td>`;
      }).join('');
      // 编辑模式下，每行包裹在 swipe 容器中，右侧隐藏一个删除按钮
      if (editMode) {
        return `<tr class="wtl-table-row wtl-swipe-row${cls}" data-row="${rowNum}" data-row-idx="${rowIdx}" data-section="${sectionNum}">
          <td colspan="${columns.length + 1}" style="padding:0;border:none;position:relative;overflow:hidden;">
            <div class="wtl-swipe-container">
              <div class="wtl-swipe-content">
                <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                  <tr>${indexTd}${cells}</tr>
                </table>
              </div>
              <div class="wtl-swipe-delete" data-row-idx="${rowIdx}" data-section="${sectionNum}" title="删除该行">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>
          </td>
        </tr>`;
      }
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
    // 编辑模式下，行可能是 .wtl-swipe-row（外层的 tr，直接子级）
    // 也可能是普通 .wtl-table-row（非编辑模式）
    const rows = this.tableBody.querySelectorAll(':scope > tr.wtl-table-row');
    rows.forEach(row => {
      // 拖拽把手在嵌套表格内部，需要从整个 row 范围内查找
      const handle = row.querySelector('.wtl-row-drag-handle');
      if (!handle) return;
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
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

  /** 解绑行拖拽事件 */
  _unbindRowDrag() {
    if (!this.tableBody) return;
    const rows = this.tableBody.querySelectorAll(':scope > tr.wtl-table-row');
    rows.forEach(row => {
      row.removeAttribute('draggable');
    });
  }

  /**
   * 绑定行右滑删除手势（编辑模式下）
   * 在行上向右滑动（触摸或鼠标），露出右侧的删除按钮
   */
  _bindSwipeDelete() {
    if (!this.tableBody) return;
    const rows = this.tableBody.querySelectorAll('.wtl-swipe-row');
    rows.forEach(row => {
      const container = row.querySelector('.wtl-swipe-container');
      const content = row.querySelector('.wtl-swipe-content');
      const deleteBtn = row.querySelector('.wtl-swipe-delete');
      if (!container || !content || !deleteBtn) return;

      let startX = 0;
      let currentX = 0;
      let isDragging = false;
      let isOpen = false;
      const swipeThreshold = 60;
      const deleteWidth = 56;

      const onStart = (clientX) => {
        if (row.classList.contains('wtl-dragging')) return;
        startX = clientX;
        currentX = clientX;
        isDragging = true;
        container.classList.add('wtl-swipe-dragging');
      };

      const onMove = (clientX) => {
        if (!isDragging) return;
        currentX = clientX;
        let delta;
        if (isOpen) {
          // 已打开状态：继续左滑关闭，右滑保持打开
          delta = deleteWidth - (startX - clientX);
          delta = Math.max(0, Math.min(delta, deleteWidth + 10));
        } else {
          // 关闭状态：左滑露出删除按钮
          delta = startX - clientX;
          delta = Math.max(0, Math.min(delta, deleteWidth + 10));
        }
        content.style.transform = `translateX(-${delta}px)`;
        deleteBtn.style.transform = `translateX(${delta - deleteWidth}px)`;
      };

      const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('wtl-swipe-dragging');
        let delta;
        if (isOpen) {
          delta = deleteWidth - (startX - currentX);
        } else {
          delta = startX - currentX;
        }
        if (delta > swipeThreshold) {
          isOpen = true;
          content.style.transform = `translateX(-${deleteWidth}px)`;
          deleteBtn.style.transform = 'translateX(0px)';
          container.classList.add('wtl-swipe-open');
        } else {
          isOpen = false;
          content.style.transform = 'translateX(0px)';
          deleteBtn.style.transform = `translateX(${deleteWidth}px)`;
          container.classList.remove('wtl-swipe-open');
        }
      };

      // 鼠标事件
      const onMouseDown = (e) => {
        if (e.target.closest('.wtl-row-drag-handle')) return;
        onStart(e.clientX);
        const onMouseMove = (evt) => onMove(evt.clientX);
        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          onEnd();
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      // 触摸事件
      const onTouchStart = (e) => {
        if (e.target.closest('.wtl-row-drag-handle')) return;
        onStart(e.touches[0].clientX);
      };
      const onTouchMove = (e) => {
        onMove(e.touches[0].clientX);
      };
      const onTouchEnd = () => {
        onEnd();
      };

      content.addEventListener('mousedown', onMouseDown);
      content.addEventListener('touchstart', onTouchStart, { passive: true });
      content.addEventListener('touchmove', onTouchMove, { passive: true });
      content.addEventListener('touchend', onTouchEnd, { passive: true });

      // 删除按钮点击事件 - 触发自定义事件，由 tableController 处理
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rowIdx = deleteBtn.dataset.rowIdx;
        const sectionNum = deleteBtn.dataset.section;
        const event = new CustomEvent('wtl-swipe-delete', {
          bubbles: true,
          detail: { rowIdx: parseInt(rowIdx), sectionNum: parseInt(sectionNum) }
        });
        row.dispatchEvent(event);
      });

      // 点击其他区域关闭滑动
      const closeOnClickOutside = (e) => {
        if (isOpen && !row.contains(e.target)) {
          isOpen = false;
          content.style.transform = 'translateX(0px)';
          deleteBtn.style.transform = `translateX(${deleteWidth}px)`;
          container.classList.remove('wtl-swipe-open');
        }
      };
      document.addEventListener('mousedown', closeOnClickOutside);
      row._wtlSwipeCloseHandler = closeOnClickOutside;
    });
  }

  /** 解绑行右滑删除事件 */
  _unbindSwipeDelete() {
    if (!this.tableBody) return;
    const rows = this.tableBody.querySelectorAll('.wtl-swipe-row');
    rows.forEach(row => {
      if (row._wtlSwipeCloseHandler) {
        document.removeEventListener('mousedown', row._wtlSwipeCloseHandler);
        delete row._wtlSwipeCloseHandler;
      }
    });
  }

  // ========== 编排 ==========
  renderOrchestratorBlocks(blocks) {
    const list = this.getElement('wtl-prompt-blocks');
    if (!list) return;
    list.innerHTML = blocks.map(b => `
      <div class="wtl-orchestrator-item${b.muted ? ' muted' : ''}" data-block="${b.id}" draggable="true">
        <div class="wtl-orchestrator-handle"><i class="fa-solid fa-grip-vertical"></i></div>
        <div class="wtl-orchestrator-content"><span class="wtl-orchestrator-name">${escapeHtml(b.name)}</span></div>
        <div class="wtl-orchestrator-actions">
          <button class="menu_button" data-action="preview" title="预览"><i class="fa-solid fa-eye"></i></button>
          <button class="menu_button" data-action="config" title="配置"><i class="fa-solid fa-gear"></i></button>
          <button class="menu_button" data-action="mute" title="静音"><i class="fa-solid fa-volume-xmark"></i></button>
          ${b.custom ? `<button class="menu_button" data-action="delete" title="删除"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>`).join('');
  }

  // ========== 工具 ==========

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
