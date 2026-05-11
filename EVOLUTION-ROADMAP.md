# Htmly Evolution Roadmap
## Analysis: Current State vs Professional HTML Editors

**Generated:** 2026-05-10  
**Version Analyzed:** 1.4 (based on recent commits)  
**Source:** `/Users/jin/github/htmly`

---

## Executive Summary

Htmly is a VS Code extension providing WYSIWYG HTML editing built on Tiptap 2.x + CodeMirror 6. It offers solid core editing with 15+ custom extensions (Columns, Toggle, Callout, Embed, TOC, Footnote, CoverImage, LinkPreview, etc.). However, it lacks enterprise features common in Notion, CKEditor 5, TinyMCE 7, and Webflow.

---

## Current Capabilities (v1.4)

### ✅ Implemented Features

| Category | Features |
|----------|----------|
| **Editing Modes** | Visual (Tiptap), Source (CodeMirror), Preview (iframe), Split-screen |
| **Text Formatting** | Bold, Italic, Underline, Strikethrough, Highlight, H1-H3, Lists, Blockquote, Code Block |
| **Media** | Image (drag-resize), Embed (YouTube, Vimeo, CodePen, CodeSandbox), Cover Image |
| **Layout** | Multi-column (resizable), Toggle/collapsible blocks, Tables (resizable, merge/split) |
| **Input Helpers** | Markdown shortcuts (`#`, `**`, `-`, etc.), Slash commands (`/` menu) |
| **UX** | Bubble menu, Format painter, Drag-and-drop blocks, Link preview cards |
| **Special Blocks** | Callout (with emoji + color), Footnotes, Table of Contents |
| **Settings** | Default mode, Font size, Theme color, Split direction, Button labels |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension                        │
├─────────────────────────────────────────────────────────────┤
│  Tiptap 2.x (ProseMirror)    │    CodeMirror 6              │
│  ├─ 15 Custom Extensions     │    ├─ HTML syntax highlight  │
│  ├─ BubbleMenu               │    ├─ Line numbers           │
│  └─ Vue 3 Integration         │    └─ Emmet support          │
└─────────────────────────────────────────────────────────────┘
```

---

## Top 15 Missing Professional Features

### Ranked by Impact (High → Low)

| Rank | Feature | Why It Matters | Priority |
|------|---------|----------------|----------|
| **1** | **Real-time Collaboration** | Team editing is table-stakes for Notion/CKEditor. Without it, htmly is solo-only. | Critical |
| **2** | **Export to PDF/DOCX** | CKEditor 5 and TinyMCE have premium export plugins. Users need document export. | Critical |
| **3** | **Track Changes & Revision History** | Enterprise content workflows require change tracking (Notion, CKEditor). | High |
| **4** | **Comments & Annotations** | Collaborative review without comments is severely limited. | High |
| **5** | **Image Upload/Storage Integration** | Current: base64 only. Need cloud storage (S3, Cloudinary) or at least file:// URLs. | High |
| **6** | **Find & Replace (Regex)** | Source mode has basic search. Visual mode find/replace is missing regex support. | Medium-High |
| **7** | **Accessibility Checker (WCAG)** | CKEditor's Accessibility Checker. Professional editors need a11y validation. | Medium |
| **8** | **Spell Check Integration** | System spell check or LanguageTool/Grammarly integration. | Medium |
| **9** | **Templates Library** | Notion templates, predefined layouts for common document types. | Medium |
| **10** | **@Mentions & Smart Links** | Notion/CKEditor mentions for users/pages. Smart link previews beyond basic URL. | Medium |
| **11** | **Table Formulas & Sorting** | TinyMCE Advanced Tables has formulas. Basic sorting exists; formulas missing. | Medium |
| **12** | **AI Integration** | CKEditor AI Assistant, Notion AI. Content generation/reformatting assistance. | Medium-Low |
| **13** | **Auto-save & Conflict Resolution** | Prevent data loss, handle concurrent edits gracefully. | Medium-Low |
| **14** | **Keyboard Shortcut Customization** | Power users expect customizable shortcuts (VS Code style). | Low-Medium |
| **15** | **Mobile/Touch Support** | VS Code web? Responsive toolbar for touch devices. | Low |

---

## Feature Gap Analysis

### Notion (vs htmly)

| Notion Feature | Status in htmly | Gap |
|---------------|-----------------|-----|
| Real-time collaboration | ❌ Missing | **Major** |
| Database views (Table/Board/Calendar) | ❌ Missing | **Major** |
| Block-level permissions | ❌ Missing | Major |
| Templates | ⚠️ Partial | Medium |
| Version history | ⚠️ Basic (undo) | Medium |
| @mentions | ⚠️ Links only | Medium |
| Export (PDF/Markdown) | ❌ Missing | Major |
| AI writing assistant | ❌ Missing | Medium |

### CKEditor 5 (vs htmly)

| CKEditor 5 Feature | Status in htmly | Gap |
|-------------------|-----------------|-----|
| Real-time collaborative editing (CRDT) | ❌ Missing | **Major** |
| Track Changes | ❌ Missing | Major |
| Revision history | ❌ Missing | Major |
| Comments & annotations | ❌ Missing | Major |
| Export to PDF/DOCX | ❌ Missing | Major |
| Accessibility Checker | ❌ Missing | Medium |
| Mention plugin | ⚠️ Links only | Medium |
| Cloud Services (upload, storage) | ❌ Missing | Major |
| Multi-language spell check | ❌ Missing | Medium |

### TinyMCE 7 (vs htmly)

| TinyMCE Feature | Status in htmly | Gap |
|----------------|-----------------|-----|
| Premium plugins (Spell Pro, Image AI) | ❌ Missing | Major |
| Export (PowerPaste, DOCX) | ❌ Missing | Major |
| Advanced Tables (formulas) | ⚠️ Basic tables | Medium |
| Footnote plugin | ✅ Implemented | — |
| Table of Contents | ✅ Implemented | — |
| Format painter | ✅ Implemented | — |
| Link checker | ⚠️ Basic validation | Low |
| Media embed | ✅ Implemented | — |

### Webflow (vs htmly)

| Webflow Feature | Status in htmly | Gap |
|----------------|-----------------|-----|
| Visual CSS design | ⚠️ Basic styling | Medium |
| Responsive breakpoints | ❌ Missing | Major |
| Interactions & animations | ❌ Missing | Medium |
| CMS/Collections | ❌ Missing | Major |
| Client-first methodology | ❌ Missing | Medium |
| Custom code injection | ❌ Missing | Medium |

---

## Roadmap: Version Milestones

### 🟢 v1.5 — "Collaboration Foundation"
**Target:** Q3 2026 | **Focus:** Infrastructure for collaboration

```markdown
## Features
- [ ] WebSocket server setup for real-time sync
- [ ] Y.js or Automerge integration for CRDT
- [ ] Presence indicators (who's viewing)
- [ ] Basic conflict resolution (last-write-wins)
- [ ] Document locking for source mode

## Technical Debt
- [ ] Refactor state management (Pinia)
- [ ] Add unit tests for all 15 extensions
- [ ] Performance: lazy-load non-critical extensions
- [ ] TypeScript strict mode compliance
```

### 🟢 v1.6 — "Export & Print"
**Target:** Q4 2026 | **Focus:** Document output

```markdown
## Features
- [ ] HTML to PDF export (pdfmake or jsPDF)
- [ ] HTML to DOCX export (docx library)
- [ ] Print-optimized stylesheet
- [ ] Export dialog with options (page size, margins)
- [ ] Batch export (multiple files)

## UX Improvements
- [ ] Image upload to temp storage (for export)
- [ ] CSS inlining for standalone HTML
```

### 🟡 v1.7 — "Review & Approval"
**Target:** Q1 2027 | **Focus:** Team workflows

```markdown
## Features
- [ ] Comments with threads
- [ ] Track changes (additions/deletions)
- [ ] Revision history browser
- [ ] Accept/reject change controls
- [ ] @mention notifications (VS Code)

## UI Additions
- [ ] Comments sidebar panel
- [ ] Changes sidebar panel
- [ ] Diff view for revisions
```

### 🟡 v1.8 — "Media & Storage"
**Target:** Q2 2027 | **Focus:** Asset management

```markdown
## Features
- [ ] Cloud storage integration (S3, Cloudinary)
- [ ] Drag-drop image upload
- [ ] Media library panel
- [ ] Image optimization on upload
- [ ] File reference management (vs base64)

## Improvements
- [ ] Image alt text SEO checker
- [ ] Lazy loading for embedded images
```

### 🟠 v1.9 — "Professional Polish"
**Target:** Q3 2027 | **Focus:** Enterprise readiness

```markdown
## Features
- [ ] Spell check (LanguageTool or system)
- [ ] Accessibility checker (WCAG 2.1)
- [ ] Find & Replace with regex
- [ ] Keyboard shortcut customization
- [ ] Templates library (predefined layouts)

## Performance
- [ ] Virtual scrolling for large documents
- [ ] Web Worker for heavy operations
- [ ] IndexedDB for offline support
```

### 🔴 v2.0 — "AI Integration"
**Target:** Q4 2027 | **Focus:** Intelligent editing

```markdown
## Features
- [ ] AI writing assistant (OpenAI/Anthropic)
- [ ] Smart link previews (rich metadata)
- [ ] Auto-summarization
- [ ] Grammar/style suggestions
- [ ] Document analysis (readability score)

## Collaboration
- [ ] Real-time collaborative editing (Y.js)
- [ ] Presence avatars
- [ ] Live cursor positions
```

---

## Implementation Priority Matrix

```
                    Impact
              Low      Medium     High
         ┌─────────┬─────────┬─────────┐
    High │ v1.9    │ v1.7    │ v1.5   │
         │ Shortcuts│ Comments │ Real-time│
         ├─────────┼─────────┼─────────┤
Effort   │ v1.9    │ v1.8    │ v1.6   │
  Low    │ Spell   │ Media   │ Export  │
         ├─────────┼─────────┼─────────┤
    Low  │ v2.0    │ v1.9    │ v1.7   │
         │ AI      │ A11y    │ Track   │
         │         │ Checker │ Changes │
         └─────────┴─────────┴─────────┘
```

---

## Recommended First Steps

### Immediate (v1.4 patch)
1. Fix any outstanding bugs from validation contract
2. Document extension API for third-party developers
3. Add keyboard shortcut legend to toolbar tooltip

### Short-term (v1.5)
1. **Real-time infrastructure** — This unlocks everything else
2. Add export foundation (HTML → PDF/DOCX)
3. Improve image handling (file references > base64)

### Medium-term (v1.7-v1.8)
1. Comments & track changes (collaboration milestone)
2. Media library with cloud storage
3. Spell check + accessibility checker

---

## Dependencies & Prerequisites

| Feature | Dependencies | Notes |
|---------|--------------|-------|
| Real-time collab | Y.js, y-websocket | CRDT library + server |
| PDF export | pdfmake, html2canvas | Client-side PDF generation |
| DOCX export | docx, mammoth | Word document generation |
| Comments | Custom or Tippy + Tiptap Comments | Requires data persistence |
| AI Assistant | OpenAI SDK / Anthropic | API key management needed |
| Media storage | AWS SDK / Cloudinary | Cloud provider integration |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CRDT complexity | High | High | Use Y.js (battle-tested) |
| Export fidelity | Medium | Medium | Start with basic, improve iteratively |
| Performance at scale | Medium | High | Virtual scrolling, Web Workers |
| Third-party API changes | Low | Medium | Abstract integrations behind interfaces |

---

## Conclusion

Htmly has a strong foundation with Tiptap + CodeMirror and 15 well-implemented custom extensions. The primary gaps are **collaboration features**, **export capabilities**, and **enterprise workflows** (track changes, comments, version history).

The recommended path:
1. **v1.5-1.6:** Infrastructure + Export (foundation)
2. **v1.7-1.8:** Review tools + Media management (team features)
3. **v1.9-2.0:** Polish + AI (differentiation)

This roadmap positions htmly as a professional-grade VS Code HTML editor while maintaining its developer-focused roots.
