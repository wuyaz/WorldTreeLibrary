# 世界树图书馆 · 架构说明

> 这份文档描述的是**当前代码**。`docs/archive/` 里的旧报告描述的是已经删掉的五层设计，
> 仅作历史参考，不要照着它改代码。

## 1. 这是什么

SillyTavern（酒馆）的第三方扩展。一个插件里装多个互相独立的功能：

| 功能 id | 名称 | 状态 |
| --- | --- | --- |
| `memoryTable` | 记忆表格 | 主体可用，注入链路未完成（见 §7） |
| `chatManager` | 聊天管理 | 已完善 |

## 2. 目录分层

```
js/
├─ main.js              入口：读注册表，逐个初始化功能
├─ core/                跨功能底座（不含任何单一功能的业务）
│   ├─ assets.js            读 assets/defaults.json
│   ├─ assetLoader.js       HTML/资源加载
│   ├─ configManager.js     预设仓库、默认提示词、作用域模板
│   ├─ dataManager.js       表格数据的按聊天存取
│   ├─ eventBus.js          全局事件（EVENTS 常量表）
│   ├─ settingsManager.js   extension_settings 的读写（现仅设置面板的导入/导出/重置在用）
│   └─ storage.js           预设键名、featureFlags、OpenAI 预设
├─ shared/              跨功能可复用件
│   ├─ ai/openai.js         模型调用（兼容 OpenAI 协议）
│   ├─ api/chatApi.js       聊天数据的酒馆接口封装
│   ├─ sillytavern/         挂载点：顶部页签、设置面板、功能菜单
│   ├─ ui/                  escape / toast / modal / download / components
│   └─ utils/               debugAlert、杂项
└─ features/            各功能
    ├─ registry.js          功能清单（唯一登记处）
    ├─ memoryTable/
    └─ chatManager/
```

**依赖方向**：`features → shared → core`，不允许反向，不允许 feature 之间互相 import。
功能之间要通信，走 `core/eventBus.js`。

## 3. 功能注册表

`features/registry.js` 是「这个插件包含哪些功能」的唯一清单。加一个新功能：

1. 建 `features/<id>/` 目录，写 `meta.js`：

```js
import { MyFeature } from './controllers/MyFeature.js';

export default {
  id: 'myFeature',            // 同时是 featureFlags 里的开关键
  name: '我的功能',
  description: '设置面板里的说明文字',
  order: 30,                  // 初始化顺序，小的先
  create(options) { return new MyFeature(options); },   // 实例需有 initialize/setEnabled/destroy
  async registerUI({ instance, ctx, defaults }) { /* 可选：注册挂载点 */ },
};
```

2. 在 `registry.js` 里 import 一行、数组里加一项。

`main.js`、设置面板、顶部页签都不用改——它们都按注册表遍历。

两个现成的挂载点：

- `shared/sillytavern/registerTopTab.js`：往顶部抽屉加一个页签（memoryTable 用这个，HTML 在 `assets/html/main-panel.html`）
- `shared/sillytavern/registerSettingsPanel.js`：设置面板里的功能开关，按 `data-flag` 动态生成

## 4. 记忆表格的内部结构

