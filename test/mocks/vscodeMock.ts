/**
 * Mock VS Code API for unit tests
 * 
 * This module provides a comprehensive mock of the VS Code API surface
 * used by htmly, allowing unit tests to run without a VS Code environment.
 */
import { vi } from 'vitest';
import type { EditorMode, HtmlySettings, HistoryState, WikiPage, BacklinkInfo } from '../../src/shared/types';

export interface VscodeMock {
  workspace: {
    getConfiguration: ReturnType<typeof vi.fn>;
    fs: {
      readFile: ReturnType<typeof vi.fn>;
      writeFile: ReturnType<typeof vi.fn>;
      createDirectory: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      copy: ReturnType<typeof vi.fn>;
      readDirectory: ReturnType<typeof vi.fn>;
    };
    onDidChangeTextDocument: ReturnType<typeof vi.fn>;
    onDidSaveTextDocument: ReturnType<typeof vi.fn>;
    onDidChangeConfiguration: ReturnType<typeof vi.fn>;
    textDocuments: Array<{
      uri: { fsPath: string };
      getText: () => string;
      isDirty: boolean;
      fileName: string;
    }>;
  };
  window: {
    activeColorTheme: { kind: 1 | 2 | 3 };
    onDidChangeActiveColorTheme: ReturnType<typeof vi.fn>;
    showWarningMessage: ReturnType<typeof vi.fn>;
    showInformationMessage: ReturnType<typeof vi.fn>;
    showErrorMessage: ReturnType<typeof vi.fn>;
    showQuickPick: ReturnType<typeof vi.fn>;
    createStatusBarItem: ReturnType<typeof vi.fn>;
    createWebviewPanel: ReturnType<typeof vi.fn>;
    withProgress: ReturnType<typeof vi.fn>;
  };
  commands: {
    registerCommand: ReturnType<typeof vi.fn>;
    executeCommand: ReturnType<typeof vi.fn>;
    getCommands: ReturnType<typeof vi.fn>;
  };
  Disposable: {
    from: ReturnType<typeof vi.fn>;
    prototype: {
      dispose: ReturnType<typeof vi.fn>;
    };
  };
  EventEmitter: ReturnType<typeof vi.fn>;
  Uri: {
    file: (path: string) => { fsPath: string; scheme: string };
    parse: (uri: string) => { fsPath: string; scheme: string };
    joinPath: ReturnType<typeof vi.fn>;
  };
  ConfigurationTarget: {
    Global: 1;
    Workspace: 2;
    WorkspaceFolder: 3;
  };
  ColorThemeKind: {
    Light: 1;
    Dark: 2;
    HighContrast: 3;
  };
}

// Mock VS Code API for unit tests
export function createVscodeMock(): VscodeMock {
  return {
    workspace: {
      getConfiguration: vi.fn().mockReturnValue({
        get: vi.fn(),
        update: vi.fn(),
        has: vi.fn().mockReturnValue(false),
      }),
      fs: {
        readFile: vi.fn().mockResolvedValue(new Uint8Array()),
        writeFile: vi.fn().mockResolvedValue(undefined),
        createDirectory: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        copy: vi.fn().mockResolvedValue(undefined),
        readDirectory: vi.fn().mockResolvedValue([]),
      },
      onDidChangeTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidChangeConfiguration: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      textDocuments: [],
    },
    window: {
      activeColorTheme: { kind: 2 as const }, // Dark theme by default
      onDidChangeActiveColorTheme: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      showWarningMessage: vi.fn().mockResolvedValue(undefined),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
      showErrorMessage: vi.fn().mockResolvedValue(undefined),
      showQuickPick: vi.fn().mockResolvedValue(undefined),
      createStatusBarItem: vi.fn().mockReturnValue({
        text: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
      }),
      createWebviewPanel: vi.fn().mockReturnValue({
        webview: {
          options: {},
          html: '',
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
          postMessage: vi.fn().mockResolvedValue(true),
        },
        onDidChangeViewState: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
        show: vi.fn(),
      }),
      withProgress: vi.fn().mockResolvedValue(undefined),
    },
    commands: {
      registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      executeCommand: vi.fn().mockResolvedValue(undefined),
      getCommands: vi.fn().mockResolvedValue([]),
    },
    Disposable: {
      from: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      prototype: {
        dispose: vi.fn(),
      },
    },
    EventEmitter: vi.fn().mockImplementation(() => ({
      event: vi.fn(),
      fire: vi.fn(),
      dispose: vi.fn(),
    })),
    Uri: {
      file: (path: string) => ({ fsPath: path, scheme: 'file' }),
      parse: (uri: string) => ({ fsPath: uri, scheme: 'file' }),
      joinPath: vi.fn().mockImplementation((base, ...segments) => ({
        fsPath: [base.fsPath || base, ...segments].join('/'),
        scheme: 'file',
      })),
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    ColorThemeKind: {
      Light: 1,
      Dark: 2,
      HighContrast: 3,
    },
  };
}

// Mock data factories for common test scenarios
export function createMockDocument(uri: string, content: string) {
  return {
    uri: { fsPath: uri },
    getText: () => content,
    isDirty: false,
    fileName: uri.split('/').pop() || 'untitled.html',
  };
}

export function createMockWorkspaceFolder(name: string, path: string) {
  return { name, uri: { fsPath: path } };
}

export function createMockSettings(overrides: Partial<HtmlySettings> = {}): HtmlySettings {
  return {
    defaultMode: 'wysiwyg' as EditorMode,
    showButtonLabels: true,
    autoHideToolbarInPreview: true,
    defaultFontSize: 14,
    enableMarkdownShortcuts: true,
    splitScreenDirection: 'horizontal',
    customTheme: { primaryColor: '#0e639c' },
    cloudStorage: {
      provider: 'none',
      s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
      cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
      imgbb: { apiKey: '' },
    },
    spellCheck: {
      enabled: true,
      customDictionary: [],
    },
    ...overrides,
  };
}

export function createMockHistoryState(entries: Array<{ content: string; timestamp: number }> = []): HistoryState {
  return {
    entries: entries.length > 0 ? entries : [
      { content: '<p>Initial content</p>', timestamp: Date.now() - 1000 },
      { content: '<p>Modified content</p>', timestamp: Date.now() },
    ],
    currentIndex: entries.length > 0 ? entries.length - 1 : 1,
  };
}

export function createMockWikiPages(): WikiPage[] {
  return [
    { name: 'Home', path: '/workspace/Home.html' },
    { name: 'About', path: '/workspace/About.html' },
    { name: 'Contact', path: '/workspace/Contact.html' },
  ];
}

export function createMockBacklinks(): BacklinkInfo[] {
  return [
    { pageName: 'About', pagePath: '/workspace/Home.html', preview: '...Visit our [[About]] page...', linkCount: 1 },
    { pageName: 'Home', pagePath: '/workspace/Contact.html', preview: '...Back to [[Home]]...', linkCount: 2 },
  ];
}
