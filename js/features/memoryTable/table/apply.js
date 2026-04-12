// @ts-nocheck

import { parseMarkdownTableToJson, renderJsonToMarkdown } from './markdown.js';

export const applyCommands = (md, cmds, templateState, hiddenRows) => {
  const data = parseMarkdownTableToJson(md);
  data.sections = Array.isArray(data.sections) ? data.sections : [];
  const fillableSections = Array.isArray(templateState?.sections) ? templateState.sections : [];

  const ensureRow = (section, rowIndex) => {
    section.columns = Array.isArray(section.columns) ? section.columns : [];
    section.rows = Array.isArray(section.rows) ? section.rows : [];
    const cols = section.columns;
    const rows = section.rows;
    while (rows.length < rowIndex) rows.push(cols.map(() => ''));
    if (!Array.isArray(rows[rowIndex - 1])) rows[rowIndex - 1] = cols.map(() => '');
    return rows[rowIndex - 1];
  };

  const sectionKey = (sectionIndex) => String(sectionIndex);
  const nextHiddenRows = hiddenRows && typeof hiddenRows === 'object' ? hiddenRows : {};

  const setHidden = (sectionIndex, rowIndex, hidden) => {
    const sk = sectionKey(sectionIndex);
    if (!nextHiddenRows[sk] || typeof nextHiddenRows[sk] !== 'object') nextHiddenRows[sk] = {};
    nextHiddenRows[sk][String(rowIndex)] = Boolean(hidden);
  };

  const isHidden = (sectionIndex, rowIndex) => {
    const sk = sectionKey(sectionIndex);
    return Boolean(nextHiddenRows?.[sk]?.[String(rowIndex)]);
  };

  for (const cmd of cmds) {
    const sectionIndex = Number(cmd.section);
    if (!Number.isFinite(sectionIndex) || sectionIndex < 1) continue;
    const meta = fillableSections[sectionIndex - 1];
    if (meta && meta.fillable === false) continue;
    const section = data.sections[sectionIndex - 1];
    if (!section) continue;
    section.columns = Array.isArray(section.columns) ? section.columns : [];
    section.rows = Array.isArray(section.rows) ? section.rows : [];
    const rows = section.rows;

    if (cmd.type === 'update') {
      const rowIndex = Number(cmd.row);
      if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
      const row = ensureRow(section, rowIndex);
      (cmd.cells || []).forEach(({ col, value }) => {
        const colIndex = Number(col);
        if (!Number.isFinite(colIndex) || colIndex < 1) return;
        row[colIndex - 1] = (value ?? '').toString();
      });
    }

    if (cmd.type === 'delete') {
      const rowIndex = Number(cmd.row);
      if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
      if (rows[rowIndex - 1]) rows.splice(rowIndex - 1, 1);
      const sk = sectionKey(sectionIndex);
      if (nextHiddenRows[sk]) nextHiddenRows[sk] = {};
    }

    if (cmd.type === 'insert') {
      const rowIndex = Number(cmd.row);
      if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;

      section.columns = Array.isArray(section.columns) ? section.columns : [];
      const normalizedCols = section.columns;

      const ensureColumns = (n) => {
        if (normalizedCols.length) return;
        const count = Math.max(1, Number(n) || 1);
        section.columns = Array.from({ length: count }, (_, i) => `列${i + 1}`);
      };

      let filled = [];

      if (Array.isArray(cmd.cells) && cmd.cells.length) {
        const maxCol = cmd.cells.reduce((m, c) => Math.max(m, Number(c?.col) || 0), 0);
        ensureColumns(maxCol);
        const colsNow = section.columns;
        filled = colsNow.map(() => '-');
        cmd.cells.forEach(({ col, value }) => {
          const colIndex = Number(col);
          if (!Number.isFinite(colIndex) || colIndex < 1) return;
          if (colIndex > filled.length) {
            while (section.columns.length < colIndex) section.columns.push(`列${section.columns.length + 1}`);
            while (filled.length < colIndex) filled.push('-');
          }
          filled[colIndex - 1] = (value ?? '').toString();
        });
      } else {
        const values = Array.isArray(cmd.values) ? cmd.values.map(v => (v ?? '').toString().trim()) : [];
        ensureColumns(values.length);
        filled = section.columns.map((_, i) => values[i] ?? '');
      }

      if (rowIndex >= 1 && rowIndex <= rows.length + 1) rows.splice(rowIndex - 1, 0, filled);
      else rows.push(filled);

      const sk = sectionKey(sectionIndex);
      if (nextHiddenRows[sk]) nextHiddenRows[sk] = {};
    }

    if (cmd.type === 'hide') {
      const rowIndex = Number(cmd.row);
      if (!Number.isFinite(rowIndex) || rowIndex < 1) continue;
      setHidden(sectionIndex, rowIndex, Boolean(cmd.hidden));
    }

    if (cmd.type === 'move') {
      const from = Number(cmd.from);
      const to = Number(cmd.to);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) continue;
      if (!rows[from - 1] || !rows[to - 1]) continue;
      const tmp = rows[from - 1];
      rows[from - 1] = rows[to - 1];
      rows[to - 1] = tmp;
      const fromHidden = isHidden(sectionIndex, from);
      const toHidden = isHidden(sectionIndex, to);
      setHidden(sectionIndex, from, toHidden);
      setHidden(sectionIndex, to, fromHidden);
    }
  }

  return { markdown: renderJsonToMarkdown(data), hiddenRows: nextHiddenRows };
};
