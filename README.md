# WorldTreeLibrary

> 一个面向 SillyTavern 的“记忆表格”插件。当前重点不是做复杂推理，而是把**参考信息获取**、**提示词组装**、**AI 调用**、**表格指令解析/应用**、**聊天绑定存储**、**注入与宏注册**这些外围接口和流程先封装稳定，后续内部处理逻辑可以只围绕这些接口继续独立开发。

---

## 1. 项目目标

WorldTreeLibrary 的目标是维护一份**与当前聊天绑定**的本地记忆表格，而不是直接污染角色卡正文或常规世界书内容。

当前实现已经覆盖了以下外围能力：

- 注册插件入口与设置页。
- 读取参考信息：角色卡、聊天记录、当前生效世界书条目。
- 用模板生成 Markdown 记忆表格。
- 允许通过提示词块与参考块自定义最终发给 AI 的内容顺序。
- 支持两种填表发送方式：
  - SillyTavern 默认发送链路。
  - 第三方 OpenAI 兼容接口。
- 接收 AI 返回的表格编辑指令，并在本地自动应用到表格。
- 将结果绑定到当前聊天保存。
- 支持把“当前表格 / 模板 / 指令”自动注入到 `Current Chat` 世界书，或注册为全局宏供用户手动插入。

当前**没有把内部推理逻辑写死**。也就是说，后续你完全可以只阅读本文和相关接口文件，然后单独重写“参考信息裁剪”“提示词策略”“AI 输出协议”“更复杂的表格维护规则”。

---

## 2. 当前代码结构

```text
WorldTreeLibrary/
├─ manifest.json
├─ README.md
├─ wtl.css
├─ assets/
│  ├─ defaults.json
│  ├─ wtl-ui.html
│  └─ presets/
│     ├─ blocks.json
│     ├─ instruction.json
│     ├─ openai.json
│     ├─ order.json
│     ├─ preprompt.json
│     ├─ refBlocks.json
│     ├─ refOrder.json
│     └─ schema.json
└─ js/
   ├─ main.js
   ├─ config.js
   ├─ assets.js
   ├─ storage.js
   ├─ api/
   │  ├─ memory.js
   │  └─ reference.js
   ├─ logic/
   │  ├─ ai.js
   │  ├─ prompt.js
   │  └─ reference.js
   ├─ table/
   │  ├─ apply.js
   │  ├─ commands.js
   │  ├─ markdown.js
   │  └─ template.js
   └─ ui/
      ├─ bindings.js
      ├─ blocks.js
      ├─ refs.js
      ├─ registerButton.js
      └─ registerTopTab.js
```

### 各层职责

- [`manifest.json`](manifest.json) 负责告诉 ST 加载入口脚本。
- [`js/main.js`](js/main.js) 负责等待 ST 上下文可用后初始化插件。
- [`js/ui/registerTopTab.js`](js/ui/registerTopTab.js) 负责注册顶部设置抽屉。
- [`assets/wtl-ui.html`](assets/wtl-ui.html) 提供主界面结构。
- [`js/ui/refs.js`](js/ui/refs.js) 统一收集 DOM 引用。
- [`js/ui/bindings.js`](js/ui/bindings.js) 是插件主控层，负责：
  - 状态加载/保存
  - 事件绑定
  - UI 刷新
  - 提示词预览
  - 注入同步
  - 执行一次填表
- [`js/api/reference.js`](js/api/reference.js) 是较早期的参考信息接口封装。
- [`js/api/memory.js`](js/api/memory.js) 是较早期的回写接口封装。
- [`js/logic/reference.js`](js/logic/reference.js) 负责当前实际使用的参考信息构建与格式化。
- [`js/logic/prompt.js`](js/logic/prompt.js) 负责把各提示词块拼成最终 prompt。
- [`js/logic/ai.js`](js/logic/ai.js) 负责实际调用 ST 或外部 OpenAI 兼容 API。
- [`js/table/template.js`](js/table/template.js) 负责模板结构、模板提示词、模板与 Markdown 间转换。
- [`js/table/markdown.js`](js/table/markdown.js) 负责 Markdown 表格和 JSON 结构互转。
- [`js/table/commands.js`](js/table/commands.js) 负责解析 AI 输出的编辑指令。
- [`js/table/apply.js`](js/table/apply.js) 负责把编辑指令应用到本地表格。
- [`js/storage.js`](js/storage.js) 负责 `localStorage` 的预设与常用存取工具。

