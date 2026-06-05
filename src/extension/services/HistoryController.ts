import * as vscode from 'vscode';
import { HistoryState, CrashRecoveryData } from '../../shared/types';
import { MAX_HISTORY_ENTRIES, HISTORY_DEBOUNCE_MS } from '../../shared/constants';

/**
 * Message types for webview communication
 */
interface WebviewMessage {
  type: string;
  [key: string]: unknown;
}

const HISTORY_STATE_KEY = 'htmly.history';
const CRASH_RECOVERY_KEY = 'htmly.crashRecovery';

/**
 * HistoryController - Manages history/undo/redo operations with debounced persistence.
 * This service is responsible for:
 * - Syncing history state from webview
 * - Debounced persistence to workspace state
 * - Crash recovery data management
 * - Selective undo handling
 * - History export
 */
export class HistoryController {
  private readonly historyStateMap = new Map<string, HistoryState>();
  private readonly historyTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingHistory = new Map<string, HistoryState>();

  private context: vscode.ExtensionContext | undefined;

  /**
   * Set the extension context (needed for workspace state)
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Sync history from webview with debounced persistence
   */
  public syncHistory(docKey: string, history: HistoryState): void {
    // Store the latest history state
    this.historyStateMap.set(docKey, history);
    
    // Clear any existing timer
    const existingTimer = this.historyTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending history
    this.pendingHistory.set(docKey, history);

    // Set new debounce timer for persistence
    const timer = setTimeout(() => {
      this.persistHistory(docKey);
    }, HISTORY_DEBOUNCE_MS);

    this.historyTimers.set(docKey, timer);
  }

  /**
   * Persist history to workspace state
   */
  public async persistHistory(docKey: string): Promise<void> {
    if (!this.context) return;

    const history = this.pendingHistory.get(docKey) || this.historyStateMap.get(docKey);
    if (!history) return;

    // Clear pending
    this.pendingHistory.delete(docKey);
    this.historyTimers.delete(docKey);

    // Trim history if exceeds max entries (memory optimization)
    let trimmedHistory = history;
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      const overflow = history.entries.length - MAX_HISTORY_ENTRIES;
      trimmedHistory = {
        entries: history.entries.slice(overflow),
        currentIndex: Math.max(0, history.currentIndex - overflow),
      };
    }

    // Store in workspace state
    await this.context.workspaceState.update(HISTORY_STATE_KEY, {
      ...trimmedHistory,
      documentUri: docKey,
    });

    // Also update crash recovery data
    const lastEntry = trimmedHistory.entries[trimmedHistory.entries.length - 1];
    const crashData: CrashRecoveryData = {
      documentUri: docKey,
      lastContent: lastEntry?.content || '',
      history: trimmedHistory,
      savedAt: Date.now(),
    };
    await this.context.workspaceState.update(CRASH_RECOVERY_KEY, crashData);
  }

  /**
   * Handle selective undo from history panel
   */
  public handleSelectiveUndo(
    docKey: string,
    targetIndex: number,
    panel: vscode.WebviewPanel,
    document: vscode.TextDocument,
    sendMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void,
    applyEditImmediate: (document: vscode.TextDocument, newContent: string, panel: vscode.WebviewPanel, docKey: string) => void
  ): void {
    const history = this.historyStateMap.get(docKey);
    if (!history || targetIndex < 0 || targetIndex >= history.entries.length) {
      return;
    }

    const targetEntry = history.entries[targetIndex];
    if (targetEntry) {
      // Apply the content at target index
      applyEditImmediate(document, targetEntry.content, panel, docKey);
      
      // Update current index
      history.currentIndex = targetIndex;
      this.historyStateMap.set(docKey, { ...history });
      
      // Notify webview of history update
      sendMessage(panel, {
        type: 'historyUpdate',
        history: { entries: history.entries, currentIndex: targetIndex },
      });
    }
  }

  /**
   * Export history as JSON file
   */
  public async exportHistory(
    docKey: string,
    panels: Map<string, vscode.WebviewPanel>
  ): Promise<void> {
    const history = this.historyStateMap.get(docKey);
    if (!history) {
      vscode.window.showInformationMessage('No history to export.');
      return;
    }

    const panel = panels.get(docKey);
    if (!panel || !this.context) return;

    try {
      // Create export data
      const exportData = {
        documentUri: docKey,
        exportedAt: new Date().toISOString(),
        historySize: history.entries.length,
        currentIndex: history.currentIndex,
        entries: history.entries.map((entry, index) => ({
          index,
          timestamp: new Date(entry.timestamp).toISOString(),
          contentLength: entry.content.length,
          content: entry.content,
          cursorPosition: entry.cursorPosition,
        })),
      };

      // Create a temporary file for the export
      const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === docKey);
      const fileName = document?.fileName || 'htmly-history';
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const exportPath = vscode.Uri.joinPath(
        this.context.globalStorageUri || this.context.extensionUri,
        `${baseName}-history-${Date.now()}.json`
      );

      // Write the file using workspace API
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(
        exportPath,
        encoder.encode(JSON.stringify(exportData, null, 2))
      );

      // Notify webview of successful export
      panel.webview.postMessage({
        type: 'historyExported',
        path: exportPath.fsPath,
      });

      vscode.window.showInformationMessage(
        `History exported to: ${exportPath.fsPath}`,
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.commands.executeCommand('vscode.open', exportPath);
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export history: ${error}`);
    }
  }

  /**
   * Check for crash recovery data and prompt user
   */
  public async checkCrashRecovery(
    docKey: string,
    currentContent: string,
    panel: vscode.WebviewPanel,
    sendMessage: (panel: vscode.WebviewPanel, msg: WebviewMessage) => void
  ): Promise<void> {
    if (!this.context) return;

    const crashData = this.context.workspaceState.get<CrashRecoveryData>(CRASH_RECOVERY_KEY);
    
    if (crashData && crashData.documentUri === docKey) {
      // Check if there's meaningful history to recover
      const hasHistory = crashData.history && 
                        crashData.history.entries && 
                        crashData.history.entries.length > 0;
      
      if (hasHistory) {
        const response = await vscode.window.showWarningMessage(
          'Recover draft?',
          { modal: true },
          'Recover Draft',
          'Discard'
        );

        if (response === 'Recover Draft') {
          // Send crash recovery data to webview
          sendMessage(panel, {
            type: 'crashRecovery',
            data: crashData,
          });
        } else {
          // User discarded - clear crash recovery data
          await this.context.workspaceState.update(CRASH_RECOVERY_KEY, undefined);
        }
      }
    }
  }

  /**
   * Get history state for a document
   */
  public getHistoryState(docKey: string): HistoryState | undefined {
    return this.historyStateMap.get(docKey);
  }

  /**
   * Clear all state for a document
   */
  public clearDocumentState(docKey: string): void {
    const historyTimer = this.historyTimers.get(docKey);
    if (historyTimer) {
      clearTimeout(historyTimer);
      this.historyTimers.delete(docKey);
    }
    this.pendingHistory.delete(docKey);
    this.historyStateMap.delete(docKey);
  }

  /**
   * Clear all state
   */
  public reset(): void {
    this.historyTimers.forEach(timer => clearTimeout(timer));
    this.historyTimers.clear();
    this.pendingHistory.clear();
    this.historyStateMap.clear();
  }
}

/**
 * Creates a new HistoryController instance
 */
export function createHistoryController(): HistoryController {
  return new HistoryController();
}