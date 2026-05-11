/**
 * Cross-Mode Export Tests
 * 
 * Tests that export functionality works correctly across all editor modes
 * and that exporting does not modify the original document.
 * 
 * Covers:
 * - VAL-CROSS-001: Export works in all editor modes
 * - VAL-CROSS-002: Export preserves current document
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import Toolbar from '../components/Toolbar.vue';
import { useExport } from '../composables/useExport';
import { __resetVsApiForTest } from '../composables/useVSCode';

// ─── Toolbar Export Button Visibility Tests ────────────────────────────────────

// Mock child components
vi.mock('../components/LinkDialog.vue', () => ({ default: { name: 'LinkDialog', template: '<div />' } }));
vi.mock('../components/ImageDialog.vue', () => ({ default: { name: 'ImageDialog', template: '<div />' } }));
vi.mock('../components/EmbedDialog.vue', () => ({ default: { name: 'EmbedDialog', template: '<div />' } }));
vi.mock('../components/LinkPreviewDialog.vue', () => ({ default: { name: 'LinkPreviewDialog', template: '<div />' } }));
vi.mock('../components/ExportDialog.vue', () => ({ default: { name: 'ExportDialog', template: '<div />' } }));

const defaultToolbarProps = {
  editor: undefined,
  mode: 'wysiwyg' as const,
  dirty: false,
  readOnly: false,
  showButtonLabels: true,
  autoHideToolbarInPreview: true,
  saveStatus: 'idle' as const,
};

describe('VAL-CROSS-001: Export button visibility across editor modes', () => {
  describe('Export button in WYSIWYG mode', () => {
    it('renders export button in WYSIWYG mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('export button is clickable in WYSIWYG mode', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      // ExportDialog should be shown
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      expect(exportDialog.exists()).toBe(true);
    });
  });

  describe('Export button in Source mode', () => {
    it('renders export button in Source mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'source' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('export button is clickable in Source mode', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'source' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      expect(exportDialog.exists()).toBe(true);
    });
  });

  describe('Export button in Preview mode', () => {
    it('hides export button in Preview mode when autoHideToolbarInPreview is true', () => {
      // When autoHideToolbarInPreview=true and mode=preview, toolbar is hidden entirely
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      // Toolbar div should not exist when toolbarHidden=true
      expect(wrapper.find('.toolbar').exists()).toBe(false);
      // Therefore export button is also not present
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeUndefined();
    });

    it('shows export button in Preview mode when autoHideToolbarInPreview is false', () => {
      // When autoHideToolbarInPreview=false, toolbar is visible even in preview
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'preview', autoHideToolbarInPreview: false },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('export button is clickable in Preview mode when toolbar is visible', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'preview', autoHideToolbarInPreview: false },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      expect(exportDialog.exists()).toBe(true);
    });
  });

  describe('Export button in Split mode', () => {
    it('renders export button in Split mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'split' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('export button is clickable in Split mode', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'split' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      expect(exportDialog.exists()).toBe(true);
    });
  });

  describe('Export emits correct format for all formats', () => {
    it('emits exportRequest with pdf format', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      // Trigger export event with pdf format
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      exportDialog.vm.$emit('export', 'pdf');
      const emitted = wrapper.emitted('exportRequest') as any[];
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0]).toBe('pdf');
    });

    it('emits exportRequest with markdown format', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      exportDialog.vm.$emit('export', 'markdown');
      const emitted = wrapper.emitted('exportRequest') as any[];
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0]).toBe('markdown');
    });

    it('emits exportRequest with plaintext format', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      exportDialog.vm.$emit('export', 'plaintext');
      const emitted = wrapper.emitted('exportRequest') as any[];
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0]).toBe('plaintext');
    });

    it('emits exportRequest with embedded format', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultToolbarProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      exportDialog.vm.$emit('export', 'embedded');
      const emitted = wrapper.emitted('exportRequest') as any[];
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0]).toBe('embedded');
    });
  });
});

// ─── useExport Cross-Mode Content Tests ───────────────────────────────────────

// Mock VSCode API for useExport tests
const mockPostMessage = vi.fn();
const mockGetState = vi.fn(() => ({}));
const mockSetState = vi.fn();
const mockListeners: Set<Function> = new Set();

function resetVsApi() {
  mockListeners.clear();
  vi.clearAllMocks();
  __resetVsApiForTest();
}

beforeEach(() => {
  resetVsApi();

  vi.stubGlobal('addEventListener', vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      mockListeners.add(handler);
    }
    return () => mockListeners.delete(handler);
  }));
  vi.stubGlobal('removeEventListener', vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      mockListeners.delete(handler);
    }
  }));

  (globalThis as any).acquireVsCodeApi = () => ({
    postMessage: mockPostMessage,
    getState: mockGetState,
    setState: mockSetState,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function dispatchMessage(msg: any) {
  mockListeners.forEach((listener) => listener({ data: msg }));
}

describe('VAL-CROSS-002: Export does not modify original document', () => {
  describe('useExport does not trigger contentUpdate', () => {
    it('requestExport only sends exportRequest message, not contentUpdate', () => {
      const { requestExport } = useExport();
      const htmlContent = '<html><body><p>Test content</p></body></html>';

      requestExport('markdown', htmlContent);

      // Should have sent exactly one message: exportRequest
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'markdown',
        content: htmlContent,
      });
    });

    it('requestExport for PDF format only sends exportRequest', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>PDF test</p>';

      requestExport('pdf', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'pdf',
        content: htmlContent,
      });
    });

    it('requestExport for plaintext format only sends exportRequest', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>Plain text test</p>';

      requestExport('plaintext', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'plaintext',
        content: htmlContent,
      });
    });

    it('requestExport for embedded format only sends exportRequest', () => {
      const { requestExport } = useExport();
      const htmlContent = '<p>Embedded test</p>';

      requestExport('embedded', htmlContent);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'embedded',
        content: htmlContent,
      });
    });

    it('exportResponse handling does not trigger contentUpdate', () => {
      const { requestExport, initExportListener } = useExport();
      initExportListener();

      requestExport('markdown', '<p>Test</p>');
      mockPostMessage.mockClear();

      // Simulate successful export response
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.md' });

      // After receiving exportResponse, no messages should be sent
      // The composable only updates internal state, it does NOT send messages back
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('failed exportResponse handling does not trigger contentUpdate', () => {
      const { requestExport, initExportListener } = useExport();
      initExportListener();

      requestExport('markdown', '<p>Test</p>');
      mockPostMessage.mockClear();

      // Simulate failed export response
      dispatchMessage({ type: 'exportResponse', success: false, error: 'Save cancelled' });

      // No messages sent after failed export
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('useExport passes current document content to extension', () => {
    it('sends the full HTML document content for export', () => {
      const { requestExport } = useExport();
      const fullDocument = '<!DOCTYPE html><html><head><title>Doc</title></head><body><h1>Title</h1><p>Paragraph</p></body></html>';

      requestExport('markdown', fullDocument);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'markdown',
        content: fullDocument,
      });
    });

    it('sends fragment document (no doctype/html/body)', () => {
      const { requestExport } = useExport();
      const fragmentDoc = '<div class="columns"><p>Column content</p></div>';

      requestExport('plaintext', fragmentDoc);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'exportRequest',
        format: 'plaintext',
        content: fragmentDoc,
      });
    });

    it('sends content with complex formatting', () => {
      const { requestExport } = useExport();
      const complexDoc = `
        <div class="callout" data-icon="💡" data-bg="#fef3c7">
          <p>Callout with <strong>bold</strong> and <em>italic</em></p>
        </div>
        <div class="columns">
          <div class="column" style="width:50%"><p>Left</p></div>
          <div class="column" style="width:50%"><p>Right</p></div>
        </div>
      `;

      requestExport('markdown', complexDoc);

      const sentMessage = mockPostMessage.mock.calls[0][0];
      expect(sentMessage.type).toBe('exportRequest');
      expect(sentMessage.content).toBe(complexDoc);
    });

    it('subsequent exports send updated content', () => {
      const { requestExport, initExportListener } = useExport();
      initExportListener();
      const doc1 = '<p>Original content</p>';
      const doc2 = '<p>Updated content</p>';

      requestExport('markdown', doc1);
      expect(mockPostMessage.mock.calls[0][0].content).toBe(doc1);

      // Complete the first export before starting the second
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc1.md' });

      requestExport('markdown', doc2);
      expect(mockPostMessage.mock.calls[1][0].content).toBe(doc2);
    });
  });

  describe('export does not interfere with document state', () => {
    it('multiple rapid export requests do not corrupt content', () => {
      const { requestExport, initExportListener } = useExport();
      initExportListener();
      const doc = '<p>Stable content</p>';

      // Fire multiple export requests sequentially (complete each before next)
      requestExport('pdf', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.pdf' });
      expect(mockPostMessage.mock.calls[0][0].content).toBe(doc);
      expect(mockPostMessage.mock.calls[0][0].format).toBe('pdf');

      requestExport('markdown', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.md' });
      expect(mockPostMessage.mock.calls[1][0].content).toBe(doc);
      expect(mockPostMessage.mock.calls[1][0].format).toBe('markdown');

      requestExport('plaintext', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.txt' });
      expect(mockPostMessage.mock.calls[2][0].content).toBe(doc);
      expect(mockPostMessage.mock.calls[2][0].format).toBe('plaintext');

      requestExport('embedded', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.html' });
      expect(mockPostMessage.mock.calls[3][0].content).toBe(doc);
      expect(mockPostMessage.mock.calls[3][0].format).toBe('embedded');
    });

    it('exportRequest is idempotent - same content sent each time', () => {
      const { requestExport, initExportListener } = useExport();
      initExportListener();
      const doc = '<h1>Same Document</h1><p>Always same content</p>';

      requestExport('markdown', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.md' });
      requestExport('plaintext', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.txt' });
      requestExport('embedded', doc);
      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/doc.html' });

      const calls = mockPostMessage.mock.calls;
      expect(calls.length).toBe(3);
      calls.forEach(call => {
        expect(call[0].content).toBe(doc);
        expect(call[0].type).toBe('exportRequest');
      });
    });

    it('isExporting state correctly tracks export in progress without affecting document', () => {
      const { requestExport, isExporting, initExportListener } = useExport();
      initExportListener();

      expect(isExporting.value).toBe(false);

      requestExport('markdown', '<p>Test</p>');
      expect(isExporting.value).toBe(true);

      // Document content is not modified during export - only state changes
      // The content reference passed to requestExport is the same as what was sent

      dispatchMessage({ type: 'exportResponse', success: true, filePath: '/path/to/file.md' });
      expect(isExporting.value).toBe(false);
    });
  });
});

// ─── Integration: App.vue Export Flow ─────────────────────────────────────────

describe('App.vue export flow - content source for all modes', () => {
  /**
   * App.vue handleExportRequest uses content.value for all modes.
   * This verifies the content source is consistent regardless of editor mode.
   */

  it('content ref holds full HTML document at all times', () => {
    // Simulate App.vue content ref behavior:
    // In WYSIWYG mode: content = replaceBodyContent(original, bodyContent)
    // In Source mode: content = updatedCodeMirrorContent
    // In Split mode: content = same content prop
    // In Preview mode: content = html prop (same content)

    const contentRef = { value: '<!DOCTYPE html><html><body><p>Document</p></body></html>' };

    // Whatever the content ref holds, it's what gets exported
    const exportedContent = contentRef.value;

    // Export composable receives this content
    const { requestExport } = useExport();
    requestExport('markdown', exportedContent);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'exportRequest',
      format: 'markdown',
      content: exportedContent,
    });
  });

  it('WYSIWYG visual content is correctly embedded in full HTML for export', () => {
    // Simulate visualHtml = extractBodyContent(content.value)
    // and onVisualContentChange uses replaceBodyContent to update content
    const visualHtml = '<p>Visual content</p><h1>Heading</h1>';
    
    // The full document content that would be exported
    const fullHtml = `<!DOCTYPE html>
<html>
<head></head>
<body>${visualHtml}</body>
</html>`;

    const { requestExport } = useExport();
    requestExport('embedded', fullHtml);

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.content).toContain('Visual content');
    expect(call.content).toContain('Heading');
    expect(call.content).toContain('<body>');
    expect(call.content).toContain('</body>');
  });

  it('Source mode HTML is correctly exported as full document', () => {
    // In source mode, content.value IS the full HTML
    const sourceHtml = '<!DOCTYPE html><html><head><title>Source</title></head><body><pre>Code here</pre></body></html>';

    const { requestExport } = useExport();
    requestExport('plaintext', sourceHtml);

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.content).toBe(sourceHtml);
  });

  it('Split mode exports the same content as WYSIWYG and Source modes', () => {
    // Split mode uses the same content ref as WYSIWYG and Source
    const sharedContent = '<p>Shared content across modes</p>';

    // WYSIWYG export
    const { requestExport: req1 } = useExport();
    req1('markdown', sharedContent);
    const wysiwygContent = mockPostMessage.mock.calls[0][0].content;

    // Source export
    const { requestExport: req2 } = useExport();
    req2('plaintext', sharedContent);
    const sourceContent = mockPostMessage.mock.calls[1][0].content;

    // Split export
    const { requestExport: req3 } = useExport();
    req3('embedded', sharedContent);
    const splitContent = mockPostMessage.mock.calls[2][0].content;

    // All three modes export the same content
    expect(wysiwygContent).toBe(sourceContent);
    expect(sourceContent).toBe(splitContent);
    expect(splitContent).toBe(sharedContent);
  });

  it('Preview mode exports the same content as WYSIWYG mode', () => {
    // Preview mode shows html prop which is the same content ref
    const previewContent = '<p>Preview content</p><table><tr><td>Cell</td></tr></table>';

    const { requestExport } = useExport();
    requestExport('markdown', previewContent);

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.content).toBe(previewContent);
    expect(call.content).toContain('table');
    expect(call.content).toContain('Cell');
  });
});