```
features/memoryTable/
├─ meta.js
├─ controllers/     生命周期与编排，持有 state，唯一碰 DOM 事件的地方
│   ├─ MemoryTableFeature.js   总装：建 uiRefs → 建各 controller → 回填配置 → 挂钩子
│   ├─ tableController.js      表格数据、填表主流程（runFillOnce）、表库管理
│   ├─ presetController.js     提示词/模板/OpenAI 预设的载入与切换
│   ├─ promptController.js     提示词拼接、发送模式、日志预览
│   ├─ editorController.js     表格与模板的编辑、历史
│   ├─ pageController.js       页面/页签切换
│   └─ runtimeController.js    批量填表、世界书模式、OpenAI 模型列表
├─ services/        业务逻辑，不碰 DOM
│   ├─ chatStateService.js     表格数据在聊天 metadata 里的读写（唯一入口）
│   ├─ uiStateService.js       配置区控件 ⇄ localStorage 的双向同步
│   ├─ promptService.js        拼提示词
│   ├─ referenceService.js     参考信息包（角色卡 / 世界书 / 聊天记录）
│   ├─ injectionService.js     把表格/指令/模板打包成待注入项
│   ├─ autoFillService.js      流式输出结束后按条件自动触发填表
│   ├─ applyService.js         执行 AI 返回的表格变更
│   └─ schemaHelper.js         模板 schema 的解析辅助
├─ ui/              渲染与控件工厂（参数对象注入，不直接 import controller）
└─ data/            纯数据：markdown.js（表格 ⇄ JSON）、commands.js（AI 命令）、template.js
```

**填表链路**（`tableController.runFillOnce`）：建参考信息包 → 格式化 → 拼 Prompt →
应用宏 → 调 AI → 提取指令 → 解析命令 → 应用并存回聊天。每一步都有 `debugAlert` 打点，
排查时把 `shared/utils/debugAlert.js` 打开即可看到全流程。

## 5. 存储归属

改动数据前先确认它该落在哪，别新开一份：

| 数据 | 落在哪 | 谁负责 |
| --- | --- | --- |
| 表格内容（每聊天一份） | 聊天的 `chat_metadata.WorldTreeLibrary` | `services/chatStateService.js` 唯一入口，写后 `ctx.saveMetadataDebounced()` |
| 配置区控件（发送模式、注入位置、OpenAI 参数、自动填表参数…） | `localStorage` 的 `wtl.*` | `services/uiStateService.js` 唯一入口 |
| 提示词/模板/顺序预设 | `localStorage` 的 `wtl.*.presets` | `core/configManager.js` + `core/storage.js` |
| 功能开关 | `localStorage` 的 featureFlags | `core/storage.js` 的 `getFeatureFlags()` |
| 插件的 extension_settings | 酒馆的 `extension_settings.WorldTreeLibrary` | `core/settingsManager.js`，目前只服务设置面板的导入/导出/重置 |

颜色只有一条链：`设置 → 标签颜色` → `chatManagerSettings.tagColors/folderColors` →
`state.tagColors` → 卡片 chip 的 CSS 变量。不要再引入第二个颜色源。

## 6. 自检

```bash
node tools/analyze.mjs        # 默认分析脚本所在插件的 js/
```

检查三件事：相对 import 的目标是否存在、命名导入是否真的被导出、从 `js/main.js` 出发
有没有不可达文件。零断裂、零不可达才算干净。

## 7. 已知缺口（按优先级）

1. **注入没接线**。`injectionService.js` 只负责「打包待注入项」，
   `syncTableInjection / syncInstructionInjection / syncSchemaInjection` 这三个真正把内容写进
   世界书 / 宏的函数在重构中丢失了——现在改注入位置、深度、开关，只会存进 localStorage，
   不会改变实际发出去的内容。
2. **位置/深度/角色/顺序不触发重注入**。同上，缺上面那三个函数后无处可调。
3. **自动填表的触发边界**。开关与楼层参数现在能生效了，但 `messageCount` 的累加依赖
   酒馆事件（`CHARACTER_MESSAGE_CREATED` 等），群聊/编辑消息等场景没验证过。
4. **`registerFeatureMenu.js` 仍是硬编码两个开关**，是设置面板注册失败时的回退路径，
   新增功能时它不会自动跟上。

## 8. 约定

- 仓库文本是 CRLF，`core.autocrlf=true`；改文件时不要整体换行。
- 新增 UI 文案一律中文，函数与变量英文。
- 删文件前先跑 `node tools/analyze.mjs`，确认它真的不可达——只靠 grep 容易漏掉动态 import。
- 改动涉及「删旧实现」时，先把旧实现里仍在生效的职责（例如配置回填）迁移到新位置，再删。
