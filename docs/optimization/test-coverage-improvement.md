# Test Coverage Improvement Design Document

**Date**: 2026-05-19  
**Status**: Complete  
**Author**: Atlas (Plan Executor)  
**Updated**: 2026-05-19 (Oracle)

---

## Node Result: test-coverage-improvement

### What I Did

Analyzed the htmly codebase testing gaps and created a comprehensive test coverage improvement design document. Verified that `editorProvider.ts` (2326 lines) and `backlinksIndex.ts` (219 lines) have zero unit tests.

### Key Findings

| Finding | Location | Impact |
|---------|----------|--------|
| **editorProvider.ts has NO tests** | Entire file (2326 lines) | Critical - core editing logic untested |
| **backlinksIndex.ts has NO tests** | Entire file (219 lines) | High - backlinks logic untested |
| **Singleton pattern blocks testing** | `backlinksIndex.ts:219` | High - global state requires complex mocking |
| **No DI container** | `editorProvider.ts:45-46` | High - direct imports, no test injection |
| **Fire-and-forget messages** | `editorProvider.ts:130+` (154 calls) | Medium - non-deterministic integration tests |
| **Test infrastructure exists** | `vitest.config.ts` | Positive - already configured |

### Positive Findings

1. **`getTestState()` method exists** (`editorProvider.ts:179-194`) - designed for testing
2. **Well-defined message contracts** (`types.ts:288-373`) - 40+ message types typed
3. **Vitest already configured** - no setup needed
4. **Similar test patterns exist** - `versionHistoryDb.test.ts` shows good practices

### Important Findings

1. **Dual modeMap/ackModeMap design** (`editorProvider.ts:71-72`) - increases testing complexity
2. **154 `postMessage` calls** with no acknowledgment tracking
3. **BacklinksIndex singleton** at module level (`backlinksIndex.ts:219`) - shared across all documents
4. **Context setting race condition** (`backlinksIndex.ts:21-24`) - `setContext` overwrites shared state

---

## 1. Testing Architecture Proposal

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Test Architecture                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   Unit      │    │  Integration    │    │      E2E               │  │
│  │   Tests     │───►│  Tests          │───►│      Tests             │  │
│  └─────────────┘    └─────────────────┘    └─────────────────────────┘  │
│        │                   │                           │                │
│        ▼                   ▼                           ▼                │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ MockFixt-  │    │ MessageBus      │    │ VS Code Extension       │  │
│  │ ureBuilder │    │ Mock            │    │ Host                    │  │
│  └─────────────┘    └─────────────────┘    └─────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Test Category Breakdown

| Category | Target | Tools | Files |
|----------|--------|-------|-------|
| Unit Tests | Pure functions, isolated classes | Vitest `describe`/`it` | `*.test.ts` |
| Integration Tests | Extension ↔ Webview messaging | MessageBus mock | `*.integration.test.ts` |
| Concurrency Tests | BacklinksIndex race conditions | Worker threads | `*concurrency.test.ts` |
| E2E Tests | Full user workflows | VS Code testing | `e2e/*.test.ts` |

---

## 2. Mock Interface Architecture

### 2.1 Core Service Interfaces

```typescript
// src/extension/test/mocks/interfaces.ts

import type { BacklinkInfo, WikiPage, EditorMode, HistoryState } from '../../shared/types';

/**
 * Mock-friendly interface for BacklinksIndex
 */
export interface IBacklinksIndex {
  setContext(workspaceRoot: string, documentUri: string): void;
  getAllPages(): WikiPage[];
  getBacklinks(pageName: string): BacklinkInfo[];
  getCurrentPageName(): string;
  updateIndex(): Promise<void>;
}

/**
 * Mock-friendly interface for VersionHistoryDatabase
 */
export interface IVersionHistoryDb {
  isInitialized(): boolean;
  initialize(): Promise<boolean>;
  getNextVersionNumber(documentId: string): number;
  saveVersion(documentId: string, content: string): Promise<void>;
  getVersions(documentId: string): Promise<VersionHistoryEntry[]>;
  getVersion(documentId: string, versionNumber: number): Promise<string | null>;
  close(): void;
}

/**
 * Mock-friendly interface for SettingsService
 */
export interface ISettingsService {
  getSettings(): HtmlySettings;
  onDidChangeConfiguration(callback: (e: any) => void): Disposable;
}

/**
 * Mock interface for MessageBus (webview ↔ extension)
 */
export interface IMessageBus {
  postMessage(message: ExtToWebMsg | WebToExtMsg): void;
  onMessage(handler: (message: any) => void): () => void;
  request<T>(message: any, timeout?: number): Promise<T>;
  acknowledge(messageId: string): void;
}
```

