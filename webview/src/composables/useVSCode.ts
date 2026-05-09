import { ref } from 'vue';
import type { ExtToWebMsg, WebToExtMsg, EditorMode } from '../../../src/shared/types';

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

  return {
    initialContent,
    initialMode,
    isDark,
    postMessage,
    onMessage,
    notifyReady,
    sendContentUpdate,
    sendModeChanged,
  };
}
