// @ts-nocheck

export const wrapTable = (md) => {
  const content = (md || '').trim();
  if (!content) return '<WTL_Table>\n</WTL_Table>';
  if (content.includes('<WTL_Table>') && content.includes('</WTL_Table>')) return content;
  return `<WTL_Table>\n${content}\n</WTL_Table>`;
};

export const stripTableWrapper = (md) => {
  return (md || '').replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
};

export const ensureTableWrapper = (md) => wrapTable(md);

export const parseSections = (md) => {
  const raw = stripTableWrapper(md || '');
  const lines = raw.split('\n');
  const sections = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      if (current) sections.push(current);
      current = { name: match[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections.map((s) => {
    const rows = s.lines.filter(l => l.trim().startsWith('|'));
    if (!rows.length) return { name: s.name, header: [], rows: [] };
    const header = rows[0].split('|').slice(1, -1).map(c => c.trim());
    const bodyRows = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
    return { name: s.name, header, rows: bodyRows };
  });
};

export const parseMarkdownTableToJson = (md) => {
  const raw = (md || '').replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
  const lines = raw.split('\n');
  let title = '记忆表格';
  for (const line of lines) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (match) { title = match[1].trim(); break; }
  }
  const sections = [];
  let current = null;
  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      if (current) sections.push(current);
      current = { name: match[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  const normalized = sections.map((s) => {
    const rows = s.lines.filter(l => l.trim().startsWith('|'));
    if (!rows.length) return { name: s.name, columns: [], rows: [] };
    const header = rows[0].split('|').slice(1, -1).map(c => c.trim());
    const bodyRows = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
    return { name: s.name, columns: header, rows: bodyRows };
  });
  return { title, sections: normalized };
};

export const renderJsonToMarkdown = (data) => {
  const title = (data?.title || '记忆表格').toString().trim() || '记忆表格';
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const blocks = sections.map((sec) => {
    const name = (sec?.name || '未命名').toString().trim() || '未命名';
    const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c ?? '').toString().trim() || '-') : [];
    const safeCols = cols.length ? cols : ['-'];
    const rows = Array.isArray(sec?.rows) ? sec.rows : [];
    const headerRow = `| ${safeCols.join(' | ')} |`;
    const sepRow = `| ${safeCols.map(() => '---').join(' | ')} |`;
    const body = rows.map((r) => {
      const line = safeCols.map((_, idx) => (r?.[idx] ?? '')).join(' | ');
      return `| ${line} |`;
    }).join('\n');
    return body ? `## ${name}\n${headerRow}\n${sepRow}\n${body}` : `## ${name}\n${headerRow}\n${sepRow}`;
  }).filter(Boolean).join('\n\n');
  const content = `# ${title}\n\n${blocks}`.trim();
  return wrapTable(content);
};

export const buildEmptyTableFromTemplate = (tpl) => {
  const title = (tpl?.title || '记忆表格').toString().trim() || '记忆表格';
  const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
  const normalized = sections.map((sec) => {
    const name = (sec?.name || '未命名').toString().trim() || '未命名';
    const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c?.name ?? '').toString().trim() || '-') : [];
    const safeCols = cols.length ? cols : ['-'];
    return { name, columns: safeCols, rows: [] };
  });
  return { title, sections: normalized };
};
