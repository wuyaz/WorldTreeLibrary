// @ts-nocheck

import { wrapTable } from './markdown.js';

export const randBase36 = (len) => {
  let out = '';
  while (out.length < len) out += Math.random().toString(36).slice(2);
  return out.slice(0, len);
};

export const randLetters = (len) => {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < len; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
};

export const createSectionIdWithPrefix = (prefix, used) => {
  let id = '';
  let tries = 0;
  do {
    id = `${prefix}${randBase36(2)}`;
    tries++;
  } while (used.has(id) && tries < 200);
  used.add(id);
  return id;
};

export const createColumnIdForSection = (sectionId, used) => {
  let id = '';
  let tries = 0;
  do {
    id = `${sectionId}_${randBase36(4)}`;
    tries++;
  } while (used.has(id) && tries < 500);
  used.add(id);
  return id;
};

export const ensureTemplatePrefix = (tpl) => {
  if (!tpl.templatePrefix) tpl.templatePrefix = randLetters(2);
  return tpl.templatePrefix;
};

export const createSectionIdInTemplate = (tpl) => {
  const used = new Set((tpl?.sections || []).map(s => s.id).filter(Boolean));
  const prefix = ensureTemplatePrefix(tpl);
  return createSectionIdWithPrefix(prefix, used);
};

export const createColumnIdInTemplate = (tpl, sectionId) => {
  const sec = (tpl?.sections || []).find(s => s.id === sectionId);
  const used = new Set((sec?.columns || []).map(c => c.id).filter(Boolean));
  return createColumnIdForSection(sectionId, used);
};

export const parseSchemaToTemplate = (schemaMd) => {
  let payload = null;
  const jsonMatch = /<WTL_Template\s+type="json">([\s\S]*?)<\/WTL_Template>/i.exec(schemaMd || '');
  if (jsonMatch) {
    try { payload = JSON.parse(jsonMatch[1]); } catch (e) { payload = null; }
  }
  if (payload && payload.sections) {
    const prefix = payload.templatePrefix || randLetters(2);
    const sectionIds = new Set();
    const normalized = {
      title: (payload.title || '记忆表格').toString(),
      templatePrefix: prefix,
      sections: (payload.sections || []).map((sec) => {
        let secId = sec.id;
        if (!secId || sectionIds.has(secId)) {
          secId = createSectionIdWithPrefix(prefix, sectionIds);
        } else {
          sectionIds.add(secId);
        }
        const columnIds = new Set();
        return {
          id: secId,
          name: sec.name || '未命名',
          definition: sec.definition || '',
          deleteRule: sec.deleteRule || '',
          insertRule: sec.insertRule || '',
          updateRule: sec.updateRule || '',
          fillable: sec.fillable !== false,
          sendable: sec.sendable !== false,
          columns: (sec.columns || []).map((col) => {
            let colId = col.id;
            if (!colId || columnIds.has(colId)) {
              colId = createColumnIdForSection(secId, columnIds);
            } else {
              columnIds.add(colId);
            }
            return {
              id: colId,
              name: col.name || '列',
              definition: col.definition || '',
              deleteRule: col.deleteRule || '',
              insertRule: col.insertRule || '',
              updateRule: col.updateRule || ''
            };
          })
        };
      })
    };
    if (!normalized.sections.length) {
      const secId = createSectionIdWithPrefix(prefix, sectionIds);
      const colIds = new Set();
      normalized.sections.push({
        id: secId,
        name: '未命名',
        definition: '',
        deleteRule: '',
        insertRule: '',
        updateRule: '',
        fillable: true,
        sendable: true,
        columns: [{ id: createColumnIdForSection(secId, colIds), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }]
      });
    }
    return normalized;
  }

  const raw = (schemaMd || '').replace(/<WTL_Table>/g, '').replace(/<\/WTL_Table>/g, '').trim();
  const lines = raw.split('\n');
  let title = '记忆表格';
  const templatePrefix = randLetters(2);
  for (const line of lines) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (match) { title = match[1].trim(); break; }
  }
  const sections = [];
  const sectionIds = new Set();
  let current = null;
  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      if (current) sections.push(current);
      const secId = createSectionIdWithPrefix(templatePrefix, sectionIds);
      current = { id: secId, name: match[1].trim(), definition: '', deleteRule: '', insertRule: '', updateRule: '', fillable: true, sendable: true, columns: [] };
      continue;
    }
    if (!current) continue;
    if (line.trim().startsWith('|')) {
      const cols = line.split('|').slice(1, -1).map(c => c.trim()).filter(Boolean);
      if (cols.length && current.columns.length === 0) {
        const colIds = new Set();
        current.columns = cols.map((c) => ({ id: createColumnIdForSection(current.id, colIds), name: c, definition: '', deleteRule: '', insertRule: '', updateRule: '' }));
      }
    }
  }
  if (current) sections.push(current);
  if (!sections.length) {
    const secId = createSectionIdWithPrefix(templatePrefix, sectionIds);
    const colIds = new Set();
    sections.push({
      id: secId,
      name: '未命名',
      definition: '',
      deleteRule: '',
      insertRule: '',
      updateRule: '',
      fillable: true,
      sendable: true,
      columns: [{ id: createColumnIdForSection(secId, colIds), name: '列1', definition: '', deleteRule: '', insertRule: '', updateRule: '' }]
    });
  }
  return { title, templatePrefix, sections };
};

