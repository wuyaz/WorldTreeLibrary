export function buildManagedPromptInjectionItems({
  defaults = {},
  entryName = 'WorldTreeMemory',
  instruction = {},
  schema = {},
  table = {},
  getTablePreviewForSend = null
} = {}) {
  const baseName = entryName || 'WorldTreeMemory';
  const items = [];

  const pushItem = ({ kind, enabled, mode, content, position, role, depth, order, defaultDepth = 0, defaultOrder = 0 }) => {
    if (!enabled || mode === 'macro') return;
    const text = String(content || '').trim();
    if (!text) return;
    const numericDepth = Number(depth);
    const numericOrder = Number(order);
    items.push({
      kind,
      content: text,
      position,
      role,
      depth: Number.isFinite(numericDepth) ? numericDepth : defaultDepth,
      order: Number.isFinite(numericOrder) ? numericOrder : defaultOrder
    });
  };

  pushItem({
    kind: 'instruction',
    enabled: Boolean(instruction.enabled),
    mode: instruction.mode || defaults.instMode || 'inject',
    content: instruction.content || '',
    position: instruction.position || defaults.instPos,
    role: instruction.role || defaults.instRole,
    depth: instruction.depth || defaults.instDepth,
    order: instruction.order || defaults.instOrder,
    defaultDepth: Number(defaults.instDepth || 0),
    defaultOrder: Number(defaults.instOrder || 0)
  });

  pushItem({
    kind: 'schema',
    enabled: Boolean(schema.enabled),
    mode: schema.mode || defaults.schemaSendMode || 'inject',
    content: schema.content || '',
    position: schema.position || defaults.schemaPos,
    role: schema.role || defaults.schemaRole,
    depth: schema.depth || defaults.schemaDepth,
    order: schema.order || defaults.schemaOrder,
    defaultDepth: Number(defaults.schemaDepth || 0),
    defaultOrder: Number(defaults.schemaOrder || 0)
  });

  pushItem({
    kind: 'table',
    enabled: Boolean(table.enabled),
    mode: table.mode || defaults.tableMode || 'inject',
    content: typeof getTablePreviewForSend === 'function' ? getTablePreviewForSend(table.content || '') : String(table.content || ''),
    position: table.position || defaults.tablePos,
    role: table.role || defaults.tableRole,
    depth: table.depth || defaults.tableDepth,
    order: table.order || defaults.tableOrder,
    defaultDepth: Number(defaults.tableDepth || 0),
    defaultOrder: Number(defaults.tableOrder || 0)
  });

  return { baseName, items };
}

export function getManagedPromptInjectionEntryName({ baseName, position, role, depth }) {
  const safe = (value) => String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'default';
  const depthKey = position === 'fixed' ? `d${Number.isFinite(Number(depth)) ? Number(depth) : 0}` : 'na';
  return `${baseName}__promptInject__${safe(position)}__${safe(role)}__${depthKey}`;
}

export function buildManagedPromptInjectionText(items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  const sorted = items.slice().sort((a, b) => {
    const posA = String(a.position || '');
    const posB = String(b.position || '');
    if (posA !== posB) return posA.localeCompare(posB, 'zh-CN');
    const depthA = Number.isFinite(Number(a.depth)) ? Number(a.depth) : 0;
    const depthB = Number.isFinite(Number(b.depth)) ? Number(b.depth) : 0;
    if (depthA !== depthB) return depthA - depthB;
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.kind || '').localeCompare(String(b.kind || ''), 'zh-CN');
  });
  const chunks = sorted.map((item) => {
    const content = String(item.content || '').trim();
    if (!content) return '';
    const header = `<!-- WTL_INJECT:${item.kind}:${item.position}:${item.role || 'system'}:${Number.isFinite(Number(item.depth)) ? Number(item.depth) : 0}:${Number.isFinite(Number(item.order)) ? Number(item.order) : 0} -->`;
    return `${header}\n${content}`.trim();
  }).filter(Boolean);
  if (!chunks.length) return '';
  return `<!-- WTL_RUNTIME_INJECT_START -->\n${chunks.join('\n\n')}\n<!-- WTL_RUNTIME_INJECT_END -->`;
}

export function findSendTextarea(doc = document) {
  const selectors = [
    '#send_textarea',
    '#send_textarea textarea',
    'textarea#send_textarea',
    '#prompt-textarea',
    'textarea[name="input"]',
    'form textarea'
  ];
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (el && typeof el.value === 'string') return el;
  }
  const all = Array.from(doc.querySelectorAll('textarea'));
  return all.find((el) => typeof el.value === 'string') || null;
}

export function restoreRuntimeInjectedInput(runtimeInjectedInput) {
  if (!runtimeInjectedInput?.el) return null;
  try {
    runtimeInjectedInput.el.value = runtimeInjectedInput.value;
    runtimeInjectedInput.el.dispatchEvent(new Event('input', { bubbles: true }));
    runtimeInjectedInput.el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) {
    console.warn('[WorldTreeLibrary] restore runtime inject input failed', e);
  }
  return null;
}

export function applyRuntimeManagedPromptInjection({
  runtimeInjectedInput = null,
  isStLike = false,
  sendMode = 'st',
  injectedText = '',
  textarea = null
} = {}) {
  const restored = restoreRuntimeInjectedInput(runtimeInjectedInput);
  if (!isStLike || sendMode !== 'st') return { applied: false, runtimeInjectedInput: restored };
  if (!String(injectedText || '').trim()) return { applied: false, runtimeInjectedInput: restored };
  const target = textarea || findSendTextarea(document);
  if (!target) return { applied: false, runtimeInjectedInput: restored };
  const original = String(target.value || '');
  const next = original.trim() ? `${injectedText}\n\n${original}` : injectedText;
  const nextRuntimeInjectedInput = { el: target, value: original };
  target.value = next;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  return { applied: true, runtimeInjectedInput: nextRuntimeInjectedInput };
}
