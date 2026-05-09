# 产品需求文档 (PRD)

## 文档信息

- **项目名称**: Htmly — VS Code HTML 可视化编辑器
- **版本**: v1.0
- **创建日期**: 2026-03-24
- **对标物**: Web Visual Editor (urin)、EditSage、waiVSCode
- **状态**: 草稿

---

## 1. 项目概述

### 1.1 背景与目标

**背景**: VS Code 是全球最流行的代码编辑器，但在 HTML 文件编辑方面只提供纯文本源码编辑，缺乏所见即所得（WYSIWYG）的可视化编辑能力。现有市场上的 HTML 可视化扩展（如 Web Visual Editor、waiVSCode）要么仅提供预览同步能力，要么富文本编辑功能薄弱，没有一款扩展能同时提供**专业的富文本可视化编辑**和**带语法高亮的源码编辑**，并在两者之间无缝切换。

**目标**:
1. 为 VS Code 用户提供一个双模式 HTML 编辑器（可视化 + 源码），在不离开编辑器的前提下实现"所见即所得"的 HTML 编写体验
2. 双模式共享同一 TextDocument，确保 undo/redo、保存、Git 等 VS Code 原生功能完全兼容
3. 提供完整的富文本格式化工具栏，覆盖日常 HTML 编写的 90% 场景
4. 自动跟随 VS Code 主题（深色/浅色），提供原生级别的视觉体验

**对标参考**: 本产品参考 Web Visual Editor（预览同步）和 EditSage（WYSIWYG 编辑），主要差异为：使用 Tiptap 2 引擎提供更强大的富文本编辑能力，使用 CodeMirror 6 提供专业级源码编辑，两个编辑器通过 VS Code TextDocument 实现双向同步。

### 1.2 目标用户

| 用户类型 | 描述 | 核心需求 |
|---------|------|---------|
| 前端开发者 | 日常编写 HTML/邮件模板/静态页面 | 快速可视化编辑 HTML，无需切换到外部工具 |
| 内容编辑者 | 非技术背景，需要在 VS Code 中编辑 HTML 内容 | 不需要了解 HTML 标签即可编辑富文本 |
| 邮件模板开发者 | 编写 HTML 邮件模板 | 可视化编辑 + 源码微调，所见即所得 |
| 技术写作者 | 编写技术文档、帮助页面 | 结构化内容编辑（标题、列表、表格、代码块） |

### 1.3 核心价值主张

**在 VS Code 中实现 HTML 文件的"所见即所得"编辑体验 —— 可视化与源码双模式无缝切换，与 VS Code 原生工作流完全融合。**

---

## 2. 功能需求

### 2.1 功能清单

| 编号 | 功能名称 | 优先级 | 对标物对比 | 描述 |
|-----|---------|-------|-----------|------|
| FR-001 | 双模式编辑器 | P0 | 竞品均无完整实现 | WYSIWYG 和 Source 两种编辑模式，一键切换 |
| FR-002 | CustomTextEditor 集成 | P0 | 竞品部分支持 | 基于 VS Code CustomTextEditorProvider，右键 Open With 打开 |
| FR-003 | 文本格式化工具栏 | P0 | EditSage 有基础版 | 加粗、斜体、下划线、删除线 |
| FR-004 | 段落格式工具栏 | P0 | 竞品较弱 | 标题（H1-H3）、段落、引用块、代码块 |
| FR-005 | 列表支持 | P0 | 竞品部分支持 | 无序列表、有序列表 |
| FR-006 | 文本对齐 | P1 | 竞品基本无 | 左对齐、居中、右对齐 |
| FR-007 | 链接编辑 | P1 | 竞品基本无 | 插入/编辑超链接 |
| FR-008 | 图片插入 | P1 | Web Visual Editor 有 | 插入图片（URL） |
| FR-009 | 表格编辑 | P1 | 竞品均无 | 插入表格、调整列宽、添加/删除行列 |
| FR-010 | 水平分割线 | P2 | 竞品部分支持 | 插入 `<hr>` |
| FR-011 | 高亮标记 | P2 | 竞品无 | 文本高亮（`<mark>`） |
| FR-012 | 源码语法高亮 | P0 | 竞品无专业实现 | CodeMirror 6 提供 HTML 语法高亮 |
| FR-013 | 主题同步 | P0 | Web Visual Editor 有 | 自动跟随 VS Code 深色/浅色主题 |
| FR-014 | 内容双向同步 | P0 | Web Visual Editor 有 | 编辑器内容变更实时同步到 TextDocument |
| FR-015 | Undo/Redo 兼容 | P0 | Web Visual Editor 有 | 与 VS Code 原生 undo/redo 兼容 |
| FR-016 | 外部变更感知 | P1 | Web Visual Editor 有 | Git checkout 等外部文件变更自动同步到编辑器 |

