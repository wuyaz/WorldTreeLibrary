# WorldTreeLibrary 代码创建规范

你正在为 WorldTreeLibrary 项目创建或修改代码。这是一个为 SillyTavern 设计的模块化插件系统。

## 核心原则

**所有代码创建和修改都必须遵循 README.md 第二部分（强制目录与架构规范）的要求。**

## 创建新文件前的检查清单

### 1. 确定文件类型和位置

根据 README.md 第 2.1 节的目录结构，确定文件应该放在哪里：

- **assets/** - 纯静态资源（CSS、HTML、JSON），禁止包含 JavaScript 逻辑
- **js/core/** - 与业务无关的全局基础设施
- **js/shared/** - 多个 Feature 复用的通用代码
- **js/features/** - 具体功能模块（严格 MVC 分层）

### 2. 确定分层职责

如果是 feature 文件，必须明确分层：

- **data/** - 数据结构定义、格式转换、存储读写
  - ✅ 允许：定义数据模型、读写存储、数据验证
  - ❌ 禁止：DOM 操作、网络请求、业务逻辑

- **services/** - 业务逻辑处理、API 调用
  - ✅ 允许：业务逻辑、网络请求、调用 data 层
  - ❌ 禁止：DOM 操作、引用 ui/ 目录

- **ui/** - DOM 操作、HTML 渲染
  - ✅ 允许：创建 DOM、渲染模板、暴露更新方法
  - ❌ 禁止：业务逻辑、事件绑定、调用 services

- **controllers/** - 连接 UI 和 Services
  - ✅ 允许：绑定事件、协调调用
  - ❌ 禁止：复杂算法、直接 DOM 操作

## 创建文件的强制要求

### 1. 必须添加文件头部注释

每个文件开头必须包含以下注释：

```javascript
// @ts-nocheck
/**
 * 文件名称 - 简短描述
 * 
 * 功能: 详细描述这个文件的主要功能和职责
 * 应该写入: 列出应该在这个文件中实现的代码类型和功能
 * 不应该写入: 列出不应该在这个文件中出现的代码类型和功能
 * 
 * 被使用: 列出哪些文件/模块使用了这个文件
 * 使用文件: 列出这个文件依赖/使用了哪些其他文件
 * 
 * 注意: 重要的使用注意事项、最佳实践、常见陷阱
 */
```

### 2. 遵守单一职责分离

检查清单（必须全部满足）：
- [ ] data/ 文件中无 DOM 操作
- [ ] data/ 文件中无网络请求
- [ ] services/ 文件中无 DOM 操作
- [ ] services/ 文件中无 UI 引用
- [ ] ui/ 文件中无业务逻辑
- [ ] ui/ 文件中无事件绑定
- [ ] controllers/ 文件中无复杂算法

### 3. 遵守黑盒封装原则

- feature 的 index.js 是对外的唯一接口
- 外部模块禁止直接访问 feature 内部文件
- 必须通过 index.js 暴露的接口访问

## 创建不同类型文件的规范

### 创建 assets/ 文件

**assets/css/*.css**
- ✅ 允许：CSS 类定义、CSS 变量、动画、媒体查询
- ❌ 禁止：包含 JavaScript 代码、引用 JS 变量

**assets/html/*.html**
- ✅ 允许：HTML 结构、CSS 类名、data 属性
- ❌ 禁止：`<script>` 标签、内联事件（onclick 等）

**assets/defaults.json**
- ✅ 允许：JSON 格式的配置项
- ❌ 禁止：非 JSON 内容

**assets/presets/*.json**
- ✅ 允许：预设内容、参数配置
- ❌ 禁止：代码逻辑、引用其他文件

### 创建 js/core/ 文件

判断标准：如果一个工具函数可以用于其他完全不同的项目，则可以放入 core/

- ✅ 允许：通用的基础设施代码
- ❌ 禁止：任何业务相关代码
- ❌ 禁止：引用 features/ 目录
- ❌ 禁止：直接操作 DOM

### 创建 js/shared/ 文件

- ✅ 允许：多个 Feature 复用的代码
- ✅ 允许：封装 ST 原生 API
- ❌ 禁止：包含具体业务逻辑

### 创建 js/features/ 文件

必须按照标准目录结构：

```
js/features/<featureName>/
├── index.js          # 模块入口
├── data/             # 数据层
├── services/         # 服务层
├── ui/               # 视图层
└── controllers/      # 控制层
```

**index.js 模板**：

```javascript
// @ts-nocheck
/**
 * Feature Name - 功能简述
 * 
 * 功能: 详细描述功能
 * 应该写入: 导入控制器、暴露接口、初始化逻辑
 * 不应该写入: 具体业务逻辑、直接操作 DOM
 * 
 * 被使用: main.js
 * 使用文件: controllers/*.js
 * 
 * 注意: 这是功能模块的唯一对外接口
 */

import { FeatureController } from './controllers/FeatureController.js';

export { FeatureController };

let instance = null;

export async function initialize(options = {}) {
  if (!instance) {
    instance = new FeatureController(options);
    await instance.initialize();
  }
  return instance;
}

export function destroy() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

export function getInstance() {
  return instance;
}
```

## 修改现有文件时的规范

### 1. 更新文档注释

每次修改文件时，必须更新：
- "被使用"字段 - 如果添加了新的调用者
- "使用文件"字段 - 如果添加了新的依赖
- "功能"描述 - 如果修改了核心功能

### 2. 遵守修改隔离原则

| 修改类型 | 影响范围 | 需要同步修改 |
|----------|----------|--------------|
| 修改 CSS 样式 | 仅影响 UI 展示 | 无 |
| 修改 HTML 模板 | 仅影响 UI 结构 | 可能需要调整 ui 层 |
| 修改 data 数据格式 | 影响数据存储 | services 层读写逻辑 |
| 修改 services 业务逻辑 | 影响功能实现 | controllers 调用方式 |
| 修改 ui 渲染逻辑 | 仅影响界面展示 | controllers 调用方式 |
| 修改 controllers 流程 | 影响交互流程 | 可能需要调整 ui 和 services |

### 3. 检查跨层调用

修改后检查：
- [ ] 没有出现跨层直接调用
- [ ] data 层没有被 UI 直接调用
- [ ] services 层没有被 UI 直接调用
- [ ] 所有调用都通过 controllers 协调

## 代码质量检查清单

在提交代码前，必须确认：

### 文档注释
- [ ] 所有新文件都添加了文档注释
- [ ] 文档注释包含所有必填字段
- [ ] "被使用"和"使用文件"字段准确无误
- [ ] 修改文件时更新了文档注释

### 架构规范
- [ ] 文件放在正确的目录位置
- [ ] 遵守单一职责分离原则
- [ ] 没有违反分层约束
- [ ] 遵守黑盒封装原则

### 代码实现
- [ ] 没有在错误的层实现功能
- [ ] 没有跨层直接调用
- [ ] 依赖关系清晰
- [ ] 接口设计合理

## 参考文档

创建或修改代码时，必须参考：
1. **README.md 第 2 部分** - 强制目录与架构规范
2. **README.md 第 22 部分** - 代码文档规范
3. **现有已注释文件** - 参考文档注释格式

## 重要提醒

1. **架构先行**：任何新功能开发，必须先建立标准目录结构
2. **文档同步**：代码修改后立即更新文档注释
3. **边界清晰**：严格遵守分层边界，不跨层调用
4. **单一职责**：每个文件只负责一个明确的职责

**记住：代码不仅仅是写给机器执行的，更是写给其他开发者（包括未来的自己）阅读的。清晰的文档和规范的架构比 clever 的代码更重要。**