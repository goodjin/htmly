export type EditorMode = 'wysiwyg' | 'source';

// Messages from extension → webview
export type ExtToWebMsg =
  | { type: 'init'; content: string; mode: EditorMode }
  | { type: 'contentChanged'; content: string }
  | { type: 'setMode'; mode: EditorMode }
  | { type: 'theme'; isDark: boolean };

// Messages from webview → extension
export type WebToExtMsg =
  | { type: 'ready' }
  | { type: 'contentUpdate'; content: string }
  | { type: 'modeChanged'; mode: EditorMode }
  | { type: 'requestMode' };
