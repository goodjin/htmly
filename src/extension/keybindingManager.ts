/**
 * Keybinding Manager for Htmly
 * 
 * Manages all keyboard shortcuts for Htmly commands, supporting:
 * - Default keybindings from package.json
 * - User overrides via settings.json
 * - Export/import keybinding configurations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Keybinding {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface KeybindingOverride {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface KeybindingCommand {
  id: string;
  title: string;
  category: string;
  description?: string;
  defaultKeybinding: Keybinding;
}

// Default keybindings for all htmly commands
export const DEFAULT_KEYBINDINGS: KeybindingCommand[] = [
  // File operations
  {
    id: 'htmly.save',
    title: 'Save File',
    category: 'File',
    description: 'Save the current file (bypasses debounce)',
    defaultKeybinding: {
      command: 'htmly.save',
      key: 'ctrl+s',
      mac: 'cmd+s',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  // Mode switching
  {
    id: 'htmly.toggleMode',
    title: 'Toggle Edit Mode',
    category: 'Mode',
    description: 'Cycle through WYSIWYG/Source/Preview/Split modes',
    defaultKeybinding: {
      command: 'htmly.toggleMode',
      key: 'ctrl+shift+m',
      mac: 'cmd+shift+m',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  {
    id: 'htmly.setMode.wysiwyg',
    title: 'Switch to WYSIWYG Mode',
    category: 'Mode',
    description: 'Open in visual WYSIWYG editing mode',
    defaultKeybinding: {
      command: 'htmly.setMode.wysiwyg',
      key: '',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  {
    id: 'htmly.setMode.source',
    title: 'Switch to Source Mode',
    category: 'Mode',
    description: 'Open in HTML source code mode',
    defaultKeybinding: {
      command: 'htmly.setMode.source',
      key: '',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  {
    id: 'htmly.setMode.preview',
    title: 'Switch to Preview Mode',
    category: 'Mode',
    description: 'Open in read-only preview mode',
    defaultKeybinding: {
      command: 'htmly.setMode.preview',
      key: '',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  {
    id: 'htmly.setMode.split',
    title: 'Switch to Split Mode',
    category: 'Mode',
    description: 'Open in side-by-side source and preview mode',
    defaultKeybinding: {
      command: 'htmly.setMode.split',
      key: '',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  // Search
  {
    id: 'htmly.searchProject',
    title: 'Project-Wide Search',
    category: 'Search',
    description: 'Search across all HTML files in the project',
    defaultKeybinding: {
      command: 'htmly.searchProject',
      key: 'ctrl+shift+f',
      mac: 'cmd+shift+f',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  // Template operations
  {
    id: 'htmly.insertTemplate',
    title: 'Insert Template',
    category: 'Templates',
    description: 'Open template selector (Ctrl+T)',
    defaultKeybinding: {
      command: 'htmly.insertTemplate',
      key: 'ctrl+t',
      mac: 'cmd+t',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
  // Snippet operations
  {
    id: 'htmly.insertSnippet',
    title: 'Insert Snippet',
    category: 'Snippets',
    description: 'Open snippet selector (/snippet)',
    defaultKeybinding: {
      command: 'htmly.insertSnippet',
      key: '',
      when: 'activeCustomEditorId == htmly.editor',
    },
  },
];

/**
 * Get keybinding overrides from settings
 */
export function getKeybindingOverrides(): Record<string, KeybindingOverride> {
  const config = vscode.workspace.getConfiguration('htmly');
  const overrides = config.get<Record<string, KeybindingOverride>>('keybindings.overrides', {});
  return overrides;
}

/**
 * Get a specific keybinding (override or default) for a command
 */
export function getKeybinding(commandId: string): Keybinding | undefined {
  const overrides = getKeybindingOverrides();
  
  // Check if there's an override
  if (overrides[commandId]) {
    return overrides[commandId];
  }
  
  // Return default
  const defaultCmd = DEFAULT_KEYBINDINGS.find(cmd => cmd.id === commandId);
  return defaultCmd?.defaultKeybinding;
}

/**
 * Get all keybindings with overrides applied
 */
export function getAllKeybindings(): KeybindingCommand[] {
  const overrides = getKeybindingOverrides();
  
  return DEFAULT_KEYBINDINGS.map(cmd => ({
    ...cmd,
    defaultKeybinding: overrides[cmd.id] || cmd.defaultKeybinding,
  }));
}

/**
 * Set a keybinding override
 */
export function setKeybindingOverride(commandId: string, keybinding: KeybindingOverride): void {
  const config = vscode.workspace.getConfiguration('htmly');
  const overrides = getKeybindingOverrides();
  
  overrides[commandId] = keybinding;
  
  config.update(
    'keybindings.overrides',
    overrides,
    vscode.ConfigurationTarget.Workspace
  );
}

/**
 * Remove a keybinding override (revert to default)
 */
export function removeKeybindingOverride(commandId: string): void {
  const config = vscode.workspace.getConfiguration('htmly');
  const overrides = getKeybindingOverrides();
  
  delete overrides[commandId];
  
  config.update(
    'keybindings.overrides',
    overrides,
    vscode.ConfigurationTarget.Workspace
  );
}

/**
 * Export keybindings to a JSON file
 */
export async function exportKeybindings(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found' };
    }

    const keybindings = getAllKeybindings();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      keybindings: keybindings.map(cmd => ({
        command: cmd.id,
        title: cmd.title,
        category: cmd.category,
        description: cmd.description,
        keybinding: cmd.defaultKeybinding,
      })),
    };

    const defaultPath = path.join(
      workspaceFolder.uri.fsPath,
      '.htmly',
      'keybindings.json'
    );

    // Ensure .htmly directory exists
    const htmlyDir = path.dirname(defaultPath);
    if (!fs.existsSync(htmlyDir)) {
      fs.mkdirSync(htmlyDir, { recursive: true });
    }

    const filePath = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultPath),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
      title: 'Export Htmly Keybindings',
    });

    if (!filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    fs.writeFileSync(filePath.fsPath, JSON.stringify(exportData, null, 2), 'utf-8');
    
    return { success: true, filePath: filePath.fsPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Import keybindings from a JSON file
 */
export async function importKeybindings(): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const fileUri = await vscode.window.showOpenDialog({
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
      title: 'Import Htmly Keybindings',
      openLabel: 'Import',
    });

    if (!fileUri || fileUri.length === 0) {
      return { success: false, error: 'Import cancelled' };
    }

    const content = fs.readFileSync(fileUri[0].fsPath, 'utf-8');
    const importData = JSON.parse(content);

    if (!importData.keybindings || !Array.isArray(importData.keybindings)) {
      return { success: false, error: 'Invalid keybindings file format' };
    }

    const config = vscode.workspace.getConfiguration('htmly');
    const overrides = getKeybindingOverrides();
    let count = 0;

    for (const kb of importData.keybindings) {
      if (kb.command && kb.keybinding) {
        overrides[kb.command] = {
          command: kb.command,
          key: kb.keybinding.key || '',
          mac: kb.keybinding.mac,
          when: kb.keybinding.when,
        };
        count++;
      }
    }

    await config.update(
      'keybindings.overrides',
      overrides,
      vscode.ConfigurationTarget.Workspace
    );

    return { success: true, count };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reset all keybindings to defaults
 */
export async function resetKeybindings(): Promise<void> {
  const config = vscode.workspace.getConfiguration('htmly');
  await config.update(
    'keybindings.overrides',
    {},
    vscode.ConfigurationTarget.Workspace
  );
}
