# WorldTreeLibrary
> 面向 SillyTavern 的模块化插件架构，采用现代 MVC 设计模式与分层架构。

WorldTreeLibrary 是一个为 SillyTavern 设计的插件系统，提供模块化、可扩展的架构基础。当前版本已实现完整的插件生命周期管理、事件总线通信、配置管理和模块化功能加载机制。

## 1. 项目目标

WorldTreeLibrary 旨在为 SillyTavern 提供一个现代化、可维护的插件开发框架，通过严格的架构分层和模块化设计，实现以下目标：

### 1.1 架构标准化
- 强制实施 MVC（Model-View-Controller）设计模式
- 清晰的代码分层：数据层、服务层、UI层、控制层
- 统一的模块入口和生命周期管理

### 1.2 模块化扩展
- 支持独立功能模块的开发和集成
- 事件驱动的模块间通信
- 可配置的功能开关和运行时启用/禁用

### 1.3 核心能力封装
当前版本已实现的基础架构能力包括：

- **插件生命周期管理**：完整的初始化、挂载、销毁流程
- **事件总线系统**：模块间解耦通信机制
- **配置管理系统**：统一配置加载、默认值管理、预设系统
- **UI 组件注册**：SillyTavern 原生 UI 集成（顶部标签页、设置面板、功能菜单）
- **模块化功能加载**：基于配置的功能开关和懒加载
- **存储抽象层**：本地存储、聊天元数据、配置持久化

### 1.4 已实现的功能模块
1. **Memory Table 功能模块**（记忆表格）
   - 结构化记忆数据的存储和展示
   - 模板驱动的表格生成
   - AI 辅助的表格内容填充

2. **Chat Manager 功能模块**（聊天管理）
   - 聊天数据的结构化组织
   - 标签系统和文件夹管理
   - 批量操作和聊天状态维护

### 1.5 开发体验优化
- 统一的开发规范和目录结构
- 清晰的 API 边界和模块依赖管理
- 易于调试和测试的组件化设计

---

## 2. 强制目录与架构规范

为确保项目长期可维护性和未来功能扩展的稳定性，WorldTreeLibrary 要求所有后续开发严格遵守统一的模块化架构标准。

### 2.1 Feature 内部强制采用统一分层

所有功能模块必须遵循 MVC（Model-View-Controller）或等效的三层架构（数据-逻辑-表现）。无论是现有的"记忆表格"、"聊天管理"，还是未来新增的功能，`features/` 目录下的结构必须保持一致：

```text
js/features/<featureName>/
├── data/         # 数据层：专门负责数据结构定义与数据读写操作
│   ├── 封装本地存储读写（如 localStorage、extension_settings）
│   ├── 定义、转换和校验数据结构（如表格模板的 JSON Schema）
│   ├── 提供默认数据模型
│   └── 【禁忌】：禁止包含任何界面操作或外部网络请求代码
│
├── services/     # 服务层：业务逻辑处理的核心
│   ├── 处理所有核心业务计算（如提取历史聊天记录、组装 Prompt、解析 AI 返回指令）
│   ├── 负责所有对外网络请求和 API 交互（如请求 OpenAI 接口，调用酒馆原生 API）
│   └── 【禁忌】：仅接收数据、处理数据并返回结果，禁止感知 UI 存在，禁止包含任何 DOM 操作
│
├── ui/           # 视图层：纯粹的界面展示层
│   ├── 纯 HTML/DOM 节点创建、渲染与销毁
│   ├── 对外暴露界面更新方法（如接收到数据后渲染表格、生成弹窗内容）
│   └── 【禁忌】：保持"纯展示"职责，禁止编写业务逻辑事件监听器（如 onClick），禁止直接调用 services 或 data 模块
│
├── controllers/  # 控制层：统一调度的协调层
│   ├── 作为 UI 层和 Services 层的唯一桥梁
│   ├── 负责为 UI 元素绑定具体事件（如监听"保存"按钮点击、输入框修改）
│   ├── 业务流转中心：监听用户操作后调用 Services 处理逻辑，取得结果后交由 UI 层更新界面
│   └── 【禁忌】：禁止将复杂算法或 API 请求堆积在此，仅负责"任务分配"
│
└── index.js      # 入口文件：模块的唯一对外接口
    ├── 作为对外暴露的唯一入口，其他模块禁止直接引用该目录下的内部文件
    ├── 负责子功能启动时的全局配置加载、UI 页签注册、CSS 注入
    ├── 将功能挂载到酒馆生命周期中（如监听酒馆加载完毕事件）
    └── 【禁忌】：禁止在此编写具体业务逻辑代码，仅负责初始化和模块组装
```

以上是后续开发必须遵循的强制性标准，禁止新功能采用无分层的单一文件方式堆叠逻辑。

