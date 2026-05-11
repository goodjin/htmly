# Htmly — Competitor Analysis

> A landscape survey of HTML/WYSIWYG editors across VS Code extensions, web platforms, and desktop applications. Last updated: May 2026.

---

## Executive Summary

The HTML/WYSIWYG editing space spans three distinct platform categories:

1. **VS Code Extensions** — Live preview and lightweight WYSIWYG tools for developers already inside VS Code.
2. **Web-based Collaborative Editors** — Notion-like platforms with real-time collaboration, blocks, and cloud hosting.
3. **Desktop Editors** — Standalone apps offering offline-first, file-based WYSIWYG or Markdown editing.

Htmly's core positioning is a **VS Code extension for WYSIWYG HTML authoring**. Most existing VS Code HTML extensions are **read-only preview tools** (no editing), while the few WYSIWYG editing extensions have limited features. Htmly has a clear opportunity to own the "edit + preview + export" workflow for HTML authors inside VS Code.

---

## I. VS Code Extensions

### 1. Live Server (ritwickdey.LiveServer)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~72 million (as of Feb 2026) |
| **Pricing** | Free, open-source |
| **Publisher** | Ritwick Dey (individual) |

**Key Features:**
- Launches a local HTTP server from VS Code
- Live reload on file save (static and dynamic pages)
- Multi-root workspace support
- Custom port configuration
- Works with PHP, Node.js backends (partial)

**What Htmly Has That Live Server Doesn't:**
- WYSIWYG visual editing (Live Server is preview-only)
- Split-pane editing (source ↔ visual)
- Export to embedded HTML with fonts and images inlined

**What Live Server Has That Htmly Doesn't:**
- True browser-based preview with full browser capabilities
- Server-side rendering / dynamic page support
- Much larger install base and community trust
- Browser extension for remote/live reload

**Verdict:** Live Server serves developers who already write raw HTML. Htmly serves users who want to *author* HTML visually. They can coexist — Htmly can export a file, then Live Server can serve it.

---

### 2. Live Preview (ms-vscode.live-server)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension (Official Microsoft) |
| **Installs** | ~10–15 million |
| **Pricing** | Free, open-source |
| **Publisher** | Microsoft |

**Key Features:**
- Official Microsoft extension for HTML preview
- Side-by-side preview in VS Code
- Live reload on save
- Basic responsive testing

**What Htmly Has That Live Preview Doesn't:**
- Full WYSIWYG editing (Live Preview is read-only)
- Font embedding and image export
- Markdown-to-HTML authoring workflow

---

### 3. HTML Preview (tht13.html-preview-vscode)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~2–5 million |
| **Pricing** | Free |
| **Publisher** | Individual (tht13) |

**Key Features:**
- Simple HTML document preview
- Basic rendering

**What Htmly Has That HTML Preview Doesn't:**
- WYSIWYG editing with visual controls
- Font and image embedding for export
- Split-pane editing experience

**Verdict:** Simple preview-only tool. Htmly's editing features put it in a different league.

---

### 4. HTML Preview Pro (GingerTurtle.html-preview-pro)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~500K–1M |
| **Pricing** | Free / freemium |
| **Publisher** | GingerTurtle |

**Key Features:**
- Live reload
- Responsive device testing
- Mobile preview
- Developer tools integration
- Multi-browser support

**What Htmly Has That HTML Preview Pro Doesn't:**
- WYSIWYG editing (Preview Pro is read-only)
- Markdown-based HTML authoring
- Font and image export embedding

---

### 5. HTML Wysiwyg Designer (node-projects.vscode-desi...)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~100–200K |
| **Pricing** | Free / paid tiers |
| **Publisher** | Node-Projects |

**Key Features:**
- Graphical HTML designer
- Drag-and-drop components
- Code generation from visual design
- WYSIWYG editing (rare in VS Code space)

**What Htmly Has That HTML Wysiwyg Designer Doesn't:**
- Markdown-to-HTML authoring workflow
- Clean, modern editor UX
- Font and image embedding export
- Better integration for content editors vs. developers

**What HTML Wysiwyg Designer Has That Htmly Doesn't:**
- Drag-and-drop component palette
- More developer-focused component system
- Richer code-generation from visual layouts

**Verdict:** The most direct WYSIWYG competitor in the VS Code extension space, but targets developers building layouts, not content authors writing HTML.

---

### 6. waiVSCode (corernd.wai-vscode)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~50K |
| **Pricing** | Free |
| **Publisher** | Individual (corernd) |

**Key Features:**
- Web-based WYSIWYG HTML editor inside VS Code
- Basic visual editing

**What Htmly Has That waiVSCode Doesn't:**
- Much larger feature set (export, font embedding, Markdown support)
- Active development and modern architecture

