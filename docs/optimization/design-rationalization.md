# Design Rationalization Design Document

**Date**: 2026-05-19  
**Status**: Draft  
**Author**: Oracle (Strategic Technical Advisor)

---

## Executive Summary

This document proposes a comprehensive storage rationalization redesign for the Htmly VS Code extension to address four critical issues: (1) user template/snippet storage in workspace instead of user data directory, (2) version history bound to workspace instead of user profile, (3) export going to extension directory instead of user-specified location, and (4) no cross-workspace sharing capability for user data.

---

## 1. Issue Analysis

### 1.1 Templates and Snippets in Workspace

**Current Problem**:
```typescript
// src/extension/templateStorage.ts (line 10)
export const TEMPLATES_DIR = '.htmly/templates';

// src/extension/snippetStorage.ts (line 11)
export const SNIPPETS_DIR = '.htmly/snippets';
```

User-created templates and snippets are stored in `.htmly/templates/` and `.htmly/snippets/` within the workspace root.

**Impact**:
- User data deleted when workspace is cleaned/reset
- No sharing across multiple workspaces
- Templates/snippets lost when switching projects
- Version control pollution (user data in repo)

### 1.2 History Bound to Workspace

**Current Problem**:
```typescript
// src/extension/editorProvider.ts (line 643)
await this.context.workspaceState.update(HISTORY_STATE_KEY, {
  ...trimmedHistory,
  documentUri: docKey,
});
```

Version history uses `workspaceState` which is tied to the specific workspace folder.

**Impact**:
- History lost when opening same file in different workspace
- Cannot access history from different project folders
- Crash recovery less effective across sessions

### 1.3 Export to Extension Directory

**Current Problem**:
```typescript
// src/extension/editorProvider.ts (lines 723-726)
const exportPath = vscode.Uri.joinPath(
  this.context.globalStorageUri || this.context.extensionUri,
  `${baseName}-history-${Date.now()}.json`
);
```

History export goes to `globalStorageUri` (extension directory), not user-specified location.

**Impact**:
- User cannot find exported files (hidden in extension dir)
- No choice of output format/location
- Clutters extension storage

### 1.4 No Cross-Workspace Sharing

**Current Problem**:
Both templates and snippets are workspace-local. There is no mechanism to:
- Share templates/snippets across projects
- Sync user data between machines
- Import/export user data bundles

---

## 2. Storage Architecture Redesign

### 2.1 VS Code Storage Conventions

VS Code provides three storage locations:

| Location | API | Purpose | Persistence |
|----------|-----|---------|--------------|
| **Extension Directory** | `context.extensionUri` | Built-in data, not user data | Per-installation |
| **Global Storage** | `context.globalStorageUri` | Extension-wide user data | Per-installation |
| **Secret Storage** | `context.secrets` | Credentials, tokens | Per-installation |
| **Global State** | `context.globalState` | Extension-wide settings | Per-installation |
| **Workspace State** | `context.workspaceState` | Workspace-specific data | Per-workspace |

**Proper Separation**:
- **Built-in templates**: Ship with extension (read-only)
- **User data**: Store in global storage or user data path
- **Workspace-specific caches**: Use workspace state
- **Exports**: User-specified location via save dialog

### 2.2 Proposed Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Data (globalStorageUri)                  │
├─────────────────────────────────────────────────────────────────┤
│  htmly-user-data/                                                │
│  ├── templates/           # User-created templates               │
│  │   ├── metadata.json    # Template index                       │
│  │   └── *.html           # Individual template files             │
│  ├── snippets/            # User-created snippets                │
│  │   ├── metadata.json    # Snippet index                        │
│  │   └── *.html           # Individual snippet files             │
│  └── preferences.json     # User preferences                    │
│                            # (export location, etc.)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Built-in Data (extensionUri)                   │
├─────────────────────────────────────────────────────────────────┤
│  extension/                                                     │
│  └── built-in/              # Read-only built-in templates       │
│      ├── blog-post.html                                       │
│      ├── product-page.html                                     │
│      ├── resume.html                                           │
│      ├── documentation.html                                    │
│      └── email.html                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Implementation Architecture

