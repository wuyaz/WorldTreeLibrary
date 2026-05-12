// @ts-nocheck
/**
 * schemaHelper.js - Schema辅助工具服务
 * 
 * 功能: 提供Schema预设的加载、解析、作用域管理工具函数。支持全局/角色/聊天三级作用域的Schema绑定和解析，提供默认章节和列内容的获取。
 * 
 * 应该写入:
 * - Schema预设的加载和解析逻辑
 * - 作用域解析（global/character/chat）
 * - 默认Schema文本的获取
 * - 默认章节和列内容的提取
 * - 可用预设列表的获取
 * - 扩展根路径的解析
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - AI调用逻辑（应在aiService.js）
 * - 底层存储读写实现（应通过localStorage API）
 * - 复杂的数据转换算法（应在data层）
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/presetController.js
 * - js/features/memoryTable/controllers/editorController.js
 * - js/features/memoryTable/services/chatStateService.js
 * 
 * 使用文件:
 * - js/shared/utils/index.js (JSON解析工具)
 * - js/features/memoryTable/data/template.js (Schema解析)
 * - localStorage (预设存储)
 * 
 * 注意:
 * - 作用域优先级：chat > character > global
 * - 预设数据可以是数组或字符串格式
 * - import.meta.url不可用时回退到硬编码路径
 */

import { safeParseJson } from '../../../shared/utils/index.js';
import { parseSchemaToTemplate } from '../data/template.js';

function getChatKeyFromContext(ctx) {
  return ctx?.chatId || ctx?.chat?.id || ctx?.chat?.file || ctx?.chat?.name || 'default';
}

function parseSchemaPreset(presetData) {
  if (!presetData) return '';
  
  if (Array.isArray(presetData)) {
    return presetData.join('\n');
  }
  
  if (typeof presetData === 'string') {
    return presetData;
  }
  
  return '';
}

function resolveExtRoot() {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const url = new URL(".", import.meta.url);
      if (url.pathname.endsWith("/js/features/memoryTable/services/")) {
        url.pathname = url.pathname.replace(/\/js\/features\/memoryTable\/services\/$/, "/");
      } else if (url.pathname.endsWith("/js/")) {
        url.pathname = url.pathname.replace(/\/js\/$/, "/");
      }
      return url.href.replace(/\/$/, "");
    }
  } catch (err) {
    console.warn("[SchemaHelper] resolveExtRoot import.meta failed", err);
  }
  return "/scripts/extensions/third-party/WorldTreeLibrary";
}

/**
 * 获取默认Schema文本
 */
export function getDefaultSchemaText() {
  try {
    // 优先从localStorage读取
    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    const active = localStorage.getItem('wtl.schema.presetActive') || '默认';
    
    if (presets[active]) {
      return parseSchemaPreset(presets[active]);
    }
    
    if (presets['默认']) {
      return parseSchemaPreset(presets['默认']);
    }
    
    // 从全局预设读取
    if (window.__WTL_PRESETS__?.schema) {
      const schemaPresets = window.__WTL_PRESETS__.schema;
      
      // 尝试读取默认预设
      if (schemaPresets['默认'] || schemaPresets.default) {
        const preset = schemaPresets['默认'] || schemaPresets.default;
        return parseSchemaPreset(preset);
      }
      
      // 如果没有默认预设，尝试读取第一个预设
      const firstKey = Object.keys(schemaPresets)[0];
      if (firstKey && schemaPresets[firstKey]) {
        return parseSchemaPreset(schemaPresets[firstKey]);
      }
    }
    
    return '';
  } catch (error) {
    console.error('[SchemaHelper] Failed to get default schema:', error);
    return '';
  }
}

/**
 * 根据作用域解析Schema
 */
