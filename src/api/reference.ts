import {
  ReferenceBundle,
  ReferenceItem,
  ReferenceItemsOptions,
  ReferenceItemsResult,
  ReferenceOptions,
  WorldBookEntry
} from './types';

// 依赖 st-api-wrapper 的全局对象
declare const ST_API: any;

type CharacterGetOutput = { character: any };

type CharacterListOutput = { characters: Array<{ name?: string }> };

type ChatHistoryListOutput = {
  messages: any[];
  chatId?: string | number;
};

type WorldBookGetOutput = {
  worldBook: { name: string; entries: WorldBookEntry[] };
  scope?: string;
};

async function resolveCharacterNameFromContext(): Promise<string | undefined> {
  // 优先从角色列表获取第一个角色名作为“当前角色”兜底。
  // 更精确的方式可在后续接入 UI 状态或自定义配置（例如 ST 的当前选中角色）。
  const list: CharacterListOutput = await ST_API.character.list();
  return list.characters?.[0]?.name;
}

function stableId(prefix: string, value: string): string {
  // 简单稳定 id：避免将来改动渲染文本导致排序丢失
  return `${prefix}:${value}`;
}

function renderCharacterText(character: any): string {
  const name = character?.name || '';
  const desc = character?.description || '';
  // 仅做轻量、可读的默认拼装；内部总结逻辑后续再做。
  return `# 角色卡\n\n- 名称：${name}\n- 描述：${desc}`.trim();
}

function renderChatHistoryText(messages: any[]): string {
  // messages 已由 st-api-wrapper 进行过 format 归一化（gemini/openai）。
  // 这里不做强假设，只尽量输出可读文本。
  if (!Array.isArray(messages) || !messages.length) return '# 聊天记录\n\n(空)';

  const lines: string[] = ['# 聊天记录'];
  for (const msg of messages) {
    const role = msg?.role ?? 'unknown';
    const name = msg?.name ? `(${msg.name})` : '';
    const content = typeof msg?.content === 'string'
      ? msg.content
      : Array.isArray(msg?.parts)
        ? msg.parts.map((p: any) => p?.text).filter(Boolean).join('')
        : JSON.stringify(msg);
    lines.push(`- ${role}${name}: ${content}`);
  }
  return lines.join('\n');
}

function renderWorldBookEntryText(entry: WorldBookEntry): string {
  const title = entry?.name ?? '(未命名条目)';
  const content = entry?.content ?? '';
  return `# 世界书条目：${title}\n\n${content}`.trim();
}

export async function getReferenceItems(
  options: ReferenceItemsOptions = {}
): Promise<ReferenceItemsResult> {
  const {
    characterName: characterNameOverride,
    worldBookEnabledOnly = true,
    filterWorldBookEntries
  } = options;

  const bundle = await getReferenceBundle(options);

  const items: ReferenceItem[] = [];

  // 角色卡
  items.push({
    type: 'character',
    id: stableId('character', bundle.character?.name || 'current'),
    title: '角色卡',
    text: renderCharacterText(bundle.character),
    raw: bundle.character
  });

  // 聊天记录
  items.push({
    type: 'chatHistory',
    id: stableId('chat', String(bundle.chatHistory?.chatId ?? 'current')),
    title: '聊天记录',
    text: renderChatHistoryText(bundle.chatHistory?.messages || []),
    raw: bundle.chatHistory
  });

  // 世界书条目（拆分为可排序 item）
  const entries = (bundle.worldBook?.entries || [])
    .filter(e => (worldBookEnabledOnly ? !!e.enabled : true))
    .filter(e => (filterWorldBookEntries ? filterWorldBookEntries(e) : true));

  for (const e of entries) {
    items.push({
      type: 'worldBookEntry',
      id: stableId('wb', String(e.index ?? e.name)),
      title: `世界书：${e.name}`,
      text: renderWorldBookEntryText(e),
      raw: e
    });
  }

  // 如果调用方显式提供 characterName，则优先用该值（当前 getReferenceBundle 里还未接入该 override）
  // 这里先保留接口字段，方便后续 UI / 逻辑层补齐。
  void characterNameOverride;

  return { bundle, items };
}

export async function getReferenceBundle(
  options: ReferenceOptions = {}
): Promise<ReferenceBundle> {
  const {
    chatHistoryLimit,
    chatHistoryFormat = 'gemini',
    chatHistoryMediaFormat = 'url',
    includeSwipes = false,
    worldBookScope,
    worldBookName = 'Current Chat',
    filterWorldBookEntries
  } = options;

  const characterName = await resolveCharacterNameFromContext();

  const characterRes: CharacterGetOutput = characterName
    ? await ST_API.character.get({ name: characterName })
    : await ST_API.character.get({ name: '' });

  const chatRes: ChatHistoryListOutput = await ST_API.chatHistory.list({
    limit: chatHistoryLimit,
    format: chatHistoryFormat,
    mediaFormat: chatHistoryMediaFormat,
    includeSwipes
  });

  const worldBookRes: WorldBookGetOutput = await ST_API.worldBook.get({
    name: worldBookName,
    scope: worldBookScope
  });

  const entries = filterWorldBookEntries
    ? worldBookRes.worldBook.entries.filter(filterWorldBookEntries)
    : worldBookRes.worldBook.entries;

  return {
    character: characterRes.character,
    chatHistory: {
      chatId: chatRes.chatId,
      messages: chatRes.messages
    },
    worldBook: {
      name: worldBookRes.worldBook.name,
      scope: worldBookRes.scope,
      entries
    }
  };
}
