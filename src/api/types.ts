export type ChatHistoryFormat = 'gemini' | 'openai';
export type ChatHistoryMediaFormat = 'url' | 'base64';
export type WorldBookScope = 'global' | 'character' | 'chat';
export type WorldBookPosition =
  | 'beforeChar'
  | 'afterChar'
  | 'beforeEm'
  | 'afterEm'
  | 'beforeAn'
  | 'afterAn'
  | 'fixed'
  | 'outlet';
export type WorldBookRole = 'system' | 'user' | 'model';

export interface ReferenceOptions {
  chatHistoryLimit?: number;
  chatHistoryFormat?: ChatHistoryFormat;
  chatHistoryMediaFormat?: ChatHistoryMediaFormat;
  includeSwipes?: boolean;
  worldBookScope?: WorldBookScope;
  worldBookName?: string;
  filterWorldBookEntries?: (entry: WorldBookEntry) => boolean;
}

export interface ReferenceBundle {
  character: CharacterCard;
  chatHistory: {
    chatId?: string | number;
    messages: ChatMessage[];
  };
  worldBook: {
    name: string;
    scope?: WorldBookScope | string;
    entries: WorldBookEntry[];
  };
}

export type ReferenceItemType = 'character' | 'chatHistory' | 'worldBookEntry';

/**
 * 将“参考信息”拆分为可排序的独立条目。
 * - character: 当前角色卡（原始对象+渲染文本）
 * - chatHistory: 当前聊天记录（原始数组+渲染文本）
 * - worldBookEntry: 当前启用世界书条目（每条一个 item，便于调整顺序）
 */
export interface ReferenceItem {
  type: ReferenceItemType;
  /** 稳定 id，用于拖拽排序与持久化 */
  id: string;
  /** UI 展示标题 */
  title: string;
  /** 拼装进提示词的文本 */
  text: string;
  /** 兜底保留原始数据，便于后续内部逻辑做更精细的总结 */
  raw: unknown;
}

export interface ReferenceItemsOptions extends ReferenceOptions {
  /** 指定角色名；不提供则由实现自行从上下文推断 */
  characterName?: string;
  /** 仅返回 enabled=true 的世界书条目；默认 true */
  worldBookEnabledOnly?: boolean;
}

export interface ReferenceItemsResult {
  bundle: ReferenceBundle;
  items: ReferenceItem[];
}

export interface MemoryWriteParams {
  bookName: string;
  entryName: string;
  content: string;
  scope?: WorldBookScope;
  position?: WorldBookPosition;
  role?: WorldBookRole | null;
  depth?: number;
  order?: number;
  enabled?: boolean;
}

export interface MemoryWriteResult {
  ok: boolean;
  mode: 'created' | 'updated';
  entry: WorldBookEntry;
}

export interface MemoryTableState {
  markdown: string;
  json?: unknown;
  hiddenRows?: Record<string, Record<string, boolean>>;
  updatedAt?: string;
}

export interface MemoryTableStateWriteParams {
  state: MemoryTableState;
  scope?: 'local' | 'global';
  variableName?: string;
}

export interface MemoryTableStateWriteResult {
  ok: boolean;
  state: MemoryTableState;
  scope: 'local' | 'global';
  variableName: string;
}

export interface MemoryTableStateReadParams {
  scope?: 'local' | 'global';
  variableName?: string;
}

export interface MemoryTableStateReadResult {
  state: MemoryTableState | null;
  scope: 'local' | 'global';
  variableName: string;
}

/**
 * 一次性回写：
 * - 本地状态（variables.local，绑定当前 chat）
 * - 可选：世界书条目（用于注入提示词，不污染角色卡与世界书其它条目）
 */
export interface PersistMemoryWriteParams {
  /** 必写：本地状态 */
  state: MemoryTableState;
  /** 本地状态写入参数（可选覆盖变量名/作用域） */
  stateStore?: Omit<MemoryTableStateWriteParams, 'state'>;
  /** 可选：世界书回写参数；不提供则不写世界书 */
  worldBook?: MemoryWriteParams;
}

export interface PersistMemoryWriteResult {
  ok: boolean;
  state: MemoryTableStateWriteResult;
  worldBook?: MemoryWriteResult;
}

export interface CharacterCard {
  name?: string;
  description?: string;
  avatar?: string;
  message?: string[];
  worldBook?: {
    name?: string;
    entries?: WorldBookEntry[];
  };
  regexScripts?: unknown[];
  other?: Record<string, unknown>;
  chatDate?: string;
  createDate?: string;
  [key: string]: unknown;
}

export interface WorldBookEntry {
  index: number;
  name: string;
  content: string;
  enabled: boolean;
  activationMode?: string;
  key?: string[];
  secondaryKey?: string[];
  selectiveLogic?: string;
  role?: string | null;
  caseSensitive?: boolean | null;
  excludeRecursion?: boolean;
  preventRecursion?: boolean;
  probability?: number;
  position?: string;
  order?: number;
  depth?: number;
  other?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: string;
  name?: string;
  parts?: Array<{ text?: string } | { inlineData?: { data?: string; mimeType?: string } } | { fileData?: { fileUri?: string; mimeType?: string } }>;
  content?: string;
  swipes?: unknown;
  swipeId?: number;
  [key: string]: unknown;
}
