// @ts-nocheck
/**
 * Asset Loader for World Tree Library
 * Handles loading of CSS, HTML templates, and JSON assets with caching
 */

import { resolveExtRoot } from './assets.js';

// Cache for loaded assets
const assetCache = new Map();
const cssCache = new Map();

/**
 * Load an asset from the server
 * @param {string} path - Asset path relative to extension root
 * @param {string} type - MIME type or file type ('json', 'text', 'html')
 * @returns {Promise<any>} Promise resolving to the loaded asset
 */
export async function loadAsset(path, type = 'text') {
  const cacheKey = `${path}:${type}`;
  
  // Check cache first
  if (assetCache.has(cacheKey)) {
    return assetCache.get(cacheKey);
  }
  
  const extRoot = resolveExtRoot();
  
  try {
    const url = `${extRoot}/${path.replace(/^\//, '')}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load asset: ${path} (${response.status})`);
    }
    
    let data;
    switch (type) {
      case 'json':
        data = await response.json();
        break;
      case 'html':
      case 'text':
      default:
        data = await response.text();
        break;
    }
    
    // Cache the result
    assetCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`[WTL AssetLoader] Failed to load asset ${path}:`, error);
    throw error;
  }
}

/**
 * Load CSS file and inject it into the document
 * @param {string} path - CSS file path relative to extension root
 * @param {string} id - Optional ID for the style element
 * @returns {Promise<HTMLStyleElement>} Promise resolving to the style element
 */
export async function loadCSS(path, id = null) {
  const cacheKey = id || path;
  
  // Check if already loaded
  if (cssCache.has(cacheKey)) {
    return cssCache.get(cacheKey);
  }
  
  try {
    const css = await loadAsset(path, 'text');
    const styleId = id || `wtl-style-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    // Remove existing style with same ID
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create and inject style element
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // Cache the style element
    cssCache.set(cacheKey, styleEl);
    
    // Dispatch event for CSS loaded
    window.dispatchEvent(new CustomEvent('wtl:css-loaded', {
      detail: { path, id: styleId }
    }));
    
    return styleEl;
  } catch (error) {
    console.error(`[WTL AssetLoader] Failed to load CSS ${path}:`, error);
    throw error;
  }
}

/**
 * Load HTML template
 * @param {string} path - HTML file path relative to assets directory
 * @returns {Promise<string>} Promise resolving to HTML string
 */
export async function loadHTMLTemplate(path) {
  const fullPath = `assets/${path.replace(/^assets\//, '')}`;
  return loadAsset(fullPath, 'html');
}

/**
 * Load JSON configuration
 * @param {string} path - JSON file path relative to assets directory
 * @returns {Promise<object>} Promise resolving to JSON object
 */
export async function loadJSONConfig(path) {
  const fullPath = `assets/${path.replace(/^assets\//, '')}`;
  return loadAsset(fullPath, 'json');
}

/**
 * Load all CSS modules
 * @returns {Promise<HTMLStyleElement[]>} Promise resolving to array of style elements
 */
export async function loadAllCSSModules() {
  const modules = [
    'assets/css/wtl-global.css',
    'assets/css/wtl-table.css',
    'assets/css/wtl-chat.css'
  ];
  
  const results = [];
  
  for (const module of modules) {
    try {
      const styleEl = await loadCSS(module);
      results.push(styleEl);
    } catch (error) {
      console.warn(`[WTL AssetLoader] Failed to load CSS module ${module}:`, error);
    }
  }
  
  return results;
}

/**
 * Preload critical assets
 * @returns {Promise<void>}
 */
export async function preloadCriticalAssets() {
  const criticalAssets = [
    { path: 'assets/defaults.json', type: 'json' },
    { path: 'assets/css/wtl-global.css', type: 'text' },
    { path: 'assets/css/wtl-global.css', type: 'text' }
  ];
  
  const promises = criticalAssets.map(async ({ path, type }) => {
    try {
      await loadAsset(path, type === 'json' ? 'json' : 'text');
    } catch (error) {
      console.warn(`[WTL AssetLoader] Failed to preload ${path}:`, error);
    }
  });
  
  await Promise.allSettled(promises);
}

/**
 * Clear asset cache
 * @param {string} path - Optional specific path to clear
 */
export function clearCache(path = null) {
  if (path) {
    // Clear specific path
    for (const [key] of assetCache) {
      if (key.startsWith(`${path}:`)) {
        assetCache.delete(key);
      }
    }
    
    for (const [key] of cssCache) {
      if (key === path || key.startsWith(`wtl-style-${path.replace(/[^a-zA-Z0-9]/g, '-')}`)) {
        const styleEl = cssCache.get(key);
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
        cssCache.delete(key);
      }
    }
  } else {
    // Clear all caches
    assetCache.clear();
    
    // Remove all style elements
    for (const [key, styleEl] of cssCache) {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    }
    cssCache.clear();
  }
}

/**
 * Check if asset is cached
 * @param {string} path - Asset path
 * @param {string} type - Asset type
 * @returns {boolean} True if asset is cached
 */
export function isCached(path, type = 'text') {
  return assetCache.has(`${path}:${type}`);
}

/**
 * Get cached asset
 * @param {string} path - Asset path
 * @param {string} type - Asset type
 * @returns {any} Cached asset or undefined
 */
export function getCachedAsset(path, type = 'text') {
  return assetCache.get(`${path}:${type}`);
}

/**
 * Ensure WTL styles are loaded (compatibility with old API)
 * @returns {Promise<void>}
 */
export async function ensureWtlStyle() {
  try {
    // Load main CSS
    await loadCSS('wtl.css', 'wtl-inline-style');
    
    // Load CSS modules
    await loadAllCSSModules();
  } catch (error) {
    console.warn('[WTL AssetLoader] Failed to load WTL styles:', error);
  }
}

// Export the original functions for backward compatibility
export { loadDefaults, loadPreset, loadHtml } from './assets.js';