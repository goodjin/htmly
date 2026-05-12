/**
 * Test for Version History Database
 * Tests database initialization, schema creation, and basic operations
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

// Mock vscode module - define FileType inline to avoid hoisting issues
vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((base: any, ...segments: string[]) => ({
      fsPath: [base.fsPath || base.path || base.toString(), ...segments].join('/').replace(/\/+/g, '/'),
      toString: () => 'file:///' + [base.fsPath || base.path || base.toString(), ...segments].join('/').replace(/\/+/g, '/'),
      scheme: 'file',
      authority: '',
      path: '/' + [base.fsPath || base.path || base.toString(), ...segments].join('/').replace(/\/+/g, '/'),
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
const mockContext = {
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
  },
  environmentValue: undefined,
  secrets: {
    get: vi.fn(),
    store: vi.fn(),
    delete: vi.fn()
  }
};

// Import after mocking
import { VersionHistoryDatabase, getVersionHistoryDb, initializeVersionHistory } from './versionHistoryDb';

describe('versionHistoryDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('VersionHistoryDatabase', () => {
    describe('initialization', () => {
      it('creates database instance', () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        expect(db).toBeDefined();
        expect(db.isInitialized()).toBe(false);
      });
      
      it('reports not initialized initially', () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        expect(db.isInitialized()).toBe(false);
      });
      
      it('throws error when accessing uninitialized database', () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        expect(() => db.getNextVersionNumber('doc1')).toThrow('Database not initialized');
      });
    });
    
    describe('after initialization', () => {
      beforeEach(() => {
        // Mock successful file stat (file exists scenario)
        (vscode.workspace.fs.stat as any).mockResolvedValue({
          type: 1,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100
        });
        
        (vscode.workspace.fs.readFile as any).mockResolvedValue(new Uint8Array([1, 2, 3]));
        
        // Setup mock db responses for schema validation
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
      
      it('initializes database successfully', async () => {
        const db = new VersionHistoryDatabase(mockContext as any);
        const result = await db.initialize();
        
        expect(result).toBe(true);
        expect(db.isInitialized()).toBe(true);
      });
      
      it('creates versions table on new database', async () => {
        // Mock file not found scenario
        (vscode.workspace.fs.stat as any).mockRejectedValue(
          Object.assign(new Error('File not found'), { code: 'FileNotFound' })
        );
        
        (vscode.workspace.fs.createDirectory as any).mockResolvedValue(undefined);
        (vscode.workspace.fs.writeFile as any).mockResolvedValue(undefined);
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Verify CREATE TABLE was called
        expect(mockDb.run).toHaveBeenCalled();
        const createCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('CREATE TABLE')
        );
        expect(createCalls.length).toBeGreaterThan(0);
      });
      
      it('creates index on documentId', async () => {
        // Mock file not found scenario
        (vscode.workspace.fs.stat as any).mockRejectedValue(
          Object.assign(new Error('File not found'), { code: 'FileNotFound' })
        );
        
        (vscode.workspace.fs.createDirectory as any).mockResolvedValue(undefined);
        (vscode.workspace.fs.writeFile as any).mockResolvedValue(undefined);
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        // Verify CREATE INDEX was called
        expect(mockDb.run).toHaveBeenCalled();
        const indexCalls = (mockDb.run as any).mock.calls.filter(
          (call: any[]) => call[0].includes('CREATE INDEX')
        );
        expect(indexCalls.length).toBeGreaterThan(0);
      });
      
      it('saves database after creation', async () => {
        // Mock file not found scenario
        (vscode.workspace.fs.stat as any).mockRejectedValue(
          Object.assign(new Error('File not found'), { code: 'FileNotFound' })
        );
        
        (vscode.workspace.fs.createDirectory as any).mockResolvedValue(undefined);
        (vscode.workspace.fs.writeFile as any).mockResolvedValue(undefined);
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
      });
    });
    
    describe('operations after initialization', () => {
      beforeEach(async () => {
        // Setup successful initialization
        (vscode.workspace.fs.stat as any).mockResolvedValue({
          type: 1,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100
        });
        
        (vscode.workspace.fs.readFile as any).mockResolvedValue(new Uint8Array([1, 2, 3]));
        (vscode.workspace.fs.writeFile as any).mockResolvedValue(undefined);
        
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
          return [];
        });
      });
      
      it('getNextVersionNumber returns 1 for new document', async () => {
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[null]] }];
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
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        const nextNum = db.getNextVersionNumber('new-doc');
        expect(nextNum).toBe(1);
      });
      
      it('getNextVersionNumber increments for existing document', async () => {
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[5]] }];
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
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        const nextNum = db.getNextVersionNumber('existing-doc');
        expect(nextNum).toBe(6);
      });
      
      it('getVersionCount returns correct count', async () => {
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT COUNT')) {
            return [{ values: [[10]] }];
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
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        const count = db.getVersionCount('doc1');
        expect(count).toBe(10);
      });
      
      it('getVersions returns versions for document', async () => {
        const mockVersions = [
          [1, 2, 'content1', '2024-01-01T00:00:00.000Z'],
          [2, 1, 'content0', '2024-01-01T00:00:00.000Z']
        ];
        
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT id, versionNumber, content, timestamp')) {
            return [{ values: mockVersions }];
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
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        const versions = db.getVersions('doc1');
        expect(versions).toHaveLength(2);
        expect(versions[0].versionNumber).toBe(2);
        expect(versions[1].versionNumber).toBe(1);
      });
      
      it('saveVersion inserts new version', async () => {
        mockDb.exec.mockImplementation((sql: string) => {
          if (sql.includes('SELECT MAX')) {
            return [{ values: [[0]] }];
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
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        const versionNumber = await db.saveVersion('doc1', '<p>Test content</p>');
        
        expect(versionNumber).toBe(1);
        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO versions'),
          expect.arrayContaining(['doc1', '<p>Test content</p>', expect.any(String), 1])
        );
        expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
      });
      
      it('close clears initialized state', async () => {
        // Setup successful initialization
        (vscode.workspace.fs.stat as any).mockResolvedValue({
          type: 1,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100
        });
        
        const db = new VersionHistoryDatabase(mockContext as any);
        await db.initialize();
        
        expect(db.isInitialized()).toBe(true);
        
        db.close();
        
        expect(db.isInitialized()).toBe(false);
        expect(mockDb.close).toHaveBeenCalled();
      });
    });
  });
  
  describe('getVersionHistoryDb (singleton)', () => {
    it('returns same instance on multiple calls', () => {
      const db1 = getVersionHistoryDb(mockContext as any);
      const db2 = getVersionHistoryDb(mockContext as any);
      
      expect(db1).toBe(db2);
    });
  });
  
  describe('initializeVersionHistory', () => {
    beforeEach(() => {
      // Setup successful initialization
      (vscode.workspace.fs.stat as any).mockResolvedValue({
        type: 1,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100
      });
      
      (vscode.workspace.fs.readFile as any).mockResolvedValue(new Uint8Array([1, 2, 3]));
      
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
        return [];
      });
    });
    
    it('initializes and returns true', async () => {
      const result = await initializeVersionHistory(mockContext as any);
      
      expect(result).toBe(true);
    });
  });
});
