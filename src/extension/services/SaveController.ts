import * as vscode from 'vscode';
import { SaveStatus } from '../../shared/types';

/**
 * Message types for webview communication
 */
interface WebviewMessage {
  type: string;
  [key: string]: unknown;
}
import { SAVE_DEBOUNCE_MS, LARGE_SAVE_THRESHOLD } from '../../shared/constants';
import { getVersionHistoryDb } from '../versionHistoryDb';

/**
 * SaveController - Handles all save logic including debounce, immediate save, and large file optimization.
 * This service is responsible for:
 * - Debounced auto-save
 * - Immediate save (Ctrl+S / Cmd+S)
 * - Large file save optimization
 * - Save status tracking
 * - Version history creation
 */
export class SaveController {
  private readonly saveTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingContent = new Map<string, string>();
  private readonly saveStatusMap = new Map<string, SaveStatus>();

  private context: vscode.ExtensionContext | undefined;

  /**
   * Set the extension context (needed for version history)
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Apply edit with debounce (500ms) for auto-save
   */
  public applyEditDebounced(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    // Clear any existing timer
    const existingTimer = this.saveTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending content
    this.pendingContent.set(docKey, newContent);

    // Update status to 'saving' (debouncing)
    this.updateSaveStatus(panel, docKey, 'saving', postMessage);

    // Set new debounce timer
    const timer = setTimeout(() => {
      const pending = this.pendingContent.get(docKey);
      if (pending !== undefined) {
        this.executeSave(document, pending, panel, docKey, postMessage);
      }
    }, SAVE_DEBOUNCE_MS);

    this.saveTimers.set(docKey, timer);
  }

  /**
   * Immediate save - bypasses debounce (triggered by Ctrl+S / Cmd+S)
   */
  public applyEditImmediate(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    // Clear any pending debounce timer
    const existingTimer = this.saveTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.saveTimers.delete(docKey);
    }

    this.executeSave(document, newContent, panel, docKey, postMessage);
  }

  /**
   * Execute the actual file save
   */
  public executeSave(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    // Clear pending state
    this.pendingContent.delete(docKey);
    this.saveTimers.delete(docKey);

    if (document.getText() === newContent) {
      this.updateSaveStatus(panel, docKey, 'idle', postMessage);
      return;
    }

    const fileSize = newContent.length;
    const isLargeFile = fileSize > LARGE_SAVE_THRESHOLD;

    if (isLargeFile) {
      // Use optimized batch edit for large files
      this.executeLargeFileSave(document, newContent, panel, docKey, postMessage);
    } else {
      // Standard save for small/medium files
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
        newContent
      );
      Promise.resolve(vscode.workspace.applyEdit(edit))
        .then(async () => {
          this.updateSaveStatus(panel, docKey, 'saved', postMessage);
          // Create version history entry after successful save
          await this.createVersionEntry(docKey, newContent);
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (this.saveStatusMap.get(docKey) === 'saved') {
              this.updateSaveStatus(panel, docKey, 'idle', postMessage);
            }
          }, 2000);
        })
        .catch(() => {
          this.updateSaveStatus(panel, docKey, 'error', postMessage);
        });
    }
  }

  /**
   * Optimized save for large files (>100KB)
   * Uses single replace instead of character-by-character edits
   */
  public executeLargeFileSave(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    try {
      // Use WorkspaceEdit for consistency with VS Code's undo/redo
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      edit.replace(document.uri, fullRange, newContent);

      Promise.resolve(vscode.workspace.applyEdit(edit))
        .then(async () => {
          // Force save to disk for large files
          await document.save();
          this.updateSaveStatus(panel, docKey, 'saved', postMessage);
          // Create version history entry after successful save
          await this.createVersionEntry(docKey, newContent);
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (this.saveStatusMap.get(docKey) === 'saved') {
              this.updateSaveStatus(panel, docKey, 'idle', postMessage);
            }
          }, 2000);
        })
        .catch(() => {
          this.updateSaveStatus(panel, docKey, 'error', postMessage);
        });
    } catch (error) {
      this.updateSaveStatus(panel, docKey, 'error', postMessage);
    }
  }

  /**
   * Update save status and notify webview
   */
  public updateSaveStatus(
    panel: vscode.WebviewPanel,
    docKey: string,
    status: SaveStatus,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    const currentStatus = this.saveStatusMap.get(docKey);
    if (currentStatus !== status) {
      this.saveStatusMap.set(docKey, status);
      postMessage(panel, { type: 'saveStatus', status });
    }
  }

  /**
   * Get save status for a document
   */
  public getSaveStatus(docKey: string): SaveStatus | undefined {
    return this.saveStatusMap.get(docKey);
  }

  /**
   * Get pending content for a document
   */
  public getPendingContent(docKey: string): string | undefined {
    return this.pendingContent.get(docKey);
  }

  /**
   * Public method to trigger immediate save (called from command)
   */
  public triggerImmediateSave(
    docKey: string,
    panels: Map<string, vscode.WebviewPanel>,
    documents: typeof vscode.workspace.textDocuments,
    postMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): void {
    const panel = panels.get(docKey);
    if (!panel) return;

    const pending = this.pendingContent.get(docKey);
    if (pending !== undefined) {
      // Clear any pending debounce
      const timer = this.saveTimers.get(docKey);
      if (timer) {
        clearTimeout(timer);
        this.saveTimers.delete(docKey);
      }

      // Find the document
      const document = documents.find(d => d.uri.toString() === docKey);
      if (document) {
        this.applyEditImmediate(document, pending, panel, docKey, postMessage);
      }
    }
  }

  /**
   * Create a version history entry for the document
   */
  private async createVersionEntry(docKey: string, content: string): Promise<void> {
    if (!this.context) return;

    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        // Database not yet initialized, skip version creation
        return;
      }
      
      await db.saveVersion(docKey, content);
      console.log(`[VersionHistory] Created version entry for: ${docKey}`);
    } catch (error) {
      // Log error but don't fail the save operation
      console.error(`[VersionHistory] Failed to create version entry:`, error);
    }
  }

  /**
   * Clear all state for a document
   */
  public clearDocumentState(docKey: string): void {
    const timer = this.saveTimers.get(docKey);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(docKey);
    }
    this.pendingContent.delete(docKey);
    this.saveStatusMap.delete(docKey);
  }

  /**
   * Clear all state
   */
  public reset(): void {
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    this.pendingContent.clear();
    this.saveStatusMap.clear();
  }
}

/**
 * Creates a new SaveController instance
 */
export function createSaveController(): SaveController {
  return new SaveController();
}