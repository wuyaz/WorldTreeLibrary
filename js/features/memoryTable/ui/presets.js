import { safeParseJson } from '../../../shared/utils/index.js';

export async function importPresetFile({
  file,
  currentPresets,
  applyPresets,
  onSuccess,
  onError,
  resetInput
}) {
  if (!file) return false;
  try {
    const text = await file.text();
    const data = safeParseJson(text) || {};
    const presets = { ...(currentPresets || {}), ...data };
    applyPresets?.(presets);
    onSuccess?.(presets);
    return true;
  } catch (err) {
    onError?.(err);
    return false;
  } finally {
    resetInput?.();
  }
}

export function exportPresetFile({ filename, presets, downloadJson }) {
  downloadJson?.(filename, presets || {});
}

export function loadTextPresetValue({ storageKey, name, getPromptPresets, setStatus }) {
  const presets = getPromptPresets(storageKey);
  if (!name || !presets[name]) {
    setStatus?.('未找到预设');
    return null;
  }
  return presets[name];
}

export function saveTextPresetValue({ storageKey, name, value, getPromptPresets, setPromptPresets, setStatus }) {
  const presetName = String(name || '').trim();
  if (!presetName) {
    setStatus?.('请输入预设名');
    return null;
  }
  const presets = getPromptPresets(storageKey);
  presets[presetName] = value || '';
  setPromptPresets(storageKey, presets);
  return { name: presetName, presets };
}

export function renameTextPresetValue({ storageKey, oldName, newName, getPromptPresets, setPromptPresets, setStatus }) {
  const source = String(oldName || '').trim();
  const target = String(newName || '').trim();
  if (!source || !target) {
    setStatus?.('请选择并填写新预设名');
    return null;
  }
  const presets = getPromptPresets(storageKey);
  if (!presets[source]) {
    setStatus?.('未找到预设');
    return null;
  }
  presets[target] = presets[source];
  if (target !== source) delete presets[source];
  setPromptPresets(storageKey, presets);
  return { name: target, presets };
}

export function deleteTextPresetValue({ storageKey, name, getPromptPresets, setPromptPresets, setStatus }) {
  const presetName = String(name || '').trim();
  if (!presetName) {
    setStatus?.('请选择要删除的预设');
    return null;
  }
  const presets = getPromptPresets(storageKey);
  if (!presets[presetName]) {
    setStatus?.('未找到预设');
    return null;
  }
  delete presets[presetName];
  setPromptPresets(storageKey, presets);
  return { name: presetName, presets };
}

export function importJsonPresets({ text, currentPresets, parseJson }) {
  const data = parseJson(text) || {};
  return { ...currentPresets, ...data };
}

export function saveSchemaPresetValue({
  name,
  value,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScope,
  getSchemaScopedPresets,
  setSchemaScopedPresets,
  getCurrentChatId,
  getCurrentCharacterId,
  setStatus
}) {
  const presetName = String(name || '').trim();
  if (!presetName) {
    setStatus?.('请输入预设名');
    return null;
  }

  const presets = getSchemaPresets();
  presets[presetName] = value || '';
  setSchemaPresets(presets);

  const scope = getSchemaScope();
  const map = getSchemaScopedPresets();
  const chatId = getCurrentChatId();
  const charId = getCurrentCharacterId();
  if (scope === 'chat') {
    map.chat = map.chat || {};
    if (chatId) map.chat[chatId] = presetName;
  } else if (scope === 'character') {
    map.character = map.character || {};
    if (charId) map.character[charId] = presetName;
  } else {
    map.global = presetName;
  }
  setSchemaScopedPresets(map);

  return { name: presetName, presets, scoped: map };
}

export function renameSchemaPresetValue({
  oldName,
  newName,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScopedPresets,
  setSchemaScopedPresets,
  setStatus
}) {
  const source = String(oldName || '').trim();
  const target = String(newName || '').trim();
  if (!source || !target) {
    setStatus?.('请选择并填写新预设名');
    return null;
  }

  const presets = getSchemaPresets();
  if (!presets[source]) {
    setStatus?.('未找到预设');
    return null;
  }

  presets[target] = presets[source];
  if (target !== source) delete presets[source];
  setSchemaPresets(presets);

  const map = getSchemaScopedPresets();
  if (map.global === source) map.global = target;
  if (map.chat) {
    Object.keys(map.chat).forEach((key) => {
      if (map.chat[key] === source) map.chat[key] = target;
    });
  }
  if (map.character) {
    Object.keys(map.character).forEach((key) => {
      if (map.character[key] === source) map.character[key] = target;
    });
  }
  setSchemaScopedPresets(map);

  return { name: target, presets, scoped: map };
}

export function deleteSchemaPresetValue({
  name,
  getSchemaPresets,
  setSchemaPresets,
  getSchemaScopedPresets,
  setSchemaScopedPresets,
  setStatus
}) {
  const presetName = String(name || '').trim();
  if (!presetName) {
    setStatus?.('请选择要删除的预设');
    return null;
  }

  const presets = getSchemaPresets();
  if (!presets[presetName]) {
    setStatus?.('未找到预设');
    return null;
  }
  delete presets[presetName];
  setSchemaPresets(presets);

  const map = getSchemaScopedPresets();
  if (map.global === presetName) map.global = '默认';
  if (map.chat) {
    Object.keys(map.chat).forEach((key) => {
      if (map.chat[key] === presetName) delete map.chat[key];
    });
  }
  if (map.character) {
    Object.keys(map.character).forEach((key) => {
      if (map.character[key] === presetName) delete map.character[key];
    });
  }
  setSchemaScopedPresets(map);

  return { name: presetName, presets, scoped: map };
}