```typescript
// src/extension/storage/
// ├── userDataStorage.ts      # User data management
// ├── builtInData.ts          # Built-in data access
// ├── preferencesManager.ts   # User preferences
// └── index.ts                # Barrel export

interface StorageLayout {
  userDataRoot: vscode.Uri;       // globalStorageUri/htmly-user-data/
  templatesDir: vscode.Uri;       // userDataRoot/templates/
  snippetsDir: vscode.Uri;         // userDataRoot/snippets/
  preferencesFile: vscode.Uri;     // userDataRoot/preferences.json
  builtInRoot: vscode.Uri;        // extensionUri/built-in/
}
```

---

## 3. User Data vs Extension Data Separation

### 3.1 Migration Path

| Data Type | Current Location | New Location | Strategy |
|-----------|------------------|--------------|----------|
| User templates | `.htmly/templates/` | `globalStorageUri/htmly-user-data/templates/` | Migrate on first launch |
| User snippets | `.htmly/snippets/` | `globalStorageUri/htmly-user-data/snippets/` | Migrate on first launch |
| Built-in templates | `webview/src/core/templates/built-in/` | Keep in extension | Read-only |
| Version history | `workspaceState` | `globalState` | Migrate existing |
| Export preferences | N/A | `globalState['htmly.preferences']` | New |

### 3.2 Backward Compatibility

**Migration Strategy**:
1. On extension activation, check for legacy `.htmly/templates/` directory
2. If found, migrate to new location and rename old directory (`.htmly/templates.bak`)
3. Show notification: "Your templates have been moved to user data storage"
4. Support both locations during 2-week deprecation period

### 3.3 Built-in Data Access

```typescript
// src/extension/storage/builtInData.ts

export function getBuiltInTemplatesDir(): vscode.Uri {
  return vscode.Uri.joinPath(
    vscode.extensions.getExtension('htmly.htmly')!.extensionUri,
    'built-in',
    'templates'
  );
}

export async function getBuiltInTemplateIds(): Promise<string[]> {
  const dir = getBuiltInTemplatesDir();
  const files = await vscode.workspace.fs.readDirectory(dir);
  return files
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.html'))
    .map(([name]) => name.replace('.html', ''));
}
```

---

## 4. Export Location Preference System

### 4.1 Design

Implement a user preference for default export location:

```typescript
// src/extension/storage/preferencesManager.ts

interface ExportPreferences {
  defaultExportLocation: 'document' | 'workspace' | 'custom';
  customExportPath?: string;
  exportFormat: 'json' | 'csv';
}

interface HtmlyPreferences {
  export: ExportPreferences;
  templateSharing: 'local' | 'sync';
}

const DEFAULT_PREFERENCES: HtmlyPreferences = {
  export: {
    defaultExportLocation: 'document',
    exportFormat: 'json',
  },
  templateSharing: 'local',
};
```

### 4.2 User Preference Settings

Add to `package.json` configuration:

```json
{
  "htmly.preferences.export.defaultLocation": {
    "type": "string",
    "enum": ["document", "workspace", "custom"],
    "default": "document",
    "description": "Default location for history exports"
  },
  "htmly.preferences.export.customPath": {
    "type": "string",
    "default": "",
    "description": "Custom export path (used when defaultLocation is 'custom')"
  }
}
```

### 4.3 Export Flow Redesign

**Current Flow**:
```
User clicks Export → Export to globalStorageUri → Show message
```

**New Flow**:
```
User clicks Export → 
  Check preferences.defaultExportLocation →
    'document': Save dialog in document directory
    'workspace': Save dialog in workspace root
    'custom': Save dialog at preferences.customPath →
  Write file → Show success with "Open File" option
```

### 4.4 Implementation

