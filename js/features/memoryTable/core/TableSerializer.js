// @ts-nocheck
/**
 * TableSerializer.js - 表格序列化器
 * 
 * 功能: 提供表格数据在JSON和Markdown格式之间的双向转换，以及表格数据的深拷贝。处理标题、章节、列、行的序列化和解析。
 * 
 * 应该写入:
 * - JSON到Markdown的序列化（标题/章节/表头/数据行）
 * - Markdown到JSON的反序列化
 * - 表格数据的深拷贝
 * - 空表格从模板构建
 * - WTL_Table标签的包装和解包
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 业务逻辑处理
 * - AI调用逻辑
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/core/MemoryTableCore.js
 * - js/features/memoryTable/services/MutationExecutor.js
 * - js/features/memoryTable/services/PromptGenerator.js
 * 
 * 使用文件:
 * - 无外部依赖（纯数据转换）
 * 
 * 注意:
 * - Markdown格式：# 标题 / ## 章节 / | 表头 | / | --- | / | 数据 |
 * - 空单元格会转为空字符串
 * - 深拷贝使用JSON.parse/stringify
 * - TableBuilder是兼容旧API的别名
 */

export class TableSerializer {
  /**
   * Markdown -> JSON 反序列化
   */
  static deserialize(markdown) {
    const raw = this.stripWrapper(markdown || '');
    const lines = raw.split('\n');
    
    let title = '记忆表格';
    const sections = [];
    let current = null;
    
    for (const line of lines) {
      // 标题
      const titleMatch = /^#\s+(.+)$/.exec(line.trim());
      if (titleMatch) {
        title = titleMatch[1].trim();
        continue;
      }
      
      // Section
      const sectionMatch = /^##\s+(.+)$/.exec(line.trim());
      if (sectionMatch) {
        if (current) sections.push(current);
        current = { name: sectionMatch[1].trim(), columns: [], rows: [] };
        continue;
      }
      
      // 表格行
      if (current && line.trim().startsWith('|')) {
        current.rows.push(line);
      }
    }
    
    if (current) sections.push(current);
    
    // 解析表格结构
    return {
      title,
      sections: sections.map(s => this.parseSection(s))
    };
  }
  
  /**
   * JSON -> Markdown 序列化
   */
  static serialize(data) {
    const title = data?.title || '记忆表格';
    const sections = Array.isArray(data?.sections) ? data.sections : [];
    
    const blocks = sections.map(sec => {
      const name = sec?.name || '未命名';
      const cols = Array.isArray(sec?.columns) ? sec.columns : [];
      const rows = Array.isArray(sec?.rows) ? sec.rows : [];
      
      if (cols.length === 0) return null;
      
      const header = `| ${cols.join(' | ')} |`;
      const separator = `| ${cols.map(() => '---').join(' | ')} |`;
      const body = rows.map(row => {
        const cells = cols.map((_, i) => row?.[i] || '');
        return `| ${cells.join(' | ')} |`;
      }).join('\n');
      
      return `## ${name}\n${header}\n${separator}\n${body}`;
    }).filter(Boolean).join('\n\n');
    
    return this.wrapWrapper(`# ${title}\n\n${blocks}`);
  }
  
  /**
   * 解析单个Section
   */
  static parseSection(section) {
    const rows = section.rows || [];
    if (rows.length < 2) {
      return { name: section.name, columns: [], rows: [] };
    }
    
    const columns = rows[0].split('|').slice(1, -1).map(c => c.trim());
    const bodyRows = rows.slice(2).map(r => 
      r.split('|').slice(1, -1).map(c => c.trim())
    );
    
    return { name: section.name, columns, rows: bodyRows };
  }
  
  /**
   * 包裹器处理
   */
  static wrapWrapper(content) {
    const trimmed = (content || '').trim();
    if (!trimmed) return '<WTL_Table>\n</WTL_Table>';
    if (trimmed.includes('<WTL_Table>')) return trimmed;
    return `<WTL_Table>\n${trimmed}\n</WTL_Table>`;
  }
  
  static stripWrapper(markdown) {
    return (markdown || '')
      .replace(/<WTL_Table>/g, '')
      .replace(/<\/WTL_Table>/g, '')
      .trim();
  }
}

export class TableBuilder {
  /**
   * 从模板构建空表格
   */
  static buildFromTemplate(template) {
    const title = template?.title || '记忆表格';
    const sections = (template?.sections || []).map(sec => ({
      name: sec?.name || '未命名',
      columns: (sec?.columns || []).map(c => c?.name || '列'),
      rows: []
    }));
    
    return { title, sections };
  }
  
  /**
   * 深拷贝表格数据
   */
  static clone(tableData) {
    return JSON.parse(JSON.stringify(tableData || { title: '', sections: [] }));
  }
}