---

## 3. 插件启动流程

### 3.1 入口加载

ST 根据 [`manifest.json`](manifest.json) 加载 [`js/main.js`](js/main.js)。

[`js/main.js`](js/main.js) 的流程是：

1. 轮询等待 `window.SillyTavern.getContext()` 与 `window.ST_API.ui` 可用。
2. 通过 [`initConfig()`](js/config.js) 读取默认配置。
3. 通过 [`registerTopTab()`](js/ui/registerTopTab.js) 注册顶部抽屉。
4. 用户第一次打开抽屉时，调用 [`bindWorldTreeUi()`](js/ui/bindings.js) 完成所有 UI 与逻辑绑定。

这里的设计重点是：

- 启动逻辑尽量轻。
- 真正复杂的行为全部下沉到 [`bindWorldTreeUi()`](js/ui/bindings.js)。
- 避免在 ST 尚未准备好时直接调用 API。

---

## 4. UI 总体结构

主界面由 [`assets/wtl-ui.html`](assets/wtl-ui.html) 定义，分为两大页：

### 4.1 主页面

主页面包含：

- 立即填表按钮
- 自动填表开关
- 批量填表
- 回退 / 撤销回退
- 编辑表格
- 编辑模板
- 打开填表配置
- 全局恢复默认
- 清空表格
- 表格主预览区
- 模板编辑器

### 4.2 配置页面

配置页包含：

- 填表模式切换
- 指令注入模式设置
- 模板注入模式设置
- 外部 API 设置
- 世界书读取模式
- 提示词块顺序编辑
- 参考信息块顺序编辑
- 提示词预览 / AI 返回预览
- 表格注入设置
- 破限提示 / 指令 / 模板预设编辑

所有 DOM 引用都集中在 [`getUiRefs()`](js/ui/refs.js) 里统一抓取，避免在 [`js/ui/bindings.js`](js/ui/bindings.js) 里到处重复 `document.getElementById()`。

---

## 5. 当前“填表逻辑”完整链路

这一节是最核心的部分。下面按**实际运行顺序**说明一次填表是怎样完成的。

### 5.1 初始化与状态恢复

用户第一次打开插件设置抽屉时，[`bindWorldTreeUi()`](js/ui/bindings.js) 会调用 [`loadState()`](js/ui/bindings.js:998)。

[`loadState()`](js/ui/bindings.js:998) 的职责：

1. 调用 [`loadTableForChat()`](js/ui/bindings.js:419) 读取当前聊天绑定的表格。
2. 读取当前模板作用域与模板预设。
3. 解析模板，得到 [`templateState`](js/ui/bindings.js:230)。
4. 恢复 UI 控件值：
   - 发送模式
   - 注入开关
   - 第三方 API 参数
   - 自动填表参数
   - 预设选择
   - 世界书读取模式
5. 恢复提示词块与参考块排序。
6. 尝试执行一次默认值修复 [`ensurePromptFieldDefaults()`](js/ui/bindings.js:902)。
7. 刷新模式 UI [`refreshModeUi()`](js/ui/bindings.js:963)。
8. 渲染当前表格预览。
9. 注册全局宏 [`syncPromptMacros()`](js/ui/bindings.js:841)。

也就是说，**插件启动后的第一阶段不是去调用 AI，而是恢复聊天状态和运行环境**。

---

### 5.2 当前聊天表格的加载来源

当前表格通过 [`loadTableForChat()`](js/ui/bindings.js:419) 获取，优先级如下：

1. 聊天元数据中的 `metadata.WorldTreeLibrary.tableJson`
2. 本地 `localStorage` 中的 `wtl.tableJson.{chatKey}`
3. 如果都没有，就根据当前模板生成一个空表

生成空表时会经过以下链路：

1. 找到当前生效模板文本。
2. 调用 [`parseSchemaToTemplate()`](js/table/template.js:57) 把模板文本解析为结构化模板。
3. 调用 [`buildEmptyTableFromTemplate()`](js/table/markdown.js:91) 生成空 JSON 表格。
4. 调用 [`renderJsonToMarkdown()`](js/table/markdown.js:71) 生成 Markdown 表格。

因此表格并不是“硬编码”的，而是**模板驱动生成**。

---

### 5.3 用户点击“立即填表”后发生什么

点击按钮后会执行 [`runFillOnce()`](js/ui/bindings.js:3814)。

[`runFillOnce()`](js/ui/bindings.js:3814) 是整个填表主链路，顺序如下：

