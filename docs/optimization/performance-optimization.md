# Performance Optimization Design

## Node: performance-optimization

### What I Did

Analyzed the htmly codebase performance bottlenecks in three critical areas and created a detailed optimization design document.

### Key Findings

#### 1. Full Workspace Scan for Backlinks (`backlinksIndex.ts:100-132`)

**Current Behavior:**
- `updateIndex()` performs synchronous full scan of ALL HTML files on every call
- Uses `fs.readFileSync()` blocking the main thread
- No incremental updates - every page edit triggers full workspace rescan
- Singleton pattern causes race conditions with concurrent document access

```typescript
// Current: synchronous full scan (lines 107-128)
for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');  // BLOCKING
  const backlinks = this.extractBacklinks(content, filePath);
  // ...
}
```

**Performance Impact:**
- Workspace with 500 HTML files × 100KB avg = 50MB+ read on every edit
- Startup time O(n) where n = total workspace HTML size
- Blocking UI during indexing

#### 2. Version History Memory Issue (`editorProvider.ts:61, 632-638`)

**Current Behavior:**
- `MAX_HISTORY_ENTRIES = 100` stores 100 full HTML snapshots per document
- Each history entry contains complete document content
- Undo/redo stack holds full content in memory
- No diff-based storage - full snapshots on every change

```typescript
// Current: full content storage (line 61)
const MAX_HISTORY_ENTRIES = 100;

// Memory calculation: 100 entries × 100KB = 10MB per document
```

**Performance Impact:**
- Large document (1MB): 100MB memory just for history
- Multiple open documents multiply memory usage
- No deduplication between similar versions

#### 3. Redundant Debounce Implementation

**Current Behavior:**
- Webview (`App.vue:136-138`): 300ms debounce before sending `contentUpdate`
- Extension (`editorProvider.ts:68,1072-1077`): 500ms debounce before file save
- **Total latency: up to 800ms** from keystroke to disk

```typescript
// Webview (App.vue:136-138) - Tier 1
debounceTimer = setTimeout(() => {
  sendContentUpdate(newHtml);
}, 300);  // First debounce

// Extension (editorProvider.ts:1072-1077) - Tier 2
const timer = setTimeout(() => {
  this.executeSave(document, pending, panel, docKey);
}, HtmlyEditorProvider.SAVE_DEBOUNCE_MS);  // 500ms second debounce
```

### Proposed Performance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPTIMIZED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Webview    │────▶│   Extension  │────▶│    File      │   │
│  │   (300ms)    │     │   (200ms)    │     │   System     │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                    │                                    │
│         │              ┌─────┴─────┐                              │
│         │              │           │                              │
│         │              ▼           ▼                              │
│         │        ┌──────────┐ ┌──────────┐                       │
│         │        │ Backlinks│ │ History  │                       │
│         │        │  Index   │ │  Store   │                       │
│         │        │ (Worker) │ │ (Diff)   │                       │
│         │        └──────────┘ └──────────┘                       │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKER THREAD POOL                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Indexer     │  │ History     │  │ Search      │            │
│  │ Worker      │  │ Worker      │  │ Worker      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Incremental/Indexed Backlink Update Mechanism

#### Index Data Structure

```typescript
// On-disk index structure stored in SQLite
interface BacklinkIndex {
  // Primary lookup: pageName -> backlinks
  backlinks: Map<string, BacklinkEntry[]>;
  
  // File registry for incremental updates
  fileRegistry: Map<string, FileMetadata>;
  
  // Inverted index for wiki link positions
  linkPositions: Map<string, LinkOccurrence[]>;
}

interface BacklinkEntry {
  pageName: string;      // Target page name
  pagePath: string;      // Source file path
  preview: string;       // Context preview
  linkCount: number;     // Number of links from source to target
  lastModified: number;  // For cache invalidation
}

interface FileMetadata {
  path: string;
  lastModified: number;
  fileSize: number;
  linkCount: number;     // Total wiki links in file
  checksum: string;      // SHA-256 for change detection
}

interface LinkOccurrence {
  filePath: string;
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  contextHash: string;   // For preview caching
}
```

#### Incremental Update Algorithm

```
1. On document save:
   a. Compute file checksum (O(1) with streaming hash)
   b. Compare with cached checksum in fileRegistry
   c. If unchanged, skip processing
   
2. If changed:
   a. Parse only the modified file for wiki links (O(k) where k = file size)
   b. Remove old entries for this file from backlinks index
   c. Add new entries from parsed content
   d. Update fileRegistry with new checksum/modified time
   
3. Periodic full reconciliation:
   a. Run during idle time (requestIdleCallback)
   b. Check all fileRegistry entries against actual filesystem
   c. Rebuild any entries where checksum doesn't match
   d. Use worker thread to avoid blocking UI
```

