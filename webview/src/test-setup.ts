// Mock elementFromPoint and other missing browser APIs for jsdom environment
// This is needed because prosemirror-view and other code uses browser APIs
// that jsdom doesn't provide

// Mock requestAnimationFrame and cancelAnimationFrame for jsdom
if (typeof requestAnimationFrame === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
}

if (typeof cancelAnimationFrame === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Store original if it exists
const originalElementFromPoint = typeof document.elementFromPoint === 'function'
  ? document.elementFromPoint.bind(document)
  : null;

// Cache for mock elements to maintain identity
const mockElementCache = new Map<string, Element>();

// Create a mock element that will be returned by elementFromPoint
function createMockElement(tagName: string = 'P', textContent: string = ''): Element {
  const cacheKey = `${tagName}:${textContent}`;
  
  if (mockElementCache.has(cacheKey)) {
    return mockElementCache.get(cacheKey)!;
  }

  // Try to create an actual jsdom element first
  try {
    const el = document.createElement(tagName);
    el.textContent = textContent;
    // Override getBoundingClientRect to return a predictable value
    el.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 100,
      height: 20,
      bottom: 20,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    mockElementCache.set(cacheKey, el);
    return el;
  } catch {
    // Fallback to plain object mock if createElement fails
    const mockElement = {
      tagName: tagName.toUpperCase(),
      nodeName: tagName.toUpperCase(),
      textContent,
      children: [] as Element[],
      querySelectorAll: () => [] as Element[],
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      contains: () => false,
      closest: () => null,
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        width: 100,
        height: 20,
        bottom: 20,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      ownerDocument: document,
      parentElement: null,
      parentNode: null,
      nodeType: 1,
      appendChild: () => {},
      removeChild: () => {},
      insertBefore: () => {},
      replaceChild: () => {},
      cloneNode: () => mockElement,
      isSameNode: () => false,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false,
      },
      style: {
        cssText: '',
        getPropertyValue: () => '',
        setProperty: () => {},
      },
      scrollIntoView: () => {},
    } as unknown as Element;

    mockElementCache.set(cacheKey, mockElement);
    return mockElement;
  }
}

// Mock elementFromPoint to return a mock element
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = function(x: number, y: number): Element | null {
    // For any coordinates, return a mock element that the caller can use
    return createMockElement('P', 'mock content');
  };
}

// Also mock it on Element.prototype for browser compatibility
if (typeof Element !== 'undefined' && Element.prototype) {
  // Ensure the mock is properly bound
  Element.prototype.elementFromPoint = function(x: number, y: number): Element | null {
    return createMockElement(this.tagName || 'P', this.textContent || '');
  };
}

// Mock getBoundingClientRect on Element for cases where it's not available
if (typeof Element !== 'undefined' && Element.prototype && !Element.prototype.getBoundingClientRect) {
  Element.prototype.getBoundingClientRect = function() {
    return {
      top: 0,
      left: 0,
      width: 100,
      height: 20,
      bottom: 20,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };
}

// localStorage polyfill
// Node.js 25+ ships a built-in `localStorage` global (Web Storage API), but
// without a valid `--localstorage-file` argument it is an empty plain object
// with no `Storage` interface. Vitest's jsdom environment detects that
// `localStorage` already exists on `globalThis` and therefore does not
// override it with jsdom's `Storage` instance. Components such as
// `ExportDialog.vue` and `useExportPresets.ts` then crash with
// `localStorage.getItem is not a function`. Install a memory-based `Storage`
// implementation whenever the existing global lacks the required methods.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installLocalStoragePolyfill(): void {
  const current = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  const hasUsableInterface =
    current !== undefined &&
    current !== null &&
    typeof current.getItem === 'function' &&
    typeof current.setItem === 'function' &&
    typeof current.removeItem === 'function' &&
    typeof current.clear === 'function';

  if (hasUsableInterface) {
    return;
  }

  const polyfill = new MemoryStorage();

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: polyfill,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    // Fall back to a direct assignment if defineProperty is rejected
    // (e.g. when the property is non-configurable in this runtime).
    (globalThis as unknown as { localStorage: Storage }).localStorage = polyfill;
  }

  // Also expose it on `window`/`self` so jsdom-bound components see the same
  // instance regardless of which global they read from.
  const win = (globalThis as unknown as { window?: typeof globalThis & { localStorage?: Storage } }).window;
  if (win && win !== globalThis) {
    try {
      Object.defineProperty(win, 'localStorage', {
        value: polyfill,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      (win as unknown as { localStorage: Storage }).localStorage = polyfill;
    }
  }
}

installLocalStoragePolyfill();

// Export for potential direct usage
export { createMockElement, installLocalStoragePolyfill, MemoryStorage };
