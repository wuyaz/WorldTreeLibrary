// @ts-nocheck
/**
 * ContextReader.js - 上下文读取器
 * 
 * 功能: 从SillyTavern API获取基础上下文数据，包括聊天记录、角色卡、聊天ID、角色ID、聊天元数据。所有操作均为只读。
 * 
 * 应该写入:
 * - 聊天记录的获取和格式化（最近N条）
 * - 角色卡数据的获取和提取
 * - 当前聊天ID和角色ID的获取
 * - 聊天元数据的获取
 * - 角色设定的分块提取
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
 * - window.ST_API (SillyTavern API，通过构造函数注入)
 * 
 * 注意:
 * - ST_API不可用时返回空数据并警告
 * - 聊天记录按时间顺序取最近N条
 * - 所有异步方法需要await
 */

export class ContextReader {
  constructor(ST_API) {
    this.ST_API = ST_API;
  }
  
  /**
   * 获取聊天记录
   */
  async getChatLog(floorCount = 12) {
    if (!this.ST_API?.chat?.getMessages) {
      console.warn('[ContextReader] ST_API not available');
      return [];
    }
    
    try {
      const messages = await this.ST_API.chat.getMessages();
      
      if (!Array.isArray(messages)) return [];
      
      // 只取最近的N条消息
      const recent = messages.slice(-floorCount);
      
      return recent.map(msg => ({
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.mes || '',
        name: msg.name || '',
        send_date: msg.send_date || 0
      }));
    } catch (e) {
      console.error('[ContextReader] Failed to get chat log:', e);
      return [];
    }
  }
  
  /**
   * 获取角色卡数据
   */
  async getCharacterCard() {
    if (!this.ST_API?.character?.get) {
      console.warn('[ContextReader] ST_API not available');
      return null;
    }
    
    try {
      const char = await this.ST_API.character.get();
      
      return {
        name: char.name || '',
        description: char.description || '',
        personality: char.personality || '',
        scenario: char.scenario || '',
        first_mes: char.first_mes || '',
        mes_example: char.mes_example || '',
        creator_notes: char.creator_notes || '',
        tags: char.tags || [],
        avatar: char.avatar || ''
      };
    } catch (e) {
      console.error('[ContextReader] Failed to get character card:', e);
      return null;
    }
  }
  
  /**
   * 获取当前聊天ID
   */
  getCurrentChatId() {
    if (!this.ST_API?.chat?.getId) {
      return null;
    }
    
    try {
      return this.ST_API.chat.getId();
    } catch (e) {
      console.error('[ContextReader] Failed to get chat ID:', e);
      return null;
    }
  }
  
  /**
   * 获取当前角色ID
   */
  getCurrentCharacterId() {
    if (!this.ST_API?.character?.getId) {
      return null;
    }
    
    try {
      return this.ST_API.character.getId();
    } catch (e) {
      console.error('[ContextReader] Failed to get character ID:', e);
      return null;
    }
  }
  
  /**
   * 获取聊天元数据
   */
  async getChatMetadata() {
    if (!this.ST_API?.chat?.getMetadata) {
      return null;
    }
    
    try {
      return await this.ST_API.chat.getMetadata();
    } catch (e) {
      console.error('[ContextReader] Failed to get chat metadata:', e);
      return null;
    }
  }
  
  /**
   * 分块提取角色设定
   */
  extractCharacterBlocks(charCard) {
    if (!charCard) return [];
    
    const blocks = [];
    
    if (charCard.description) {
      blocks.push({
        type: 'description',
        label: '角色描述',
        content: charCard.description
      });
    }
    
    if (charCard.personality) {
      blocks.push({
        type: 'personality',
        label: '性格',
        content: charCard.personality
      });
    }
    
    if (charCard.scenario) {
      blocks.push({
        type: 'scenario',
        label: '场景',
        content: charCard.scenario
      });
    }
    
    if (charCard.first_mes) {
      blocks.push({
        type: 'first_mes',
        label: '首条消息',
        content: charCard.first_mes
      });
    }
    
    if (charCard.mes_example) {
      blocks.push({
        type: 'mes_example',
        label: '示例对话',
        content: charCard.mes_example
      });
    }
    
    return blocks;
  }
}
