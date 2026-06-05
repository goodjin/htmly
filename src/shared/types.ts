export type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'split';

// Save status for the toolbar indicator
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Export format options
export type ExportFormat = 'pdf' | 'markdown' | 'plaintext' | 'embedded' | 'site' | 'docx';

// Static site export page
export interface StaticSitePage {
  /** The page name/title */
  name: string;
  /** Relative path for the HTML file (e.g., 'page.html', 'subfolder/page.html') */
  path: string;
  /** The HTML content for the page */
  content: string;
}

// Static site export options
export interface StaticSiteOptions {
  /** Site title for index page */
  siteTitle: string;
  /** Site description for meta tags */
  siteDescription: string;
  /** SEO title (overrides page title if set) */
  seoTitle?: string;
  /** Custom page title for specific page export */
  customTitle?: string;
  /** Custom description for SEO (overrides siteDescription) */
  customDescription?: string;
  /** Open Graph image URL for social sharing */
  ogImage?: string;
  /** Custom domain for GitHub Pages deployment */
  customDomain?: string;
  /** Base URL for the site (optional, for absolute links) */
  baseUrl?: string;
  /** Include search functionality */
  includeSearch: boolean;
  /** Include table of contents sidebar */
  includeToc: boolean;
  /** CSS to include in all pages */
  customCss?: string;
}

// SEO settings for static site export
export interface SeoSettings {
  /** SEO title - overrides page title */
  seoTitle: string;
  /** SEO description - used in meta description */
  seoDescription: string;
  /** Open Graph image URL */
  ogImage: string;
  /** Custom domain for GitHub Pages deployment */
  customDomain: string;
}

// Export preset type (print/screen/ebook)
export type ExportPresetType = 'print' | 'screen' | 'ebook' | 'custom';

// PDF export options
export interface PdfExportOptions {
  includePageNumbers: boolean;
  headerText: string;
  footerText: string;
  preset: ExportPresetType;
  pageSize: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Export preset configuration
export interface ExportPreset {
  id: string;
  name: string;
  type: ExportPresetType;
  options: PdfExportOptions;
  isBuiltIn: boolean;
}

// History entry for undo/redo persistence
export interface HistoryEntry {
  /** The HTML content at this point in history */
  content: string;
  /** Timestamp when this entry was created */
  timestamp: number;
  /** Cursor position in the editor (0-1 percentage) */
  cursorPosition?: number;
}

// Version history entry for persisted document versions (from database)
export interface VersionHistoryEntry {
  /** Database ID for this version */
  id: number;
  /** Version number (increments per document) */
  versionNumber: number;
  /** HTML content at this version (may be null if using diffs) */
  content: string | null;
  /** ISO timestamp when version was saved */
  timestamp: string;
}

// Diff change types for version comparison
export interface DiffChange {
  /** Type of change: 'added', 'removed', or 'unchanged' */
  type: 'added' | 'removed' | 'unchanged';
  /** The text content of this change */
  value: string;
  /** Line number in the old text (for removed/unchanged) */
  oldLineNumber?: number;
  /** Line number in the new text (for added/unchanged) */
  newLineNumber?: number;
}

// Result of comparing two versions
export interface VersionDiffResult {
  /** Version number of the older version */
  oldVersion: number;
  /** Version number of the newer version */
  newVersion: number;
  /** Array of changes between the two versions */
  changes: DiffChange[];
  /** Statistics about the diff */
  stats: {
    /** Number of lines added */
    added: number;
    /** Number of lines removed */
    removed: number;
    /** Number of lines unchanged */
    unchanged: number;
  };
}

// History state for persistence
export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
}

// Crash recovery data
export interface CrashRecoveryData {
  /** Document URI this history belongs to */
  documentUri: string;
  /** Last known content */
  lastContent: string;
  /** History state */
  history: HistoryState;
  /** When this data was last saved */
  savedAt: number;
}

// Cloud storage provider types
export type CloudStorageProvider = 'none' | 's3' | 'cloudinary' | 'imgbb';

// S3 configuration
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
}

// Cloudinary configuration
export interface CloudinaryConfig {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
}

