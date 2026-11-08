// @ts-nocheck
/**
 * MemoryTableCore.js - 记忆表格核心门面（Facade）
 * 
 * 功能: 作为记忆表格模块的统一入口和协调器，整合配置存储、快照栈、会话沙箱、上下文读取、提示词生成、命令解析、变更执行等各层组件。提供填表、撤销重做、聊天切换等高层API。
 * 
 * 应该写入:
 * - 各层组件的初始化和协调
 * - 填表流程的完整编排
 * - 聊天切换的状态管理
 * - 表格数据的加载和保存
 * - 撤销重做的代理调用
 * - 提示词的完整构建
 * 
 * 不应该写入:
 * - UI相关的操作或DOM访问
 * - 具体的算法实现（应委托给各层组件）
 * - 底层存储的直接读写
 * 
 * 被使用:
 * - js/features/memoryTable/index.js (模块入口)
 * - js/main.js (插件入口)
 * 
 * 使用文件:
 * - js/features/memoryTable/core/TableSerializer.js (表格序列化)
 * - js/features/memoryTable/core/SnapshotStack.js (快照管理)
 * - js/features/memoryTable/core/ConfigStore.js (配置存储)
 * - js/features/memoryTable/core/SessionSandbox.js (会话沙箱)
 * - js/features/memoryTable/services/*.js (各服务层组件)
 * 
 * 注意:
 * - 这是业务逻辑的唯一入口
 * - 所有操作都通过此类协调
 * - ST_API通过构造函数注入
 */

import { TableSerializer, TableBuilder } from './core/TableSerializer.js';
import { SnapshotStack } from './core/SnapshotStack.js';
import { ConfigStore } from './core/ConfigStore.js';
import { SessionSandbox } from './core/SessionSandbox.js';
import { WorldInfoAdapter } from './services/WorldInfoAdapter.js';
import { ContextReader } from './services/ContextReader.js';
import { PromptGenerator } from './services/PromptGenerator.js';
import { SequenceBuilder } from './services/SequenceBuilder.js';
import { CommandParser } from './services/CommandParser.js';
import { MutationExecutor } from './services/MutationExecutor.js';

export class MemoryTableCore {
  constructor(ST_API) {
    // 第一层：数据持久与状态层
    this.configStore = new ConfigStore();
    this.snapshotStack = new SnapshotStack();
    this.sessionSandbox = new SessionSandbox();
    
    // 第二层：上下文采集与适配层
    this.worldInfoAdapter = new WorldInfoAdapter(ST_API);
    this.contextReader = new ContextReader(ST_API);
    
    // 第三层：提示词装配与路由层
    this.promptGenerator = new PromptGenerator(this.configStore);
    this.sequenceBuilder = new SequenceBuilder(this.configStore);
    
    // 第四层：指令解析与执行引擎
    this.mutationExecutor = new MutationExecutor(this.snapshotStack);
    
    // 当前状态
    this.currentTableData = null;
    this.currentTemplate = null;
    this.currentHiddenRows = {};
  }
  
  /**
   * 切换聊天
   */
  switchChat(chatId) {
    this.sessionSandbox.switchChat(chatId);
    this.loadCurrentTable();
  }
  
  /**
   * 加载当前表格
   */
  loadCurrentTable() {
    const data = this.sessionSandbox.getTableData();
    
    if (data) {
      this.currentTableData = TableBuilder.clone(data);
    } else {
      // 创建空表格
      this.currentTableData = TableBuilder.buildFromTemplate(this.currentTemplate);
    }
    
    this.currentHiddenRows = this.sessionSandbox.getHiddenRows() || {};
    
    return this.currentTableData;
  }
  
  /**
   * 保存当前表格
   */
  saveCurrentTable() {
    if (!this.currentTableData) return;
    
    this.sessionSandbox.setTableData(this.currentTableData);
    this.sessionSandbox.setHiddenRows(this.currentHiddenRows);
    this.sessionSandbox.saveCurrentSession();
  }
  
  /**
   * 填表（核心业务逻辑）
   */
  async fillTable(options = {}) {
    const {
      floorCount = 12,
      sendMode = 'st',
      apiConfig = {}
    } = options;
    
    // 1. 收集上下文
    const worldInfo = await this.worldInfoAdapter.getActivatedWorldInfo();
    const charCard = await this.contextReader.getCharacterCard();
    const charBlocks = this.contextReader.extractCharacterBlocks(charCard);
    const chatLog = await this.contextReader.getChatLog(floorCount);
    
    // 2. 生成提示词
    const preprompt = this.promptGenerator.generatePreprompt();
    const instruction = this.promptGenerator.generateInstruction(this.currentTemplate);
    const schema = this.promptGenerator.generateSchema(this.currentTableData);
    const table = this.promptGenerator.generateTableContent(this.currentTableData);
    const reference = this.sequenceBuilder.buildReferenceBlock(worldInfo, charBlocks, chatLog);
    
    // 3. 组装序列
    const sequenceConfig = {
      order: ['preprompt', 'instruction', 'schema', 'table', 'reference'],
      preprompt,
      instruction,
      schema,
      table,
      reference
    };
    
    const fullPrompt = this.sequenceBuilder.build(sequenceConfig);
    
    // 4. 调用AI
    const aiResponse = await this.callAI(fullPrompt, sendMode, apiConfig);
    
    // 5. 解析命令
    const commands = CommandParser.parse(aiResponse);
    
    // 6. 执行变更
    if (commands.length > 0) {
      this.currentTableData = this.mutationExecutor.execute(
        this.currentTableData,
        commands,
        this.currentTemplate
      );
      
      this.currentHiddenRows = this.mutationExecutor.updateHiddenRows(
        this.currentHiddenRows,
        commands
      );
      
      // 7. 保存
      this.saveCurrentTable();
      
      // 8. 记录历史
      this.sessionSandbox.addHistory({
        commands: CommandParser.extractEditPayload(aiResponse),
        aiResponse
      });
    }
    
    return {
      tableData: this.currentTableData,
      hiddenRows: this.currentHiddenRows,
      commands
    };
  }
  
  /**
   * 调用AI（由注入路由层处理）
   */
  async callAI(prompt, sendMode, apiConfig) {
    const { callAi } = await import('../../../shared/ai/openai.js');
    
    const options = {
      ST_API: window.ST_API,
      sendMode: sendMode || 'st',
      promptText: prompt,
      openai: apiConfig || {}
    };
    
    try {
      return await callAi(options);
    } catch (error) {
      console.error('[MemoryTableCore] AI call failed:', error);
      throw error;
    }
  }
  
  /**
   * 撤销
   */
  undo() {
    const data = this.mutationExecutor.undo();
    if (data) {
      this.currentTableData = data;
      this.saveCurrentTable();
      return true;
    }
    return false;
  }
  
  /**
   * 重做
   */
  redo() {
    const data = this.mutationExecutor.redo();
    if (data) {
      this.currentTableData = data;
      this.saveCurrentTable();
      return true;
    }
    return false;
  }
  
  /**
   * 更新模板
   */
  updateTemplate(template) {
    this.currentTemplate = template;
  }
  
  /**
   * 获取表格Markdown
   */
  getTableMarkdown() {
    return TableSerializer.serialize(this.currentTableData);
  }
  
  /**
   * 从Markdown加载表格
   */
  loadTableFromMarkdown(markdown) {
    this.currentTableData = TableSerializer.deserialize(markdown);
    this.saveCurrentTable();
  }
}
