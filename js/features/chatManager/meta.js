// @ts-nocheck
/**
 * chatManager 功能元信息
 *
 * 这个功能自己往欢迎页注入容器，不需要顶部页签，
 * 所以没有 registerUI —— 挂载在 ChatManagerController 里完成。
 */

import { ChatManagerFeature } from './controllers/ChatManagerFeature.js';

export default {
  id: 'chatManager',
  name: '聊天管理',
  description: '欢迎页聊天管理器：分组、标签、批量整理与快速跳转。',
  order: 20,

  create(options = {}) {
    return new ChatManagerFeature(options);
  },
};
