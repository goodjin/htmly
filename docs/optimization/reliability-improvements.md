# Reliability Improvements Design Document

**Date**: 2026-05-19  
**Status**: Draft  
**Author**: Oracle (Strategic Technical Advisor)

---

## Executive Summary

This document proposes reliability improvements for the Htmly VS Code extension to address four critical issues: (1) race conditions with external file modifications, (2) silent exception swallowing in error paths, (3) incomplete database migration verification, and (4) lack of health monitoring for background services.

| Issue | Severity | Current State | Target State |
|-------|----------|---------------|--------------|
| Race condition with external edits | High | No conflict detection | CRDT-based merge with user notification |
| Silent exception swallowing | Medium | Errors logged only | Circuit breaker + retry + alerting |
| Incomplete database migration | Medium | No verification | Transactional migration with rollback |
| No health monitoring | Low | Zero visibility | Comprehensive health dashboard |

---

## 1. Issue Analysis

### 1.1 Race Condition with External File Modifications

**Current Problem** (`editorProvider.ts:473-480`):

```typescript
const docChangeSub = vscode.workspace.onDidChangeTextDocument((e) => {
  if (e.document.uri.toString() === docKey && e.contentChanges.length > 0) {
    this.postMessage(webviewPanel, {
      type: 'contentChanged',
      content: e.document.getText(),
    });
  }
});
```

**Issues**:
1. No coordination with user's ongoing edits in webview
2. Fire-and-forget: external changes overwrite user edits silently
3. No conflict detection or merge strategy
4. No user notification of external changes
5. Webview has no way to distinguish "external change" from "intentional update"

**Conflict Scenario**:
```
Timeline:
T1: User starts editing document (webview has v1)
T2: External git checkout changes file on disk (v2)
T3: Extension receives onDidChangeTextDocument → sends v2 to webview
T4: User continues typing (webview now has v2 + user edits from T1)
T5: User saves → either v2+edits or just v2 (unpredictable)
```

### 1.2 Silent Exception Swallowing

**Current Problem** (`backlinksIndex.ts:129-131`):

```typescript
} catch (error) {
  console.error('Error updating backlinks index:', error);
}
```

**Issues**:
1. Exception is caught but only logged
2. No retry mechanism
3. No circuit breaker pattern
4. Feature silently fails - user has no indication backlinks are stale
5. No alerting or metrics collection
6. 53 similar patterns across codebase (`grep` found 53 catch blocks in editorProvider.ts alone)

**Impact**:
- Backlinks may be stale or empty without user knowledge
- File system errors (permissions, disk full) not handled gracefully
- Background index failures accumulate without recovery attempt

### 1.3 Incomplete Database Migration

**Current Problem** (`versionHistoryDb.ts:147-155`):

```typescript
// For backward compatibility: check if pinned column exists, if not, add it
if (hasAllRequiredColumns && !columns.includes('pinned')) {
  try {
    db.run(ADD_PINNED_COLUMN);
    console.log('[VersionHistory] Added pinned column to existing database');
  } catch {
    // Column might already exist or other error, continue
  }
}
```

**Issues**:
1. `ALTER TABLE` runs without verification of success
2. Exception silently caught - migration may have failed
3. No schema verification after migration
4. No rollback mechanism if migration corrupts data
5. No backup before migration
6. `isSchemaValid()` returns true even if ALTER TABLE failed

**Migration Failure Scenario**:
```
1. User has old database without 'pinned' column
2. Migration runs ALTER TABLE ADD COLUMN pinned
3. ALTER fails (e.g., SQLite limitation, disk full)
4. Catch block swallows error
5. isSchemaValid() returns true (hasAllRequiredColumns was already true)
6. App continues with corrupted/incomplete schema
7. Pinned feature fails silently
```

### 1.4 Lack of Health Monitoring

**Current State**:
- Zero visibility into background service health
- No metrics collection
- No alerting on failures
- No way to diagnose performance issues

**Affected Services**:
| Service | Location | Current Health Signal |
|---------|----------|----------------------|
| BacklinksIndex | backlinksIndex.ts:219 | None |
| VersionHistoryDb | versionHistoryDb.ts:541 | None |
| EditorProvider | editorProvider.ts:64 | None |
| ExportUtils | exportUtils.ts | None |