export const templateToSchemaMarkdown = (tpl) => {
  const title = (tpl?.title || '记忆表格').toString().trim() || '记忆表格';
  const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
  const blocks = sections.map((sec) => {
    const name = (sec?.name || '未命名').toString().trim() || '未命名';
    const cols = Array.isArray(sec?.columns) ? sec.columns.map(c => (c?.name ?? '').toString().trim() || '-') : [];
    const safeCols = cols.length ? cols : ['-'];
    const headerRow = `| ${safeCols.join(' | ')} |`;
    const sepRow = `| ${safeCols.map(() => '---').join(' | ')} |`;
    return `## ${name}\n${headerRow}\n${sepRow}`;
  }).filter(Boolean).join('\n\n');
  const content = `# ${title}\n\n${blocks}`.trim();
  const jsonMeta = `<WTL_Template type="json">${JSON.stringify(tpl || {}, null, 2)}</WTL_Template>`;
  return `${wrapTable(content)}\n\n${jsonMeta}`;
};

export const buildTemplatePrompt = (tpl, fallback = '') => {
  const sections = Array.isArray(tpl?.sections) ? tpl.sections : [];
  if (!sections.length) return fallback || '';

  const normalizeLines = (text) => (text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const formatList = (text, indent = '') => {
    const lines = normalizeLines(text);
    if (!lines.length) return '';
    return lines.map(line => (line.startsWith('-') ? `${indent}${line}` : `${indent}- ${line}`)).join('\n');
  };
  const formatRuleBlock = (label, text) => {
    const list = formatList(text);
    if (!list) return '';
    return `【${label}】：\n${list}`;
  };
  const formatColumnRule = (label, text) => {
    const lines = normalizeLines(text);
    if (!lines.length) return [];
    const first = `    - ${label}：${lines[0]}`;
    const rest = lines.slice(1).map(line => `      ${line}`);
    return [first, ...rest];
  };

  return sections.map((sec, idx) => {
    const name = (sec?.name || '').trim() || '未命名';
    const definition = (sec?.definition || '').trim();
    const header = `# ${idx + 1}_${name}${definition ? `：${definition}` : ''}`;
    const parts = [header];

    const insertBlock = formatRuleBlock('增加条件', sec?.insertRule);
    if (insertBlock) parts.push(insertBlock);
    const updateBlock = formatRuleBlock('修改条件', sec?.updateRule);
    if (updateBlock) parts.push(updateBlock);
    const deleteBlock = formatRuleBlock('删除条件', sec?.deleteRule);
    if (deleteBlock) parts.push(deleteBlock);

    const columns = Array.isArray(sec?.columns) ? sec.columns : [];
    if (columns.length) {
      const fieldLines = ['【字段详解】'];
      columns.forEach((col, colIdx) => {
        const colName = (col?.name || '').trim() || '未命名';
        const colDef = (col?.definition || '').trim();
        fieldLines.push(`[${colIdx + 1}_${colName}]${colDef ? `：${colDef}` : ''}`);

        const colInsert = formatColumnRule('增加条件', col?.insertRule);
        const colUpdate = formatColumnRule('编辑条件', col?.updateRule);
        const colDelete = formatColumnRule('删除条件', col?.deleteRule);
        [...colInsert, ...colUpdate, ...colDelete].forEach(line => fieldLines.push(line));
      });
      parts.push(fieldLines.join('\n'));
    }

    const body = parts.join('\n');
    return `<${name}_模板>\n${body}\n<${name}_模板>`;
  }).join('\n\n');
};
