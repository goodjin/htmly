export type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'split';

// Save status for the toolbar indicator
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  | { type: 'saveStatus'; status: SaveStatus };

// Messages from webview → extension
export type WebToExtMsg =
  | { type: 'ready' }
  | { type: 'contentUpdate'; content: string; immediate?: boolean }
  | { type: 'modeChanged'; mode: EditorMode }
  | { type: 'requestMode' };
