// @ts-nocheck

export const extractEditPayload = (text) => {
  if (!text) return '';
  const match = text.match(/<WTL_TableEdit>([\s\S]*?)<\/WTL_TableEdit>/);
  return match ? match[1].trim() : text;
};

export const ensureEditWrapper = (text) => {
  const content = (text || '').trim();
  if (!content) return '<WTL_TableEdit>\n</WTL_TableEdit>';
  if (content.includes('<WTL_TableEdit>') && content.includes('</WTL_TableEdit>')) return content;
  return `<WTL_TableEdit>\n${content}\n</WTL_TableEdit>`;
};

export const parseCommands = (text) => {
  const raw = (text || '')
    .replace(/<WTL_TableEdit>/g, '')
    .replace(/<\/WTL_TableEdit>/g, '')
    .trim();

  const splitTopLevel = (input) => {
    const s = (input || '').trim();
    const out = [];
    let cur = '';
    let depth = 0;
    let quote = null;
    let prev = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (quote) {
        cur += ch;
        if (ch === quote && prev !== '\\') quote = null;
        prev = ch;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        cur += ch;
        prev = ch;
        continue;
      }
      if (ch === '(') {
        depth += 1;
        cur += ch;
        prev = ch;
        continue;
      }
      if (ch === ')' && depth > 0) {
        depth -= 1;
        cur += ch;
        prev = ch;
        continue;
      }
      if (ch === ',' && depth === 0) {
        const part = cur.trim();
        if (part) out.push(part);
        cur = '';
        prev = ch;
        continue;
      }
      cur += ch;
      prev = ch;
    }
    const last = cur.trim();
    if (last) out.push(last);
    return out;
  };

  const unquote = (v) => {
    const t = (v ?? '').toString().trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    return t;
  };

  const parseBool = (v) => {
    const t = (v ?? '').toString().trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(t)) return true;
    if (['false', '0', 'no', 'n'].includes(t)) return false;
    return null;
  };

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const cmds = [];

  for (const line of lines) {
    const m = /^(update|delete|insert|hide|move)\[(.*)\]$/.exec(line);
    if (!m) continue;
    const type = m[1];
    const args = splitTopLevel(m[2]).map(a => a.trim()).filter(Boolean);

    const sIdx = parseInt(args[0], 10);
    const rIdx = parseInt(args[1], 10);
    if (!Number.isFinite(sIdx) || sIdx < 1) continue;

    if (type === 'update') {
      if (!Number.isFinite(rIdx) || rIdx < 1) continue;
      const cells = [];
      for (const token of args.slice(2)) {
        let mm = /^(\d+)\s*:\s*(.+)$/.exec(token);
        if (mm) {
          const col = parseInt(mm[1], 10);
          const value = unquote(mm[2]);
          if (Number.isFinite(col) && col >= 1) cells.push({ col, value });
          continue;
        }
        mm = /^(\d+)\s*\(\s*([\s\S]*)\s*\)$/.exec(token);
        if (mm) {
          const col = parseInt(mm[1], 10);
          const value = unquote(mm[2]);
          if (Number.isFinite(col) && col >= 1) cells.push({ col, value });
        }
      }
      if (!cells.length) continue;
      cmds.push({ type: 'update', section: sIdx, row: rIdx, cells });
      continue;
    }

    if (type === 'delete') {
      if (!Number.isFinite(rIdx) || rIdx < 1) continue;
      cmds.push({ type: 'delete', section: sIdx, row: rIdx });
      continue;
    }

    if (type === 'insert') {
      if (!Number.isFinite(rIdx) || rIdx < 1) continue;

      const cells = [];
      let sawCell = false;
      const positional = [];

      for (const token of args.slice(2)) {
        let mm = /^(\d+)\s*:\s*(.+)$/.exec(token);
        if (mm) {
          const col = parseInt(mm[1], 10);
          const value = unquote(mm[2]);
          if (Number.isFinite(col) && col >= 1) {
            cells.push({ col, value });
            sawCell = true;
          }
          continue;
        }

        mm = /^(\d+)\s*\(\s*([\s\S]*)\s*\)$/.exec(token);
        if (mm) {
          const col = parseInt(mm[1], 10);
          const value = unquote(mm[2]);
          if (Number.isFinite(col) && col >= 1) {
            cells.push({ col, value });
            sawCell = true;
          }
          continue;
        }

        positional.push(unquote(token));
      }

      if (sawCell) {
        cmds.push({ type: 'insert', section: sIdx, row: rIdx, cells });
      } else {
        cmds.push({ type: 'insert', section: sIdx, row: rIdx, values: positional });
      }
      continue;
    }

    if (type === 'hide') {
      if (!Number.isFinite(rIdx) || rIdx < 1) continue;
      const b = parseBool(args[2]);
      if (b === null) continue;
      cmds.push({ type: 'hide', section: sIdx, row: rIdx, hidden: b });
      continue;
    }

    if (type === 'move') {
      const from = rIdx;
      const to = parseInt(args[2], 10);
      if (!Number.isFinite(from) || from < 1 || !Number.isFinite(to) || to < 1) continue;
      cmds.push({ type: 'move', section: sIdx, from, to });
      continue;
    }
  }
  return cmds;
};
