// @ts-nocheck
/**
 * ConfigStore.js - 配置存储器
 * 
 * 功能: 管理模板仓库、格式化规则（前后缀）、预设配置等全局配置数据。提供localStorage读写的封装和结构化访问接口。
 * 
 * 应该写入:
 * - 模板的CRUD操作（get/set/delete/list）
 * - 格式化规则的读写（表格前后缀、指令前后缀）
 * - localStorage的JSON读写封装
 * - 配置键的前缀管理（wtl.*）
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 业务逻辑处理
 * - AI调用逻辑
 * - 复杂的数据验证
 * 
 * 被使用:
 * - js/features/memoryTable/core/MemoryTableCore.js
 * - js/features/memoryTable/services/PromptGenerator.js
 * - js/features/memoryTable/services/SequenceBuilder.js
 * 
 * 使用文件:
 * - localStorage (持久化存储)
 * 
 * 注意:
 * - 所有配置键都以'wtl'为前缀
 * - JSON解析失败时返回null或空对象
 * - 格式化规则有默认值防止undefined
 */

export class ConfigStore {
  constructor() {
    this.prefix = 'wtl';
  }
  
  /**
   * 模板仓库
   */
  getTemplateStore() {
    return {
      get: (name) => {
        const templates = this.getJson('templates') || {};
        return templates[name] || null;
      },
      
      set: (name, template) => {
        const templates = this.getJson('templates') || {};
        templates[name] = template;
        this.setJson('templates', templates);
      },
      
      delete: (name) => {
        const templates = this.getJson('templates') || {};
        delete templates[name];
        this.setJson('templates', templates);
      },
      
      list: () => {
        const templates = this.getJson('templates') || {};
        return Object.keys(templates);
      }
    };
  }
  
  /**
   * 格式化规则区（自定义前后缀）
   */
  getFormatRules() {
    return {
      getTablePrefix: () => {
        return this.get('format.tablePrefix') || '[Memory Table Start]';
      },
      
      setTablePrefix: (prefix) => {
        this.set('format.tablePrefix', prefix);
      },
      
      getTableSuffix: () => {
        return this.get('format.tableSuffix') || '[Memory Table End]';
      },
      
      setTableSuffix: (suffix) => {
        this.set('format.tableSuffix', suffix);
      },
      
      getInstructionPrefix: () => {
        return this.get('format.instructionPrefix') || '';
      },
      
      setInstructionPrefix: (prefix) => {
        this.set('format.instructionPrefix', prefix);
      },
      
      getInstructionSuffix: () => {
        return this.get('format.instructionSuffix') || '';
      },
      
      setInstructionSuffix: (suffix) => {
        this.set('format.instructionSuffix', suffix);
      }
    };
  }
  
  /**
   * 作用域模板绑定
   */
  getScopeBindings() {
    return {
      get: (scope, id) => {
        const bindings = this.getJson('scopeBindings') || {};
        return bindings[scope]?.[id] || null;
      },
      
      set: (scope, id, templateName) => {
        const bindings = this.getJson('scopeBindings') || {};
        if (!bindings[scope]) bindings[scope] = {};
        bindings[scope][id] = templateName;
        this.setJson('scopeBindings', bindings);
      },
      
      delete: (scope, id) => {
        const bindings = this.getJson('scopeBindings') || {};
        if (bindings[scope]) {
          delete bindings[scope][id];
          this.setJson('scopeBindings', bindings);
        }
      }
    };
  }
  
  /**
   * 基础存储方法
   */
  get(key) {
    return localStorage.getItem(`${this.prefix}.${key}`);
  }
  
  set(key, value) {
    localStorage.setItem(`${this.prefix}.${key}`, value);
  }
  
  getJson(key) {
    const value = this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('[ConfigStore] Failed to parse JSON:', e);
      return null;
    }
  }
  
  setJson(key, value) {
    this.set(key, JSON.stringify(value));
  }
  
  delete(key) {
    localStorage.removeItem(`${this.prefix}.${key}`);
  }
}