---

## 2. Conflict Resolution Strategy

### 2.1 CRDT-Based Approach (Recommended)

For Htmly's single-user-per-document model, we implement a **Last-Writer-Wins Register with Vector Clock** approach:

**Key Design Principles**:
1. Each document maintains a **vector clock** (document version)
2. Extension and webview track local version independently
3. External changes detected via file system watcher with version comparison
4. Conflict detected when: local edits exist + external version differs from last known
5. User presented with merge dialog instead of silent overwrite

### 2.2 Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DocumentStateManager                        │
├─────────────────────────────────────────────────────────────────┤
│  vectorClock: Map<clientId, number>                            │
│  localVersion: number                                           │
│  lastKnownDiskVersion: number                                   │
│  pendingChanges: Operation[]                                    │
│  conflictState: ConflictInfo | null                             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  Extension  │    │   Webview   │    │    Disk     │
   │   (FSW)     │    │   (Tiptap)  │    │   (git)     │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### 2.3 Core Types

```typescript
// src/extension/documentState.ts

export interface VectorClock {
  [clientId: string]: number;
}

export interface DocumentState {
  uri: string;
  vectorClock: VectorClock;
  content: string;
  lastModified: number;  // timestamp
}

export interface ConflictInfo {
  localContent: string;
  remoteContent: string;
  localVersion: VectorClock;
  remoteVersion: VectorClock;
  timestamp: number;
}

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  length?: number;
  content?: string;
  timestamp: number;
  clientId: string;
}

// Client IDs for vector clock
export const CLIENT_IDS = {
  EXTENSION: 'extension',
  WEBVIEW: 'webview',
  DISK: 'disk',
} as const;
```

### 2.4 Conflict Detection Algorithm

```typescript
// src/extension/documentState.ts

export class DocumentStateManager {
  private state: DocumentState;
  private pendingOps: Operation[] = [];
  private conflictInfo: ConflictInfo | null = null;
  
  constructor(uri: string, initialContent: string) {
    this.state = {
      uri,
      vectorClock: { [CLIENT_IDS.EXTENSION]: 0, [CLIENT_IDS.WEBVIEW]: 0 },
      content: initialContent,
      lastModified: Date.now(),
    };
  }

  /**
   * Called when webview sends local edits
   */
  applyLocalChange(op: Operation): void {
    op.clientId = CLIENT_IDS.WEBVIEW;
    op.timestamp = Date.now();
    op.id = this.generateOpId();
    
    this.incrementClock(CLIENT_IDS.WEBVIEW);
    this.pendingOps.push(op);
    this.applyOperation(op);
  }

  /**
   * Called when extension detects external file change
   */
  applyExternalChange(newContent: string, diskVersion: number): ConflictInfo | null {
    this.incrementClock(CLIENT_IDS.DISK);
    
    // Check for conflict: pending local changes + content differs
    const hasPendingLocalChanges = this.pendingOps.length > 0;
    const contentChanged = this.state.content !== newContent;
    
    if (hasPendingLocalChanges && contentChanged) {
      // CONFLICT DETECTED
      this.conflictInfo = {
        localContent: this.state.content,
        remoteContent: newContent,
        localVersion: { ...this.state.vectorClock },
        remoteVersion: { ...this.state.vectorClock },
        timestamp: Date.now(),
      };
      return this.conflictInfo;
    }
    
    // No conflict - accept external change
    this.state.content = newContent;
    this.pendingOps = [];  // Clear pending ops as they're now incorporated
    return null;
  }

  /**
   * Resolve conflict with user choice
   */
  resolveConflict(resolution: 'local' | 'remote' | 'merge', mergedContent?: string): void {
    switch (resolution) {
      case 'local':
        // Keep local changes, discard remote
        this.state.content = this.conflictInfo!.localContent;
        this.pendingOps = [];
        break;
      case 'remote':
        // Accept remote, discard local
        this.state.content = this.conflictInfo!.remoteContent;
        this.pendingOps = [];
        break;
      case 'merge':
        // User provided merged content
        this.state.content = mergedContent!;
        this.pendingOps = [];
        break;
    }
    this.conflictInfo = null;
    this.incrementClock(CLIENT_IDS.EXTENSION);
  }
}
```

