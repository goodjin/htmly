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
  TemplateCategory,
  SnippetCategory,
  CloudStorageProvider,
  SeoSettings,
  StaticSiteOptions,
  PdfExportOptions
} from '../shared/types';
import {
  showExportSaveDialog,
  convertContent,
  convertToEmbeddedHtmlWithImages,
  saveContentToFile,
  exportStaticSite,
} from './exportUtils';
import {
  listTemplates,
  saveTemplate,
  deleteTemplate as deleteTemplateFromStorage,
  renameTemplate as renameTemplateInStorage,
} from './templateStorage';
import {
  listSnippets,
  saveSnippet,
  deleteSnippet as deleteSnippetFromStorage,
  loadSnippetContent,
} from './snippetStorage';
import {
  getAllKeybindings,
  setKeybindingOverride,
  removeKeybindingOverride,
  resetKeybindings,
  exportKeybindings,
  importKeybindings,
} from './keybindingManager';
import { backlinksIndex } from './backlinksIndex';
import { getVersionHistoryDb } from './versionHistoryDb';
import {
  initializePdfMake,
  createPdfMakeConfig,
  createPdfFromHtmlContent,
  PdfMakeConfig
} from './pdfmakeUtils';
import {
  createDocxFromHtml,
  createDocxConfig,
} from './docxUtils';

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

  /**
   * Show the project search panel in the webview
   */
  public showProjectSearch(): void {
    if (!this.activePanel) {
      return;
    }

    const entry = this.getActivePanelEntry();
    if (!entry) {
      return;
    }

    const [, panel] = entry;
    this.postMessage(panel, { type: 'showProjectSearch' });
  }

  /**
   * Show the keybinding manager panel in the webview
   */
  public showKeybindingManager(): void {
    if (!this.activePanel) {
      return;
    }

    const entry = this.getActivePanelEntry();
    if (!entry) {
      return;
    }

    const [, panel] = entry;
    const keybindings = getAllKeybindings();
    this.postMessage(panel, { type: 'keybindingsList', commands: keybindings });
    this.postMessage(panel, { type: 'keybindingManager', show: true });
  }

  /**
   * Notify all open panels that keybindings have changed
   */
  public notifyKeybindingChange(): void {
    const keybindings = getAllKeybindings();
    for (const [, panel] of this.panels) {
      this.postMessage(panel, { type: 'keybindingsList', commands: keybindings });
    }
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
        cloudStorage: {
          provider: config.get<CloudStorageProvider>('cloudStorage.provider', 'none'),
          s3: {
            accessKeyId: config.get<string>('cloudStorage.s3.accessKeyId', ''),
            secretAccessKey: config.get<string>('cloudStorage.s3.secretAccessKey', ''),
            bucket: config.get<string>('cloudStorage.s3.bucket', ''),
            region: config.get<string>('cloudStorage.s3.region', 'us-east-1'),
          },
          cloudinary: {
            apiKey: config.get<string>('cloudStorage.cloudinary.apiKey', ''),
            apiSecret: config.get<string>('cloudStorage.cloudinary.apiSecret', ''),
            cloudName: config.get<string>('cloudStorage.cloudinary.cloudName', ''),
          },
          imgbb: {
            apiKey: config.get<string>('cloudStorage.imgbb.apiKey', ''),
          },
        },
        spellCheck: {
          enabled: config.get<boolean>('spellCheck.enabled', true),
          customDictionary: config.get<string[]>('spellCheck.customDictionary', []),
        },
      };
    };

    // Webview → Extension
    webviewPanel.webview.onDidReceiveMessage(async (msg: WebToExtMsg) => {
      switch (msg.type) {
        case 'ready': {
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
          
          // Send wiki pages and backlinks
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceRoot) {
            backlinksIndex.setContext(workspaceRoot, docKey);
            
            // Update the backlinks index
            await backlinksIndex.updateIndex();
            
            // Send all wiki pages for autocomplete
            const allPages = backlinksIndex.getAllPages();
            this.postMessage(webviewPanel, { type: 'wikiPages', pages: allPages });
            
            // Send backlinks for the current page
            const currentPageName = backlinksIndex.getCurrentPageName();
            const backlinks = backlinksIndex.getBacklinks(currentPageName);
            this.postMessage(webviewPanel, { 
              type: 'backlinks', 
              pageName: currentPageName,
              backlinks 
            });
          }
          break;
        }

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
          this.handleExportRequest(msg.format, msg.content, docKey, webviewPanel, msg.seoSettings, msg.siteOptions, msg.options);
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

        case 'loadUserSnippets':
          this.handleLoadUserSnippets(webviewPanel);
          break;

        case 'saveAsSnippet':
          this.handleSaveAsSnippet(
            msg.name,
            msg.category,
            msg.html,
            msg.description,
            msg.preview,
            webviewPanel
          );
          break;

        case 'deleteSnippet':
          this.handleDeleteSnippet(msg.id, webviewPanel);
          break;

        case 'loadSnippetContent':
          this.handleLoadSnippetContent(msg.id, webviewPanel);
          break;

        case 'projectSearch':
          this.handleProjectSearch(msg.query, msg.isRegex, webviewPanel);
          break;

        case 'openFile':
          this.handleOpenFile(msg.filePath, msg.line, msg.column);
          break;

        case 'addToSpellDictionary':
          this.handleAddToSpellDictionary(msg.word);
          break;

        case 'removeFromSpellDictionary':
          this.handleRemoveFromSpellDictionary(msg.word);
          break;

        case 'setSpellCheckEnabled':
          this.handleSetSpellCheckEnabled(msg.enabled);
          break;

        case 'requestSpellCheck':
          this.handleRequestSpellCheck(msg.content, webviewPanel);
          break;

        case 'requestSpellCheckWord':
          this.handleRequestSpellCheckWord(msg.word, webviewPanel);
          break;

        case 'showKeybindingManager':
          this.handleShowKeybindingManager(webviewPanel);
          break;

        case 'loadKeybindings':
          this.handleLoadKeybindings(webviewPanel);
          break;

        case 'exportKeybindings':
          await this.handleExportKeybindings(webviewPanel);
          break;

        case 'importKeybindings':
          await this.handleImportKeybindings(webviewPanel);
          break;

        case 'setKeybindingOverride':
          this.handleSetKeybindingOverride(msg.command, msg.key, msg.mac);
          break;

        case 'removeKeybindingOverride':
          this.handleRemoveKeybindingOverride(msg.command);
          break;

        case 'resetKeybindings':
          await this.handleResetKeybindings(webviewPanel);
          break;
        case 'requestBacklinks':
          await this.handleRequestBacklinks(msg.pageName, webviewPanel);
          break;
        case 'openWikiLink':
          await this.handleOpenWikiLink(msg.pageName, msg.existingPages, webviewPanel);
          break;
        case 'requestVersionHistory':
          await this.handleRequestVersionHistory(docKey, webviewPanel);
          break;
        case 'restoreVersion':
          await this.handleRestoreVersion(docKey, msg.versionNumber, document, webviewPanel);
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
        e.affectsConfiguration('htmly.customTheme.primaryColor') ||
        e.affectsConfiguration('htmly.cloudStorage.provider') ||
        e.affectsConfiguration('htmly.cloudStorage.s3.accessKeyId') ||
        e.affectsConfiguration('htmly.cloudStorage.s3.secretAccessKey') ||
        e.affectsConfiguration('htmly.cloudStorage.s3.bucket') ||
        e.affectsConfiguration('htmly.cloudStorage.s3.region') ||
        e.affectsConfiguration('htmly.cloudStorage.cloudinary.apiKey') ||
        e.affectsConfiguration('htmly.cloudStorage.cloudinary.apiSecret') ||
        e.affectsConfiguration('htmly.cloudStorage.cloudinary.cloudName') ||
        e.affectsConfiguration('htmly.cloudStorage.imgbb.apiKey')
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
   * PDF export uses pdfmake for proper HTML-to-PDF conversion
   */
  private async handleExportRequest(
    format: ExportFormat,
    content: string,
    docKey: string,
    panel: vscode.WebviewPanel,
    seoSettings?: SeoSettings,
    siteOptions?: Partial<StaticSiteOptions>,
    options?: PdfExportOptions
  ): Promise<void> {
    // Get the original document file name for the default save name
    const originalDocument = vscode.workspace.textDocuments.find(d => d.uri.toString() === docKey);
    const originalFileName = originalDocument?.fileName;

    // Handle PDF export using pdfmake
    if (format === 'pdf') {
      try {
        // Initialize pdfmake if not already initialized
        initializePdfMake();

        // Show save dialog
        const saveUri = await showExportSaveDialog('pdf', originalFileName);
        if (!saveUri) {
          this.postMessage(panel, {
            type: 'exportResponse',
            success: false,
            error: 'Export cancelled by user',
          });
          return;
        }

        // Create pdfmake config from options
        const pdfConfig: PdfMakeConfig = createPdfMakeConfig({
          pageSize: options?.pageSize || 'A4',
          orientation: options?.orientation || 'portrait',
          margins: options?.margins || { top: 70, right: 70, bottom: 70, left: 70 },
          header: options?.headerText,
          footer: options?.footerText,
          includePageNumbers: options?.includePageNumbers ?? false,
        });

        // Generate PDF using pdfmake
        const pdfData = await new Promise<Uint8Array>((resolve, reject) => {
          createPdfFromHtmlContent(
            content,
            pdfConfig,
            (data) => resolve(data),
            (error) => reject(error)
          );
        });

        // Save PDF to file
        await vscode.workspace.fs.writeFile(saveUri, pdfData);

        // Send success response
        this.postMessage(panel, {
          type: 'exportResponse',
          success: true,
          filePath: saveUri.fsPath,
        });

        // Show success notification
        vscode.window.showInformationMessage(
          'PDF exported successfully',
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
          error: `PDF export failed: ${error}`,
        });
        vscode.window.showErrorMessage(`PDF export failed: ${error}`);
      }
      return;
    }

    // Handle DOCX export using docx library
    if (format === 'docx') {
      try {
        // Show save dialog
        const saveUri = await showExportSaveDialog('docx', originalFileName);
        if (!saveUri) {
          this.postMessage(panel, {
            type: 'exportResponse',
            success: false,
            error: 'Export cancelled by user',
          });
          return;
        }

        // Create docx config
        const docxConfig = createDocxConfig({
          pageSize: options?.pageSize || 'LETTER',
          orientation: options?.orientation || 'portrait',
          margins: options?.margins ? {
            top: (options.margins.top || 70) / 72,  // Convert points to inches
            right: (options.margins.right || 70) / 72,
            bottom: (options.margins.bottom || 70) / 72,
            left: (options.margins.left || 70) / 72,
          } : undefined,
        });

        // Generate DOCX using docx library
        const result = await createDocxFromHtml(content, docxConfig);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to generate DOCX');
        }

        // Save DOCX to file
        await vscode.workspace.fs.writeFile(saveUri, result.data);

        // Send success response
        this.postMessage(panel, {
          type: 'exportResponse',
          success: true,
          filePath: saveUri.fsPath,
        });

        // Show success notification
        vscode.window.showInformationMessage(
          'DOCX exported successfully',
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
          error: `DOCX export failed: ${error}`,
        });
        vscode.window.showErrorMessage(`DOCX export failed: ${error}`);
      }
      return;
    }

    try {
      // Handle 'site' format - export as static site
      if (format === 'site') {
        // Get the base name for the site
        const baseName = originalFileName 
          ? originalFileName.replace(/\.[^/.]+$/, '') 
          : 'exported-site';
        
        // Get the directory to save the site
        const siteDir = vscode.Uri.file(baseName);
        
        // Extract page name from file name
        const pageName = originalFileName
          ? originalFileName.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'index'
          : 'index';
        
        // Create a single page for export
        const pages: import('../shared/types').StaticSitePage[] = [{
          name: pageName,
          path: 'index.html',
          content: content
        }];
        
        // Build static site options with SEO settings
        const staticSiteOptions: StaticSiteOptions = {
          siteTitle: siteOptions?.siteTitle || pageName,
          siteDescription: siteOptions?.siteDescription || seoSettings?.seoDescription || '',
          seoTitle: seoSettings?.seoTitle || siteOptions?.seoTitle,
          customTitle: siteOptions?.customTitle,
          customDescription: seoSettings?.seoDescription || siteOptions?.customDescription,
          ogImage: seoSettings?.ogImage || siteOptions?.ogImage,
          customDomain: seoSettings?.customDomain || siteOptions?.customDomain,
          includeSearch: siteOptions?.includeSearch ?? false,
          includeToc: siteOptions?.includeToc ?? false,
          customCss: siteOptions?.customCss,
        };
        
        // Export the static site
        const siteContent = exportStaticSite(pages, staticSiteOptions);
        
        // Create output directory
        const outputUri = vscode.Uri.joinPath(siteDir, '_site');
        await vscode.workspace.fs.createDirectory(outputUri);
        
        // Save each file in the site
        const savedPaths: string[] = [];
        for (const [filePath, fileContent] of siteContent) {
          const fileUri = vscode.Uri.joinPath(outputUri, filePath);
          const dirUri = vscode.Uri.joinPath(outputUri, filePath.replace(/[^/]+$/, ''));
          
          // Create parent directories if needed
          if (filePath.includes('/')) {
            await vscode.workspace.fs.createDirectory(dirUri);
          }
          
          await saveContentToFile(fileUri, fileContent);
          savedPaths.push(fileUri.fsPath);
        }
        
        // Send success response
        this.postMessage(panel, {
          type: 'exportResponse',
          success: true,
          filePath: outputUri.fsPath,
        });

        // Show success notification
        vscode.window.showInformationMessage(
          'Static site exported successfully',
          'Open Folder'
        ).then(selection => {
          if (selection === 'Open Folder') {
            vscode.commands.executeCommand('revealFileInOS', outputUri);
          }
        });
        return;
      }

      // Show save dialog for other formats
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
          // Create version history entry after successful save
          await this.createVersionEntry(docKey, newContent);
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
          // Create version history entry after successful save
          await this.createVersionEntry(docKey, newContent);
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
   * Create a version history entry for the document
   */
  private async createVersionEntry(docKey: string, content: string): Promise<void> {
    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        // Database not yet initialized, skip version creation
        return;
      }
      
      await db.saveVersion(docKey, content);
      console.log(`[VersionHistory] Created version entry for: ${docKey}`);
    } catch (error) {
      // Log error but don't fail the save operation
      console.error(`[VersionHistory] Failed to create version entry:`, error);
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

  /**
   * Handle load user snippets request
   */
  private async handleLoadUserSnippets(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const snippets = await listSnippets();
      // Send only metadata (without full content) for efficiency
      const metadata = snippets.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        preview: s.preview,
        createdAt: s.createdAt,
        modifiedAt: s.modifiedAt,
      }));
      this.postMessage(panel, { type: 'userSnippets', snippets: metadata });
    } catch (error) {
      console.error('Failed to load user snippets:', error);
      this.postMessage(panel, { type: 'userSnippets', snippets: [] });
    }
  }

  /**
   * Handle save as snippet request
   */
  private async handleSaveAsSnippet(
    name: string,
    category: SnippetCategory,
    html: string,
    description: string | undefined,
    preview: string | undefined,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const result = await saveSnippet({
        name,
        category,
        html,
        description,
        preview,
      });

      if (result.success && result.snippet) {
        this.postMessage(panel, {
          type: 'saveSnippetResponse',
          success: true,
          snippet: {
            id: result.snippet.id,
            name: result.snippet.name,
            category: result.snippet.category,
            description: result.snippet.description,
            preview: result.snippet.preview,
            createdAt: result.snippet.createdAt,
            modifiedAt: result.snippet.modifiedAt,
          },
        });
      } else {
        this.postMessage(panel, {
          type: 'saveSnippetResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'saveSnippetResponse',
        success: false,
        error: `Failed to save snippet: ${error}`,
      });
    }
  }

  /**
   * Handle delete snippet request
   */
  private async handleDeleteSnippet(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await deleteSnippetFromStorage(id);

      if (result.success) {
        this.postMessage(panel, {
          type: 'deleteSnippetResponse',
          success: true,
        });
      } else {
        this.postMessage(panel, {
          type: 'deleteSnippetResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'deleteSnippetResponse',
        success: false,
        error: `Failed to delete snippet: ${error}`,
      });
    }
  }

  /**
   * Handle load snippet content request
   */
  private async handleLoadSnippetContent(id: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await loadSnippetContent(id);

      this.postMessage(panel, {
        type: 'snippetContentResponse',
        id,
        success: result.success,
        content: result.content,
        error: result.error,
      });
    } catch (error) {
      this.postMessage(panel, {
        type: 'snippetContentResponse',
        id,
        success: false,
        error: `Failed to load snippet content: ${error}`,
      });
    }
  }

  /**
   * Handle project-wide search request
   */
  private async handleProjectSearch(
    query: string,
    isRegex: boolean,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const results = await this.searchWorkspace(query, isRegex);
      this.postMessage(panel, {
        type: 'projectSearchResults',
        results,
      });
    } catch (error) {
      this.postMessage(panel, {
        type: 'projectSearchError',
        error: `Search failed: ${error}`,
      });
    }
  }

  /**
   * Search across all HTML files in the workspace
   */
  private async searchWorkspace(query: string, isRegex: boolean): Promise<import('../shared/types').SearchResult[]> {
    const results: import('../shared/types').SearchResult[] = [];
    
    // Find all HTML files in the workspace
    const htmlFiles = await vscode.workspace.findFiles('**/*.html', '**/node_modules/**');
    const htmlmFiles = await vscode.workspace.findFiles('**/*.htm', '**/node_modules/**');
    const allFiles = [...htmlFiles, ...htmlmFiles];
    
    // Compile search regex
    let searchRegex: RegExp;
    try {
      if (isRegex) {
        searchRegex = new RegExp(query, 'gi');
      } else {
        // Escape special regex characters for literal search
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(escaped, 'gi');
      }
    } catch (e) {
      throw new Error('Invalid regex pattern');
    }
    
    // Context characters around the match
    const CONTEXT_LENGTH = 40;
    
    // Search each file
    for (const fileUri of allFiles) {
      try {
        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
        const content = new TextDecoder().decode(contentBytes);
        
        // Search line by line for better context
        const lines = content.split('\n');
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          let match: RegExpExecArray | null;
          
          // Reset lastIndex for global regex
          searchRegex.lastIndex = 0;
          
          while ((match = searchRegex.exec(line)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            
            // Get context before and after
            const contextBefore = line.substring(Math.max(0, matchStart - CONTEXT_LENGTH), matchStart);
            const contextAfter = line.substring(matchEnd, Math.min(line.length, matchEnd + CONTEXT_LENGTH));
            
            // Calculate column position (1-based)
            const column = matchStart + 1;
            
            results.push({
              filePath: fileUri.fsPath,
              fileName: fileUri.fsPath.split('/').pop() || fileUri.fsPath,
              line: lineNum + 1, // 1-based line number
              column,
              matchText: match[0],
              contextBefore: contextBefore ? '...' + contextBefore : '',
              contextAfter: contextAfter ? contextAfter + '...' : '',
            });
            
            // Prevent infinite loop for zero-length matches
            if (match[0].length === 0) {
              searchRegex.lastIndex++;
            }
          }
        }
      } catch (e) {
        // Skip files that can't be read
        console.error(`Failed to read file: ${fileUri.fsPath}`, e);
      }
    }
    
    return results;
  }

  /**
   * Handle open file request - opens a file and positions cursor at specified location
   */
  private async handleOpenFile(filePath: string, line?: number, column?: number): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      
      // Open the document
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });
      
      // Position cursor if line is specified
      if (line !== undefined) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const linePosition = Math.min(line - 1, document.lineCount - 1);
          const lineText = document.lineAt(linePosition);
          const colPosition = column !== undefined 
            ? Math.min(column - 1, lineText.text.length)
            : 0;
          
          const position = new vscode.Position(linePosition, colPosition);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  /**
   * Handle add word to spell dictionary request
   */
  private handleAddToSpellDictionary(word: string): void {
    try {
      const config = vscode.workspace.getConfiguration('htmly');
      const currentDictionary = config.get<string[]>('spellCheck.customDictionary', []);
      
      // Add word if not already in dictionary
      if (!currentDictionary.includes(word.toLowerCase())) {
        const newDictionary = [...currentDictionary, word.toLowerCase()];
        config.update('spellCheck.customDictionary', newDictionary, vscode.ConfigurationTarget.Global);
      }
    } catch (error) {
      console.error('Failed to add word to spell dictionary:', error);
    }
  }

  /**
   * Handle remove word from spell dictionary request
   */
  private handleRemoveFromSpellDictionary(word: string): void {
    try {
      const config = vscode.workspace.getConfiguration('htmly');
      const currentDictionary = config.get<string[]>('spellCheck.customDictionary', []);
      
      // Remove word from dictionary
      const newDictionary = currentDictionary.filter(w => w !== word.toLowerCase());
      config.update('spellCheck.customDictionary', newDictionary, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error('Failed to remove word from spell dictionary:', error);
    }
  }

  /**
   * Handle set spell check enabled/disabled request
   */
  private handleSetSpellCheckEnabled(enabled: boolean): void {
    try {
      const config = vscode.workspace.getConfiguration('htmly');
      config.update('spellCheck.enabled', enabled, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error('Failed to update spell check setting:', error);
    }
  }

  /**
   * Handle spell check request - extracts words from content and identifies misspellings
   * Note: VS Code's spell checker is not directly accessible from webviews,
   * so we use a simple dictionary-based approach here
   */
  private handleRequestSpellCheck(content: string, panel: vscode.WebviewPanel): void {
    try {
      // Extract text from HTML
      const text = this.extractTextForSpellCheck(content);
      const config = vscode.workspace.getConfiguration('htmly');
      const customDictionary = config.get<string[]>('spellCheck.customDictionary', []);
      const dictionarySet = new Set(customDictionary.map(w => w.toLowerCase()));
      
      // Common words that are rarely misspelled
      const commonWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
        'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
        'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
        'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
        'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
        'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
        'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
      ]);

      const misspelled: { word: string; start: number; end: number }[] = [];
      const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
      let match;

      while ((match = wordRegex.exec(text)) !== null) {
        const word = match[0];
        const lowerWord = word.toLowerCase();
        
        // Skip short words
        if (word.length < 3) continue;
        
        // Skip if in custom dictionary
        if (dictionarySet.has(lowerWord)) continue;
        
        // Skip if in common words
        if (commonWords.has(lowerWord)) continue;
        
        misspelled.push({
          word,
          start: match.index,
          end: match.index + word.length,
        });
      }

      // Send misspelled words to webview
      this.postMessage(panel, {
        type: 'spellCheckMisspelledWords',
        words: misspelled,
      });
    } catch (error) {
      console.error('Failed to process spell check:', error);
    }
  }

  /**
   * Handle spell check word request - get suggestions for a specific word
   */
  private handleRequestSpellCheckWord(word: string, panel: vscode.WebviewPanel): void {
    try {
      // Generate simple suggestions based on common words
      const suggestions = this.generateSuggestions(word);
      
      this.postMessage(panel, {
        type: 'spellCheckWord',
        word,
        suggestions,
      });
    } catch (error) {
      console.error('Failed to get spell check suggestions:', error);
    }
  }

  /**
   * Extract text content from HTML for spell checking
   */
  private extractTextForSpellCheck(html: string): string {
    const text = html
      // Remove script and style elements
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  /**
   * Get words from text
   */
  private getWordsFromText(text: string): string[] {
    const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
    const matches = text.match(wordRegex) || [];
    return [...new Set(matches.filter(w => w.length >= 3))];
  }

  /**
   * Generate spelling suggestions for a word
   */
  private generateSuggestions(word: string): string[] {
    const suggestions: string[] = [];
    const lowerWord = word.toLowerCase();

    const commonWords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    ];

    // Find similar words from common words
    for (const common of commonWords) {
      if (common.startsWith(lowerWord.slice(0, 2)) && common !== lowerWord) {
        if (this.levenshteinDistance(lowerWord, common) <= 2) {
          suggestions.push(common);
        }
      }
    }

    // If no suggestions found, return a few similar common words
    if (suggestions.length === 0) {
      for (const common of commonWords) {
        if (common.startsWith(lowerWord[0]) && common !== lowerWord) {
          suggestions.push(common);
          if (suggestions.length >= 3) break;
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Handle show keybinding manager request
   */
  private handleShowKeybindingManager(panel: vscode.WebviewPanel): void {
    const keybindings = getAllKeybindings();
    this.postMessage(panel, { type: 'keybindingsList', commands: keybindings });
    this.postMessage(panel, { type: 'keybindingManager', show: true });
  }

  /**
   * Handle load keybindings request
   */
  private handleLoadKeybindings(panel: vscode.WebviewPanel): void {
    const keybindings = getAllKeybindings();
    this.postMessage(panel, { type: 'keybindingsList', commands: keybindings });
  }

  /**
   * Handle export keybindings request
   */
  private async handleExportKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await exportKeybindings();
      if (result.success) {
        this.postMessage(panel, {
          type: 'keybindingExportResponse',
          success: true,
          filePath: result.filePath,
        });
      } else {
        this.postMessage(panel, {
          type: 'keybindingExportResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'keybindingExportResponse',
        success: false,
        error: String(error),
      });
    }
  }

  /**
   * Handle import keybindings request
   */
  private async handleImportKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    try {
      const result = await importKeybindings();
      if (result.success) {
        // Notify all panels of the keybinding change
        this.notifyKeybindingChange();
        this.postMessage(panel, {
          type: 'keybindingImportResponse',
          success: true,
          count: result.count,
        });
      } else {
        this.postMessage(panel, {
          type: 'keybindingImportResponse',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      this.postMessage(panel, {
        type: 'keybindingImportResponse',
        success: false,
        error: String(error),
      });
    }
  }

  /**
   * Handle set keybinding override request
   */
  private handleSetKeybindingOverride(command: string, key: string, mac?: string): void {
    setKeybindingOverride(command, key, mac);
    this.notifyKeybindingChange();
  }

  /**
   * Handle remove keybinding override request
   */
  private handleRemoveKeybindingOverride(command: string): void {
    removeKeybindingOverride(command);
    this.notifyKeybindingChange();
  }

  /**
   * Handle reset all keybindings request
   */
  private async handleResetKeybindings(panel: vscode.WebviewPanel): Promise<void> {
    await resetKeybindings();
    this.notifyKeybindingChange();
    const keybindings = getAllKeybindings();
    this.postMessage(panel, { type: 'keybindingsList', commands: keybindings });
  }

  /**
   * Handle request backlinks for a specific page
   */
  private async handleRequestBacklinks(pageName: string, panel: vscode.WebviewPanel): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return;
    }

    // Update the backlinks index
    backlinksIndex.setContext(workspaceRoot, panel.title);
    await backlinksIndex.updateIndex();

    // Get backlinks for the requested page
    const backlinks = backlinksIndex.getBacklinks(pageName);
    this.postMessage(panel, { 
      type: 'backlinks', 
      pageName,
      backlinks 
    });
  }

  /**
   * Handle wiki link click - open existing page or create new one
   */
  private async handleOpenWikiLink(pageName: string, existingPages: string[], panel: vscode.WebviewPanel): Promise<void> {
    // Find the workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('Please open a folder to use wiki links.');
      return;
    }

    // Sanitize the page name to create a valid file name
    const sanitizedName = this.sanitizeFileName(pageName);
    const fileName = `${sanitizedName}.html`;
    const filePath = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), fileName);

    // Check if the file already exists
    try {
      await vscode.workspace.fs.stat(filePath);
      // File exists - open it
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });
    } catch {
      // File doesn't exist - create it
      // Ask user to confirm creation (unless they already explicitly clicked "create")
      const response = await vscode.window.showInformationMessage(
        `Page "${pageName}" doesn't exist. Create it?`,
        { modal: true },
        'Create',
        'Cancel'
      );

      if (response === 'Create') {
        // Create empty HTML file
        const initialContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(pageName)}</title>
</head>
<body>
  <h1>${this.escapeHtml(pageName)}</h1>
  <p>Start writing here...</p>
</body>
</html>`;

        // Write the file
        await vscode.workspace.fs.writeFile(
          filePath,
          new TextEncoder().encode(initialContent)
        );

        // Open the new file
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false,
        });

        // Notify webview that page was created
        this.postMessage(panel, {
          type: 'pageCreated',
          pageName,
          pagePath: filePath.fsPath,
        });
      }
    }
  }

  /**
   * Sanitize a string to create a valid file name
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dashes
      .replace(/\s+/g, '-')           // Replace spaces with dashes
      .replace(/-+/g, '-')            // Replace multiple dashes with single
      .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
      .substring(0, 200);             // Limit length
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Handle request for version history - sends all versions for current document
   */
  private async handleRequestVersionHistory(docKey: string, panel: vscode.WebviewPanel): Promise<void> {
    try {
      const db = getVersionHistoryDb(this.context);
      if (!db.isInitialized()) {
        this.postMessage(panel, { type: 'versionHistory', versions: [] });
        return;
      }

      const versions = db.getVersions(docKey);
      this.postMessage(panel, { type: 'versionHistory', versions });
    } catch (error) {
      console.error('[VersionHistory] Failed to get versions:', error);
      this.postMessage(panel, { type: 'versionHistory', versions: [] });
    }
  }

  /**
   * Handle restore version request - replaces current content with selected version
   */
  private async handleRestoreVersion(
    docKey: string,
    versionNumber: number,
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
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

        // Create a new version entry after restore (VAL-HISTORY-005)
        await this.createVersionEntry(docKey, content);

        // Notify webview of the restored content
        this.postMessage(panel, {
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