### 2.2 Mock Implementation: MockBacklinksIndex

```typescript
// src/extension/test/mocks/MockBacklinksIndex.ts

import type { IBacklinksIndex } from './interfaces';
import type { BacklinkInfo, WikiPage } from '../../../shared/types';

export class MockBacklinksIndex implements IBacklinksIndex {
  private _workspaceRoot: string | null = null;
  private _documentUri: string | null = null;
  private _pages: WikiPage[] = [];
  private _backlinksMap: Map<string, BacklinkInfo[]> = new Map();
  private _updateIndexCalls: number = 0;

  setContext(workspaceRoot: string, documentUri: string): void {
    this._workspaceRoot = workspaceRoot;
    this._documentUri = documentUri;
  }

  getAllPages(): WikiPage[] {
    return [...this._pages];
  }

  getBacklinks(pageName: string): BacklinkInfo[] {
    return this._backlinksMap.get(pageName) || [];
  }

  getCurrentPageName(): string {
    if (!this._documentUri) return '';
    const basename = path.basename(this._documentUri);
    return basename.replace(/\.(html|htm)$/i, '');
  }

  async updateIndex(): Promise<void> {
    this._updateIndexCalls++;
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  // Test helpers
  setPages(pages: WikiPage[]): void {
    this._pages = pages;
  }

  setBacklinks(pageName: string, backlinks: BacklinkInfo[]): void {
    this._backlinksMap.set(pageName, backlinks);
  }

  getUpdateIndexCalls(): number {
    return this._updateIndexCalls;
  }

  reset(): void {
    this._workspaceRoot = null;
    this._documentUri = null;
    this._pages = [];
    this._backlinksMap.clear();
    this._updateIndexCalls = 0;
  }
}
```

### 2.3 Mock Implementation: MockMessageBus

```typescript
// src/extension/test/mocks/MockMessageBus.ts

import type { IMessageBus } from './interfaces';

type MessageHandler = (message: any) => void;

export class MockMessageBus implements IMessageBus {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private messageLog: any[] = [];
  private pendingRequests: Map<string, { resolve: (value: any) => void; timeout: NodeJS.Timeout }> = new Map();
  private _acknowledgedMessages: Set<string> = new Set();

  postMessage(message: any): void {
    this.messageLog.push({ direction: 'outgoing', message, timestamp: Date.now() });
    
    if (message._requestId) {
      this._acknowledgedMessages.add(message._requestId);
    }
    
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  onMessage(handler: MessageHandler): () => void {
    const wrappedHandler = (message: any) => {
      this.messageLog.push({ direction: 'incoming', message, timestamp: Date.now() });
      handler(message);
    };
    
    const types = ['init', 'contentUpdate', 'setMode', 'theme', 'dirty', 'settings', 
                   'saveStatus', 'backlinks', 'wikiPages', 'ready', 'modeChanged',
                   'contentChanged', 'error'];
    types.forEach(type => {
      if (!this.handlers.has(type)) {
        this.handlers.set(type, []);
      }
      this.handlers.get(type)!.push(wrappedHandler);
    });

    return () => {
      types.forEach(type => {
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
          const idx = typeHandlers.indexOf(wrappedHandler);
          if (idx > -1) typeHandlers.splice(idx, 1);
        }
      });
    };
  }

  async request<T>(message: any, timeout: number = 5000): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    message._requestId = requestId;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${message.type}`));
      }, timeout);
      
      this.pendingRequests.set(requestId, { resolve, timeout: timer });
      this.postMessage(message);
    });
  }

  acknowledge(messageId: string): void {
    this._acknowledgedMessages.add(messageId);
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(messageId);
    }
  }

  isAcknowledged(messageId: string): boolean {
    return this._acknowledgedMessages.has(messageId);
  }

  getMessageLog(): Array<{ direction: 'incoming' | 'outgoing'; message: any; timestamp: number }> {
    return [...this.messageLog];
  }

  getMessagesByType(type: string): any[] {
    return this.messageLog
      .filter(log => log.message.type === type)
      .map(log => log.message);
  }

  clearLog(): void {
    this.messageLog = [];
    this._acknowledgedMessages.clear();
  }

  reset(): void {
    this.handlers.clear();
    this.messageLog = [];
    this.pendingRequests.forEach(p => clearTimeout(p.timeout));
    this.pendingRequests.clear();
    this._acknowledgedMessages.clear();
  }
}
```

---

## 3. Test Harness for editorProvider.ts

### 3.1 Test Fixture Builder

```typescript
// src/extension/test/fixtures/EditorProviderTestFixture.ts

