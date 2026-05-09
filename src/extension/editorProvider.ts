import * as vscode from 'vscode';
import { EditorMode, ExtToWebMsg, WebToExtMsg, HtmlySettings } from '../shared/types';

export class HtmlyEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'htmly.editor';
  private static readonly modeOrder: EditorMode[] = ['wysiwyg', 'source', 'preview'];
  private static readonly LARGE_FILE_THRESHOLD = 500 * 1024; // 500 KB

  private modeMap = new Map<string, EditorMode>();
  private ackModeMap = new Map<string, EditorMode>();
  private panels = new Map<string, vscode.WebviewPanel>();
  private activePanel: vscode.WebviewPanel | undefined;

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
          if (document.getText().length > HtmlyEditorProvider.LARGE_FILE_THRESHOLD) {
            this.postMessage(webviewPanel, { type: 'readOnly', enabled: true });
          }
          break;

        case 'contentUpdate':
          this.applyEdit(document, msg.content, webviewPanel);
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
