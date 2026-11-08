// @ts-nocheck
/**
 * download.js - 文件下载
 *
 * 跨功能通用。此前 downloadJsonFile 在 memoryTable 里有两份
 * （ui/history.js 的导出、presetController.js 的类方法），逻辑一致但各改各的。
 */

/**
 * 触发浏览器下载一个 JSON 文件。
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data ?? {}, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

/**
 * 下载一段已经序列化好的 JSON 文本。
 * @param {string} filename
 * @param {string} jsonString
 */
export function downloadJsonString(filename, jsonString) {
  triggerDownload(new Blob([jsonString ?? '{}'], { type: 'application/json' }), filename);
}

/**
 * 触发浏览器下载一个纯文本文件。
 * @param {string} filename
 * @param {string} text
 * @param {string} [mime]
 */
export function downloadTextFile(filename, text, mime = 'text/plain;charset=utf-8') {
  triggerDownload(new Blob([text ?? ''], { type: mime }), filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 部分浏览器在 click 后立刻 revoke 会中断下载，延后释放
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
