// 提示词拼装

import { wrapTable, stripTableWrapper } from '../table/markdown.js';
import { buildTemplatePrompt } from '../table/template.js';

const filterHiddenRowsFromMarkdown = (md, templateState, hiddenRows, { fillableOnly = false, sendableOnly = false } = {}) => {
  const raw = stripTableWrapper(md || '');
  const lines = raw.split('\n');
  let sectionIndex = 0;
  let inSection = false;
  let skipSection = false;
  let headerLine = null;
  let sepLine = null;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = /^##\s+(.+)$/.exec(line.trim());
    if (headerMatch) {
      sectionIndex += 1;
      inSection = true;
      skipSection = false;
      headerLine = null;
      sepLine = null;
      const meta = templateState?.sections?.[sectionIndex - 1];
      if (fillableOnly && meta && meta.fillable === false) {
        skipSection = true;
        inSection = false;
        continue;
      }
      if (sendableOnly && meta && meta.sendable === false) {
        skipSection = true;
        inSection = false;
        continue;
      }
      out.push(line);
      continue;
    }
    if (skipSection) continue;
    if (!inSection) {
      out.push(line);
      continue;
    }
    if (line.trim().startsWith('|')) {
      if (!headerLine) {
        headerLine = line;
        out.push(line);
        continue;
      }
      if (!sepLine) {
        sepLine = line;
        out.push(line);
        continue;
      }
      const rowIndex = Math.max(1, out.filter(l => l.trim().startsWith('|')).length - 2);
      const hidden = Boolean(hiddenRows?.[String(sectionIndex)]?.[String(rowIndex)]);
      if (!hidden) out.push(line);
      continue;
    }
    out.push(line);
  }
  return wrapTable(out.join('\n').trim());
};

export const buildPrompt = (options = {}) => {
  const {
    blockEls = [],
    refTextBlocks = [],
    prePromptText = '',
    instructionText = '',
    schemaText = '',
    tableText = '',
    templateState = null,
    hiddenRows = {}
  } = options;

  const refMap = new Map(refTextBlocks.map(b => [b.id, b]));
  const outputs = [];

  blockEls.forEach((el) => {
    if (el.dataset.hidden === 'true') return;
    const type = el.dataset.type || '';
    const id = el.dataset.id || '';
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const usePrefix = (el.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
    const useSuffix = (el.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
    let content = '';
    if (type === 'preprompt') content = prePromptText || '';
    if (type === 'instruction') content = instructionText || '';
    if (type === 'schema') content = buildTemplatePrompt(templateState) || schemaText || '';
    if (type === 'table') content = filterHiddenRowsFromMarkdown(tableText || '', templateState, hiddenRows, { fillableOnly: true, sendableOnly: true });
    if (type === 'custom') content = el.dataset.content || '';
    if (['reference','chat','persona','character','worldBook'].includes(type)) {
      content = refMap.get(id)?.text || '';
    }
    const wrapped = `${usePrefix ? prefix : ''}${content}${useSuffix ? suffix : ''}`;
    if ((wrapped || '').trim()) outputs.push(wrapped);
  });

  return outputs.join('\n\n');
};