### 2.2 项目目标目录结构
```text
WorldTreeLibrary/
├── manifest.json
├── README.md
├── assets/
│   ├── css/
│   │   ├── wtl-global.css
│   │   ├── wtl-table.css
│   │   └── wtl-chat.css
│   ├── html/
│   │   ├── main-panel.html
│   │   ├── modal-templates.html
│   │   └── feature-templates/
│   ├── defaults.json
│   └── presets/
│       └── ...
└── js/
    ├── main.js
    ├── core/
    │   ├── configManager.js
    │   ├── assetLoader.js
    │   ├── storage.js
    │   └── eventBus.js
    ├── shared/
    │   ├── ui/
    │   ├── utils/
    │   └── sillytavern/
    └── features/
        ├── memoryTable/
        │   ├── index.js
        │   ├── data/
        │   ├── services/
        │   ├── ui/
        │   └── controllers/
        └── chatManager/
            ├── index.js
            ├── data/
            ├── services/
            ├── ui/
            └── controllers/
```

### 2.3 各层职责说明（绝对边界）

**main.js（全局总控）**
- 职责：仅负责插件生命周期管理、默认配置加载，以及向酒馆挂载功能入口
- 禁忌：禁止在此编写任何具体业务逻辑或直接操作内部 DOM

**core/（底层基础设施）**
- 职责：存放与具体业务完全无关的全局基础设施（如事件总线、存储包装器）
- 禁忌：若工具或方法带有"记忆"、"聊天"等业务属性，禁止放入此目录

**shared/（公共资源池）**
- 职责：存放多个 Feature 复用的 UI 组件库、通用工具函数，以及酒馆 API 的二次封装

**features/<feature>/data/（数据层）**
- 职责：仅处理状态模型定义、数据格式转换，以及与本地存储（Storage/Settings）的直接读写交互
- 禁忌：禁止包含任何 DOM 操作或发起网络请求

**features/<feature>/services/（服务层）**
- 职责：仅处理核心算法、数据转换、逻辑判断、AI 调用与原生接口请求
- 禁忌：保持"无界面感知"，禁止直接接触或感知 UI 层存在，仅接收数据并返回结果

**features/<feature>/ui/（视图层）**
- 职责：仅负责 HTML 模板拼接、DOM 节点渲染、销毁以及 CSS 样式绑定
- 禁忌：保持"纯展示"，禁止包含业务计算逻辑，禁止主动调用接口

**features/<feature>/controllers/（控制层）**
- 职责：作为连接 UI 和 Services 的唯一桥梁。负责监听 UI 事件 → 派发给 Services 处理 → 取得结果后驱动 UI 更新
- 禁忌：仅做"任务分配"，禁止将大量接口请求或数据处理算法写在事件回调中

**features/<feature>/index.js（模块入口）**
- 职责：仅负责该 Feature 的内部初始化，并向外部暴露需要公开的方法

### 2.4 强制约束（核心原则）

**单一职责分离**：禁止将数据层、接口层、DOM 渲染层和事件绑定层混杂在同一文件中。发现违反即需重构。

**架构先行原则**：任何新功能开发，必须优先建立 data/、services/、ui/、controllers/、index.js 的标准目录结构，确认各层边界后方可编写业务代码。

**渐进式重构**：旧功能重构时，必须以标准结构为目标逐步拆分迁移。不求一次到位，但禁止在原有混乱结构上继续堆砌代码。

**黑盒封装原则**：index.js 是每个 Feature 对外的绝对边界。外部模块如需调用某 Feature 功能，必须且仅能通过其 index.js 暴露的接口。禁止外部模块直接通过路径引入并调用内部深层的 services 或 data 文件。

---

## 3. 插件启动流程

### 3.1 入口加载与初始化

SillyTavern 根据 `manifest.json` 加载 `js/main.js`，启动流程如下：

#### 阶段一：环境检测与准备
1. **SillyTavern 上下文等待**：轮询检测 `window.SillyTavern.getContext()` 和 `window.ST_API.ui` 可用性
2. **样式预加载**：注入 WTL 内联样式，确保 UI 组件样式就绪
3. **全局状态初始化**：设置初始化标志和重试计数器

#### 阶段二：配置加载与存储
1. **配置管理器初始化**：调用 `loadConfig()` 加载配置文件
   - 从 `assets/defaults.json` 读取默认配置
   - 从本地存储加载用户配置覆盖
   - 从预设目录加载功能预设
2. **全局存储设置**：将配置存储到 `window.__WTL_CONFIG__`、`window.__WTL_DEFAULTS__`、`window.__WTL_PRESETS__`
3. **功能标志加载**：从 `localStorage` 读取功能启用状态

#### 阶段三：功能模块初始化
1. **Memory Table 功能**：根据功能标志初始化记忆表格模块
   - 实例化 `MemoryTableFeature` 类
   - 调用 `initialize()` 方法进行模块初始化
   - 注册模块事件监听器
2. **Chat Manager 功能**：根据功能标志初始化聊天管理模块
   - 实例化 `ChatManagerFeature` 类
   - 调用 `initialize()` 方法进行模块初始化
   - 设置聊天数据监听

#### 阶段四：UI 组件注册
1. **顶部标签页注册**：调用 `registerTopTab()` 注册插件主界面
   - 异步加载 `assets/html/main-panel.html`
   - 设置标签页打开时的回调函数
   - 将标签页挂载到 SillyTavern UI 系统
