// @ts-nocheck
import { initConfig } from './core/config.js';
import { loadHtml } from './core/assets.js';
import { getFeatureFlags } from './core/storage.js';
import { registerTopTab } from './shared/registerTopTab.js';
import { registerFeatureMenu } from './shared/registerFeatureMenu.js';
import { registerFeatureSettingsPanel } from './shared/registerSettingsPanel.js';
import { bindWorldTreeUi } from './features/memoryTable/ui/bindings.js';
import { createChatManagerController } from './features/chatManager/index.js';

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

    try {
      const currentFlags = JSON.parse(localStorage.getItem('wtl.featureFlags') || '{}');
      if (currentFlags.memoryTable === false) {
        console.log('[WorldTreeLibrary] 启用记忆表格功能');
        localStorage.setItem('wtl.featureFlags', JSON.stringify({...currentFlags, memoryTable: true}));
      }
    } catch (e) {
      console.warn('[WorldTreeLibrary] 无法检查功能标志', e);
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
            if (window.__wtlApplyFeatureUi) {
              window.__wtlApplyFeatureUi();
            }
          }
        });
      } catch (err) {
        console.warn('[WorldTreeLibrary] register feature settings panel failed', err);
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
              if (window.__wtlApplyFeatureUi) {
                window.__wtlApplyFeatureUi();
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
    try {
      console.log('[WorldTreeLibrary] 开始初始化...');
      init().catch((err) => {
        console.error('[WorldTreeLibrary] init failed:', err);
        console.error('[WorldTreeLibrary] 错误堆栈:', err.stack);
      });
    } catch (err) {
      console.error('[WorldTreeLibrary] boot failed:', err);
      console.error('[WorldTreeLibrary] 错误堆栈:', err.stack);
    }
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
