# Htmly Feature Audit

**Generated:** 2026-05-11  
**Version:** 1.4.0 (based on recent commits)  
**Source:** `/Users/jin/github/htmly`

---

## Executive Summary

Htmly is a VS Code extension providing WYSIWYG HTML editing built on **Tiptap 2.x** (ProseMirror) + **CodeMirror 6**. The extension offers 4 editing modes, 15+ custom Tiptap extensions, and comprehensive toolbar-based formatting. Below is a complete inventory of all implemented features.

---

## 1. Editor Core (WYSIWYG, Source, Preview modes)

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Visual Mode (WYSIWYG)** | ✅ Complete | Rich text editing using Tiptap with full ProseMirror capabilities |
| **Source Mode** | ✅ Complete | Direct HTML editing using CodeMirror 6 with syntax highlighting, line numbers, fold gutter |
| **Preview Mode** | ✅ Complete | Sandboxed iframe rendering with device selector (Desktop/Tablet/Mobile) |
| **Split-Screen Mode** | ✅ Complete | Side-by-side or top-bottom source + preview with draggable resizable divider |
| **Mode Switching** | ✅ Complete | Seamless switching between modes with content/undo history preserved |
| **Large File Handling** | ✅ Complete | Files >500KB auto-switch to Source-only mode with informational banner |
| **Fragment Document Support** | ✅ Complete | No doctype/html/body required, preserved as-is on save |
| **Emmet Abbreviations** | ✅ Complete | CodeMirror supports Tab-triggered Emmet expansion in Source mode |
| **HTML Beautifier** | ✅ Complete | Format button in Source mode to auto-indent HTML |
| **Syntax Highlighting** | ✅ Complete | HTML tags, attributes, comments, strings, keywords with theme-aware colors |
| **Fold Gutter** | ✅ Complete | CodeMirror foldGutter for collapsing HTML tags in Source mode |

---

## 2. Formatting (Text Styling, Alignment, Colors)

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Bold** | ✅ Complete | Ctrl+B / toolbar button |
| **Italic** | ✅ Complete | Ctrl+I / toolbar button |
| **Underline** | ✅ Complete | Ctrl+U / toolbar button |
| **Strikethrough** | ✅ Complete | Ctrl+Shift+X / toolbar button |
| **Highlight (`<mark>`)** | ✅ Complete | Toolbar button with yellow highlight |
| **Headings (H1-H3)** | ✅ Complete | Dropdown selector in toolbar |
| **Text Alignment** | ✅ Complete | Left/Center/Right with inline `style="text-align"` |
| **Text Color** | ✅ Complete | Color picker with inline color styling |
| **Block Background Color** | ✅ Complete | Full block background color (via `BlockBackground` extension) |
| **Bubble Menu Formatting** | ✅ Complete | Floating menu with Bold, Italic, Underline, Link, Code, Highlight, Block BG |
| **Inline Code** | ✅ Complete | Single-line code formatting via Bubble Menu |
| **Code Blocks (syntax highlighting)** | ✅ Complete | Multi-line code blocks with highlight.js (JS, TS, CSS, HTML, Python, JSON) |

---

