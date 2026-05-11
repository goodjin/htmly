import { ref } from 'vue';
import type { ExtToWebMsg, WebToExtMsg, EditorMode, HistoryState, CrashRecoveryData, ExportFormat } from '../../../src/shared/types';

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

  return {
    initialContent,
    initialMode,
    isDark,
    crashRecoveryData,
    historyExportedPath,
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
  };
}
