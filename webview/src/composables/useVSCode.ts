import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { ExtToWebMsg, WebToExtMsg, EditorMode } from '../../../src/shared/types';

// VS Code API injected by the extension host
declare function acquireVsCodeApi(): {
  postMessage(msg: WebToExtMsg): void;
  getState(): Record<string, unknown>;
  setState(state: Record<string, unknown>): void;
};

const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

export function useVSCode() {
  const initialContent = ref('');
  const initialMode = ref<EditorMode>('wysiwyg');
  const isDark = ref(true);

  function postMessage(msg: WebToExtMsg) {
    vscode?.postMessage(msg);
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
