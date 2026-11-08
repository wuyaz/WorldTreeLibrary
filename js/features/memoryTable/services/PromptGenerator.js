// @ts-nocheck
/**
 * PromptGenerator.js - 提示词生成器
 * 
 * 功能: 根据模板和表格数据生成AI能理解的填表提示词，包括指令说明、表格范式、当前内容、命令语法、破限提示等部分。
 * 
 * 预设文件加载路径:
 * - preprompt.json → 破限提示（默认预设）
 * - instruction.json → 填表指令（默认预设）
 * - schema.json → 表格模板（默认预设）
 * 
 * 组装规则:
 * - 破限提示: 直接使用 preprompt.json 中"默认"预设的内容（数组按行拼接）
 * - 填表指令: 使用 instruction.json 中"默认"预设的内容 + 模板章节/列定义动态生成
 * - 表格模板: 使用 schema.json 中"默认"预设的内容（JSON模板结构）
 * - 表格内容: 使用 TableSerializer 序列化当前表格数据
 * 
 * 被使用:
 * - js/features/memoryTable/core/MemoryTableCore.js
 * 
 * 使用文件:
 * - js/features/memoryTable/core/TableSerializer.js (表格序列化)
 * - assets/presets/preprompt.json (破限提示预设)
 * - assets/presets/instruction.json (填表指令预设)
 * - assets/presets/schema.json (表格模板预设)
 */

import { TableSerializer } from '../core/TableSerializer.js';

export class PromptGenerator {
  constructor(configStore) {
    this.configStore = configStore;
  }

  /**
   * 从 window.__WTL_PRESETS__ 获取预设内容
   * 预设文件在加载时被注入到 window.__WTL_PRESETS__ 中
   */
  _getPreset(group, name = '默认') {
    try {
      const presets = window.__WTL_PRESETS__?.[group];
      if (!presets) return null;
      const preset = presets[name];
      if (!preset) return null;
      // 预设可能是数组（按行分割）或字符串
      return Array.isArray(preset) ? preset.join('\n') : String(preset);
    } catch (e) {
      console.warn('[PromptGenerator] Failed to get preset', group, name, e);
      return null;
    }
  }

  /**
   * 生成破限提示
   * 从 preprompt.json 的"默认"预设加载
   */
  generatePreprompt(customPreprompt = '') {
    // 如果有自定义破限提示，优先使用
    if (customPreprompt && customPreprompt.trim()) {
      return customPreprompt;
    }
    
    // 从预设加载
    const preset = this._getPreset('preprompt');
    if (preset) return preset;
    
    // 兜底默认值
    return `你是一个专业的记忆表格维护助手。请严格按照指令格式操作表格，不要输出任何额外内容。`;
  }

  /**
   * 生成填表指令
   * 使用 instruction.json 的"默认"预设作为基础，结合模板章节/列定义动态生成
   */
  generateInstruction(template) {
    const sections = template?.sections || [];
    
    // 从 instruction.json 加载基础指令预设
    const baseInstruction = this._getPreset('instruction');
    
    let instruction = '';
    
    if (baseInstruction) {
      // 使用预设内容作为基础
      instruction = baseInstruction + '\n\n';
    } else {
      // 无预设时的兜底
      instruction = '请根据以下规则维护记忆表格：\n\n';
    }
    
    // 动态生成模板章节定义（追加到预设内容之后）
    if (sections.length > 0) {
      instruction += '# 当前表格章节定义\n\n';
      
      sections.forEach((section, idx) => {
        const sectionNum = idx + 1;
        const sectionName = section?.name || `表格${sectionNum}`;
        const columns = section?.columns || [];
        
        instruction += `## ${sectionNum}. ${sectionName}\n`;
        instruction += `表格编号：${sectionNum}\n`;
        instruction += `列定义：\n`;
        
        columns.forEach((col, colIdx) => {
          const colName = col?.name || `列${colIdx + 1}`;
          const definition = col?.definition || '';
          
          instruction += `  ${colIdx + 1}. ${colName}`;
          if (definition) {
            instruction += `：${definition}`;
          }
          instruction += '\n';
        });
        
        // 添加条件规则
        if (section.insertRule) {
          instruction += `\n增加条件：${section.insertRule}\n`;
        }
        
        if (section.updateRule) {
          instruction += `修改条件：${section.updateRule}\n`;
        }
        
        if (section.deleteRule) {
          instruction += `删除条件：${section.deleteRule}\n`;
        }
        
        instruction += '\n';
      });
    }
    
    // 追加命令语法说明
    instruction += this.generateCommandSyntax();
    
    return instruction;
  }

  /**
   * 生成表格范式说明
   * 使用 schema.json 的"默认"预设中的模板结构
   */
  generateSchema(tableData) {
    const sections = tableData?.sections || [];
    
    // 从 schema.json 加载模板预设
    const schemaPreset = this._getPreset('schema');
    
    let schema = '';
    
    if (schemaPreset) {
      // 使用预设模板内容
      schema = schemaPreset + '\n\n';
    }
    
    // 追加当前表格结构说明
    schema += '# 当前表格结构\n\n';
    
    sections.forEach((section, idx) => {
      const sectionNum = idx + 1;
      const sectionName = section?.name || `表格${sectionNum}`;
      const columns = section?.columns || [];
      
      schema += `表格${sectionNum}：${sectionName}\n`;
      schema += `列：${columns.map(c => c.name || '未命名').join('、')}\n\n`;
    });
    
    return schema;
  }

  /**
   * 生成当前表格内容
   */
  generateTableContent(tableData) {
    return TableSerializer.serialize(tableData);
  }

  /**
   * 生成命令语法说明
   */
  generateCommandSyntax() {
    return `
命令格式说明：

1. 更新单元格：
   update[section, row, col(value), col(value), ...]
   示例：update[1, 1, 2("苹果"), 3("香蕉")]

2. 插入行：
   insert[section, row, col(value), col(value), ...]
   或：insert[section, row, value1, value2, ...]

3. 删除行：
   delete[section, row]

4. 隐藏/显示行：
   hide[section, row, true|false]

5. 交换行：
   move[section, from, to]

请将命令包裹在 <WTL_TableEdit> 标签中。
`;
  }
}
