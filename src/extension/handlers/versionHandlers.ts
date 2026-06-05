import * as vscode from 'vscode';
import { getVersionHistoryDb } from '../versionHistoryDb';
import { computeLineDiff, areStringsEqual } from '../diffUtils';

/**
 * VersionHandlers - Handles version history operations.
 * This handler is responsible for:
 * - Requesting version history for a document
 * - Restoring a specific version
 * - Computing diff between versions
 */
export class VersionHandlers {
  private context: vscode.ExtensionContext | undefined;

  /**
   * Set the extension context (needed for database access)
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Handle request for version history - sends all versions for current document
   */
  public async handleRequestVersionHistory(docKey: string, panel: vscode.WebviewPanel): Promise<void> {
    if (!this.context) return;

    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        panel.webview.postMessage({ type: 'versionHistory', versions: [] });
        return;
      }

      const versions = db.getVersions(docKey);
      panel.webview.postMessage({ type: 'versionHistory', versions });
    } catch (error) {
      console.error('[VersionHistory] Failed to get versions:', error);
      panel.webview.postMessage({ type: 'versionHistory', versions: [] });
    }
  }

  /**
   * Handle restore version request - replaces current content with selected version
   */
  public async handleRestoreVersion(
    docKey: string,
    versionNumber: number,
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    createVersionEntry: (docKey: string, content: string) => Promise<void>
  ): Promise<void> {
    if (!this.context) return;

    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        vscode.window.showErrorMessage('Version history database not initialized');
        return;
      }

      const version = db.getVersion(docKey, versionNumber);
      if (!version) {
        vscode.window.showErrorMessage(`Version ${versionNumber} not found`);
        return;
      }

      // Get the version content - if null, we need to reconstruct from diffs
      const content = version.content;
      if (content === null) {
        // Content was stored as diff, need to reconstruct
        // For now, show an error - full diff reconstruction is complex
        vscode.window.showErrorMessage('Version content not available (stored as diff)');
        return;
      }

      // Ask for confirmation before restoring
      const response = await vscode.window.showInformationMessage(
        `Restore to version ${versionNumber}? This will replace the current content.`,
        { modal: true },
        'Restore',
        'Cancel'
      );

      if (response === 'Restore') {
        // Apply the content
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
          content
        );
        await vscode.workspace.applyEdit(edit);
        await document.save();

        // Create a new version entry after restore
        await createVersionEntry(docKey, content);

        // Notify webview of the restored content
        panel.webview.postMessage({
          type: 'versionRestored',
          versionNumber,
          content,
        });
      }
    } catch (error) {
      console.error('[VersionHistory] Failed to restore version:', error);
      vscode.window.showErrorMessage(`Failed to restore version: ${error}`);
    }
  }

  /**
   * Handle request for diff between two versions
   */
  public async handleRequestVersionDiff(
    docKey: string,
    oldVersion: number,
    newVersion: number,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    if (!this.context) return;

    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        panel.webview.postMessage({ type: 'versionDiffError', error: 'Version history database not initialized' });
        return;
      }

      // Get both versions
      const oldVersionData = db.getVersion(docKey, oldVersion);
      const newVersionData = db.getVersion(docKey, newVersion);

      if (!oldVersionData) {
        panel.webview.postMessage({ type: 'versionDiffError', error: `Version ${oldVersion} not found` });
        return;
      }

      if (!newVersionData) {
        panel.webview.postMessage({ type: 'versionDiffError', error: `Version ${newVersion} not found` });
        return;
      }

      const oldContent = oldVersionData.content;
      const newContent = newVersionData.content;

      // Handle null content cases
      if (oldContent === null && newContent === null) {
        panel.webview.postMessage({ type: 'versionDiffError', error: 'Both versions have no content' });
        return;
      }

      if (oldContent === null) {
        panel.webview.postMessage({ type: 'versionDiffError', error: 'Old version has no content' });
        return;
      }

      if (newContent === null) {
        panel.webview.postMessage({ type: 'versionDiffError', error: 'New version has no content' });
        return;
      }

      // Check if contents are identical
      if (areStringsEqual(oldContent, newContent)) {
        panel.webview.postMessage({
          type: 'versionDiff',
          diff: {
            oldVersion,
            newVersion,
            changes: [],
            stats: { added: 0, removed: 0, unchanged: oldContent.split('\n').length }
          }
        });
        return;
      }

      // Compute the diff
      const diffResult = computeLineDiff(oldContent, newContent);

      // Send the diff result to the webview
      panel.webview.postMessage({
        type: 'versionDiff',
        diff: {
          oldVersion,
          newVersion,
          changes: diffResult.changes,
          stats: diffResult.stats
        }
      });
    } catch (error) {
      console.error('[VersionHistory] Failed to compute diff:', error);
      panel.webview.postMessage({ type: 'versionDiffError', error: `Failed to compute diff: ${error}` });
    }
  }
}

/**
 * Creates a new VersionHandlers instance
 */
export function createVersionHandlers(): VersionHandlers {
  return new VersionHandlers();
}