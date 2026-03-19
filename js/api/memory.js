// 依赖 st-api-wrapper 的全局对象
const ST_API = window.ST_API;

export async function upsertMemoryTableEntry(params) {
  const {
    bookName,
    entryName,
    content,
    scope,
    position = 'outlet',
    role = null,
    depth,
    order = 0,
    enabled = true
  } = params;

  const book = await ST_API.worldBook.get({
    name: bookName,
    scope
  });

  const existing = book.worldBook.entries.find(
    entry => entry.name === entryName
  );

  if (!existing) {
    const created = await ST_API.worldBook.createEntry(
      {
        name: bookName,
        scope,
        entry: {
          name: entryName,
          content,
          enabled,
          position,
          role,
          depth,
          order,
          activationMode: 'always',
          key: [],
          secondaryKey: [],
          selectiveLogic: 'andAny'
        }
      }
    );

    return {
      ok: created.ok,
      mode: 'created',
      entry: created.entry
    };
  }

  const updated = await ST_API.worldBook.updateEntry({
    name: bookName,
    scope,
    index: existing.index,
    patch: {
      content,
      enabled,
      position,
      role,
      depth,
      order
    }
  });

  return {
    ok: updated.ok,
    mode: 'updated',
    entry: updated.entry
  };
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

  let wbRes;
  if (params.worldBook) {
    wbRes = await upsertMemoryTableEntry(params.worldBook);
  }

  return {
    ok: stateRes.ok && (wbRes ? wbRes.ok : true),
    state: stateRes,
    worldBook: wbRes
  };
}