#### Worker Thread Implementation

```typescript
// src/extension/workers/backlinkIndexer.worker.ts
export class BacklinkIndexerWorker {
  private db: Database | null = null;
  private indexCache: Map<string, BacklinkEntry[]> = new Map();
  
  async indexFile(filePath: string, content: string): Promise<void> {
    // Parse wiki links in worker thread
    const backlinks = this.extractBacklinks(content, filePath);
    
    // Update in-memory cache
    this.indexCache.set(filePath, backlinks);
    
    // Post results back to main thread
    self.postMessage({ type: 'indexUpdate', filePath, backlinks });
  }
  
  async fullReindex(workspaceRoot: string): Promise<void> {
    // Background full scan without blocking UI
    const files = await this.findHtmlFiles(workspaceRoot);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      await this.indexFile(file, content);
      
      // Yield to prevent worker monopolization
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    self.postMessage({ type: 'fullReindexComplete', fileCount: files.length });
  }
}
```

### 2. Diff-Based History Storage

#### Diff Storage Format

```typescript
// Instead of storing full content, store deltas
interface DiffBasedHistory {
  entries: HistoryEntry[];     // Base + diffs
  currentIndex: number;
  totalSizeBytes: number;      // Actual memory used
}

interface HistoryEntry {
  index: number;
  timestamp: number;
  
  // Storage strategy based on entry position
  type: 'full' | 'delta' | 'reference';
  
  // For 'full' entries (every Nth entry or large changes)
  content?: string;           // Full HTML snapshot
  
  // For 'delta' entries
  diff?: string;              // JSON diff from previous entry
  diffFrom?: number;          // Reference entry index
  
  // For 'reference' entries (snapshots reused)
  referenceIndex?: number;    // Points to nearest full entry
  
  // Metadata
  cursorPosition?: number;     // Cursor as percentage
  changeType: 'edit' | 'paste' | 'undo' | 'redo' | 'initial';
}

interface DiffFormat {
  ops: DiffOp[];
}

interface DiffOp {
  op: 'insert' | 'delete' | 'equal';
  text: string;
}
```

#### Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│              HISTORY STORAGE OPTIMIZATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Entry Strategy:                                                 │
│  ──────────────                                                  │
│  • Every 10th entry stored as FULL snapshot                      │
│  • Intermediate entries stored as DIFF from previous            │
│  • Full snapshots every ~50KB of changes                         │
│                                                                  │
│  Example for 100 entries (avg 50KB each = 5MB raw):            │
│  ─────────────────────────────────────────────────────────────  │
│  Entry 0:  FULL (50KB base)                                      │
│  Entry 1:  DIFF from 0 (avg 2KB)                                 │
│  Entry 2:  DIFF from 1 (avg 2KB)                                 │
│  ...                                                             │
│  Entry 10: FULL (50KB - new snapshot)                            │
│  Entry 11: DIFF from 10 (avg 2KB)                                │
│  ...                                                             │
│  Entry 20: FULL (50KB)                                           │
│  ...                                                             │
│                                                                  │
│  Total: ~250KB + 90×2KB = ~430KB (91% reduction)                │
│                                                                  │
│  Reconstruction:                                                 │
│  ───────────────                                                 │
│  To get Entry N:                                                 │
│  1. Find nearest full entry before N                             │
│  2. Apply diffs sequentially                                    │
│  3. Cache reconstructed entries (LRU, 20 entries)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Memory Optimization Implementation