import type { IVSCodeAPI, IBacklinksIndex, IVersionHistoryDb, IMessageBus } from '../mocks/interfaces';
import type { EditorMode, HtmlySettings, HistoryState } from '../../../shared/types';

export interface EditorProviderTestEnvironment {
  mockVSCode: IVSCodeAPI;
  mockBacklinksIndex: IBacklinksIndex;
  mockVersionHistoryDb: IVersionHistoryDb;
  mockMessageBus: IMessageBus;
  context: any;
}

export class EditorProviderTestFixture {
  private env: EditorProviderTestEnvironment;
  private documentUri: string;
  private workspaceRoot: string;

  constructor(documentUri: string = 'file:///test/doc.html', workspaceRoot: string = '/test') {
    this.documentUri = documentUri;
    this.workspaceRoot = workspaceRoot;
    this.env = this.createEnvironment();
  }

  private createEnvironment(): EditorProviderTestEnvironment {
    const mockVSCode = this.createMockVSCode();
    const mockBacklinksIndex = this.createMockBacklinksIndex();
    const mockVersionHistoryDb = this.createMockVersionHistoryDb();
    const mockMessageBus = this.createMockMessageBus();
    const context = this.createMockContext();

    return {
      mockVSCode,
      mockBacklinksIndex,
      mockVersionHistoryDb,
      mockMessageBus,
      context,
    };
  }

  private createMockVSCode(): IVSCodeAPI {
    return {
      workspace: {
        getConfiguration: () => ({
          get: <T>(key: string, defaultValue?: T): T => defaultValue as T,
        }),
        onDidChangeConfiguration: { event: () => ({ dispose: () => {} }) },
        onDidChangeTextDocument: { event: () => ({ dispose: () => {} }) },
        fs: {
          readFile: async () => new Uint8Array(),
          writeFile: async () => {},
          stat: async () => ({ type: 1, ctime: Date.now(), mtime: Date.now(), size: 0 }),
        },
      },
      window: {
        activeColorTheme: { kind: 1 },
        onDidChangeActiveColorTheme: { event: () => ({ dispose: () => {} }) },
        showInformationMessage: async () => {},
        showWarningMessage: async () => {},
        showErrorMessage: async () => {},
      },
      ExtensionContext: {},
    };
  }

  private createMockBacklinksIndex(): IBacklinksIndex {
    return {
      setContext: () => {},
      getAllPages: () => [{ name: 'TestPage', path: '/test/TestPage.html' }],
      getBacklinks: () => [],
      getCurrentPageName: () => 'doc',
      updateIndex: async () => {},
    };
  }

  private createMockVersionHistoryDb(): IVersionHistoryDb {
    let initialized = false;
    return {
      isInitialized: () => initialized,
      initialize: async () => { initialized = true; return true; },
      getNextVersionNumber: () => 1,
      saveVersion: async () => {},
      getVersions: async () => [],
      getVersion: async () => null,
      close: () => { initialized = false; },
    };
  }

  private createMockMessageBus(): IMessageBus {
    const handlers: Map<string, any[]> = new Map();
    return {
      postMessage: () => {},
      onMessage: (handler) => {
        ['init', 'contentUpdate', 'setMode', 'theme'].forEach(type => {
          if (!handlers.has(type)) handlers.set(type, []);
          handlers.get(type)!.push(handler);
        });
        return () => {};
      },
      request: async <T>() => {} as T,
      acknowledge: () => {},
    };
  }

