import { ref } from 'vue';
import type { ExtToWebMsg, WebToExtMsg, EditorMode, HistoryState, CrashRecoveryData, ExportFormat, TemplateCategory, SnippetCategory, UserTemplateMetadata, UserSnippetMetadata, KeybindingCommand } from '../../../src/shared/types';

// VS Code API injected by the extension host
declare function acquireVsCodeApi(): {
  postMessage(msg: WebToExtMsg): void;
  getState(): Record<string, unknown>;
  setState(state: Record<string, unknown>): void;
};

// Lazy singleton — deferred so test globals can be set before first call.
let _api: ReturnType<typeof acquireVsCodeApi> | null | undefined;

function getVsApi(): ReturnType<typeof acquireVsCodeApi> | null {
  if (_api === undefined) {
    _api = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
  }
  return _api;
}

/** Reset the cached VS Code API handle (test helper). */
export function __resetVsApiForTest(): void {
  _api = undefined;
}

export function useVSCode() {
  const initialContent = ref('');
  const initialMode = ref<EditorMode>('wysiwyg');
  const isDark = ref(true);

  // History-related state
  const crashRecoveryData = ref<CrashRecoveryData | null>(null);
  const historyExportedPath = ref<string | null>(null);

  // User templates state
  const userTemplates = ref<UserTemplateMetadata[]>([]);

  // User snippets state
  const userSnippets = ref<UserSnippetMetadata[]>([]);

  // Keybinding manager state
  const keybindingCommands = ref<KeybindingCommand[]>([]);
  const showKeybindingManager = ref(false);
  const keybindingExportResult = ref<{ success: boolean; filePath?: string; error?: string } | null>(null);
  const keybindingImportResult = ref<{ success: boolean; count?: number; error?: string } | null>(null);

  function postMessage(msg: WebToExtMsg) {
    getVsApi()?.postMessage(msg);
  }

  function onMessage(handler: (msg: ExtToWebMsg) => void) {
    const listener = (event: MessageEvent) => handler(event.data as ExtToWebMsg);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }

  function notifyReady() {
    postMessage({ type: 'ready' });
  }

  function sendContentUpdate(content: string) {
    postMessage({ type: 'contentUpdate', content });
  }

  function sendModeChanged(mode: EditorMode) {
    postMessage({ type: 'modeChanged', mode });
  }

  function sendImmediateSave(content: string) {
    postMessage({ type: 'contentUpdate', content, immediate: true });
  }

  /**
   * Sync history state to extension for persistence
   */
  function syncHistory(history: HistoryState): void {
    postMessage({ type: 'syncHistory', history });
  }

  /**
   * Request selective undo to a specific history index
   */
  function requestSelectiveUndo(targetIndex: number): void {
    postMessage({ type: 'selectiveUndo', targetIndex });
  }

  /**
   * Request history export as JSON
   */
  function requestExportHistory(): void {
    postMessage({ type: 'exportHistory' });
  }

  /**
   * Clear crash recovery data after use
   */
  function clearCrashRecoveryData(): void {
    crashRecoveryData.value = null;
  }

  /**
   * Clear history exported path notification
   */
  function clearHistoryExportedPath(): void {
    historyExportedPath.value = null;
  }

  /**
   * Request export of document in specified format
   */
  function requestExport(format: ExportFormat, content: string): void {
    postMessage({ type: 'exportRequest', format, content });
  }

  /**
   * Request list of user templates from extension
   */
  function loadUserTemplates(): void {
    postMessage({ type: 'loadUserTemplates' });
  }

  /**
   * Save current content as a new template
   */
  function saveAsTemplate(options: {
    name: string;
    category: TemplateCategory;
    content: string;
    description?: string;
  }): void {
    postMessage({
      type: 'saveAsTemplate',
      name: options.name,
      category: options.category,
      content: options.content,
      description: options.description,
    });
  }

  /**
   * Delete a user template
   */
  function deleteTemplate(id: string): void {
    postMessage({ type: 'deleteTemplate', id });
  }

  /**
   * Rename a user template
   */
  function renameTemplate(id: string, newName: string): void {
    postMessage({ type: 'renameTemplate', id, newName });
  }

  /**
   * Request list of user snippets from extension
   */
  function loadUserSnippets(): void {
    postMessage({ type: 'loadUserSnippets' });
  }

  /**
   * Save current selection as a new snippet
   */
  function saveAsSnippet(options: {
    name: string;
    category: SnippetCategory;
    html: string;
    description?: string;
    preview?: string;
  }): void {
    postMessage({
      type: 'saveAsSnippet',
      name: options.name,
      category: options.category,
      html: options.html,
      description: options.description,
      preview: options.preview,
    });
  }

  /**
   * Delete a user snippet
   */
  function deleteSnippet(id: string): void {
    postMessage({ type: 'deleteSnippet', id });
  }

  /**
   * Load snippet content (HTML) from extension storage
   */
  function loadSnippetContent(id: string): void {
    postMessage({ type: 'loadSnippetContent', id });
  }

  /**
   * Add a word to the spell check custom dictionary
   */
  function addToSpellDictionary(word: string): void {
    postMessage({ type: 'addToSpellDictionary', word });
  }

  /**
   * Remove a word from the spell check custom dictionary
   */
  function removeFromSpellDictionary(word: string): void {
    postMessage({ type: 'removeFromSpellDictionary', word });
  }

  /**
   * Enable or disable spell checking
   */
  function setSpellCheckEnabled(enabled: boolean): void {
    postMessage({ type: 'setSpellCheckEnabled', enabled });
  }

  /**
   * Request list of keybindings from extension
   */
  function loadKeybindings(): void {
    postMessage({ type: 'loadKeybindings' });
  }

  /**
   * Show keybinding manager UI
   */
  function showKeybindingsManager(): void {
    postMessage({ type: 'showKeybindingManager' });
  }

  /**
   * Export keybindings to file
   */
  function exportKeybindings(): void {
    postMessage({ type: 'exportKeybindings' });
  }

  /**
   * Import keybindings from file
   */
  function importKeybindings(): void {
    postMessage({ type: 'importKeybindings' });
  }

  /**
   * Set a keybinding override for a command
   */
  function setKeybindingOverride(command: string, key: string, mac?: string): void {
    postMessage({ type: 'setKeybindingOverride', command, key, mac });
  }

  /**
   * Remove a keybinding override (revert to default)
   */
  function removeKeybindingOverride(command: string): void {
    postMessage({ type: 'removeKeybindingOverride', command });
  }

  /**
   * Reset all keybindings to defaults
   */
  function resetKeybindings(): void {
    postMessage({ type: 'resetKeybindings' });
  }

  /**
   * Request backlinks for a specific page
   */
  function requestBacklinks(pageName: string): void {
    postMessage({ type: 'requestBacklinks', pageName });
  }

  /**
   * Handle wiki link click - check if page exists and open or create it
   */
  function handleWikiLinkClick(pageName: string, existingPages: string[]): void {
    postMessage({ type: 'openWikiLink', pageName, existingPages });
  }

  /**
   * Clear keybinding export result
   */
  function clearKeybindingExportResult(): void {
    keybindingExportResult.value = null;
  }

  /**
   * Clear keybinding import result
   */
  function clearKeybindingImportResult(): void {
    keybindingImportResult.value = null;
  }

  return {
    initialContent,
    initialMode,
    isDark,
    crashRecoveryData,
    historyExportedPath,
    userTemplates,
    userSnippets,
    postMessage,
    onMessage,
    notifyReady,
    sendContentUpdate,
    sendModeChanged,
    sendImmediateSave,
    syncHistory,
    requestSelectiveUndo,
    requestExportHistory,
    clearCrashRecoveryData,
    clearHistoryExportedPath,
    requestExport,
    loadUserTemplates,
    saveAsTemplate,
    deleteTemplate,
    renameTemplate,
    loadUserSnippets,
    saveAsSnippet,
    deleteSnippet,
    loadSnippetContent,
    addToSpellDictionary,
    removeFromSpellDictionary,
    setSpellCheckEnabled,
    // Keybinding management
    keybindingCommands,
    showKeybindingManager,
    keybindingExportResult,
    keybindingImportResult,
    loadKeybindings,
    showKeybindingsManager,
    exportKeybindings,
    importKeybindings,
    setKeybindingOverride,
    removeKeybindingOverride,
    resetKeybindings,
    requestBacklinks,
    handleWikiLinkClick,
    clearKeybindingExportResult,
    clearKeybindingImportResult,
  };
}
