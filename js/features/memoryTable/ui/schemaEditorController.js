/**
 * Schema Editor Controller - 表格模板双区域编辑器
 *
 * 功能：
 * 1. 左栏：图形化表格编辑器（复用 ViewRenderer 的 templateMode）+ JSON 切换
 * 2. 右栏：buildTemplatePrompt 输出的提示词预览
 *
 * 数据流：
 *   schemaEl (隐藏 textarea, markdown) ↔ templateState ↔ 表格渲染 + JSON + 预览
 */

import { ViewRenderer } from './ViewRenderer.js';
import { parseSchemaToTemplate, buildTemplatePrompt, templateToSchemaMarkdown } from '../data/template.js';

export function createSchemaEditorController({
  // 隐藏的 schema textarea（数据真相源）
  schemaEl,
  // 表格渲染元素
  schemaTableEl,
  schemaHeadEl,
  schemaBodyEl,
  schemaSectionTabsEl,
  // JSON 切换
  schemaJsonEl,
  schemaToggleJsonBtn,
  // 预览
  schemaPreviewEl,
  schemaPreviewRefreshBtn,
  // 外部回调
  onSchemaChange
}) {
  if (!schemaEl) {
    console.warn('[SchemaEditor] schemaEl not found, skipping init');
    return null;
  }

  // ---- 状态 ----
  let currentTemplateState = { sections: [] };
  let currentSectionIndex = 0;
  let showingJson = false;

  // ---- ViewRenderer 实例 ----
  const viewRenderer = new ViewRenderer({
    tableEl: schemaTableEl,
    tableHead: schemaHeadEl,
    tableBody: schemaBodyEl,
    sectionTabsEl: schemaSectionTabsEl
  });

  // ---- 核心函数 ----

  /**
   * 从 schemaEl (markdown) 同步到 templateState 并刷新所有 UI
   */
  function refreshFromSchema() {
    const schemaText = schemaEl.value || '';
    currentTemplateState = parseSchemaToTemplate(schemaText);
    if (!currentTemplateState || !Array.isArray(currentTemplateState.sections)) {
      currentTemplateState = { sections: [] };
    }
    renderAll();
  }

  /**
   * 从 templateState 同步回 schemaEl (markdown)
   */
  function syncToSchema() {
    const markdown = templateToSchemaMarkdown(currentTemplateState);
    schemaEl.value = markdown;
    onSchemaChange?.();
  }

  /**
   * 渲染所有 UI 组件
   */
  function renderAll() {
    const sections = currentTemplateState.sections || [];
    if (sections.length === 0) {
      // 空状态
      if (schemaHeadEl) schemaHeadEl.innerHTML = '';
      if (schemaBodyEl) schemaBodyEl.innerHTML = '';
      if (schemaPreviewEl) schemaPreviewEl.value = '';
      if (schemaSectionTabsEl) schemaSectionTabsEl.innerHTML = '';
      return;
    }

    // 确保 currentSectionIndex 有效
    if (currentSectionIndex >= sections.length) {
      currentSectionIndex = 0;
    }

    // 渲染章节标签
    renderSectionTabs();

    // 渲染表格
    renderTable();

    // 渲染预览
    renderPreview();

    // 如果 JSON 模式开启，同步 JSON
    if (showingJson) {
      renderJson();
    }
  }

  /**
   * 渲染章节标签栏
   */
  function renderSectionTabs() {
    if (!schemaSectionTabsEl) return;
    const sections = currentTemplateState.sections || [];
    schemaSectionTabsEl.innerHTML = sections.map((sec, idx) => {
      const name = sec?.name || `章节 ${idx + 1}`;
      return `<span class="wtl-section-tab${idx === currentSectionIndex ? ' is-active' : ''}" data-section-idx="${idx}">${name}</span>`;
    }).join('');

    // 绑定点击事件
    schemaSectionTabsEl.querySelectorAll('.wtl-section-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.sectionIdx, 10);
        if (!isNaN(idx) && idx !== currentSectionIndex) {
          currentSectionIndex = idx;
          renderAll();
        }
      });
    });
  }

  /**
   * 渲染表格视图（templateMode）
   */
  function renderTable() {
    const sections = currentTemplateState.sections || [];
    if (sections.length === 0) return;

    const section = sections[currentSectionIndex];
    if (!section) return;

    // 构建 tableData 格式
    const tableData = {
      sections: sections.map(sec => ({
        name: sec.name || '',
        columns: (sec.columns || []).map(col => col.name || ''),
        rows: [] // 模板模式不显示数据行
      }))
    };

    viewRenderer.renderTable(tableData, {
      sectionIndex: currentSectionIndex,
      templateMode: true,
      editMode: false
    });
  }

  /**
   * 渲染提示词预览
   */
  function renderPreview() {
    if (!schemaPreviewEl) return;
    schemaPreviewEl.value = buildTemplatePrompt(currentTemplateState);
  }

  /**
   * 渲染 JSON 编辑器内容
   */
  function renderJson() {
    if (!schemaJsonEl) return;
    schemaJsonEl.value = JSON.stringify(currentTemplateState, null, 2);
  }

  /**
   * 从 JSON 解析回 templateState
   */
  function parseJsonToTemplate(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ---- 事件绑定 ----

  // JSON 切换按钮
  schemaToggleJsonBtn?.addEventListener('click', () => {
    showingJson = !showingJson;
    if (showingJson) {
      // 切换到 JSON 模式
      schemaToggleJsonBtn.textContent = '切换表格';
      if (schemaJsonEl) {
        schemaJsonEl.style.display = 'block';
        renderJson();
      }
      // 隐藏表格区域
      const tablePanel = schemaTableEl?.closest('.wtl-schema-table-panel');
      if (tablePanel) tablePanel.style.display = 'none';
      if (schemaSectionTabsEl) schemaSectionTabsEl.style.display = 'none';
    } else {
      // 切换回表格模式
      schemaToggleJsonBtn.textContent = '切换 JSON';
      if (schemaJsonEl) schemaJsonEl.style.display = 'none';
      const tablePanel = schemaTableEl?.closest('.wtl-schema-table-panel');
      if (tablePanel) tablePanel.style.display = '';
      if (schemaSectionTabsEl) schemaSectionTabsEl.style.display = '';
      // 从 JSON 解析回 templateState
      if (schemaJsonEl) {
        const parsed = parseJsonToTemplate(schemaJsonEl.value);
        if (parsed) {
          currentTemplateState = parsed;
          syncToSchema();
          renderAll();
        }
      }
    }
  });

  // JSON 编辑器内容变化时自动同步
  schemaJsonEl?.addEventListener('input', () => {
    if (!showingJson) return;
    const parsed = parseJsonToTemplate(schemaJsonEl.value);
    if (parsed) {
      currentTemplateState = parsed;
      syncToSchema();
      // 只更新预览，不更新表格（因为表格隐藏）
      renderPreview();
    }
  });

  // 预览刷新按钮
  schemaPreviewRefreshBtn?.addEventListener('click', () => {
    renderPreview();
  });

  // ---- 公开 API ----

  return {
    /**
     * 从 schemaEl 刷新整个编辑器
     */
    refresh() {
      refreshFromSchema();
    },

    /**
     * 获取当前 templateState
     */
    getTemplateState() {
      return currentTemplateState;
    },

    /**
     * 设置新的 templateState 并刷新
     */
    setTemplateState(newState) {
      currentTemplateState = newState;
      syncToSchema();
      renderAll();
    },

    /**
     * 获取 ViewRenderer 实例（供外部使用）
     */
    getViewRenderer() {
      return viewRenderer;
    },

    /**
     * 销毁清理
     */
    destroy() {
      // 目前无需要清理的事件监听
    }
  };
}