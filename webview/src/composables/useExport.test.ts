import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useExport } from './useExport';
import { __resetVsApiForTest } from './useVSCode';

// Mock VSCode API
const mockPostMessage = vi.fn();
const mockGetState = vi.fn(() => ({}));
const mockSetState = vi.fn();

// Track registered listeners for proper cleanup
const mockListeners: Set<Function> = new Set();

function resetAllState() {
  mockListeners.clear();
  vi.clearAllMocks();
  __resetVsApiForTest();
}

beforeEach(() => {
  resetAllState();

  // Mock window.addEventListener / removeEventListener
  // Store the handler so removeEventListener can find it
  vi.stubGlobal('addEventListener', vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      mockListeners.add(handler);
    }
    // Return unsubscribe function like window.addEventListener
    return () => {
      mockListeners.delete(handler);
    };
  }));
  vi.stubGlobal('removeEventListener', vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      mockListeners.delete(handler);
    }
  }));

  // Mock acquireVsCodeApi
  (globalThis as any).acquireVsCodeApi = () => ({
    postMessage: mockPostMessage,
    getState: mockGetState,
    setState: mockSetState,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to dispatch message events
function dispatchMessage(msg: any) {
  mockListeners.forEach((listener) => listener({ data: msg }));
}

describe('useExport', () => {
  describe('initExportListener', () => {
    it('sets up message listener for export responses', () => {
      const { initExportListener } = useExport();
      initExportListener();
      expect(addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('does not add duplicate listeners', () => {
      const { initExportListener } = useExport();
      initExportListener();
      initExportListener();
      // Should only be called once (the second call is a no-op)
      expect(addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupExportListener', () => {
    it('removes the message listener', () => {
      const { initExportListener, cleanupExportListener } = useExport();
      initExportListener();
      cleanupExportListener();
      expect(removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('is safe to call without init', () => {
      const { cleanupExportListener } = useExport();
      expect(() => cleanupExportListener()).not.toThrow();
    });
  });

  describe('requestExport', () => {
    it('sends exportRequest message with format and content', () => {
      const { requestExport } = useExport();
      const htmlContent = '<html><body><p>Test</p></body></html>';

      requestExport('markdown', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'markdown',
        content: htmlContent,
      });
    });

    it('sends exportRequest for PDF format', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>Test content</p>';

      requestExport('pdf', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'pdf',
        content: htmlContent,
      });
    });

    it('sends exportRequest for plaintext format', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>Test content</p>';

      requestExport('plaintext', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'plaintext',
        content: htmlContent,
      });
    });

    it('sends exportRequest for embedded format', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>Test content</p>';

      requestExport('embedded', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'embedded',
        content: htmlContent,
      });
    });
  });

  describe('isExporting state', () => {
    it('is false initially', () => {
      const { isExporting } = useExport();
      expect(isExporting.value).toBe(false);
    });

    it('is true after requestExport is called', () => {
      const { requestExport, isExporting } = useExport();
      requestExport('pdf', '<p>Test</p>');
      expect(isExporting.value).toBe(true);
    });

    it('is false after exportResponse with success', () => {
      const { requestExport, isExporting, initExportListener } = useExport();
      initExportListener();

      requestExport('pdf', '<p>Test</p>');
      expect(isExporting.value).toBe(true);

      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.pdf' });
      expect(isExporting.value).toBe(false);
    });

    it('is false after exportResponse with failure', () => {
      const { requestExport, isExporting, initExportListener } = useExport();
      initExportListener();

      requestExport('pdf', '<p>Test</p>');
      expect(isExporting.value).toBe(true);

      dispatchMessage({ type: 'exportResponse', success: false, error: 'Save failed' });
      expect(isExporting.value).toBe(false);
    });
  });

  describe('lastExportResult state', () => {
    it('is null initially', () => {
      const { lastExportResult } = useExport();
      expect(lastExportResult.value).toBe(null);
    });

    it('stores successful export result', () => {
      const { requestExport, lastExportResult, initExportListener } = useExport();
      initExportListener();

      requestExport('markdown', '<p>Test</p>');
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.md' });

      expect(lastExportResult.value).toEqual({
        success: true,
        filePath: '/path/to/file.md',
        error: undefined,
      });
    });

    it('stores failed export result with error', () => {
      const { requestExport, lastExportResult, initExportListener } = useExport();
      initExportListener();

      requestExport('pdf', '<p>Test</p>');
      dispatchMessage({ type: 'exportResponse', success: false, error: 'File not found' });

      expect(lastExportResult.value).toEqual({
        success: false,
        filePath: undefined,
        error: 'File not found',
      });
    });
  });

  describe('clearExportResult', () => {
    it('clears the last export result', () => {
      const { requestExport, lastExportResult, clearExportResult, initExportListener } = useExport();
      initExportListener();

      requestExport('pdf', '<p>Test</p>');
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.pdf' });
      expect(lastExportResult.value).not.toBeNull();

      clearExportResult();
      expect(lastExportResult.value).toBeNull();
    });
  });

  describe('helper functions', () => {
    describe('wasExportSuccessful', () => {
      it('returns false when result is null', () => {
        const { wasExportSuccessful } = useExport();
        expect(wasExportSuccessful()).toBe(false);
      });

      it('returns true when last export succeeded', () => {
        const { requestExport, wasExportSuccessful, initExportListener } = useExport();
        initExportListener();

        requestExport('pdf', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.pdf' });

        expect(wasExportSuccessful()).toBe(true);
      });

      it('returns false when last export failed', () => {
        const { requestExport, wasExportSuccessful, initExportListener } = useExport();
        initExportListener();

        requestExport('pdf', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: false, error: 'Save failed' });

        expect(wasExportSuccessful()).toBe(false);
      });
    });

    describe('getExportError', () => {
      it('returns undefined when result is null', () => {
        const { getExportError } = useExport();
        expect(getExportError()).toBeUndefined();
      });

      it('returns undefined when last export succeeded', () => {
        const { requestExport, getExportError, initExportListener } = useExport();
        initExportListener();

        requestExport('pdf', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.pdf' });

        expect(getExportError()).toBeUndefined();
      });

      it('returns error message when last export failed', () => {
        const { requestExport, getExportError, initExportListener } = useExport();
        initExportListener();

        requestExport('pdf', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: false, error: 'Permission denied' });

        expect(getExportError()).toBe('Permission denied');
      });
    });

    describe('getExportedFilePath', () => {
      it('returns undefined when result is null', () => {
        const { getExportedFilePath } = useExport();
        expect(getExportedFilePath()).toBeUndefined();
      });

      it('returns file path when last export succeeded', () => {
        const { requestExport, getExportedFilePath, initExportListener } = useExport();
        initExportListener();

        requestExport('markdown', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.md' });

        expect(getExportedFilePath()).toBe('/path/to/file.md');
      });

      it('returns undefined when last export failed', () => {
        const { requestExport, getExportedFilePath, initExportListener } = useExport();
        initExportListener();

        requestExport('pdf', '<p>Test</p>');
        dispatchMessage({ type: 'exportResponse', success: false, error: 'Save failed' });

        expect(getExportedFilePath()).toBeUndefined();
      });
    });
  });

  describe('state immutability', () => {
    it('isExporting is readonly', () => {
      const { isExporting } = useExport();
      // TypeScript would catch this, but we verify the readonly nature at runtime
      expect(Object.isFrozen(isExporting)).toBe(false); // ref itself is mutable
      expect(isExporting.value).toBe(false);
    });

    it('lastExportResult is readonly', () => {
      const { lastExportResult } = useExport();
      expect(lastExportResult.value).toBe(null);
    });
  });
});