```typescript
// src/extension/storage/exportLocationResolver.ts

export async function resolveExportLocation(
  preferences: ExportPreferences,
  documentUri: vscode.Uri
): Promise<vscode.Uri | null> {
  let defaultUri: vscode.Uri;
  
  switch (preferences.defaultExportLocation) {
    case 'document':
      defaultUri = documentUri;
      break;
    case 'workspace':
      defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri || documentUri;
      break;
    case 'custom':
      if (!preferences.customExportPath) {
        defaultUri = documentUri;
      } else {
        defaultUri = vscode.Uri.file(preferences.customExportPath);
      }
      break;
  }
  
  const fileName = `${path.basename(documentUri.fsPath, '.html')}-history-${Date.now()}.json`;
  return vscode.Uri.joinPath(defaultUri, fileName);
}

export async function exportWithDialog(
  exportData: object,
  defaultUri: vscode.Uri
): Promise<vscode.Uri | null> {
  const fileName = path.basename(defaultUri.fsPath);
  const dirUri = vscode.Uri.joinPath(defaultUri, '..');
  
  const selectedUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(dirUri, fileName),
    filters: {
      'JSON Files': ['json'],
      'All Files': ['*']
    }
  });
  
  if (!selectedUri) return null;
  
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(
    selectedUri,
    encoder.encode(JSON.stringify(exportData, null, 2))
  );
  
  return selectedUri;
}
```

---

## 5. Cross-Workspace Sharing Strategy

### 5.1 Template/Snippet Sharing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Data Store (globalStorage)               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  templates/          snippets/           preferences.json  │    │
│  │  ├── *.html          ├── *.html                            │    │
│  │  └── metadata.json   └── metadata.json                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Shared across all workspaces
                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Workspace A │     │ Workspace B │     │ Workspace C │
│ .htmly/     │     │ .htmly/     │     │ .htmly/     │
│ (cache only)│     │ (cache only)│     │ (cache only)│
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Workspace Cache Strategy

**Design Decision**: Workspace `.htmly/` directories become **caches** of the user data, not the primary store.

```typescript
// src/extension/storage/workspaceCache.ts

interface WorkspaceCacheEntry {
  itemId: string;           // Template or snippet ID
  lastSyncedAt: number;     // Timestamp
  localPath: vscode.Uri;    // Path in workspace cache
  checksum: string;         // For sync detection
}

/**
 * Get or refresh workspace cache for templates/snippets
 */
export async function getWorkspaceCache(
  cacheType: 'templates' | 'snippets',
  forceRefresh: boolean = false
): Promise<WorkspaceCacheEntry[]> {
  const cacheDir = getWorkspaceCacheDir(cacheType);
  
  // Check if cache exists and is fresh (within 24 hours)
  if (!forceRefresh && await isCacheValid(cacheDir)) {
    return readCacheIndex(cacheDir);
  }
  
  // Sync from user data store
  await syncFromUserData(cacheType, cacheDir);
  return readCacheIndex(cacheDir);
}

/**
 * Sync item from user data to workspace cache
 */
export async function syncToWorkspace(
  itemType: 'template' | 'snippet',
  item: UserTemplate | UserSnippet
): Promise<vscode.Uri> {
  const cacheDir = getWorkspaceCacheDir(itemType);
  const fileName = `${item.id}.html`;
  const localPath = vscode.Uri.joinPath(cacheDir, fileName);
  
  // Ensure cache directory exists
  await vscode.workspace.fs.createDirectory(cacheDir);
  
  // Write with metadata
  const content = itemType === 'template' 
    ? createMetadataComment(item) + item.content
    : createMetadataComment(item) + item.html;
    
  await vscode.workspace.fs.writeFile(localPath, new TextEncoder().encode(content));
  
  // Update cache index
  await updateCacheIndex(cacheDir, item);
  
  return localPath;
}
```

### 5.3 Import/Export for Sharing

Provide commands for users to share templates/snippets:

