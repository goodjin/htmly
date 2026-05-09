# Htmly — WYSIWYG HTML Editor for VS Code

Htmly is a VS Code extension that provides a full-featured WYSIWYG (What You See Is What You Get) HTML editor directly within VS Code. Edit HTML files visually with a familiar rich-text editing experience, or switch to source code mode for direct HTML manipulation.

## Features Implemented in v1.2

### Mode Switching
- **Visual Mode (WYSIWYG)** — Rich text editing with Tiptap, featuring floating bubble menu on text selection
- **Source Mode** — Direct HTML editing with CodeMirror, syntax highlighting, line numbers, and Emmet abbreviation support
- **Preview Mode** — Sandboxed iframe rendering with device selector (Desktop/Tablet/Mobile)
- **Split-Screen Mode** — Side-by-side or top-bottom source + preview with draggable resizable divider

### Toolbar & Formatting
- Full formatting toolbar: Bold, Italic, Underline, Strikethrough, Headings (H1-H3), Bullet/Ordered Lists, Blockquote, Code Block
- Text alignment (Left/Center/Right) with inline `style="text-align"`
- Text color picker with inline color styling
- Insert Link / Remove Link with URL/text dialog
- Insert Image with src/alt dialog and drag-resize handles
- Insert Table with 3×3 grid, header row, add/remove rows/columns, merge/split cells, column resize
- Horizontal Rule insertion
- Highlight (`<mark>`) formatting
- Toggle button text labels via `htmly.showButtonLabels` setting

### Text Editing
- **Markdown Shortcuts** (when enabled): `# ` → `<h1>`, `**text**` → `<strong>`, `*text*` → `<em>`, `` `code` `` → `<code>`, `- ` → `<ul>`, `1. ` → `<ol>`, `> ` → `<blockquote>`, `---` → `<hr>`
- **Slash Commands** — Type `/` at block start for searchable command menu (Heading, Paragraph, List, Blockquote, Code Block, Table, Image, HR, Divider)
- **Format Painter** — Copy/paste formatting with single-click or double-click (persistent) mode
- **Bubble Menu** — Floating toolbar appears on text selection with Bold, Italic, Underline, Link, Code, Highlight

### Drag-and-Drop
- Drag handle appears on block hover
- Reorder headings, paragraphs, lists, blockquotes, code blocks, tables
- Undoable with Ctrl+Z

### Settings
- `htmly.defaultMode` — Initial mode on open (visual/source/preview)
- `htmly.defaultFontSize` — Editor font size (affects both Tiptap and CodeMirror)
- `htmly.enableMarkdownShortcuts` — Toggle markdown input rules
- `htmly.splitScreenDirection` — horizontal (side-by-side) or vertical (top-bottom)
- `htmly.showButtonLabels` — Show/hide toolbar button text labels
- `htmly.autoHideToolbarInPreview` — Hide formatting toolbar in Preview mode
- `htmly.customTheme.primaryColor` — Custom accent color for toolbar active states

### Large File Handling
- Files over 500KB automatically switch to Source-only mode
- Visual and Preview modes disabled with informational banner

### Cross-Mode Features
- Undo/redo history preserved across mode switches
- Theme changes propagate in real-time (dark/light)
- Settings changes take effect without VS Code restart
- Fragment documents (no doctype/html/body) preserved as-is on save

## Setup

```bash
npm install
npm run build
```

## Run Tests

```bash
# Unit tests
npm run test

# E2E tests (VS Code extension host)
npm run test:e2e

# Manual preview
npm run preview
```

## Key Files and Architecture

### Extension Entry
- `src/extension/extension.ts` — VS Code extension activation, commands, settings, status bar

### Webview UI
- `webview/src/App.vue` — Root component, mode switching, content change handling
- `webview/src/components/TiptapEditor.vue` — WYSIWYG editor using Tiptap
- `webview/src/components/CodeEditor.vue` — Source mode editor using CodeMirror
- `webview/src/components/PreviewPane.vue` — Preview iframe with device selector
- `webview/src/components/SplitPane.vue` — Split-screen layout with draggable divider
- `webview/src/components/Toolbar.vue` — Formatting toolbar with all buttons
- `webview/src/components/BubbleMenu.vue` — Floating selection toolbar
- `webview/src/components/SearchBar.vue` — Find/replace bar (WYSIWYG only)
- `webview/src/components/LinkDialog.vue` — Link insertion/edit dialog
- `webview/src/extensions/dragHandle.ts` — Drag-and-drop block reordering

### Composables
- `webview/src/composables/useVSCode.ts` — VS Code webview API (postMessage, onDidChangeConfiguration)

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `htmly.defaultMode` | `string` | `"visual"` | Initial edit mode |
| `htmly.defaultFontSize` | `number` | `14` | Editor font size |
| `htmly.enableMarkdownShortcuts` | `boolean` | `true` | Enable markdown input rules |
| `htmly.splitScreenDirection` | `string` | `"horizontal"` | Split layout direction |
| `htmly.showButtonLabels` | `boolean` | `false` | Show toolbar button labels |
| `htmly.autoHideToolbarInPreview` | `boolean` | `false` | Hide toolbar in Preview |
| `htmly.customTheme.primaryColor` | `string` | `"#0066cc"` | Accent color |
