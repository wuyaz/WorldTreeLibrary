// @ts-nocheck
/**
 * memoryTable 功能元信息
 *
 * 新增功能只需要在 features/ 下建目录 + 写一份 meta.js，再到 registry.js 里挂一行。
 * main.js 不感知具体功能。
 */

import { MemoryTableFeature } from './controllers/MemoryTableFeature.js';
import { registerTopTab } from '../../shared/sillytavern/registerTopTab.js';

const PANEL_HTML_URL = '/scripts/extensions/third-party/WorldTreeLibrary/assets/html/main-panel.html';

export default {
  id: 'memoryTable',
  name: '记忆表格',
  description: '记忆表格主工作台、填表页签与自动填表。',
  order: 10,

  create(options = {}) {
    return new MemoryTableFeature(options);
  },

  /** 挂载点：顶部设置抽屉。 */
  async registerUI({ instance, ctx, defaults }) {
    if (!instance) return null;
    return registerTopTab({
      loadHtml: async () => {
        const res = await fetch(PANEL_HTML_URL);
        return await res.text();
      },
      onOpen: (root) => instance.initializeUI(root, ctx, defaults),
    });
  },
};
