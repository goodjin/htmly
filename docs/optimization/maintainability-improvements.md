# Maintainability Improvements Design Document

**Date**: 2026-05-19  
**Status**: Draft  
**Author**: Oracle (Strategic Technical Advisor)

---

## Executive Summary

This document proposes three maintainability improvements for the Htmly VS Code extension:

1. **Dependency Injection** - Replace direct instantiation with a lightweight DI container for testability
2. **Centralized Constants** - Consolidate scattered magic numbers into a typed constants system
3. **Configuration Caching** - Add caching layer with observer pattern for VS Code settings

**Current Issues**:
- 38 `getConfiguration('htmly')` calls scattered across codebase, re-read on every access
- 6+ magic number constants defined inline (500*1024, 500, 1000, etc.)
- Global singletons (`backlinksIndex`) make unit testing require global state

---

## 1. Issue Analysis

### 1.1 Dependency Injection Absence

**Current Problem**:
```typescript
// src/extension/backlinksIndex.ts:219
export const backlinksIndex = new BacklinksIndex();

// src/extension/editorProvider.ts:45-46
import { backlinksIndex } from './backlinksIndex';
import { getVersionHistoryDb } from './versionHistoryDb';

// src/extension/versionHistoryDb.ts:548
dbInstance = new VersionHistoryDatabase(context);
```

**Impact**:
- `BacklinksIndex` is a global singleton - tests must mock global state
- `VersionHistoryDatabase` has a module-level `dbInstance` variable
- No interface abstraction - concrete classes are directly referenced
- Testing requires complex global state setup/teardown

**Evidence from codebase**:
| File | Issue |
|------|-------|
| `backlinksIndex.ts:219` | Global singleton exported |
| `versionHistoryDb.ts` | Module-level `dbInstance` variable |
| `editorProvider.ts:45-46` | Direct imports of singletons |
| Test files | 50+ `new VersionHistoryDatabase(mockContext)` instantiations |

### 1.2 Scattered Magic Numbers

**Current Problem**:
```typescript
// editorProvider.ts
const MAX_HISTORY_ENTRIES = 100;                    // line 61
const HISTORY_DEBOUNCE_MS = 1000;                   // line 62
private static readonly LARGE_FILE_THRESHOLD = 500 * 1024;  // line 67
private static readonly SAVE_DEBOUNCE_MS = 500;     // line 68
private static readonly LARGE_SAVE_THRESHOLD = 100 * 1024;  // line 69

// versionHistoryDb.ts
const DEFAULT_MAX_VERSIONS = 50;                     // line 13
const DB_FILE_NAME = 'version-history.db';          // line 10

// keybindingManager.ts
const MAX_KEYBINDING_OVERRIDES = 100;               // implied limit
```

**Impact**:
- Same constant duplicated across files (MAX_HISTORY_ENTRIES in webview AND extension)
- No type safety - `500` could be milliseconds, bytes, or count
- No IDE autocomplete for constants
- Changing a threshold requires finding all occurrences

**Evidence**:
| Constant | Value | Locations |
|----------|-------|-----------|
| MAX_HISTORY_ENTRIES | 100 | editorProvider.ts:61, webview/useSharedHistory.ts:29 |
| SAVE_DEBOUNCE_MS | 500 | editorProvider.ts:68, webview/useSave.ts:244 |
| LARGE_FILE_THRESHOLD | 500*1024 | editorProvider.ts:67, webview/useSave.ts:254 |

### 1.3 Configuration Access Without Caching

**Current Problem**:
```typescript
// editorProvider.ts:223-257 - called on EVERY 'ready' message AND settings change
const getSettings = (): HtmlySettings => {
  const config = vscode.workspace.getConfiguration('htmly');
  return {
    defaultMode: config.get<EditorMode>('defaultMode', 'wysiwyg'),
    showButtonLabels: config.get<boolean>('showButtonLabels', true),
    // ... 15 more settings
  };
};

// keybindingManager.ts - repeated calls to getConfiguration
const config = vscode.workspace.getConfiguration('htmly');  // lines 162, 203, 223, 317, 349
```

**Impact**:
- VS Code configuration is re-read from disk on every access
- No change notification when settings are modified
- 38 total `getConfiguration('htmly')` calls across codebase
- No debouncing of configuration reads

**Performance Impact**:
| Operation | Cost | Frequency |
|-----------|------|-----------|
| `getConfiguration()` | ~1-5ms disk I/O | 38 calls |
| `getConfiguration()` per message | Cumulative | 'ready' message triggers 1 call |

