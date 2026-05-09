export type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'split';

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
  | { type: 'settings'; settings: HtmlySettings };

// Messages from webview → extension
export type WebToExtMsg =
  | { type: 'ready' }
  | { type: 'contentUpdate'; content: string }
  | { type: 'modeChanged'; mode: EditorMode }
  | { type: 'requestMode' };
