// UI 绑定与交互逻辑（从 main.js 抽离）
// @ts-nocheck
/**
 * UI Bindings for World Tree Library (Bridge for backward compatibility)
 * This file provides a lightweight wrapper that delegates to the new modular architecture
 */

import { bindWorldTreeUi as bindWorldTreeUiNew } from '../controllers/MemoryTableFeature.js';

// Maintain backward compatibility with existing code
export function bindWorldTreeUi({ root, ctx, defaults }) {
  // Delegate to the new implementation for backward compatibility
  return bindWorldTreeUiNew({ root, ctx, defaults });
}

// Export helper functions that might be used by other modules