2. **设置面板注册**：调用 `registerFeatureSettingsPanel()` 注册功能设置
   - 创建功能开关控件
   - 设置功能状态变更回调
3. **备用功能菜单**：若设置面板注册失败，回退到 `registerFeatureMenu()`

#### 阶段五：事件系统激活
1. **APP_READY 事件发射**：通过事件总线通知所有监听器初始化完成
2. **功能标志应用**：根据当前功能标志更新 UI 状态
3. **公共 API 暴露**：将核心功能挂载到 `window.WorldTreeLibrary`

### 3.2 启动失败处理机制

#### 重试策略
- 最大重试次数：20次
- 重试间隔：300毫秒
- 重试条件：SillyTavern 上下文不可用

#### 错误处理
- 初始化错误捕获：所有初始化步骤均有 try-catch 包装
- 模块级错误隔离：单个模块初始化失败不影响其他模块
- 错误事件发射：通过事件总线广播错误信息
- 控制台日志记录：详细的错误信息和警告信息

### 3.3 运行时状态管理

#### 全局状态变量
- `initialized`：插件初始化完成标志
- `attempts`：初始化尝试次数计数器
- `features`：已加载的功能模块集合
- `eventBus`：全局事件总线实例

#### 功能标志系统
- 从 `localStorage` 读取功能启用状态
- 支持运行时动态启用/禁用功能
- UI 状态同步更新
- 模块状态通知机制

### 3.4 插件销毁流程

1. **功能模块清理**：调用每个模块的 `destroy()` 方法
2. **状态重置**：清空模块实例和初始化标志
3. **事件发射**：通过事件总线广播 `APP_SHUTDOWN` 事件
4. **资源释放**：移除事件监听器和定时器

### 3.5 设计原则

1. **轻量启动**：核心初始化逻辑保持简洁
2. **模块化加载**：功能模块按需初始化和销毁
3. **错误隔离**：单个模块故障不影响整体运行
4. **配置驱动**：所有行为基于配置文件
5. **事件驱动**：模块间通过事件总线解耦通信

---

## 4. UI 总体结构与架构

### 4.1 核心设计原则

WorldTreeLibrary 的 UI 架构遵循严格的**关注点分离**原则，采用现代 MVC 模式：

1. **视图层（UI）**：纯粹的 HTML/CSS 模板，仅负责展示
2. **控制层（Controllers）**：连接视图和服务的桥梁，处理用户交互
3. **服务层（Services）**：业务逻辑实现，完全独立于 UI
4. **数据层（Data）**：数据结构定义和存储操作

### 4.2 主界面结构

主界面由 `assets/html/main-panel.html` 定义，采用多页面标签式布局：

#### 4.2.1 主页面（Main Page）
**功能区布局**：
- **标题栏**：插件标识、状态显示
- **操作工具栏**：核心功能按钮组
- **内容展示区**：表格预览、配置面板等

**核心操作组件**：
- `立即填表`：手动触发记忆表格填充
- `自动填表`：定时或消息触发自动填充
- `批量填表`：跨聊天批处理填充
- `编辑表格`：进入表格编辑模式
- `编辑模板`：进入模板编辑模式
- `填表配置`：跳转到配置页面
- `全局恢复默认`：重置所有配置
- `清空表格`：清空当前表格数据

#### 4.2.2 配置页面（Config Page）
**标签式导航结构**：
1. **发送模式配置标签**（`external` / `st`）
2. **提示词顺序配置标签**（Order）
3. **参考信息配置标签**（Reference）
4. **世界书配置标签**（WorldBook）

**配置面板功能**：
- 发送模式切换（ST原生 vs 第三方API）
- 指令注入模式设置
- 模板注入模式设置
- 外部 API 参数配置
- 世界书读取模式选择
- 提示词块顺序编排
- 参考信息块顺序编排
- 实时预览面板

### 4.3 UI 组件分层架构

#### 4.3.1 HTML 模板层 (`assets/html/`)
- `main-panel.html`：主界面模板，包含所有静态 UI 结构
- `modal-templates.html`：模态框和对话框模板
- **设计特点**：
  - 语义化 HTML 结构
  - 基于 CSS 类的样式系统
  - 数据属性驱动的交互标识
  - 模块化的组件划分

#### 4.3.2 CSS 样式系统 (`assets/css/`)
- `wtl-global.css`：全局基础样式和布局
- `wtl-table.css`：表格组件专用样式
- `wtl-chat.css`：聊天相关组件样式
- **样式架构**：
  - BEM 命名规范（Block-Element-Modifier）
  - CSS 变量主题系统
  - 响应式布局支持
  - 无障碍访问优化

#### 4.3.3 UI 控制器层 (`js/features/*/ui/`)
- **视图控制器**：管理特定 UI 组件的渲染和更新
- **绑定模块**：处理 DOM 事件监听和用户交互
- **预览模块**：实时内容预览和状态同步
- **模态控制器**：对话框和弹出窗口管理

