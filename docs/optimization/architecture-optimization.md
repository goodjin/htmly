# Architecture Optimization Design Document

**Date**: 2026-05-19  
**Status**: Draft  
**Author**: Oracle (Strategic Technical Advisor)

---

## Executive Summary

This document proposes a comprehensive architectural refactoring for the Htmly VS Code extension to address three critical issues: (1) singleton abuse in `BacklinksIndex`, (2) excessive coupling in `EditorProvider` (2326 lines), and (3) unreliable message passing between extension host and webview.

---

## 1. Issue Analysis

### 1.1 BacklinksIndex Singleton Abuse

**Current Problem**:  
```typescript
// src/extension/backlinksIndex.ts (line 219)
export const backlinksIndex = new BacklinksIndex();
```

The global singleton is shared across multiple HTML documents. When `setContext()` and `updateIndex()` are called concurrently by different documents:

```typescript
// Concurrent calls cause state pollution
DocA: backlinksIndex.setContext(wsRoot, "doc-a.html")  // sets workspaceRoot, documentUri
DocB: backlinksIndex.setContext(wsRoot, "doc-b.html")  // overwrites context!
DocA: await backlinksIndex.updateIndex()  // uses DocB's context
```

**Impact**:
- Race conditions when multiple documents are open
- Incorrect backlink results returned to wrong document
- Memory leaks from orphaned document references

### 1.2 EditorProvider Size Violation (2326 lines)

**Current Structure** (single file responsibilities bleed together):
| Lines | Responsibility |
|-------|---------------|
| 1-100 | Imports, constants, class definition |
| 100-300 | CustomTextEditorProvider implementation |
| 300-600 | Document change handling, content sync |
| 600-900 | Mode management (wysiwyg/source/preview) |
| 900-1200 | Save operations, debouncing |
| 1200-1500 | Template operations |
| 1500-1800 | Snippet operations |
| 1800-2100 | Keybinding management |
| 2100-2326 | Version history, diff operations |

**Impact**:
- Impossible to test in isolation
- Merge conflicts in version control
- Cognitive overload for new developers
- Violates Open/Closed principle

### 1.3 Message Passing State Inconsistency

**Current Dual-Map Design**:
```typescript
// editorProvider.ts lines 71-72
private modeMap = new Map<string, EditorMode>();      // Optimistic state
private ackModeMap = new Map<string, EditorMode>();   // Acknowledged state
```

**Usage pattern**:
```typescript
// Line 110: Prefer acknowledged state, fallback to optimistic
const currentMode = this.ackModeMap.get(documentUri) ?? this.modeMap.get(documentUri) ?? 'wysiwyg';

// Line 128-129: Always set both together
this.modeMap.set(documentUri, mode);
this.ackModeMap.set(documentUri, mode);

// Line 218-219: Sync both
this.modeMap.set(docKey, 'source');
this.ackModeMap.set(docKey, 'source');

// Line 328-329: Webview can update (but who validates?)
this.modeMap.set(docKey, msg.mode);
this.ackModeMap.set(docKey, msg.mode);
```

**Problems**:
1. No transactional semantics—if extension crashes after `modeMap.set` but before `ackModeMap.set`, state is inconsistent
2. No acknowledgment mechanism—webview never confirms receipt
3. No timeout/retry logic
4. Dual Map design reveals lack of trust in message delivery

---