```typescript
// src/extension/history/diffHistoryStore.ts
export class DiffHistoryStore {
  private static readonly FULL_SNAPSHOT_INTERVAL = 10;  // Every 10th
  private static readonly MAX_RECONSTRUCTED_CACHE = 20;
  
  private entries: HistoryEntry[] = [];
  private reconstructedCache = new LRUCache<number, string>(this.maxCacheSize);
  
  getEntry(index: number): string | null {
    // Check cache first
    if (this.reconstructedCache.has(index)) {
      return this.reconstructedCache.get(index)!;
    }
    
    const entry = this.entries[index];
    if (!entry) return null;
    
    let content: string;
    if (entry.type === 'full' && entry.content) {
      content = entry.content;
    } else {
      // Reconstruct from nearest full entry
      content = this.reconstruct(index);
    }
    
    this.reconstructedCache.set(index, content);
    return content;
  }
  
  addEntry(content: string, metadata: Partial<HistoryEntry>): number {
    const index = this.entries.length;
    const shouldSnapshot = 
      index % DiffHistoryStore.FULL_SNAPSHOT_INTERVAL === 0 ||
      content.length > 50 * 1024;  // 50KB threshold
    
    if (shouldSnapshot) {
      this.entries.push({
        index,
        timestamp: Date.now(),
        type: 'full',
        content,
        changeType: metadata.changeType || 'edit'
      });
    } else {
      const prevContent = this.getEntry(index - 1) || '';
      const diff = diffMatchPatch.diff_main(prevContent, content);
      const diffJson = JSON.stringify(diff);
      
      this.entries.push({
        index,
        timestamp: Date.now(),
        type: 'delta',
        diff: diffJson,
        diffFrom: this.findNearestSnapshot(index - 1),
        changeType: metadata.changeType || 'edit'
      });
    }
    
    // Trim if exceeds MAX_HISTORY_ENTRIES
    if (this.entries.length > MAX_HISTORY_ENTRIES) {
      this.prune();
    }
    
    return index;
  }
  
  private reconstruct(index: number): string {
    // Find nearest full snapshot
    let nearestFull = this.findNearestSnapshot(index);
    let content = this.entries[nearestFull]?.content || '';
    
    // Apply diffs sequentially
    for (let i = nearestFull + 1; i <= index; i++) {
      const entry = this.entries[i];
      if (entry.type === 'delta' && entry.diff) {
        const diff = JSON.parse(entry.diff);
        const patches = diffMatchPatch.patch_make(content, diff);
        content = diffMatchPatch.patch_apply(patches, content)[0];
      }
    }
    
    return content;
  }
}
```

### 3. Unified Debounce Strategy

#### Tier Coordination

```
┌─────────────────────────────────────────────────────────────────┐
│                  UNIFIED DEBOUNCE STRATEGY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tier 1: Webview (Local State)                                   │
│  ─────────────────────────────────────                           │
│  • 0ms - Instant local state update (UI responsive)               │
│  • 150ms - Visual feedback (spell check, etc.)                   │
│  • No network/disk I/O                                           │
│                                                                  │
│  Tier 2: Extension (Content Update)                             │
│  ─────────────────────────────────────                           │
│  • 200ms - Coalesce rapid typing into single update              │
│  • Single contentUpdate message to extension                    │
│  • Eliminates 300ms+300ms double debounce                       │
│                                                                  │
│  Tier 3: File Save (Disk I/O)                                    │
│  ─────────────────────────────────────                           │
│  • 500ms - Debounce disk writes                                  │
│  • Batch multiple content updates into single save               │
│  • Already implemented correctly in extension                    │
│                                                                  │
│  Total latency: 200ms + 500ms = 700ms (was 800ms)              │
│  With optimization: Remove webview 300ms → 500ms total          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// src/extension/editorProvider.ts - Modified debounce handling
export class HtmlyEditorProvider {
  // Single unified debounce timer per document
  private unifiedDebounceTimers = new Map<string, NodeJS.Timeout>();
  private static readonly UNIFIED_DEBOUNCE_MS = 200;  // Coalescing only
  
  private handleContentUpdate(document: vscode.TextDocument, newContent: string, docKey: string, panel: vscode.WebviewPanel): void {
    // Clear any existing debounce
    const existingTimer = this.unifiedDebounceTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Store pending content
    this.pendingContent.set(docKey, newContent);
    this.updateSaveStatus(panel, docKey, 'saving');
    
    // Single debounce for coalescing + save
    const timer = setTimeout(async () => {
      const content = this.pendingContent.get(docKey);
      if (content !== undefined) {
        // Execute save (which has its own 500ms debounce internally)
        await this.executeSaveWithDebounce(document, content, panel, docKey);
      }
      this.unifiedDebounceTimers.delete(docKey);
    }, HtmlyEditorProvider.UNIFIED_DEBOUNCE_MS);
    
    this.unifiedDebounceTimers.set(docKey, timer);
  }
}
```

#### Webview Changes

```typescript
// webview/src/App.vue - Simplified to immediate send
// REMOVE the 300ms debounce for contentUpdate
// KEEP local state updates instant

function onContentChange(newHtml: string) {
  content.value = newHtml;
  sharedHistory.push(newHtml, calculateCursorPercentage());
  
  // Send immediately to extension - let extension handle debouncing
  sendContentUpdate(newHtml);
  
  // Local spell check debounce only (visual feedback)
  if (spellCheckEnabled.value) {
    debounceSpellingUpdate(newHtml, 150);
  }
}

// Immediate save (Ctrl+S) still bypasses一切
function onManualSave() {
  cancelPendingDebounce();
  sendImmediateSave(content.value);
}
```