### 2.2 用户故事

#### US-001: 以可视化模式打开 HTML 文件

**格式**: 作为前端开发者，我想以可视化模式打开 HTML 文件，以便直观地看到 HTML 的渲染效果并直接编辑

**验收标准**:
- AC-001-01: 右键 .html/.htm 文件，选择 "Open With > Htmly Editor" 可打开可视化编辑器
- AC-001-02: 打开后默认进入 WYSIWYG 模式，显示格式化工具栏
- AC-001-03: 编辑器正确渲染 HTML 内容（标题、段落、列表、表格等）

**边界条件**:
- 输入: 任意 .html 或 .htm 文件
- 输出: 可视化渲染的 HTML 内容
- 异常: 空文件显示 placeholder 提示 "Start writing HTML..."

#### US-002: 双模式切换

**格式**: 作为邮件模板开发者，我想在可视化模式和源码模式之间切换，以便先可视化编辑大体结构再在源码中微调细节

**验收标准**:
- AC-002-01: 工具栏提供模式切换按钮，点击可在 WYSIWYG 和 Source 模式间切换
- AC-002-02: 切换时内容完全保持一致，不丢失任何修改
- AC-002-03: Source 模式显示带行号和语法高亮的 HTML 源码
- AC-002-04: WYSIWYG 模式下工具栏显示完整格式化按钮，Source 模式下工具栏简化

**边界条件**:
- 切换模式时正在编辑的内容不应丢失
- 异常: 如果 HTML 结构有语法错误，Source 模式下仍可正常编辑

#### US-003: 富文本格式化编辑

**格式**: 作为内容编辑者，我想通过工具栏按钮对文本进行格式化，以便不需要手写 HTML 标签也能创建美观的内容

**验收标准**:
- AC-003-01: 工具栏提供标题级别选择器（H1-H3 + 段落）
- AC-003-02: 支持加粗（Ctrl+B）、斜体（Ctrl+I）、下划线（Ctrl+U）、删除线
- AC-003-03: 支持无序列表、有序列表、引用块、代码块
- AC-003-04: 支持文本对齐（左/中/右）
- AC-003-05: 当前激活的格式在工具栏上高亮显示
- AC-003-06: 支持键盘快捷键（Ctrl+B/I/U 等）

#### US-004: 表格编辑

**格式**: 作为技术写作者，我想在可视化模式下插入和编辑表格，以便快速创建数据展示结构

**验收标准**:
- AC-004-01: 工具栏提供插入表格按钮，默认创建 3x3 表格（含表头行）
- AC-004-02: 表格支持拖拽调整列宽
- AC-004-03: 生成的 HTML 使用标准 `<table>`/`<tr>`/`<th>`/`<td>` 标签

#### US-005: 源码编辑

**格式**: 作为前端开发者，我想在源码模式下直接编辑 HTML 代码，以便进行精细的标签和属性调整

**验收标准**:
- AC-005-01: 源码编辑器显示行号
- AC-005-02: HTML 标签、属性、值使用不同颜色进行语法高亮
- AC-005-03: 支持 undo/redo（历史记录）
- AC-005-04: 支持高亮当前行
- AC-005-05: 深色主题下使用 One Dark 配色，浅色主题下使用默认配色

