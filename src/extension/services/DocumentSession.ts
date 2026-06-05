import * as vscode from 'vscode';
import { EditorMode } from '../../shared/types';

/**
 * DocumentSession - Manages per-document state including panels, modes, and active panel tracking.
 * This service is responsible for:
 * - Tracking webview panels per document
 * - Managing editor modes (wysiwyg, source, preview)
 * - Tracking acknowledged modes for confirmation
 * - Active panel management
 */
export class DocumentSession {
  private readonly modeMap = new Map<string, EditorMode>();
  private readonly ackModeMap = new Map<string, EditorMode>();
  private readonly panels = new Map<string, vscode.WebviewPanel>();
  private activePanel: vscode.WebviewPanel | undefined;

  /**
   * Register a panel for a document
   */
  public registerPanel(docKey: string, panel: vscode.WebviewPanel): void {
    this.panels.set(docKey, panel);
    this.activePanel = panel;
  }

  /**
   * Unregister a panel for a document
   */
  public unregisterPanel(docKey: string): void {
    this.panels.delete(docKey);
    this.ackModeMap.delete(docKey);
    if (this.activePanel && this.panels.get(docKey) === this.activePanel) {
      this.activePanel = undefined;
    }
  }

  /**
   * Set the active panel based on view state changes
   */
  public setActivePanel(panel: vscode.WebviewPanel): void {
    if (panel.active) {
      this.activePanel = panel;
    }
  }

  /**
   * Get the currently active panel
   */
  public getActivePanel(): vscode.WebviewPanel | undefined {
    return this.activePanel;
  }

  /**
   * Get panel entry for the active panel [docKey, panel]
   */
  public getActivePanelEntry(): [string, vscode.WebviewPanel] | undefined {
    return [...this.panels.entries()].find(([, panel]) => panel === this.activePanel);
  }

  /**
   * Get panel for a specific document
   */
  public getPanel(docKey: string): vscode.WebviewPanel | undefined {
    return this.panels.get(docKey);
  }

  /**
   * Get all panels
   */
  public getAllPanels(): Map<string, vscode.WebviewPanel> {
    return this.panels;
  }

  /**
   * Set mode for a document
   */
  public setMode(docKey: string, mode: EditorMode): void {
    this.modeMap.set(docKey, mode);
  }

  /**
   * Get mode for a document
   */
  public getMode(docKey: string): EditorMode | undefined {
    return this.modeMap.get(docKey);
  }

  /**
   * Set acknowledged mode for a document
   */
  public setAckMode(docKey: string, mode: EditorMode): void {
    this.ackModeMap.set(docKey, mode);
  }

  /**
   * Get acknowledged mode for a document
   */
  public getAckMode(docKey: string): EditorMode | undefined {
    return this.ackModeMap.get(docKey);
  }

  /**
   * Get effective mode (ackMode if set, otherwise mode)
   */
  public getEffectiveMode(docKey: string): EditorMode {
    return this.ackModeMap.get(docKey) ?? this.modeMap.get(docKey) ?? 'wysiwyg';
  }

  /**
   * Clear all state for a document
   */
  public clearDocumentState(docKey: string): void {
    this.modeMap.delete(docKey);
    this.ackModeMap.delete(docKey);
    this.panels.delete(docKey);
    if (this.activePanel && !this.panels.has(docKey)) {
      this.activePanel = undefined;
    }
  }

  /**
   * Clear all state
   */
  public reset(): void {
    this.modeMap.clear();
    this.ackModeMap.clear();
    this.panels.clear();
    this.activePanel = undefined;
  }
}

/**
 * Creates a new DocumentSession instance
 */
export function createDocumentSession(): DocumentSession {
  return new DocumentSession();
}