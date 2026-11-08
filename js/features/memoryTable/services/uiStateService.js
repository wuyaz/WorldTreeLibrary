// @ts-nocheck
/**
 * 记忆表格「配置区」控件的持久化与恢复
 *
 * 只处理 localStorage 里 wtl.* 这类界面配置在「控件 ⇄ 存储」之间的往返。
 * 表格数据、提示词预设、模板内容各有自己的仓库，不在这里。
 *
 * 历史背景：这批控件的 restore 逻辑原本写在 ui/stateControllers.js（单文件版遗留，
 * 已随重构废弃）。删掉它之前必须先把这里补上，否则用户调过的设置每次刷新都会丢。
 */

const PREFIX = 'wtl.';

// 历史值 → 当前合法值
const LEGACY_VALUES = {
  sendMode: { stMacro: 'st' }
};

// 同义字段先后用过的键名，按顺序找第一个存在的
const LEGACY_KEYS = {
  tableInjectEnabled: ['wtl.tableInjectEnabled', 'wtl.tableInjectionEnabled'],
  instInjectEnabled: ['wtl.instInjectEnabled', 'wtl.instructionInjectionEnabled'],
  schemaInjectEnabled: ['wtl.schemaInjectEnabled', 'wtl.schemaInjectionEnabled']
};

const read = (name) => {
  const candidates = LEGACY_KEYS[name] || [PREFIX + name];
  for (const key of candidates) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      raw = null;
    }
    if (raw === null) continue;
    const map = LEGACY_VALUES[name];
    if (map && Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];
    return raw;
  }
  return undefined;
};

const write = (name, value) => {
  try {
    localStorage.setItem(PREFIX + name, value === null || value === undefined ? '' : String(value));
  } catch (e) {
    // 存储不可用（隐私模式等）时静默跳过，不阻断界面
  }
};

const asText = (value, fallback) => (
  value === undefined || value === null || value === '' ? fallback : String(value)
);

const asBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === true;
};

const setSelect = (el, value) => {
  if (!el || value === undefined || value === null) return;
  const next = String(value);
  // 只在 option 确实存在时才写，避免历史值把下拉框清空
  if (el.tagName === 'SELECT' && !Array.from(el.options).some((o) => o.value === next)) return;
  el.value = next;
};

const setText = (el, value) => {
  if (!el || value === undefined || value === null) return;
  el.value = String(value);
};

// 深度只在「固定深度」位置下才有意义
const syncDepthEnabled = (posEl, depthEl) => {
  if (!depthEl) return;
  depthEl.disabled = (posEl?.value || '') !== 'fixed';
};

// 三组「注入」控件的字段映射：开关 + 位置 / 角色 / 深度 / 顺序
const INJECTION_GROUPS = [
  { name: 'table', toggle: 'tableInjectToggleEl', pos: 'tablePosEl', role: 'tableRoleEl', depth: 'tableDepthEl', order: 'tableOrderEl' },
  { name: 'inst', toggle: 'instInjectToggleEl', pos: 'instPosEl', role: 'instRoleEl', depth: 'instDepthEl', order: 'instOrderEl' },
  { name: 'schema', toggle: 'schemaInjectToggleEl', pos: 'schemaPosEl', role: 'schemaRoleEl', depth: 'schemaDepthEl', order: 'schemaOrderEl' }
];

// OpenAI 连接参数：存储键 → 控件引用 → defaults.openai 里的键
const OPENAI_FIELDS = [
  ['openaiUrl', 'openaiUrlEl', 'url'],
  ['openaiKey', 'openaiKeyEl', 'key'],
  ['openaiModel', 'openaiModelEl', 'model'],
  ['openaiTemp', 'openaiTempEl', 'temp'],
  ['openaiMax', 'openaiMaxEl', 'max']
];

/**
 * 把存储里的配置写回控件。存储里没有的字段回落到 defaults。
 * @param {{ui: object, defaults: object}} options
 */
export function restoreUiState({ ui, defaults = {} } = {}) {
  if (!ui) return;

  setSelect(ui.sendModeEl, asText(read('sendMode'), defaults.sendMode));
  setSelect(ui.instModeEl, asText(read('instMode'), defaults.instMode));
  setSelect(ui.schemaModeSendEl, asText(read('schemaSendMode'), defaults.schemaSendMode));
  setSelect(ui.tableModeEl, asText(read('tableMode'), defaults.tableMode));

  const wbMode = asText(read('wbReadMode'), defaults.wbReadMode);
  setSelect(ui.wbModeEl, wbMode);
  if (ui.wbManualWrapEl) ui.wbManualWrapEl.style.display = wbMode === 'manual' ? 'block' : 'none';

  const openaiDefaults = defaults.openai || {};
  for (const [name, ref, defKey] of OPENAI_FIELDS) {
    setText(ui[ref], asText(read(name), openaiDefaults[defKey]));
  }
  if (ui.openaiStreamEl) {
    ui.openaiStreamEl.checked = asBool(read('openaiStream'), openaiDefaults.stream !== false);
  }

  for (const group of INJECTION_GROUPS) {
    const { name } = group;
    if (ui[group.toggle]) {
      ui[group.toggle].checked = asBool(read(`${name}InjectEnabled`), asBool(defaults[`${name}InjectEnabled`], true));
    }
    setSelect(ui[group.pos], asText(read(`${name}Pos`), defaults[`${name}Pos`]));
    setSelect(ui[group.role], asText(read(`${name}Role`), defaults[`${name}Role`]));
    setText(ui[group.depth], asText(read(`${name}Depth`), defaults[`${name}Depth`]));
    setText(ui[group.order], asText(read(`${name}Order`), defaults[`${name}Order`]));
    syncDepthEnabled(ui[group.pos], ui[group.depth]);
  }

  if (ui.autoToggleBtn) {
    ui.autoToggleBtn.checked = asBool(read('autoFillEnabled'), asBool(defaults.autoFillEnabled, true));
  }
  setText(ui.autoFloorsEl, asText(read('autoFillFloors'), defaults.autoFillFloors));
  setText(ui.autoEveryEl, asText(read('autoFillEvery'), defaults.autoFillEvery));
  setText(ui.autoDelayEl, asText(read('autoFillDelay'), defaults.autoFillDelay ?? '0'));
}

