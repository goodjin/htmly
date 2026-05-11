// Mock elementFromPoint for jsdom environment
// This is needed because prosemirror-view uses elementFromPoint internally
// and jsdom doesn't provide a complete implementation

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

// Export for potential direct usage
export { createMockElement };
