// 依赖 st-api-wrapper 的全局对象
const ST_API = window.ST_API;

const WORLD_BOOK_WRITE_ERROR = 'WorldTreeLibrary 已禁止写入世界书；请改用聊天绑定存储或变量存储。';

export async function upsertMemoryTableEntry() {
  throw new Error(WORLD_BOOK_WRITE_ERROR);
}

export async function saveMemoryTableState(params) {
  const scope = params.scope ?? 'local';
  const variableName = params.variableName || 'WorldTreeLibrary.memoryTable';
  const state = {
    ...params.state,
    updatedAt: params.state.updatedAt || new Date().toISOString()
  };
  await ST_API.variables.set({ name: variableName, value: state, scope });
  return { ok: true, state, scope, variableName };
}

export async function loadMemoryTableState(params = {}) {
  const scope = params.scope ?? 'local';
  const variableName = params.variableName || 'WorldTreeLibrary.memoryTable';
  const result = await ST_API.variables.get({ name: variableName, scope });
  return { state: result?.value ?? null, scope, variableName };
}

export async function persistMemory(params) {
  const stateRes = await saveMemoryTableState({
    state: params.state,
    ...(params.stateStore || {})
  });

  if (params.worldBook) {
    throw new Error(WORLD_BOOK_WRITE_ERROR);
  }

  return {
    ok: stateRes.ok,
    state: stateRes,
    worldBook: null
  };
}