---

### 7. VSCode Markdown Editor (zaaack/vscode-markdown-editor)

| Attribute | Details |
|---|---|
| **Platform** | VS Code Extension |
| **Installs** | ~100–200K |
| **Pricing** | Free, open-source |
| **Publisher** | Individual (zaaack) |

**Key Features:**
- WYSIWYG Markdown editing for VS Code
- Side-by-side preview
- Rich text editing experience

**What Htmly Has That vscode-markdown-editor Doesn't:**
- HTML as the primary authoring format (not Markdown)
- HTML export with embedded fonts/images
- Visual HTML authoring without Markdown syntax

**What vscode-markdown-editor Has That Htmly Doesn't:**
- Markdown syntax support and real-time preview
- Larger Markdown community

**Verdict:** This is the closest "category neighbor" — a WYSIWYG editor inside VS Code. Htmly differentiates by targeting HTML authoring rather than Markdown.

---

## II. Web-Based Platforms

### 8. Notion

| Attribute | Details |
|---|---|
| **Platform** | Web (SaaS) |
| **Users** | ~100 million (as of 2024–2026) |
| **Pricing** | Free tier; $8/user/month (Plus); $15/user/month (Business); Enterprise pricing |
| **Founded** | 2013 |
| **Headquarters** | San Francisco, CA |

**Key Features:**
- Block-based editor (paragraphs, headings, callouts, toggles, databases, kanban, calendars, embeds)
- Real-time collaboration
- Templates and widgets
- API and integrations
- Export to Markdown, CSV, PDF
- Knowledge base and wiki capabilities
- Mobile apps

**What Notion Has That Htmly Doesn't:**
- Collaborative editing (multiple users simultaneously)
- Database views (kanban, gallery, calendar, table)
- Block-based content model
- Massive ecosystem and integrations
- Brand recognition and 100M+ users
- Team workspace management

**What Htmly Has That Notion Doesn't:**
- Direct HTML file editing and export
- VS Code integration (developers stay in their editor)
- Font and image embedding in exports
- No cloud dependency — local file-based workflow
- Free, self-contained, no account needed

**Verdict:** Notion is for teams and knowledge management. Htmly is for individual developers and content authors who prefer VS Code and want full control over their HTML output. Different audiences, but both solve "writing content."

---

### 9. Coda

| Attribute | Details |
|---|---|
| **Platform** | Web (SaaS) |
| **Users** | Not publicly disclosed; enterprise-focused |
| **Pricing** | Free for individuals; $10/user/month (Pro); $20/user/month (Team); Enterprise pricing |
| **Founded** | 2014 |
| **Headquarters** | San Francisco, CA |

**Key Features:**
- Documents with tables, databases, and formulas
- Real-time collaboration
- Automation and workflows
- AI writing assistant
- Publish to web

**What Coda Has That Htmly Doesn't:**
- Database and formula capabilities
- Enterprise-grade collaboration
- Automation workflows
- Much larger team and funding

**Verdict:** Coda targets enterprise teams. Htmly targets individual developers. Minimal direct competition.

---

### 10. HackMD

| Attribute | Details |
|---|---|
| **Platform** | Web (SaaS) + self-hosted open-source |
| **Users** | Significant in developer/markdown community; millions of notes created |
| **Pricing** | Free tier; €5/month (Basic); €10/month (Standard); €15/month (Pro); Enterprise pricing |
| **License** | AGPL v3 for self-hosted |
| **Founded** | 2015 |
| **GitHub** | hackmdio/hackmd (~79 repositories) |

**Key Features:**
- Real-time collaborative Markdown editing
- Share via link with granular permissions
- Slide mode (presentations from Markdown)
- Book mode (multi-page docs)
- Self-hostable (full control, privacy)
- Export to PDF, HTML, Markdown
- Integrations (GitHub, GitLab, Dropbox)

**What HackMD Has That Htmly Doesn't:**
- Real-time collaboration
- Slide/presentation mode
- Larger Markdown community
- More mature export options

**What Htmly Has That HackMD Doesn't:**
- VS Code integration
- WYSIWYG HTML editing
- Font and image embedding export
- Markdown-agnostic HTML authoring

**Verdict:** HackMD is the strongest direct competitor for "developer-focused web-based markdown editing with export." HackMD wins on collaboration; Htmly wins on VS Code integration and HTML-first workflow.

---

## III. Desktop Applications

### 11. Obsidian

| Attribute | Details |
|---|---|
| **Platform** | Desktop (Electron) — Windows, macOS, Linux |
| **Users** | ~1 million (estimated from GitHub downloads, 2023 data) |
| **Pricing** | Free (personal use); $25/year (Catalyst — beta access, community themes/plugins); $50/year (Insider — early access); Commercial licenses available |
| **Founded** | 2020 |
| **Headquarters** | Seattle, WA |

