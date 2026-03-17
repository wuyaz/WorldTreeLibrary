# WorldTreeLibrary

> 目标：提供“记忆表格插件”的**接口封装与文档**，方便后续独立实现内部处理逻辑。

本插件仅在 `WorldTreeLibrary` 目录内开发，参考 `../st-api-wrapper` 的接口能力（只读）。

---

## 功能概览

- **注册入口按钮**：用户点击触发记忆采集流程。
- **获取参考信息**：角色卡、聊天记录、世界书条目。
- **记忆表格保存（本地状态）**：按聊天窗口保存 Markdown/JSON/隐藏行等状态（使用 `variables` 的 `local` 作用域，不污染世界书与角色卡）。
- **世界书回写（用于注入）**：可将最终 Markdown 写入世界书条目，供后续提示词注入使用。
- **手动世界书读取**：图形界面选择书/条目并可覆盖触发参数。
- **表格范式模式**：全局范式或按角色卡绑定。
- **提示词块管理**：拖拽排序、隐藏、预览、编辑与自定义块。

> 内部 AI 分析、表格解析逻辑暂不实现，仅提供接口封装。

---

## 目录结构（当前）

```
WorldTreeLibrary/
├─ manifest.json
├─ index.js
├─ README.md
└─ src/
   ├─ index.ts
   ├─ api/
   │  ├─ types.ts
   │  ├─ reference.ts
   │  └─ memory.ts
   └─ ui/
      ├─ registerButton.ts
      └─ registerTopTab.ts
```

---

## 提示词块顺序/结构

界面分为两个可拖拽列表：

- **左侧：提示词组装顺序**（保存于 `wtl.blockOrder`，包含参考信息总块、聊天记录、主提示词块与自定义块）
- **右侧：参考信息内部顺序**（保存于 `wtl.refBlockOrder`，角色卡/用户信息/世界书在此排序后合并为参考信息总块，不包含聊天记录）

每个模块可配置**前缀/后缀**（齿轮按钮进入二级编辑），用于包裹该模块的提示词内容；隐藏模块不参与拼装。

块类型：

- `reference`：参考信息总块（聚合显示）。
- `chat`：聊天记录（与主提示词同级，仍在左侧组装）。
- `preprompt` / `instruction` / `schema` / `table`：主提示词块，其中 `preprompt` 在 UI 中显示为“破限提示”。
- `custom`：自定义提示词块（可新增/删除/编辑，且仅此类支持删除）。

> 角色卡/用户信息/世界书条目仅在右侧列表内排序后合并为 `reference` 总块；聊天记录保持在左侧提示词组装顺序中。

提示词拼装顺序由左侧块列表决定；参考信息内部顺序由右侧块列表决定。

---

## 参考信息接口

### [`getReferenceBundle()`](src/api/reference.ts:31)

获取当前对话所需的“参考信息”，包括：
- 角色卡（完整数据）
- 聊天记录（归一化）
- 当前聊天绑定世界书条目（可选过滤）

**输入**
- `options`（可选）
  - `chatHistoryLimit?: number`：限制聊天记录条数（从最近开始）。
  - `chatHistoryFormat?: 'gemini' | 'openai'`：聊天记录格式。
  - `chatHistoryMediaFormat?: 'url' | 'base64'`：图片附件处理方式。
  - `includeSwipes?: boolean`：是否包含分支。
  - `worldBookScope?: 'global' | 'character' | 'chat'`：世界书作用域。
  - `worldBookName?: string`：世界书名（当 scope 为 chat 可用 `Current Chat`）。
  - `filterWorldBookEntries?: (entry) => boolean`：世界书条目过滤函数。

**输出**
- `ReferenceBundle`

### [`getReferenceItems()`](src/api/reference.ts:88)

获取“参考信息”并拆分为**可排序的独立条目**（供后续 UI 让用户分别调序/启用）。

**输出**
- `ReferenceItemsResult`
  - `bundle: ReferenceBundle`
  - `items: ReferenceItem[]`
    - `type: 'character' | 'chatHistory' | 'worldBookEntry'`
    - `id/title/text/raw`

---

## 记忆表格回写接口

### [`upsertMemoryTableEntry()`](src/api/memory.ts:25)

在世界书中创建/更新“记忆表格”条目，供提示词注入使用。

**输入**
- `params: MemoryWriteParams`

**输出**
- `MemoryWriteResult`：`mode` 为 `created` / `updated`。

### [`persistMemory()`](src/api/memory.ts:121)

一次性回写：
- **本地状态**（`variables.local`，绑定当前 chat）
- **可选**：世界书条目（用于注入提示词）

**输入**
- `params: PersistMemoryWriteParams`
  - `state: MemoryTableState`（必填）
  - `stateStore?: { scope?: 'local' | 'global'; variableName?: string }`
  - `worldBook?: MemoryWriteParams`（不提供则不写世界书）

**输出**
- `PersistMemoryWriteResult`

---

## 提示词预设管理（破限提示/填表指令）

- 破限提示与填表指令默认只读预览，点击“编辑”进入可编辑并保存。
- 支持独立的预设管理：选择、另存为、重命名、删除、导入/导出 JSON。
- 预设分别存储在 `wtl.preprompt.presets` 与 `wtl.instruction.presets`。

---

## 记忆表格本地状态接口

> 用于保存“本地记忆表格 JSON/Markdown/隐藏行”等状态，不污染世界书与角色卡。
> 默认使用 `variables` 的 `local` 作用域绑定当前聊天。

### [`saveMemoryTableState()`](src/api/memory.ts:98)

