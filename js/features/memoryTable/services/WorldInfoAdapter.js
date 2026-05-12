// @ts-nocheck
/**
 * WorldInfoAdapter.js - 世界书适配器
 * 
 * 功能: 从SillyTavern系统安全地获取世界书数据，支持Auto模式（获取已激活条目）和Manual模式（获取全量条目）。提供数据格式化和覆盖配置应用。
 * 
 * 应该写入:
 * - Auto模式下激活世界书的获取
 * - Manual模式下全量世界书的获取
 * - 世界书数据的标准化格式化
 * - 覆盖配置的应用（depth/position/order）
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 数据修改操作（只读）
 * - AI调用逻辑（应在aiService.js）
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/services/referenceService.js
 * - js/features/memoryTable/controllers/MemoryTableFeature.js
 * 
 * 使用文件:
 * - window.ST_API.worldInfo (SillyTavern世界书API，通过构造函数注入)
 * 
 * 注意:
 * - ST_API不可用时返回空数组并警告
 * - 所有字段都有默认值防止undefined
 * - 覆盖配置仅替换指定字段，保留其他原始值
 */

export class WorldInfoAdapter {
  constructor(ST_API) {
    this.ST_API = ST_API;
  }
  
  /**
   * Auto Mode (继承模式)
   * 获取当前回合被激活的世界书
   */
  async getActivatedWorldInfo() {
    if (!this.ST_API?.worldInfo?.getActivated) {
      console.warn('[WorldInfoAdapter] ST_API not available');
      return [];
    }
    
    try {
      const activated = await this.ST_API.worldInfo.getActivated();
      return this.normalizeWorldInfo(activated);
    } catch (e) {
      console.error('[WorldInfoAdapter] Failed to get activated world info:', e);
      return [];
    }
  }
  
  /**
   * Manual Mode (劫持模式)
   * 获取全量世界书列表
   */
  async getAllWorldInfo() {
    if (!this.ST_API?.worldInfo?.getAll) {
      console.warn('[WorldInfoAdapter] ST_API not available');
      return [];
    }
    
    try {
      const all = await this.ST_API.worldInfo.getAll();
      return this.normalizeWorldInfo(all);
    } catch (e) {
      console.error('[WorldInfoAdapter] Failed to get all world info:', e);
      return [];
    }
  }
  
  /**
   * 格式化世界书数据
   */
  normalizeWorldInfo(rawData) {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map(entry => ({
      key: entry.key || '',
      keysecondary: entry.keysecondary || '',
      comment: entry.comment || '',
      content: entry.content || '',
      constant: entry.constant || false,
      selective: entry.selective || false,
      order: entry.order || 0,
      position: entry.position || 0,
      disable: entry.disable || false,
      excludeRecursion: entry.excludeRecursion || false,
      preventRecursion: entry.preventRecursion || false,
      delayUntilRecursion: entry.delayUntilRecursion || false,
      probability: entry.probability || 100,
      useProbability: entry.useProbability || false,
      depth: entry.depth || 4,
      selectivityLogic: entry.selectivityLogic || 0,
      group: entry.group || '',
      groupOverride: entry.groupOverride || false,
      groupWeight: entry.groupWeight || 100,
      scanDepth: entry.scanDepth || null,
      caseSensitive: entry.caseSensitive || null,
      matchWholeWords: entry.matchWholeWords || null,
      automationId: entry.automationId || '',
      role: entry.role || 0,
      vectorized: entry.vectorized || false
    }));
  }
  
  /**
   * 应用覆盖配置（Manual模式）
   */
  applyOverrideConfig(entries, config) {
    return entries.map(entry => ({
      ...entry,
      depth: config.depth ?? entry.depth,
      position: config.position ?? entry.position,
      order: config.order ?? entry.order
    }));
  }
}
