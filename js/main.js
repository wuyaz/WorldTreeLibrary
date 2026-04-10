// @ts-nocheck
import { initConfig } from './config.js';
import { loadHtml } from './assets.js';
import { getFeatureFlags } from './storage.js';
import { registerTopTab } from './ui/registerTopTab.js';
import { registerFeatureMenu } from './ui/registerFeatureMenu.js';
import { registerFeatureSettingsPanel } from './ui/registerSettingsPanel.js';
import { bindWorldTreeUi } from './ui/bindings.js';
import { createChatManagerController } from './ui/chatManager.js';

(function () {
  let attempts = 0;
  let registered = false;
  let chatManager = null;
  const init = async () => {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx || !window.ST_API?.ui) {
      attempts += 1;
      if (attempts <= 20) {
        setTimeout(() => init().catch((err) => console.error('[WorldTreeLibrary] init failed:', err)), 300);
      }
      return;
    }

    const { defaults } = await initConfig();
    const { eventSource, event_types } = ctx || {};

    if (!chatManager) {
      chatManager = createChatManagerController();
    }

    const applyFeatureFlags = (flags = getFeatureFlags()) => {
      chatManager?.setEnabled(flags.chatManager !== false);
    };

    const register = async () => {
      if (registered) return;
      registered = true;
      let topTabRegistered = false;
      try {
        await registerTopTab({
          loadHtml,
          onOpen: (root) => {
            if (!root) return;
            bindWorldTreeUi({ root, ctx, defaults });
          }
        });
        topTabRegistered = true;
      } catch (err) {
        console.warn('[WorldTreeLibrary] register top tab failed', err);
      }

      try {
        await registerFeatureSettingsPanel({
          onChange: (flags) => {
            applyFeatureFlags(flags);
            const root = document.getElementById('wtl-root');
            if (root) {
              root.classList.toggle('wtl-memory-disabled', flags.memoryTable === false);
              const disabledEl = document.getElementById('wtl-memory-feature-disabled');
              if (disabledEl) disabledEl.style.display = flags.memoryTable === false ? 'block' : 'none';
            }
          }
        });
      } catch (err) {
        console.warn('[WorldTreeLibrary] register feature settings panel failed', err);
        // 回退到魔法棒栏注册
        try {
          await registerFeatureMenu({
            onChange: (flags) => {
              applyFeatureFlags(flags);
              const root = document.getElementById('wtl-root');
              if (root) {
                root.classList.toggle('wtl-memory-disabled', flags.memoryTable === false);
                const disabledEl = document.getElementById('wtl-memory-feature-disabled');
                if (disabledEl) disabledEl.style.display = flags.memoryTable === false ? 'block' : 'none';
              }
            }
          });
        } catch (fallbackErr) {
          console.warn('[WorldTreeLibrary] register feature menu fallback failed', fallbackErr);
        }
      }

      if (!topTabRegistered) {
        registered = false;
      }
    };

    applyFeatureFlags();

    if (eventSource?.on && event_types?.APP_READY) {
      eventSource.on(event_types.APP_READY, register);
    }
    await register();
  };

  const boot = () => {
    init().catch((err) => console.error('[WorldTreeLibrary] init failed:', err));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__wtlRegister = async () => {
    registered = false;
    return init();
  };
})();