// ImgBB configuration
export interface ImgBBConfig {
  apiKey: string;
}

// Cloud storage configuration
export interface CloudStorageConfig {
  provider: CloudStorageProvider;
  s3: S3Config;
  cloudinary: CloudinaryConfig;
  imgbb: ImgBBConfig;
}

export interface HtmlySettings {
  defaultMode: EditorMode;
  showButtonLabels: boolean;
  autoHideToolbarInPreview: boolean;
  defaultFontSize: number;
  enableMarkdownShortcuts: boolean;
  splitScreenDirection: 'horizontal' | 'vertical';
  customTheme: {
    primaryColor: string;
  };
  cloudStorage: CloudStorageConfig;
  spellCheck: {
    enabled: boolean;
    customDictionary: string[];
  };
}

// Template types
export type TemplateCategory = 'blog' | 'product' | 'resume' | 'docs' | 'email';

// User template metadata
export interface UserTemplateMetadata {
  id: string;
  name: string;
  category: TemplateCategory;
  description?: string;
  thumbnail?: string;
  createdAt: number;
  modifiedAt: number;
}

// Snippet types
export type SnippetCategory = 'cards' | 'buttons' | 'navbars' | 'tables' | 'forms';

// User snippet metadata
export interface UserSnippetMetadata {
  id: string;
  name: string;
  category: SnippetCategory;
  description?: string;
  preview?: string;
  createdAt: number;
  modifiedAt: number;
}

// Project search result
export interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  matchText: string;
  contextBefore: string;
  contextAfter: string;
}

// Spell check suggestion
export interface SpellSuggestion {
  word: string;
  replacements: string[];
}

// Misspelled word with position
export interface MisspelledWord {
  word: string;
  start: number;
  end: number;
}