#### 第 1 步：加锁

- 若当前已经在运行，则直接返回，防止重复触发。
- 设置 `running = true`。
- 更新状态文本为“填表中”。

#### 第 2 步：收集参考信息

调用 [`buildReferenceBundle()`](js/logic/reference.js:92)：

- 获取当前角色卡。
- 获取当前聊天记录。
- 根据世界书读取模式获取世界书条目。

返回结构：

```js
{
  character,
  chatHistory,
  worldBook: {
    name,
    entries
  }
}
```

这一步得到的是**原始参考数据包**，后续还没有真正变成 prompt 文本。

#### 第 3 步：把参考信息格式化为可拼装块

调用 [`formatReferenceText()`](js/logic/reference.js:260)。

这一层会把原始参考数据转成多个文本块，例如：

- 角色描述
- 性格
- 场景
- 角色示例消息
- 聊天记录
- 世界书条目（按位置分类）
- persona 宏展开结果
- 其他用户自定义参考块

重点是：

- 参考信息不是一大坨字符串直接塞进 prompt。
- 它会先变成**可排序、可隐藏、可包裹前后缀的块集合**。
- 后续由提示词顺序配置决定哪些块进入最终 prompt，以及顺序是什么。

#### 第 4 步：构造最终 prompt

调用 [`buildPrompt()`](js/logic/prompt.js:64)。

这一步会把下列内容按块顺序拼起来：

- 破限提示 [`preprompt`](js/ui/bindings.js:174)
- 填表指令 [`instruction`](js/ui/bindings.js:175)
- 模板提示词
- 当前表格
- 参考信息块
- 用户手动添加的自定义提示词块

其中有几个关键细节：

1. 表格块不是直接使用原始 Markdown，而是会经过 [`filterHiddenRowsFromMarkdown()`](js/logic/prompt.js:6) 过滤隐藏行。
2. 如果某个 section 在模板中标记了 `fillable = false` 或 `sendable = false`，会在发送阶段被跳过。
3. 每个块都可以带前缀和后缀。
4. 被标记为隐藏的块不会进入最终 prompt。

#### 第 5 步：统一展开宏

调用 [`applyAllPromptMacros()`](js/ui/bindings.js:873)。

这里会把最终 prompt 中出现的 ST 宏统一展开。包括：

- ST 自带宏
- 角色卡宏
- 用户预设宏
- WorldTreeLibrary 自己注册的宏

这意味着：

- 插件不是简单拼字符串。
- 它会在最终发送前做一次**宏求值**。

#### 第 6 步：调用 AI

调用 [`callAi()`](js/logic/ai.js)。

发送模式由 [`sendMode`](js/ui/bindings.js:3850) 决定：

- `st`：走 SillyTavern 原生生成能力。
- `external`：走第三方 OpenAI 兼容接口。

在 `external` 模式下，还会把以下参数一起传入：

- `baseUrl`
- `apiKey`
- `model`
- `temperature`
- `maxTokens`
- `stream`

#### 第 7 步：记录 AI 输出

收到 AI 文本后：

- 保存到 `localStorage['wtl.lastAi']`
- 同时准备一份 `pendingAiHistory`，记录：
  - AI 原始文本
  - 抽取后的命令文本
  - 调用来源（酒馆 / 第三方 API）

#### 第 8 步：抽取表格编辑指令

先调用 [`extractEditPayload()`](js/table/commands.js:3)。

如果 AI 使用了下面这种包裹：

```xml
<WTL_TableEdit>
...
</WTL_TableEdit>
```

那么就只提取包裹内部内容；否则默认整个文本都按命令区处理。

然后调用 [`parseCommands()`](js/table/commands.js:16)，解析支持的指令：

- `update[...]`
- `delete[...]`
- `insert[...]`
- `hide[...]`
- `move[...]`

解析结果是结构化命令数组，而不是直接改表。

#### 第 9 步：应用表格编辑命令

调用 [`applyCommands()`](js/table/apply.js:5)。

输入包括：

- 当前表格 Markdown
- 命令数组
- 模板状态
- 当前隐藏行状态

这一步会：

- 更新单元格
- 插入行
- 删除行
- 交换行位置
- 设置隐藏状态
- 自动跳过 `fillable = false` 的 section

返回结果：

```js
{
  markdown,
  hiddenRows
}
```

#### 第 10 步：写回当前聊天状态

