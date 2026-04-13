// @ts-nocheck
/**
 * World Tree Library - Main Entry Point (Refactored)
 * Uses modular architecture with event bus and feature-based structure
 */

import { loadConfig } from './core/configManager.js';
import { ensureWtlStyle } from './core/assetLoader.js';
import { getFeatureFlags } from './core/storage.js';
import eventBus, { EVENTS } from './core/eventBus.js';
import { registerTopTab } from './shared/sillytavern/registerTopTab.js';
import { registerFeatureMenu } from './shared/sillytavern/registerFeatureMenu.js';
import { registerFeatureSettingsPanel } from './shared/sillytavern/registerSettingsPanel.js';
import { MemoryTableFeature } from './features/memoryTable/index.js';
import { ChatManagerFeature } from './features/chatManager/index.js';

// Global state
let features = {
  memoryTable: null,
  chatManager: null
};
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
    // Load configuration
    const { config, defaults, presets } = await loadConfig();
    
    // Store in window for global access
    window.__WTL_CONFIG__ = config;
    window.__WTL_DEFAULTS__ = defaults;
    window.__WTL_PRESETS__ = presets;
    
    // Initialize features
    await initializeFeatures(ctx, config, defaults);
    
    // Register UI components
    await registerUIComponents(ctx, config, defaults);
    
    // Apply initial feature flags
    applyFeatureFlags();
    
    initialized = true;
    
    // Emit app ready event
    eventBus.emit(EVENTS.APP_READY, {
      config,
      features: Object.keys(features).filter(key => features[key] !== null)
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
 * Initialize features based on configuration
 */
async function initializeFeatures(ctx, config, defaults) {
  const featureFlags = getFeatureFlags();
  
  // Initialize Memory Table Feature
  if (featureFlags.memoryTable !== false) {
    try {
      features.memoryTable = new MemoryTableFeature();
      await features.memoryTable.initialize();
      console.log('[WorldTreeLibrary] Memory Table feature initialized');
    } catch (error) {
      console.error('[WorldTreeLibrary] Failed to initialize Memory Table:', error);
      features.memoryTable = null;
    }
  }
  
  // Initialize Chat Manager Feature
  if (featureFlags.chatManager !== false) {
    try {
      features.chatManager = new ChatManagerFeature();
      await features.chatManager.initialize();
      console.log('[WorldTreeLibrary] Chat Manager feature initialized');
    } catch (error) {
      console.error('[WorldTreeLibrary] Failed to initialize Chat Manager:', error);
      features.chatManager = null;
    }
  }
}

/**
 * Register UI components (top tab, settings panel, etc.)
 */
async function registerUIComponents(ctx, config, defaults) {
  const { eventSource, event_types } = ctx || {};
  
  // Register top tab for Memory Table
  if (features.memoryTable) {
    try {
      await registerTopTab({
        loadHtml: async () => {
          // Load HTML for the tab
          const response = await fetch('/scripts/extensions/third-party/WorldTreeLibrary/assets/html/main-panel.html');
          return await response.text();
        },
        onOpen: (root) => {
          if (!root) return;
          
          // Initialize Memory Table UI in the tab
          if (features.memoryTable) {
            features.memoryTable.initializeUI(root, ctx, defaults);
          }
        }
      });
    } catch (error) {
      console.warn('[WorldTreeLibrary] Failed to register top tab:', error);
    }
  }
  
  // Register feature settings panel
  try {
    await registerFeatureSettingsPanel({
      onChange: (flags) => {
        applyFeatureFlags(flags);
        
        // Update feature states
        if (features.memoryTable) {
          features.memoryTable.setEnabled(flags.memoryTable !== false);
        }
        
        if (features.chatManager) {
          features.chatManager.setEnabled(flags.chatManager !== false);
        }
        
        // Emit feature flags changed event
        eventBus.emit(EVENTS.FEATURE_FLAGS_CHANGED, flags);
      }
    });
  } catch (error) {
    console.warn('[WorldTreeLibrary] Failed to register settings panel:', error);
    
    // Fallback to feature menu
    try {
      await registerFeatureMenu({
        onChange: (flags) => {
          applyFeatureFlags(flags);
          
          // Update feature states
          if (features.memoryTable) {
            features.memoryTable.setEnabled(flags.memoryTable !== false);
          }
          
          if (features.chatManager) {
            features.chatManager.setEnabled(flags.chatManager !== false);
          }
          
          eventBus.emit(EVENTS.FEATURE_FLAGS_CHANGED, flags);
        }
      });
    } catch (fallbackError) {
      console.warn('[WorldTreeLibrary] Feature menu fallback also failed:', fallbackError);
    }
  }
}

/**
 * Apply feature flags to UI
 */
function applyFeatureFlags(flags = getFeatureFlags()) {
  const root = document.getElementById('wtl-root');
  if (root) {
    // Apply memory table disabled state
    root.classList.toggle('wtl-memory-disabled', flags.memoryTable === false);
    
    // Show/hide disabled message
    const disabledEl = document.getElementById('wtl-memory-feature-disabled');
    if (disabledEl) {
      disabledEl.style.display = flags.memoryTable === false ? 'block' : 'none';
    }
  }
  
  // Notify features about flag changes
  if (features.chatManager) {
    features.chatManager.setEnabled(flags.chatManager !== false);
  }
}

/**
 * Cleanup and destroy all features
 */
function destroy() {
  // Destroy features
  if (features.memoryTable?.destroy) {
    features.memoryTable.destroy();
  }
  
  if (features.chatManager?.destroy) {
    features.chatManager.destroy();
  }
  
  // Clear features
  features = {
    memoryTable: null,
    chatManager: null
  };
  
  // Clear state
  initialized = false;
  attempts = 0;
  
  // Emit shutdown event
  eventBus.emit(EVENTS.APP_SHUTDOWN);
  
  console.log('[WorldTreeLibrary] Destroyed');
}

// Self-invoking function to start initialization
(function () {
  // Add style element for WTL
  const styleId = 'wtl-inline-style';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  // Start initialization
  initialize().catch((err) => {
    console.error('[WorldTreeLibrary] Initialization error:', err);
  });
  
  // Expose public API
  window.WorldTreeLibrary = {
    // Core API
    getConfig: () => window.__WTL_CONFIG__,
    getDefaults: () => window.__WTL_DEFAULTS__,
    getPresets: () => window.__WTL_PRESETS__,
    
    // Feature access
    getFeature: (name) => features[name],
    getFeatures: () => ({ ...features }),
    
    // Event bus access
    on: (event, callback) => eventBus.on(event, callback),
    off: (event, callback) => eventBus.off(event, callback),
    emit: (event, ...args) => eventBus.emit(event, ...args),
    
    // Utility functions
    applyFeatureFlags,
    destroy,
    
    // Status
    isInitialized: () => initialized
  };
  
  // Backward compatibility
  window.__wtlApplyFeatureUi = applyFeatureFlags;
})();

// Export for module systems (if any)
export default window.WorldTreeLibrary;
