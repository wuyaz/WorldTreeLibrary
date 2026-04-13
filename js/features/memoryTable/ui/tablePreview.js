import { parseSections, parseMarkdownTableToJson, renderJsonToMarkdown } from '../data/markdown.js';

export function clearHiddenForSection(hiddenRows, sectionIndex) {
  const sk = String(sectionIndex);
  if (hiddenRows?.[sk]) hiddenRows[sk] = {};
}

export function updateTableRows({ tableMd, sectionIndex, hiddenRows, updater }) {
  const data = parseMarkdownTableToJson(tableMd || '');
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const section = sections[sectionIndex - 1];
  if (!section) {
    return {
      nextMarkdown: tableMd || '',
      hiddenRows
    };
  }

  section.columns = Array.isArray(section.columns) ? section.columns : [];
  section.rows = Array.isArray(section.rows) ? section.rows : [];
  const rows = section.rows;
  if (!section.columns.length) {
    const fallbackCols = rows[0]?.length ? rows[0].map((_, i) => `列${i + 1}`) : ['列1'];
    section.columns = fallbackCols;
  }

  updater(section, rows, section.columns);
  clearHiddenForSection(hiddenRows, sectionIndex);

  return {
    nextMarkdown: renderJsonToMarkdown(data),
    hiddenRows
  };
}

export function moveTableRow({ tableMd, sectionIndex, from, to, hiddenRows }) {
  return updateTableRows({
    tableMd,
    sectionIndex,
    hiddenRows,
    updater: (section, rows) => {
      if (from < 1 || to < 1 || from > rows.length || to > rows.length) return;
      const [row] = rows.splice(from - 1, 1);
      rows.splice(to - 1, 0, row);
    }
  });
}

export function applyPreviewEditsToMarkdown({ tableMd, tableEl, activeSection }) {
  if (!tableEl) return tableMd || '';
  const headRow = tableEl.querySelector('thead tr');
  const bodyRows = Array.from(tableEl.querySelectorAll('tbody tr'));
  const headers = headRow
    ? Array.from(headRow.querySelectorAll('th'))
      .filter((th) => th.dataset.rowIndex !== 'true')
      .map((th) => th.querySelector('span')?.textContent?.trim() || th.textContent?.trim() || '')
    : [];

  const sections = parseSections(tableMd || '');
  const current = sections.find((s) => s.name === activeSection) || sections[0];
  if (!current) return tableMd || '';

  current.header = headers;
  current.rows = bodyRows.map((row) => Array.from(row.querySelectorAll('td'))
    .filter((td) => td.dataset.rowIndex !== 'true')
    .map((td) => (td.textContent || '').trim()));

  const data = {
    title: parseMarkdownTableToJson(tableMd || '').title,
    sections: sections.map((s) => ({ name: s.name, columns: s.header, rows: s.rows }))
  };
  return renderJsonToMarkdown(data);
}

export function reorderColumnsInMarkdown(md, sectionName, newOrder) {
  if (!sectionName) return md;
  const lines = String(md || '').split('\n');
  let inSection = false;
  let headerIdx = -1;
  let sepIdx = -1;
  const rowIdxs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = /^##\s+(.+)$/.exec(line.trim());
    if (headerMatch) {
      inSection = headerMatch[1].trim() === sectionName;
      continue;
    }
    if (!inSection) continue;
    if (line.trim().startsWith('|')) {
      if (headerIdx === -1) headerIdx = i;
      else if (sepIdx === -1) sepIdx = i;
      else rowIdxs.push(i);
    }
  }
  if (headerIdx === -1 || sepIdx === -1) return md;
  const headerCells = lines[headerIdx].split('|').slice(1, -1).map((c) => c.trim());
  const indexMap = newOrder.map((name) => headerCells.indexOf(name)).filter((i) => i >= 0);
  if (indexMap.length !== headerCells.length) return md;
  const rebuildRow = (line) => {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const reordered = indexMap.map((idx) => cells[idx] ?? '');
    return `| ${reordered.join(' | ')} |`;
  };
  lines[headerIdx] = rebuildRow(lines[headerIdx]);
  lines[sepIdx] = rebuildRow(lines[sepIdx]);
  rowIdxs.forEach((idx) => {
    lines[idx] = rebuildRow(lines[idx]);
  });
  return lines.join('\n');
}

export function reorderSectionsInMarkdown(md, newOrder) {
  if (!newOrder.length) return md;
  const sections = [];
  const lines = String(md || '').split('\n');
  let current = null;
  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      if (current) sections.push(current);
      current = { name: match[1].trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  if (!sections.length) return md;
  const map = new Map(sections.map((s) => [s.name, s.lines]));
  const ordered = [];
  newOrder.forEach((name) => {
    const block = map.get(name);
    if (block) ordered.push(block.join('\n'));
    map.delete(name);
  });
  for (const rest of map.values()) ordered.push(rest.join('\n'));
  return ordered.join('\n\n');
}