将本地处理后的“记忆表格状态”写入当前聊天变量。

### [`loadMemoryTableState()`](src/api/memory.ts:111)

读取本地记忆表格状态。

---

## 标准表格与指令格式

### 存储格式（内部 JSON 作为源数据）

- **源数据**：内部使用 JSON 存储表格结构，并额外保存 `hiddenRows`（隐藏行状态）。
- **展示/注入**：渲染为 Markdown 表格；注入给 AI 时会**自动过滤隐藏行**，减少 token 且避免污染记忆。

**JSON 结构示例**

```json
{
  "title": "记忆表格",
  "sections": [
    {
      "name": "物品",
      "columns": ["名称", "描述", "来源"],
      "rows": []
    },
    {
      "name": "地点",
      "columns": ["名称", "描述", "关联"],
      "rows": []
    }
  ],
  "hiddenRows": {
    "1": { "3": true }
  }
}
```

### 表格格式（对外展示，必须包裹在 `<WTL_Table>` 内）

```md
<WTL_Table>
# 记忆表格

## 物品
| 名称 | 描述 | 来源 |
| --- | --- | --- |

## 地点
| 名称 | 描述 | 关联 |
| --- | --- | --- |
</WTL_Table>
```

### 指令格式（必须包裹在 `<WTL_TableEdit>` 内）

> 目标：让 AI **只输出可机器解析的编辑指令**，避免解释文本导致误解析。

索引规则（强约束）：

- `section`：第几个表（从 1 开始）
- `row`：表头下第几行数据（从 1 开始）
- `col`：第几列（从 1 开始）

允许的指令（只允许这些）：

- `update`：更新一个或多个单元格（同一行可一次更新多列）
- `delete`：删除整行
- `insert`：插入整行（推荐使用列索引 `col(value)`，也允许按列顺序 values，不足用 `-` 占位）
- `hide`：隐藏/显示整行（`hidden=true` 的行不会发送给 AI，但本地仍保留且主页可见）
- `move`：交换两行顺序

格式（强约束）：

- `update[section, row, col(value), col(value), ...]`
- `delete[section, row]`
- `insert[section, row, col(value), col(value), ...]`（推荐，避免错列）
- `insert[section, row, value1, value2, ...]`（按列顺序）
- `hide[section, row, true|false]`
- `move[section, fromRow, toRow]`

值的写法：

- 推荐 `value` 用括号包裹：`2(苹果)`
- `value` 若包含逗号 `,`、右括号 `)`、右中括号 `]` 等特殊字符，请使用英文双引号包裹，例如：`2("a,b")`

```text
<WTL_TableEdit>
update[1, 1, 2(苹果)]
update[1, 1, 2(苹果), 3(香蕉)]
delete[1, 1]
insert[1, 2, 1(苹果), 2(红色), 3(市场)]
hide[1, 4, true]
move[1, 2, 5]
</WTL_TableEdit>
```

## 使用示例

```ts
import {
  registerTopTabWithPanel,
  registerMemoryButton,
  getReferenceBundle,
  saveMemoryTableState,
  upsertMemoryTableEntry
} from './src/index';

// 顶部页签 + 基础配置面板
registerTopTabWithPanel();

// 备用：消息扩展菜单按钮（可选）
registerMemoryButton(async () => {
  const reference = await getReferenceBundle({
    chatHistoryLimit: 50,
    worldBookScope: 'chat',
    worldBookName: 'Current Chat'
  });

  // TODO: 内部处理逻辑（AI总结/解析/生成表格）
  const markdown = '<WTL_Table>\n# 记忆表格\n\n## 物品\n| 名称 | 描述 | 来源 |\n| --- | --- | --- |\n</WTL_Table>';

  // 1) 保存到“当前聊天绑定的本地变量”（推荐：不污染世界书）
  await saveMemoryTableState({
    state: { markdown, json: null, hiddenRows: {}, updatedAt: new Date().toISOString() },
    scope: 'local',
    variableName: 'WorldTreeLibrary.memoryTable'
  });

  // 2) 可选：回写到世界书条目（仅用于注入，不作为本地状态源）
  await upsertMemoryTableEntry({
    scope: 'chat',
    bookName: 'Current Chat',
    entryName: 'WorldTreeMemory',
    content: markdown,
    position: 'outlet',
    role: 'system',
    depth: 4,
    order: 0,
    enabled: true
  });

  console.log('参考信息', reference);
});
```

---

## 参考 API（来源 st-api-wrapper）

- `ui.registerTopSettingsDrawer`
- `ui.registerExtraMessageButton` / `ui.unregisterExtraMessageButton`
- `character.get`
- `chatHistory.list`
- `chatHistory.update`
- `worldBook.list`
- `worldBook.get`
- `worldBook.createEntry`
- `worldBook.updateEntry`
- `variables.get`
- `variables.set`

详见：
- `../st-api-wrapper/docs/ui/registerTopSettingsDrawer.md`
- `../st-api-wrapper/docs/ui/registerExtraMessageButton.md`
- `../st-api-wrapper/docs/character/get.md`
- `../st-api-wrapper/docs/chatHistory/list.md`
- `../st-api-wrapper/docs/chatHistory/update.md`
- `../st-api-wrapper/docs/worldbook/list.md`
- `../st-api-wrapper/docs/worldbook/get.md`
- `../st-api-wrapper/docs/worldbook/createEntry.md`
- `../st-api-wrapper/docs/worldbook/updateEntry.md`
- `../st-api-wrapper/docs/variables/get.md`
- `../st-api-wrapper/docs/variables/set.md`