- 更新 `tableMdEl.value`
- 重新渲染表格预览
- 调用 [`saveState()`](js/ui/bindings.js:1186)

而 [`saveState()`](js/ui/bindings.js:1186) 内部又会调用 [`saveTableForChat()`](js/ui/bindings.js:768)。

#### 第 11 步：保存历史、刷新宏、结束运行

保存后会：

- 将当前表格状态写入聊天元数据或本地存储
- 追加到历史记录，支持回退
- 重新同步全局宏
- 状态改为“完成”
- 解锁 `running = false`

---

## 6. 参考信息系统详解

### 6.1 当前实际使用的参考信息入口

当前主流程实际使用的是 [`buildReferenceBundle()`](js/logic/reference.js:92) 与 [`formatReferenceText()`](js/logic/reference.js:260)。

### 6.2 角色卡获取

[`buildReferenceBundle()`](js/logic/reference.js:92) 会从 ST 上下文拿当前角色：

1. 获取当前 `characterId`
2. 从 `ctx.characters` 取当前角色对象
3. 尝试拿到角色名
4. 再调用 `ST_API.character.get({ name })` 拉取完整角色卡

### 6.3 聊天记录获取

优先尝试：

- `format: 'openai'`

如果失败或拿不到消息，再退回：

- `format: 'gemini'`

这使得插件对不同消息格式有一定兼容性。

### 6.4 世界书读取模式

有两种模式：

#### 自动读取 `auto`

[`buildReferenceBundle()`](js/logic/reference.js:207) 会：

- 读取 `scope = chat` 的世界书列表
- 读取 `scope = character` 的世界书列表
- 去重后逐本拉取完整内容
- 合并所有条目

然后调用 [`resolveAutoWorldBookEntries()`](js/logic/reference.js:56) 尝试根据 ST 的 prompt build 结果，模拟“当前实际会被注入的条目”。

这是当前代码里非常关键的一点：

- 它不是简单“把所有书全塞进去”。
- 它尽量模拟 ST 的世界书激活效果，从而提取更接近真实发送链路的参考条目。

#### 手动读取 `manual`

由配置页手动勾选书和条目。

此时 [`buildReferenceBundle()`](js/logic/reference.js:147) 会：

- 遍历手动选择的书
- 拉取完整书内容
- 根据 UI 中勾选的条目进行筛选
- 允许对条目的 `enabled / role / position / order / depth / key` 等参数做覆写

这意味着手动模式不只是“选择条目”，还支持“在读参考时临时改条目参数”。

### 6.5 参考信息格式化

[`formatReferenceText()`](js/logic/reference.js:260) 会把结构化参考数据变成文本块。

它还会主动解析几个 ST 宏：

- `{{description}}`
- `{{personality}}`
- `{{scenario}}`
- `{{mesExamples}}`
- `{{charDepthPrompt}}`
- `{{persona}}`

所以参考信息层并不是“原样直传角色卡字段”，而是会尽量与 ST 的既有宏系统保持一致。

---

## 7. 提示词块系统详解

当前插件把 prompt 分为两层排序系统。

### 7.1 左侧：提示词总顺序

由 [`wtl.blockOrder`](js/ui/bindings.js:1023) 控制。

典型块包括：

- `preprompt`
- `instruction`
- `schema`
- `table`
- `reference`
- `chat`
- `custom`

最终 prompt 的拼接顺序由这些块的顺序决定。

### 7.2 右侧：参考信息内部顺序

由 [`wtl.refBlockOrder`](js/ui/bindings.js:1024) 控制。

典型块包括：

- character
- persona
- worldBook
- 其他自定义参考块

它们先在参考信息层内部排序，然后汇总到 `reference` 总块中。

### 7.3 块的附加属性

每个块都支持：

- `hidden`：隐藏后不发送
- `prefix`
- `suffix`
- `usePrefix`
- `useSuffix`

这些包装参数会在 [`buildPrompt()`](js/logic/prompt.js:64) 或 [`getBlockTextAsync()`](js/ui/bindings.js:2055) 中实际应用。

因此这个系统本质上是一个**可视化 prompt 编排器**。

---

## 8. 模板系统详解

### 8.1 模板的两种表示

当前模板有两种表示方式：

1. Markdown 表格骨架
2. JSON 元数据

在 [`templateToSchemaMarkdown()`](js/table/template.js:170) 中，会输出：

- 一份可读的 Markdown 表格模板
- 一段 `<WTL_Template type="json">...</WTL_Template>` JSON 元数据