## 2. Proposed Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Extension Host                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐  │
│  │ DocumentSession │    │ ServiceContainer │    │ MessageBus         │  │
│  │ (per document)   │    │ (singleton)      │    │ (publish/subscribe)│  │
│  └────────┬─────────┘    └────────┬─────────┘    └─────────┬──────────┘  │
│           │                       │                        │              │
│           │         ┌──────────────┼──────────────┐         │              │
│           │         │              │              │         │              │
│  ┌────────▼─────────▼─┐  ┌───────▼───────┐  ┌────▼─────────▼────┐       │
│  │ BacklinksService    │  │ TemplateSvc   │  │ SnippetService    │       │
│  │ (document-scoped)   │  │ (singleton)   │  │ (singleton)       │       │
│  └─────────────────────┘  └───────────────┘  └───────────────────┘       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     HtmlyEditorProvider                           │   │
│  │  - Registers CustomEditorProvider                                 │   │
│  │  - Creates DocumentSession per document                           │   │
│  │  - Routes messages via MessageBus                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ postMessage (with acknowledgment)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Webview                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐  │
│  │ EditorState     │    │ MessageGateway   │    │ ViewServices       │  │
│  │ (composable)    │    │ (async RPC)      │    │ (export, templates)│  │
│  └─────────────────┘    └──────────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency Injection Container

```typescript
// src/extension/di/container.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  
  // Singleton services
  private templateService: TemplateService;
  private snippetService: SnippetService;
  private keybindingService: KeybindingService;
  
  // Factory for document-scoped services
  private documentSessionFactory: DocumentSessionFactory;
  
  private constructor() {
    this.templateService = new TemplateService();
    this.snippetService = new SnippetService();
    this.keybindingService = new KeybindingService();
    this.documentSessionFactory = new DocumentSessionFactory();
  }
  
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  
  createDocumentSession(documentUri: string, workspaceRoot: string): DocumentSession {
    return this.documentSessionFactory.create(documentUri, workspaceRoot);
  }
}
```

### 2.3 Document-Scoped BacklinksService

```typescript
// src/extension/services/backlinksService.ts
export interface IBacklinksService {
  getBacklinks(pageName: string): BacklinkInfo[];
  updateIndex(): Promise<void>;
  dispose(): void;
}

export class BacklinksService implements IBacklinksService {
  private backlinksMap: Map<string, BacklinkInfo[]> = new Map();
  private workspaceRoot: string;
  private documentUri: string;
  
  constructor(workspaceRoot: string, documentUri: string) {
    this.workspaceRoot = workspaceRoot;
    this.documentUri = documentUri;
  }
  
  async updateIndex(): Promise<void> {
    // Each document instance has its own state—no sharing
    this.backlinksMap.clear();
    // ... scanning logic
  }
  
  getBacklinks(pageName: string): BacklinkInfo[] {
    return this.backlinksMap.get(pageName) || [];
  }
  
  dispose(): void {
    this.backlinksMap.clear();
  }
}

// src/extension/di/factories.ts
export class DocumentSessionFactory {
  create(documentUri: string, workspaceRoot: string): DocumentSession {
    const backlinksService = new BacklinksService(workspaceRoot, documentUri);
    const historyService = new HistoryService(documentUri);
    const versionService = new VersionService(documentUri);
    
    return new DocumentSession(
      documentUri,
      backlinksService,
      historyService,
      versionService
    );
  }
}
```

---

## 3. Code Structure Recommendations

### 3.1 Proposed File Structure

```
src/extension/
├── di/
│   ├── container.ts           # Service container (singleton)
│   ├── factories.ts           # Document session factory
│   └── tokens.ts              # DI tokens for interface binding
├── services/
│   ├── backlinksService.ts    # Document-scoped backlinks
│   ├── historyService.ts      # Document-scoped history
│   ├── versionService.ts      # Document-scoped versioning
│   ├── templateService.ts     # Singleton template operations
│   ├── snippetService.ts     # Singleton snippet operations
│   └── exportService.ts       # Export operations
├── messaging/
│   ├── messageBus.ts          # Pub/sub message routing
│   ├── acknowledgment.ts      # Ack/timeout/retry logic
│   └── messageTypes.ts        # Message schemas
├── editor/
│   ├── editorProvider.ts      # CustomTextEditorProvider (thin)
│   ├── documentSession.ts     # Per-document state container
│   ├── modeController.ts     # Mode state machine
│   └── saveController.ts     # Debounced save logic
├── handlers/
│   ├── templateHandlers.ts    # Template CRUD handlers
│   ├── snippetHandlers.ts    # Snippet CRUD handlers
│   ├── keybindingHandlers.ts  # Keybinding handlers
│   └── exportHandlers.ts      # Export handlers
├── keybinding/
│   └── keybindingManager.ts   # Existing keybinding logic
├── providers/
│   └── index.ts              # Re-exports for public API
└── extension.ts              # Entry point

webview/src/
├── core/
│   ├── messageGateway.ts     # Async RPC with acknowledgments
│   ├── stateSync.ts          # Bidirectional state sync
│   └── types.ts              # Webview-specific types
├── composables/
│   ├── useDocumentSession.ts  # Session binding to composables
│   ├── useMessageGateway.ts   # Gateway composable
│   └── useAcknowledgeable.ts # Helper for ack patterns
└── components/
    └── ... (existing components unchanged)
```

