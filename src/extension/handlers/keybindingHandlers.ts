import * as vscode from 'vscode';
import {
  getAllKeybindings,
  setKeybindingOverride,
  removeKeybindingOverride,
  resetKeybindings,
  exportKeybindings,
  importKeybindings,
} from '../keybindingManager';

/**
 * KeybindingHandlers - Handles keybinding management operations.
 * This handler is responsible for:
 * - Loading keybindings
 * - Exporting keybindings
 * - Importing keybindings
 * - Setting/removing keybinding overrides
 * - Resetting keybindings
 */
export class KeybindingHandlers {
  /**
   * Handle show keybinding manager request
   */
  public handleShowKeybindingManager(panel: vscode.WebviewPanel): void {
    const keybindings = getAllKeybindings();
    panel.webview.postMessage({ type: 'keybindingsList', commands: keybindings });
    panel.webview.postMessage({ type: 'keybindingManager', show: true });
  }

  /**
   * Handle load keybindings request
   */
  public handleLoadKeybindings(panel: vscode.WebviewPanel): void {
    const keybindings = getAllKeybindings();
    panel.webview.postMessage({ type: 'keybindingsList', commands: keybindings });
  }

  /**
   * Handle export keybindings request
   */
  public async handleExportKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await exportKeybindings();
      if (result.success) {
        panel.webview.postMessage({
          type: 'keybindingExportResponse',
          success: true,
          filePath: result.filePath,
        });
      } else {
        panel.webview.postMessage({
          type: 'keybindingExportResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'keybindingExportResponse',
        success: false,
        error: String(error),
      });
    }
  }

  /**
   * Handle import keybindings request
   */
  public async handleImportKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await importKeybindings();
      if (result.success) {
        // Notify all panels of the keybinding change
        this.notifyKeybindingChange();
        panel.webview.postMessage({
          type: 'keybindingImportResponse',
          success: true,
          count: result.count,
        });
      } else {
        panel.webview.postMessage({
          type: 'keybindingImportResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      panel.webview.postMessage({
        type: 'keybindingImportResponse',
        success: false,
        error: String(error),
      });
    }
  }

  /**
   * Handle set keybinding override request
   */
  public handleSetKeybindingOverride(command: string, key: string, mac?: string): void {
    setKeybindingOverride(command, key, mac);
    this.notifyKeybindingChange();
  }

  /**
   * Handle remove keybinding override request
   */
  public handleRemoveKeybindingOverride(command: string): void {
    removeKeybindingOverride(command);
    this.notifyKeybindingChange();
  }

  /**
   * Handle reset all keybindings request
   */
  public async handleResetKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    await resetKeybindings();
    this.notifyKeybindingChange();
    const keybindings = getAllKeybindings();
    panel.webview.postMessage({ type: 'keybindingsList', commands: keybindings });
  }

  /**
   * Notify all open panels that keybindings have changed
   */
  public notifyKeybindingChange(): void {
    // Note: getAllKeybindings() is called to get current keybindings
    // The actual notification is handled by editorProvider.ts iterating through all panels
    void getAllKeybindings();
  }
}

/**
 * Creates a new KeybindingHandlers instance
 */
export function createKeybindingHandlers(): KeybindingHandlers {
  return new KeybindingHandlers();
}