**Key Features:**
- Local-first, local-only Markdown editor
- Bidirectional linking (wiki-style `[[links]]`)
- Graph view (knowledge graph visualization)
- Vaults (folder-based note organization)
- 1,700+ community plugins
- 300+ community themes
- Daily notes, templates
- Mobile apps (iOS/Android)
- Publish to web (Obsidian Publish, $8/month)

**What Obsidian Has That Htmly Doesn't:**
- Graph view / knowledge graph
- Bidirectional linking
- Massive plugin ecosystem (1,700+)
- Larger community and content ecosystem
- Sync service (cross-device)
- Mobile apps
- Daily notes and journaling

**What Htmly Has That Obsidian Doesn't:**
- WYSIWYG HTML editing
- VS Code integration (Obsidian is standalone)
- Export to embedded HTML with fonts/images
- No plugin ecosystem overhead — focused feature set

**Verdict:** Obsidian is a knowledge management powerhouse for Markdown. Htmly is a focused HTML authoring tool. Obsidian targets personal knowledge management; Htmly targets HTML content creation. Limited overlap.

---

### 12. Typora

| Attribute | Details |
|---|---|
| **Platform** | Desktop — Windows, macOS, Linux |
| **Users** | Millions of downloads historically |
| **Pricing** | One-time purchase: $14.99 (previously free during beta, now paid since 2021) |
| **Founded** | 2015 |
| **Headquarters** | China (Shanghai) |

**Key Features:**
- WYSIWYG Markdown editor (what-you-see-is-what-you-get — no preview pane needed)
- Live preview as you type
- LaTeX math rendering
- Code syntax highlighting
- Table support
- Image handling (drag-and-drop, auto-upload)
- Export to PDF, HTML, Word, EPUB, LaTeX, RTF
- File tree sidebar
- Themes

**What Typora Has That Htmly Doesn't:**
- True WYSIWYG (no source visible by default — pure visual editing)
- LaTeX math support
- Richer Markdown support
- Larger established user base
- EPUB export

**What Htmly Has That Typora Doesn't:**
- VS Code integration (Typora is standalone)
- HTML-first authoring (Typora is Markdown-first)
- Split-pane source + visual editing
- Font embedding and image export for web publishing
- No purchase required — free

**Verdict:** Typora is the gold standard for WYSIWYG Markdown editing on desktop. Htmly is the VS Code-native alternative for HTML-first authors. Typora is paid; Htmly is free. Both share the "WYSIWYG editing" philosophy but target different formats.

---

### 13. Atom (Discontinued)

| Attribute | Details |
|---|---|
| **Platform** | Desktop |
| **Status** | **Discontinued** — sunset December 15, 2022 |
| **Publisher** | GitHub (now Microsoft) |

**Key Features (historical):**
- HTML preview extensions (multiple community packages)
- Hackable text editor
- Git/GitHub integration
- Cross-platform

**Verdict:** Atom is dead. Its user base has migrated primarily to VS Code. Htmly's positioning inside VS Code is actually where Atom's legacy users have settled.

---

### 14. Brackets

| Attribute | Details |
|---|---|
| **Platform** | Desktop |
| **Status** | Active but low maintenance |
| **Publisher** | Adobe (now community-maintained) |
| **Installs** | Millions historically |

**Key Features (historical):**
- Live HTML/CSS preview
- Inline editing
- Designed for web designers
- Preprocessor support (LESS, SCSS)

**What Brackets Had That Most VS Code HTML Extensions Don't:**
- Live preview embedded in the editor UI
- Inline CSS editing tied to HTML elements

**Verdict:** Brackets is effectively abandoned by Adobe and maintained by the community. Its live preview features are now served by VS Code + extensions. Htmly benefits from this migration.

---

### 15. Mark Text

| Attribute | Details |
|---|---|
| **Platform** | Desktop — Windows, macOS, Linux |
| **Pricing** | Free, open-source |
| **GitHub** | marktext/marktext |
| **Installs** | ~1 million downloads |

**Key Features:**
- WYSIWYG Markdown editor
- Real-time preview
- Multiple editing modes (Source code, Typewriter, Focus)
- Export to HTML, PDF
- Clean, distraction-free UI
- Themes

**What Htmly Has That Mark Text Doesn't:**
- VS Code integration
- HTML as primary format (not Markdown)
- Font and image embedding export

**Verdict:** Mark Text is a direct Typora competitor but free and open-source. Similar positioning to Typora for Markdown users.

---

## IV. Summary Comparison

### Feature Matrix

