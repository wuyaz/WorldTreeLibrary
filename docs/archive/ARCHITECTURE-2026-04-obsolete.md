# WorldTreeLibrary 记忆表格架构说明

## 架构全景图

本项目严格遵循五层架构设计，各层职责明确，界限分明。

### 第一层：数据持久与状态层 (Data & State Layer)

**职责**：绝对的底层，只负责数据的存取和转换，不允许有任何业务逻辑或UI代码。

#### 模块清单

1. **TableSerializer.js** - Markdown-JSON 序列化引擎
   - `deserialize()` - Markdown转JSON
   - `serialize()` - JSON转Markdown
   - 纯数据转换，无业务逻辑

2. **SnapshotStack.js** - 状态快照栈
   - `push()` - 推入快照
   - `undo()` - 撤销
   - `redo()` - 重做
   - 核心数据结构：Array<TableState>

3. **ConfigStore.js** - 配置存储器
   - 模板仓库管理
   - 格式化规则区（自定义前后缀）
   - 作用域模板绑定

4. **SessionSandbox.js** - 沙箱会话管理器
   - 以Chat ID为主键建立沙箱
   - 表格数据隔离
   - 历史记录管理

### 第二层：上下文采集与适配层 (Context Acquisition Layer)

**职责**：探针层，负责从酒馆系统安全地获取数据，严格遵循只读原则。

#### 模块清单

1. **WorldInfoAdapter.js** - 世界书双模适配器
   - `getActivatedWorldInfo()` - Auto Mode（继承模式）
   - `getAllWorldInfo()` - Manual Mode（劫持模式）
   - `normalizeWorldInfo()` - 数据标准化

2. **ContextReader.js** - 基础上下文读取器
   - `getChatLog()` - 获取聊天记录
   - `getCharacterCard()` - 获取角色卡
   - `extractCharacterBlocks()` - 分块提取角色设定

### 第三层：提示词装配与路由层 (Prompt & Dispatch Layer)

**职责**：核心业务逻辑区，负责提示词生成和组装。

#### 模块清单

1. **PromptGenerator.js** - 提示词生成工厂
   - `generateInstruction()` - 生成填表指令
   - `generateSchema()` - 生成表格范式
   - `generateTableContent()` - 生成表格内容
   - `generatePreprompt()` - 生成破限提示

2. **SequenceBuilder.js** - 序列组装器
   - `build()` - 构建完整提示词序列
   - `wrapWithPrefixSuffix()` - 注入自定义前后缀
   - `buildReferenceBlock()` - 构建参考信息块

### 第四层：指令解析与执行引擎 (Command Execution Layer)

**职责**：防弹衣，处理AI不可控的输出。

#### 模块清单

1. **CommandParser.js** - 管道符正则解析器
   - `parse()` - 解析命令列表
   - `parseLine()` - 解析单行命令
   - `parseUpdate/Insert/Delete/Hide/Move()` - 各类型命令解析
   - 包含完整的容错与修正逻辑

2. **MutationExecutor.js** - 表格变更执行器
   - `execute()` - 执行命令列表
   - `executeUpdate/Insert/Delete/Move()` - 执行各类变更
   - `updateHiddenRows()` - 更新隐藏行状态
   - 触发快照栈记录

### 第五层：表现与交互层 (UI/Presentation Layer)

**职责**：皮囊，只负责展现和呼叫，绝不能碰任何数据解析和拼接的逻辑。

#### 模块清单

1. **ViewRenderer.js** - 视图渲染器
   - `renderTable()` - 渲染表格
   - `renderStatus()` - 更新状态显示
   - `enableInlineEditing()` - 启用内联编辑
   - 纯DOM操作，无数据逻辑

## 核心门面（Facade）

**MemoryTableCore.js** - 统一入口

这是业务逻辑的唯一入口，协调各层工作：

```javascript
const core = new MemoryTableCore(ST_API);

// 切换聊天
core.switchChat(chatId);

// 填表
const result = await core.fillTable({
  floorCount: 12,
  sendMode: 'st'
});

// 撤销/重做
core.undo();
core.redo();
```

## 架构原则

### 1. 单向数据流

```
用户操作 -> Controller -> Core -> 数据层
                        ↓
                    业务逻辑层
                        ↓
                    UI层更新
```

### 2. 依赖倒置

- 上层依赖下层
- 下层不知道上层的存在
- 通过接口（方法）通信

### 3. 单一职责

每个模块只负责一件事：

- TableSerializer：只管序列化
- SnapshotStack：只管快照
- CommandParser：只管解析
- MutationExecutor：只管执行

### 4. 禁止跨层调用

❌ **错误示例**（旧代码）：

```javascript
// UI层直接调用数据层
renderPreview(tableMd) {
  const sections = parseSections(tableMd);  // ❌ 跨层调用
  this.ui.tableHeadEl.innerHTML = ...       // ❌ 混合逻辑
}
```

✅ **正确示例**（新架构）：

```javascript
// Controller调用Core
async loadTable() {
  const data = this.core.loadCurrentTable();  // ✅ 通过Core
  this.viewRenderer.renderTable(data);         // ✅ 交给ViewRenderer
}
```

## 重构成果

### 已解决的问题

1. **跨层调用** - 所有脏代码已重构
2. **职责混乱** - 各模块职责清晰
3. **硬编码** - 所有配置移至ConfigStore
4. **数据污染** - SessionSandbox隔离聊天数据

### 架构优势

1. **可维护性** - 修改一层不影响其他层
2. **可测试性** - 每层可独立测试
3. **可扩展性** - 新增功能只需扩展对应层
4. **可读性** - 代码结构清晰明了

## 文件结构

```
js/features/memoryTable/
├── core/                     # 第一层：数据持久与状态层
│   ├── TableSerializer.js    # 序列化引擎
│   ├── SnapshotStack.js      # 快照栈
│   ├── ConfigStore.js        # 配置存储器
│   ├── SessionSandbox.js     # 会话沙箱
│   └── MemoryTableCore.js    # 核心门面
├── services/                 # 第二、三、四层：业务逻辑层
│   ├── WorldInfoAdapter.js   # 世界书适配器（第二层）
│   ├── ContextReader.js      # 上下文读取器（第二层）
│   ├── PromptGenerator.js    # 提示词生成（第三层）
│   ├── SequenceBuilder.js    # 序列组装（第三层）
│   ├── CommandParser.js      # 命令解析（第四层）
│   └── MutationExecutor.js   # 变更执行（第四层）
└── ui/                       # 第五层：表现层
    └── ViewRenderer.js       # 视图渲染器
```

## 后续工作

### 待实现的注入路由层

需要创建 `InjectionRouter.js` 来处理：

1. **伴随发送拦截器** - 计算酒馆Payload，精准切入
2. **第三方独立请求器** - 打包HTTP Request

### 待实现的拖拽排序引擎

需要创建 `DragDropManager.js` 来处理：

1. 提示词块顺序拖拽
2. 参考信息顺序拖拽
3. 将新的顺序传递给SequenceBuilder

---

**架构原则**：各司其职，界限分明。不要再看到"点击按钮的同时去切割字符串修改Markdown"这种灾难级别的代码。
