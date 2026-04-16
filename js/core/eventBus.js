// @ts-nocheck
/**
 * Event Bus for World Tree Library
 * Provides publish-subscribe pattern for cross-module communication
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.onceCallbacks = new WeakMap();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   * @param {Object} options - Options object
   * @param {boolean} options.once - If true, callback will be removed after first execution
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback, options = {}) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    
    const eventSet = this.events.get(eventName);
    eventSet.add(callback);
    
    if (options.once) {
      this.onceCallbacks.set(callback, true);
    }
    
    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to an event (once)
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(eventName, callback) {
    return this.on(eventName, callback, { once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(eventName, callback) {
    if (!this.events.has(eventName)) return;
    
    const eventSet = this.events.get(eventName);
    eventSet.delete(callback);
    
    if (eventSet.size === 0) {
      this.events.delete(eventName);
    }
    
    this.onceCallbacks.delete(callback);
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {...any} args - Arguments to pass to callbacks
   */
  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return;
    
    const eventSet = this.events.get(eventName);
    const callbacksToRemove = [];
    
    // Copy the set to avoid modification during iteration
    const callbacks = Array.from(eventSet);
    
    for (const callback of callbacks) {
      try {
        callback(...args);
        
        // Check if this is a once callback
        if (this.onceCallbacks.has(callback)) {
          callbacksToRemove.push(callback);
        }
      } catch (error) {
        console.error(`[WTL EventBus] Error in event handler for "${eventName}":`, error);
      }
    }
    
    // Remove once callbacks
    for (const callback of callbacksToRemove) {
      this.off(eventName, callback);
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Event name
   */
  removeAllListeners(eventName) {
    if (this.events.has(eventName)) {
      const eventSet = this.events.get(eventName);
      for (const callback of eventSet) {
        this.onceCallbacks.delete(callback);
      }
      this.events.delete(eventName);
    }
  }

  /**
   * Check if an event has listeners
   * @param {string} eventName - Event name
   * @returns {boolean} True if event has listeners
   */
  hasListeners(eventName) {
    return this.events.has(eventName) && this.events.get(eventName).size > 0;
  }

  /**
   * Get number of listeners for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(eventName) {
    if (!this.events.has(eventName)) return 0;
    return this.events.get(eventName).size;
  }

  /**
   * Remove all events and listeners
   */
  clear() {
    this.events.clear();
    this.onceCallbacks = new WeakMap();
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Common event names (can be extended by modules)
export const EVENTS = {
  // UI Events
  UI_READY: 'wtl:ui-ready',
  UI_CONFIG_CHANGED: 'wtl:ui-config-changed',
  UI_THEME_CHANGED: 'wtl:ui-theme-changed',
  
  // Memory Table Events
  MEMORY_TABLE_LOADED: 'wtl:memory-table-loaded',
  MEMORY_TABLE_UPDATED: 'wtl:memory-table-updated',
  MEMORY_TABLE_SAVED: 'wtl:memory-table-saved',
  MEMORY_TABLE_CLEARED: 'wtl:memory-table-cleared',
  
  // Editor Events
  TEMPLATE_EDITOR_OPENED: 'wtl:template-editor-opened',
  TEMPLATE_EDITOR_CLOSED: 'wtl:template-editor-closed',
  TABLE_EDITING_TOGGLED: 'wtl:table-editing-toggled',
  TABLE_CONTENT_CHANGED: 'wtl:table-content-changed',
  TABLE_CONTENT_SAVED: 'wtl:table-content-saved',
  TABLE_RESET_TO_TEMPLATE: 'wtl:table-reset-to-template',
  TEMPLATE_CONTENT_CHANGED: 'wtl:template-content-changed',
  SCHEMA_CONTENT_CHANGED: 'wtl:schema-content-changed',
  SCHEMA_CONTENT_SAVED: 'wtl:schema-content-saved',
  TEMPLATE_STATE_CHANGED: 'wtl:template-state-changed',
  HISTORY_RESTORED: 'wtl:history-restored',
  HISTORY_MODAL_OPENED: 'wtl:history-modal-opened',
  
  // Runtime Events
  BATCH_STARTED: 'wtl:batch-started',
  BATCH_COMPLETED: 'wtl:batch-completed',
  BATCH_ERROR: 'wtl:batch-error',
  BATCH_SETTINGS_CHANGED: 'wtl:batch-settings-changed',
  AUTO_REFRESH_TOGGLED: 'wtl:auto-refresh-toggled',
  WORLDBOOK_MODE_CHANGED: 'wtl:worldbook-mode-changed',
  OPENAI_MODELS_REFRESHED: 'wtl:openai-models-refreshed',
  
  // Page Events
  PAGE_CHANGED: 'wtl:page-changed',
  EXTERNAL_TAB_CHANGED: 'wtl:external-tab-changed',
  SEND_MODE_CHANGED: 'wtl:send-mode-changed',
  INST_MODE_CHANGED: 'wtl:inst-mode-changed',
  SCHEMA_MODE_CHANGED: 'wtl:schema-mode-changed',
  
  // Chat Manager Events
  CHAT_MANAGER_LOADED: 'wtl:chat-manager-loaded',
  CHAT_MANAGER_STATE_CHANGED: 'wtl:chat-manager-state-changed',
  CHAT_MANAGER_SHOWN: 'wtl:chat-manager-shown',
  CHAT_MANAGER_HIDDEN: 'wtl:chat-manager-hidden',
  CHAT_DATA_STATE_CHANGED: 'wtl:chat-data-state-changed',
  CHAT_UI_STATE_CHANGED: 'wtl:chat-ui-state-changed',
  CHAT_CHANGED: 'wtl:chat-changed',
  CHAT_OPENED: 'wtl:chat-opened',
  CHAT_ARCHIVED: 'wtl:chat-archived',
  CHAT_RESTORED: 'wtl:chat-restored',
  CHAT_SELECTED: 'wtl:chat-selected',
  CHAT_DELETED: 'wtl:chat-deleted',
  CHAT_RENAMED: 'wtl:chat-renamed',
  CHAT_TAGS_UPDATED: 'wtl:chat-tags-updated',
  CHAT_FILTER_CHANGED: 'wtl:chat-filter-changed',
  CHAT_SORT_CHANGED: 'wtl:chat-sort-changed',
  CHAT_SEARCH_CHANGED: 'wtl:chat-search-changed',
  CHAT_SEARCH_SUBMITTED: 'wtl:chat-search-submitted',
  CHATS_CHANGED: 'wtl:chats-changed',
  CHATS_FILTERED: 'wtl:chats-filtered',
  CHATS_SORTED: 'wtl:chats-sorted',
  CHATS_EXPORTED: 'wtl:chats-exported',
  CHAT_OPEN_REQUESTED: 'wtl:chat-open-requested',
  CHAT_DELETE_REQUESTED: 'wtl:chat-delete-requested',
  CHAT_ARCHIVE_REQUESTED: 'wtl:chat-archive-requested',
  CHAT_RESTORE_REQUESTED: 'wtl:chat-restore-requested',
  CHAT_EXPORT_REQUESTED: 'wtl:chat-export-requested',
  CHAT_OPERATION_ERROR: 'wtl:chat-operation-error',
  CHAT_OPERATION_QUEUED: 'wtl:chat-operation-queued',
  ALL_CHATS_SELECTED: 'wtl:all-chats-selected',
  ALL_CHATS_DESELECTED: 'wtl:all-chats-deselected',
  
  // Preset Events
  PRESET_LOADED: 'wtl:preset-loaded',
  PRESET_SAVED: 'wtl:preset-saved',
  PRESET_DELETED: 'wtl:preset-deleted',
  PRESET_CHANGED: 'wtl:preset-changed',
  
  // Configuration Events
  CONFIG_LOADED: 'wtl:config-loaded',
  CONFIG_CHANGED: 'wtl:config-changed',
  FEATURE_FLAGS_CHANGED: 'wtl:feature-flags-changed',
  
  // AI Service Events
  AI_CALL_STARTED: 'wtl:ai-call-started',
  AI_CALL_COMPLETED: 'wtl:ai-call-completed',
  AI_CALL_FAILED: 'wtl:ai-call-failed',
  
  // Storage Events
  STORAGE_CHANGED: 'wtl:storage-changed',
  STORAGE_SYNCED: 'wtl:storage-synced',
  
  // Error Events
  ERROR_OCCURRED: 'wtl:error-occurred',
  WARNING_SHOWN: 'wtl:warning-shown',
  
  // Global State Events
  APP_READY: 'wtl:app-ready',
  APP_SHUTDOWN: 'wtl:app-shutdown'
};

// Export the singleton instance and event names
export default eventBus;

// Helper functions for common patterns
export const EventBusHelpers = {
  /**
   * Wait for an event to occur
   * @param {string} eventName - Event name to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any[]>} Promise that resolves with event arguments
   */
  waitFor(eventName, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = timeout > 0 ? setTimeout(() => {
        eventBus.off(eventName, handler);
        reject(new Error(`Event "${eventName}" timed out after ${timeout}ms`));
      }, timeout) : null;
      
      const handler = (...args) => {
        if (timer) clearTimeout(timer);
        eventBus.off(eventName, handler);
        resolve(args);
      };
      
      eventBus.on(eventName, handler);
    });
  },

  /**
   * Emit an event and wait for a response
   * @param {string} eventName - Event name to emit
   * @param {any} data - Data to send with event
   * @param {string} responseEvent - Event name to wait for response
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} Promise that resolves with response data
   */
  emitAndWait(eventName, data, responseEvent, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = timeout > 0 ? setTimeout(() => {
        eventBus.off(responseEvent, handler);
        reject(new Error(`Response event "${responseEvent}" timed out after ${timeout}ms`));
      }, timeout) : null;
      
      const handler = (responseData) => {
        if (timer) clearTimeout(timer);
        eventBus.off(responseEvent, handler);
        resolve(responseData);
      };
      
      eventBus.on(responseEvent, handler);
      eventBus.emit(eventName, data);
    });
  },

  /**
   * Create a namespaced event bus for a specific module
   * @param {string} namespace - Namespace prefix
   * @returns {Object} Namespaced event bus interface
   */
  createNamespacedBus(namespace) {
    const prefix = `${namespace}:`;
    
    return {
      on(eventName, callback, options) {
        return eventBus.on(prefix + eventName, callback, options);
      },
      
      once(eventName, callback) {
        return eventBus.once(prefix + eventName, callback);
      },
      
      off(eventName, callback) {
        return eventBus.off(prefix + eventName, callback);
      },
      
      emit(eventName, ...args) {
        return eventBus.emit(prefix + eventName, ...args);
      },
      
      removeAllListeners(eventName) {
        return eventBus.removeAllListeners(prefix + eventName);
      },
      
      hasListeners(eventName) {
        return eventBus.hasListeners(prefix + eventName);
      },
      
      listenerCount(eventName) {
        return eventBus.listenerCount(prefix + eventName);
      }
    };
  }
};

// Initialize global event bus on window for backward compatibility
if (typeof window !== 'undefined' && !window.wtlEventBus) {
  window.wtlEventBus = eventBus;
}