// @ts-nocheck
/**
 * PromptGenerator.js - 提示词生成器
 * 
 * 功能: 根据模板和表格数据生成AI能理解的填表提示词，包括指令说明、表格范式、当前内容、命令语法、破限提示等部分。
 * 
 * 应该写入:
 * - 填表指令的生成（基于模板的章节和列定义）
 * - 表格范式的生成（结构说明）
 * - 当前表格内容的序列化
 * - 命令语法的说明文档
 * - 破限提示的生成或自定义
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - AI调用逻辑（应在aiService.js）
 * - 命令解析逻辑（应在CommandParser.js）
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/MemoryTableFeature.js
 * 
 * 使用文件:
 * - js/features/memoryTable/core/TableSerializer.js (表格序列化)
 * 
 * 注意:
 * - 指令中的表格编号从1开始
 * - 命令语法说明需与实际解析器保持一致
 * - 空定义会显示默认占位符
 */

import { TableSerializer } from '../core/TableSerializer.js';

export class PromptGenerator {
  constructor(configStore) {
    this.configStore = configStore;
  }
  
  /**
   * 生成填表指令
   */
  generateInstruction(template) {
    const sections = template?.sections || [];
    
    let instruction = '请根据以下规则维护记忆表格：\n\n';
    
    sections.forEach((section, idx) => {
      const sectionNum = idx + 1;
      const sectionName = section?.name || `表格${sectionNum}`;
      const columns = section?.columns || [];
      
      instruction += `## ${sectionName}\n`;
      instruction += `表格编号：${sectionNum}\n`;
      instruction += `列定义：\n`;
      
      columns.forEach((col, colIdx) => {
        const colName = col?.name || `列${colIdx + 1}`;
        const definition = col?.definition || '';
        
        instruction += `${colIdx + 1}. ${colName}`;
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
    
    instruction += this.generateCommandSyntax();
    
    return instruction;
  }
  
  /**
   * 生成表格范式说明
   */
  generateSchema(tableData) {
    const sections = tableData?.sections || [];
    
    let schema = '当前表格结构：\n\n';
    
    sections.forEach((section, idx) => {
      const sectionNum = idx + 1;
      const sectionName = section?.name || `表格${sectionNum}`;
      const columns = section?.columns || [];
      
      schema += `表格${sectionNum}：${sectionName}\n`;
      schema += `列：${columns.join('、')}\n\n`;
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
   update[section,row,col:value,...]
   示例：update[1,1,2:"苹果",3:"香蕉"]

2. 插入行：
   insert[section,row,col:value,...]
   或：insert[section,row,value1,value2,...]

3. 删除行：
   delete[section,row]

4. 隐藏/显示行：
   hide[section,row,true|false]

5. 交换行：
   move[section,from,to]

请将命令包裹在 <WTL_TableEdit> 标签中。
`;
  }
  
  /**
   * 生成破限提示
   */
  generatePreprompt(customPreprompt = '') {
    if (customPreprompt) {
      return customPreprompt;
    }
    
    return `你是一个专业的记忆表格维护助手。请严格按照指令格式操作表格，不要输出任何额外内容。`;
  }
}
