/**
 * Test for export utilities
 * Tests pure conversion functions without VS Code dependencies
 */
import { describe, it, expect, vi } from 'vitest';

// Create mock functions for vscode imports used in exportUtils
vi.mock('vscode', () => ({
  window: {
    showSaveDialog: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    textDocuments: [],
    fs: {
      writeFile: vi.fn(),
    },
  },
  Uri: {
    joinPath: vi.fn(),
    file: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
}));

// Import after mocking
import {
  getFormatExtension,
  convertToMarkdown,
  convertToPlainText,
  convertToEmbeddedHtml,
  preparePdfExport,
  convertContent,
} from './exportUtils';

describe('exportUtils', () => {
  describe('getFormatExtension', () => {
    it('returns correct extension for PDF', () => {
      expect(getFormatExtension('pdf')).toBe('pdf');
    });

    it('returns correct extension for markdown', () => {
      expect(getFormatExtension('markdown')).toBe('md');
    });

    it('returns correct extension for plaintext', () => {
      expect(getFormatExtension('plaintext')).toBe('txt');
    });

    it('returns correct extension for embedded', () => {
      expect(getFormatExtension('embedded')).toBe('html');
    });
  });

  describe('convertToMarkdown', () => {
    it('converts paragraphs', () => {
      const html = '<p>Hello World</p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('Hello World');
    });

    it('converts headings h1-h6', () => {
      expect(convertToMarkdown('<h1>Title</h1>')).toContain('# Title');
      expect(convertToMarkdown('<h2>Subtitle</h2>')).toContain('## Subtitle');
      expect(convertToMarkdown('<h3>Section</h3>')).toContain('### Section');
    });

    it('converts bold text', () => {
      const html = '<p><strong>bold text</strong></p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('**bold text**');
    });

    it('converts italic text', () => {
      const html = '<p><em>italic text</em></p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('*italic text*');
    });

    it('converts strikethrough', () => {
      const html = '<p><del>deleted</del></p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('~~deleted~~');
    });

    it('converts inline code', () => {
      const html = '<p><code>code</code></p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('`code`');
    });

    it('converts code blocks', () => {
      const html = '<pre><code>const x = 1;</code></pre>';
      const result = convertToMarkdown(html);
      expect(result).toContain('```');
      expect(result).toContain('const x = 1;');
    });

    it('converts links', () => {
      const html = '<a href="https://example.com">Example</a>';
      const result = convertToMarkdown(html);
      expect(result).toContain('[Example](https://example.com)');
    });

    it('converts images with alt text', () => {
      const html = '<img src="image.png" alt="An image" />';
      const result = convertToMarkdown(html);
      expect(result).toContain('![An image](image.png)');
    });

    it('converts unordered lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = convertToMarkdown(html);
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('converts ordered lists', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const result = convertToMarkdown(html);
      expect(result).toContain('1. First');
      expect(result).toContain('2. Second');
    });

    it('converts blockquotes', () => {
      const html = '<blockquote>Quoted text</blockquote>';
      const result = convertToMarkdown(html);
      expect(result).toContain('>');
      expect(result).toContain('Quoted text');
    });

    it('converts horizontal rules', () => {
      const html = '<hr />';
      const result = convertToMarkdown(html);
      expect(result).toContain('---');
    });

    it('handles nested formatting', () => {
      const html = '<p><strong><em>bold and italic</em></strong></p>';
      const result = convertToMarkdown(html);
      expect(result).toContain('**');
      expect(result).toContain('*bold and italic*');
    });

    it('strips remaining HTML tags', () => {
      const html = '<div><span>Text</span></div>';
      const result = convertToMarkdown(html);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<span>');
      expect(result).toContain('Text');
    });
  });

  describe('convertToPlainText', () => {
    it('strips all HTML tags', () => {
      const html = '<p><strong>bold</strong> and <em>italic</em></p>';
      const result = convertToPlainText(html);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('preserves paragraph breaks', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const result = convertToPlainText(html);
      expect(result).toContain('\n\n');
    });

    it('converts headings with blank lines', () => {
      const html = '<h1>Title</h1>';
      const result = convertToPlainText(html);
      expect(result).toContain('Title');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('converts all heading levels', () => {
      expect(convertToPlainText('<h1>H1</h1>')).toContain('H1');
      expect(convertToPlainText('<h2>H2</h2>')).toContain('H2');
      expect(convertToPlainText('<h3>H3</h3>')).toContain('H3');
    });

    it('converts links to text (url) format', () => {
      const html = '<a href="https://example.com">Example Link</a>';
      const result = convertToPlainText(html);
      expect(result).toContain('Example Link');
      expect(result).toContain('(https://example.com)');
    });

    it('handles mailto links', () => {
      const html = '<a href="mailto:test@example.com">Email</a>';
      const result = convertToPlainText(html);
      expect(result).toContain('Email');
      expect(result).toContain('(mailto:test@example.com)');
    });

    it('converts unordered list items with bullets', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = convertToPlainText(html);
      expect(result).toContain('\u2022');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('converts ordered list items with numbers', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const result = convertToPlainText(html);
      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('First');
      expect(result).toContain('Second');
    });

    it('decodes HTML entities', () => {
      const html = '<p>Hello &amp; World &mdash; Test</p>';
      const result = convertToPlainText(html);
      expect(result).toContain('Hello & World');
      expect(result).toContain('Test');
    });

    it('decodes nbsp entity', () => {
      const html = '<p>Word1&nbsp;&nbsp;Word2</p>';
      const result = convertToPlainText(html);
      expect(result).toContain('Word1');
      expect(result).toContain('Word2');
    });

    it('converts images with alt text to [alt]', () => {
      const html = '<p>See <img src="photo.jpg" alt="My Photo"> for details</p>';
      const result = convertToPlainText(html);
      expect(result).toContain('[My Photo]');
      expect(result).not.toContain('<img');
    });

    it('converts images without alt to [image: src]', () => {
      const html = '<img src="graph.png">';
      const result = convertToPlainText(html);
      expect(result).toContain('[image: graph.png]');
    });

    it('converts tables to pipe syntax', () => {
      const html = '<table><tr><th>Col1</th><th>Col2</th></tr><tr><td>A</td><td>B</td></tr></table>';
      const result = convertToPlainText(html);
      expect(result).toContain('Col1 | Col2');
      expect(result).toContain('A | B');
    });

    it('converts blockquotes with blank lines', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = convertToPlainText(html);
      expect(result).toContain('This is a quote');
      expect(result).not.toContain('<blockquote>');
    });

    it('preserves preformatted text whitespace', () => {
      const html = '<pre>function test() {\n  return 1;\n}</pre>';
      const result = convertToPlainText(html);
      expect(result).toContain('function test()');
      expect(result).toContain('return 1');
    });

    it('strips script content for security', () => {
      const html = '<script>alert("xss");</script><p>Safe content</p>';
      const result = convertToPlainText(html);
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe content');
    });

    it('strips style content', () => {
      const html = '<style>.hidden{display:none}</style><p>Visible</p>';
      const result = convertToPlainText(html);
      expect(result).not.toContain('.hidden');
      expect(result).toContain('Visible');
    });

    it('handles nested block elements', () => {
      const html = '<div><p>Para 1</p><p>Para 2</p></div>';
      const result = convertToPlainText(html);
      expect(result).toContain('Para 1');
      expect(result).toContain('Para 2');
    });

    it('handles plain text without HTML', () => {
      const text = 'Just plain text';
      expect(convertToPlainText(text)).toBe(text);
    });

    it('handles empty string', () => {
      expect(convertToPlainText('')).toBe('');
    });

    it('converts complex document with mixed content', () => {
      const html = '<h1>Title</h1><p>Para with <strong>bold</strong> and <a href="https://example.com">link</a>.</p><ul><li>Item</li></ul>';
      const result = convertToPlainText(html);
      expect(result).toContain('Title');
      expect(result).toContain('bold');
      expect(result).toContain('link');
      expect(result).toContain('(https://example.com)');
      expect(result).toContain('\u2022');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('convertToEmbeddedHtml', () => {
    it('wraps content in HTML document structure', () => {
      const html = '<p>Content</p>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</html>');
    });

    it('includes embedded CSS styles', () => {
      const html = '<p>Content</p>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('<style>');
      expect(result).toContain('body {');
    });

    it('includes content in body', () => {
      const html = '<p>Test Content</p>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('<p>Test Content</p>');
    });

    it('includes charset meta tag', () => {
      const html = '<p>Content</p>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('charset="UTF-8"');
    });

    it('includes viewport meta tag', () => {
      const html = '<p>Content</p>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('viewport');
    });
  });

  describe('preparePdfExport', () => {
    it('returns content unchanged', () => {
      const html = '<p>Test content</p>';
      const result = preparePdfExport(html);
      expect(result).toBe(html);
    });

    it('returns complex HTML unchanged', () => {
      const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';
      const result = preparePdfExport(html);
      expect(result).toBe(html);
    });
  });

  describe('convertContent', () => {
    it('converts markdown format', () => {
      const html = '<h1>Title</h1>';
      const result = convertContent('markdown', html);
      expect(result).toContain('# Title');
    });

    it('converts plaintext format', () => {
      const html = '<p>Text</p>';
      const result = convertContent('plaintext', html);
      expect(result).not.toContain('<p>');
    });

    it('converts embedded format', () => {
      const html = '<p>Text</p>';
      const result = convertContent('embedded', html);
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('handles pdf format', () => {
      const html = '<p>Text</p>';
      const result = convertContent('pdf', html);
      expect(result).toBe(html);
    });
  });
});
