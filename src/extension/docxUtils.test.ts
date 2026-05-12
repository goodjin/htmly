/**
 * Tests for docx library integration utilities
 * Tests page size, margin, orientation configuration and HTML-to-DOCX conversion
 */
import { describe, it, expect, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    showSaveDialog: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    fs: {
      writeFile: vi.fn(),
    },
  },
  Uri: {
    joinPath: vi.fn(),
    file: vi.fn(),
  },
}));

// Import after mocking
import {
  DocxPageSize,
  getPageSizeDimensions,
  createDocxConfig,
  createDocxFromHtml,
  convertHtmlToDocxContent,
  isValidDocxPageSize,
  isValidDocxOrientation,
  isValidDocxMargins,
} from './docxUtils';

describe('docxUtils', () => {
  describe('DocxPageSize', () => {
    it('should have A4 page size defined', () => {
      const dimensions = getPageSizeDimensions('A4');
      expect(dimensions).toBeDefined();
      expect(dimensions.width).toBe(595.28);
      expect(dimensions.height).toBe(841.89);
    });

    it('should have LETTER page size defined', () => {
      const dimensions = getPageSizeDimensions('LETTER');
      expect(dimensions).toBeDefined();
      expect(dimensions.width).toBe(612);
      expect(dimensions.height).toBe(792);
    });

    it('should have LEGAL page size defined', () => {
      const dimensions = getPageSizeDimensions('LEGAL');
      expect(dimensions).toBeDefined();
      expect(dimensions.width).toBe(612);
      expect(dimensions.height).toBe(1008);
    });

    it('should have A3 page size defined', () => {
      const dimensions = getPageSizeDimensions('A3');
      expect(dimensions).toBeDefined();
      expect(dimensions.width).toBe(841.89);
      expect(dimensions.height).toBe(1190.55);
    });

    it('should have A5 page size defined', () => {
      const dimensions = getPageSizeDimensions('A5');
      expect(dimensions).toBeDefined();
      expect(dimensions.width).toBe(419.53);
      expect(dimensions.height).toBe(595.28);
    });

    it('should default to LETTER for unknown page size', () => {
      const dimensions = getPageSizeDimensions('UNKNOWN' as DocxPageSize);
      expect(dimensions.width).toBe(612);
      expect(dimensions.height).toBe(792);
    });
  });

  describe('createDocxConfig', () => {
    it('should return default config when called with no arguments', () => {
      const config = createDocxConfig();
      expect(config.pageSize).toBe('LETTER');
      expect(config.orientation).toBe('portrait');
      expect(config.margins.top).toBe(1);
      expect(config.margins.right).toBe(1);
      expect(config.margins.bottom).toBe(1);
      expect(config.margins.left).toBe(1);
    });

    it('should apply custom page size', () => {
      const config = createDocxConfig({ pageSize: 'A4' });
      expect(config.pageSize).toBe('A4');
    });

    it('should apply custom orientation', () => {
      const config = createDocxConfig({ orientation: 'landscape' });
      expect(config.orientation).toBe('landscape');
    });

    it('should apply custom margins', () => {
      const config = createDocxConfig({
        margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }
      });
      expect(config.margins.top).toBe(0.5);
      expect(config.margins.right).toBe(0.5);
      expect(config.margins.bottom).toBe(0.5);
      expect(config.margins.left).toBe(0.5);
    });
  });

  describe('isValidDocxPageSize', () => {
    it('should return true for valid page sizes', () => {
      expect(isValidDocxPageSize('A4')).toBe(true);
      expect(isValidDocxPageSize('LETTER')).toBe(true);
      expect(isValidDocxPageSize('LEGAL')).toBe(true);
      expect(isValidDocxPageSize('A3')).toBe(true);
      expect(isValidDocxPageSize('A5')).toBe(true);
    });

    it('should return false for invalid page sizes', () => {
      expect(isValidDocxPageSize('UNKNOWN')).toBe(false);
      expect(isValidDocxPageSize('TABLOID')).toBe(false);
    });
  });

  describe('isValidDocxOrientation', () => {
    it('should return true for portrait', () => {
      expect(isValidDocxOrientation('portrait')).toBe(true);
    });

    it('should return true for landscape', () => {
      expect(isValidDocxOrientation('landscape')).toBe(true);
    });

    it('should return false for invalid orientations', () => {
      expect(isValidDocxOrientation('unknown')).toBe(false);
      expect(isValidDocxOrientation('portrait2')).toBe(false);
    });
  });

  describe('isValidDocxMargins', () => {
    it('should return true for valid margins', () => {
      expect(isValidDocxMargins({ top: 1, right: 1, bottom: 1, left: 1 })).toBe(true);
      expect(isValidDocxMargins({ top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 })).toBe(true);
      expect(isValidDocxMargins({})).toBe(true); // Empty is valid (uses defaults)
    });

    it('should return false for negative margins', () => {
      expect(isValidDocxMargins({ top: -1 })).toBe(false);
    });

    it('should return false for non-numeric margins', () => {
      expect(isValidDocxMargins({ top: NaN })).toBe(false);
    });
  });

  describe('convertHtmlToDocxContent', () => {
    it('should return empty paragraph for empty input', () => {
      const paragraphs = convertHtmlToDocxContent('');
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined input', () => {
      const paragraphs = convertHtmlToDocxContent(null as unknown as string);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should convert simple HTML paragraph', () => {
      const html = '<p>Hello World</p>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should convert HTML headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    });

    it('should convert bold text', () => {
      const html = '<p><strong>bold text</strong></p>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should convert italic text', () => {
      const html = '<p><em>italic text</em></p>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should handle HTML with attributes', () => {
      const html = '<p class="test" id="para1">Text with attributes</p>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should strip remaining HTML tags', () => {
      const html = '<div><span>Nested content</span></div>';
      const paragraphs = convertHtmlToDocxContent(html);
      expect(paragraphs).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe('createDocxFromHtml', () => {
    it('should generate valid DOCX buffer for simple content', async () => {
      const html = '<p>Hello World</p>';
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toBeInstanceOf(Uint8Array);
    });

    it('should generate valid DOCX buffer for complex content', async () => {
      const html = `
        <h1>Document Title</h1>
        <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <h2>Section Heading</h2>
        <p>Another paragraph here.</p>
      `;
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const result = await createDocxFromHtml('');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle content with special characters', async () => {
      const html = '<p>Special chars: &amp; &lt; &gt; &quot; &#39;</p>';
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should generate DOCX with tables', async () => {
      const html = `
        <table>
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </tbody>
        </table>
      `;
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should generate DOCX with lists', async () => {
      const html = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should generate DOCX with code blocks', async () => {
      const html = '<pre><code>function test() { return true; }</code></pre>';
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should generate DOCX with blockquotes', async () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = await createDocxFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply page size configuration', async () => {
      const html = '<p>Test content</p>';
      const result = await createDocxFromHtml(html, { pageSize: 'A4' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply orientation configuration', async () => {
      const html = '<p>Test content</p>';
      const result = await createDocxFromHtml(html, { orientation: 'landscape' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply margin configuration', async () => {
      const html = '<p>Test content</p>';
      const result = await createDocxFromHtml(html, {
        margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