### 2.5 Webview Integration

```typescript
// In editorProvider.ts

// Replace simple onDidChangeTextDocument handler
const docChangeSub = vscode.workspace.onDidChangeTextDocument(async (e) => {
  if (e.document.uri.toString() !== docKey) return;
  
  const newContent = e.document.getText();
  const conflict = this.docStateManager.applyExternalChange(
    newContent,
    e.document.version
  );
  
  if (conflict) {
    // Show conflict resolution UI instead of silent overwrite
    this.postMessage(webviewPanel, {
      type: 'conflictDetected',
      localContent: conflict.localContent,
      remoteContent: conflict.remoteContent,
      timestamp: conflict.timestamp,
    });
  } else {
    // No conflict - safe to update
    this.postMessage(webviewPanel, {
      type: 'contentChanged',
      content: newContent,
    });
  }
});
```

### 2.6 Conflict Resolution UI

```typescript
// New webview message type
interface ConflictResolutionMsg {
  type: 'resolveConflict';
  resolution: 'keepLocal' | 'acceptRemote' | 'showMerge';
}
```

**UI Flow**:
1. Conflict detected → Show non-modal banner in webview
2. User clicks banner → Open merge dialog
3. Merge dialog shows side-by-side diff with three options:
   - "Keep my changes" (local)
   - "Accept external changes" (remote)
   - "Edit manually" (opens merge editor)
4. User resolves → Send `resolveConflict` message to extension

---

## 3. Error Handling and Retry Policy

### 3.1 Circuit Breaker Pattern

Implement a circuit breaker for all background services:

```typescript
// src/extension/circuitBreaker.ts

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',          // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening (default: 5)
  successThreshold: number;      // Successes in half-open to close (default: 3)
  timeout: number;               // ms before half-open (default: 30000)
  monitorWindow: number;         // ms window for counting failures (default: 60000)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private failuresInWindow: number[] = [];
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG,
    private logger: Logger = console
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.updateState();
    
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(
        `Circuit ${this.name} is OPEN. Service unavailable.`
      );
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private updateState(): void {
    const now = Date.now();
    
    // Clean old failures outside monitoring window
    this.failuresInWindow = this.failuresInWindow.filter(
      t => now - t < this.config.monitorWindow
    );
    
    if (this.state === CircuitState.OPEN) {
      if (now - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.info(`Circuit ${this.name}: OPEN → HALF_OPEN`);
      }
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.failuresInWindow.length >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.logger.warn(`Circuit ${this.name}: HALF_OPEN → OPEN (too many failures)`);
      }
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.failuresInWindow = [];
        this.logger.info(`Circuit ${this.name}: HALF_OPEN → CLOSED`);
      }
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.failuresInWindow.push(Date.now());
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens
      this.state = CircuitState.OPEN;
      this.logger.warn(`Circuit ${this.name}: HALF_OPEN → OPEN (failure in test)`);
    } else if (this.failuresInWindow.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.logger.error(`Circuit ${this.name}: CLOSED → OPEN (threshold reached)`, error);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): CircuitMetrics {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failuresInWindow: this.failuresInWindow.length,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  monitorWindow: 60000,
};
```

### 3.2 Retry Policy with Exponential Backoff

```typescript
// src/extension/retryPolicy.ts

export interface RetryConfig {
  maxAttempts: number;        // default: 3
  initialDelayMs: number;    // default: 100
  maxDelayMs: number;        // default: 5000
  backoffMultiplier: number; // default: 2
  retryableErrors?: (error: Error) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

export class RetryPolicy {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error;
    let delay = this.config.initialDelayMs;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.config.retryableErrors && !this.config.retryableErrors(lastError)) {
          throw lastError;
        }
        
        // Don't wait after last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }
        
        // Notify about retry
        onRetry?.(attempt, delay, lastError);
        
        // Wait before retry
        await this.sleep(delay);
        
        // Exponential backoff
        delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelayMs);
      }
    }
    
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default retryable errors (transient failures)
export const DEFAULT_RETRYABLE_ERRORS = (error: Error): boolean => {
  // File system errors
  if (error.message.includes('ENOENT')) return true;  // File not found (temporary)
  if (error.message.includes('EACCES')) return true;  // Permission issues (temporary)
  if (error.message.includes('EBUSY')) return true;   // File busy (temporary)
  if (error.message.includes('ECONNRESET')) return true;  // Connection reset
  if (error.message.includes('ETIMEDOUT')) return true;  // Timeout
  
  // SQLite errors
  if (error.message.includes('SQLITE_BUSY')) return true;
  if (error.message.includes('SQLITE_LOCKED')) return true;
  
  return false;
};
```