#### 4.3.4 页面控制器层 (`js/features/*/controllers/`)
- `PageController`：页面导航和模式管理
- `PromptController`：提示词系统控制
- `TableController`：表格操作控制
- `EditorController`：编辑模式控制
- `BlockController`：块编辑系统控制
- `PresetController`：预设管理系统

### 4.4 状态管理与数据流

#### 4.4.1 UI 状态管理
- **页面状态**：当前激活页面、标签页、模式
- **编辑状态**：表格编辑、模板编辑等编辑模式
- **预览状态**：实时预览内容的缓存和更新
- **功能状态**：各功能的启用/禁用状态

#### 4.4.2 数据绑定机制
1. **单向数据流**：状态变更 → 控制器 → 服务 → 视图更新
2. **事件驱动更新**：通过事件总线广播状态变化
3. **响应式 UI**：基于状态变化的自动 UI 更新
4. **防抖优化**：高频操作的性能优化

#### 4.4.3 DOM 引用管理
- **集中式引用**：所有 DOM 元素引用在控制器初始化时统一获取
- **延迟绑定**：页面切换时的动态元素绑定
- **引用缓存**：高频访问元素的本地缓存
- **清理机制**：页面销毁时的引用释放

### 4.5 交互设计模式

#### 4.5.1 表单交互
- **即时验证**：输入框实时验证和错误提示
- **防重复提交**：操作锁定和状态指示
- **批量操作**：多项目选择和批量处理
- **撤销/重做**：操作历史栈支持

#### 4.5.2 模态交互
- **堆叠管理**：多层级模态框管理
- **焦点管理**：无障碍焦点控制
- **键盘导航**：快捷键和键盘操作支持
- **动画过渡**：平滑的打开/关闭动画

#### 4.5.3 数据展示
- **虚拟滚动**：大数据集的高效渲染
- **实时预览**：配置变更的即时反馈
- **状态指示**：操作进度和结果反馈
- **错误展示**：友好的错误信息显示

### 4.6 无障碍访问支持

#### 4.6.1 键盘导航
- Tab 键顺序优化
- 快捷键系统
- 焦点管理
- 屏幕阅读器支持

#### 4.6.2 视觉可访问性
- 高对比度模式
- 字体大小缩放
- 颜色对比度合规
- 禁用状态视觉区分

### 4.7 性能优化策略

#### 4.7.1 渲染优化
- 虚拟 DOM 更新
- 请求防抖和节流
- 图片和资源懒加载
- CSS 类名优化

#### 4.7.2 内存管理
- 事件监听器清理
- 大对象缓存和释放
- 定时器管理
- 引用计数清理

#### 4.7.3 网络优化
- 资源预加载
- 请求合并
- 缓存策略
- 错误重试机制

### 4.8 扩展性设计

#### 4.8.1 插件式 UI 组件
- 组件注册系统
- 动态组件加载
- 主题系统支持
- 多语言支持框架

#### 4.8.2 配置驱动 UI
- JSON 配置定义 UI 结构
- 运行时 UI 生成
- 用户自定义布局
- 预设系统集成

---

## 5. 当前"填表逻辑"完整链路

本节为核心部分，按**实际运行顺序**说明一次填表的完整流程。

### 5.1 初始化与状态恢复

用户首次打开插件设置抽屉时，[`bindWorldTreeUi()`](js/ui/bindings.js) 会调用 [`loadState()`](js/ui/bindings.js:998)。

[`loadState()`](js/ui/bindings.js:998) 的职责：

1. 调用 [`loadTableForChat()`](js/ui/bindings.js:419) 读取当前聊天绑定的表格
2. 读取当前模板作用域与模板预设
3. 解析模板，得到 [`templateState`](js/ui/bindings.js:230)
4. 恢复 UI 控件值：
   - 发送模式
   - 注入开关
   - 第三方 API 参数
   - 自动填表参数
   - 预设选择
   - 世界书读取模式
5. 恢复提示词块与参考块排序
6. 尝试执行一次默认值修复 [`ensurePromptFieldDefaults()`](js/ui/bindings.js:902)
7. 刷新模式 UI [`refreshModeUi()`](js/ui/bindings.js:963)
8. 渲染当前表格预览
9. 注册全局宏 [`syncPromptMacros()`](js/ui/bindings.js:841)

因此，**插件启动后的第一阶段并非调用 AI，而是恢复聊天状态和运行环境**。

---

### 5.2 当前聊天表格的加载来源

当前表格通过 [`loadTableForChat()`](js/ui/bindings.js:419) 获取，优先级如下：

1. 聊天元数据中的 `metadata.WorldTreeLibrary.tableJson`
2. 本地 `localStorage` 中的 `wtl.tableJson.{chatKey}`
3. 若均无，则根据当前模板生成空表

生成空表时的链路：

1. 找到当前生效模板文本
2. 调用 [`parseSchemaToTemplate()`](js/table/template.js:57) 将模板文本解析为结构化模板
3. 调用 [`buildEmptyTableFromTemplate()`](js/table/markdown.js:91) 生成空 JSON 表格
4. 调用 [`renderJsonToMarkdown()`](js/table/markdown.js:71) 生成 Markdown 表格