#### US-006: VS Code 原生集成

**格式**: 作为前端开发者，我想让 HTML 可视化编辑器与 VS Code 的工作流无缝集成，以便保存、撤销和版本控制都像原生编辑器一样工作

**验收标准**:
- AC-006-01: Ctrl+S 保存文件，内容与编辑器中一致
- AC-006-02: Ctrl+Z / Ctrl+Shift+Z 执行 undo/redo
- AC-006-03: 文件修改后标签页显示未保存标记（圆点）
- AC-006-04: Git diff 正确显示编辑器中的修改
- AC-006-05: 外部文件变更（如 git checkout）自动同步到编辑器

#### US-007: 主题适配

**格式**: 作为 VS Code 用户，我想让 HTML 编辑器自动跟随我的 VS Code 主题设置，以便视觉体验与编辑器整体一致

**验收标准**:
- AC-007-01: 深色主题下编辑器使用深色背景和浅色文字
- AC-007-02: 浅色主题下编辑器使用浅色背景和深色文字
- AC-007-03: 切换主题时编辑器实时更新，无需重新打开
- AC-007-04: 工具栏样式使用 VS Code CSS 变量，与编辑器原生风格一致

### 2.3 数据实体

#### Entity-001: EditorMode

| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| mode | `'wysiwyg' \| 'source'` | 枚举 | 编辑器当前模式 |

#### Entity-002: ExtToWebMsg（Extension 到 WebView 的消息）

| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| type | `'init' \| 'contentChanged' \| 'setMode' \| 'theme'` | 枚举 | 消息类型 |
| content | string | init/contentChanged 时必填 | HTML 内容 |
| mode | EditorMode | init/setMode 时必填 | 编辑器模式 |
| isDark | boolean | theme 时必填 | 是否深色主题 |

#### Entity-003: WebToExtMsg（WebView 到 Extension 的消息）

| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| type | `'ready' \| 'contentUpdate' \| 'modeChanged' \| 'requestMode'` | 枚举 | 消息类型 |
| content | string | contentUpdate 时必填 | 更新后的 HTML |
| mode | EditorMode | modeChanged 时必填 | 切换后的模式 |

### 2.4 业务流程

#### Flow-001: 打开 HTML 文件流程

**流程描述**: 用户通过右键菜单以 Htmly Editor 打开 HTML 文件

1. 用户右键 .html 文件 → "Open With" → "Htmly Editor"
2. VS Code 激活 Htmly 扩展，调用 `resolveCustomTextEditor`
3. 创建 WebView 面板，加载 Vue 3 应用
4. WebView 发送 `ready` 消息
5. Extension 读取 TextDocument 内容，发送 `init` 消息（含 HTML 内容 + 模式 + 主题）
6. WebView 初始化 Tiptap 编辑器，渲染 HTML 内容

#### Flow-002: 内容编辑与同步流程

**流程描述**: 用户在编辑器中修改内容，同步到 VS Code TextDocument

**状态定义**:
| 状态 | 描述 | 可转换到 |
|-----|------|---------|
| idle | 等待用户输入 | editing |
| editing | 用户正在编辑 | debouncing |
| debouncing | 300ms 防抖等待 | syncing |
| syncing | 将内容写入 TextDocument | idle |

**状态转换**:
| 当前状态 | 触发事件 | 下一状态 | 条件 |
|---------|---------|---------|------|
| idle | 用户输入 | editing | - |
| editing | 用户停止输入 | debouncing | 启动 300ms 计时器 |
| debouncing | 300ms 超时 | syncing | 发送 contentUpdate 消息 |
| debouncing | 用户继续输入 | editing | 重置计时器 |
| syncing | applyEdit 完成 | idle | TextDocument 已更新 |

#### Flow-003: 模式切换流程

**流程描述**: 用户在 WYSIWYG 和 Source 模式间切换

