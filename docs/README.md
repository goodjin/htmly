# Htmly — VS Code HTML WYSIWYG Editor

A VS Code extension that gives `.html` files a three-mode editing experience:

- **Visual mode** — Tiptap-powered WYSIWYG editor with toolbar
- **Source mode** — CodeMirror 6 syntax-highlighted HTML editor
- **Preview mode** — sandboxed rendered preview of the current HTML

All modes share the same `TextDocument`, so undo/redo, save, and Git all work natively.
For full HTML documents, Visual mode edits the `<body>` content while Source and Preview modes preserve and render the complete file.

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
Extension Host ──init/contentChanged/cycleMode/theme──▶ WebView
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

## Package

```bash
npm run package
```

This one-command packaging script installs missing dependencies, runs lint and type checks, builds the extension/webview bundles, and emits `htmly-1.0.0.vsix`.

## End-to-End Test

```bash
npm run test:e2e
```

The E2E test uses `@vscode/test-electron` to launch a real VS Code Extension Development Host. It writes two fixture pages into `test/e2e/workspace/`:

- `sample.html` — a realistic editorial page with independent blocks for paragraph, H1-H3, bold, italic, underline, strikethrough, bullet list, ordered list, blockquote, code block, and left/center/right alignment checks.
- `table-layout.html` — a separate dense layout fixture for table and horizontal rule checks, keeping table selection behavior isolated from the main content fixture.

Both files are opened with the `Htmly Editor`, then the live custom editor is verified through Visual, Source, Preview, and back to Visual.