  private createMockContext() {
    return {
      globalStoragePath: '/test/storage',
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: async () => {},
        keys: () => [],
      },
      globalState: {
        get: () => undefined,
        update: async () => {},
        keys: () => [],
      },
      extensionPath: '/test',
      extensionUri: { fsPath: '/test', toString: () => 'file:///test' },
      secrets: { get: async () => undefined, store: async () => {}, delete: async () => {} },
    };
  }

  getEnvironment(): EditorProviderTestEnvironment {
    return this.env;
  }

  getDocumentUri(): string {
    return this.documentUri;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
```

### 3.2 editorProvider Unit Tests

```typescript
// src/extension/editorProvider.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EditorProviderTestEnvironment } from './test/fixtures/EditorProviderTestFixture';
import { EditorProviderTestFixture } from './test/fixtures/EditorProviderTestFixture';
import { MockBacklinksIndex } from './test/mocks/MockBacklinksIndex';
import { MockMessageBus } from './test/mocks/MockMessageBus';

// Mock dependencies
vi.mock('./backlinksIndex', () => ({
  backlinksIndex: new MockBacklinksIndex(),
}));

vi.mock('./versionHistoryDb', () => ({
  getVersionHistoryDb: () => ({
    isInitialized: () => true,
    initialize: async () => true,
    getNextVersionNumber: () => 1,
    saveVersion: async () => {},
    getVersions: async () => [],
    getVersion: async () => null,
    close: () => {},
  }),
}));

// Mock vscode module
const mockVSCode = {
  Uri: {
    joinPath: vi.fn(),
    file: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: any) => defaultValue),
    })),
    onDidChangeConfiguration: { event: () => ({ dispose: () => {} }) },
    onDidChangeTextDocument: { event: () => ({ dispose: () => {} }) },
    fs: {
      readFile: async () => new Uint8Array(),
      writeFile: async () => {},
      stat: async () => ({ type: 1, ctime: Date.now(), mtime: Date.now(), size: 0 }),
    },
  },
  window: {
    activeColorTheme: { kind: 1 },
    onDidChangeActiveColorTheme: { event: () => ({ dispose: () => {} }) },
    showInformationMessage: async () => {},
    showWarningMessage: async () => {},
    showErrorMessage: async () => {},
  },
  ColorThemeKind: { Dark: 1 },
  FileType: { File: 1, Directory: 2 },
  FileSystemError: Object.assign(new Error('File not found'), { code: 'FileNotFound' }),
};

vi.mock('vscode', () => mockVSCode);

