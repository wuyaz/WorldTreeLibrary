// @ts-nocheck
/**
 * toast.js - 轻提示
 *
 * 跨功能通用。优先用酒馆自带 toastr，取不到时降级到 console。
 * 此前 chatManager / autoFillService / registerSettingsPanel 各写了一份，
 * 参数顺序还不一致（一个 (type, message)，另两个 (message, type)），
 * 这里统一为 (message, type)，并保留 toast(type, message) 给旧调用点。
 */

const DEFAULT_TITLE = '世界树图书馆';

function getToastr() {
  return window.toastr || window.parent?.toastr || null;
}

/**
 * 弹一条提示。
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} [type]
 * @param {string} [title]
 */
export function showToast(message, type = 'info', title = DEFAULT_TITLE) {
  try {
    const toastr = getToastr();
    const fn = toastr?.[type] || toastr?.info;
    if (typeof fn === 'function') {
      fn.call(toastr, message, title);
      return;
    }
  } catch (e) {
    // 取不到 toastr 就降级，不因为提示失败影响主流程
  }
  console.log(`[WTL ${type}] ${message}`);
}

/**
 * 兼容旧签名：(type, message)。
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {string} message
 * @param {string} [title]
 */
export function toast(type, message, title = DEFAULT_TITLE) {
  showToast(message, type, title);
}
