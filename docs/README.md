# Htmly — VS Code HTML WYSIWYG Editor

A VS Code extension that gives `.html` files a dual-mode editing experience:

- **Visual mode** — Tiptap-powered WYSIWYG editor with toolbar
- **Source mode** — CodeMirror 6 syntax-highlighted HTML editor

Both modes share the same `TextDocument`, so undo/redo, save, and Git all work natively.

## Architecture

```
htmly/
├── src/                          # VS Code Extension Host (Node.js)
│   ├── extension/
│   │   ├── editorProvider.ts     # CustomTextEditorProvider
│   │   └── extension.ts          # activate/deactivate
│   └── shared/types.ts           # Message types shared with webview
├── webview/                      # WebView UI (Vue 3 + Vite)
│   └── src/
│       ├── App.vue               # Root component, message orchestration
│       ├── components/
│       │   ├── Toolbar.vue       # Formatting toolbar
│       │   ├── TiptapEditor.vue  # WYSIWYG mode (Tiptap)
│       │   └── CodeEditor.vue    # Source mode (CodeMirror 6)
│       └── composables/
│           └── useVSCode.ts      # postMessage bridge
└── docs/
    └── README.md
```

## Message Protocol

```
Extension Host ──init/contentChanged/theme──▶ WebView
Extension Host ◀──ready/contentUpdate/modeChanged── WebView
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Extension Host | TypeScript + esbuild |
| WebView UI | Vue 3 + Vite |
| WYSIWYG engine | Tiptap 2 (ProseMirror-based) |
| Source editor | CodeMirror 6 |
| VS Code API | CustomTextEditorProvider |

## Dev

```bash
# Root: build extension
npm install
npm run dev:extension   # watch mode

# Webview
cd webview
npm install
npm run dev             # Vite dev server (for UI dev)
npm run build           # Build to dist/webview/
```

Press `F5` in VS Code to launch the Extension Development Host.
