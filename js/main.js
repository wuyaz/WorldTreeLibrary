// @ts-nocheck
import { initConfig } from './config.js';
import { loadHtml } from './assets.js';
import { registerTopTab } from './ui/registerTopTab.js';
import { bindWorldTreeUi } from './ui/bindings.js';

(function () {
  let attempts = 0;
  let registered = false;
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

    const register = async () => {
      if (registered) return;
      registered = true;
      try {
        await registerTopTab({
          loadHtml,
          onOpen: (root) => {
            if (!root) return;
            bindWorldTreeUi({ root, ctx, defaults });
          }
        });
      } catch (err) {
        registered = false;
        console.warn('[WorldTreeLibrary] register ui failed', err);
      }
    };

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