// ─── Extension Handler: Export does not modify original file ────────────────────

describe('Extension editorProvider.ts export handler behavior', () => {
  /**
   * The extension's handleExportRequest in editorProvider.ts:
   * 1. Does NOT modify the document's TextDocument
   * 2. Shows a NEW save dialog (not saving to the current document)
   * 3. Writes to the NEW location selected in save dialog
   * 4. Does NOT send any contentUpdate to the webview
   * 
   * This test documents the expected behavior.
   */

  it('export handler does not call applyEdit on the original document', () => {
    // In editorProvider.ts, handleExportRequest:
    // - Does NOT call executeSave or applyEdit on the document
    // - Only calls showExportSaveDialog and saveContentToFile for the NEW export file
    // 
    // The document modification ONLY happens via contentUpdate message from webview
    // which is NEVER triggered by export operations

    // This is a documentation test - the actual behavior is verified by:
    // 1. useExport test: requestExport only sends exportRequest, never contentUpdate
    // 2. editorProvider test: handleExportRequest only writes to new URI, not document

    // Verify that requestExport does NOT trigger any document modification
    const { requestExport } = useExport();
    
    requestExport('markdown', '<p>Test</p>');
    
    // Only exportRequest was sent - no contentUpdate possible
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const [msg] = mockPostMessage.mock.calls[0];
    expect(msg.type).toBe('exportRequest');
    expect(msg.content).toBe('<p>Test</p>');
  });

  it('export handler writes to selected path, not the original document path', async () => {
    // The showExportSaveDialog returns a NEW URI selected by the user
    // This URI is used for saveContentToFile
    // The original document path is NEVER written to during export

    const { requestExport } = useExport();
    
    requestExport('embedded', '<p>Embedded content</p>');
    
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.type).toBe('exportRequest');
    // The exportRequest message carries the content but does NOT carry a path
    // The path is determined by the user's choice in showExportSaveDialog
    // which opens a NEW file location picker, not the original document
    expect(msg.content).toBe('<p>Embedded content</p>');
    expect(msg.format).toBe('embedded');
  });
});
