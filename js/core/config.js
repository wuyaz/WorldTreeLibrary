// @ts-nocheck
import { ensureWtlStyle, loadDefaults, loadPreset } from './assets.js';

export const initConfig = async () => {
  const defaultsData = (await loadDefaults()) || {};
  window.__WTL_DEFAULTS__ = defaultsData;
  const defaults = defaultsData;

  const presetData = {
    openai: (await loadPreset('openai')) || {},
    preprompt: (await loadPreset('preprompt')) || {},
    instruction: (await loadPreset('instruction')) || {},
    schema: (await loadPreset('schema')) || {},
    order: (await loadPreset('order')) || {},
    refOrder: (await loadPreset('refOrder')) || {},
    blocks: (await loadPreset('blocks')) || {},
    refBlocks: (await loadPreset('refBlocks')) || {}
  };
  window.__WTL_PRESETS__ = presetData;

  const seedPresetStorage = (data = {}) => {
    const ensurePresetStore = (key, payload) => {
      if (!payload) return;
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(payload || {}));
        return;
      }
      try {
        const parsed = JSON.parse(raw || '');
        const isEmpty = !parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0;
        if (isEmpty) {
          localStorage.setItem(key, JSON.stringify(payload || {}));
        }
      } catch (e) {
        localStorage.setItem(key, JSON.stringify(payload || {}));
      }
    };

    try {
      ensurePresetStore('wtl.openai.presets', data.openai);
      ensurePresetStore('wtl.preprompt.presets', data.preprompt);
      ensurePresetStore('wtl.instruction.presets', data.instruction);
      ensurePresetStore('wtl.schema.presets', data.schema);
      ensurePresetStore('wtl.order.presets', data.order);
      ensurePresetStore('wtl.refOrder.presets', data.refOrder);
      ensurePresetStore('wtl.blocks.presets', data.blocks);
      ensurePresetStore('wtl.refBlocks.presets', data.refBlocks);

      if (!localStorage.getItem('wtl.preprompt.presetActive')) {
        localStorage.setItem('wtl.preprompt.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.instruction.presetActive')) {
        localStorage.setItem('wtl.instruction.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.schema.presetActive')) {
        localStorage.setItem('wtl.schema.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.order.presetActive')) {
        localStorage.setItem('wtl.order.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.refOrder.presetActive')) {
        localStorage.setItem('wtl.refOrder.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.blocks.presetActive')) {
        localStorage.setItem('wtl.blocks.presetActive', '默认');
      }
      if (!localStorage.getItem('wtl.refBlocks.presetActive')) {
        localStorage.setItem('wtl.refBlocks.presetActive', '默认');
      }
    } catch (err) {
      console.warn('[WTL] failed to seed presets', err);
    }
  };

  seedPresetStorage(presetData);
  await ensureWtlStyle();

  return { defaults, defaultsData, presetData };
};

