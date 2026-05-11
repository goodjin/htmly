/**
 * User Template Storage
 * 
 * Handles CRUD operations for user-defined templates stored in .htmly/templates/
 */

import * as vscode from 'vscode';

// Template storage directory
export const TEMPLATES_DIR = '.htmly/templates';

// Template metadata stored in HTML comments at the top of the file
interface TemplateMetadata {
  id: string;
  name: string;
  category: 'blog' | 'product' | 'resume' | 'docs' | 'email';
  description?: string;
  thumbnail?: string;
  createdAt: number;
  modifiedAt: number;
}

/**
 * Full template with content
 */
export interface UserTemplate extends TemplateMetadata {
  content: string;
}

/**
 * Get the templates directory URI for the workspace
 */
async function getTemplatesDirUri(): Promise<vscode.Uri | null> {
  // Use the first workspace folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }
  
  const workspaceRoot = workspaceFolders[0].uri;
  return vscode.Uri.joinPath(workspaceRoot, TEMPLATES_DIR);
}

/**
 * Ensure the templates directory exists
 */
async function ensureTemplatesDir(): Promise<vscode.Uri | null> {
  const templatesDir = await getTemplatesDirUri();
  if (!templatesDir) {
    return null;
  }
  
  try {
    await vscode.workspace.fs.createDirectory(templatesDir);
    return templatesDir;
  } catch (error) {
    // Directory might already exist
    return templatesDir;
  }
}

/**
 * Generate a unique ID for a template
 */
function generateTemplateId(name: string): string {
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
 * Create metadata comment block for template HTML
 */
function createMetadataComment(metadata: TemplateMetadata): string {
  return `<!-- template: ${JSON.stringify({
    id: metadata.id,
    name: metadata.name,
    category: metadata.category,
    description: metadata.description,
    thumbnail: metadata.thumbnail,
    createdAt: metadata.createdAt,
    modifiedAt: metadata.modifiedAt
  })} -->\n`;
}

/**
 * Parse metadata from template HTML content
 */
function parseMetadata(content: string): Partial<TemplateMetadata> | null {
  const match = content.match(/<!--\s*template:\s*(\{[^}]+\})\s*-->/i);
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
 * Save a new template or update existing
 */
export async function saveTemplate(options: {
  name: string;
  category: TemplateMetadata['category'];
  content: string;
  description?: string;
  thumbnail?: string;
  existingId?: string;
}): Promise<{ success: boolean; template?: UserTemplate; error?: string }> {
  const templatesDir = await ensureTemplatesDir();
  if (!templatesDir) {
    return { success: false, error: 'No workspace folder open' };
  }
  
  try {
    const id = options.existingId || generateTemplateId(options.name);
    const now = Date.now();
    const existingTemplates = await listTemplates();
    const existingTemplate = existingTemplates.find(t => t.id === id);
    
    const metadata: TemplateMetadata = {
      id,
      name: options.name,
      category: options.category,
      description: options.description,
      thumbnail: options.thumbnail,
      createdAt: existingTemplate?.createdAt || now,
      modifiedAt: now
    };
    
    // Wrap content with metadata
    const contentWithMeta = createMetadataComment(metadata) + options.content;
    
    // Save to file
    const fileName = `${sanitizeFilename(options.name)}-${id.substring(id.lastIndexOf('-'))}.html`;
    const fileUri = vscode.Uri.joinPath(templatesDir, fileName);
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(contentWithMeta));
    
    return {
      success: true,
      template: {
        ...metadata,
        content: options.content
      }
    };
  } catch (error) {
    return { success: false, error: `Failed to save template: ${error}` };
  }
}

/**
 * List all user templates
 */
export async function listTemplates(): Promise<UserTemplate[]> {
  const templatesDir = await getTemplatesDirUri();
  if (!templatesDir) {
    return [];
  }
  
  try {
    const files = await vscode.workspace.fs.readDirectory(templatesDir);
    const templates: UserTemplate[] = [];
    
    for (const [fileName, fileType] of files) {
      if (fileType !== vscode.FileType.File || !fileName.endsWith('.html')) {
        continue;
      }
      
      const fileUri = vscode.Uri.joinPath(templatesDir, fileName);
      try {
        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
        const content = new TextDecoder().decode(contentBytes);
        const metadata = parseMetadata(content);
        
        if (metadata && metadata.id) {
          templates.push({
            id: metadata.id,
            name: metadata.name || fileName.replace('.html', ''),
            category: metadata.category || 'docs',
            description: metadata.description,
            thumbnail: metadata.thumbnail,
            createdAt: metadata.createdAt || 0,
            modifiedAt: metadata.modifiedAt || 0,
            content: content
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    // Sort by modified date, newest first
    templates.sort((a, b) => b.modifiedAt - a.modifiedAt);
    return templates;
  } catch (error) {
    // Directory might not exist yet
    return [];
  }
}

/**
 * Get a template by ID
 */
export async function getTemplateById(id: string): Promise<UserTemplate | null> {
  const templates = await listTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Delete a template by ID
 */
export async function deleteTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  const templatesDir = await getTemplatesDirUri();
  if (!templatesDir) {
    return { success: false, error: 'No workspace folder open' };
  }
  
  try {
    const files = await vscode.workspace.fs.readDirectory(templatesDir);
    
    for (const [fileName, fileType] of files) {
      if (fileType !== vscode.FileType.File || !fileName.endsWith('.html')) {
        continue;
      }
      
      const fileUri = vscode.Uri.joinPath(templatesDir, fileName);
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(contentBytes);
      const metadata = parseMetadata(content);
      
      if (metadata && metadata.id === id) {
        await vscode.workspace.fs.delete(fileUri);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Template not found' };
  } catch (error) {
    return { success: false, error: `Failed to delete template: ${error}` };
  }
}

/**
 * Rename a template
 */
export async function renameTemplate(
  id: string,
  newName: string
): Promise<{ success: boolean; template?: UserTemplate; error?: string }> {
  // Get the template to rename
  const template = await getTemplateById(id);
  if (!template) {
    return { success: false, error: 'Template not found' };
  }
  
  // Delete the old file
  const deleteResult = await deleteTemplate(id);
  if (!deleteResult.success) {
    return { success: false, error: deleteResult.error };
  }
  
  // Save with new name
  const saveResult = await saveTemplate({
    name: newName,
    category: template.category,
    content: template.content.replace(/<!--\s*template:.*?-->\n?/i, ''), // Remove old metadata
    description: template.description,
    thumbnail: template.thumbnail
  });
  
  if (!saveResult.success) {
    // Try to restore the original template
    await saveTemplate({
      name: template.name,
      category: template.category,
      content: template.content.replace(/<!--\s*template:.*?-->\n?/i, ''),
      description: template.description,
      thumbnail: template.thumbnail,
      existingId: template.id
    });
    return { success: false, error: saveResult.error };
  }
  
  return {
    success: true,
    template: saveResult.template
  };
}

/**
 * Load template content (without metadata) for editor insertion
 */
export async function loadTemplateContent(id: string): Promise<{ success: boolean; content?: string; error?: string }> {
  const template = await getTemplateById(id);
  if (!template) {
    return { success: false, error: 'Template not found' };
  }
  
  // Strip metadata comment from content
  const content = template.content.replace(/<!--\s*template:.*?-->\n?/i, '');
  return { success: true, content };
}
