/**
 * Version History Database Module
 * 
 * Manages document version history using sql.js (SQLite WASM).
 * Database is stored in the extension's globalStoragePath.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

const DB_FILE_NAME = 'version-history.db';

// Default maximum versions per document
const DEFAULT_MAX_VERSIONS = 50;

// Schema SQL for the versions table (with pinned column)
const CREATE_VERSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY,
  documentId TEXT NOT NULL,
  content TEXT,
  timestamp TEXT NOT NULL,
  versionNumber INTEGER NOT NULL,
  pinned INTEGER DEFAULT 0
);
`;

// Migration SQL to add pinned column to existing databases
const ADD_PINNED_COLUMN = `
ALTER TABLE versions ADD COLUMN pinned INTEGER DEFAULT 0;
`;

// Schema SQL for index on documentId
const CREATE_DOCUMENT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_documentId ON versions(documentId);
`;

/**
 * Get the database file path in global storage
 */
function getDatabasePath(context: vscode.ExtensionContext): vscode.Uri {
  // globalStoragePath is a string in @types/vscode, convert to Uri
  const storageUri = vscode.Uri.file(context.globalStoragePath);
  return vscode.Uri.joinPath(storageUri, DB_FILE_NAME);
}

/**
 * Initialize the SQL.js module
 * WASM file is bundled in dist/extension/ by build:extension script
 */