这样做的好处是：

- 人可以看 Markdown。
- 机器可以读 JSON 元数据，保留 section/column 的额外规则与 ID。

### 8.2 模板解析

[`parseSchemaToTemplate()`](js/table/template.js:57) 的策略是：

1. 先找 JSON 模板块。
2. 如果存在 JSON，就优先按 JSON 恢复完整模板。
3. 如果没有，再退回解析 Markdown 结构。

这意味着：

- 即使用户只保留 Markdown，模板也还能跑。
- 如果保留 JSON 元数据，则可以得到更完整的 section / column 定义和规则。

### 8.3 section 和 column 的元信息

每个 section 支持：

- `name`
- `definition`
- `insertRule`
- `updateRule`
- `deleteRule`
- `fillable`
- `sendable`

每个 column 支持：

- `name`
- `definition`
- `insertRule`
- `updateRule`
- `deleteRule`

### 8.4 模板如何变成发给 AI 的说明文本

由 [`buildTemplatePrompt()`](js/table/template.js:186) 负责。

它会把模板组织成一种偏说明书风格的文本，例如：

- section 编号与名称
- section 定义
- section 的增删改条件
- 字段说明
- 每列的增删改条件

也就是说，**发给 AI 的“schema”并不是原始 Markdown 模板，而是模板说明文本**。

这是非常重要的设计点：

- 给 AI 的是“怎么填表的规则说明”。
- 本地保存的则是“真实表格数据”。

---

## 9. 表格数据系统详解

### 9.1 表格的三种形态

当前表格在系统里有三种形态：

#### 形态 A：模板结构

由 [`parseSchemaToTemplate()`](js/table/template.js:57) 产生。

#### 形态 B：JSON 表格

由 [`parseMarkdownTableToJson()`](js/table/markdown.js:41) 和 [`buildEmptyTableFromTemplate()`](js/table/markdown.js:91) 使用。

