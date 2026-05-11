/**
 * User Snippet Storage
 * 
 * Handles CRUD operations for user-defined snippets stored in .htmly/snippets/
 */

import * as vscode from 'vscode';
import { SnippetCategory } from '../shared/types';

// Snippet storage directory
export const SNIPPETS_DIR = '.htmly/snippets';

// Snippet metadata stored in HTML comments at the top of the file
interface SnippetMetadata {
  id: string;
  name: string;
  category: SnippetCategory;
  description?: string;
  preview?: string;
  createdAt: number;
  modifiedAt: number;
}

/**
 * Full snippet with content
 */
export interface UserSnippet extends SnippetMetadata {
  html: string;
}

/**
 * Get the snippets directory URI for the workspace
 */
async function getSnippetsDirUri(): Promise<vscode.Uri | null> {
  // Use the first workspace folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }
  
  const workspaceRoot = workspaceFolders[0].uri;
  return vscode.Uri.joinPath(workspaceRoot, SNIPPETS_DIR);
}

/**
 * Ensure the snippets directory exists
 */
async function ensureSnippetsDir(): Promise<vscode.Uri | null> {
  const snippetsDir = await getSnippetsDirUri();
  if (!snippetsDir) {
    return null;
  }
  
  try {
    await vscode.workspace.fs.createDirectory(snippetsDir);
    return snippetsDir;
  } catch (error) {
    // Directory might already exist
    return snippetsDir;
  }
}

/**
 * Generate a unique ID for a snippet
 */
function generateSnippetId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const timestamp = Date.now().toString(36);
  return `${sanitized}-${timestamp}`;
}

/**
 * Sanitize filename for the filesystem
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Create metadata comment block for snippet HTML
 */
function createMetadataComment(metadata: SnippetMetadata): string {
  return `<!-- snippet: ${JSON.stringify({
    id: metadata.id,
    name: metadata.name,
    category: metadata.category,
    description: metadata.description,
    preview: metadata.preview,
    createdAt: metadata.createdAt,
    modifiedAt: metadata.modifiedAt
  })} -->\n`;
}

/**
 * Parse metadata from snippet HTML content
 */
function parseMetadata(content: string): Partial<SnippetMetadata> | null {
  const match = content.match(/<!--\s*snippet:\s*(\{[^}]+\})\s*-->/i);
  if (!match) {
    return null;
  }
  
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Save a new snippet or update existing
 */
export async function saveSnippet(options: {
  name: string;
  category: SnippetCategory;
  html: string;
  description?: string;
  preview?: string;
  existingId?: string;
}): Promise<{ success: boolean; snippet?: UserSnippet; error?: string }> {
  const snippetsDir = await ensureSnippetsDir();
  if (!snippetsDir) {
    return { success: false, error: 'No workspace folder open' };
  }
  
  try {
    const id = options.existingId || generateSnippetId(options.name);
    const now = Date.now();
    const existingSnippets = await listSnippets();
    const existingSnippet = existingSnippets.find(s => s.id === id);
    
    const metadata: SnippetMetadata = {
      id,
      name: options.name,
      category: options.category,
      description: options.description,
      preview: options.preview,
      createdAt: existingSnippet?.createdAt || now,
      modifiedAt: now
    };
    
    // Wrap content with metadata
    const contentWithMeta = createMetadataComment(metadata) + options.html;
    
    // Save to file
    const fileName = `${sanitizeFilename(options.name)}-${id.substring(id.lastIndexOf('-'))}.html`;
    const fileUri = vscode.Uri.joinPath(snippetsDir, fileName);
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(contentWithMeta));
    
    return {
      success: true,
      snippet: {
        ...metadata,
        html: options.html
      }
    };
  } catch (error) {
    return { success: false, error: `Failed to save snippet: ${error}` };
  }
}

/**
 * List all user snippets
 */
export async function listSnippets(): Promise<UserSnippet[]> {
  const snippetsDir = await getSnippetsDirUri();
  if (!snippetsDir) {
    return [];
  }
  
  try {
    const files = await vscode.workspace.fs.readDirectory(snippetsDir);
    const snippets: UserSnippet[] = [];
    
    for (const [fileName, fileType] of files) {
      if (fileType !== vscode.FileType.File || !fileName.endsWith('.html')) {
        continue;
      }
      
      const fileUri = vscode.Uri.joinPath(snippetsDir, fileName);
      try {
        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
        const content = new TextDecoder().decode(contentBytes);
        const metadata = parseMetadata(content);
        
        if (metadata && metadata.id) {
          snippets.push({
            id: metadata.id,
            name: metadata.name || fileName.replace('.html', ''),
            category: metadata.category || 'cards',
            description: metadata.description,
            preview: metadata.preview,
            createdAt: metadata.createdAt || 0,
            modifiedAt: metadata.modifiedAt || 0,
            html: content
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    // Sort by modified date, newest first
    snippets.sort((a, b) => b.modifiedAt - a.modifiedAt);
    return snippets;
  } catch (error) {
    // Directory might not exist yet
    return [];
  }
}

/**
 * Get a snippet by ID
 */
export async function getSnippetById(id: string): Promise<UserSnippet | null> {
  const snippets = await listSnippets();
  return snippets.find(s => s.id === id) || null;
}

/**
 * Delete a snippet by ID
 */
export async function deleteSnippet(id: string): Promise<{ success: boolean; error?: string }> {
  const snippetsDir = await getSnippetsDirUri();
  if (!snippetsDir) {
    return { success: false, error: 'No workspace folder open' };
  }
  
  try {
    const files = await vscode.workspace.fs.readDirectory(snippetsDir);
    
    for (const [fileName, fileType] of files) {
      if (fileType !== vscode.FileType.File || !fileName.endsWith('.html')) {
        continue;
      }
      
      const fileUri = vscode.Uri.joinPath(snippetsDir, fileName);
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(contentBytes);
      const metadata = parseMetadata(content);
      
      if (metadata && metadata.id === id) {
        await vscode.workspace.fs.delete(fileUri);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Snippet not found' };
  } catch (error) {
    return { success: false, error: `Failed to delete snippet: ${error}` };
  }
}

/**
 * Load snippet content (without metadata) for editor insertion
 */
export async function loadSnippetContent(id: string): Promise<{ success: boolean; content?: string; error?: string }> {
  const snippet = await getSnippetById(id);
  if (!snippet) {
    return { success: false, error: 'Snippet not found' };
  }
  
  // Strip metadata comment from content
  const content = snippet.html.replace(/<!--\s*snippet:.*?-->\n?/i, '');
  return { success: true, content };
}