因此表格并非"硬编码"，而是**模板驱动生成**。

---

### 5.3 用户点击"立即填表"后的流程

点击按钮后执行 [`runFillOnce()`](js/ui/bindings.js:3814)。

[`runFillOnce()`](js/ui/bindings.js:3814) 是整个填表主链路，顺序如下：

#### 第 1 步：加锁

- 若当前已在运行，则直接返回，防止重复触发
- 设置 `running = true`
- 更新状态文本为"填表中"

#### 第 2 步：收集参考信息

调用 [`buildReferenceBundle()`](js/logic/reference.js:92)：

- 获取当前角色卡
- 获取当前聊天记录
- 根据世界书读取模式获取世界书条目

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

此步得到的是**原始参考数据包**，尚未转换为 prompt 文本。

#### 第 3 步：将参考信息格式化为可拼装块

调用 [`formatReferenceText()`](js/logic/reference.js:260)。

此层将原始参考数据转为多个文本块，例如：

- 角色描述
- 性格
- 场景
- 角色示例消息
- 聊天记录
- 世界书条目（按位置分类）
- persona 宏展开结果
- 其他用户自定义参考块

关键点：

- 参考信息并非一大段字符串直接塞入 prompt
- 它会先变为**可排序、可隐藏、可包裹前后缀的块集合**
- 后续由提示词顺序配置决定哪些块进入最终 prompt 及其顺序

#### 第 4 步：构造最终 prompt

调用 [`buildPrompt()`](js/logic/prompt.js:64)。

此步将以下内容按块顺序拼接：

- 破限提示 [`preprompt`](js/ui/bindings.js:174)
- 填表指令 [`instruction`](js/ui/bindings.js:175)
- 模板提示词
- 当前表格
- 参考信息块
- 用户手动添加的自定义提示词块

关键细节：

1. 表格块并非直接使用原始 Markdown，而是会经过 [`filterHiddenRowsFromMarkdown()`](js/logic/prompt.js:6) 过滤隐藏行
2. 若某 section 在模板中标记了 `fillable = false` 或 `sendable = false`，会在发送阶段被跳过
3. 每个块均可带前缀和后缀
4. 被标记为隐藏的块不会进入最终 prompt

#### 第 5 步：统一展开宏

调用 [`applyAllPromptMacros()`](js/ui/bindings.js:873)。

此步将最终 prompt 中出现的 ST 宏统一展开，包括：

- ST 自带宏
- 角色卡宏
- 用户预设宏
- WorldTreeLibrary 自行注册的宏

这意味着：

- 插件并非简单拼字符串
- 它会在最终发送前进行一次**宏求值**

#### 第 6 步：调用 AI

调用 [`callAi()`](js/logic/ai.js)。

发送模式由 [`sendMode`](js/ui/bindings.js:3850) 决定：

- `st`：走 SillyTavern 原生生成能力
- `external`：走第三方 OpenAI 兼容接口

在 `external` 模式下，还会传入以下参数：

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

若 AI 使用了以下包裹：

```xml
<WTL_TableEdit>
...
</WTL_TableEdit>
```

则仅提取包裹内部内容；否则默认整个文本均按命令区处理。

然后调用 [`parseCommands()`](js/table/commands.js:16)，解析支持的指令：

- `update[...]`
- `delete[...]`
- `insert[...]`
- `hide[...]`
- `move[...]`

解析结果为结构化命令数组，而非直接改表。

#### 第 9 步：应用表格编辑命令

调用 [`applyCommands()`](js/table/apply.js:5)。

输入包括：

- 当前表格 Markdown
- 命令数组
- 模板状态
- 当前隐藏行状态

此步会：

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
- 状态改为"完成"
- 解锁 `running = false`

---

## 6. 参考信息系统详解

### 6.1 当前实际使用的参考信息入口

当前主流程实际使用的是 [`buildReferenceBundle()`](js/logic/reference.js:92) 与 [`formatReferenceText()`](js/logic/reference.js:260)。

### 6.2 角色卡获取

[`buildReferenceBundle()`](js/logic/reference.js:92) 会从 ST 上下文获取当前角色：

1. 获取当前 `characterId`
2. 从 `ctx.characters` 取当前角色对象
3. 尝试获取角色名
4. 再调用 `ST_API.character.get({ name })` 拉取完整角色卡

### 6.3 聊天记录获取

优先尝试：

- `format: 'openai'`

若失败或无法获取消息，则退回：

- `format: 'gemini'`

这使得插件对不同消息格式具备一定兼容性。

### 6.4 世界书读取模式

有两种模式：

#### 自动读取 `auto`

[`buildReferenceBundle()`](js/logic/reference.js:207) 会：

- 读取 `scope = chat` 的世界书列表
- 读取 `scope = character` 的世界书列表
- 去重后逐本拉取完整内容
- 合并所有条目

然后调用 [`resolveAutoWorldBookEntries()`](js/logic/reference.js:56) 尝试根据 ST 的 prompt build 结果，模拟"当前实际会被注入的条目"。

这是当前代码中非常关键的一点：