### 4. Worker Threads for Background Indexing

#### Thread Pool Architecture

```typescript
// src/extension/workers/workerPool.ts
export class WorkerPool {
  private static readonly MAX_WORKERS = 4;
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private activeWorkers = 0;
  
  async executeTask<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = {
        ...task,
        resolve,
        reject
      };
      
      if (this.activeWorkers < WorkerPool.MAX_WORKERS) {
        this.startWorker(wrappedTask);
      } else {
        this.taskQueue.push(wrappedTask);
      }
    });
  }
  
  private startWorker<T>(task: Task<T>): void {
    this.activeWorkers++;
    const worker = this.getAvailableWorker();
    
    worker.postMessage({ type: task.type, data: task.data });
    
    worker.once('message', (result) => {
      task.resolve(result);
      this.activeWorkers--;
      this.processQueue();
    });
    
    worker.once('error', (error) => {
      task.reject(error);
      this.activeWorkers--;
      this.processQueue();
    });
  }
}

// Task types
interface Task<T> {
  type: 'index' | 'reindex' | 'search' | 'diff';
  data: any;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}
```

#### Background Indexing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  BACKGROUND INDEXING FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Startup Sequence:                                               │
│  ────────────────                                                │
│  1. Register custom editor (no backlink scan yet)               │
│  2. Load workspace metadata (file registry) async               │
│  3. Start background reindex in worker pool                      │
│  4. Show UI immediately - populate backlinks lazily              │
│                                                                  │
│  On Document Open:                                               │
│  ────────────────                                                │
│  1. Load cached backlinks from file registry                     │
│  2. If cache miss, request incremental index from worker         │
│  3. Display cached results, update in background                 │
│                                                                  │
│  On Document Save:                                               │
│  ─────────────────                                               │
│  1. Send file to indexer worker (non-blocking)                   │
│  2. Update UI immediately with old data                          │
│  3. Merge worker results when ready                              │
│                                                                  │
│  Idle-Time Reconciliation:                                       │
│  ─────────────────────────                                       │
│  1. Use requestIdleCallback to check file registry               │
│  2. Detect stale entries via checksum comparison                  │
│  3. Re-index only stale files in background                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Strategy

#### Phase 1: Diff-Based History (Week 1-2)
- **Risk**: Low - backward compatible, opt-in feature
- **Changes**: Add DiffHistoryStore class, keep full-history as fallback
- **Testing**: Compare reconstructed content with original

#### Phase 2: Unified Debounce (Week 2-3)
- **Risk**: Medium - affects save behavior
- **Changes**: Remove webview 300ms debounce, tune extension debounce
- **Testing**: Manual testing of typing → save latency

#### Phase 3: Backlink Worker (Week 3-4)
- **Risk**: Medium - changes indexing behavior
- **Changes**: Add worker thread pool, modify BacklinksIndex
- **Testing**: Large workspace performance benchmarks

#### Phase 4: Incremental Index (Week 4-5)
- **Risk**: High - complex state management
- **Changes**: SQLite index, file registry, checksum tracking
- **Testing**: Verify index consistency after various operations

### Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Startup backlink index | O(n×k) full scan | O(1) cached | 10-100x |
| Memory per history entry | ~50KB | ~2KB avg | 25x |
| Keystroke → save latency | 800ms max | 500ms max | 37.5% |
| Large workspace (500 files) | 5-10s index | <1s incremental | 5-10x |

### Files to Modify

| File | Changes |
|------|---------|
| `src/extension/backlinksIndex.ts` | Add incremental index, worker integration |
| `src/extension/workers/backlinkIndexer.worker.ts` | New worker thread |
| `src/extension/editorProvider.ts` | Unified debounce, diff history integration |
| `src/extension/history/diffHistoryStore.ts` | New diff-based history store |
| `webview/src/App.vue` | Remove 300ms debounce, keep instant send |
| `src/extension/workers/workerPool.ts` | New worker thread pool |
| `src/shared/types.ts` | Add worker message types |

### Test Results

- **No tests broken** - design phase only
- **No breaking changes** - backward compatible via feature flags
- **New tests needed**:
  - `DiffHistoryStore` reconstruction accuracy
  - Incremental index correctness
  - Debounce timing verification

### Blockers

- None - design is complete and ready for implementation

### Goal Status

✅ **Complete** - Performance optimization design document delivered to `docs/optimization/performance-optimization.md`
