/**
 * 调试弹窗工具 - 受 featureFlags.debugMode 控制
 * 开启后 alert 弹窗，关闭后静默
 */
import { getFeatureFlags } from '../../core/storage.js';

/**
 * 调试弹窗，仅在 debugMode 开启时弹出 alert
 * @param {string} message - 弹窗消息
 */
export function debugAlert(message) {
  const flags = getFeatureFlags();
  if (flags.debugMode === true) {
    alert(message);
  }
}