- 它并非简单"把所有书全塞进去"
- 它尽量模拟 ST 的世界书激活效果，从而提取更接近真实发送链路的参考条目

#### 手动读取 `manual`

由配置页手动勾选书和条目。

此时 [`buildReferenceBundle()`](js/logic/reference.js:147) 会：

- 遍历手动选择的书
- 拉取完整书内容
- 根据 UI 中勾选的条目进行筛选
- 允许对条目的 `enabled / role / position / order / depth / key` 等参数做覆写

这意味着手动模式不仅是"选择条目"，还支持"在读参考时临时改条目参数"。

### 6.5 参考信息格式化

[`formatReferenceText()`](js/logic/reference.js:260) 会将结构化参考数据转为文本块。

它还会主动解析几个 ST 宏：

- `{{description}}`
- `{{personality}}`
- `{{scenario}}`
- `{{mesExamples}}`
- `{{charDepthPrompt}}`
- `{{persona}}`

因此参考信息层并非"原样直传角色卡字段"，而是尽量与 ST 的既有宏系统保持一致。

---

## 7. 提示词块系统详解

当前插件将 prompt 分为两层排序系统。

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

每个块均支持：

- `hidden`：隐藏后不发送
- `prefix`
- `suffix`
- `usePrefix`
- `useSuffix`

这些包装参数会在 [`buildPrompt()`](js/logic/prompt.js:64) 或 [`getBlockTextAsync()`](js/ui/bindings.js:2055) 中实际应用。

因此该系统本质上是一个**可视化 prompt 编排器**。

---

## 8. 模板系统详解

### 8.1 模板的两种表示

当前模板有两种表示方式：

1. Markdown 表格骨架
2. JSON 元数据

在 [`templateToSchemaMarkdown()`](js/table/template.js:170) 中，会输出：

- 一份可读的 Markdown 表格模板
- 一段 `<WTL_Template type="json">...</WTL_Template>` JSON 元数据

这样做的好处：

- 人可看 Markdown
- 机器可读 JSON 元数据，保留 section/column 的额外规则与 ID

### 8.2 模板解析

[`parseSchemaToTemplate()`](js/table/template.js:57) 的策略：

1. 先找 JSON 模板块
2. 若存在 JSON，则优先按 JSON 恢复完整模板
3. 若无，则退回解析 Markdown 结构

这意味着：

- 即使用户只保留 Markdown，模板仍可运行
- 若保留 JSON 元数据，则可获得更完整的 section / column 定义和规则

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

### 8.4 模板如何转化为发给 AI 的说明文本

由 [`buildTemplatePrompt()`](js/table/template.js:186) 负责。

它会将模板组织为说明书风格的文本，例如：

- section 编号与名称
- section 定义
- section 的增删改条件
- 字段说明
- 每列的增删改条件

因此，**发给 AI 的"schema"并非原始 Markdown 模板，而是模板说明文本**。

这是非常重要的设计点：

- 给 AI 的是"如何填表的规则说明"
- 本地保存的则是"真实表格数据"

---

## 9. 表格数据系统详解

### 9.1 表格的三种形态

当前表格在系统内有三种形态：

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

目的：

- 便于从混合文本中稳定提取表格
- 便于注入和宏调用时保持结构一致

### 9.3 隐藏行机制

插件支持"隐藏某些行但不删除"。

隐藏状态单独保存在 `hiddenRows` 中，而非直接修改 Markdown。

发送给 AI 时：

- [`filterHiddenRowsFromMarkdown()`](js/logic/prompt.js:6)
- [`getTablePreviewForSend()`](js/ui/bindings.js:260)

会将隐藏行过滤掉。

价值：

- UI 里可保留历史信息
- 发送时减少 token
- 避免已废弃的旧记忆继续污染 AI

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

当前实现也兼容无包裹的纯文本命令。

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

- 非法 section 会被忽略
- `fillable = false` 的 section 不允许 AI 修改
- `insert` 时若列不够，允许自动扩展列
- `delete` 和 `insert` 后会重置该 section 的隐藏行索引映射
- `move` 会同步交换隐藏状态

此部分已足够支撑后续更复杂的"AI 表格维护协议"。

---

## 11. 发送模式详解

### 11.1 `st` 模式

`sendMode = st` 时，调用 [`callAi()`](js/logic/ai.js) 走 SillyTavern 原生生成链路。

适用场景：

- 复用 ST 的既有模型配置
- 继续走 ST 自身的请求体系
- 让填表行为更贴近酒馆原有发送生态

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

插件支持三类发送侧内容：

- 当前表格
- 当前填表指令
- 当前模板说明

这些内容**不会写入世界书**。当前实现仅有两种进入大模型上下文的方式：

- `inject`：发送时运行时内存注入
- `macro`：注册全局宏，由用户手动放入预设或系统提示词

### 12.1 运行时注入

运行时注入由 [`syncManagedPromptInjections()`](js/ui/bindings.js:3470) 与 [`applyRuntimeManagedPromptInjection()`](js/ui/bindings.js:3453) 协作完成。

流程：

