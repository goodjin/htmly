import * as vscode from 'vscode';
import { 
  EditorMode, 
  ExtToWebMsg, 
  WebToExtMsg, 
  HtmlySettings, 
  SaveStatus, 
  HistoryState,
  CrashRecoveryData,
  ExportFormat,
  TemplateCategory 
} from '../shared/types';
import {
  showExportSaveDialog,
  convertContent,
  convertToEmbeddedHtmlWithImages,
  saveContentToFile,
} from './exportUtils';
import {
  listTemplates,
  saveTemplate,
  deleteTemplate as deleteTemplateFromStorage,
  renameTemplate as renameTemplateInStorage,
} from './templateStorage';

const HISTORY_STATE_KEY = 'htmly.history';
const CRASH_RECOVERY_KEY = 'htmly.crashRecovery';
const MAX_HISTORY_ENTRIES = 100;
const HISTORY_DEBOUNCE_MS = 1000; // Debounce history persistence

export class HtmlyEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'htmly.editor';
  private static readonly modeOrder: EditorMode[] = ['wysiwyg', 'source', 'preview'];
  private static readonly LARGE_FILE_THRESHOLD = 500 * 1024; // 500 KB
  private static readonly SAVE_DEBOUNCE_MS = 500; // Debounce auto-save for 500ms
  private static readonly LARGE_SAVE_THRESHOLD = 100 * 1024; // 100 KB for optimization

  private modeMap = new Map<string, EditorMode>();
  private ackModeMap = new Map<string, EditorMode>();
  private panels = new Map<string, vscode.WebviewPanel>();
  private activePanel: vscode.WebviewPanel | undefined;

  // Debounce state per document
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private pendingContent = new Map<string, string>();
  private saveStatusMap = new Map<string, SaveStatus>();

  // History state per document
  private historyStateMap = new Map<string, HistoryState>();
  private historyTimers = new Map<string, NodeJS.Timeout>();
  private pendingHistory = new Map<string, HistoryState>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  public register(): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      HtmlyEditorProvider.viewType,
      this,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  public cycleActiveMode(): void {
    if (!this.activePanel) {
      return;
    }

    const entry = this.getActivePanelEntry();
    if (!entry) {
      return;
    }

    const [documentUri] = entry;
    const currentMode = this.ackModeMap.get(documentUri) ?? this.modeMap.get(documentUri) ?? 'wysiwyg';
    const currentIndex = HtmlyEditorProvider.modeOrder.indexOf(currentMode);
    const nextMode = HtmlyEditorProvider.modeOrder[(currentIndex + 1) % HtmlyEditorProvider.modeOrder.length];

    this.setActiveMode(nextMode);
  }

  public setActiveMode(mode: EditorMode): void {
    if (!this.activePanel) {
      return;
    }

    const entry = this.getActivePanelEntry();
    if (!entry) {
      return;
    }

    const [documentUri, panel] = entry;
    this.modeMap.set(documentUri, mode);
    this.ackModeMap.set(documentUri, mode);
    this.postMessage(panel, { type: 'setMode', mode });
  }

  public getTestState(): { active: boolean; documentUri?: string; mode?: EditorMode } {
    if (!this.activePanel) {
      return { active: false };
    }

    const entry = this.getActivePanelEntry();
    const documentUri = entry?.[0];

    return {
      active: true,
      documentUri,
      mode: documentUri
        ? this.ackModeMap.get(documentUri) ?? this.modeMap.get(documentUri) ?? 'wysiwyg'
        : undefined,
    };
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    };

    webviewPanel.webview.html = this.getWebviewHtml(webviewPanel.webview);

    const docKey = document.uri.toString();
    this.panels.set(docKey, webviewPanel);
    this.activePanel = webviewPanel;

    // Check for large file BEFORE sending any messages
    // Large files (>500KB) should open in Source mode with readOnly enabled
    const isLargeFile = document.getText().length > HtmlyEditorProvider.LARGE_FILE_THRESHOLD;
    const initialMode: EditorMode = isLargeFile ? 'source' : 'wysiwyg';
    if (isLargeFile) {
      this.modeMap.set(docKey, 'source');
      this.ackModeMap.set(docKey, 'source');
    }

    // Helper to read current settings
    const getSettings = (): HtmlySettings => {
      const config = vscode.workspace.getConfiguration('htmly');
      return {
        defaultMode: config.get<EditorMode>('defaultMode', 'wysiwyg'),
        showButtonLabels: config.get<boolean>('showButtonLabels', true),
        autoHideToolbarInPreview: config.get<boolean>('autoHideToolbarInPreview', true),
        defaultFontSize: config.get<number>('defaultFontSize', 14),
        enableMarkdownShortcuts: config.get<boolean>('enableMarkdownShortcuts', true),
        splitScreenDirection: config.get<'horizontal' | 'vertical'>('splitScreenDirection', 'horizontal'),
        customTheme: {
          primaryColor: config.get<string>('customTheme.primaryColor', '#0e639c'),
        },
      };
    };

    // Webview → Extension
    webviewPanel.webview.onDidReceiveMessage((msg: WebToExtMsg) => {
      switch (msg.type) {
        case 'ready':
          // Check for crash recovery
          this.checkCrashRecovery(docKey, document.getText(), webviewPanel);
          
          this.postMessage(webviewPanel, {
            type: 'init',
            content: document.getText(),
            mode: initialMode,
          });
          this.postMessage(webviewPanel, {
            type: 'theme',
            isDark: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark,
          });
          this.postMessage(webviewPanel, {
            type: 'dirty',
            isDirty: document.isDirty,
          });
          this.postMessage(webviewPanel, {
            type: 'settings',
            settings: getSettings(),
          });
          // Initialize save status
          this.saveStatusMap.set(docKey, 'idle');
          this.postMessage(webviewPanel, {
            type: 'saveStatus',
            status: 'idle',
          });
          if (isLargeFile) {
            // Large file: enable readOnly mode
            this.postMessage(webviewPanel, { type: 'readOnly', enabled: true });
          }
          break;

        case 'contentUpdate':
          // Immediate save (Ctrl+S / Cmd+S) bypasses debounce
          if (msg.immediate) {
            this.applyEditImmediate(document, msg.content, webviewPanel, docKey);
          } else {
            this.applyEditDebounced(document, msg.content, webviewPanel, docKey);
          }
          break;

        case 'modeChanged':
          this.modeMap.set(docKey, msg.mode);
          this.ackModeMap.set(docKey, msg.mode);
          break;

        case 'syncHistory':
          this.syncHistory(docKey, msg.history);
          break;

        case 'selectiveUndo':
          this.handleSelectiveUndo(docKey, msg.targetIndex, webviewPanel, document);
          break;

        case 'exportHistory':
          this.exportHistory(docKey);
          break;

        case 'exportRequest':
          this.handleExportRequest(msg.format, msg.content, docKey, webviewPanel);
          break;

        case 'loadUserTemplates':
          this.handleLoadUserTemplates(webviewPanel);
          break;

        case 'saveAsTemplate':
          this.handleSaveAsTemplate(
            msg.name,
            msg.category,
            msg.content,
            msg.description,
            webviewPanel
          );
          break;

        case 'deleteTemplate':
          this.handleDeleteTemplate(msg.id, webviewPanel);
          break;

        case 'renameTemplate':
          this.handleRenameTemplate(msg.id, msg.newName, webviewPanel);
          break;
      }
    });

    const viewStateSub = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        this.activePanel = e.webviewPanel;
      }
    });

    // Extension → Webview: document changes (e.g. external git checkout)
    const docChangeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === docKey && e.contentChanges.length > 0) {
        this.postMessage(webviewPanel, {
          type: 'contentChanged',
          content: e.document.getText(),
        });
      }
    });

    // Theme changes
    const themeSub = vscode.window.onDidChangeActiveColorTheme((theme) => {
      this.postMessage(webviewPanel, {
        type: 'theme',
        isDark: theme.kind === vscode.ColorThemeKind.Dark,
      });
    });

    // Save events — notify webview of dirty state
    const saveSub = vscode.workspace.onDidSaveTextDocument((saved) => {
      if (saved.uri.toString() === docKey) {
        this.postMessage(webviewPanel, { type: 'dirty', isDirty: false });
      }
    });

    // Settings changes
    const configSub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('htmly.defaultMode') ||
        e.affectsConfiguration('htmly.showButtonLabels') ||
        e.affectsConfiguration('htmly.autoHideToolbarInPreview') ||
        e.affectsConfiguration('htmly.defaultFontSize') ||
        e.affectsConfiguration('htmly.enableMarkdownShortcuts') ||
        e.affectsConfiguration('htmly.splitScreenDirection') ||
        e.affectsConfiguration('htmly.customTheme.primaryColor')
      ) {
        this.postMessage(webviewPanel, {
          type: 'settings',
          settings: getSettings(),
        });
      }
    });

    webviewPanel.onDidDispose(() => {
      // Save history before disposing
      this.persistHistory(docKey);
      
      this.panels.delete(docKey);
      this.ackModeMap.delete(docKey);
      // Clean up debounce timer
      const timer = this.saveTimers.get(docKey);
      if (timer) {
        clearTimeout(timer);
        this.saveTimers.delete(docKey);
      }
      this.pendingContent.delete(docKey);
      this.saveStatusMap.delete(docKey);
      
      // Clean up history timers
      const historyTimer = this.historyTimers.get(docKey);
      if (historyTimer) {
        clearTimeout(historyTimer);
        this.historyTimers.delete(docKey);
      }
      this.pendingHistory.delete(docKey);
      this.historyStateMap.delete(docKey);
      
      if (this.activePanel === webviewPanel) {
        this.activePanel = undefined;
      }
      docChangeSub.dispose();
      themeSub.dispose();
      viewStateSub.dispose();
      saveSub.dispose();
      configSub.dispose();
    });
  }

  /**
   * Check for crash recovery data and prompt user
   */
  private async checkCrashRecovery(
    docKey: string, 
    currentContent: string, 
    panel: vscode.WebviewPanel
  ): Promise<void> {
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
          this.postMessage(panel, {
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
   * Sync history from webview with debounced persistence
   */
  private syncHistory(docKey: string, history: HistoryState): void {
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
  private async persistHistory(docKey: string): Promise<void> {
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
  private handleSelectiveUndo(
    docKey: string,
    targetIndex: number,
    panel: vscode.WebviewPanel,
    document: vscode.TextDocument
  ): void {
    const history = this.historyStateMap.get(docKey);
    if (!history || targetIndex < 0 || targetIndex >= history.entries.length) {
      return;
    }

    const targetEntry = history.entries[targetIndex];
    if (targetEntry) {
      // Apply the content at target index
      this.applyEditImmediate(document, targetEntry.content, panel, docKey);
      
      // Update current index
      history.currentIndex = targetIndex;
      this.historyStateMap.set(docKey, { ...history });
      
      // Notify webview of history update
      this.postMessage(panel, {
        type: 'historyUpdate',
        history: { entries: history.entries, currentIndex: targetIndex },
      });
    }
  }

  /**
   * Export history as JSON file
   */
  private async exportHistory(docKey: string): Promise<void> {
    const history = this.historyStateMap.get(docKey);
    if (!history) {
      vscode.window.showInformationMessage('No history to export.');
      return;
    }

    const panel = this.panels.get(docKey);
    if (!panel) return;

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
      this.postMessage(panel, {
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
   * Handle export request from webview
   * Shows save dialog, converts content, and saves to file
   * Note: PDF export is handled directly in the webview using window.print()
   */
  private async handleExportRequest(
    format: ExportFormat,
    content: string,
    docKey: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    // PDF export is handled by the webview (window.print())
    // The extension doesn't need to do anything for PDF
    if (format === 'pdf') {
      // Send success response - actual PDF generation happens in browser
      this.postMessage(panel, {
        type: 'exportResponse',
        success: true,
      });
      return;
    }

    // Get the original document file name for the default save name
    const originalDocument = vscode.workspace.textDocuments.find(d => d.uri.toString() === docKey);
    const originalFileName = originalDocument?.fileName;

    try {
      // Show save dialog
      const saveUri = await showExportSaveDialog(format, originalFileName);

      if (!saveUri) {
        // User cancelled
        this.postMessage(panel, {
          type: 'exportResponse',
          success: false,
          error: 'Export cancelled by user',
        });
        return;
      }

      // Convert content based on format
      // For embedded HTML, use async version to convert images to base64
      let convertedContent: string;
      if (format === 'embedded') {
        // Create a readFile function using VS Code's fs API
        const readFile = async (uri: string): Promise<Uint8Array | null> => {
          try {
            return await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
          } catch {
            return null;
          }
        };
        convertedContent = await convertToEmbeddedHtmlWithImages(content, undefined, readFile);
      } else {
        convertedContent = convertContent(format, content);
      }

      // Save the file
      await saveContentToFile(saveUri, convertedContent);

      // Send success response
      this.postMessage(panel, {
        type: 'exportResponse',
        success: true,
        filePath: saveUri.fsPath,
      });

      // Show success notification
      const formatLabel = format.charAt(0).toUpperCase() + format.slice(1);
      vscode.window.showInformationMessage(
        `${formatLabel} exported successfully`,
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.commands.executeCommand('vscode.open', saveUri);
        }
      });
    } catch (error) {
      // Send failure response
      this.postMessage(panel, {
        type: 'exportResponse',
        success: false,
        error: `Export failed: ${error}`,
      });
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }

  /**
   * Get history state for a document (for testing/debugging)
   */
  public getHistoryState(docKey: string): HistoryState | undefined {
    return this.historyStateMap.get(docKey);
  }

  /**
   * Apply edit with debounce (500ms) for auto-save
   */
  private applyEditDebounced(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string
  ): void {
    // Clear any existing timer
    const existingTimer = this.saveTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending content
    this.pendingContent.set(docKey, newContent);

    // Update status to 'saving' (debouncing)
    this.updateSaveStatus(panel, docKey, 'saving');

    // Set new debounce timer
    const timer = setTimeout(() => {
      const pending = this.pendingContent.get(docKey);
      if (pending !== undefined) {
        this.executeSave(document, pending, panel, docKey);
      }
    }, HtmlyEditorProvider.SAVE_DEBOUNCE_MS);

    this.saveTimers.set(docKey, timer);
  }

  /**
   * Immediate save - bypasses debounce (triggered by Ctrl+S / Cmd+S)
   */
  private applyEditImmediate(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string
  ): void {
    // Clear any pending debounce timer
    const existingTimer = this.saveTimers.get(docKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.saveTimers.delete(docKey);
    }

    this.executeSave(document, newContent, panel, docKey);
  }

  /**
   * Execute the actual file save
   */
  private executeSave(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string
  ): void {
    // Clear pending state
    this.pendingContent.delete(docKey);
    this.saveTimers.delete(docKey);

    if (document.getText() === newContent) {
      this.updateSaveStatus(panel, docKey, 'idle');
      return;
    }

    const fileSize = newContent.length;
    const isLargeFile = fileSize > HtmlyEditorProvider.LARGE_SAVE_THRESHOLD;

    if (isLargeFile) {
      // Use optimized batch edit for large files
      this.executeLargeFileSave(document, newContent, panel, docKey);
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
          this.updateSaveStatus(panel, docKey, 'saved');
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (this.saveStatusMap.get(docKey) === 'saved') {
              this.updateSaveStatus(panel, docKey, 'idle');
            }
          }, 2000);
        })
        .catch(() => {
          this.updateSaveStatus(panel, docKey, 'error');
        });
    }
  }

  /**
   * Optimized save for large files (>100KB)
   * Uses single replace instead of character-by-character edits
   */
  private executeLargeFileSave(
    document: vscode.TextDocument,
    newContent: string,
    panel: vscode.WebviewPanel,
    docKey: string
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
          this.updateSaveStatus(panel, docKey, 'saved');
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (this.saveStatusMap.get(docKey) === 'saved') {
              this.updateSaveStatus(panel, docKey, 'idle');
            }
          }, 2000);
        })
        .catch(() => {
          this.updateSaveStatus(panel, docKey, 'error');
        });
    } catch (error) {
      this.updateSaveStatus(panel, docKey, 'error');
    }
  }

  /**
   * Update save status and notify webview
   */
  private updateSaveStatus(panel: vscode.WebviewPanel, docKey: string, status: SaveStatus): void {
    const currentStatus = this.saveStatusMap.get(docKey);
    if (currentStatus !== status) {
      this.saveStatusMap.set(docKey, status);
      this.postMessage(panel, { type: 'saveStatus', status });
    }
  }

  /**
   * Public method to trigger immediate save (called from command)
   */
  public triggerImmediateSave(docKey: string): void {
    const panel = this.panels.get(docKey);
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
      const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === docKey);
      if (document) {
        this.applyEditImmediate(document, pending, panel, docKey);
      }
    }
  }

  private applyEdit(document: vscode.TextDocument, newContent: string, panel?: vscode.WebviewPanel): void {
    if (document.getText() === newContent) {
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
      newContent
    );
    vscode.workspace.applyEdit(edit).then(() => {
      if (panel) {
        this.postMessage(panel, { type: 'dirty', isDirty: document.isDirty });
      }
    });
  }

  private postMessage(panel: vscode.WebviewPanel, msg: ExtToWebMsg): void {
    panel.webview.postMessage(msg);
  }

  private getActivePanelEntry(): [string, vscode.WebviewPanel] | undefined {
    return [...this.panels.entries()].find(([, panel]) => panel === this.activePanel);
  }

  /**
   * Handle load user templates request
   */
  private async handleLoadUserTemplates(panel: vscode.WebviewPanel): Promise<void> {
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
      this.postMessage(panel, { type: 'userTemplates', templates: metadata });
    } catch (error) {
      console.error('Failed to load user templates:', error);
      this.postMessage(panel, { type: 'userTemplates', templates: [] });
    }
  }

  /**
   * Handle save as template request
   */
  private async handleSaveAsTemplate(
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
        this.postMessage(panel, {
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
        this.postMessage(panel, {
          type: 'saveTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'saveTemplateResponse',
        success: false,
        error: `Failed to save template: ${error}`,
      });
    }
  }

  /**
   * Handle delete template request
   */
  private async handleDeleteTemplate(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await deleteTemplateFromStorage(id);

      if (result.success) {
        this.postMessage(panel, {
          type: 'deleteTemplateResponse',
          success: true,
        });
      } else {
        this.postMessage(panel, {
          type: 'deleteTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'deleteTemplateResponse',
        success: false,
        error: `Failed to delete template: ${error}`,
      });
    }
  }

  /**
   * Handle rename template request
   */
  private async handleRenameTemplate(
    id: string,
    newName: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const result = await renameTemplateInStorage(id, newName);

      if (result.success && result.template) {
        this.postMessage(panel, {
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
        this.postMessage(panel, {
          type: 'renameTemplateResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'renameTemplateResponse',
        success: false,
        error: `Failed to rename template: ${error}`,
      });
    }
  }

  private getWebviewHtml(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'index.css'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:; font-src ${webview.cspSource}; frame-src ${webview.cspSource} data: blob:; child-src ${webview.cspSource} data: blob:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>Htmly</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