---

## 2. Dependency Injection Architecture

### 2.1 Design Principles

1. **Lightweight** - No external DI library (avoid inversify, tsyringe complexity)
2. **Manual DI** - Constructor injection with factory functions
3. **Testability** - All dependencies injectable via constructor
4. **Backward Compatible** - Singleton accessors remain for gradual migration

### 2.2 Proposed Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ServiceContainer                            │
├─────────────────────────────────────────────────────────────────┤
│  services: Map<string, ServiceDescriptor>                        │
│  factories: Map<string, () => unknown>                          │
│                                                                  │
│  register<T>(token: string, factory: () => T): void            │
│  get<T>(token: string): T                                       │
│  getScoped<T>(token: string, scopeId: string): T               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Service Descriptors                             │
├─────────────────────────────────────────────────────────────────┤
│  { factory: () => T, singleton: boolean, instance?: T }          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Core Container Implementation

```typescript
// src/extension/di/container.ts

interface ServiceDescriptor<T> {
  factory: () => T;
  singleton: boolean;
  instance?: T;
  disposables?: vscode.Disposable[];
}

export class ServiceContainer {
  private services = new Map<string, ServiceDescriptor<unknown>>();
  private scopes = new Map<string, Map<string, unknown>>();

  register<T>(
    token: string,
    factory: () => T,
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(token, {
      factory,
      singleton: options.singleton ?? true,
    });
  }

  get<T>(token: string): T {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${token}`);
    }

    if (descriptor.singleton) {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory();
      }
      return descriptor.instance as T;
    }

    return descriptor.factory() as T;
  }

  getScoped<T>(token: string, scopeId: string): T {
    if (!this.scopes.has(scopeId)) {
      this.scopes.set(scopeId, new Map());
    }

    const scope = this.scopes.get(scopeId)!;
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service not registered: ${token}`);
    }

    if (!scope.has(token)) {
      const instance = descriptor.factory();
      scope.set(token, instance);
    }

    return scope.get(token) as T;
  }

  createScope(scopeId: string): Scope {
    return new Scope(this, scopeId);
  }

  clearScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    if (scope) {
      scope.forEach(instance => {
        if (instance && typeof instance === 'object' && 'dispose' in instance) {
          (instance as vscode.Disposable).dispose();
        }
      });
      this.scopes.delete(scopeId);
    }
  }
}

export class Scope {
  constructor(
    private container: ServiceContainer,
    private scopeId: string
  ) {}

  get<T>(token: string): T {
    return this.container.getScoped<T>(token, this.scopeId);
  }

  dispose(): void {
    this.container.clearScope(this.scopeId);
  }
}

// Global container instance
export const container = new ServiceContainer();
```

### 2.4 Service Registration

```typescript
// src/extension/di/registry.ts

import { container } from './container';
import { BacklinksIndex } from '../backlinksIndex';
import { VersionHistoryDatabase, getVersionHistoryDb } from '../versionHistoryDb';
import { SettingsService } from './settingsService';

export function registerServices(): void {
  // Core services
  container.register<SettingsService>(
    'settings',
    () => new SettingsService(),
    { singleton: true }
  );

  container.register<BacklinksIndex>(
    'backlinksIndex',
    () => new BacklinksIndex(),
    { singleton: true }
  );

  container.register<VersionHistoryDatabase>(
    'versionHistory',
    () => getVersionHistoryDb(),
    { singleton: true }
  );
}

// Document-scoped services factory
export function createDocumentScope(documentUri: string) {
  return container.createScope(documentUri);
}
```

### 2.5 Refactored BacklinksIndex

```typescript
// src/extension/di/backlinksIndex.ts

import { container } from './container';
import type { BacklinkInfo, WikiPage } from '../../shared/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Document-scoped backlinks service
 * Each document gets its own instance with isolated state
 */
export class BacklinksIndex {
  private backlinksMap: Map<string, BacklinkInfo[]> = new Map();
  private workspaceRoot: string | null = null;
  private documentUri: string | null = null;

  public setContext(workspaceRoot: string, documentUri: string): void {
    this.workspaceRoot = workspaceRoot;
    this.documentUri = documentUri;
  }

  // ... existing methods unchanged
}

// Factory function for document-scoped instances
export function createBacklinksIndex(): BacklinksIndex {
  return new BacklinksIndex();
}
```

### 2.6 Usage in EditorProvider

```typescript
// src/extension/editorProvider.ts (refactored)

import { container } from './di/container';
import { createBacklinksIndex, BacklinksIndex } from './di/backlinksIndex';
import type { HtmlySettings } from '../shared/types';

export class HtmlyEditorProvider implements vscode.CustomTextEditorProvider {
  // Document-scoped services
  private backlinksIndex: BacklinksIndex;
  
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settingsService = container.get<SettingsService>('settings')
  ) {
    // Each provider instance gets document-scoped services
    this.backlinksIndex = createBacklinksIndex();
  }

  private handleWebviewMessage(msg: WebToExtMsg): void {
    switch (msg.type) {
      case 'ready':
        // Use injected settings service with caching
        const settings = this.settingsService.getSettings();
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (workspaceRoot) {
          this.backlinksIndex.setContext(workspaceRoot, docKey);
          await this.backlinksIndex.updateIndex();
        }
        break;
    }
  }
}
```

### 2.7 Testing Without Global State

```typescript
// src/extension/editorProvider.test.ts

import { ServiceContainer } from './di/container';
import { HtmlyEditorProvider } from './editorProvider';
import { BacklinksIndex } from './di/backlinksIndex';
import { SettingsService } from './di/settingsService';

// Create test container
function createTestContainer(): ServiceContainer {
  const container = new ServiceContainer();
  
  // Mock services
  const mockBacklinksIndex = new MockBacklinksIndex();
  const mockSettingsService = new MockSettingsService({
    defaultMode: 'wysiwyg',
    showButtonLabels: true,
    // ...
  });

  container.register<BacklinksIndex>('backlinksIndex', () => mockBacklinksIndex);
  container.register<SettingsService>('settings', () => mockSettingsService);

  return container;
}

describe('HtmlyEditorProvider', () => {
  let container: ServiceContainer;
  let provider: HtmlyEditorProvider;

  beforeEach(() => {
    container = createTestContainer();
    // Override container.get for tests
    provider = new HtmlyEditorProvider(mockContext, container);
  });

  it('uses document-scoped backlinks index', () => {
    // Each document gets isolated backlinks index
    const doc1Index = provider.getBacklinksIndex('doc1');
    const doc2Index = provider.getBacklinksIndex('doc2');
    
    expect(doc1Index).not.toBe(doc2Index);
  });
});
```

---

## 3. Constants Management System

### 3.1 Centralized Constants Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Constants Module                              │
├─────────────────────────────────────────────────────────────────┤
│  src/extension/constants/                                        │
│  ├── index.ts              - Barrel export                       │
│  ├── editor.ts             - Editor-related constants            │
│  ├── performance.ts        - Performance thresholds              │
│  ├── history.ts            - History/versioning constants        │
│  ├── keybindings.ts        - Keybinding constants                │
│  └── storage.ts            - Storage size limits                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Typed Constants Implementation

```typescript
// src/extension/constants/editor.ts

export const EditorConstants = Object.freeze({
  /** Debounce delay for auto-save in milliseconds */
  SAVE_DEBOUNCE_MS: 500,

  /** Debounce delay for history persistence in milliseconds */
  HISTORY_DEBOUNCE_MS: 1000,

  /** File size threshold for read-only mode (500 KB) */
  LARGE_FILE_THRESHOLD: 500 * 1024,

  /** File size threshold for optimized save (100 KB) */
  LARGE_SAVE_THRESHOLD: 100 * 1024,

  /** Maximum history entries per document */
  MAX_HISTORY_ENTRIES: 100,

  /** Maximum undo stack size */
  MAX_UNDO_STACK_SIZE: 200,
} as const);

export type EditorConstant = typeof EditorConstants[keyof typeof EditorConstants];
```

```typescript
// src/extension/constants/performance.ts

export const PerformanceConstants = Object.freeze({
  /** Maximum file size for sync operations (1 MB) */
  MAX_SYNC_FILE_SIZE: 1 * 1024 * 1024,

  /** Debounce delay for content update messages (ms) */
  CONTENT_UPDATE_DEBOUNCE_MS: 300,

  /** Maximum concurrent indexing operations */
  MAX_INDEXING_CONCURRENCY: 4,

  /** Cache TTL for backlinks index (seconds) */
  BACKLINKS_CACHE_TTL_SECONDS: 300,
} as const);
```

```typescript
// src/extension/constants/index.ts

export { EditorConstants } from './editor';
export { PerformanceConstants } from './performance';
export { HistoryConstants } from './history';
export { StorageConstants } from './storage';

// Centralized constant access with validation
import { EditorConstants } from './editor';
import { PerformanceConstants } from './performance';

export const AllConstants = {
  editor: EditorConstants,
  performance: PerformanceConstants,
} as const;

export type ConstantCategory = 'editor' | 'performance' | 'history' | 'storage';

/**
 * Get a constant with runtime validation
 */
export function getConstant<C extends ConstantCategory, K extends string>(
  category: C,
  key: K
): number {
  const value = AllConstants[category][key];
  if (typeof value !== 'number') {
    throw new Error(`Constant ${category}.${key} is not a number`);
  }
  return value;
}
```

### 3.3 Migration from Inline Constants

**Before**:
```typescript
// editorProvider.ts
private static readonly LARGE_FILE_THRESHOLD = 500 * 1024;
private static readonly SAVE_DEBOUNCE_MS = 500;
const MAX_HISTORY_ENTRIES = 100;
const HISTORY_DEBOUNCE_MS = 1000;
```

**After**:
```typescript
// editorProvider.ts
import { EditorConstants } from './constants';

export class HtmlyEditorProvider {
  private static readonly LARGE_FILE_THRESHOLD = EditorConstants.LARGE_FILE_THRESHOLD;
  private static readonly SAVE_DEBOUNCE_MS = EditorConstants.SAVE_DEBOUNCE_MS;
  
  private readonly maxHistoryEntries = EditorConstants.MAX_HISTORY_ENTRIES;
  private readonly historyDebounceMs = EditorConstants.HISTORY_DEBOUNCE_MS;
}
```

### 3.4 Webview Constants Synchronization

```typescript
// webview/src/constants/editor.ts

// Mirror extension constants in webview
// Generated from extension constants during build

export const EditorConstants = Object.freeze({
  SAVE_DEBOUNCE_MS: 500,
  HISTORY_DEBOUNCE_MS: 1000,
  LARGE_FILE_THRESHOLD: 500 * 1024,
  MAX_HISTORY_ENTRIES: 100,
} as const);
```

**Build-time synchronization**:
```typescript
// scripts/sync-constants.ts

import * as fs from 'fs';
import * as path from 'path';

const EXTENSION_CONSTANTS_PATH = path.join(__dirname, '../src/extension/constants');
const WEBVIEW_CONSTANTS_PATH = path.join(__dirname, '../webview/src/constants');

function syncConstants(): void {
  // Copy relevant constants to webview
  // This ensures webview and extension use identical values
}
```

---

## 4. Configuration Caching Strategy

### 4.1 Configuration Observer Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  vscode.workspace.getConfiguration('htmly')                      │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐     ┌──────────────────┐                   │
│  │ SettingsService │────▶│ ConfigurationCache│                   │
│  │   (singleton)   │     │   (in-memory)     │                   │
│  └────────┬────────┘     └──────────────────┘                   │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │        Configuration Observers          │                    │
│  │  - SettingsChangeHandler                │                    │
│  │  - StatusBarUpdateHandler               │                    │
│  │  - WebviewBroadcastHandler              │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 SettingsService Implementation

```typescript
// src/extension/di/settingsService.ts

import * as vscode from 'vscode';
import type { HtmlySettings, EditorMode, CloudStorageProvider } from '../../shared/types';

type SettingsChangeListener = (settings: HtmlySettings) => void;

export class SettingsService {
  private cache: HtmlySettings | null = null;
  private lastReadTime: number = 0;
  private readonly CACHE_TTL_MS = 5000; // 5 second cache TTL
  private listeners: Set<SettingsChangeListener> = new Set();
  private disposeOnChange: vscode.Disposable | null = null;

  constructor() {
    this.initializeChangeListener();
  }

  private initializeChangeListener(): void {
    // Listen for configuration changes
    this.disposeOnChange = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration('htmly')) {
          // Invalidate cache
          this.cache = null;
          // Notify listeners
          this.notifyListeners();
        }
      }
    );
  }

  /**
   * Get cached settings, reading from VS Code only if cache is stale
   */
  getSettings(): HtmlySettings {
    const now = Date.now();

    if (this.cache && (now - this.lastReadTime) < this.CACHE_TTL_MS) {
      return this.cache;
    }

    this.cache = this.readSettingsFromConfig();
    this.lastReadTime = now;
    return this.cache;
  }

  /**
   * Force refresh settings from VS Code configuration
   */
  refreshSettings(): HtmlySettings {
    this.cache = null;
    return this.getSettings();
  }

  private readSettingsFromConfig(): HtmlySettings {
    const config = vscode.workspace.getConfiguration('htmly');

    return {
      defaultMode: config.get<EditorMode>('defaultMode', 'wysiwyg'),
      showButtonLabels: config.get<boolean>('showButtonLabels', true),
      autoHideToolbarInPreview: config.get<boolean>('autoHideToolbarInPreview', true),
      defaultFontSize: config.get<number>('defaultFontSize', 14),
      enableMarkdownShortcuts: config.get<boolean>('enableMarkdownShortcuts', true),
      splitScreenDirection: config.get<'horizontal' | 'vertical'>('splitScreenDirection', 'horizontal'),
      customTheme: {
        primaryColor: config.get<string>('customTheme.primaryColor', '#0e639c'),
      },
      cloudStorage: {
        provider: config.get<CloudStorageProvider>('cloudStorage.provider', 'none'),
        s3: {
          accessKeyId: config.get<string>('cloudStorage.s3.accessKeyId', ''),
          secretAccessKey: config.get<string>('cloudStorage.s3.secretAccessKey', ''),
          bucket: config.get<string>('cloudStorage.s3.bucket', ''),
          region: config.get<string>('cloudStorage.s3.region', 'us-east-1'),
        },
        cloudinary: {
          apiKey: config.get<string>('cloudStorage.cloudinary.apiKey', ''),
          apiSecret: config.get<string>('cloudStorage.cloudinary.apiSecret', ''),
          cloudName: config.get<string>('cloudStorage.cloudinary.cloudName', ''),
        },
        imgbb: {
          apiKey: config.get<string>('cloudStorage.imgbb.apiKey', ''),
        },
      },
      spellCheck: {
        enabled: config.get<boolean>('spellCheck.enabled', true),
        customDictionary: config.get<string[]>('spellCheck.customDictionary', []),
      },
    };
  }

  /**
   * Subscribe to settings changes
   */
  onSettingsChange(listener: SettingsChangeListener): vscode.Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => this.listeners.delete(listener),
    };
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach(listener => {
      try {
        listener(settings);
      } catch (error) {
        console.error('Settings change listener error:', error);
      }
    });
  }

  dispose(): void {
    this.disposeOnChange?.dispose();
    this.listeners.clear();
  }
}
```

### 4.3 Refactored KeybindingManager

**Before** (38+ getConfiguration calls):
```typescript
// keybindingManager.ts
export function getKeybindingOverrides(): Record<string, KeybindingOverride> {
  const config = vscode.workspace.getConfiguration('htmly');  // Line 162
  const overrides = config.get<Record<string, KeybindingOverride>>('keybindings.overrides', {});
  return overrides;
}

export function setKeybindingOverride(commandId: string, key: string, mac?: string): void {
  const config = vscode.workspace.getConfiguration('htmly');  // Line 203
  // ...
}
```

**After** (using SettingsService):
```typescript
// keybindingManager.ts
import { container } from './di/container';

export function getKeybindingOverrides(): Record<string, KeybindingOverride> {
  const settings = container.get<SettingsService>('settings');
  return settings.getSettings().keybindings?.overrides ?? {};
}

export function setKeybindingOverride(
  commandId: string,
  key: string,
  mac?: string
): void {
  const config = vscode.workspace.getConfiguration('htmly');
  const current = getKeybindingOverrides();
  
  current[commandId] = { command: commandId, key, mac };
  
  config.update(
    'keybindings.overrides',
    current,
    vscode.ConfigurationTarget.Workspace
  );
}
```

### 4.4 Settings Change Handler

```typescript
// src/extension/di/settingsChangeHandler.ts

import * as vscode from 'vscode';
import { container } from './container';
import type { SettingsService } from './settingsService';

export function registerSettingsChangeHandlers(
  context: vscode.ExtensionContext,
  provider: HtmlyEditorProvider
): void {
  const settings = container.get<SettingsService>('settings');

  // Handle settings changes that affect UI
  context.subscriptions.push(
    settings.onSettingsChange((newSettings) => {
      // Update status bar
      updateStatusBar(newSettings);
      
      // Notify open webviews
      provider.broadcastToAllWebviews({
        type: 'settings',
        settings: newSettings,
      });
    })
  );
}

function updateStatusBar(settings: HtmlySettings): void {
  // Update status bar items based on new settings
}
```

---

## 5. Migration Strategy

### 5.1 Phased Implementation Plan

| Week | Phase | Changes |
|------|-------|---------|
| **Week 1** | DI Foundation | Create `ServiceContainer`, register core services |
| **Week 2** | Constants | Create `constants/` module, migrate from inline constants |
| **Week 3** | Settings Caching | Implement `SettingsService`, replace `getConfiguration` calls |
| **Week 4** | Testing | Add unit tests using injectable services |
| **Week 5** | Cleanup | Remove legacy singletons, deprecation warnings |

### 5.2 Week 1: DI Container

**Files Created**:
```
src/extension/di/
├── container.ts      - ServiceContainer class
├── registry.ts       - Service registration
├── scope.ts          - Scope class
└── settingsService.ts - Settings caching service
```

**Files Modified**:
- `editorProvider.ts` - Use injected services
- `backlinksIndex.ts` - Export factory function
- `extension.ts` - Call `registerServices()`

### 5.3 Week 2: Constants Module

**Files Created**:
```
src/extension/constants/
├── index.ts          - Barrel export
├── editor.ts         - Editor constants
├── performance.ts    - Performance constants
├── history.ts        - History constants
└── storage.ts        - Storage constants
```

**Files Modified**:
- `editorProvider.ts` - Import constants
- `versionHistoryDb.ts` - Import constants
- `keybindingManager.ts` - Import constants

### 5.4 Week 3: Settings Caching

**Files Created**:
- `src/extension/di/settingsService.ts` - Cached settings

**Files Modified**:
- `keybindingManager.ts` - Use SettingsService
- `editorProvider.ts` - Use SettingsService
- `exportUtils.ts` - Use SettingsService

### 5.5 Backward Compatibility

**Deprecation Path**:
```typescript
// Keep legacy accessor for gradual migration
export const backlinksIndex = new BacklinksIndex();

/**
 * @deprecated Use DI container: container.get<BacklinksIndex>('backlinksIndex')
 */
export function getBacklinksIndex(): BacklinksIndex {
  console.warn('getBacklinksIndex() is deprecated. Use DI container.');
  return backlinksIndex;
}
```

---

## 6. Code Organization Recommendations

### 6.1 Proposed Directory Structure

```
src/extension/
├── di/                          # Dependency injection
│   ├── container.ts
│   ├── scope.ts
│   ├── registry.ts
│   └── services/
│       ├── settingsService.ts
│       └── ...
├── constants/                   # Centralized constants
│   ├── index.ts
│   ├── editor.ts
│   ├── performance.ts
│   ├── history.ts
│   └── storage.ts
├── services/                    # Business logic services
│   ├── backlinksIndex.ts        # Document-scoped
│   ├── versionHistory.ts
│   └── ...
├── handlers/                    # Message handlers
│   ├── contentHandler.ts
│   ├── settingsHandler.ts
│   └── ...
├── editorProvider.ts            # Main provider (reduced size)
├── keybindingManager.ts
├── extension.ts
└── index.ts

src/shared/
├── types.ts
└── constants.ts                  # Shared constants (webview + extension)
```

### 6.2 EditorProvider Size Reduction Target

| Current Lines | Responsibility | Target |
|---------------|----------------|--------|
| 2326 | Total | ~800 |
| 1-150 | Imports, constants | 1-50 |
| 150-400 | CustomTextEditorProvider | 100-200 |
| 400-700 | Document change handling | Move to `handlers/contentHandler.ts` |
| 700-1000 | Mode management | Move to `services/modeController.ts` |
| 1000-1400 | Save operations | Move to `services/saveController.ts` |
| 1400-1700 | Template operations | Move to `handlers/templateHandler.ts` |
| 1700-2000 | Snippet operations | Move to `handlers/snippetHandler.ts` |
| 2000-2326 | Version history | Move to `services/versionHistory.ts` |

### 6.3 IDE Integration for Constants

**VS Code Settings**:
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "non-case",
  "typescript.inlayHints.enumMemberValues": true
}
```

**tsconfig.json for constant type-checking**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**JSDoc for constant documentation**:
```typescript
/**
 * Debounce delay for auto-save in milliseconds
 * @example
 * // Use in debounce calls
 * setTimeout(doSave, EditorConstants.SAVE_DEBOUNCE_MS);
 */
export const EditorConstants = Object.freeze({
  SAVE_DEBOUNCE_MS: 500,
}) as const;
```

---

## 7. Test Results

- **No tests modified** (design document only)
- **No breaking changes** (backward compatible via deprecation path)

---

## 8. Blockers

None - design is complete and ready for implementation review

---

## 9. Goal Status

✅ **Complete** - Maintainability improvements design document delivered to `docs/optimization/maintainability-improvements.md`

