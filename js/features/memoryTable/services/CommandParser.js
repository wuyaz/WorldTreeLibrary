// @ts-nocheck
/**
 * CommandParser.js - 命令解析器
 * 
 * 功能: 从AI回复文本中解析出标准的表格编辑命令，支持update/delete/insert/hide/move五种操作类型。提供容错和修正逻辑，处理引号、括号嵌套、中英文冒号等边界情况。
 * 
 * 应该写入:
 * - 命令文本的提取（从WTL_TableEdit标签或纯文本）
 * - 命令行的解析和参数分割
 * - 五种命令类型的解析逻辑
 * - 单元格键值对的解析
 * - 布尔值和索引的验证
 * - 引号去除和转义处理
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 命令执行逻辑（应在MutationExecutor.js）
 * - AI调用逻辑（应在aiService.js）
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/MemoryTableFeature.js
 * 
 * 使用文件:
 * - 无外部依赖（纯工具类）
 * 
 * 注意:
 * - 命令格式：type[section,row,...]
 * - 索引从1开始，负数和0会被拒绝
 * - 参数分割考虑引号和括号嵌套
 * - 支持中英文冒号作为键值分隔符
 */

export class CommandParser {
  /**
   * 从文本中提取编辑内容
   */
  static extractEditPayload(text) {
    if (!text) return '';
    
    const match = text.match(/<WTL_TableEdit>([\s\S]*?)<\/WTL_TableEdit>/);
    return match ? match[1].trim() : text;
  }
  
  /**
   * 解析命令列表
   */
  static parse(text) {
    const raw = this.extractEditPayload(text);
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const commands = [];
    
    for (const line of lines) {
      const cmd = this.parseLine(line);
      if (cmd) {
        commands.push(cmd);
      }
    }
    
    return commands;
  }
  
  /**
   * 解析单行命令
   */
  static parseLine(line) {
    const match = /^(update|delete|insert|hide|move)\[(.*)\]$/.exec(line);
    if (!match) return null;
    
    const type = match[1];
    const argsStr = match[2];
    const args = this.splitArgs(argsStr);
    
    switch (type) {
      case 'update':
        return this.parseUpdate(args);
      case 'delete':
        return this.parseDelete(args);
      case 'insert':
        return this.parseInsert(args);
      case 'hide':
        return this.parseHide(args);
      case 'move':
        return this.parseMove(args);
      default:
        return null;
    }
  }
  
  /**
   * 解析 update 命令
   */
  static parseUpdate(args) {
    if (args.length < 3) return null;
    
    const section = parseInt(args[0], 10);
    const row = parseInt(args[1], 10);
    
    if (!this.isValidIndex(section) || !this.isValidIndex(row)) return null;
    
    const cells = [];
    for (let i = 2; i < args.length; i++) {
      const cell = this.parseCell(args[i]);
      if (cell) {
        cells.push(cell);
      }
    }
    
    if (cells.length === 0) return null;
    
    return { type: 'update', section, row, cells };
  }
  
  /**
   * 解析 delete 命令
   */
  static parseDelete(args) {
    if (args.length < 2) return null;
    
    const section = parseInt(args[0], 10);
    const row = parseInt(args[1], 10);
    
    if (!this.isValidIndex(section) || !this.isValidIndex(row)) return null;
    
    return { type: 'delete', section, row };
  }
  
  /**
   * 解析 insert 命令
   */
  static parseInsert(args) {
    if (args.length < 2) return null;
    
    const section = parseInt(args[0], 10);
    const row = parseInt(args[1], 10);
    
    if (!this.isValidIndex(section) || !this.isValidIndex(row)) return null;
    
    // 检查是否为键值对格式
    const cells = [];
    const values = [];
    
    for (let i = 2; i < args.length; i++) {
      const cell = this.parseCell(args[i]);
      if (cell) {
        cells.push(cell);
      } else {
        values.push(this.unquote(args[i]));
      }
    }
    
    if (cells.length > 0) {
      return { type: 'insert', section, row, cells };
    }
    
    return { type: 'insert', section, row, values };
  }
  
  /**
   * 解析 hide 命令
   */
  static parseHide(args) {
    if (args.length < 3) return null;
    
    const section = parseInt(args[0], 10);
    const row = parseInt(args[1], 10);
    const hidden = this.parseBool(args[2]);
    
    if (!this.isValidIndex(section) || !this.isValidIndex(row)) return null;
    if (hidden === null) return null;
    
    return { type: 'hide', section, row, hidden };
  }
  
  /**
   * 解析 move 命令
   */
  static parseMove(args) {
    if (args.length < 3) return null;
    
    const section = parseInt(args[0], 10);
    const from = parseInt(args[1], 10);
    const to = parseInt(args[2], 10);
    
    if (!this.isValidIndex(section) || !this.isValidIndex(from) || !this.isValidIndex(to)) return null;
    
    return { type: 'move', section, from, to };
  }
  
  /**
   * 解析单元格
   */
  static parseCell(arg) {
    const match = /^(\d+)\s*[:：]\s*(.+)$/.exec(arg);
    if (!match) return null;
    
    const col = parseInt(match[1], 10);
    const value = this.unquote(match[2]);
    
    if (!this.isValidIndex(col)) return null;
    
    return { col, value };
  }
  
  /**
   * 分割参数（考虑引号和括号）
   */
  static splitArgs(str) {
    const result = [];
    let current = '';
    let depth = 0;
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (inQuote) {
        current += char;
        if (char === quoteChar && str[i - 1] !== '\\') {
          inQuote = false;
        }
        continue;
      }
      
      if (char === '"' || char === "'") {
        inQuote = true;
        quoteChar = char;
        current += char;
        continue;
      }
      
      if (char === '(' || char === '[') {
        depth++;
        current += char;
        continue;
      }
      
      if (char === ')' || char === ']') {
        depth--;
        current += char;
        continue;
      }
      
      if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }
  
  /**
   * 去除引号
   */
  static unquote(str) {
    const trimmed = (str || '').trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }
  
  /**
   * 解析布尔值
   */
  static parseBool(str) {
    const lower = (str || '').toLowerCase().trim();
    if (['true', '1', 'yes', 'y'].includes(lower)) return true;
    if (['false', '0', 'no', 'n'].includes(lower)) return false;
    return null;
  }
  
  /**
   * 验证索引
   */
  static isValidIndex(num) {
    return Number.isFinite(num) && num >= 1;
  }
}