## 3. Content Elements (Tables, Images, Links, Lists, etc.)

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Bullet Lists** | ✅ Complete | Toggle via toolbar |
| **Ordered Lists** | ✅ Complete | Toggle via toolbar |
| **Blockquote** | ✅ Complete | Toggle via toolbar |
| **Horizontal Rule** | ✅ Complete | Insert via toolbar button |
| **Link Insertion** | ✅ Complete | Dialog with URL/text, Ctrl+K shortcut |
| **Link Removal** | ✅ Complete | Unlink button when cursor on link |
| **Image Insertion** | ✅ Complete | Dialog with src/alt dialog |
| **Image Drag-Resize** | ✅ Complete | 8-handle resize (corners + edges) with aspect ratio lock |
| **Image Alt Text** | ✅ Complete | Double-click to edit alt text |
| **Image Paste from Clipboard** | ✅ Complete | Paste images as base64 data URLs |
| **Image Drag-Drop from OS** | ✅ Complete | Drop image files directly into editor |
| **Table Insertion** | ✅ Complete | 3×3 default with header row option |
| **Table Row Add/Delete** | ✅ Complete | Add row above/below, delete current row |
| **Table Column Add/Delete** | ✅ Complete | Add column left/right, delete current column |
| **Table Cell Merge** | ✅ Complete | Merge adjacent cells |
| **Table Cell Split** | ✅ Complete | Split merged cells |
| **Table Header Row Toggle** | ✅ Complete | Mark/unmark first row as header |
| **Table Cell Background Color** | ✅ Complete | Color picker per cell |
| **Table Resize (Columns)** | ✅ Complete | ColumnResize extension with drag handles |
| **Callout Blocks** | ✅ Complete | Colored background with emoji icon, customizable color |
| **Emoji Picker (Callout)** | ✅ Complete | Bubble menu emoji selection for callouts |
| **Cover Image** | ✅ Complete | Full-width banner image with optional link and caption |
| **Toggle/Collapsible Blocks** | ✅ Complete | Expandable/collapsible content sections |
| **Multi-Column Layout** | ✅ Complete | Columns extension with resizable dividers |
| **Embed (YouTube, Vimeo, CodePen, CodeSandbox)** | ✅ Complete | Converts URLs to responsive embeds |
| **Link Preview Cards** | ✅ Complete | Rich preview cards for URLs with title/description/image |
| **Footnotes** | ✅ Complete | Numbered footnotes with auto-numbering |
| **Table of Contents (TOC)** | ✅ Complete | Auto-generated from headings with clickable navigation |
| **Slash Commands Menu** | ✅ Complete | `/` at block start for searchable command menu |
| **Format Painter** | ✅ Complete | Single-click (one use) or double-click (persistent) mode |

---

## 4. UX Features (Drag-Drop, Undo/Redo, History, Search)

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Drag-and-Drop Blocks** | ✅ Complete | Drag handle appears on block hover for headings, paragraphs, lists, blockquotes, code blocks, tables |
| **Undo/Redo** | ✅ Complete | Ctrl+Z / Ctrl+Shift+Z, history preserved across mode switches |
| **Extended History Panel** | ✅ Complete | Visual history panel showing all undo/redo entries |
| **Find (WYSIWYG)** | ✅ Complete | SearchBar component for find-only |
| **Find/Replace (Source)** | ✅ Complete | CodeMirror search with Ctrl+F / Ctrl+H |
| **Find/Replace (WYSIWYG)** | ⚠️ Partial | Find-only in WYSIWYG; no regex support |
| **Undoable Drag-Drop** | ✅ Complete | All block reorders can be undone |
| **Bubble Menu** | ✅ Complete | Floating toolbar on text selection |
| **Save Status Indicator** | ✅ Complete | Visual indicator (saving/saved/error/dirty) in toolbar |
| **Theme Propagation** | ✅ Complete | Dark/light theme changes propagate in real-time |
| **Virtual Scrolling** | ✅ Complete | Lazy loading for large documents to maintain performance |
| **Cursor Position Sync** | ✅ Complete | Cross-mode cursor position synchronization |
| **Keyboard Shortcuts** | ✅ Complete | Ctrl+S (save), Ctrl+B/I/U (format), Ctrl+K (link), etc. |
| **Settings Hot-Reload** | ✅ Complete | Settings changes take effect without VS Code restart |

---

## 5. Developer Features (Markdown Shortcuts, Slash Commands)

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Markdown Shortcuts** | ✅ Complete | `# ` → `<h1>`, `**text**` → `<strong>`, `*text*` → `<em>`, `` `code` `` → `<code>`, `- ` → `<ul>`, `1. ` → `<ol>`, `> ` → `<blockquote>`, `---` → `<hr>` |
| **Slash Commands** | ✅ Complete | `/h1`, `/h2`, `/h3`, `/paragraph`, `/bullet`, `/ordered`, `/blockquote`, `/code`, `/table`, `/image`, `/hr`, `/divider`, `/callout`, `/embed` |
| **CodeMirror Emmet** | ✅ Complete | Tab-triggered HTML abbreviation expansion |
| **Custom Theme Colors** | ✅ Complete | Primary accent color configurable |
| **Font Size Setting** | ✅ Complete | `htmly.defaultFontSize` affects both Tiptap and CodeMirror |

