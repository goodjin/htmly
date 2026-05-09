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

describe('useVSCode', () => {
  it('sends ready message via notifyReady', () => {
    const { notifyReady } = useVSCode();
    notifyReady();
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'ready' });
  });

  it('sends contentUpdate via sendContentUpdate', () => {
    const { sendContentUpdate } = useVSCode();
    sendContentUpdate('<p>hello</p>');
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'contentUpdate', content: '<p>hello</p>' });
  });

  it('sends modeChanged via sendModeChanged', () => {
    const { sendModeChanged } = useVSCode();
    sendModeChanged('source');
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'modeChanged', mode: 'source' });
  });

  it('registers and unregisters message listener', () => {
    const { onMessage } = useVSCode();
    const handler = vi.fn();
    const unsubscribe = onMessage(handler);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'init', content: '<p>x</p>', mode: 'wysiwyg' } }));
    expect(handler).toHaveBeenCalledWith({ type: 'init', content: '<p>x</p>', mode: 'wysiwyg' });

    unsubscribe();
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'theme', isDark: true } }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('defaults isDark to true', () => {
    const { isDark } = useVSCode();
    expect(isDark.value).toBe(true);
  });
});