```typescript
// src/extension/commands/shareData.ts

/**
 * Export selected templates/snippets to a shareable bundle
 */
export async function exportUserDataBundle(
  itemType: 'templates' | 'snippets',
  itemIds: string[]
): Promise<vscode.Uri | null> {
  const items = await getUserDataItems(itemType, itemIds);
  
  const bundle = {
    version: 1,
    type: itemType,
    exportedAt: new Date().toISOString(),
    items: items.map(item => ({
      ...item,
      // Strip IDs for clean import at destination
      id: undefined,
      originalId: item.id,
    })),
  };
  
  const result = await vscode.window.showSaveDialog({
    filters: { 'Htmly Bundle': ['htmb'] },
    defaultUri: vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.parse('~'),
      `${itemType}-bundle-${Date.now()}.htmb`
    ),
  });
  
  if (!result) return null;
  
  await vscode.workspace.fs.writeFile(
    result,
    new TextEncoder().encode(JSON.stringify(bundle, null, 2))
  );
  
  return result;
}

/**
 * Import templates/snippets from a bundle file
 */
export async function importUserDataBundle(
  bundleUri: vscode.Uri
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const content = await vscode.workspace.fs.readFile(bundleUri);
  const bundle = JSON.parse(new TextDecoder().decode(content));
  
  if (bundle.version !== 1) {
    return { success: false, imported: 0, errors: ['Unsupported bundle version'] };
  }
  
  const errors: string[] = [];
  let imported = 0;
  
  for (const item of bundle.items) {
    const result = await saveUserDataItem(bundle.type, {
      name: item.name,
      category: item.category,
      content: item.content || item.html,
      description: item.description,
    });
    
    if (result.success) {
      imported++;
    } else {
      errors.push(`Failed to import ${item.name}: ${result.error}`);
    }
  }
  
  return { success: errors.length === 0, imported, errors };
}
```

### 5.4 VS Code Commands for Sharing

Add to `package.json`:

```json
{
  "commands": [
    {
      "command": "htmly.exportTemplates",
      "title": "Export Templates Bundle",
      "category": "Htmly"
    },
    {
      "command": "htmly.importTemplates",
      "title": "Import Templates Bundle",
      "category": "Htmly"
    },
    {
      "command": "htmly.exportSnippets",
      "title": "Export Snippets Bundle",
      "category": "Htmly"
    },
    {
      "command": "htmly.importSnippets",
      "title": "Import Snippets Bundle",
      "category": "Htmly"
    },
    {
      "command": "htmly.openUserDataFolder",
      "title": "Open User Data Folder",
      "category": "Htmly"
    }
  ]
}
```

---

## 6. Implementation Plan

### 6.1 File Structure

```
src/extension/storage/
├── index.ts                    # Barrel export
├── userDataStorage.ts          # User data CRUD operations
├── builtInData.ts             # Built-in data access
├── workspaceCache.ts          # Workspace cache management
├── preferencesManager.ts      # User preferences (export location, etc.)
├── exportLocationResolver.ts  # Export path resolution
└── shareBundle.ts             # Import/export bundle operations

src/extension/
├── templateStorage.ts         # Updated to use userDataStorage
├── snippetStorage.ts          # Updated to use userDataStorage
└── editorProvider.ts          # Updated for globalState history + new export
```

### 6.2 Migration Tasks

| Week | Phase | Tasks |
|------|-------|-------|
| **Week 1** | Storage Foundation | Create `userDataStorage.ts`, update `templateStorage.ts` and `snippetStorage.ts` |
| **Week 2** | Preferences | Create `preferencesManager.ts`, add configuration, implement export location preference |
| **Week 3** | History Migration | Migrate `workspaceState` history to `globalState`, update `editorProvider.ts` |
| **Week 4** | Sharing | Implement `shareBundle.ts`, add VS Code commands |
| **Week 5** | Cleanup | Remove legacy code, add deprecation warnings, test migration path |

### 6.3 Key Interface Changes

```typescript
// src/extension/storage/interfaces.ts

export interface IUserDataStorage {
  // Templates
  saveTemplate(options: SaveOptions): Promise<SaveResult>;
  listTemplates(): Promise<UserTemplate[]>;
  getTemplateById(id: string): Promise<UserTemplate | null>;
  deleteTemplate(id: string): Promise<DeleteResult>;
  
  // Snippets
  saveSnippet(options: SaveOptions): Promise<SaveResult>;
  listSnippets(): Promise<UserSnippet[]>;
  getSnippetById(id: string): Promise<UserSnippet | null>;
  deleteSnippet(id: string): Promise<DeleteResult>;
  
  // Migration
  migrateFromWorkspace(workspaceRoot: vscode.Uri): Promise<MigrationResult>;
}

export interface IPreferencesManager {
  getExportPreferences(): Promise<ExportPreferences>;
  setExportPreferences(prefs: Partial<ExportPreferences>): Promise<void>;
  getAllPreferences(): Promise<HtmlyPreferences>;
}

export interface IWorkspaceCache {
  getCacheDir(type: 'templates' | 'snippets'): vscode.Uri;
  syncToWorkspace(type: 'template' | 'snippet', item: UserTemplate | UserSnippet): Promise<void>;
  clearCache(type: 'templates' | 'snippets'): Promise<void>;
}
```