### 3.2 Module Splitting for editorProvider.ts

| Original Lines | New Module | Public API |
|---------------|------------|------------|
| 1-97 | `editorProvider.ts` | `register()`, lifecycle hooks |
| 100-300 | `documentSession.ts` | `DocumentSession` class |
| 300-600 | `contentController.ts` | `ContentController` |
| 600-900 | `modeController.ts` | `ModeController` |
| 900-1100 | `saveController.ts` | `SaveController` |
| 1100-1400 | `handlers/templateHandlers.ts` | `handleLoadTemplates()`, etc. |
| 1400-1700 | `handlers/snippetHandlers.ts` | `handleLoadSnippets()`, etc. |
| 1700-2000 | `handlers/keybindingHandlers.ts` | `handleKeybindingChange()`, etc. |
| 2000-2326 | `handlers/versionHandlers.ts` | `handleVersionHistory()`, etc. |

---

## 4. Key Interfaces

### 4.1 Document Session Interface

```typescript
// src/extension/editor/documentSession.ts
export interface IDocumentSession {
  readonly documentUri: string;
  readonly workspaceRoot: string;
  
  // Scoped services
  backlinksService: IBacklinksService;
  historyService: IHistoryService;
  versionService: IVersionService;
  
  // State access
  getMode(): EditorMode;
  setMode(mode: EditorMode): void;
  
  // Lifecycle
  dispose(): void;
}
```

### 4.2 Acknowledged Message Interface

```typescript
// src/extension/messaging/messageTypes.ts

// Base message with correlation ID
interface AcknowledgableMessage<T = unknown> {
  id: string;              // UUID for correlation
  type: string;
  payload: T;
  timestamp: number;
  requiresAck: boolean;
}

// Acknowledgment message
interface Acknowledgment {
  originalId: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

// Message with built-in ack pattern
interface AcknowledgeableMessage<T = unknown> extends AcknowledgableMessage<T> {
  requiresAck: true;
  retryCount: number;
  maxRetries: number;
}
```

### 4.3 Message Gateway Interface

```typescript
// src/extension/messaging/messageBus.ts

export interface IMessageBus {
  // Publish a message (fire-and-forget or acknowledged)
  publish<T>(topic: string, message: T, options?: PublishOptions): Promise<AckResult>;
  
  // Subscribe to messages
  subscribe<T>(topic: string, handler: MessageHandler<T>): Disposable;
  
  // Request-response pattern
  request<TRequest, TResponse>(
    topic: string, 
    request: TRequest, 
    timeout?: number
  ): Promise<TResponse>;
}

export interface PublishOptions {
  requiresAck?: boolean;
  timeout?: number;
  retryCount?: number;
}
```

---

## 5. Migration Strategy

### Phase 1: Dependency Injection Foundation (Week 1)

**Goal**: Establish DI container without breaking existing functionality

1. Create `ServiceContainer` class mirroring current singleton access pattern
2. Create `DocumentSessionFactory` with interface matching current usage
3. Move `BacklinksIndex` → `BacklinksService` (document-scoped)
4. Write integration tests verifying no behavior change