| Tool | Platform | WYSIWYG | Markdown | HTML Export | VS Code Ext | Collaboration | Free | Self-Host |
|---|---|---|---|---|---|---|---|---|
| **Htmly** | VS Code Ext | ✅ Split-pane | ✅ | ✅ Embedded | — | ❌ | ✅ | N/A |
| Live Server | VS Code Ext | ❌ Preview | ❌ | ❌ | — | ❌ | ✅ | N/A |
| Live Preview (MS) | VS Code Ext | ❌ Preview | ❌ | ❌ | — | ❌ | ✅ | N/A |
| HTML Wysiwyg Designer | VS Code Ext | ✅ Dev-focused | ❌ | ❌ | — | ❌ | Partial | N/A |
| vscode-markdown-editor | VS Code Ext | ✅ | ✅ | Partial | — | ❌ | ✅ | N/A |
| **Notion** | Web | ✅ Blocks | ✅ | Markdown/PDF | ❌ | ✅ | ✅ Tier | ❌ |
| **Coda** | Web | ✅ | ✅ | ✅ HTML | ❌ | ✅ | ✅ Tier | ❌ |
| **HackMD** | Web | ✅ Side-by-side | ✅ | ✅ HTML/PDF | ❌ | ✅ | ✅ Tier | ✅ |
| **Obsidian** | Desktop | ❌ (Markdown) | ✅ | ✅ HTML | ❌ | ❌ | ✅ | ✅ |
| **Typora** | Desktop | ✅ True WYSIWYG | ✅ | ✅ Many formats | ❌ | ❌ | ❌ ($15) | ❌ |
| **Mark Text** | Desktop | ✅ | ✅ | ✅ HTML/PDF | ❌ | ❌ | ✅ | ❌ |
| **Brackets** | Desktop | ✅ Live preview | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

### User Base Summary

| Tool | Estimated User Base |
|---|---|
| Notion | ~100 million users |
| Live Server (VS Code) | ~72 million installs |
| Typora | Millions of downloads |
| Obsidian | ~1 million users |
| Live Preview (VS Code) | ~10–15 million installs |
| Mark Text | ~1 million downloads |
| HackMD | Millions of notes, strong developer community |
| HTML Preview (VS Code) | ~2–5 million installs |
| vscode-markdown-editor | ~100–200K installs |
| HTML Wysiwyg Designer | ~100–200K installs |
| Coda | Enterprise-focused, undisclosed but significant |

---

## V. Htmly's Competitive Position

### Strengths (Differentiators)

1. **VS Code Integration** — The only WYSIWYG HTML editor that lives directly inside the world's most popular code editor.
2. **Split-Pane Editing** — Visual editor alongside source HTML is a unique workflow for HTML authors.
3. **Embedded Export** — Font embedding and image inlining for standalone HTML files is rare in this space.
4. **Markdown + HTML** — Supports both Markdown authoring and HTML editing, bridging two communities.
5. **Free & Open Source** — No lock-in, no purchase required.

### Gaps vs. Competition

1. **No Real-Time Collaboration** — Notion, Coda, and HackMD all offer simultaneous multi-user editing.
2. **No Database/Kanban/Block Model** — Notion and Coda's flexible block system is a major productivity feature.
3. **No Graph View / Linking** — Obsidian's knowledge graph is a key differentiator.
4. **No Mobile App** — Obsidian and Notion have polished mobile experiences.
5. **No Plugin Ecosystem** — Obsidian's 1,700+ plugins create enormous extensibility.
6. **Smaller User Base** — VS Code WYSIWYG editing is a niche within a niche compared to Notion's 100M users.

### Opportunities

1. **Live Server Users (72M)** — A massive audience of HTML developers who could benefit from visual editing. Partnership or feature integration opportunity.
2. **Atom Migration** — Former Atom users now in VS Code may be looking for richer HTML editing experiences.
3. **Obsidian/Notion Power Users** — Users who want more control over their HTML output and prefer VS Code to standalone apps.
4. **Self-Hosting Community** — The selfhosted subreddit (500K+ members) shows strong demand for local-first tools. Htmly's local-first model aligns perfectly.
5. **Markdown Authors** — vscode-markdown-editor has shown demand for WYSIWYG editing inside VS Code. Htmly can capture HTML-focused Markdown users.

---

## VI. Potential Strategic Threats

1. **Microsoft could build native WYSIWYG HTML into VS Code** — Low probability (no signals), but would be existential.
2. **Notion/Coda add HTML export with embedded fonts** — Would reduce the export advantage.
3. **Obsidian adds WYSIWYG HTML mode** — Low probability given Obsidian's Markdown-first philosophy.
4. **HTML Wysiwyg Designer (VS Code) gains market share** — Requires monitoring.

---

*This document is intended for strategic planning and competitive awareness. Data points reflect best estimates from public sources as of May 2026.*
