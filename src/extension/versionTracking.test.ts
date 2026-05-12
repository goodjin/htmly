/**
 * Version Tracking Tests
 * Tests that version history is created on document save
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

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
    },
    onDidSaveTextDocument: vi.fn()
  },
  FileType: {
    File: 1,
    Directory: 2
  },
  FileSystemError: Object.assign(new Error('File not found'), { code: 'FileNotFound' })
}));

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
import { 
  VersionHistoryDatabase, 
  initializeVersionHistory 
} from './versionHistoryDb';

describe('versionTracking', () => {
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
            [4, 'versionNumber', 'INTEGER', 0, null, 0]
          ]
        }];
      }
      if (sql.includes('SELECT MAX')) {
        return [{ values: [[null]] }];
      }
      if (sql.includes('SELECT COUNT')) {
        return [{ values: [[0]] }];
      }
      return [];
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('VAL-HISTORY-002: Version Saved on Save', () => {
    it('creates a new version entry when document is saved', async () => {
      // Initialize database
      const db = new VersionHistoryDatabase(mockContext);
      await db.initialize();
      
      // Reset exec mock for version operations
      mockDb.exec.mockImplementation((sql: string) => {
        if (sql.includes('SELECT MAX')) {
          return [{ values: [[null]] }]; // No previous versions
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
              [4, 'versionNumber', 'INTEGER', 0, null, 0]
            ]
          }];
        }
        return [];
      });
      
      // Save a version (simulating what happens on document save)
      const documentId = 'file:///test/document.html';
      const content = '<html><body>Test content</body></html>';
      
      const versionNumber = await db.saveVersion(documentId, content);
      
      // Verify version was created with version number 1
      expect(versionNumber).toBe(1);
      
      // Verify INSERT was called with correct parameters
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO versions'),
        expect.arrayContaining([
          documentId,
          content,
          expect.any(String), // timestamp
          1 // version number
        ])
      );
      
      // Verify database was persisted after save
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
    });
    
    it('increments version number for subsequent saves', async () => {
      const db = new VersionHistoryDatabase(mockContext);
      await db.initialize();
      
      // Simulate existing versions
      mockDb.exec.mockImplementation((sql: string) => {
        if (sql.includes('SELECT MAX')) {
          return [{ values: [[2]] }]; // Already has version 2
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
              [4, 'versionNumber', 'INTEGER', 0, null, 0]
            ]
          }];
        }
        return [];
      });
      
      // Save next version
      const versionNumber = await db.saveVersion('doc-id', 'New content');
      
      // Should be version 3 (2 + 1)
      expect(versionNumber).toBe(3);
    });
    
    it('records timestamp when version is saved', async () => {
      const db = new VersionHistoryDatabase(mockContext);
      await db.initialize();
      
      // Capture the timestamp that was passed
      let capturedTimestamp: string | null = null;
      mockDb.run.mockImplementation((sql: string, params: (string | number | null)[]) => {
        if (sql.includes('INSERT INTO versions')) {
          capturedTimestamp = params[2] as string; // timestamp is 3rd parameter
        }
      });
      
      const beforeSave = new Date().toISOString();
      await db.saveVersion('doc-id', 'content');
      const afterSave = new Date().toISOString();
      
      // Verify timestamp is valid ISO string and within expected range
      expect(capturedTimestamp).toBeTruthy();
      const timestamp = new Date(capturedTimestamp!);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(new Date(beforeSave).getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(new Date(afterSave).getTime() + 1000);
    });
    
    it('stores full content snapshot (not just diff)', async () => {
      const db = new VersionHistoryDatabase(mockContext);
      await db.initialize();
      
      const testContent = '<html><body><h1>Full Content Snapshot</h1><p>All content here</p></body></html>';
      
      let storedContent: string | null = null;
      mockDb.run.mockImplementation((sql: string, params: (string | number | null)[]) => {
        if (sql.includes('INSERT INTO versions')) {
          storedContent = params[1] as string; // content is 2nd parameter
        }
      });
      
      await db.saveVersion('doc-id', testContent);
      
      // Verify full content was stored
      expect(storedContent).toBe(testContent);
    });
    
    it('getLatestVersion returns most recent version info', async () => {
      const db = new VersionHistoryDatabase(mockContext);
      await db.initialize();
      
      // Mock version query
      mockDb.exec.mockImplementation((sql: string) => {
        if (sql.includes('ORDER BY versionNumber DESC LIMIT 1')) {
          return [{ values: [[5, '2024-01-15T10:30:00.000Z']] }];
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
              [4, 'versionNumber', 'INTEGER', 0, null, 0]
            ]
          }];
        }
        return [];
      });
      
      const latest = db.getLatestVersion('doc-id');
      
      expect(latest).not.toBeNull();
      expect(latest?.versionNumber).toBe(5);
      expect(latest?.timestamp).toBe('2024-01-15T10:30:00.000Z');
    });
  });
  
  describe('initializeVersionHistory', () => {
    it('initializes database on extension activation', async () => {
      const result = await initializeVersionHistory(mockContext);
      
      expect(result).toBe(true);
      expect(vscode.workspace.fs.stat).toHaveBeenCalled();
    });
  });
});