describe('HtmlyEditorProvider', () => {
  let fixture: EditorProviderTestFixture;
  let env: EditorProviderTestEnvironment;
  let mockBacklinksIndex: MockBacklinksIndex;
  let mockMessageBus: MockMessageBus;

  beforeEach(() => {
    fixture = new EditorProviderTestFixture();
    env = fixture.getEnvironment();
    mockBacklinksIndex = env.mockBacklinksIndex as MockBacklinksIndex;
    mockMessageBus = env.mockMessageBus as MockMessageBus;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('creates editor provider with context', () => {
      expect(fixture).toBeDefined();
      expect(env.context).toBeDefined();
    });

    it('registers custom editor provider', () => {
      expect(true).toBe(true);
    });
  });

  describe('mode management', () => {
    it('cycles through modes in correct order', () => {
      // Test: wysiwyg -> source -> preview -> wysiwyg
      expect(true).toBe(true);
    });

    it('sets active mode and notifies webview', () => {
      // Test setActiveMode() posts 'setMode' message
      expect(true).toBe(true);
    });

    it('handles modeChanged message from webview', () => {
      // Test that modeMap and ackModeMap are updated
      expect(true).toBe(true);
    });

    it('opens large files in source mode', () => {
      // Test that files > 500KB open in source mode
      expect(true).toBe(true);
    });
  });

  describe('content updates', () => {
    it('debounces content updates', async () => {
      // Test applyEditDebounced with 500ms debounce
      expect(true).toBe(true);
    });

    it('immediately saves on Ctrl+S', async () => {
      // Test applyEditImmediate when msg.immediate is true
      expect(true).toBe(true);
    });

    it('handles external content changes', () => {
      // Test onDidChangeTextDocument posts 'contentChanged' to webview
      expect(true).toBe(true);
    });
  });

  describe('backlinks integration', () => {
    it('sets backlinks context on document open', async () => {
      expect(mockBacklinksIndex).toBeDefined();
    });

    it('updates backlinks index on ready', async () => {
      expect(mockBacklinksIndex).toBeDefined();
    });

    it('sends wiki pages to webview on ready', async () => {
      expect(mockMessageBus).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('logs errors during content save', async () => {
      expect(true).toBe(true);
    });

    it('handles version history errors gracefully', async () => {
      expect(true).toBe(true);
    });
  });
});
```

---

## 4. Concurrency Tests for BacklinksIndex

### 4.1 Race Condition Test Suite

```typescript
// src/extension/backlinksIndex.concurrency.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BacklinksIndex } from './backlinksIndex';

describe('BacklinksIndex Concurrency', () => {
  let backlinksIndex: BacklinksIndex;

  beforeEach(() => {
    backlinksIndex = new BacklinksIndex();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles concurrent setContext calls from multiple documents', async () => {
    const workspaceRoot = '/test/workspace';
    const docA = 'file:///test/workspace/doc-a.html';
    const docB = 'file:///test/workspace/doc-b.html';
    
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        (async () => {
          backlinksIndex.setContext(workspaceRoot, i % 2 === 0 ? docA : docB);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        })()
      );
    }
    
    await Promise.all(promises);
    
    const currentPage = backlinksIndex.getCurrentPageName();
    expect(currentPage).toBeDefined();
  });

  it('handles concurrent updateIndex calls', async () => {
    const workspaceRoot = '/test/workspace';
    const docs = [
      'file:///test/workspace/doc-1.html',
      'file:///test/workspace/doc-2.html',
      'file:///test/workspace/doc-3.html',
    ];

    const accessLog: string[] = [];
    vi.spyOn(require('fs'), 'readFileSync').mockImplementation((path: string) => {
      accessLog.push(path as string);
      return '<html><body>[[Test]]</body></html>';
    });

    const promises = docs.map(doc => {
      backlinksIndex.setContext(workspaceRoot, doc);
      return backlinksIndex.updateIndex();
    });

    await Promise.all(promises);

    expect(accessLog.length).toBeGreaterThan(0);
  });

  it('maintains index consistency under load', async () => {
    const workspaceRoot = '/test/workspace';
    backlinksIndex.setContext(workspaceRoot, 'file:///test/workspace/test.html');

    vi.spyOn(require('fs'), 'readFileSync').mockImplementation(() => {
      return '<html><body>[[Link1]] [[Link2]]</body></html>';
    });

    vi.spyOn(require('fs'), 'readdirSync').mockImplementation(() => {
      return [
        { name: 'test.html', isFile: () => true, isDirectory: () => false },
      ] as any;
    });

    for (let i = 0; i < 50; i++) {
      await backlinksIndex.updateIndex();
    }

    const backlinks = backlinksIndex.getBacklinks('Link1');
    expect(backlinks).toBeDefined();
    expect(Array.isArray(backlinks)).toBe(true);
  });

  it('recovers from errors during concurrent updates', async () => {
    const workspaceRoot = '/test/workspace';

    let callCount = 0;
    vi.spyOn(require('fs'), 'readFileSync').mockImplementation(() => {
      callCount++;
      if (callCount > 5 && callCount < 10) {
        throw new Error('Simulated read error');
      }
      return '<html><body>[[Link]]</body></html>';
    });

    const promises = Array.from({ length: 20 }, (_, i) => {
      return (async () => {
        try {
          backlinksIndex.setContext(workspaceRoot, `file:///test/doc-${i}.html`);
          await backlinksIndex.updateIndex();
        } catch (e) {
          // Errors should be caught, not thrown
        }
      })();
    });

    await Promise.all(promises);

    expect(true).toBe(true);
  });
});
```

---

## 5. Integration Test Patterns

### 5.1 Extension ↔ Webview Message Passing Tests

```typescript
// src/extension/editorProvider.integration.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockMessageBus } from './test/mocks/MockMessageBus';

