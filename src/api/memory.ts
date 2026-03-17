import {
  MemoryTableStateReadParams,
  MemoryTableStateReadResult,
  MemoryTableStateWriteParams,
  MemoryTableStateWriteResult,
  MemoryWriteParams,
  MemoryWriteResult,
  PersistMemoryWriteParams,
  PersistMemoryWriteResult,
  WorldBookEntry
} from './types';

// 依赖 st-api-wrapper 的全局对象
declare const ST_API: any;

type WorldBookGetOutput = {
  worldBook: { name: string; entries: WorldBookEntry[] };
  scope?: string;
};

type WorldBookCreateEntryOutput = { entry: WorldBookEntry; ok: boolean };

type WorldBookUpdateEntryOutput = { entry: WorldBookEntry; ok: boolean };

export async function upsertMemoryTableEntry(
  params: MemoryWriteParams
): Promise<MemoryWriteResult> {
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

  const book: WorldBookGetOutput = await ST_API.worldBook.get({
    name: bookName,
    scope
  });

  const existing = book.worldBook.entries.find(
    entry => entry.name === entryName
  );

  if (!existing) {
    const created: WorldBookCreateEntryOutput = await ST_API.worldBook.createEntry(
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

  const updated: WorldBookUpdateEntryOutput = await ST_API.worldBook.updateEntry({
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

export async function saveMemoryTableState(
  params: MemoryTableStateWriteParams
): Promise<MemoryTableStateWriteResult> {
  const scope = params.scope ?? 'local';
  const variableName = params.variableName || 'WorldTreeLibrary.memoryTable';
  const state = {
    ...params.state,
    updatedAt: params.state.updatedAt || new Date().toISOString()
  };
  await ST_API.variables.set({ name: variableName, value: state, scope });
  return { ok: true, state, scope, variableName };
}

export async function loadMemoryTableState(
  params: MemoryTableStateReadParams = {}
): Promise<MemoryTableStateReadResult> {
  const scope = params.scope ?? 'local';
  const variableName = params.variableName || 'WorldTreeLibrary.memoryTable';
  const result = await ST_API.variables.get({ name: variableName, scope });
  return { state: result?.value ?? null, scope, variableName };
}

export async function persistMemory(
  params: PersistMemoryWriteParams
): Promise<PersistMemoryWriteResult> {
  const stateRes = await saveMemoryTableState({
    state: params.state,
    ...(params.stateStore || {})
  });

  let wbRes: MemoryWriteResult | undefined;
  if (params.worldBook) {
    wbRes = await upsertMemoryTableEntry(params.worldBook);
  }

  return {
    ok: stateRes.ok && (wbRes ? wbRes.ok : true),
    state: stateRes,
    worldBook: wbRes
  };
}