---

## 7. Testing Strategy

### 7.1 Migration Testing

```typescript
// src/extension/storage/migration.test.ts

describe('UserDataStorage Migration', () => {
  it('migrates templates from legacy workspace location', async () => {
    // Setup: Create legacy .htmly/templates directory
    const mockWorkspaceRoot = Uri.parse('file:///workspace');
    await setupLegacyTemplates(mockWorkspaceRoot);
    
    // Execute: Initialize UserDataStorage (should trigger migration)
    const storage = new UserDataStorage(context);
    await storage.initialize();
    
    // Verify: Templates exist in new location
    const templates = await storage.listTemplates();
    expect(templates.length).toBeGreaterThan(0);
    
    // Verify: Legacy directory renamed
    const legacyDir = Uri.joinPath(mockWorkspaceRoot, '.htmly/templates');
    const stat = await workspace.fs.stat(legacyDir).catch(() => null);
    expect(stat).toBeNull(); // Should not exist
  });
});
```

### 7.2 Preference Testing

```typescript
// src/extension/storage/preferences.test.ts

describe('Export Location Preferences', () => {
  it('uses document directory when preference is set', async () => {
    const prefs = await preferencesManager.getExportPreferences();
    prefs.defaultExportLocation = 'document';
    await preferencesManager.setExportPreferences(prefs);
    
    const resolved = await resolveExportLocation(
      prefs,
      Uri.parse('file:///workspace/doc.html')
    );
    
    expect(resolved?.fsPath).toContain('workspace');
    expect(resolved?.fsPath).toContain('doc-history-');
  });
});
```

---

## 8. Rollback Strategy

### 8.1 Migration Safety

1. **Backup before migration**: Copy legacy data to `.htmly/templates.bak` and `.htmly/snippets.bak`
2. **Incremental migration**: Migrate one item at a time, rollback on failure
3. **Rollback on failure**: Restore from backup, show error message

### 8.2 Feature Flag

```typescript
const USE_NEW_STORAGE = 'htmly.useNewStorage';

export function isNewStorageEnabled(): boolean {
  return workspace.getConfiguration('htmly').get<boolean>(USE_NEW_STORAGE, false);
}
```

Migration only runs when `htmly.useNewStorage` is `true` or unset (first launch).

---

## 9. Summary

| Issue | Solution | Files Changed |
|-------|----------|--------------|
| Templates in workspace | Move to `globalStorageUri/htmly-user-data/templates/` | `templateStorage.ts`, new `userDataStorage.ts` |
| Snippets in workspace | Move to `globalStorageUri/htmly-user-data/snippets/` | `snippetStorage.ts`, new `userDataStorage.ts` |
| History in workspaceState | Move to `globalState` | `editorProvider.ts` |
| Export to globalStorage | Add preference system with save dialog | `exportLocationResolver.ts`, `preferencesManager.ts` |
| No cross-workspace sharing | Import/export bundles, workspace cache | `shareBundle.ts`, `workspaceCache.ts` |

---

## Appendix A: Configuration Schema

```json
{
  "htmly.preferences": {
    "type": "object",
    "properties": {
      "export": {
        "type": "object",
        "properties": {
          "defaultLocation": {
            "type": "string",
            "enum": ["document", "workspace", "custom"],
            "default": "document"
          },
          "customPath": {
            "type": "string"
          }
        }
      },
      "sharing": {
        "type": "string",
        "enum": ["local", "sync"],
        "default": "local"
      }
    }
  }
}
```

---

## Appendix B: File Naming Convention

| Data Type | Filename Pattern | Example |
|-----------|-----------------|---------|
| Template | `{sanitized-name}-{id}.html` | `blog-template-abc123.html` |
| Snippet | `{sanitized-name}-{id}.html` | `card-layout-xyz789.html` |
| Metadata | `metadata.json` | Contains index of all items |
| Bundle | `{type}-bundle-{timestamp}.htmb` | `templates-bundle-1716192000000.htmb` |
| Preferences | `preferences.json` | User settings JSON |
