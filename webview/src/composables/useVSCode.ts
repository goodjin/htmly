import { ref } from 'vue';
import type { ExtToWebMsg, WebToExtMsg, EditorMode, HistoryState, CrashRecoveryData, ExportFormat, TemplateCategory, SnippetCategory, UserTemplateMetadata, UserSnippetMetadata } from '../../../src/shared/types';

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
  };
}
