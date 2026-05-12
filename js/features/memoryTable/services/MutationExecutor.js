// @ts-nocheck
/**
 * MutationExecutor.js - 变更执行器
 * 
 * 功能: 将解析出的命令转化为对JSON表格数据的实际操作，包括行列的增删改查、隐藏行状态更新。在执行前自动保存快照以支持撤销重做。
 * 
 * 应该写入:
 * - 命令列表的批量执行
 * - 单条命令的分发和执行
 * - update/delete/insert/move的具体实现
 * - 隐藏行状态的跟踪和更新
 * - 快照栈的集成（执行前push）
 * - 撤销重做的代理调用
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 命令解析逻辑（应在CommandParser.js）
 * - AI调用逻辑（应在aiService.js）
 * - Markdown转换逻辑（应在data/markdown.js）
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/MemoryTableFeature.js
 * 
 * 使用文件:
 * - js/features/memoryTable/core/TableSerializer.js (表格克隆)
 * - js/features/memoryTable/core/SnapshotStack.js (快照管理)
 * 
 * 注意:
 * - 所有索引从1开始（命令层）转为0开始（数组层）
 * - 不可填充的section会被跳过并警告
 * - 越界索引会被忽略
 * - hide操作由上层处理hiddenRows，此处不执行
 */

import { TableSerializer, TableBuilder } from '../core/TableSerializer.js';

export class MutationExecutor {
  constructor(snapshotStack) {
    this.snapshotStack = snapshotStack;
  }
  
  /**
   * 执行命令列表
   */
  execute(tableData, commands, templateState) {
    // 保存快照
    this.snapshotStack.push(tableData);
    
    // 深拷贝数据
    const data = TableBuilder.clone(tableData);
    const fillableSections = templateState?.sections || [];
    
    // 执行每条命令
    for (const cmd of commands) {
      this.executeCommand(data, cmd, fillableSections);
    }
    
    return data;
  }
  
  /**
   * 执行单条命令
   */
  executeCommand(data, cmd, fillableSections) {
    const sectionIndex = cmd.section - 1;
    
    // 边界检查
    if (sectionIndex < 0 || sectionIndex >= data.sections.length) {
      console.warn('[MutationExecutor] Invalid section index:', cmd.section);
      return;
    }
    
    const section = data.sections[sectionIndex];
    const meta = fillableSections[sectionIndex];
    
    // 检查是否可修改
    if (meta && meta.fillable === false) {
      console.warn('[MutationExecutor] Section is not fillable:', cmd.section);
      return;
    }
    
    switch (cmd.type) {
      case 'update':
        this.executeUpdate(section, cmd);
        break;
      case 'delete':
        this.executeDelete(section, cmd);
        break;
      case 'insert':
        this.executeInsert(section, cmd);
        break;
      case 'hide':
        // hide 操作由上层处理 hiddenRows
        break;
      case 'move':
        this.executeMove(section, cmd);
        break;
    }
  }
  
  /**
   * 执行 update
   */
  executeUpdate(section, cmd) {
    const rowIndex = cmd.row - 1;
    
    // 确保行存在
    while (section.rows.length <= rowIndex) {
      section.rows.push(section.columns.map(() => ''));
    }
    
    // 更新单元格
    for (const cell of cmd.cells) {
      const colIndex = cell.col - 1;
      
      // 确保列存在
      while (section.columns.length <= colIndex) {
        section.columns.push(`列${section.columns.length + 1}`);
        section.rows.forEach(row => {
          while (row.length < section.columns.length) {
            row.push('');
          }
        });
      }
      
      // 设置值
      section.rows[rowIndex][colIndex] = cell.value || '';
    }
  }
  
  /**
   * 执行 delete
   */
  executeDelete(section, cmd) {
    const rowIndex = cmd.row - 1;
    
    if (rowIndex >= 0 && rowIndex < section.rows.length) {
      section.rows.splice(rowIndex, 1);
    }
  }
  
  /**
   * 执行 insert
   */
  executeInsert(section, cmd) {
    const rowIndex = cmd.row - 1;
    let newRow;
    
    if (cmd.cells && cmd.cells.length > 0) {
      // 键值对模式
      const maxCol = Math.max(...cmd.cells.map(c => c.col));
      
      // 确保列数足够
      while (section.columns.length < maxCol) {
        section.columns.push(`列${section.columns.length + 1}`);
      }
      
      // 创建新行
      newRow = section.columns.map(() => '');
      for (const cell of cmd.cells) {
        const colIndex = cell.col - 1;
        newRow[colIndex] = cell.value || '';
      }
    } else if (cmd.values && cmd.values.length > 0) {
      // 位置顺序模式
      while (section.columns.length < cmd.values.length) {
        section.columns.push(`列${section.columns.length + 1}`);
      }
      
      newRow = section.columns.map((_, i) => cmd.values[i] || '');
    } else {
      // 空行
      newRow = section.columns.map(() => '');
    }
    
    // 插入行
    if (rowIndex >= 0 && rowIndex <= section.rows.length) {
      section.rows.splice(rowIndex, 0, newRow);
    } else {
      section.rows.push(newRow);
    }
  }
  
  /**
   * 执行 move
   */
  executeMove(section, cmd) {
    const fromIndex = cmd.from - 1;
    const toIndex = cmd.to - 1;
    
    if (fromIndex < 0 || fromIndex >= section.rows.length ||
        toIndex < 0 || toIndex >= section.rows.length) {
      return;
    }
    
    const temp = section.rows[fromIndex];
    section.rows[fromIndex] = section.rows[toIndex];
    section.rows[toIndex] = temp;
  }
  
  /**
   * 更新隐藏行状态
   */
  updateHiddenRows(hiddenRows, commands) {
    const result = { ...hiddenRows };
    
    for (const cmd of commands) {
      if (cmd.type !== 'hide') continue;
      
      const sectionKey = String(cmd.section);
      if (!result[sectionKey]) {
        result[sectionKey] = {};
      }
      
      result[sectionKey][String(cmd.row)] = cmd.hidden;
    }
    
    return result;
  }
  
  /**
   * 撤销
   */
  undo() {
    return this.snapshotStack.undo();
  }
  
  /**
   * 重做
   */
  redo() {
    return this.snapshotStack.redo();
  }
}
