// @ts-nocheck
/**
 * registry.js - 功能注册表
 *
 * 这里是"世界树图书馆包含哪些功能"的唯一清单。
 * 新增功能：建 features/<id>/ 目录，写 meta.js，然后在下面的 import 和数组里各加一行。
 * main.js、设置面板、顶部页签都不需要改。
 *
 * meta 字段约定：
 *   id            必填，同时作为 featureFlags 里的开关键
 *   name          显示名
 *   description   设置面板里的说明
 *   order         初始化顺序，小的先
 *   create()      返回功能实例（需具备 initialize / setEnabled / destroy）
 *   registerUI()  可选。需要注册挂载点时实现，参数 { instance, ctx, defaults }
 */

import memoryTable from './memoryTable/meta.js';
import chatManager from './chatManager/meta.js';

export const FEATURES = [memoryTable, chatManager].sort(
  (a, b) => (a.order ?? 100) - (b.order ?? 100)
);

/**
 * 按 id 取功能元信息。
 * @param {string} id
 */
export function getFeatureMeta(id) {
  return FEATURES.find((meta) => meta.id === id) || null;
}

/** 全部功能 id。 */
export function getFeatureIds() {
  return FEATURES.map((meta) => meta.id);
}
