import * as vscode from 'vscode';
import { HtmlyEditorProvider } from './editorProvider';

export function activate(context: vscode.ExtensionContext) {
  // Register the custom editor provider
  context.subscriptions.push(HtmlyEditorProvider.register(context));

  // Toggle mode command
  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.toggleMode', () => {
      // The webview itself handles toggle UI; this command triggers a message to it
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (!activeTab) return;
      // Post toggle request via VS Code's webview messaging
      // The webview listens for this via the built-in command palette flow
      vscode.commands.executeCommand('htmly.internal.toggleMode');
    })
  );
}

export function deactivate() {}