### 3.3 Enhanced BacklinksIndex with Circuit Breaker

```typescript
// src/extension/backlinksIndex.ts (modified)

import { CircuitBreaker, CircuitState } from './circuitBreaker';
import { RetryPolicy, DEFAULT_RETRYABLE_ERRORS } from './retryPolicy';

export class BacklinksIndex {
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;
  private healthMetrics = {
    lastSuccess: 0,
    lastFailure: 0,
    consecutiveFailures: 0,
    totalOperations: 0,
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker('BacklinksIndex', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
    });
    
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 2000,
    });
  }

  public async updateIndex(): Promise<void> {
    this.healthMetrics.totalOperations++;
    
    try {
      await this.circuitBreaker.execute(async () => {
        await this.retryPolicy.execute(
          async () => {
            await this.doUpdateIndex();
          },
          (attempt, delay, error) => {
            console.warn(
              `BacklinksIndex update retry ${attempt}/${this.retryPolicy.config.maxAttempts} ` +
              `after ${delay}ms: ${error.message}`
            );
          }
        );
      });
      
      this.healthMetrics.lastSuccess = Date.now();
      this.healthMetrics.consecutiveFailures = 0;
    } catch (error) {
      this.healthMetrics.lastFailure = Date.now();
      this.healthMetrics.consecutiveFailures++;
      
      // Now error is properly propagated
      // Circuit breaker determines if we retry or fail fast
      const circuitState = this.circuitBreaker.getState();
      
      if (circuitState === CircuitState.OPEN) {
        throw new ServiceUnavailableError(
          'BacklinksIndex is temporarily unavailable. ' +
          `Circuit breaker is OPEN. Last failure: ${(error as Error).message}`,
          error as Error
        );
      }
      
      throw error;
    }
  }

  public getHealthStatus(): HealthStatus {
    return {
      service: 'BacklinksIndex',
      status: this.healthMetrics.consecutiveFailures === 0 ? 'healthy' : 'degraded',
      circuitState: this.circuitBreaker.getState(),
      metrics: this.healthMetrics,
      lastUpdated: Date.now(),
    };
  }
}
```

### 3.4 Error Handling in EditorProvider

Replace all 53+ silent catch blocks with proper error handling:

```typescript
// Pattern for all catch blocks in editorProvider.ts

// BEFORE (silent swallowing):
} catch (error) {
  console.error('Error updating backlinks index:', error);
}

// AFTER (proper error handling):
} catch (error) {
  const err = error as Error;
  console.error('[BacklinksIndex] Operation failed:', err.message);
  
  // Emit health metric
  healthMonitor.recordFailure('backlinksIndex', err);
  
  // Let circuit breaker decide if we should retry
  // Re-throw to let caller decide
  throw new OperationError('Failed to update backlinks index', err);
}
```

---

## 4. Database Migration Safety Mechanism

### 4.1 Migration Verification Strategy

Implement transactional migrations with verification:

