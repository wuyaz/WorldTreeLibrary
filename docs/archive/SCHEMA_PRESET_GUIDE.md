# Schema预设加载说明

## 已修复的问题

### Schema预设数据格式处理
- ✅ 支持数组格式的schema预设（schema.json）
- ✅ 支持对象格式的schema预设
- ✅ 支持字符串格式的schema预设
- ✅ 自动合并数组元素为字符串

---

## Schema预设结构

### schema.json文件格式
```json
{
  "默认": [
    "<WTL_Template type=\"json\">{...}</WTL_Template>"
  ],
  "其他预设": [
    "..."
  ]
}
```

### 存储格式（localStorage）
```javascript
// wtl.schema.presets
{
  "默认": "<WTL_Template type=\"json\">{...}</WTL_Template>",
  "其他预设": "..."
}

// wtl.schema.presetActive
"默认"
```

---

## 加载流程

### 1. 插件初始化时
```
main.js → loadConfig() → loadPreset('schema') → seedPresetStorage()
```

### 2. 预设加载步骤
1. 从 `assets/presets/schema.json` 读取JSON
2. 检查localStorage中是否已有预设
3. 如果没有，则写入localStorage
4. 设置默认激活预设为"默认"

### 3. Schema使用时
```
tableController → getDefaultSchemaText() → parseSchemaPreset()
```

---

## 数据转换

### 数组格式处理
```javascript
// 输入（schema.json格式）
["<WTL_Template>", "...", "..."]

// 输出（合并后）
"<WTL_Template>\n...\n..."
```

### parseSchemaPreset函数
```javascript
function parseSchemaPreset(presetData) {
  // 如果是数组，合并为一个字符串
  if (Array.isArray(presetData)) {
    return presetData.join('\n');
  }
  
  // 如果是字符串，直接返回
  if (typeof presetData === 'string') {
    return presetData;
  }
  
  return '';
}
```

---

## 调试方法

### 检查预设是否加载
打开浏览器控制台，运行：
```javascript
// 检查localStorage
console.log('Schema presets:', JSON.parse(localStorage.getItem('wtl.schema.presets')));
console.log('Active preset:', localStorage.getItem('wtl.schema.presetActive'));

// 检查全局预设
console.log('Global presets:', window.__WTL_PRESETS__?.schema);

// 测试获取默认schema
// 需要在插件上下文中运行
```

### 检查schema内容
```javascript
// 获取默认schema文本
const presets = JSON.parse(localStorage.getItem('wtl.schema.presets'));
const active = localStorage.getItem('wtl.schema.presetActive') || '默认';
const schemaText = Array.isArray(presets[active]) ? 
  presets[active].join('\n') : 
  presets[active];

console.log('Schema text length:', schemaText.length);
console.log('Schema preview:', schemaText.substring(0, 200) + '...');
```

---

## 模板结构说明

### 完整的Schema模板包含
```json
{
  "title": "记忆表格",
  "sections": [
    {
      "id": "uymk",
      "name": "角色档案",
      "definition": "...",
      "insertRule": "...",
      "deleteRule": "...",
      "updateRule": "...",
      "fillable": true,
      "sendable": true,
      "columns": [
        {
          "id": "uymk_lxp8",
          "name": "角色名称",
          "definition": "...",
          "insertRule": "...",
          "updateRule": "...",
          "deleteRule": "..."
        }
      ]
    }
  ],
  "templatePrefix": "uy"
}
```

### 表格类型
1. **角色档案** - 记录角色信息
2. **主线追踪** - 记录主线剧情
3. **支线事件** - 记录支线任务
4. **性爱记录** - 记录性行为
5. **物品留档** - 记录重要物品
6. **地点留档** - 记录重要地点
7. **高维指令** - 记录用户指令

---

## 常见问题

### Q: 为什么表格没有加载？
A: 检查以下几点：
1. localStorage中是否有 `wtl.schema.presets`
2. `wtl.schema.presetActive` 是否设置
3. 控制台是否有错误信息

### Q: 如何重置预设？
A: 运行以下代码：
```javascript
localStorage.removeItem('wtl.schema.presets');
localStorage.removeItem('wtl.schema.presetActive');
// 然后刷新页面
location.reload();
```

### Q: 如何添加新预设？
A: 在设置页面的"表格模板"区域：
1. 选择或输入新预设名称
2. 编辑模板内容
3. 点击"保存并绑定"

---

## 修改记录

### 2026-04-16
- ✅ 修复schema预设加载问题
- ✅ 添加parseSchemaPreset函数处理数组格式
- ✅ 添加调试日志输出
- ✅ 更新文档说明

---

## 相关文件

- `assets/presets/schema.json` - Schema预设源文件
- `js/core/configManager.js` - 预设加载逻辑
- `js/features/memoryTable/services/schemaHelper.js` - Schema处理函数
- `js/features/memoryTable/controllers/tableController.js` - 表格控制器
