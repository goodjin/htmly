import * as vscode from 'vscode';
import {
  listSnippets,
  saveSnippet,
  deleteSnippet as deleteSnippetFromStorage,
  loadSnippetContent,
} from '../snippetStorage';
import type { SnippetCategory } from '../../shared/types';

/**
 * SnippetHandlers - Handles snippet CRUD operations.
 * This handler is responsible for:
 * - Loading user snippets
 * - Saving snippets
 * - Deleting snippets
 * - Loading snippet content
 */
export class SnippetHandlers {
  /**
   * Handle load user snippets request
   */
  public async handleLoadUserSnippets(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const snippets = await listSnippets();
      // Send only metadata (without full content) for efficiency
      const metadata = snippets.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        preview: s.preview,
        createdAt: s.createdAt,
        modifiedAt: s.modifiedAt,
      }));
      panel.webview.postMessage({ type: 'userSnippets', snippets: metadata });
    } catch (error) {
      console.error('Failed to load user snippets:', error);
      panel.webview.postMessage({ type: 'userSnippets', snippets: [] });
    }
  }

  /**
   * Handle save as snippet request
   */
  public async handleSaveAsSnippet(
    name: string,
    category: SnippetCategory,
    html: string,
    description: string | undefined,
    preview: string | undefined,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const result = await saveSnippet({
        name,
        category,
        html,
        description,
        preview,
      });

      if (result.success && result.snippet) {
        panel.webview.postMessage({
          type: 'saveSnippetResponse',
          success: true,
          snippet: {
            id: result.snippet.id,
            name: result.snippet.name,
            category: result.snippet.category,
            description: result.snippet.description,
            preview: result.snippet.preview,
            createdAt: result.snippet.createdAt,
            modifiedAt: result.snippet.modifiedAt,
          },
        });
      } else {
        panel.webview.postMessage({
          type: 'saveSnippetResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'saveSnippetResponse',
        success: false,
        error: `Failed to save snippet: ${error}`,
      });
    }
  }

  /**
   * Handle delete snippet request
   */
  public async handleDeleteSnippet(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await deleteSnippetFromStorage(id);

      if (result.success) {
        panel.webview.postMessage({
          type: 'deleteSnippetResponse',
          success: true,
        });
      } else {
        panel.webview.postMessage({
          type: 'deleteSnippetResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'deleteSnippetResponse',
        success: false,
        error: `Failed to delete snippet: ${error}`,
      });
    }
  }

  /**
   * Handle load snippet content request
   */
  public async handleLoadSnippetContent(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await loadSnippetContent(id);

      panel.webview.postMessage({
        type: 'snippetContentResponse',
        id,
        success: result.success,
        content: result.content,
        error: result.error,
      });
    } catch (error) {
      panel.webview.postMessage({
        type: 'snippetContentResponse',
        id,
        success: false,
        error: `Failed to load snippet content: ${error}`,
      });
    }
  }
}

/**
 * Creates a new SnippetHandlers instance
 */
export function createSnippetHandlers(): SnippetHandlers {
  return new SnippetHandlers();
}