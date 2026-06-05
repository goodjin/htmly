/**
 * Mock Webview API for unit tests
 * 
 * This module provides a mock of the VS Code Webview API surface
 * used by htmly, allowing unit tests to run without a VS Code environment.
 */
import { vi } from 'vitest';
import type { ExtToWebMsg, WebToExtMsg } from '../../src/shared/types';

export interface WebviewPanelMock {
  webview: {
    options: Record<string, unknown>;
    html: string;
    onDidReceiveMessage: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
    asWebviewUri: ReturnType<typeof vi.fn>;
    cspSource: string;
  };
  onDidChangeViewState: ReturnType<typeof vi.fn>;
  onDidDispose: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  viewType: string;
  title: string;
  active: boolean;
  visible: boolean;
}

export interface WebviewMock {
  postMessage: ReturnType<typeof vi.fn>;
  onDidReceiveMessage: ReturnType<typeof vi.fn>;
  asWebviewUri: ReturnType<typeof vi.fn>;
  html: string;
  options: Record<string, unknown>;
}

// Create a mock webview panel for testing
export function createWebviewPanelMock(): WebviewPanelMock {
  const onDidReceiveMessageEmitter = {
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  };

  const onDidChangeViewStateEmitter = {
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  };

  const onDidDisposeEmitter = {
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    webview: {
      options: {},
      html: '',
      onDidReceiveMessage: vi.fn().mockImplementation((callback: (msg: WebToExtMsg) => void) => {
        onDidReceiveMessageEmitter.event.mockImplementation(callback);
        return { dispose: vi.fn() };
      }),
      postMessage: vi.fn().mockResolvedValue(true),
      asWebviewUri: vi.fn().mockImplementation((uri: { fsPath: string }) => uri.fsPath),
      cspSource: 'file:',
    },
    onDidChangeViewState: vi.fn().mockImplementation((callback: (e: { webviewPanel: WebviewPanelMock }) => void) => {
      onDidChangeViewStateEmitter.event.mockImplementation(callback);
      return { dispose: vi.fn() };
    }),
    onDidDispose: vi.fn().mockImplementation((callback: () => void) => {
      onDidDisposeEmitter.event.mockImplementation(callback);
      return { dispose: vi.fn() };
    }),
    dispose: vi.fn().mockImplementation(() => {
      onDidDisposeEmitter.fire();
    }),
    show: vi.fn(),
    viewType: 'htmly.editor',
    title: 'Htmly Editor',
    active: true,
    visible: true,
  };
}

// Create a standalone webview mock
export function createWebviewMock(): WebviewMock {
  return {
    options: {},
    html: '',
    postMessage: vi.fn().mockResolvedValue(true),
    onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    asWebviewUri: vi.fn().mockImplementation((uri: { fsPath: string }) => uri.fsPath),
  };
}

// Simulate sending a message from extension to webview
export function sendMessageToWebview(panel: WebviewPanelMock, message: ExtToWebMsg): void {
  panel.webview.onDidReceiveMessage && 
    (panel.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>).mock.calls.forEach(([callback]) => {
      if (typeof callback === 'function') {
        callback(message);
      }
    });
}

// Simulate sending a message from webview to extension
export function sendMessageToExtension(panel: WebviewPanelMock, message: WebToExtMsg): Promise<boolean> {
  return panel.webview.postMessage(message) as Promise<boolean>;
}

// Helper to create mock messages
export function createMockExtToWebMessage(type: ExtToWebMsg['type'], extra: Partial<ExtToWebMsg> = {}): ExtToWebMsg {
  const baseMessages: Record<string, ExtToWebMsg> = {
    init: { type: 'init', content: '<p>Test</p>', mode: 'wysiwyg' },
    contentChanged: { type: 'contentChanged', content: '<p>Changed</p>' },
    setMode: { type: 'setMode', mode: 'source' },
    cycleMode: { type: 'cycleMode' },
    theme: { type: 'theme', isDark: true },
    dirty: { type: 'dirty', isDirty: true },
    readOnly: { type: 'readOnly', enabled: false },
    settings: { type: 'settings', settings: {
      defaultMode: 'wysiwyg',
      showButtonLabels: true,
      autoHideToolbarInPreview: true,
      defaultFontSize: 14,
      enableMarkdownShortcuts: true,
      splitScreenDirection: 'horizontal',
      customTheme: { primaryColor: '#0e639c' },
      cloudStorage: { provider: 'none', s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' }, cloudinary: { apiKey: '', apiSecret: '', cloudName: '' }, imgbb: { apiKey: '' } },
      spellCheck: { enabled: true, customDictionary: [] },
    }},
    saveStatus: { type: 'saveStatus', status: 'saved' },
    wikiPages: { type: 'wikiPages', pages: [] },
    backlinks: { type: 'backlinks', pageName: 'Test', backlinks: [] },
    pageCreated: { type: 'pageCreated', pageName: 'NewPage', pagePath: '/workspace/NewPage.html' },
  };
  
  return { ...baseMessages[type], ...extra } as ExtToWebMsg;
}

export function createMockWebToExtMessage(type: WebToExtMsg['type'], extra: Partial<WebToExtMsg> = {}): WebToExtMsg {
  const baseMessages: Record<string, WebToExtMsg> = {
    ready: { type: 'ready' },
    contentUpdate: { type: 'contentUpdate', content: '<p>Test</p>' },
    modeChanged: { type: 'modeChanged', mode: 'source' },
    requestMode: { type: 'requestMode' },
    syncHistory: { type: 'syncHistory', history: { entries: [], currentIndex: -1 } },
    exportRequest: { type: 'exportRequest', format: 'pdf', content: '<p>Test</p>' },
    projectSearch: { type: 'projectSearch', query: 'test', isRegex: false },
    requestBacklinks: { type: 'requestBacklinks', pageName: 'Test' },
    createPage: { type: 'createPage', pageName: 'NewPage' },
    openWikiLink: { type: 'openWikiLink', pageName: 'About', existingPages: ['Home', 'About', 'Contact'] },
  };
  
  return { ...baseMessages[type], ...extra } as WebToExtMsg;
}