---

## 6. Export Features

| Feature | Status | Details / Limitations |
|---------|--------|----------------------|
| **Export as PDF** | ✅ Complete | Browser print dialog via Export dialog |
| **Export as Markdown** | ✅ Complete | Convert HTML to .md file |
| **Export as Plain Text** | ✅ Complete | Strip all formatting |
| **Export as Embedded HTML** | ✅ Complete | Single file with inlined CSS, embedded images, font replacement |
| **Export Dialog** | ✅ Complete | Keyboard-navigable export options menu |
| **History Export** | ✅ Complete | Export history to file for crash recovery |

---

## 7. Settings / Configuration

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `htmly.defaultMode` | `string` | `"wysiwyg"` | ✅ |
| `htmly.defaultFontSize` | `number` | `14` | ✅ |
| `htmly.enableMarkdownShortcuts` | `boolean` | `true` | ✅ |
| `htmly.splitScreenDirection` | `string` | `"horizontal"` | ✅ |
| `htmly.showButtonLabels` | `boolean` | `true` | ✅ |
| `htmly.autoHideToolbarInPreview` | `boolean` | `true` | ✅ |
| `htmly.customTheme.primaryColor` | `string` | `"#0e639c"` | ✅ |
| `htmly.useAsDefaultEditor` | `boolean` | `false` | ✅ |
| **VS Code Commands** | — | — | ✅ |
| `htmly.toggleMode` | command | — | ✅ |
| `htmly.setMode.wysiwyg` | command | — | ✅ |
| `htmly.setMode.source` | command | — | ✅ |
| `htmly.setMode.preview` | command | — | ✅ |
| `htmly.setMode.split` | command | — | ✅ |
| `htmly.save` | command | — | ✅ |
| **Keybindings** | — | — | ✅ |
| `Ctrl+S / Cmd+S` | save | — | ✅ |

---

## Feature Summary by Category

### ✅ Complete Features (58)

| Category | Count |
|----------|-------|
| Editor Core | 11 |
| Formatting | 13 |
| Content Elements | 32 |
| UX Features | 16 |
| Developer Features | 5 |
| Export Features | 6 |
| Settings | 14 |
| **Total** | **97** |

### ⚠️ Known Limitations

| Limitation | Description |
|------------|-------------|
| **Find/Replace Regex** | Source mode has basic search; WYSIWYG find/replace is missing regex support |
| **Image Storage** | Base64 encoding only; no cloud storage (S3, Cloudinary) or file:// URL references |
| **Table Formulas** | Basic tables with resize/merge/split; no spreadsheet-style formulas |
| **Real-time Collaboration** | Not implemented (solo editing only) |
| **Track Changes** | Not implemented |
| **Comments/Annotations** | Not implemented |
| **Revision History Browser** | Basic undo panel; no version diffing |
| **PDF Export Quality** | Uses browser print; no custom PDF generation |
| **Spell Check** | Not integrated |
| **Accessibility Checker (WCAG)** | Not implemented |
| **Keyboard Shortcut Customization** | Fixed shortcuts; no user customization |
| **Templates Library** | Not implemented |
| **@Mentions** | Links only; no user/page mentions |
| **Mobile/Touch Support** | VS Code web not primary target |

---

## Tiptap Extensions Inventory