1. 根据当前配置收集需要注入的 instruction / schema / table
2. 通过 [`buildManagedPromptInjectionText()`](js/ui/bindings.js:3398) 生成一段带有 WTL 注释头的运行时注入文本
3. 在 ST 发送拦截里临时改写发送输入框
4. 触发原始发送
5. 发送后立刻通过 [`restoreRuntimeInjectedInput()`](js/ui/bindings.js:3440) 恢复输入框原值

因此 inject 模式的本质：**仅影响本次发送，不生成本地世界书条目，也不改角色卡正文**。

### 12.2 宏模式

宏模式下不会自动拦截注入，而是注册三个全局宏：

- `{{WTL_TableInstruction}}`
- `{{WTL_TableTemplate}}`
- `{{WTL_TableLatest}}`

当用户将这些宏放进预设、系统提示词或其他 ST 可展开宏的位置时，发送时会自动替换为当前内容。

### 12.3 注入顺序

运行时注入文本内部会按 position / depth / order 排序，由 [`buildManagedPromptInjectionText()`](js/ui/bindings.js:3398) 完成。

此处的 `order` 表示**同一注入层内的前后顺序**，而非"顺序靠后的内容就不注入"。只要项目启用，它们都会注入，仅排列顺序不同。

### 12.4 与世界书的关系

- 世界书仍会被读取，作为"参考信息"来源之一
- WorldTreeLibrary 当前**禁止将记忆表格写回世界书**
- [`upsertMemoryTableEntry()`](js/api/memory.js:6) 现在会直接抛错，防止误调用旧逻辑

---

## 13. 宏系统详解

### 13.1 插件注册的三个全局宏

由 [`syncPromptMacros()`](js/ui/bindings.js:841) 注册：

- `{{WTL_TableInstruction}}`
- `{{WTL_TableTemplate}}`
- `{{WTL_TableLatest}}`

对应内容：

- 当前填表指令
- 当前模板说明文本
- 当前过滤隐藏行后的表格

### 13.2 宏模式的含义

宏模式不是额外的发送模式，而是**注入方式**。

即：

- 指令可用宏
- 模板可用宏
- 表格可用宏

用户可将这些宏自行插入：

- 世界书
- 系统提示词
- 预设
- 其他支持宏的 ST 位置

### 13.3 普通宏展开

[`applyAllPromptMacros()`](js/ui/bindings.js:873) 会在发送前对完整 prompt 再运行一遍宏处理。

因此：

- 用户在块内容中写的普通 ST 宏仍然生效
- WorldTreeLibrary 的自定义宏也可被解析

---

## 14. 存储系统详解

### 14.1 聊天绑定表格存储

当前主流程里的表格数据，优先保存在聊天元数据里，见 [`saveTableForChat()`](js/ui/bindings.js:768)。

保存内容包括：

- `tableJson`
- `table`

若更新聊天元数据失败，则回退到：

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

这意味着"同一插件面对不同角色/不同聊天自动切换模板"已具备完整外壳。

---

## 15. 两套"接口封装"说明

用户最初要求：

- 获取参考信息封装成内部接口
- 最终回写封装成内部接口

当前项目里有两套相关层次：

### 15.1 轻量 API 层

#### 参考信息接口

见 [`getReferenceBundle()`](js/api/reference.js:99) 与 [`getReferenceItems()`](js/api/reference.js:48)。

这套接口偏"文档型封装"，目的在于：

- 为后续开发者提供清晰的最小接口面
- 可脱离 UI 单独调用
- 更适合作为后续真正业务层的稳定 API

#### 回写接口

见：

- [`upsertMemoryTableEntry()`](js/api/memory.js:4)
- [`saveMemoryTableState()`](js/api/memory.js:75)
- [`loadMemoryTableState()`](js/api/memory.js:86)
- [`persistMemory()`](js/api/memory.js:93)

这套接口强调"最终状态如何保存"。

### 15.2 当前实际运行逻辑层

真正执行填表时，目前主链路直接使用：

- [`buildReferenceBundle()`](js/logic/reference.js:92)
- [`formatReferenceText()`](js/logic/reference.js:260)
- [`saveTableForChat()`](js/ui/bindings.js:768)
- 三个注入同步函数

即：

- [`js/api/reference.js`](js/api/reference.js) / [`js/api/memory.js`](js/api/memory.js) 更偏"对外接口文档层"
- [`js/logic/reference.js`](js/logic/reference.js) / [`js/ui/bindings.js`](js/ui/bindings.js) 更偏"当前实际产品逻辑层"

后续若继续重构，建议方向：

1. 保持 [`js/api/reference.js`](js/api/reference.js) 与 [`js/api/memory.js`](js/api/memory.js) 作为稳定服务接口
2. 让 UI 主流程逐步改为仅调用这套服务接口
3. 让 [`js/logic/reference.js`](js/logic/reference.js) 退化为 API 层的内部实现

---

## 16. 自动填表、批量填表、拦截发送

### 16.1 自动填表

当前 UI 已有自动填表开关与参数：

- 最近消息层数
- 触发频率

状态通过 [`saveState()`](js/ui/bindings.js:1186) 写入本地。

