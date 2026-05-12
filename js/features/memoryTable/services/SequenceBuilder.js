// @ts-nocheck
/**
 * SequenceBuilder.js - 序列组装器
 * 
 * 功能: 按照配置的顺序组装完整的提示词序列，支持preprompt/instruction/schema/table/reference五种块的排序和前后缀包装。
 * 
 * 应该写入:
 * - 提示词序列的顺序组装
 * - 各块的前后缀包装
 * - 参考信息块的构建（世界书+角色卡+聊天记录）
 * - 序列配置的验证
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - AI调用逻辑（应在aiService.js）
 * - 具体的提示词内容生成（应在PromptGenerator.js）
 * - 底层存储读写
 * 
 * 被使用:
 * - js/features/memoryTable/controllers/MemoryTableFeature.js
 * 
 * 使用文件:
 * - ConfigStore (配置读取，通过构造函数注入)
 * 
 * 注意:
 * - 空内容的块会被过滤
 * - 各块之间用两个换行符分隔
 * - 前后缀规则从ConfigStore获取
 */

export class SequenceBuilder {
  constructor(configStore) {
    this.configStore = configStore;
  }
  
  /**
   * 构建完整提示词序列
   */
  build(sequenceConfig) {
    const {
      order = ['preprompt', 'instruction', 'schema', 'table', 'reference'],
      preprompt = '',
      instruction = '',
      schema = '',
      table = '',
      reference = ''
    } = sequenceConfig;
    
    const parts = [];
    
    for (const item of order) {
      let content = '';
      
      switch (item) {
        case 'preprompt':
          content = this.wrapWithPrefixSuffix(preprompt, 'preprompt');
          break;
        case 'instruction':
          content = this.wrapWithPrefixSuffix(instruction, 'instruction');
          break;
        case 'schema':
          content = this.wrapWithPrefixSuffix(schema, 'schema');
          break;
        case 'table':
          content = this.wrapWithPrefixSuffix(table, 'table');
          break;
        case 'reference':
          content = this.wrapWithPrefixSuffix(reference, 'reference');
          break;
      }
      
      if (content) {
        parts.push(content);
      }
    }
    
    return parts.join('\n\n');
  }
  
  /**
   * 包裹前后缀
   */
  wrapWithPrefixSuffix(content, type) {
    if (!content) return '';
    
    const rules = this.configStore.getFormatRules();
    
    let prefix = '';
    let suffix = '';
    
    switch (type) {
      case 'table':
        prefix = rules.getTablePrefix();
        suffix = rules.getTableSuffix();
        break;
      case 'instruction':
        prefix = rules.getInstructionPrefix();
        suffix = rules.getInstructionSuffix();
        break;
    }
    
    const parts = [];
    if (prefix) parts.push(prefix);
    parts.push(content.trim());
    if (suffix) parts.push(suffix);
    
    return parts.join('\n');
  }
  
  /**
   * 构建参考信息块
   */
  buildReferenceBlock(worldInfo, characterBlocks, chatLog) {
    const parts = [];
    
    // 世界书
    if (worldInfo && worldInfo.length > 0) {
      parts.push('=== 世界书 ===');
      worldInfo.forEach(entry => {
        if (entry.content) {
          parts.push(entry.content);
        }
      });
    }
    
    // 角色卡
    if (characterBlocks && characterBlocks.length > 0) {
      parts.push('\n=== 角色设定 ===');
      characterBlocks.forEach(block => {
        parts.push(`【${block.label}】\n${block.content}`);
      });
    }
    
    // 聊天记录
    if (chatLog && chatLog.length > 0) {
      parts.push('\n=== 最近对话 ===');
      chatLog.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI';
        parts.push(`${role}：${msg.content}`);
      });
    }
    
    return parts.join('\n');
  }
  
  /**
   * 验证序列配置
   */
  validateSequenceConfig(config) {
    const validItems = ['preprompt', 'instruction', 'schema', 'table', 'reference'];
    
    if (!Array.isArray(config.order)) {
      return { valid: false, error: 'order must be an array' };
    }
    
    for (const item of config.order) {
      if (!validItems.includes(item)) {
        return { valid: false, error: `invalid item: ${item}` };
      }
    }
    
    return { valid: true };
  }
}
