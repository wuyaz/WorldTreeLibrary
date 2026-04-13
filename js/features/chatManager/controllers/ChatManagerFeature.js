// @ts-nocheck

import { ChatManagerController } from './chatManagerController.js';
import { getFeatureFlags } from '../../../core/storage.js';
import { loadCSS } from '../../../core/assetLoader.js';

export class ChatManagerFeature {
  constructor(options = {}) {
    this.options = options;
    this.controller = null;
    this.state = {
      isEnabled: true,
      isInitialized: false,
    };
  }

  async initialize() {
    if (this.state.isInitialized) return;

    try {
      const featureFlags = getFeatureFlags();
      if (featureFlags.chatManager === false) {
        console.log('[WTL ChatManager] Feature disabled by flags');
        return;
      }

      await this.injectStyles();

      this.controller = new ChatManagerController(this.options);
      await this.controller.initialize();

      this.state.isInitialized = true;
      console.log('[WTL ChatManager] Feature initialized');
    } catch (error) {
      console.error('[WTL ChatManager] Failed to initialize:', error);
      throw error;
    }
  }

  async injectStyles() {
    try {
      await loadCSS('assets/css/wtl-chat.css', 'st-gcm-styles-v5');
    } catch (error) {
      console.warn('[WTL ChatManager] Failed to load CSS:', error);
    }
  }

  setEnabled(value) {
    this.state.isEnabled = Boolean(value);
    this.controller?.setEnabled?.(this.state.isEnabled);
  }

  destroy() {
    if (this.controller) {
      this.controller.destroy();
    }
    this.state = {
      isEnabled: false,
      isInitialized: false,
    };
    console.log('[WTL ChatManager] Feature destroyed');
  }
}