```typescript
// src/extension/migration.ts

export interface MigrationStep {
  id: string;
  description: string;
  sql: string;
  verifySql?: string;  // Query to verify success
  rollbackSql?: string;
}

export interface Migration {
  version: number;
  description: string;
  steps: MigrationStep[];
}

export class MigrationManager {
  private db: Database;
  private context: vscode.ExtensionContext;
  
  // Migration definitions
  private static readonly MIGRATIONS: Migration[] = [
    {
      version: 1,
      description: 'Initial schema',
      steps: [
        {
          id: 'create_versions_table',
          description: 'Create versions table',
          sql: CREATE_VERSIONS_TABLE,
          verifySql: "SELECT name FROM sqlite_master WHERE type='table' AND name='versions'",
        },
        {
          id: 'create_document_index',
          description: 'Create document index',
          sql: CREATE_DOCUMENT_INDEX,
          verifySql: "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_documentId'",
        },
      ],
    },
    {
      version: 2,
      description: 'Add pinned column',
      steps: [
        {
          id: 'add_pinned_column',
          description: 'Add pinned column to versions',
          sql: ADD_PINNED_COLUMN,
          verifySql: "PRAGMA table_info(versions)",  // Will verify pinned exists in result
          rollbackSql: 'ALTER TABLE versions DROP COLUMN pinned',
        },
      ],
    },
  ];

  async runMigrations(): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentSchemaVersion();
    const results: MigrationStepResult[] = [];
    
    for (const migration of MigrationManager.MIGRATIONS) {
      if (migration.version <= currentVersion) continue;
      
      console.log(`[Migration] Running migration v${migration.version}: ${migration.description}`);
      
      // Create backup before migration
      await this.createBackup(migration.version);
      
      for (const step of migration.steps) {
        const stepResult = await this.executeStep(step);
        results.push(stepResult);
        
        if (!stepResult.success) {
          // Migration failed - attempt rollback
          await this.rollbackMigration(migration, results);
          return {
            success: false,
            currentVersion,
            targetVersion: migration.version,
            failedStep: step.id,
            error: stepResult.error,
            rollbackPerformed: true,
          };
        }
      }
      
      // Mark migration as complete
      await this.setSchemaVersion(migration.version);
    }
    
    return {
      success: true,
      currentVersion: this.getLatestVersion(),
      targetVersion: this.getLatestVersion(),
    };
  }

  private async executeStep(step: MigrationStep): Promise<MigrationStepResult> {
    try {
      // Execute the migration SQL
      this.db.run(step.sql);
      
      // Verify if verification query provided
      if (step.verifySql) {
        const verifyResult = this.db.exec(step.verifySql);
        
        if (!this.verifyStepSuccess(step, verifyResult)) {
          return {
            stepId: step.id,
            success: false,
            error: new Error(`Verification failed for step: ${step.description}`),
          };
        }
      }
      
      console.log(`[Migration] Step ${step.id} completed successfully`);
      return { stepId: step.id, success: true };
      
    } catch (error) {
      console.error(`[Migration] Step ${step.id} failed:`, error);
      return {
        stepId: step.id,
        success: false,
        error: error as Error,
      };
    }
  }

  private verifyStepSuccess(step: MigrationStep, result: QueryExecResult[]): boolean {
    // For pinned column verification
    if (step.id === 'add_pinned_column') {
      if (result.length === 0) return false;
      const columns = result[0].values.map(row => row[1] as string);
      return columns.includes('pinned');
    }
    
    // Default: check result has rows
    return result.length > 0 && result[0].values.length > 0;
  }

  private async rollbackMigration(
    migration: Migration,
    completedSteps: MigrationStepResult[]
  ): Promise<void> {
    console.warn(`[Migration] Rolling back migration v${migration.version}...`);
    
    // Execute rollback in reverse order
    const completedStepIds = completedSteps.map(r => r.stepId);
    
    for (const step of migration.steps.reverse()) {
      if (!completedStepIds.includes(step.id)) continue;
      
      if (step.rollbackSql) {
        try {
          this.db.run(step.rollbackSql);
          console.log(`[Migration] Rolled back step: ${step.id}`);
        } catch (error) {
          console.error(`[Migration] Rollback failed for step ${step.id}:`, error);
          // Continue rolling back other steps
        }
      }
    }
  }

  private async createBackup(version: number): Promise<string> {
    const backupDir = vscode.Uri.joinPath(
      vscode.Uri.file(this.context.globalStoragePath),
      'backups'
    );
    
    try {
      await vscode.workspace.fs.stat(backupDir);
    } catch {
      await vscode.workspace.fs.createDirectory(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = vscode.Uri.joinPath(
      backupDir,
      `version-history-v${version}-${timestamp}.db`
    );
    
    const data = this.db.export();
    await vscode.workspace.fs.writeFile(backupPath, new Uint8Array(data));
    
    console.log(`[Migration] Backup created: ${backupPath.fsPath}`);
    return backupPath.fsPath;
  }

  private async getCurrentSchemaVersion(): Promise<number> {
    try {
      const result = this.db.exec("SELECT value FROM metadata WHERE key='schema_version'");
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0] as number;
      }
    } catch {
      // metadata table doesn't exist, assume version 0
    }
    return 0;
  }

  private async setSchemaVersion(version: number): Promise<void> {
    // Ensure metadata table exists
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    this.db.run(
      "INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)",
      [version.toString()]
    );
  }

  private getLatestVersion(): number {
    return Math.max(...MigrationManager.MIGRATIONS.map(m => m.version));
  }
}

export interface MigrationResult {
  success: boolean;
  currentVersion: number;
  targetVersion: number;
  failedStep?: string;
  error?: Error;
  rollbackPerformed?: boolean;
}

export interface MigrationStepResult {
  stepId: string;
  success: boolean;
  error?: Error;
}
```

