/**
 * useConsoleBridge — forward webview console output to the extension's
 * 'htmly-debug' Output Channel via postMessage.
 *
 * VSCode webviews run in an isolated browser-like context. The default
 * DevTools console is not always visible to end users (they would have to
 * open "Developer: Toggle Webview Developer Tools" and pick the right
 * frame). By forwarding every console.log/warn/error to the extension host
 * and writing it to a dedicated OutputChannel, we give the user a single
 * authoritative place to look for diagnostic logs.
 *
 * The extension side (see src/extension/editorProvider.ts) honors the
 * `htmly.debug` configuration setting: when false, the messages are
 * dropped, so there is no overhead for users who do not need logs.
 *
 * IMPORTANT: VS Code's `acquireVsCodeApi()` can only be called ONCE per
 * webview lifetime. App.vue injects the `postMessage` function (which
 * internally calls acquireVsCodeApi) at install time, so we share the
 * same API handle and never call acquireVsCodeApi twice.
 *
 * Activated by App.vue's onMounted: `installConsoleBridge(postMessage)`.
 */

interface BridgeableMessage {
  type: 'consoleLog';
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: string[];
  ts: number;
}

/** Format any value into a printable string. */
function safeStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'string') return value as string;
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
  if (t === 'function') {
    return `[Function: ${(value as Function).name || 'anonymous'}]`;
  }
  if (t === 'symbol') return (value as symbol).toString();
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unstringifiable]';
    }
  }
}

// Singleton guard — we patch console only once per webview.
let installed = false;
// Holds the postMessage function passed in by App.vue. Without this we
// would have to call acquireVsCodeApi() ourselves, which throws if the
// rest of the app has already called it.
let sendToExtension: ((msg: BridgeableMessage) => void) | null = null;

// Coalesce multiple console.* calls into a single postMessage per frame
// so we do not flood the channel.
let pendingBatch: string[] = [];
let pendingLevel: BridgeableMessage['level'] = 'log';
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (pendingBatch.length === 0) return;
  const msg: BridgeableMessage = {
    type: 'consoleLog',
    level: pendingLevel,
    args: pendingBatch,
    ts: Date.now(),
  };
  pendingBatch = [];
  pendingLevel = 'log';
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    sendToExtension?.(msg);
  } catch {
    // Webview might be disposed; ignore.
  }
}

function queue(level: BridgeableMessage['level'], formatted: string): void {
  pendingBatch.push(formatted);
  const rank: Record<BridgeableMessage['level'], number> = {
    debug: 0,
    log: 1,
    info: 2,
    warn: 3,
    error: 4,
  };
  if (rank[level] > rank[pendingLevel]) pendingLevel = level;

  if (flushTimer) return;
  flushTimer = setTimeout(flush, 16);
}

/**
 * Patch console.log / info / warn / error / debug so that every call is
 * also forwarded to the extension as a `consoleLog` message. The
 * `sendToExt` function is the same `postMessage` useVSCode uses, so we
 * share the (singleton) VS Code API handle with the rest of the app.
 */
export function installConsoleBridge(sendToExt: (msg: BridgeableMessage) => void): void {
  if (installed) return;
  installed = true;
  sendToExtension = sendToExt;

  const originalLog = console.log.bind(console);
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalDebug = console.debug.bind(console);

  function wrap(level: BridgeableMessage['level'], original: (...args: unknown[]) => void) {
    return (...args: unknown[]) => {
      // Keep DevTools working.
      try {
        original(...args);
      } catch {
        /* never let a logger throw */
      }
      // Forward to extension.
      try {
        const formatted = args.map(safeStringify).join(' ');
        queue(level, formatted);
      } catch {
        /* never let a logger throw */
      }
    };
  }

  console.log = wrap('log', originalLog);
  console.info = wrap('info', originalInfo);
  console.warn = wrap('warn', originalWarn);
  console.error = wrap('error', originalError);
  console.debug = wrap('debug', originalDebug);

  (console as unknown as { __htmlyConsoleBridgeInstalled?: boolean }).__htmlyConsoleBridgeInstalled = true;
  originalLog('[htmly bridge] consoleBridge installed (htmly-debug output channel)');
}

/** Test helper. Restores the originals. */
export function uninstallConsoleBridge(): void {
  installed = false;
  sendToExtension = null;
  (console as unknown as { __htmlyConsoleBridgeInstalled?: boolean }).__htmlyConsoleBridgeInstalled = false;
}