// Keybinding types
export interface Keybinding {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface KeybindingCommand {
  id: string;
  title: string;
  category: string;
  description?: string;
  keybinding: Keybinding;
  isOverridden?: boolean;
}

// Wiki link page types
export interface WikiPage {
  name: string;
  path?: string;
}

// Backlink info for backlinks panel
export interface BacklinkInfo {
  pageName: string;
  pagePath: string;
  preview: string;
  linkCount: number;
}

// Messages from extension → webview
export type ExtToWebMsg =
  | { type: 'init'; content: string; mode: EditorMode }
  | { type: 'contentChanged'; content: string }
  | { type: 'setMode'; mode: EditorMode }
  | { type: 'cycleMode' }
  | { type: 'theme'; isDark: boolean }
  | { type: 'dirty'; isDirty: boolean }
  | { type: 'readOnly'; enabled: boolean }
  | { type: 'settings'; settings: HtmlySettings }
  | { type: 'saveStatus'; status: SaveStatus }
  | { type: 'historyUpdate'; history: HistoryState }
  | { type: 'crashRecovery'; data: CrashRecoveryData }
  | { type: 'historyExported'; path: string }
  | { type: 'exportResponse'; success: boolean; filePath?: string; error?: string }
  | { type: 'exportPresets'; presets: ExportPreset[] }
  | { type: 'saveExportPresetResponse'; success: boolean; preset?: ExportPreset; error?: string }
  | { type: 'deleteExportPresetResponse'; success: boolean; error?: string }
  | { type: 'userTemplates'; templates: UserTemplateMetadata[] }
  | { type: 'saveTemplateResponse'; success: boolean; template?: UserTemplateMetadata; error?: string }
  | { type: 'deleteTemplateResponse'; success: boolean; error?: string }
  | { type: 'renameTemplateResponse'; success: boolean; template?: UserTemplateMetadata; error?: string }
  | { type: 'userSnippets'; snippets: UserSnippetMetadata[] }
  | { type: 'saveSnippetResponse'; success: boolean; snippet?: UserSnippetMetadata; error?: string }
  | { type: 'deleteSnippetResponse'; success: boolean; error?: string }
  | { type: 'snippetContentResponse'; id: string; success: boolean; content?: string; error?: string }
  | { type: 'projectSearchResults'; results: SearchResult[] }
  | { type: 'projectSearchError'; error: string }
  | { type: 'openFile'; filePath: string; line?: number; column?: number }
  | { type: 'showProjectSearch' }
  | { type: 'spellCheckSettings'; enabled: boolean; customDictionary: string[] }
  | { type: 'spellCheckSuggestions'; suggestions: SpellSuggestion[] }
  | { type: 'spellCheckMisspelledWords'; words: MisspelledWord[] }
  | { type: 'spellCheckWord'; word: string; suggestions: string[] }
  | { type: 'keybindingManager'; show: true }
  | { type: 'keybindingsList'; commands: KeybindingCommand[] }
  | { type: 'keybindingExportResponse'; success: boolean; filePath?: string; error?: string }
  | { type: 'keybindingImportResponse'; success: boolean; count?: number; error?: string }
  | { type: 'wikiPages'; pages: WikiPage[] }
  | { type: 'backlinks'; pageName: string; backlinks: BacklinkInfo[] }
  | { type: 'pageCreated'; pageName: string; pagePath: string }
  | { type: 'versionHistory'; versions: VersionHistoryEntry[] }
  | { type: 'versionRestored'; versionNumber: number; content: string }
  | { type: 'versionDiff'; diff: VersionDiffResult }
  | { type: 'versionDiffError'; error: string }
  | { type: 'runScript'; id: string; script: string };

// Messages from webview → extension
export type WebToExtMsg =
  | { type: 'ready' }
  | { type: 'contentUpdate'; content: string; immediate?: boolean }
  | { type: 'modeChanged'; mode: EditorMode }
  | { type: 'requestMode' }
  | { type: 'syncHistory'; history: HistoryState }
  | { type: 'selectiveUndo'; targetIndex: number }
  | { type: 'exportHistory' }
  | { type: 'exportRequest'; format: ExportFormat; content: string; options?: PdfExportOptions; seoSettings?: SeoSettings; siteOptions?: Partial<StaticSiteOptions> }
  | { type: 'loadExportPresets' }
  | { type: 'saveExportPreset'; preset: Omit<ExportPreset, 'id' | 'isBuiltIn'> }
  | { type: 'deleteExportPreset'; id: string }
  | { type: 'loadUserTemplates' }
  | { type: 'saveAsTemplate'; name: string; category: TemplateCategory; content: string; description?: string }
  | { type: 'deleteTemplate'; id: string }
  | { type: 'renameTemplate'; id: string; newName: string }
  | { type: 'loadUserSnippets' }
  | { type: 'saveAsSnippet'; name: string; category: SnippetCategory; html: string; description?: string; preview?: string }
  | { type: 'deleteSnippet'; id: string }
  | { type: 'loadSnippetContent'; id: string }
  | { type: 'projectSearch'; query: string; isRegex: boolean }
  | { type: 'openFile'; filePath: string; line?: number; column?: number }
  | { type: 'addToSpellDictionary'; word: string }
  | { type: 'removeFromSpellDictionary'; word: string }
  | { type: 'setSpellCheckEnabled'; enabled: boolean }
  | { type: 'requestSpellCheck'; content: string }
  | { type: 'requestSpellCheckWord'; word: string }
  | { type: 'loadKeybindings' }
  | { type: 'showKeybindingManager' }
  | { type: 'exportKeybindings' }
  | { type: 'importKeybindings' }
  | { type: 'setKeybindingOverride'; command: string; key: string; mac?: string }
  | { type: 'removeKeybindingOverride'; command: string }
  | { type: 'resetKeybindings' }
  | { type: 'requestBacklinks'; pageName: string }
  | { type: 'createPage'; pageName: string }
  | { type: 'openWikiLink'; pageName: string; existingPages: string[] }
  | { type: 'requestVersionHistory' }
  | { type: 'restoreVersion'; versionNumber: number }
  | { type: 'requestVersionDiff'; oldVersion: number; newVersion: number }
  // DIAGNOSTIC: webview console.log forwarded to the extension so the user
  // can see logs in View → Output → htmly-debug (no DevTools required).
  | { type: 'consoleLog'; level: 'log' | 'warn' | 'error' | 'info' | 'debug'; args: string[]; ts: number }
  | { type: 'scriptResult'; id: string; result: unknown; error?: string };