### 16.2 批量填表

批量逻辑会生成聊天切片，然后重复调用 [`runFillOnce()`](js/ui/bindings.js:3814)。

本质上它并未另写一套 AI 逻辑，而是复用单次填表主链路。

### 16.3 发送前拦截

[`ensureHooks()`](js/ui/bindings.js:3467) 会通过 `ST_API.hooks.install` 拦截发送按钮和回车发送。

拦截后会：

1. 刷新 prompt 预览
2. 保存当前状态
3. 同步三类注入
4. 调用 `bypassOnce`
5. 再触发原始发送

这意味着自动注入尽量在**用户真正发送消息前**保持最新状态。

---

## 17. 默认值恢复机制

### 17.1 默认值来源

默认值主要来自：

- [`assets/defaults.json`](assets/defaults.json)
- `window.__WTL_PRESETS__` 与本地预设存储

### 17.2 空值自动恢复

[`ensurePromptFieldDefaults()`](js/ui/bindings.js:902) 会在以下字段为空时尝试恢复默认：

- `preprompt`
- `instruction`
- `schema`

### 17.3 全局恢复默认

由 [`resetAllDefaults()`](js/ui/bindings.js:1294) 负责，主要操作：

- 清理相关 localStorage
- 还原默认预设集
- 还原默认模式配置
- 重建模板状态
- 基于模板生成空白表格
- 清空隐藏行
- 保存并同步宏与注入

### 17.4 当前已知问题

"内容被清空后自动恢复默认"这一点，虽然已在多个路径接入修复逻辑，但此前用户反馈仍存在未完全修复的情况。

因此目前应视为：

- **恢复默认按钮**：可用
- **启动时的默认值兜底**：基本可用
- **任意编辑路径下删空即自动恢复**：仍需继续排查

后续建议重点检查：

- 模板源文本 `schemaSource` 与 [`schemaEl`](js/ui/bindings.js:235) 的覆盖顺序
- 预设激活项为空时的兜底顺序
- 某些按钮路径是否绕过了 [`ensurePromptFieldDefaults()`](js/ui/bindings.js:902)

---

## 18. 当前设计中最重要的几个扩展点

若后续独立继续开发，最值得扩展的是以下点。

### 18.1 参考信息裁剪策略

当前参考信息已能获取，但"如何裁剪得更适合填表"尚未细化。

建议扩展位置：

- [`buildReferenceBundle()`](js/logic/reference.js:92)
- [`formatReferenceText()`](js/logic/reference.js:260)
- 或直接重构为新的服务层

### 18.2 更严格的 AI 输出协议

当前支持的命令已够用，但还可继续增加：

- 行唯一键
- 按列名更新
- 批量操作
- 冲突检测
- 事务回滚

建议扩展位置：

- [`parseCommands()`](js/table/commands.js:16)
- [`applyCommands()`](js/table/apply.js:5)

### 18.3 记忆注入位置策略

当前"表格 / 模板 / 指令"均支持 inject 或 macro，但未来还可加入：

- 更细的注入条件
- 仅在特定角色 / 特定聊天生效
- 与世界书激活条件联动

### 18.4 存储后端统一

当前聊天数据主链路使用"聊天元数据 + localStorage fallback"，而 API 层还提供了 [`variables`](js/api/memory.js:75) 方案。

后续可统一为：

- 仅走聊天元数据
- 或仅走 `variables.local`
- 或做双写策略

目前推荐先统一，减少后续维护成本。

---

## 19. 推荐的后续重构方向

若下一阶段继续推进，建议按以下顺序：

### 第一阶段：接口统一

将 UI 主流程统一改为仅依赖：

- [`js/api/reference.js`](js/api/reference.js)
- [`js/api/memory.js`](js/api/memory.js)

这样"文档接口"和"实际运行接口"就不会分裂。

### 第二阶段：将 prompt 编排抽出服务层

当前 [`buildPrompt()`](js/logic/prompt.js:64) 已较清晰，但块排序、前后缀、宏处理许多仍挂在 [`js/ui/bindings.js`](js/ui/bindings.js)。

建议抽出：

- prompt service
- injection service
- macro service

### 第三阶段：增强命令协议

将 AI 输出从"纯位置型更新"升级为"结构化更新协议"。

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

当前 WorldTreeLibrary 已具备一条完整的"外围填表流水线"：

1. 加载当前聊天状态
2. 获取角色卡、聊天记录、世界书条目
3. 将参考信息格式化为可排序块
4. 将破限提示、指令、模板、表格、参考信息按用户定义顺序拼装
5. 展开宏
6. 调用 ST 或第三方 API
7. 解析 AI 返回的表格编辑命令
8. 将命令应用到本地 Markdown 表格
9. 将表格绑定到当前聊天保存
10. 可选自动注入到 `Current Chat` 或注册为宏

因此，**真正缺的已非外围框架，而主要是"希望 AI 如何理解参考信息、如何决策编辑表格"这部分内部策略**。这正符合当前阶段的目标：先将接口、数据流、存储流、注入流和 UI 操作流全部打通。
