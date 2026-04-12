import { safeParseJson } from '../../../core/storage.js';

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
