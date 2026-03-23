import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EditorMode, ExtToWebMsg, WebToExtMsg } from '../shared/types';

export class HtmlyEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'htmly.editor';

  // Track mode per document URI
  private modeMap = new Map<string, EditorMode>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new HtmlyEditorProvider(context);
    const disposable = vscode.window.registerCustomEditorProvider(
      HtmlyEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return disposable;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    };

    webviewPanel.webview.html = this.getWebviewHtml(webviewPanel.webview);

    const docKey = document.uri.toString();
    const currentMode: EditorMode = this.modeMap.get(docKey) ?? 'wysiwyg';

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
          break;

        case 'contentUpdate':
          this.applyEdit(document, msg.content);
          break;

        case 'modeChanged':
          this.modeMap.set(docKey, msg.mode);
          break;
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

    webviewPanel.onDidDispose(() => {
      docChangeSub.dispose();
      themeSub.dispose();
    });
  }

  public toggleMode(mode: EditorMode, uri: vscode.Uri, panel?: vscode.WebviewPanel): void {
    this.modeMap.set(uri.toString(), mode);
  }

  private applyEdit(document: vscode.TextDocument, newContent: string): void {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      newContent
    );
    vscode.workspace.applyEdit(edit);
  }

  private postMessage(panel: vscode.WebviewPanel, msg: ExtToWebMsg): void {
    panel.webview.postMessage(msg);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:; font-src ${webview.cspSource};">
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
