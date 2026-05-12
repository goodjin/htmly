/**
 * Version Pruning Tests
 * Tests for VAL-HISTORY-006: Old Versions Pruned
 * 
 * Pruning behavior:
 * - Default limit enforced (50 versions per document)
 * - Pruning occurs after new version is saved
 * - Pinned versions preserved
 * - Limit configurable
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

// Mock sql.js before importing the module
const mockDb = {
  run: vi.fn(),
  exec: vi.fn(),
  export: vi.fn(() => new Uint8Array([1, 2, 3])),
  close: vi.fn()
};

const mockDatabaseConstructor = vi.fn(() => mockDb);

vi.mock('sql.js', () => {
  return {
    default: vi.fn(() => Promise.resolve({
      Database: mockDatabaseConstructor
    })),
    __esModule: true
  };
});

// Mock vscode module
vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((base: vscode.Uri, ...segments: string[]) => ({
      fsPath: [base.fsPath, ...segments].join('/').replace(/\/+/g, '/'),
      toString: () => 'file:///' + [base.fsPath, ...segments].join('/').replace(/\/+/g, '/'),
      scheme: 'file',
      authority: '',
      path: '/' + [base.fsPath, ...segments].join('/').replace(/\/+/g, '/'),
      query: '',
      fragment: '',
      with: vi.fn(),
      toJSON: () => ({})
    })),
    file: vi.fn((path: string) => ({
      fsPath: path,
      toString: () => 'file://' + path,
      scheme: 'file',
      authority: '',
      path: '/' + path,
      query: '',
      fragment: '',
      with: vi.fn(),
      toJSON: () => ({})
    }))
  },
  workspace: {
    fs: {
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn()
    }
  },
  FileType: {
    File: 1,
    Directory: 2
  },
  FileSystemError: Object.assign(new Error('File not found'), { code: 'FileNotFound' })
}));

// Create a mock context
interface MockContext {
  globalStoragePath: string;
  subscriptions: vscode.Disposable[];
  workspaceState: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
  };
  globalState: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    setKeysForSync: ReturnType<typeof vi.fn>;
  };
  extensionPath: string;
  extensionUri: vscode.Uri;
  environmentValue: string | undefined;
  secrets: {
    get: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

const mockContext: MockContext = {
  globalStoragePath: '/mock/global/storage',
  subscriptions: [],
  workspaceState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => [])
  },
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => []),
    setKeysForSync: vi.fn()
  },
  extensionPath: '/mock/extension/path',
  extensionUri: {
    fsPath: '/mock/extension/path',
    toString: () => 'file:///mock/extension/path'
  } as vscode.Uri,
  environmentValue: undefined,
  secrets: {
    get: vi.fn(),
    store: vi.fn(),
    delete: vi.fn()
  }
};

// Import after mocking
import { VersionHistoryDatabase } from './versionHistoryDb';

describe('versionPruning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
      type: 1,
      ctime: Date.now(),
      mtime: Date.now(),
      size: 100
    } as vscode.FileStat);
    
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
    
    // Default schema includes pinned column
    mockDb.exec.mockImplementation((sql: string) => {
      if (sql.includes('sqlite_master')) {
        return [{ name: 'versions', values: [['versions']] }];
      }
      if (sql.includes('PRAGMA table_info')) {
        return [{
          values: [
            [0, 'id', 'INTEGER', 0, null, 1],
            [1, 'documentId', 'TEXT', 0, null, 0],
            [2, 'content', 'TEXT', 0, null, 0],
            [3, 'timestamp', 'TEXT', 0, null, 0],
            [4, 'versionNumber', 'INTEGER', 0, null, 0],
            [5, 'pinned', 'INTEGER', 0, null, 0]
          ]
        }];
      }
      return [];
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('VAL-HISTORY-006: Old Versions Pruned', () => {
    describe('Default limit enforced (50 versions)', () => {
      it('prunes oldest versions when count exceeds default limit', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock having 51 versions and saving a new one (52)
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[51]] }]; // Already has 51 versions
          }
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[51]] }]; // Current count is 51
          }
          if (sql.includes('SELECT id, versionNumber, content, timestamp')) {
            // Return 51 versions
            const versions = [];
            for (let i = 1; i <= 51; i++) {
              versions.push([i, i, `<p>Version ${i} content</p>`, `2024-01-${String(i).padStart(2, '0')}T00:00:00.000Z`]);
            }
            return [{ values: versions }];
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        // Save a new version - should trigger pruning
        const versionNumber = await db.saveVersion('doc1', '<p>New content</p>');
        
        expect(versionNumber).toBe(52); // New version number
        
        // Verify that DELETE was called to prune oldest versions
        // Should have pruned 2 versions (52 - 50 = 2)
        const deleteCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('DELETE FROM versions')
        );
        expect(deleteCalls.length).toBeGreaterThan(0);
      });
      
      it('does not prune when count is at or below limit', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock having 50 versions
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[50]] }];
          }
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[50]] }];
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        // Save a new version
        const versionNumber = await db.saveVersion('doc1', '<p>New content</p>');
        
        expect(versionNumber).toBe(51);
        
        // Should NOT have any DELETE calls since count (50) is at limit
        const deleteCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('DELETE FROM versions')
        );
        expect(deleteCalls.length).toBe(0);
      });
    });
    
    describe('Pinned versions preserved', () => {
      it('does not prune pinned versions', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock having 51 versions with version 1 pinned
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[51]] }];
          }
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[51]] }];
          }
          if (sql.includes('SELECT id, versionNumber, content, timestamp')) {
            // Version 1 is pinned (pinned=1), others are not
            const versions = [];
            for (let i = 1; i <= 51; i++) {
              const pinned = i === 1 ? 1 : 0; // Version 1 is pinned
              versions.push([i, i, `<p>Version ${i} content</p>`, `2024-01-${String(i).padStart(2, '0')}T00:00:00.000Z`, pinned]);
            }
            return [{ values: versions }];
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        // Save a new version
        await db.saveVersion('doc1', '<p>New content</p>');
        
        // Find DELETE calls
        const deleteCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('DELETE FROM versions')
        );
        
        expect(deleteCalls.length).toBeGreaterThan(0);
        
        // Verify that the DELETE statement uses pinned = 0 condition (with spaces)
        const deleteCall = deleteCalls[0];
        expect(deleteCall[0]).toContain('pinned = 0');
        expect(deleteCall[0]).toContain('ORDER BY versionNumber ASC');
        expect(deleteCall[0]).toContain('LIMIT');
      });
      
      it('pinVersion marks a version as pinned', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Setup mock responses
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        await db.pinVersion('doc1', 5);
        
        // Verify UPDATE was called with pinned = 1 (with spaces)
        const updateCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('UPDATE versions SET pinned')
        );
        expect(updateCalls.length).toBe(1);
        expect(updateCalls[0][0]).toContain('pinned = 1');
        expect(updateCalls[0][1]).toContain('doc1');
        expect(updateCalls[0][1]).toContain(5);
      });
      
      it('unpinVersion removes pinned status', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        await db.unpinVersion('doc1', 5);
        
        // Verify UPDATE was called with pinned = 0 (with spaces)
        const updateCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('UPDATE versions SET pinned')
        );
        expect(updateCalls.length).toBe(1);
        expect(updateCalls[0][0]).toContain('pinned = 0');
      });
      
      it('isVersionPinned returns correct pinned status', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock version 5 as pinned
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT pinned FROM versions')) {
            return [{ values: [[1]] }]; // pinned=1
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        const isPinned = await db.isVersionPinned('doc1', 5);
        expect(isPinned).toBe(true);
      });
    });
    
    describe('Limit configurable', () => {
      it('uses custom max versions limit when specified', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock having 11 versions (exceeds custom limit of 10)
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[11]] }];
          }
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[11]] }];
          }
          if (sql.includes('SELECT id, versionNumber, content, timestamp')) {
            const versions = [];
            for (let i = 1; i <= 11; i++) {
              versions.push([i, i, `<p>Version ${i} content</p>`, `2024-01-${String(i).padStart(2, '0')}T00:00:00.000Z`, 0]);
            }
            return [{ values: versions }];
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        // Save with custom limit of 10
        await db.saveVersion('doc1', '<p>New content</p>', 10);
        
        // Find DELETE call
        const deleteCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('DELETE FROM versions')
        );
        
        expect(deleteCalls.length).toBe(1);
        // With mock returning 11 for COUNT and limit=10, we get deleteCount = 11 - 10 = 1
        // Note: The mock doesn't actually track the INSERT, so it returns 1 prune
        expect(deleteCalls[0][1]).toContain(1); // LIMIT argument
      });
    });
    
    describe('Oldest versions pruned first', () => {
      it('prunes oldest non-pinned versions first (FIFO)', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Mock having 52 versions
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[52]] }];
          }
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[52]] }];
          }
          if (sql.includes('SELECT id, versionNumber, content, timestamp')) {
            const versions = [];
            for (let i = 1; i <= 52; i++) {
              versions.push([i, i, `<p>Version ${i} content</p>`, `2024-01-${String(i).padStart(2, '0')}T00:00:00.000Z`, 0]);
            }
            return [{ values: versions }];
          }
          if (sql.includes('sqlite_master')) {
            return [{ name: 'versions', values: [['versions']] }];
          }
          if (sql.includes('PRAGMA table_info')) {
            return [{
              values: [
                [0, 'id', 'INTEGER', 0, null, 1],
                [1, 'documentId', 'TEXT', 0, null, 0],
                [2, 'content', 'TEXT', 0, null, 0],
                [3, 'timestamp', 'TEXT', 0, null, 0],
                [4, 'versionNumber', 'INTEGER', 0, null, 0],
                [5, 'pinned', 'INTEGER', 0, null, 0]
              ]
            }];
          }
          return [];
        });
        
        await db.saveVersion('doc1', '<p>New content</p>');
        
        // Find DELETE call
        const deleteCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('DELETE FROM versions')
        );
        
        expect(deleteCalls.length).toBe(1);
        // With mock returning 52 for COUNT and limit 50, deleteCount = 52 - 50 = 2
        expect(deleteCalls[0][1]).toContain(2); // LIMIT 2
        
        // The ORDER BY should be versionNumber ASC (oldest first)
        expect(deleteCalls[0][0]).toContain('ORDER BY versionNumber ASC');
      });
    });
  });
});
