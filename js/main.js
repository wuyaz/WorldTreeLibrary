// @ts-nocheck
import { initConfig } from './config.js';
import { loadHtml } from './assets.js';
import { registerTopTab } from './ui/registerTopTab.js';
import { bindWorldTreeUi } from './ui/bindings.js';

(function () {
  let attempts = 0;
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

    let registered = false;
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
        console.warn('[WorldTreeLibrary] register ui failed', err);
      }
    };

    await register();
  };

  init().catch((err) => console.error('[WorldTreeLibrary] init failed:', err));
})();