1. 用户点击模式切换按钮
2. WebView 切换 Vue 组件（TiptapEditor ↔ CodeEditor）
3. 新编辑器组件读取共享 content ref 初始化
4. WebView 发送 `modeChanged` 消息通知 Extension
5. Extension 更新 modeMap 记录

---

## 3. 非功能需求

### 3.1 性能需求

| 指标 | 要求 | 对标参考 |
|-----|------|---------|
| 首次加载时间 | < 500ms（从 WebView 加载到编辑器可交互） | Web Visual Editor 约 300-500ms |
| 内容同步延迟 | < 300ms（防抖周期） | 行业标准 200-500ms |
| 大文件支持 | 支持 1MB 以内的 HTML 文件流畅编辑 | Web Visual Editor 未公开 |
| 模式切换时间 | < 200ms（模式切换到编辑器可交互） | 无直接对标 |
| 内存占用 | WebView 进程 < 100MB | VS Code 扩展常规水平 |

### 3.2 安全需求

| 需求 | 描述 | 优先级 |
|-----|------|-------|
| CSP 策略 | WebView 使用严格的 Content-Security-Policy，禁止内联脚本执行 | P0 |
| Nonce 验证 | 所有 `<script>` 标签使用随机 nonce | P0 |
| 资源限制 | localResourceRoots 限制为 dist/webview 目录 | P0 |
| XSS 防护 | 用户 HTML 内容通过 Tiptap 净化，不直接执行用户脚本 | P0 |

### 3.3 兼容性需求

| 类型 | 要求 |
|-----|------|
| VS Code 版本 | >= 1.80.0 |
| 操作系统 | Windows、macOS、Linux |
| 文件格式 | .html、.htm |
| 主题 | 深色主题、浅色主题（自动适配） |

---

## 4. 技术选型

### 4.1 技术栈

| 层 | 技术 | 选型理由 |
|---|------|---------|
| Extension Host | TypeScript + esbuild | 类型安全 + 极速构建 |
| WebView UI | Vue 3 + Vite | 轻量响应式框架 + 快速 HMR |
| WYSIWYG 引擎 | Tiptap 2（ProseMirror） | 输出标准 HTML，扩展性强，社区活跃 |
| 源码编辑器 | CodeMirror 6 | 现代化架构，HTML 语法高亮，主题支持 |
| VS Code API | CustomTextEditorProvider | 原生文本编辑器集成，支持 undo/redo/save |

### 4.2 架构设计

