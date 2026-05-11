export type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'split';

// Save status for the toolbar indicator
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Export format options
export type ExportFormat = 'pdf' | 'markdown' | 'plaintext' | 'embedded';

// History entry for undo/redo persistence
export interface HistoryEntry {
  /** The HTML content at this point in history */
  content: string;
  /** Timestamp when this entry was created */
  timestamp: number;
  /** Cursor position in the editor (0-1 percentage) */
  cursorPosition?: number;
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
  | { type: 'userTemplates'; templates: UserTemplateMetadata[] }
  | { type: 'saveTemplateResponse'; success: boolean; template?: UserTemplateMetadata; error?: string }
  | { type: 'deleteTemplateResponse'; success: boolean; error?: string }
  | { type: 'renameTemplateResponse'; success: boolean; template?: UserTemplateMetadata; error?: string };

// Messages from webview → extension
export type WebToExtMsg =
  | { type: 'ready' }
  | { type: 'contentUpdate'; content: string; immediate?: boolean }
  | { type: 'modeChanged'; mode: EditorMode }
  | { type: 'requestMode' }
  | { type: 'syncHistory'; history: HistoryState }
  | { type: 'selectiveUndo'; targetIndex: number }
  | { type: 'exportHistory' }
  | { type: 'exportRequest'; format: ExportFormat; content: string }
  | { type: 'loadUserTemplates' }
  | { type: 'saveAsTemplate'; name: string; category: TemplateCategory; content: string; description?: string }
  | { type: 'deleteTemplate'; id: string }
  | { type: 'renameTemplate'; id: string; newName: string };