/**
 * 控件变化时写回存储。返回解绑函数。
 * @param {{ui: object, onChange?: Function}} options
 */
export function bindUiStatePersistence({ ui, onChange } = {}) {
  if (!ui) return () => {};

  const cleanups = [];
  const on = (el, event, handler) => {
    if (!el) return;
    el.addEventListener(event, handler);
    cleanups.push(() => el.removeEventListener(event, handler));
  };
  const notify = (key) => {
    if (typeof onChange === 'function') onChange(key);
  };

  on(ui.sendModeEl, 'change', () => { write('sendMode', ui.sendModeEl.value); notify('sendMode'); });
  on(ui.instModeEl, 'change', () => { write('instMode', ui.instModeEl.value); notify('instMode'); });
  on(ui.schemaModeSendEl, 'change', () => { write('schemaSendMode', ui.schemaModeSendEl.value); notify('schemaSendMode'); });
  on(ui.tableModeEl, 'change', () => { write('tableMode', ui.tableModeEl.value); notify('tableMode'); });

  on(ui.wbModeEl, 'change', () => {
    write('wbReadMode', ui.wbModeEl.value);
    if (ui.wbManualWrapEl) ui.wbManualWrapEl.style.display = ui.wbModeEl.value === 'manual' ? 'block' : 'none';
    notify('wbReadMode');
  });

  for (const [name, ref] of OPENAI_FIELDS) {
    on(ui[ref], 'input', () => { write(name, ui[ref].value); notify(name); });
  }
  on(ui.openaiStreamEl, 'change', () => {
    write('openaiStream', ui.openaiStreamEl.checked);
    notify('openaiStream');
  });

  for (const group of INJECTION_GROUPS) {
    const { name } = group;
    on(ui[group.toggle], 'change', () => { write(`${name}InjectEnabled`, ui[group.toggle].checked); notify(`${name}InjectEnabled`); });
    on(ui[group.pos], 'change', () => {
      write(`${name}Pos`, ui[group.pos].value);
      syncDepthEnabled(ui[group.pos], ui[group.depth]);
      notify(`${name}Pos`);
    });
    on(ui[group.role], 'change', () => { write(`${name}Role`, ui[group.role].value); notify(`${name}Role`); });
    on(ui[group.depth], 'input', () => { write(`${name}Depth`, ui[group.depth].value); notify(`${name}Depth`); });
    on(ui[group.order], 'input', () => { write(`${name}Order`, ui[group.order].value); notify(`${name}Order`); });
  }

  on(ui.autoToggleBtn, 'change', () => { write('autoFillEnabled', ui.autoToggleBtn.checked); notify('autoFillEnabled'); });
  on(ui.autoFloorsEl, 'input', () => { write('autoFillFloors', ui.autoFloorsEl.value); notify('autoFillFloors'); });
  on(ui.autoEveryEl, 'input', () => { write('autoFillEvery', ui.autoEveryEl.value); notify('autoFillEvery'); });
  on(ui.autoDelayEl, 'input', () => { write('autoFillDelay', ui.autoDelayEl.value); notify('autoFillDelay'); });

  return () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
}

/**
 * 读自动填表的运行参数。供 autoFillService 使用，与界面共用同一份存储。
 * @param {object} defaults defaults.json 的 memoryTable 段
 */
export function readAutoFillConfig(defaults = {}) {
  const enabled = asBool(read('autoFillEnabled'), asBool(defaults.autoFillEnabled, true));
  const floors = parseInt(asText(read('autoFillFloors'), defaults.autoFillFloors || '3'), 10);
  const every = parseInt(asText(read('autoFillEvery'), defaults.autoFillEvery || '1'), 10);
  const delay = parseInt(asText(read('autoFillDelay'), defaults.autoFillDelay ?? '0'), 10);
  return {
    enabled,
    floors: Number.isFinite(floors) && floors > 0 ? floors : 3,
    every: Number.isFinite(every) && every > 0 ? every : 1,
    delay: Number.isFinite(delay) && delay >= 0 ? delay : 0
  };
}
