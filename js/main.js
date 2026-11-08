// @ts-nocheck
/**
 * World Tree Library - Main Entry Point
 *
 * 插件骨架只做四件事：
 *   1. 等酒馆与 ST_API 就绪
 *   2. 按 features/registry.js 的清单逐个初始化功能
 *   3. 让每个功能自己注册挂载点（registerUI）
 *   4. 把功能开关同步到运行中的实例
 *
 * 具体有哪些功能、怎么挂载，都不写在这里。
 */

import { loadConfig } from './core/configManager.js';
import { ensureWtlStyle } from './core/assetLoader.js';
import { getFeatureFlags } from './core/storage.js';
import eventBus, { EVENTS } from './core/eventBus.js';
import { registerFeatureMenu } from './shared/sillytavern/registerFeatureMenu.js';
import { registerFeatureSettingsPanel } from './shared/sillytavern/registerSettingsPanel.js';
import { FEATURES } from './features/registry.js';

let features = {};
let initialized = false;
let attempts = 0;

/**
 * Initialize the World Tree Library
 */
async function initialize() {
  const ctx = window.SillyTavern?.getContext?.();
  if (!ctx || !window.ST_API?.ui) {
    attempts += 1;
    if (attempts <= 20) {
      setTimeout(() => initialize().catch((err) =>
        console.error('[WorldTreeLibrary] init failed:', err)), 300);
    }
    return;
  }

  try {
    const { config, defaults, presets } = await loadConfig();

    window.__WTL_CONFIG__ = config;
    window.__WTL_DEFAULTS__ = defaults;
    window.__WTL_PRESETS__ = presets;

    await initializeFeatures(ctx, config, defaults);
    await registerUIComponents(ctx, config, defaults);
    applyFeatureFlags();

    initialized = true;

    eventBus.emit(EVENTS.APP_READY, {
      config,
      features: Object.keys(features).filter((key) => features[key])
    });

    console.log('[WorldTreeLibrary] Initialized successfully with modular architecture');
  } catch (error) {
    console.error('[WorldTreeLibrary] Initialization failed:', error);
    eventBus.emit(EVENTS.ERROR_OCCURRED, {
      context: 'main.initialize',
      error
    });
  }
}

/**
 * 逐个初始化注册表里的功能。
 * 无论开关是否打开都会创建实例——关闭只影响显示与行为，
 * 这样用户当场切换开关不需要刷新页面。
 */
async function initializeFeatures(ctx, config, defaults) {
  for (const meta of FEATURES) {
    try {
      const instance = meta.create();
      await instance.initialize();
      features[meta.id] = instance || null;
      console.log(`[WorldTreeLibrary] ${meta.name} initialized`);
    } catch (error) {
      console.error(`[WorldTreeLibrary] Failed to initialize ${meta.name}:`, error);
      features[meta.id] = null;
    }
  }
}

/**
 * 功能自己声明挂载点，这里只负责调用。
 */
async function registerUIComponents(ctx, config, defaults) {
  for (const meta of FEATURES) {
    const instance = features[meta.id];
    if (!instance || typeof meta.registerUI !== 'function') continue;
    try {
      await meta.registerUI({ instance, ctx, defaults });
    } catch (error) {
      console.warn(`[WorldTreeLibrary] ${meta.name} UI 注册失败:`, error);
    }
  }

  const onFlagsChanged = (flags) => {
    applyFeatureFlags(flags);
    eventBus.emit(EVENTS.FEATURE_FLAGS_CHANGED, flags);
  };

  try {
    await registerFeatureSettingsPanel({
      features: FEATURES,
      onChange: onFlagsChanged
    });
  } catch (error) {
    console.warn('[WorldTreeLibrary] Failed to register settings panel:', error);
    try {
      await registerFeatureMenu({ onChange: onFlagsChanged });
    } catch (fallbackError) {
      console.warn('[WorldTreeLibrary] Feature menu fallback also failed:', fallbackError);
    }
  }
}

/**
 * 把开关同步到运行中的功能实例。
 * 之前这里只处理了 chatManager，记忆表格那个开关要重启才生效。
 */
function applyFeatureFlags(flags = getFeatureFlags()) {
  for (const meta of FEATURES) {
    const instance = features[meta.id];
    if (!instance?.setEnabled) continue;
    const enabled = flags[meta.id] !== false;
    try {
      instance.setEnabled(enabled);
    } catch (error) {
      console.error(`[WorldTreeLibrary] ${meta.name} 开关切换失败:`, error);
    }
  }
}

/**
 * Cleanup and destroy all features
 */
function destroy() {
  for (const meta of FEATURES) {
    const instance = features[meta.id];
    try {
      instance?.destroy?.();
    } catch (error) {
      console.error(`[WorldTreeLibrary] ${meta.name} 销毁失败:`, error);
    }
  }

  features = {};
  initialized = false;
  attempts = 0;

  eventBus.emit(EVENTS.APP_SHUTDOWN);
  console.log('[WorldTreeLibrary] Destroyed');
}

// Self-invoking function to start initialization
(function () {
  const styleId = 'wtl-inline-style';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  initialize().catch((err) => {
    console.error('[WorldTreeLibrary] Initialization error:', err);
  });

  window.WorldTreeLibrary = {
    getConfig: () => window.__WTL_CONFIG__,
    getDefaults: () => window.__WTL_DEFAULTS__,
    getPresets: () => window.__WTL_PRESETS__,

    getFeature: (name) => features[name],
    getFeatures: () => ({ ...features }),
    getFeatureList: () => FEATURES.map((meta) => ({ id: meta.id, name: meta.name })),

    on: (event, callback) => eventBus.on(event, callback),
    off: (event, callback) => eventBus.off(event, callback),
    emit: (event, ...args) => eventBus.emit(event, ...args),

    applyFeatureFlags,
    destroy,

    isInitialized: () => initialized
  };

  window.__wtlApplyFeatureUi = applyFeatureFlags;
})();

export default window.WorldTreeLibrary;