结构大致为：

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
  "hiddenRows": {}
}
```

#### 形态 C：Markdown 表格

由 [`renderJsonToMarkdown()`](js/table/markdown.js:71) 输出，用于：

- UI 展示
- 本地保存
- 宏输出
- 注入世界书

### 9.2 表格外层包装

插件使用：

- `<WTL_Table>`
- `</WTL_Table>`

作为表格外层包裹。

相关函数：

- [`wrapTable()`](js/table/markdown.js:3)
- [`stripTableWrapper()`](js/table/markdown.js:10)
- [`ensureTableWrapper()`](js/table/markdown.js:14)

这样做的目的：

- 方便从混合文本中稳定提取表格。
- 便于注入和宏调用时保持结构一致。

### 9.3 隐藏行机制

插件支持“隐藏某些行但不删除”。

隐藏状态单独保存在 `hiddenRows` 中，而不是直接改 Markdown。

发送给 AI 时：

- [`filterHiddenRowsFromMarkdown()`](js/logic/prompt.js:6)
- [`getTablePreviewForSend()`](js/ui/bindings.js:260)

会把隐藏行过滤掉。

这样做的价值：

- UI 里可保留历史信息。
- 发送时减少 token。
- 避免已经废弃的旧记忆继续污染 AI。

---

## 10. AI 输出协议详解

### 10.1 外层包裹

推荐 AI 输出：

```text
<WTL_TableEdit>
update[1,1,2:"苹果"]
insert[2,1,1:"酒馆",2:"城市"]
</WTL_TableEdit>
```

但当前实现也兼容无包裹的纯文本命令。

### 10.2 支持的命令

由 [`parseCommands()`](js/table/commands.js:16) 解析，支持：

#### `update[section,row,col:value,...]`

更新指定 section 的某一行中的若干列。

#### `delete[section,row]`

删除某一行。

#### `insert[section,row,...]`

在指定位置插入一行。

支持两种写法：

- 指定列号写法
- 位置顺序写法

#### `hide[section,row,true|false]`

标记该行为隐藏或取消隐藏。

#### `move[section,from,to]`

交换两行位置。

### 10.3 指令应用规则

由 [`applyCommands()`](js/table/apply.js:5) 实现，重要规则：

- 非法 section 会被忽略。
- `fillable = false` 的 section 不允许 AI 修改。
- `insert` 时如果列不够，允许自动扩展列。
- `delete` 和 `insert` 后会重置该 section 的隐藏行索引映射。
- `move` 会同步交换隐藏状态。

这部分已经足够支撑后续更复杂的“AI 表格维护协议”。

---

## 11. 发送模式详解

### 11.1 `st` 模式

`sendMode = st` 时，调用 [`callAi()`](js/logic/ai.js) 走 SillyTavern 原生生成链路。

适用场景：

- 想复用 ST 的既有模型配置
- 想继续走 ST 自身的请求体系
- 想让填表行为更贴近酒馆原有发送生态

### 11.2 `external` 模式

`sendMode = external` 时，调用外部 OpenAI 兼容接口。

配置来自：

- URL
- Key
- 模型
- 温度
- 最大 tokens
- 是否流式

第三方 API 的流式开关当前默认开启，配置来源见 [`assets/defaults.json`](assets/defaults.json)。

### 11.3 预览系统

在 external 模式下，配置页右侧会显示：

- 最终发送 prompt 预览
- AI 返回预览

刷新逻辑由 [`refreshPromptPreview()`](js/ui/bindings.js:3563) 驱动。

---

## 12. 注入系统详解

插件支持把三类内容自动写入 `Current Chat` 世界书：

- 当前表格
- 当前填表指令
- 当前模板说明

### 12.1 表格注入

由 [`syncTableInjection()`](js/ui/bindings.js:3263) 负责。

写入条目名：

- `{entryName}__table`

内容来源：

- [`getTablePreviewForSend()`](js/ui/bindings.js:260) 生成的“发送态表格”

### 12.2 指令注入

由 [`syncInstructionInjection()`](js/ui/bindings.js:3331) 负责。

写入条目名：

- `{entryName}__instruction`

### 12.3 模板注入

由 [`syncSchemaInjection()`](js/ui/bindings.js:3399) 负责。

写入条目名：

- `{entryName}__schema`

### 12.4 注入模式

三类注入都支持：

- `inject`：自动注入到 `Current Chat`
- `macro`：不自动注入，只注册宏

当模式是 `macro` 或注入开关关闭时，现有世界书条目会被禁用而不是强删，这样更安全。

---

## 13. 宏系统详解

### 13.1 插件注册的三个全局宏

由 [`syncPromptMacros()`](js/ui/bindings.js:841) 注册：

- `{{WTL_TableInstruction}}`
- `{{WTL_TableTemplate}}`
- `{{WTL_TableLatest}}`

对应内容分别是：

- 当前填表指令
- 当前模板说明文本
- 当前过滤隐藏行后的表格

### 13.2 宏模式的含义

宏模式不是额外的发送模式，而是**注入方式**。

也就是说：

- 指令可以用宏
- 模板可以用宏
- 表格可以用宏

用户可以把这些宏自行插入：

- 世界书
- 系统提示词
- 预设
- 其他支持宏的 ST 位置

### 13.3 普通宏展开

[`applyAllPromptMacros()`](js/ui/bindings.js:873) 会在发送前对完整 prompt 再跑一遍宏处理。

因此：

- 用户在块内容中写的普通 ST 宏仍然生效。
- WorldTreeLibrary 的自定义宏也可以被解析。

---

## 14. 存储系统详解

### 14.1 聊天绑定表格存储

当前主流程里的表格数据，优先保存在聊天元数据里，见 [`saveTableForChat()`](js/ui/bindings.js:768)。

保存内容包括：

- `tableJson`
- `table`

如果更新聊天元数据失败，则回退到：

- `localStorage['wtl.tableJson.{chatKey}']`
- `localStorage['wtl.table.{chatKey}']`

### 14.2 历史记录存储

历史记录存储在：

- `wtl.history.{chatKey}`
- `wtl.history.index.{chatKey}`

每次成功写表后会追加一份历史快照，包含：

- 时间
- 表格 JSON
- 表格 Markdown
- AI 原始输出
- 命令文本
- 来源

### 14.3 预设存储

[`js/storage.js`](js/storage.js) 统一管理以下预设：

- 破限提示
- 填表指令
- 模板
- OpenAI 配置
- 提示词块顺序
- 参考块顺序

### 14.4 作用域模板绑定

模板预设额外支持按作用域绑定：

- 全局
- 角色
- 聊天

优先级由 [`resolveSchemaByScope()`](js/ui/bindings.js:368) 决定：

1. chat
2. character
3. global

这意味着未来“同一个插件面对不同角色/不同聊天自动切模板”已经有了完整外壳。

---

## 15. 两套“接口封装”说明

用户最初要求的是先把：

- 获取参考信息封装成内部接口
- 最终回写封装成内部接口

当前项目里有两套相关层次：

### 15.1 轻量 API 层

#### 参考信息接口

见 [`getReferenceBundle()`](js/api/reference.js:99) 与 [`getReferenceItems()`](js/api/reference.js:48)。

这套接口偏“文档型封装”，目的在于：

- 给后续开发者一个清晰的最小接口面
- 可以脱离 UI 单独调用
- 更适合作为后续真正业务层的稳定 API

#### 回写接口

见：

- [`upsertMemoryTableEntry()`](js/api/memory.js:4)
- [`saveMemoryTableState()`](js/api/memory.js:75)
- [`loadMemoryTableState()`](js/api/memory.js:86)
- [`persistMemory()`](js/api/memory.js:93)

这套接口强调的是“最终状态如何保存”。

### 15.2 当前实际运行逻辑层

真正执行填表时，目前主链路直接使用：

- [`buildReferenceBundle()`](js/logic/reference.js:92)
- [`formatReferenceText()`](js/logic/reference.js:260)
- [`saveTableForChat()`](js/ui/bindings.js:768)
- 三个注入同步函数

也就是说：

- [`js/api/reference.js`](js/api/reference.js) / [`js/api/memory.js`](js/api/memory.js) 更偏“对外接口文档层”。
- [`js/logic/reference.js`](js/logic/reference.js) / [`js/ui/bindings.js`](js/ui/bindings.js) 更偏“当前实际产品逻辑层”。

后续如果你要继续重构，建议方向是：

1. 保持 [`js/api/reference.js`](js/api/reference.js) 与 [`js/api/memory.js`](js/api/memory.js) 作为稳定服务接口。
2. 让 UI 主流程逐步改为只调用这套服务接口。
3. 让 [`js/logic/reference.js`](js/logic/reference.js) 退化成 API 层的内部实现。

---

## 16. 自动填表、批量填表、拦截发送

### 16.1 自动填表

当前 UI 已有自动填表开关与参数：

- 最近消息层数
- 触发频率

状态通过 [`saveState()`](js/ui/bindings.js:1186) 写入本地。

### 16.2 批量填表

批量逻辑会生成聊天切片，然后重复调用 [`runFillOnce()`](js/ui/bindings.js:3814)。

本质上它并没有另写一套 AI 逻辑，而是复用单次填表主链路。

### 16.3 发送前拦截

[`ensureHooks()`](js/ui/bindings.js:3467) 会通过 `ST_API.hooks.install` 拦截发送按钮和回车发送。

拦截后会：

1. 先刷新 prompt 预览
2. 保存当前状态
3. 同步三类注入
4. 调用 `bypassOnce`
5. 再触发原始发送

这意味着自动注入是尽量在**用户真正发送消息前**保持最新状态。

---

## 17. 默认值恢复机制

### 17.1 默认值来源

默认值主要来自两个地方：

- [`assets/defaults.json`](assets/defaults.json)
- `window.__WTL_PRESETS__` 与本地预设存储

### 17.2 空值自动恢复

[`ensurePromptFieldDefaults()`](js/ui/bindings.js:902) 会尝试在以下字段为空时恢复默认：

- `preprompt`
- `instruction`
- `schema`

### 17.3 全局恢复默认

由 [`resetAllDefaults()`](js/ui/bindings.js:1294) 负责，主要做：

- 清理相关 localStorage
- 还原默认预设集
- 还原默认模式配置
- 重建模板状态
- 基于模板生成空白表格
- 清空隐藏行
- 保存并同步宏与注入

### 17.4 当前已知问题

“内容被清空后自动恢复默认”这一点，虽然已经在多个路径接入修复逻辑，但用户此前反馈仍存在未完全修复的情况。

因此目前应视为：

- **恢复默认按钮**：可用
- **启动时的默认值兜底**：基本可用
- **任意编辑路径下删空即自动恢复**：仍需要继续排查

后续建议重点检查：

- 模板源文本 `schemaSource` 与 [`schemaEl`](js/ui/bindings.js:235) 的覆盖顺序
- 预设激活项为空时的兜底顺序
- 某些按钮路径是否绕过了 [`ensurePromptFieldDefaults()`](js/ui/bindings.js:902)

---

## 18. 当前设计中最重要的几个扩展点

如果后续要独立继续开发，最值得扩展的是下面这些点。

### 18.1 参考信息裁剪策略

现在的参考信息已经能拿到，但“如何裁剪得更适合填表”还没有做细。

建议扩展位置：

- [`buildReferenceBundle()`](js/logic/reference.js:92)
- [`formatReferenceText()`](js/logic/reference.js:260)
- 或直接重构为新的服务层

### 18.2 更严格的 AI 输出协议

当前支持的命令已经够用，但还可以继续加：

- 行唯一键
- 按列名更新
- 批量操作
- 冲突检测
- 事务回滚

建议扩展位置：

- [`parseCommands()`](js/table/commands.js:16)
- [`applyCommands()`](js/table/apply.js:5)

### 18.3 记忆注入位置策略

现在“表格 / 模板 / 指令”都支持 inject 或 macro，但未来还可以加入：

- 更细的注入条件
- 仅在特定角色 / 特定聊天生效
- 与世界书激活条件联动

### 18.4 存储后端统一

当前聊天数据主链路使用“聊天元数据 + localStorage fallback”，而 API 层还提供了 [`variables`](js/api/memory.js:75) 方案。

后续可以统一为：

- 只走聊天元数据
- 或只走 `variables.local`
- 或做双写策略

目前推荐先统一，减少后续维护成本。

---

## 19. 推荐的后续重构方向

如果下一阶段要继续做，我建议按下面顺序推进：

### 第一阶段：接口统一

把 UI 主流程统一改成只依赖：

- [`js/api/reference.js`](js/api/reference.js)
- [`js/api/memory.js`](js/api/memory.js)

这样“文档接口”和“实际运行接口”就不会分裂。

### 第二阶段：把 prompt 编排抽出服务层

当前 [`buildPrompt()`](js/logic/prompt.js:64) 已经比较清晰，但块排序、前后缀、宏处理很多仍挂在 [`js/ui/bindings.js`](js/ui/bindings.js)。

建议抽出：

- prompt service
- injection service
- macro service

### 第三阶段：增强命令协议

把 AI 输出从“纯位置型更新”升级为“结构化更新协议”。

### 第四阶段：补测试

当前项目几乎没有自动化测试。后续最适合先补的是纯函数测试：

- [`parseSchemaToTemplate()`](js/table/template.js:57)
- [`buildTemplatePrompt()`](js/table/template.js:186)
- [`parseMarkdownTableToJson()`](js/table/markdown.js:41)
- [`renderJsonToMarkdown()`](js/table/markdown.js:71)
- [`parseCommands()`](js/table/commands.js:16)
- [`applyCommands()`](js/table/apply.js:5)

---

## 20. 核心文件速查

### 启动与 UI

- [`js/main.js`](js/main.js)
- [`js/ui/registerTopTab.js`](js/ui/registerTopTab.js)
- [`assets/wtl-ui.html`](assets/wtl-ui.html)
- [`js/ui/refs.js`](js/ui/refs.js)
- [`js/ui/bindings.js`](js/ui/bindings.js)

### 参考信息

- [`js/api/reference.js`](js/api/reference.js)
- [`js/logic/reference.js`](js/logic/reference.js)

### 提示词与 AI

- [`js/logic/prompt.js`](js/logic/prompt.js)
- [`js/logic/ai.js`](js/logic/ai.js)

### 表格

- [`js/table/template.js`](js/table/template.js)
- [`js/table/markdown.js`](js/table/markdown.js)
- [`js/table/commands.js`](js/table/commands.js)
- [`js/table/apply.js`](js/table/apply.js)

### 存储与回写

- [`js/storage.js`](js/storage.js)
- [`js/api/memory.js`](js/api/memory.js)

---

## 21. 总结

当前 WorldTreeLibrary 已经具备了一条完整的“外围填表流水线”：

1. 加载当前聊天状态。
2. 获取角色卡、聊天记录、世界书条目。
3. 将参考信息格式化为可排序块。
4. 将破限提示、指令、模板、表格、参考信息按用户定义顺序拼装。
5. 展开宏。
6. 调用 ST 或第三方 API。
7. 解析 AI 返回的表格编辑命令。
8. 把命令应用到本地 Markdown 表格。
9. 将表格绑定到当前聊天保存。
10. 可选自动注入到 `Current Chat` 或注册为宏。

也就是说，**真正缺的已经不是外围框架，而主要是“你希望 AI 如何理解参考信息、如何决策编辑表格”这部分内部策略**。这正符合当前阶段的目标：先把接口、数据流、存储流、注入流和 UI 操作流全部打通。