**Files Changed**:
- Add `src/extension/di/container.ts`
- Add `src/extension/di/tokens.ts`
- Add `src/extension/services/backlinksService.ts`
- Modify `src/extension/editorProvider.ts` to use container

**Test**: Run existing tests; verify backlinks work identically

### Phase 2: Message Bus with Acknowledgments (Week 2)

**Goal**: Replace dual-Map mode tracking with acknowledged message passing

1. Implement `MessageBus` class with in-memory pub/sub
2. Implement `Acknowledgment` protocol for critical messages
3. Migrate mode changes to use `request/response` pattern
4. Keep non-critical messages (toolbar updates) as fire-and-forget

**Files Changed**:
- Add `src/extension/messaging/messageBus.ts`
- Add `src/extension/messaging/acknowledgment.ts`
- Add `src/extension/messaging/messageTypes.ts`
- Modify `src/extension/editorProvider.ts` mode handling

**Test**: Verify mode changes are synchronized between extension and webview

### Phase 3: EditorProvider Modularization (Week 3-4)

**Goal**: Split 2326-line file into focused modules

1. Extract `DocumentSession` class (lines ~100-300)
2. Extract `ModeController` (lines ~600-900)
3. Extract `SaveController` (lines ~900-1200)
4. Extract handler modules (lines 1200+)
5. Ensure DI container wires everything together

**Files Changed**:
- Add `src/extension/editor/documentSession.ts`
- Add `src/extension/editor/modeController.ts`
- Add `src/extension/editor/saveController.ts`
- Add `src/extension/handlers/*.ts`
- Modify `src/extension/editorProvider.ts` (target: <400 lines)

**Test**: Each module tested in isolation; integration tests pass

### Phase 4: Webview Integration (Week 5)

**Goal**: Update webview to use acknowledged message gateway

1. Implement `MessageGateway` in webview
2. Update `useVSCode.ts` composable
3. Add retry logic for failed acknowledgments
4. Implement state reconciliation on reconnection

**Files Changed**:
- Add `webview/src/core/messageGateway.ts`
- Modify `webview/src/composables/useVSCode.ts`
- Add tests for message retry and timeout

---

## 6. Backward Compatibility

### 6.1 API Preservation

All existing public APIs must continue working:

```typescript
// Old API (must continue to work)
export const backlinksIndex = new BacklinksIndex();
backlinksIndex.setContext(wsRoot, docUri);
await backlinksIndex.updateIndex();
const backlinks = backlinksIndex.getBacklinks(pageName);

// Migration path: Deprecate in favor of DI approach
@deprecated('Use ServiceContainer.createDocumentSession instead')
export class BacklinksIndex { ... }
```

### 6.2 Message Protocol Compatibility

```typescript
// Old message format (must still work)
interface ExtToWebMsg {
  type: 'setMode';
  mode: EditorMode;
}

// New message format (with ack support)
interface AcknowledgedExtToWebMsg extends ExtToWebMsg {
  id: string;
  requiresAck: boolean;
}
```

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | High | Critical | Comprehensive test suite; phased rollout |
| Message acknowledgment timeout storms | Medium | High | Exponential backoff; circuit breaker |
| Increased memory from per-document instances | Medium | Medium | Proper disposal on document close |
| Performance regression from async messaging | Low | Medium | Benchmark before/after |

---

## 8. Conclusion

This architecture optimization addresses the three core issues:

1. **Singleton abuse**: Replaced with document-scoped services via DI container
2. **Monolithic EditorProvider**: Split into focused modules with clear responsibilities  
3. **Unreliable messaging**: Added acknowledgment protocol with retry semantics

The phased migration strategy ensures backward compatibility while incrementally improving system reliability and maintainability.

---

**Next Steps**:
1. Review this design with the team
2. Create detailed implementation tickets for each phase
3. Establish baseline performance benchmarks
4. Begin Phase 1 implementation