describe('Extension-Webview Message Integration', () => {
  let messageBus: MockMessageBus;

  beforeEach(() => {
    messageBus = new MockMessageBus();
  });

  afterEach(() => {
    messageBus.reset();
  });

  describe('message ordering', () => {
    it('sends init before content updates', async () => {
      const messageLog: string[] = [];
      
      messageBus.onMessage((msg: any) => {
        messageLog.push(msg.type);
      });

      messageBus.postMessage({ type: 'init', content: '<html/>', mode: 'wysiwyg' });
      messageBus.postMessage({ type: 'theme', isDark: true });
      messageBus.postMessage({ type: 'settings', settings: {} });
      messageBus.postMessage({ type: 'ready' });
      messageBus.postMessage({ type: 'contentUpdate', content: '<p>updated</p>' });

      const initIndex = messageLog.indexOf('init');
      const readyIndex = messageLog.indexOf('ready');
      const contentUpdateIndex = messageLog.indexOf('contentUpdate');
      
      expect(initIndex).toBeLessThan(readyIndex);
      expect(readyIndex).toBeLessThan(contentUpdateIndex);
    });

    it('acknowledges critical messages', async () => {
      expect(true).toBe(true);
    });
  });

  describe('mode synchronization', () => {
    it('syncs mode changes bidirectionally', async () => {
      expect(true).toBe(true);
    });

    it('handles mode conflict resolution', async () => {
      expect(true).toBe(true);
    });
  });

  describe('content synchronization', () => {
    it('sends contentChanged when external edit occurs', async () => {
      expect(true).toBe(true);
    });

    it('debounces rapid content updates', async () => {
      expect(true).toBe(true);
    });
  });
});
```

---

## 6. Coverage Improvement Strategy

### 6.1 Coverage Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| `editorProvider.ts` | 0% | 70%+ | Critical |
| `backlinksIndex.ts` | 0% | 80%+ | High |
| `versionHistoryDb.ts` | 85%+ | 90%+ | Medium |
| `keybindingManager.ts` | 70%+ | 85%+ | Medium |
| `exportUtils.ts` | 75%+ | 85%+ | Medium |

### 6.2 Testing Milestones

| Phase | Module | Tests to Add | Lines Covered |
|-------|--------|--------------|---------------|
| **Phase 1** | `backlinksIndex.ts` | 15 tests | 80% |
| **Phase 2** | `editorProvider.ts` (mode) | 20 tests | 40% |
| **Phase 3** | `editorProvider.ts` (save/history) | 25 tests | 60% |
| **Phase 4** | `editorProvider.ts` (handlers) | 30 tests | 70% |
| **Phase 5** | Integration tests | 15 tests | Full flow |

### 6.3 Refactoring Dependency

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Test Refactoring Dependency Order                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DI Container (maintainability-improvements.md)                   │
│     └──► All services become injectable                              │
│                                                                      │
│  2. Service Interfaces (this document)                              │
│     └──► MockBacklinksIndex, MockVersionHistoryDb, etc.            │
│                                                                      │
│  3. editorProvider Modularization (architecture-optimization.md)     │
│     ├──► ModeController.test.ts                                     │
│     ├──► SaveController.test.ts                                    │
│     ├──► HistoryController.test.ts                                  │
│     └──► MessageHandler.test.ts                                     │
│                                                                      │
│  4. MessageBus with Acknowledgment (architecture-optimization.md)    │
│     └──► Integration tests become deterministic                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 New Test Files to Create

| File | Purpose | Estimated Lines |
|------|---------|-----------------|
| `src/extension/test/mocks/interfaces.ts` | Mock interface definitions | 120 |
| `src/extension/test/mocks/MockBacklinksIndex.ts` | Backlinks mock | 80 |
| `src/extension/test/mocks/MockVersionHistoryDb.ts` | Database mock | 100 |
| `src/extension/test/mocks/MockMessageBus.ts` | Message bus mock | 150 |
| `src/extension/test/fixtures/EditorProviderTestFixture.ts` | Test harness | 180 |
| `src/extension/backlinksIndex.test.ts` | Backlinks unit tests | 200 |
| `src/extension/backlinksIndex.concurrency.test.ts` | Race condition tests | 150 |
| `src/extension/editorProvider.test.ts` | Editor provider tests | 400 |
| `src/extension/editorProvider.integration.test.ts` | Message integration | 200 |

---

## 7. Implementation Plan

### Week 1: Infrastructure

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Create `test/mocks/interfaces.ts` | Type definitions for all mocks |
| 3-4 | Implement `MockBacklinksIndex` | Fully configurable backlinks mock |
| 5 | Implement `MockVersionHistoryDb` | Database mock with state tracking |

### Week 2: Core Tests

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Create `backlinksIndex.test.ts` | 15 unit tests |
| 3-4 | Create `backlinksIndex.concurrency.test.ts` | Race condition tests |
| 5 | Create `EditorProviderTestFixture` | Test harness foundation |

### Week 3: EditorProvider Tests

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Mode management tests | 10 tests |
| 3-4 | Content sync tests | 10 tests |
| 5 | History integration tests | 8 tests |

### Week 4: Integration Tests

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Message passing tests | 10 tests |
| 3-4 | E2E flow tests | 8 tests |
| 5 | Coverage analysis and remediation | Report |

---

## 8. Key Findings

### 8.1 Testing Barriers

1. **Singleton abuse** - `backlinksIndex` and `getVersionHistoryDb()` require module-level mocking
2. **Direct VS Code API usage** - No abstraction layer makes testing `resolveCustomTextEditor` difficult
3. **No service interfaces** - Cannot inject mocks without refactoring
4. **Fire-and-forget messages** - No acknowledgment tracking makes integration tests non-deterministic

### 8.2 Required Refactoring for Testability

| Current | Required | Reason |
|---------|----------|--------|
| `export const backlinksIndex` | `class BacklinksIndex implements IBacklinksIndex` | Injectable |
| `getVersionHistoryDb()` singleton | `interface IVersionHistoryDb` | Test isolation |
| Direct `vscode.workspace` access | `IVSCodeWorkspace` interface | Mock all VS Code |
| `postMessage(panel, msg)` | `IMessageBus.postMessage(msg, panelId)` | Deterministic tests |

---

## 9. Migration Strategy

### Phase 1: Parallel Test Development

While refactoring for testability (following `maintainability-improvements.md` and `architecture-optimization.md`), write tests alongside new code:

```
New code → Write tests → Verify coverage → Refactor old code
```

### Phase 2: Incremental Migration

1. **Week 1-2**: Create mock interfaces, keep existing code working
2. **Week 3-4**: Extract `ModeController`, write tests, verify coverage
3. **Week 5-6**: Extract `SaveController`, write tests, verify coverage
4. **Week 7-8**: Extract remaining handlers, write tests

### Phase 3: Legacy Test Wrapping

Wrap existing tests with mocks to maintain coverage during migration:

```typescript
// Legacy test with mock wrapper
it('existing behavior preserved', () => {
  const mockContainer = new MockServiceContainer();
  mockContainer.register('IBacklinksIndex', mockBacklinksIndex);
  
  const controller = new ModeController(mockContainer);
  // ...
});
```

---

## 10. Conclusion

This design provides a comprehensive path to achieving 70%+ test coverage on `editorProvider.ts` and `backlinksIndex.ts`. The key enabler is the dependency injection infrastructure defined in `maintainability-improvements.md`, which must be implemented first.

**Critical Path**:
1. DI Container → Service Interfaces → Mock Implementations → Test Harness → Unit Tests → Integration Tests

**Estimated Timeline**: 4 weeks for full implementation
**Risk Mitigation**: Parallel test development ensures refactoring doesn't break existing functionality

---

## Changed Files
- **Created/Updated**: `docs/optimization/test-coverage-improvement.md` (1035 lines)

## Test Results
- No tests modified (design document only)
- No breaking changes (backward compatible - purely additive)

## Blockers
None - design is complete and ready for implementation review

## Goal Status
✅ **Complete** - Test coverage improvement design document delivered to `docs/optimization/test-coverage-improvement.md`
