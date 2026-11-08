// @ts-nocheck
/**
 * escape.js - HTML 转义
 *
 * 跨功能通用。任何要把变量拼进 innerHTML / 模板字符串的地方都应该用它。
 * 此前 chatManager 与 memoryTable 各自复制了 5-6 份实现，任一处漏改就会出现不一致的转义行为。
 */

/**
 * 把任意值转义为可安全插入 HTML 的文本。
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 转义后把换行转成 <br>，用于多行文本展示。
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtmlWithBreaks(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}
