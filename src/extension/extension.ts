import * as vscode from 'vscode';
import { HtmlyEditorProvider } from './editorProvider';
import type { EditorMode } from '../shared/types';

const MODE_LABELS: Record<EditorMode, string> = {
  wysiwyg: 'WYSIWYG',
  source: 'Source',
  preview: 'Preview',
  split: 'Split',
};

const MODE_ICONS: Record<EditorMode, string> = {
  wysiwyg: '$(eye)',
  source: '$(code)',
  preview: '$(preview)',
  split: '$(split-horizontal)',
};

export function activate(context: vscode.ExtensionContext) {
  const provider = new HtmlyEditorProvider(context);
  context.subscriptions.push(provider.register());

  // Status bar item for mode display and switching
  const statusBarItem = vscode.window.createStatusBarItem(
    'htmly.mode',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = '$(eye) WYSIWYG';
  statusBarItem.tooltip = 'Htmly Editor Mode';
  statusBarItem.command = 'htmly.cycleMode';
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  // Command to cycle through modes (status bar click)
  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.cycleMode', async () => {
      const modes: EditorMode[] = ['wysiwyg', 'source', 'preview', 'split'];
      const items = modes.map((mode) => ({
        label: `${MODE_ICONS[mode]} ${MODE_LABELS[mode]}`,
        mode,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select editor mode',
      });

      if (selected) {
        provider.setActiveMode(selected.mode);
        statusBarItem.text = `${MODE_ICONS[selected.mode]} ${MODE_LABELS[selected.mode]}`;
      }
    })
  );

  // Toggle mode command (existing)
  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.toggleMode', () => {
      provider.cycleActiveMode();
    })
  );

  // Individual mode commands
  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.setMode.wysiwyg', () => {
      provider.setActiveMode('wysiwyg');
      statusBarItem.text = `${MODE_ICONS.wysiwyg} ${MODE_LABELS.wysiwyg}`;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.setMode.source', () => {
      provider.setActiveMode('source');
      statusBarItem.text = `${MODE_ICONS.source} ${MODE_LABELS.source}`;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.setMode.preview', () => {
      provider.setActiveMode('preview');
      statusBarItem.text = `${MODE_ICONS.preview} ${MODE_LABELS.preview}`;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('htmly.setMode.split', () => {
      provider.setActiveMode('split');
      statusBarItem.text = `${MODE_ICONS.split} ${MODE_LABELS.split}`;
    })
  );

  if (process.env.HTMLY_E2E === '1') {
    context.subscriptions.push(
      vscode.commands.registerCommand('htmly.test.getState', () => provider.getTestState())
    );
  }
}

export function deactivate() {}