```
┌────────────────────────────────┐
│       VS Code Extension Host    │
│  ┌──────────────────────────┐  │
│  │  HtmlyEditorProvider      │  │
│  │  - resolveCustomTextEditor│  │
│  │  - applyEdit (document)   │  │
│  │  - modeMap (per document) │  │
│  └──────────┬───────────────┘  │
│             │ postMessage       │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │       WebView (Vue 3)     │  │
│  │  ┌────────────────────┐  │  │
│  │  │   Toolbar.vue       │  │  │
│  │  ├────────────────────┤  │  │
│  │  │  TiptapEditor.vue  │  │  │
│  │  │  (WYSIWYG mode)    │  │  │
│  │  ├────────────────────┤  │  │
│  │  │  CodeEditor.vue    │  │  │
│  │  │  (Source mode)     │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

**消息协议**:
```
Extension Host ──init/contentChanged/theme──▶ WebView
Extension Host ◀──ready/contentUpdate/modeChanged── WebView
```

---

## 5. 研究分析附录

### 5.1 竞品功能模块对比

#### 模块 1: 可视化编辑能力

| 竞品 | 功能特性 | 用户体验 | 技术实现 |
|-----|---------|---------|---------|
| Web Visual Editor (urin) | 预览同步 + 元素选择/拖拽 | 偏重布局调整，非富文本编辑 | 原生 WebView 渲染 |
| EditSage | WYSIWYG 基础编辑 | 基础富文本编辑，功能有限 | 未知编辑引擎 |
| waiVSCode | WYSIWYG HTML 编辑 | 基础可视化编辑 | 未知 |
| HTML WYSIWYG Designer Addon | 图形化 HTML 设计器 | 偏重页面布局设计 | 自定义设计器 |
| **Htmly（我们）** | 完整富文本编辑（标题、列表、表格、对齐等） | 专业级 WYSIWYG 体验 | Tiptap 2 (ProseMirror) |

#### 模块 2: 源码编辑能力

| 竞品 | 功能特性 | 用户体验 | 技术实现 |
|-----|---------|---------|---------|
| Web Visual Editor | 依赖 VS Code 原生编辑器 | 使用原生编辑器体验好 | VS Code TextEditor |
| EditSage | 无独立源码模式 | 需切换回默认编辑器 | N/A |
| waiVSCode | 未明确 | 未知 | 未知 |
| **Htmly（我们）** | 内嵌 CodeMirror 6 源码编辑器 | 语法高亮 + 行号 + 主题 | CodeMirror 6 |

#### 模块 3: VS Code 集成度

| 竞品 | 功能特性 | 用户体验 | 技术实现 |
|-----|---------|---------|---------|
| Web Visual Editor | 高度集成（选择同步、undo/redo） | 与原生编辑器并列使用 | WebView + TextEditor 双面板 |
| EditSage | 中等集成 | CustomEditor 方式 | CustomTextEditor |
| **Htmly（我们）** | 深度集成（共享 TextDocument） | 单面板，undo/redo/save 原生 | CustomTextEditorProvider |

### 5.2 竞品对比矩阵

| 维度 | Web Visual Editor | EditSage | waiVSCode | Designer Addon | **Htmly** |
|-----|------------------|----------|-----------|---------------|-----------|
| **核心功能** | | | | | |
| WYSIWYG 编辑 | 预览 + 拖拽 | 基础 | 基础 | 布局设计 | 完整富文本 |
| 源码编辑 | 原生 VS Code | 无 | 未知 | 无 | CodeMirror 6 |
| 双模式切换 | 双面板并列 | 无 | 无 | 无 | 单面板一键切换 |
| 文本格式化 | 无 | 基础 | 基础 | 无 | 完整（B/I/U/S/H1-3） |
| 列表支持 | 无 | 部分 | 部分 | 无 | 有序 + 无序 |
| 表格编辑 | 无 | 无 | 无 | 无 | 完整（插入/调整列宽） |
| 文本对齐 | 无 | 无 | 无 | 无 | 左/中/右 |
| 链接编辑 | 无 | 未知 | 未知 | 无 | 支持 |
| 图片插入 | 拖拽 | 未知 | 未知 | 支持 | 支持 |
| **集成度** | | | | | |
| Undo/Redo | 原生 | 未知 | 未知 | 未知 | 原生 |
| 主题跟随 | 部分 | 未知 | 未知 | 未知 | 完整（深色/浅色） |
| 外部变更感知 | 有 | 未知 | 未知 | 未知 | 有 |
| **技术** | | | | | |
| GitHub Stars | 614+ | 未公开 | 未公开 | 未公开 | 新项目 |
| 编辑引擎 | 原生 DOM | 未知 | 未知 | 自定义 | Tiptap 2 + CodeMirror 6 |
| 框架 | 原生 JS | 未知 | 未知 | 未知 | Vue 3 |

### 5.3 最佳实践建议

#### 推荐采用

1. **CustomTextEditorProvider**: 竞品中最佳实践，确保与 VS Code TextDocument 深度集成（来源：Web Visual Editor、VS Code 官方文档）
2. **主题自动跟随**: Web Visual Editor 实现了主题跟随，用户期望编辑器与 VS Code 风格一致（来源：行业标配）
3. **外部变更感知**: 监听 `onDidChangeTextDocument` 处理 git checkout 等场景（来源：Web Visual Editor）
4. **retainContextWhenHidden**: 保留 WebView 上下文避免切换标签页时重新加载（来源：VS Code 最佳实践）
5. **CSP 安全策略**: 使用 nonce + 严格 CSP，防止 XSS 注入（来源：VS Code 安全规范）

#### 建议避免

1. **双面板并列显示**: Web Visual Editor 采用源码 + 预览双面板，但会占用过多屏幕空间；建议采用单面板模式切换
2. **直接执行用户 HTML 中的 `<script>`**: 安全风险高，应通过 Tiptap 净化后渲染
3. **过于复杂的布局编辑**: Designer Addon 尝试做页面布局设计器，但体验不佳；应聚焦富文本内容编辑

#### 创新机会

1. **Tiptap 2 引擎**: 竞品均未使用专业富文本编辑框架，这是 Htmly 的核心差异化优势
2. **CodeMirror 6 源码编辑**: 竞品的源码编辑要么依赖原生 VS Code 编辑器，要么缺失；内嵌 CodeMirror 6 提供一致的源码编辑体验
3. **表格可视化编辑**: 竞品均不支持在可视化模式下编辑表格，这是一个显著的功能差异点
4. **单面板双模式切换**: 相比 Web Visual Editor 的双面板方案，单面板切换更节省空间，更符合编辑器用户的习惯

---

## 6. 验收标准汇总

| 编号 | 验收标准 | 对应用户故事 | 优先级 |
|-----|---------|------------|-------|
| AC-001-01 | 右键 .html/.htm 文件可用 Htmly Editor 打开 | US-001 | P0 |
| AC-001-02 | 默认进入 WYSIWYG 模式，显示工具栏 | US-001 | P0 |
| AC-001-03 | 正确渲染 HTML 内容 | US-001 | P0 |
| AC-002-01 | 工具栏提供模式切换按钮 | US-002 | P0 |
| AC-002-02 | 模式切换内容不丢失 | US-002 | P0 |
| AC-002-03 | Source 模式显示语法高亮源码 | US-002 | P0 |
| AC-002-04 | 不同模式下工具栏适配显示 | US-002 | P0 |
| AC-003-01 | 标题级别选择器（H1-H3 + 段落） | US-003 | P0 |
| AC-003-02 | 加粗/斜体/下划线/删除线 | US-003 | P0 |
| AC-003-03 | 列表/引用/代码块 | US-003 | P0 |
| AC-003-04 | 文本对齐 | US-003 | P1 |
| AC-003-05 | 格式按钮激活状态高亮 | US-003 | P0 |
| AC-003-06 | 键盘快捷键支持 | US-003 | P1 |
| AC-004-01 | 插入 3x3 默认表格（含表头） | US-004 | P1 |
| AC-004-02 | 表格列宽可拖拽调整 | US-004 | P1 |
| AC-004-03 | 标准 table/tr/th/td 标签 | US-004 | P1 |
| AC-005-01 | 源码编辑器显示行号 | US-005 | P0 |
| AC-005-02 | HTML 语法高亮 | US-005 | P0 |
| AC-005-03 | Undo/Redo 支持 | US-005 | P0 |
| AC-005-04 | 高亮当前行 | US-005 | P0 |
| AC-005-05 | 深色/浅色主题切换 | US-005 | P0 |
| AC-006-01 | Ctrl+S 保存文件 | US-006 | P0 |
| AC-006-02 | Ctrl+Z / Ctrl+Shift+Z | US-006 | P0 |
| AC-006-03 | 未保存标记显示 | US-006 | P0 |
| AC-006-04 | Git diff 正确显示 | US-006 | P0 |
| AC-006-05 | 外部变更自动同步 | US-006 | P1 |
| AC-007-01 | 深色主题适配 | US-007 | P0 |
| AC-007-02 | 浅色主题适配 | US-007 | P0 |
| AC-007-03 | 主题切换实时更新 | US-007 | P0 |
| AC-007-04 | VS Code CSS 变量一致 | US-007 | P0 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|-----|------|---------|------|
| 1.0 | 2026-03-24 | 初始版本 | Htmly Team |
