import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVSCode, __resetVsApiForTest } from './useVSCode';

const mockPostMessage = vi.fn();
const mockGetState = vi.fn(() => ({}));
const mockSetState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  __resetVsApiForTest();
  (globalThis as any).acquireVsCodeApi = () => ({
    postMessage: mockPostMessage,
    getState: mockGetState,
    setState: mockSetState,
  });
});

describe('useVSCode - Save Operations', () => {
  describe('Content update messages', () => {
    it('sends contentUpdate via sendContentUpdate', () => {
      const { sendContentUpdate } = useVSCode();
      sendContentUpdate('<p>hello</p>');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'contentUpdate',
        content: '<p>hello</p>',
      });
    });

    it('sends contentUpdate with immediate flag for manual save', () => {
      const { sendImmediateSave } = useVSCode();
      sendImmediateSave('<p>immediate save</p>');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'contentUpdate',
        content: '<p>immediate save</p>',
        immediate: true,
      });
    });

    it('sends modeChanged via sendModeChanged', () => {
      const { sendModeChanged } = useVSCode();
      sendModeChanged('source');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'modeChanged',
        mode: 'source',
      });
    });

    it('sends ready message via notifyReady', () => {
      const { notifyReady } = useVSCode();
      notifyReady();
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'ready' });
    });
  });
});

describe('Save Status Types', () => {
  it('should have valid save status values', () => {
    const validStatuses = ['idle', 'saving', 'saved', 'error'] as const;
    
    validStatuses.forEach(status => {
      expect(['idle', 'saving', 'saved', 'error']).toContain(status);
    });
  });
});