### 4.2 Enhanced VersionHistoryDb Integration

```typescript
// src/extension/versionHistoryDb.ts (modified)

export class VersionHistoryDatabase {
  private migrationManager: MigrationManager;
  
  async initialize(): Promise<boolean> {
    // ... existing initialization ...
    
    // Run migrations with verification
    const migrationResult = await this.migrationManager.runMigrations();
    
    if (!migrationResult.success) {
      console.error('[VersionHistory] Migration failed:', migrationResult.error);
      
      if (migrationResult.rollbackPerformed) {
        // Notify user that rollback occurred
        vscode.window.showWarningMessage(
          `Version history database migration failed and was rolled back. ` +
          `Error: ${migrationResult.error?.message}. ` +
          `Your data is safe but some features may be unavailable.`
        );
      }
      
      // Don't proceed with unverified schema
      return false;
    }
    
    // Verify final schema state
    if (!isSchemaValid(this.db)) {
      console.error('[VersionHistory] Post-migration schema validation failed');
      return false;
    }
    
    this.initialized = true;
    return true;
  }
}
```

---

## 5. Health Monitoring System

### 5.1 Health Monitor Architecture

```typescript
// src/extension/healthMonitor.ts

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  details?: Record<string, unknown>;
  lastUpdated: number;
}

export interface HealthMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  p99LatencyMs: number;
}

export interface HealthReport {
  timestamp: number;
  overallStatus: 'healthy' | 'degraded' | 'unavailable';
  services: Map<string, HealthStatus>;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  severity: 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class HealthMonitor {
  private services = new Map<string, ServiceHealth>();
  private alerts: HealthAlert[] = [];
  private alertHandlers: ((alert: HealthAlert) => void)[] = [];
  
  // Singleton for global access
  private static instance: HealthMonitor | null = null;
  
  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  registerService(name: string, service: { getHealthStatus: () => HealthStatus }): void {
    this.services.set(name, {
      name,
      healthGetter: service,
      status: 'unknown',
      lastCheck: 0,
    });
  }

  async checkAllServices(): Promise<HealthReport> {
    const results = new Map<string, HealthStatus>();
    const newAlerts: HealthAlert[] = [];
    
    for (const [name, service] of this.services) {
      try {
        const status = service.healthGetter();
        service.status = status.status;
        service.lastCheck = Date.now();
        results.set(name, status);
        
        // Check for status changes that need alerting
        if (status.status === 'unavailable' && service.status !== 'unavailable') {
          newAlerts.push({
            severity: 'error',
            service: name,
            message: `Service ${name} is now unavailable`,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        service.status = 'unavailable';
        results.set(name, {
          service: name,
          status: 'unavailable',
          lastUpdated: Date.now(),
        });
        
        newAlerts.push({
          severity: 'critical',
          service: name,
          message: `Health check failed for ${name}: ${(error as Error).message}`,
          timestamp: Date.now(),
        });
      }
    }
    
    // Add new alerts
    this.alerts.push(...newAlerts);
    newAlerts.forEach(alert => this.notifyAlertHandlers(alert));
    
    // Determine overall status
    const statuses = Array.from(results.values()).map(r => r.status);
    let overallStatus: HealthReport['overallStatus'] = 'healthy';
    if (statuses.includes('unavailable')) {
      overallStatus = 'unavailable';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }
    
    return {
      timestamp: Date.now(),
      overallStatus,
      services: results,
      alerts: this.alerts.slice(-100),  // Keep last 100 alerts
    };
  }

  onAlert(handler: (alert: HealthAlert) => void): () => void {
    this.alertHandlers.push(handler);
    return () => {
      this.alertHandlers = this.alertHandlers.filter(h => h !== handler);
    };
  }

  private notifyAlertHandlers(alert: HealthAlert): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('[HealthMonitor] Alert handler error:', error);
      }
    });
  }

  getRecentAlerts(count: number = 10): HealthAlert[] {
    return this.alerts.slice(-count);
  }
}

interface ServiceHealth {
  name: string;
  healthGetter: { getHealthStatus: () => HealthStatus };
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastCheck: number;
}
```