async function initializeSqlJs(context: vscode.ExtensionContext): Promise<SqlJsStatic> {
  // context unused - WASM is loaded from bundled file, not from node_modules
  void context;
  
  const wasmPath = path.join(__dirname, 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  
  // @ts-expect-error - sql.js types are incomplete, wasmBinary is supported at runtime
  return await initSqlJs({ wasmBinary });
}

/**
 * Load existing database from global storage or create new one
 */
async function loadOrCreateDatabase(
  context: vscode.ExtensionContext,
  SQL: SqlJsStatic
): Promise<Database> {
  const dbPath = getDatabasePath(context);
  
  try {
    // Check if database file exists
    const fileInfo = await vscode.workspace.fs.stat(dbPath);
    if (fileInfo.type === vscode.FileType.File) {
      // Load existing database
      const fileData = await vscode.workspace.fs.readFile(dbPath);
      const db = new SQL.Database(fileData);
      console.log('[VersionHistory] Database loaded from:', dbPath.fsPath);
      return db;
    }
  } catch (error) {
    // File doesn't exist, create new database
    if ((error as vscode.FileSystemError).code === 'FileNotFound') {
      console.log('[VersionHistory] Creating new database at:', dbPath.fsPath);
    } else {
      throw error;
    }
  }
  
  // Create new database with schema
  const db = new SQL.Database();
  db.run(CREATE_VERSIONS_TABLE);
  db.run(CREATE_DOCUMENT_INDEX);
  
  // Save to global storage
  await saveDatabase(context, db);
  
  console.log('[VersionHistory] New database created with schema at:', dbPath.fsPath);
  return db;
}

/**
 * Save database to global storage
 */
async function saveDatabase(context: vscode.ExtensionContext, db: Database): Promise<void> {
  const dbPath = getDatabasePath(context);
  
  // Ensure directory exists - globalStoragePath is a string, convert to Uri
  const dirUri = vscode.Uri.file(context.globalStoragePath);
  try {
    await vscode.workspace.fs.stat(dirUri);
  } catch {
    await vscode.workspace.fs.createDirectory(dirUri);
  }
  
  // Export database to binary
  const data = db.export();
  const uint8Array = new Uint8Array(data);
  
  // Write to file
  await vscode.workspace.fs.writeFile(dbPath, uint8Array);
  console.log('[VersionHistory] Database saved to:', dbPath.fsPath);
}

/**
 * Check if the database schema exists and is valid
 */
function isSchemaValid(db: Database): boolean {
  try {
    // Check if versions table exists
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='versions'");
    if (result.length === 0 || result[0].values.length === 0) {
      return false;
    }
    
    // Check for required columns
    const columnsResult = db.exec("PRAGMA table_info(versions)");
    if (columnsResult.length === 0) {
      return false;
    }
    
    const columns = columnsResult[0].values.map(row => row[1] as string);
    const requiredColumns = ['id', 'documentId', 'content', 'timestamp', 'versionNumber'];
    const hasAllRequiredColumns = requiredColumns.every(col => columns.includes(col));
    
    // For backward compatibility: check if pinned column exists, if not, add it
    if (hasAllRequiredColumns && !columns.includes('pinned')) {
      try {
        db.run(ADD_PINNED_COLUMN);
        console.log('[VersionHistory] Added pinned column to existing database');
      } catch {
        // Column might already exist or other error, continue
      }
    }
    
    return hasAllRequiredColumns;
  } catch {
    return false;
  }
}

/**
 * Version History Database class
 * Provides methods for managing document version history
 */
export class VersionHistoryDatabase {
  private db: Database | null = null;
  private context: vscode.ExtensionContext;
  private initialized: boolean = false;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  /**
   * Initialize the database - must be called before any other operations
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Ensure global storage directory exists - globalStoragePath is a string, convert to Uri
      const storageUri = vscode.Uri.file(this.context.globalStoragePath);
      try {
        await vscode.workspace.fs.stat(storageUri);
      } catch {
        await vscode.workspace.fs.createDirectory(storageUri);
        console.log('[VersionHistory] Created global storage directory:', storageUri.fsPath);
      }
      
      // Initialize SQL.js
      const SQL = await initializeSqlJs(this.context);
      
      // Load or create database
      this.db = await loadOrCreateDatabase(this.context, SQL);
      
      // Verify schema is valid, recreate if not
      if (!isSchemaValid(this.db)) {
        console.log('[VersionHistory] Schema invalid, recreating database...');
        this.db.close();
        
        // Delete and recreate
        const dbPath = getDatabasePath(this.context);
        try {
          await vscode.workspace.fs.delete(dbPath);
        } catch {
          // Ignore if doesn't exist
        }
        
        this.db = new SQL.Database();
        this.db.run(CREATE_VERSIONS_TABLE);
        this.db.run(CREATE_DOCUMENT_INDEX);
        await saveDatabase(this.context, this.db);
      }
      
      this.initialized = true;
      console.log('[VersionHistory] Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[VersionHistory] Failed to initialize database:', error);
      return false;
    }
  }
  
  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[VersionHistory] Database closed');
    }
  }
  
  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }
  
  /**
   * Get the next version number for a document
   */
  getNextVersionNumber(documentId: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT MAX(versionNumber) FROM versions WHERE documentId = ?',
      [documentId]
    );
    
    if (result.length === 0 || result[0].values[0][0] === null) {
      return 1;
    }
    
    return (result[0].values[0][0] as number) + 1;
  }
  
  /**
   * Get the current latest version for a document
   */
  getLatestVersion(documentId: string): { versionNumber: number; timestamp: string } | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT versionNumber, timestamp FROM versions WHERE documentId = ? ORDER BY versionNumber DESC LIMIT 1',
      [documentId]
    );
    
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }
    
    return {
      versionNumber: result[0].values[0][0] as number,
      timestamp: result[0].values[0][1] as string
    };
  }
  
  /**
   * Get all versions for a document
   */
  getVersions(documentId: string): Array<{ id: number; versionNumber: number; content: string | null; timestamp: string; pinned: boolean }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT id, versionNumber, content, timestamp, pinned FROM versions WHERE documentId = ? ORDER BY versionNumber DESC',
      [documentId]
    );
    
    if (result.length === 0) {
      return [];
    }
    
    return result[0].values.map(row => ({
      id: row[0] as number,
      versionNumber: row[1] as number,
      content: row[2] as string | null,
      timestamp: row[3] as string,
      pinned: (row[4] as number) === 1
    }));
  }
  
  /**
   * Get a specific version
   */
  getVersion(documentId: string, versionNumber: number): { id: number; versionNumber: number; content: string | null; timestamp: string; pinned: boolean } | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT id, content, timestamp, pinned FROM versions WHERE documentId = ? AND versionNumber = ?',
      [documentId, versionNumber]
    );
    
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }
    
    return {
      id: result[0].values[0][0] as number,
      versionNumber: versionNumber,
      content: result[0].values[0][1] as string | null,
      timestamp: result[0].values[0][2] as string,
      pinned: (result[0].values[0][3] as number) === 1
    };
  }
  
  /**
   * Save a new version (called when document is saved)
   * Automatically prunes old versions if they exceed the maxVersions limit
   */
  async saveVersion(documentId: string, content: string, maxVersions?: number): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const versionNumber = this.getNextVersionNumber(documentId);
    const timestamp = new Date().toISOString();
    
    this.db.run(
      'INSERT INTO versions (documentId, content, timestamp, versionNumber, pinned) VALUES (?, ?, ?, ?, 0)',
      [documentId, content, timestamp, versionNumber]
    );
    
    await this.persist();
    
    // Prune old versions after saving
    await this.pruneVersions(documentId, maxVersions);
    
    console.log(`[VersionHistory] Saved version ${versionNumber} for document: ${documentId}`);
    return versionNumber;
  }
  
  /**
   * Delete all versions for a document
   */
  async deleteVersions(documentId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    this.db.run('DELETE FROM versions WHERE documentId = ?', [documentId]);
    await this.persist();
    
    console.log(`[VersionHistory] Deleted all versions for document: ${documentId}`);
  }
  
  /**
   * Persist database to storage
   */
  private async persist(): Promise<void> {
    if (this.db) {
      await saveDatabase(this.context, this.db);
    }
  }
  
  /**
   * Get version count for a document
   */
  getVersionCount(documentId: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT COUNT(*) FROM versions WHERE documentId = ?',
      [documentId]
    );
    
    if (result.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  }
  
  /**
   * Get total number of versions across all documents
   */
  getTotalVersionCount(): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec('SELECT COUNT(*) FROM versions');
    
    if (result.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  }
  
  /**
   * Get all document IDs with versions
   */
  getAllDocumentIds(): string[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec('SELECT DISTINCT documentId FROM versions ORDER BY documentId');
    
    if (result.length === 0) {
      return [];
    }
    
    return result[0].values.map(row => row[0] as string);
  }
  
  /**
   * Pin a specific version to prevent it from being pruned
   */
  async pinVersion(documentId: string, versionNumber: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    this.db.run(
      'UPDATE versions SET pinned = 1 WHERE documentId = ? AND versionNumber = ?',
      [documentId, versionNumber]
    );
    
    await this.persist();
    console.log(`[VersionHistory] Pinned version ${versionNumber} for document: ${documentId}`);
  }
  
  /**
   * Unpin a version to allow it to be pruned again
   */
  async unpinVersion(documentId: string, versionNumber: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    this.db.run(
      'UPDATE versions SET pinned = 0 WHERE documentId = ? AND versionNumber = ?',
      [documentId, versionNumber]
    );
    
    await this.persist();
    console.log(`[VersionHistory] Unpinned version ${versionNumber} for document: ${documentId}`);
  }
  
  /**
   * Check if a specific version is pinned
   */
  async isVersionPinned(documentId: string, versionNumber: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const result = this.db.exec(
      'SELECT pinned FROM versions WHERE documentId = ? AND versionNumber = ?',
      [documentId, versionNumber]
    );
    
    if (result.length === 0 || result[0].values.length === 0) {
      return false;
    }
    
    const pinnedValue = result[0].values[0][0];
    return pinnedValue === 1 || pinnedValue === true;
  }
  
  /**
   * Prune oldest non-pinned versions if they exceed the maxVersions limit
   * Default limit is 50 versions per document
   */
  async pruneVersions(documentId: string, maxVersions?: number): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const limit = maxVersions ?? DEFAULT_MAX_VERSIONS;
    const currentCount = this.getVersionCount(documentId);
    
    // If we're at or below the limit, nothing to prune
    if (currentCount <= limit) {
      return 0;
    }
    
    // Calculate how many versions to delete
    const deleteCount = currentCount - limit;
    
    // Delete oldest non-pinned versions first
    // ORDER BY versionNumber ASC = oldest first
    // LIMIT ensures we only delete as many as needed
    this.db.run(
      `DELETE FROM versions WHERE id IN (
        SELECT id FROM versions 
        WHERE documentId = ? AND pinned = 0 
        ORDER BY versionNumber ASC 
        LIMIT ?
      )`,
      [documentId, deleteCount]
    );
    
    await this.persist();
    
    console.log(`[VersionHistory] Pruned ${deleteCount} versions for document: ${documentId} (limit: ${limit})`);
    return deleteCount;
  }
}

// Singleton instance storage
let dbInstance: VersionHistoryDatabase | null = null;

/**
 * Get the singleton database instance
 */
export function getVersionHistoryDb(context: vscode.ExtensionContext): VersionHistoryDatabase {
  if (!dbInstance) {
    dbInstance = new VersionHistoryDatabase(context);
  }
  return dbInstance;
}

/**
 * Initialize the version history database
 * Convenience function that creates and initializes the singleton
 */
export async function initializeVersionHistory(context: vscode.ExtensionContext): Promise<boolean> {
  const db = getVersionHistoryDb(context);
  return await db.initialize();
}