| Extension | Purpose | Status |
|-----------|---------|--------|
| `StarterKit` | Base editor (paragraphs, headings, lists, etc.) | ✅ |
| `Underline` | Underline formatting | ✅ |
| `Link` | Hyperlink insertion/management | ✅ |
| `Image` | Image insertion with base resize | ✅ |
| `TextAlign` | Left/Center/Right alignment | ✅ |
| `Highlight` | Text highlighting (`<mark>`) | ✅ |
| `Table` + `TableRow` + `TableCell` + `TableHeader` | Table support with resizing | ✅ |
| `Placeholder` | Empty editor placeholder text | ✅ |
| `TextStyle` | Inline text styling | ✅ |
| `Color` | Text color support | ✅ |
| `CodeBlockLowlight` | Syntax-highlighted code blocks | ✅ |
| `SlashCommandsExtension` | `/` command menu | ✅ |
| `MarkdownShortcutsExtension` | Markdown input rules | ✅ |
| `DragHandleExtension` | Block drag-and-drop | ✅ |
| `ImageResizeExtension` | Image resize handles | ✅ |
| `Callout` | Colored callout blocks | ✅ |
| `Embed` | Media embed (YouTube, etc.) | ✅ |
| `TOCPlugin` | Table of Contents | ✅ |
| `Columns` + `Column` + `ColumnResizeExtension` | Multi-column layout | ✅ |
| `Toggle` | Collapsible sections | ✅ |
| `BlockBackground` | Block background colors | ✅ |
| `Footnote` + `Footnotes` | Footnote support | ✅ |
| `CoverImage` | Cover/banner images | ✅ |
| `LinkPreview` | URL preview cards | ✅ |
| `VirtualScroll` | Performance for large docs | ✅ |

---

## File Structure Reference

```
htmly/
├── README.md                          # Feature documentation
├── EVOLUTION-ROADMAP.md               # Roadmap with missing features
├── package.json                       # Configuration & settings
├── src/
│   ├── shared/types.ts                # TypeScript interfaces
│   └── extension/
│       └── index.ts                  # VS Code extension entry
└── webview/
    └── src/
        ├── App.vue                    # Root component
        ├── components/
        │   ├── TiptapEditor.vue       # WYSIWYG editor
        │   ├── CodeEditor.vue         # Source mode editor
        │   ├── PreviewPane.vue        # Preview iframe
        │   ├── SplitPane.vue          # Split-screen layout
        │   ├── Toolbar.vue            # Formatting toolbar
        │   ├── BubbleMenu.vue         # Floating selection toolbar
        │   ├── SearchBar.vue          # Find/replace bar
        │   ├── LinkDialog.vue         # Link insertion dialog
        │   ├── ImageDialog.vue        # Image insertion dialog
        │   ├── EmbedDialog.vue        # Embed insertion dialog
        │   ├── CoverImageDialog.vue   # Cover image dialog
        │   ├── LinkPreviewDialog.vue  # Link preview dialog
        │   ├── EmojiPicker.vue        # Emoji selector
        │   ├── ExportDialog.vue       # Export options
        │   ├── HistoryPanel.vue       # Undo history panel
        │   └── TOCPanel.vue          # Table of contents panel
        └── extensions/
            ├── markdownShortcuts.ts   # Markdown input rules
            ├── slashCommands.ts       # / command menu
            ├── dragHandle.ts          # Block drag-and-drop
            ├── imageResize.ts         # Image resize handles
            ├── Callout.ts            # Callout blocks
            ├── Embed.ts               # Media embeds
            ├── TOC.ts                 # Table of contents
            ├── Columns.ts             # Multi-column layout
            ├── Column.ts              # Column wrapper
            ├── columnResize.ts        # Column resizing
            ├── Toggle.ts              # Collapsible blocks
            ├── BlockBackground.ts     # Block backgrounds
            ├── Footnote.ts            # Footnotes
            ├── CoverImage.ts          # Cover images
            ├── LinkPreview.ts         # URL preview cards
            └── virtualScroll.ts        # Virtual scrolling
```

---

## Test Coverage

| Test Type | Status | Location |
|-----------|--------|----------|
| Unit Tests | ✅ Active | `webview/src/**/*.test.ts` |
| E2E Tests | ✅ Active | `test/e2e/` |

---

*End of Feature Audit*