export function resolveSchemaByScope(ctx) {
  try {
    const chatId = getChatKeyFromContext(ctx);
    const charId = ctx?.characterId || '';
    
    const scopedPresets = safeParseJson(localStorage.getItem('wtl.schema.presetsByScope')) || {};
    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    
    // 检查聊天级别绑定
    const chatName = scopedPresets?.chat?.[chatId];
    if (chatName && presets[chatName]) {
      return { 
        scope: 'chat', 
        name: chatName, 
        text: parseSchemaPreset(presets[chatName]) 
      };
    }
    
    // 检查角色级别绑定
    const charName = scopedPresets?.character?.[charId];
    if (charName && presets[charName]) {
      return { 
        scope: 'character', 
        name: charName, 
        text: parseSchemaPreset(presets[charName]) 
      };
    }
    
    // 使用全局绑定
    const globalName = scopedPresets?.global || localStorage.getItem('wtl.schema.presetActive') || '默认';
    const globalText = presets[globalName] ? 
      parseSchemaPreset(presets[globalName]) : 
      (presets['默认'] ? parseSchemaPreset(presets['默认']) : getDefaultSchemaText());
    
    return { 
      scope: 'global', 
      name: globalName || '默认', 
      text: globalText || '' 
    };
  } catch (error) {
    console.error('[SchemaHelper] Failed to resolve schema by scope:', error);
    return { scope: 'global', name: '默认', text: '' };
  }
}

/**
 * 加载指定模式的Schema
 */
export function loadSchemaForMode(mode, ctx) {
  const resolved = resolveSchemaByScope(ctx);
  return resolved?.text || getDefaultSchemaText();
}

/**
 * 获取特定章节的默认预设内容
 */
export function getDefaultSectionContent(sectionIndex = 0) {
  try {
    const defaultSchema = getDefaultSchemaText();
    if (defaultSchema) {
      const template = parseSchemaToTemplate(defaultSchema);
      if (template.sections && template.sections.length > sectionIndex) {
        const section = template.sections[sectionIndex];
        return {
          name: section.name || '未命名',
          definition: section.definition || '',
          insertRule: section.insertRule || '',
          updateRule: section.updateRule || '',
          deleteRule: section.deleteRule || ''
        };
      }
    }
    
    // 如果没有预设内容，返回默认值
    return {
      name: '角色档案',
      definition: '此表格是角色档案与角色关系的核心数据库，用于记录所有在故事中出现的角色的信息（包括主角user），以便任何角色都能在长期离场后重新出现，仅记录长期不变的信息，**需要记录所有出场过的角色**。',
      insertRule: '- 当任何一个有名有姓的角色首次出现，必须为其创建新的一行。\n- 若有一些未知内容，必须填写"暂无"而不是瞎编。\n- 可以进行增删操作以调整条目顺序，主角团尽量排列在最前。',
      updateRule: '- 一般情况下永远不修改！\n- 信息补充：角色出现新的喜好等情况，补充内容，不要删除原本的内容。\n- 错误纠正：检查信息是否有误，若有错误立即修改。',
      deleteRule: '- 仅当用户要求删除时删除。\n- 可以进行增删操作以调整条目顺序，主角团尽量排列在最前。'
    };
  } catch (error) {
    console.error('[SchemaHelper] Failed to get default section content:', error);
    return null;
  }
}

/**
 * 获取特定列的默认预设内容
 */
export function getDefaultColumnContent(sectionIndex = 0, columnIndex = 0) {
  try {
    const defaultSchema = getDefaultSchemaText();
    if (defaultSchema) {
      const template = parseSchemaToTemplate(defaultSchema);
      if (template.sections && template.sections.length > sectionIndex) {
        const section = template.sections[sectionIndex];
        if (section.columns && section.columns.length > columnIndex) {
          const column = section.columns[columnIndex];
          return {
            name: column.name || '列',
            definition: column.definition || '',
            insertRule: column.insertRule || '',
            updateRule: column.updateRule || '',
            deleteRule: column.deleteRule || ''
          };
        }
      }
    }
    
    // 如果没有预设内容，返回默认值
    return {
      name: '列名称',
      definition: '列的定义和说明',
      insertRule: '',
      updateRule: '',
      deleteRule: ''
    };
  } catch (error) {
    console.error('[SchemaHelper] Failed to get default column content:', error);
    return null;
  }
}
export function getAvailableSchemaPresets() {
  try {
    const presets = safeParseJson(localStorage.getItem('wtl.schema.presets')) || {};
    return Object.keys(presets);
  } catch (error) {
    console.error('[SchemaHelper] Failed to get available presets:', error);
    return [];
  }
}

/**
 * 加载Schema预设文件
 */
export async function loadSchemaPresetsFromFile() {
  try {
    const extRoot = resolveExtRoot();
    const url = `${extRoot}/assets/presets/schema.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load schema presets');
    }
    return await response.json();
  } catch (error) {
    console.error('[SchemaHelper] Failed to load schema presets from file:', error);
    return {};
  }
}
