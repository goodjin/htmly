import * as vscode from 'vscode';
import { EditorMode, ExtToWebMsg, WebToExtMsg, HtmlySettings, SaveStatus } from '../shared/types';

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
          this.postMessage(webviewPanel, {
            type: 'init',
            content: document.getText(),
            mode: this.modeMap.get(docKey) ?? 'wysiwyg',
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
          if (document.getText().length > HtmlyEditorProvider.LARGE_FILE_THRESHOLD) {
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