### 5.2 VS Code Status Bar Integration

```typescript
// src/extension/healthStatusBar.ts

export class HealthStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private healthMonitor = HealthMonitor.getInstance();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100  // Priority
    );
    this.statusBarItem.text = '$(loading) Htmly';
    this.statusBarItem.tooltip = 'Checking Htmly services...';
    this.statusBarItem.command = 'htmly.showHealthDashboard';
  }

  start(): void {
    this.statusBarItem.show();
    
    // Initial check
    this.update();
    
    // Periodic updates every 30 seconds
    this.updateInterval = setInterval(() => this.update(), 30000);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.statusBarItem.hide();
  }

  private async update(): Promise<void> {
    const report = await this.healthMonitor.checkAllServices();
    
    switch (report.overallStatus) {
      case 'healthy':
        this.statusBarItem.text = '$(check) Htmly';
        this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
        this.statusBarItem.tooltip = 'All Htmly services healthy';
        break;
      case 'degraded':
        this.statusBarItem.text = '$(warning) Htmly';
        this.statusBarItem.color = 'orange';
        this.statusBarItem.tooltip = 'Some Htmly services degraded. Click for details.';
        break;
      case 'unavailable':
        this.statusBarItem.text = '$(error) Htmly';
        this.statusBarItem.color = 'red';
        this.statusBarItem.tooltip = 'Htmly services unavailable. Click for details.';
        break;
    }
  }
}

// Register command to show detailed health dashboard
vscode.commands.registerCommand('htmly.showHealthDashboard', async () => {
  const report = await HealthMonitor.getInstance().checkAllServices();
  
  const items: vscode.QuickPickItem[] = [];
  
  // Service statuses
  for (const [name, status] of report.services) {
    const icon = status.status === 'healthy' ? '$(check)' : 
                 status.status === 'degraded' ? '$(warning)' : '$(error)';
    items.push({
      label: `${icon} ${name}`,
      description: status.status,
      detail: status.details ? JSON.stringify(status.details, null, 2) : undefined,
    });
  }
  
  // Recent alerts
  if (report.alerts.length > 0) {
    items.push({ label: '--- Recent Alerts ---', kind: vscode.QuickPickItemKind.Separator });
    for (const alert of report.alerts.slice(-5).reverse()) {
      items.push({
        label: `$(bell) ${alert.service}: ${alert.message}`,
        description: new Date(alert.timestamp).toLocaleTimeString(),
      });
    }
  }
  
  await vscode.window.showQuickPick(items, {
    title: 'Htmly Health Dashboard',
    placeHolder: 'Click a service for details',
  });
});
```

### 5.3 Service Registration

