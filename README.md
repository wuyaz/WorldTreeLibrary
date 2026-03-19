# WorldTreeLibrary

> 目标：提供“记忆表格插件”的**接口封装与文档**，方便后续独立实现内部处理逻辑。

本插件仅在 `WorldTreeLibrary` 目录内开发，参考 `../st-api-wrapper` 的接口能力（只读）。

---

## 使用方式（无需打包）

- 入口脚本：[`manifest.json`](manifest.json) 指向 [`js/main.js`](js/main.js)（ESM）。
- UI 模板：[`assets/wtl-ui.html`](assets/wtl-ui.html) 在运行时由 [`js/assets.js`](js/assets.js:38) 通过 `fetch` 加载。
- 样式：[`wtl.css`](wtl.css) 在运行时注入（见 [`js/assets.js`](js/assets.js:7)）。

---

## 功能概览

- **注册入口按钮**：用户点击触发记忆采集流程。
- **获取参考信息**：角色卡、聊天记录、世界书条目。
- **记忆表格保存（本地状态）**：按聊天窗口保存 Markdown/JSON/隐藏行等状态（使用 `variables` 的 `local` 作用域，不污染世界书与角色卡）。
- **世界书回写（用于注入）**：可将最终 Markdown 写入世界书条目，供后续提示词注入使用。
- **手动世界书读取**：图形界面选择书/条目并可覆盖触发参数。
- **模板预设绑定**：模板预设可保存并绑定到“聊天 / 角色 / 全局”，并显示当前生效预设（优先级：聊天 > 角色 > 全局）。
- **表格范式模式**：全局范式或按角色卡绑定。
- **提示词块管理**：拖拽排序、隐藏、预览、编辑与自定义块。

> 内部 AI 分析、表格解析逻辑暂不实现，仅提供接口封装。

---

## 目录结构（当前）

```
WorldTreeLibrary/
├─ manifest.json
├─ README.md
├─ wtl.css
├─ assets/
│  ├─ wtl-ui.html           # UI 模板（运行时加载）
│  ├─ defaults.json
│  └─ presets/
│     ├─ openai.json
│     ├─ preprompt.json
│     ├─ instruction.json
│     ├─ schema.json
│     ├─ order.json
│     ├─ refOrder.json
│     ├─ blocks.json
│     └─ refBlocks.json
└─ js/
   ├─ api/
   │  ├─ reference.js
   │  └─ memory.js
   ├─ ui/
   │  ├─ registerButton.js
   │  └─ registerTopTab.js
   ├─ main.js               # 运行入口（ESM）
   ├─ assets.js             # 资源加载工具
   └─ config.js             # 配置加载/合并
```

---

## 配置文件说明

- 样式：[`wtl.css`](wtl.css)（由 [`js/assets.js`](js/assets.js:7) 在启动时注入）
- 默认模板/提示词/块顺序：[`assets/defaults.json`](assets/defaults.json)（首次加载默认值）
- 预设（拆分文件，默认加载）：
  - OpenAI 预设：[`assets/presets/openai.json`](assets/presets/openai.json)
  - 破限提示预设：[`assets/presets/preprompt.json`](assets/presets/preprompt.json)
  - 填表指令预设：[`assets/presets/instruction.json`](assets/presets/instruction.json)
  - 模板预设：[`assets/presets/schema.json`](assets/presets/schema.json)
  - 排序/块预设：[`assets/presets/order.json`](assets/presets/order.json)、[`assets/presets/refOrder.json`](assets/presets/refOrder.json)、[`assets/presets/blocks.json`](assets/presets/blocks.json)、[`assets/presets/refBlocks.json`](assets/presets/refBlocks.json)

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

### [`getReferenceBundle()`](js/api/reference.js:60)

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

### [`getReferenceItems()`](js/api/reference.js:31)

获取“参考信息”并拆分为**可排序的独立条目**（供后续 UI 让用户分别调序/启用）。

**输出**
- `ReferenceItemsResult`
  - `bundle: ReferenceBundle`
  - `items: ReferenceItem[]`
    - `type: 'character' | 'chatHistory' | 'worldBookEntry'`
    - `id/title/text/raw`

---

## 记忆表格回写接口

### [`upsertMemoryTableEntry()`](js/api/memory.js:6)

在世界书中创建/更新“记忆表格”条目，供提示词注入使用。

**输入**
- `params: MemoryWriteParams`

**输出**
- `MemoryWriteResult`：`mode` 为 `created` / `updated`。

### [`persistMemory()`](js/api/memory.js:53)

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

## 模板预设绑定与优先级

- 模板预设存储在 `wtl.schema.presets`。
- 绑定映射存储在 `wtl.schema.scopedPresets`：
  - `global`: 全局绑定预设名
  - `character`: `{ [characterId]: presetName }`
  - `chat`: `{ [chatId]: presetName }`
- 生效优先级：`chat` > `character` > `global`。
- UI 会显示“当前生效模板”，并展示聊天/角色名作为绑定提示。

---

## 提示词预设管理（破限提示/填表指令）

- 破限提示与填表指令默认只读预览，点击“编辑”进入可编辑并保存。
- 支持独立的预设管理：选择、另存为、重命名、删除、导入/导出 JSON。
- 预设分别存储在 `wtl.preprompt.presets` 与 `wtl.instruction.presets`。
- 初始预设来源（拆分文件，首次加载写入本地存储，之后以用户本地存储为准）：
  - [`assets/presets/preprompt.json`](assets/presets/preprompt.json)
  - [`assets/presets/instruction.json`](assets/presets/instruction.json)

---

## 记忆表格本地状态接口

> 用于保存“本地记忆表格 JSON/Markdown/隐藏行”等状态，不污染世界书与角色卡。
> 默认使用 `variables` 的 `local` 作用域绑定当前聊天。

### [`saveMemoryTableState()`](js/api/memory.js:33)

将本地处理后的“记忆表格状态”写入当前聊天变量。

### [`loadMemoryTableState()`](js/api/memory.js:43)

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
    }
  ],
  "hiddenRows": {
    "1": {
      "2": true
    }
  }
}
```

### Markdown 输出示例

```md
# 记忆表格

## 物品
| 名称 | 描述 | 来源 |
| --- | --- | --- |
| | | |
```

### 指令格式（AI 输出）

支持以下表格编辑指令（示例）：

```
update(1,2,2:苹果,3:箱子)
delete(1,3)
insert(1,4,1:香蕉,2:黄色,3:市场)
move(1,4,2)
hide(1,2,true)
```

含义：
- `update(section,row, col:value...)`
- `delete(section,row)`
- `insert(section,row, col:value...)`
- `move(section,from,to)`
- `hide(section,row,true|false)`

---

## 注入位置说明

支持按世界书注入方式定位位置（与 ST 保持一致）：
- `beforeChar` / `afterChar`
- `beforeEm` / `afterEm`
- `beforeAn` / `afterAn`
- `fixed` / `outlet`

---

## 运行入口与 UI 加载

- 入口：[`js/main.js`](js/main.js)
- UI 模板：[`assets/wtl-ui.html`](assets/wtl-ui.html)（运行时加载）
- CSS：[`wtl.css`](wtl.css)（运行时注入）
