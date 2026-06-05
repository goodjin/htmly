import * as vscode from 'vscode';
import {
  listTemplates,
  saveTemplate,
  deleteTemplate as deleteTemplateFromStorage,
  renameTemplate as renameTemplateInStorage,
} from '../templateStorage';
import type { TemplateCategory } from '../../shared/types';

/**
 * TemplateHandlers - Handles template CRUD operations.
 * This handler is responsible for:
 * - Loading user templates
 * - Saving templates
 * - Deleting templates
 * - Renaming templates
 */
export class TemplateHandlers {
  /**
   * Handle load user templates request
   */
  public async handleLoadUserTemplates(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const templates = await listTemplates();
      // Send only metadata (without full content) for efficiency
      const metadata = templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        thumbnail: t.thumbnail,
        createdAt: t.createdAt,
        modifiedAt: t.modifiedAt,
      }));
      panel.webview.postMessage({ type: 'userTemplates', templates: metadata });
    } catch (error) {
      console.error('Failed to load user templates:', error);
      panel.webview.postMessage({ type: 'userTemplates', templates: [] });
    }
  }

  /**
   * Handle save as template request
   */
  public async handleSaveAsTemplate(
    name: string,
    category: TemplateCategory,
    content: string,
    description: string | undefined,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const result = await saveTemplate({
        name,
        category,
        content,
        description,
      });

      if (result.success && result.template) {
        panel.webview.postMessage({
          type: 'saveTemplateResponse',
          success: true,
          template: {
            id: result.template.id,
            name: result.template.name,
            category: result.template.category,
            description: result.template.description,
            thumbnail: result.template.thumbnail,
            createdAt: result.template.createdAt,
            modifiedAt: result.template.modifiedAt,
          },
        });
      } else {
        panel.webview.postMessage({
          type: 'saveTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'saveTemplateResponse',
        success: false,
        error: `Failed to save template: ${error}`,
      });
    }
  }

  /**
   * Handle delete template request
   */
  public async handleDeleteTemplate(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await deleteTemplateFromStorage(id);

      if (result.success) {
        panel.webview.postMessage({
          type: 'deleteTemplateResponse',
          success: true,
        });
      } else {
        panel.webview.postMessage({
          type: 'deleteTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'deleteTemplateResponse',
        success: false,
        error: `Failed to delete template: ${error}`,
      });
    }
  }

  /**
   * Handle rename template request
   */
  public async handleRenameTemplate(
    id: string,
    newName: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const result = await renameTemplateInStorage(id, newName);

      if (result.success && result.template) {
        panel.webview.postMessage({
          type: 'renameTemplateResponse',
          success: true,
          template: {
            id: result.template.id,
            name: result.template.name,
            category: result.template.category,
            description: result.template.description,
            thumbnail: result.template.thumbnail,
            createdAt: result.template.createdAt,
            modifiedAt: result.template.modifiedAt,
          },
        });
      } else {
        panel.webview.postMessage({
          type: 'renameTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'renameTemplateResponse',
        success: false,
        error: `Failed to rename template: ${error}`,
      });
    }
  }
}

/**
 * Creates a new TemplateHandlers instance
 */
export function createTemplateHandlers(): TemplateHandlers {
  return new TemplateHandlers();
}