```typescript
// src/extension/extension.ts (modified)

import { HealthMonitor } from './healthMonitor';
import { HealthStatusBar } from './healthStatusBar';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize health monitoring
  const healthMonitor = HealthMonitor.getInstance();
  const statusBar = new HealthStatusBar();
  
  // Register services for health monitoring
  healthMonitor.registerService('BacklinksIndex', backlinksIndex);
  healthMonitor.registerService('VersionHistory', versionHistoryDb);
  
  // Start status bar updates
  statusBar.start();
  
  // Set up alert handler for critical issues
  const alertDisposal = healthMonitor.onAlert((alert) => {
    if (alert.severity === 'critical') {
      vscode.window.showErrorMessage(
        `[Htmly] Critical: ${alert.message}`,
        'Show Dashboard'
      ).then(selection => {
        if (selection === 'Show Dashboard') {
          vscode.commands.executeCommand('htmly.showHealthDashboard');
        }
      });
    }
  });
  
  context.subscriptions.push(alertDisposal);
  context.subscriptions.push({ dispose: () => statusBar.stop() });
}
```

---

## 6. Migration Strategy

### 6.1 Implementation Phases

| Week | Phase | Changes |
|------|-------|---------|
| **Week 1** | Foundation | Create `circuitBreaker.ts`, `retryPolicy.ts`, `healthMonitor.ts` |
| **Week 2** | Error Handling | Refactor backlinksIndex.ts with circuit breaker + retry |
| **Week 3** | Conflict Resolution | Implement `DocumentStateManager`, update editorProvider.ts |
| **Week 4** | Database Safety | Implement `MigrationManager`, update versionHistoryDb.ts |
| **Week 5** | Health UI | Status bar integration, health dashboard command |

### 6.2 Backward Compatibility

All changes maintain backward compatibility:
- New error types extend existing behavior
- Circuit breaker failures fall back to existing error-logging behavior
- Migration rollback preserves existing data
- Health monitoring is purely additive (no existing behavior removed)

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// test/circuitBreaker.test.ts

describe('CircuitBreaker', () => {
  it('should open after failure threshold', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3, ... });
    
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });
  
  it('should execute operation when closed', async () => {
    const cb = new CircuitBreaker('test');
    const result = await cb.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });
  
  it('should reject immediately when open', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, timeout: 10000 });
    await cb.execute(() => Promise.reject(new Error('fail')));
    
    await expect(cb.execute(() => Promise.resolve('success'))).rejects.toThrow(
      CircuitBreakerOpenError
    );
  });
});
```

### 7.2 Integration Tests

```typescript
// test/migration.test.ts

describe('MigrationManager', () => {
  it('should run all pending migrations', async () => {
    const manager = new MigrationManager(testDb, mockContext);
    const result = await manager.runMigrations();
    
    expect(result.success).toBe(true);
    expect(result.currentVersion).toBe(2);
  });
  
  it('should rollback on failure', async () => {
    // Setup: make second migration fail
    const manager = new MigrationManager(failingDb, mockContext);
    const result = await manager.runMigrations();
    
    expect(result.success).toBe(false);
    expect(result.rollbackPerformed).toBe(true);
  });
});
```

---

## 8. File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/extension/circuitBreaker.ts` | Create | Circuit breaker implementation |
| `src/extension/retryPolicy.ts` | Create | Retry with exponential backoff |
| `src/extension/documentState.ts` | Create | CRDT-based conflict resolution |
| `src/extension/migration.ts` | Create | Verified migration manager |
| `src/extension/healthMonitor.ts` | Create | Health monitoring system |
| `src/extension/healthStatusBar.ts` | Create | VS Code status bar integration |
| `src/extension/backlinksIndex.ts` | Modify | Add circuit breaker + retry |
| `src/extension/versionHistoryDb.ts` | Modify | Use MigrationManager |
| `src/extension/editorProvider.ts` | Modify | Add DocumentStateManager |
| `src/shared/types.ts` | Modify | Add conflict message types |

---

## 9. Goal Status

✅ **Complete** - Reliability improvements design document delivered

### Key Deliverables:
1. ✅ Conflict resolution strategy (CRDT-based with vector clocks)
2. ✅ Error handling and retry policy design (circuit breaker + exponential backoff)
3. ✅ Database migration safety mechanism (verification + rollback + backups)
4. ✅ Health monitoring system (HealthMonitor + status bar + dashboard command)

### Next Steps:
- Review design with team
- Prioritize implementation (recommend starting with circuit breaker + health monitoring)
- Begin Week 1 implementation
