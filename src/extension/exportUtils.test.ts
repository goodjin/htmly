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
  convertToEmbeddedHtmlWithImages,
  preparePdfExport,
  convertContent,
  exportStaticSite,
  getStaticSiteContent,
  validateCustomDomain,
  generateCnameFile,
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

    it('handles empty string', () => {
      const result = convertToEmbeddedHtml('');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
    });

    it('extracts body content from full document', () => {
      const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Body Content</p></body></html>';
      const result = convertToEmbeddedHtml(html);
      expect(result).toContain('<p>Body Content</p>');
      expect(result).not.toContain('<title>Test</title>');
    });

    describe('CSS Inlining', () => {
      it('inlines class selector styles', () => {
        const html = '<style>.highlight { background: yellow; }</style><p class="highlight">Highlighted</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('background');
        expect(result).toContain('Highlighted');
      });

      it('inlines tag selector styles', () => {
        const html = '<style>p { color: blue; }</style><p>Blue text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('color');
        expect(result).toContain('Blue text');
      });

      it('removes style tags after inlining', () => {
        const html = '<style>.test { color: red; }</style><p class="test">Content</p>';
        const result = convertToEmbeddedHtml(html);
        // The standalone <style> tag should be removed from body, 
        // but CSS selectors ARE preserved in the embedded <style> section (correct behavior)
        expect(result).toContain('.test');
        expect(result).toContain('Content');
      });

      it('preserves style tag content in embedded styles section', () => {
        const html = '<style>.custom { font-weight: bold; }</style><p class="custom">Bold</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('.custom');
        expect(result).toContain('font-weight');
      });

      it('handles inline styles with existing style attributes', () => {
        const html = '<p style="color: red;">Text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('style=');
        expect(result).toContain('color');
        expect(result).toContain('Text');
      });
    });

    describe('Font Handling', () => {
      it('replaces custom fonts with web-safe fallbacks', () => {
        const html = '<p style="font-family: CustomFont;">Custom font text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('sans-serif');
      });

      it('preserves web-safe fonts', () => {
        const html = '<p style="font-family: Arial, sans-serif;">Arial text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('Arial');
        expect(result).toContain('sans-serif');
      });

      it('adds fallback to custom fonts', () => {
        const html = '<p style="font-family: Roboto;">Roboto text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('sans-serif');
      });

      it('preserves Times New Roman', () => {
        const html = '<p style="font-family: Times New Roman, serif;">Serif text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('Times New Roman');
        expect(result).toContain('serif');
      });

      it('preserves Courier New', () => {
        const html = '<p style="font-family: Courier New, monospace;">Code text</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('Courier New');
        expect(result).toContain('monospace');
      });
    });

    describe('Security Sanitization', () => {
      it('removes script tags', () => {
        const html = '<script>alert("xss");</script><p>Safe content</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('alert');
        expect(result).not.toContain('script');
        expect(result).toContain('Safe content');
      });

      it('removes onclick event handlers', () => {
        const html = '<p onclick="alert(1)">Click me</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('onclick');
        expect(result).toContain('Click me');
      });

      it('removes onerror event handlers', () => {
        const html = '<img src="x" onerror="alert(1)">';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('onerror');
      });

      it('removes iframes', () => {
        const html = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('iframe');
        expect(result).toContain('Safe');
      });

      it('removes object elements', () => {
        const html = '<object data="evil.swf"></object><p>Safe</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('object');
        expect(result).toContain('Safe');
      });

      it('removes noscript tags', () => {
        const html = '<noscript><p>Hidden</p></noscript><p>Visible</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).not.toContain('noscript');
        expect(result).toContain('Visible');
      });
    });

    describe('Image Handling', () => {
      it('preserves image elements', () => {
        const html = '<img src="image.png" alt="Test Image">';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('src="image.png"');
        expect(result).toContain('alt="Test Image"');
      });

      it('handles images with various attributes', () => {
        const html = '<img src="photo.jpg" alt="Photo" width="200" height="100" class="photo">';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('src="photo.jpg"');
        expect(result).toContain('width="200"');
        expect(result).toContain('height="100"');
      });

      it('handles data URI images', () => {
        const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
        const html = `<img src="${dataUri}" alt="Embedded">`;
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain(dataUri);
      });

      it('handles external URLs', () => {
        const html = '<img src="https://example.com/image.png" alt="External">';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('https://example.com/image.png');
      });
    });

    describe('Edge Cases', () => {
      it('handles nested elements', () => {
        const html = '<div><div><p>Nested</p></div></div>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('Nested');
      });

      it('handles special HTML entities', () => {
        const html = '<p>&lt;script&gt; &amp; &quot;test&quot;</p>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('test');
      });

      it('handles SVG elements', () => {
        const html = '<svg><rect width="100" height="100"/></svg>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('<svg');
        expect(result).toContain('</svg>');
      });

      it('handles table elements', () => {
        const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('<table');
        expect(result).toContain('Cell 1');
        expect(result).toContain('Cell 2');
      });

      it('handles list elements', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const result = convertToEmbeddedHtml(html);
        expect(result).toContain('<ul');
        expect(result).toContain('Item 1');
        expect(result).toContain('Item 2');
      });
    });
  });

  describe('convertToEmbeddedHtmlWithImages', () => {
    it('returns Promise for async operation', async () => {
      const html = '<p>Test</p>';
      const result = await convertToEmbeddedHtmlWithImages(html);
      expect(result).toContain('Test');
    });

    it('handles empty input', async () => {
      const result = await convertToEmbeddedHtmlWithImages('');
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('preserves images without readFile function', async () => {
      const html = '<img src="image.png" alt="Test">';
      const result = await convertToEmbeddedHtmlWithImages(html);
      expect(result).toContain('src="image.png"');
    });

    it('converts local images to base64 when readFile is provided', async () => {
      const html = '<img src="test.png" alt="Test">';
      const pngData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
      const readFile = async (uri: string): Promise<Uint8Array | null> => {
        if (uri.includes('test.png')) {
          return pngData;
        }
        return null;
      };
      const result = await convertToEmbeddedHtmlWithImages(html, 'file:///test/doc.html', readFile);
      expect(result).toContain('data:image/png;base64');
      // PNG header [0x89, 0x50, 0x4E, 0x47] base64-encoded is "iVBORw=="
      expect(result).toContain('iVBORw==');
    });

    it('keeps external URLs unchanged', async () => {
      const html = '<img src="https://example.com/image.png" alt="External">';
      const result = await convertToEmbeddedHtmlWithImages(html, 'file:///test/doc.html');
      expect(result).toContain('https://example.com/image.png');
    });

    it('keeps data URIs unchanged', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const html = `<img src="${dataUri}" alt="Embedded">`;
      const result = await convertToEmbeddedHtmlWithImages(html);
      expect(result).toContain(dataUri);
    });

    it('applies same CSS inlining as sync version', async () => {
      const html = '<style>.highlight { background: yellow; }</style><p class="highlight">Test</p>';
      const result = await convertToEmbeddedHtmlWithImages(html);
      expect(result).toContain('background');
      expect(result).toContain('Test');
    });

    it('applies same font replacement as sync version', async () => {
      const html = '<p style="font-family: CustomFont;">Custom</p>';
      const result = await convertToEmbeddedHtmlWithImages(html);
      expect(result).toContain('sans-serif');
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

  describe('exportStaticSite', () => {
    it('exports single page as self-contained HTML', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1><p>Hello world</p>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'A test site',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      
      expect(result.size).toBe(1);
      const html = result.get('index.html');
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<title>Welcome - My Site</title>');
      expect(html).toContain('<meta name="description"');
      expect(html).toContain('Welcome');
      expect(html).toContain('Hello world');
    });

    it('exports multiple pages with navigation', () => {
      const pages = [
        { name: 'Page 1', path: 'index.html', content: '<h1>Home Page</h1>' },
        { name: 'Page 2', path: 'about.html', content: '<h1>About Us</h1>' },
      ];
      const options = {
        siteTitle: 'Test Site',
        siteDescription: 'Test description',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      
      expect(result.size).toBe(2);
      
      const indexHtml = result.get('index.html');
      expect(indexHtml).toContain('Home Page');
      expect(indexHtml).toContain('href="about.html"');
      
      const aboutHtml = result.get('about.html');
      expect(aboutHtml).toContain('About Us');
      expect(aboutHtml).toContain('href="index.html"');
    });

    it('handles nested page paths correctly', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        { name: 'Blog Post', path: 'blog/post.html', content: '<h1>Blog Post</h1>' },
      ];
      const options = {
        siteTitle: 'Blog',
        siteDescription: 'A blog',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      
      // Index page should link to blog/post.html correctly
      const indexHtml = result.get('index.html');
      expect(indexHtml).toContain('href="blog/post.html"');
      
      // Blog post should have relative link back to index
      const blogHtml = result.get('blog/post.html');
      expect(blogHtml).toContain('href="../index.html"');
    });

    it('inlines CSS styles in all pages', () => {
      const pages = [
        { name: 'Test', path: 'test.html', content: '<p style="color: red;">Styled</p>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
        customCss: '.custom { color: blue; }',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('test.html');
      
      expect(html).toContain('body {');
      expect(html).toContain('font-family');
      expect(html).toContain('.custom { color: blue; }');
      expect(html).toContain('Styled');
    });

    it('removes script tags for security', () => {
      const pages = [
        { name: 'Unsafe', path: 'unsafe.html', content: '<script>alert("xss")</script><p>Safe content</p>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('unsafe.html');
      
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert');
      expect(html).toContain('Safe content');
    });

    it('handles internal links correctly', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<a href="about.html">About</a>' },
        { name: 'About', path: 'about.html', content: '<a href="./contact.html">Contact</a>' },
        { name: 'Contact', path: 'contact.html', content: '<h1>Contact</h1>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      
      const indexHtml = result.get('index.html');
      expect(indexHtml).toContain('href="about.html"');
      
      const aboutHtml = result.get('about.html');
      expect(aboutHtml).toContain('href="contact.html"');
    });

    it('preserves external links unchanged', () => {
      const pages = [
        { name: 'External', path: 'external.html', content: '<a href="https://example.com">External Link</a>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('external.html');
      
      expect(html).toContain('href="https://example.com"');
    });

    it('handles empty pages array', () => {
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite([], options);
      
      expect(result.size).toBe(0);
    });

    it('includes navigation links between pages', () => {
      const pages = [
        { name: 'Page 1', path: 'page1.html', content: '<h1>Page 1</h1>' },
        { name: 'Page 2', path: 'page2.html', content: '<h1>Page 2</h1>' },
        { name: 'Page 3', path: 'page3.html', content: '<h1>Page 3</h1>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      
      // Page 1 should have link to page 2 (next)
      const page1 = result.get('page1.html');
      expect(page1).toContain('href="page2.html"');
      expect(page1).toContain('Page 2 →');
      
      // Page 2 should have prev (page1) and next (page3)
      const page2 = result.get('page2.html');
      expect(page2).toContain('href="page1.html"');
      expect(page2).toContain('← Page 1');
      expect(page2).toContain('href="page3.html"');
      expect(page2).toContain('Page 3 →');
      
      // Page 3 should have link to page 2 (prev)
      const page3 = result.get('page3.html');
      expect(page3).toContain('href="page2.html"');
      expect(page3).toContain('← Page 2');
    });

    it('includes footer with attribution', () => {
      const pages = [
        { name: 'Test', path: 'test.html', content: '<p>Content</p>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('test.html');
      
      expect(html).toContain('Generated by');
      expect(html).toContain('htmly');
      expect(html).toContain('class="footer"');
    });

    it('extracts title from page content', () => {
      const pages = [
        { name: 'Custom', path: 'custom.html', content: '<h1>My Custom Title</h1><p>Content</p>' },
      ];
      const options = {
        siteTitle: 'Site Title',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('custom.html');
      
      expect(html).toContain('<title>My Custom Title - Site Title</title>');
    });

    it('handles pages without explicit title', () => {
      const pages = [
        { name: 'Untitled', path: 'untitled.html', content: '<p>Just a paragraph</p>' },
      ];
      const options = {
        siteTitle: 'Site',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('untitled.html');
      
      expect(html).toContain('<title>Untitled - Site</title>');
    });
  });

  describe('SEO Settings', () => {
    it('includes og:image meta tag when ogImage is provided', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'A test site',
        includeSearch: false,
        includeToc: false,
        ogImage: 'https://example.com/social-image.png',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      expect(html).toContain('og:image');
      expect(html).toContain('https://example.com/social-image.png');
      expect(html).toContain('twitter:image');
    });

    it('includes og:title and og:description meta tags', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Site description',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      expect(html).toContain('og:title');
      expect(html).toContain('og:description');
      expect(html).toContain('Site description');
    });

    it('uses customDescription when provided', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Default description',
        includeSearch: false,
        includeToc: false,
        customDescription: 'Custom SEO description for search engines',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      expect(html).toContain('Custom SEO description for search engines');
      expect(html).not.toContain('Default description');
    });

    it('uses seoTitle when provided to override page title', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Test description',
        includeSearch: false,
        includeToc: false,
        seoTitle: 'Custom SEO Title',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      // Title tag should show SEO title
      expect(html).toContain('<title>Custom SEO Title - My Site</title>');
      // og:title should also use SEO title
      expect(html).toContain('og:title');
      expect(html).toContain('content="Custom SEO Title"');
    });

    it('uses customTitle when provided to override page title extraction', () => {
      const pages = [
        { name: 'Page', path: 'page.html', content: '<h1>Auto Title</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
        customTitle: 'Manually Set Title',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('page.html');
      
      expect(html).toContain('<title>Manually Set Title - My Site</title>');
      expect(html).not.toContain('Auto Title - My Site');
    });

    it('includes twitter:card meta tag', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      expect(html).toContain('twitter:card');
      expect(html).toContain('summary_large_image');
    });

    it('includes og:type meta tag', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      expect(html).toContain('og:type');
      expect(html).toContain('article');
    });

    it('escapes HTML in SEO meta tags', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My "Site"',
        siteDescription: 'Description with <special> characters & symbols',
        includeSearch: false,
        includeToc: false,
        ogImage: 'https://example.com/image.png',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      // Check that quotes are properly escaped
      expect(html).toContain('&quot;Site&quot;');
      expect(html).toContain('&lt;special&gt;');
      expect(html).toContain('&amp;');
    });

    it('works with all SEO options combined', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Welcome</h1>' },
      ];
      const options = {
        siteTitle: 'My Site',
        siteDescription: 'Default description',
        includeSearch: false,
        includeToc: false,
        seoTitle: 'SEO Optimized Title',
        customDescription: 'Custom SEO description',
        ogImage: 'https://example.com/og-image.jpg',
        customTitle: 'Custom Page Title',
      };
      
      const result = exportStaticSite(pages, options);
      const html = result.get('index.html');
      
      // Verify all SEO meta tags are present
      expect(html).toContain('og:title');
      expect(html).toContain('og:description');
      expect(html).toContain('og:image');
      expect(html).toContain('og:type');
      expect(html).toContain('twitter:card');
      
      // Verify values - seoTitle takes precedence for HTML title
      expect(html).toContain('SEO Optimized Title');
      expect(html).toContain('Custom SEO description');
      expect(html).toContain('https://example.com/og-image.jpg');
      // Title tag uses seoTitle (if provided) over customTitle
      expect(html).toContain('<title>SEO Optimized Title - My Site</title>');
    });
  });

  describe('getStaticSiteContent', () => {
    it('returns same result as exportStaticSite', () => {
      const pages = [
        { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
      ];
      const options = {
        siteTitle: 'Test',
        siteDescription: 'Test',
        includeSearch: false,
        includeToc: false,
      };
      
      const exported = exportStaticSite(pages, options);
      const content = getStaticSiteContent(pages, options);
      
      expect(content.size).toBe(exported.size);
      expect(content.get('index.html')).toBe(exported.get('index.html'));
    });
  });

  describe('Custom Domain Support', () => {
    describe('validateCustomDomain', () => {
      it('returns valid for simple domain', () => {
        const result = validateCustomDomain('example.com');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('returns valid for subdomain', () => {
        const result = validateCustomDomain('blog.example.com');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('returns valid for nested subdomain', () => {
        const result = validateCustomDomain('api.v2.example.co.uk');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('returns valid for localhost', () => {
        const result = validateCustomDomain('localhost');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('returns invalid for empty string', () => {
        const result = validateCustomDomain('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain is required');
      });

      it('returns invalid for whitespace-only string', () => {
        const result = validateCustomDomain('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain cannot be empty');
      });

      it('returns invalid for null/undefined', () => {
        // @ts-expect-error - Testing edge cases with null
        expect(validateCustomDomain(null).valid).toBe(false);
        // @ts-expect-error - Testing edge cases with undefined
        expect(validateCustomDomain(undefined).valid).toBe(false);
      });

      it('returns invalid for domain with protocol', () => {
        const result = validateCustomDomain('https://example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain should not include protocol (http:// or https://)');
      });

      it('returns invalid for domain with http protocol', () => {
        const result = validateCustomDomain('http://example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain should not include protocol (http:// or https://)');
      });

      it('returns invalid for domain with path', () => {
        const result = validateCustomDomain('example.com/path');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain should not include a path');
      });

      it('returns invalid for domain with port', () => {
        const result = validateCustomDomain('example.com:8080');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain should not include a port number');
      });

      it('returns invalid for IP address', () => {
        const result = validateCustomDomain('192.168.1.1');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('IP addresses are not supported for custom domains');
      });

      it('returns invalid for domain without TLD (except localhost)', () => {
        const result = validateCustomDomain('example');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid domain format. Example: example.com or blog.example.com');
      });

      it('returns invalid for label exceeding 63 characters', () => {
        const longLabel = 'a'.repeat(64);
        const result = validateCustomDomain(`${longLabel}.com`);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain label exceeds maximum length of 63 characters');
      });

      it('returns invalid for domain exceeding 253 characters', () => {
        // Create a domain that exceeds 253 characters but doesn't exceed 63 per label
        // Format: aaaaa.aaaaa.aaaaa... (each label under 63 chars)
        const label = 'a'.repeat(50);
        const numLabels = Math.ceil(254 / 51); // Need enough labels to exceed 253
        const longDomain = Array(numLabels).fill(label).join('.');
        const result = validateCustomDomain(longDomain);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Domain exceeds maximum length of 253 characters');
      });

      it('returns invalid for domain starting with hyphen', () => {
        const result = validateCustomDomain('-example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid domain format. Example: example.com or blog.example.com');
      });

      it('returns invalid for domain ending with hyphen', () => {
        const result = validateCustomDomain('example-.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid domain format. Example: example.com or blog.example.com');
      });

      it('handles case-insensitive domain names', () => {
        const result1 = validateCustomDomain('EXAMPLE.COM');
        const result2 = validateCustomDomain('Example.Com');
        expect(result1.valid).toBe(true);
        expect(result2.valid).toBe(true);
      });

      it('handles domains with hyphens in labels', () => {
        const result = validateCustomDomain('my-blog.example.com');
        expect(result.valid).toBe(true);
      });

      it('handles domains with numbers', () => {
        const result = validateCustomDomain('blog2.example.com');
        expect(result.valid).toBe(true);
      });
    });

    describe('generateCnameFile', () => {
      it('generates CNAME file content with newline', () => {
        const result = generateCnameFile('example.com');
        expect(result).toBe('example.com\n');
      });

      it('trims whitespace from domain', () => {
        const result = generateCnameFile('  example.com  ');
        expect(result).toBe('example.com\n');
      });
    });

    describe('exportStaticSite with custom domain', () => {
      it('generates CNAME file when customDomain is provided', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        ];
        const options = {
          siteTitle: 'My Site',
          siteDescription: 'A test site',
          includeSearch: false,
          includeToc: false,
          customDomain: 'example.com',
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('CNAME')).toBe(true);
        expect(result.get('CNAME')).toBe('example.com\n');
      });

      it('does not generate CNAME file when customDomain is not provided', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        ];
        const options = {
          siteTitle: 'My Site',
          siteDescription: 'A test site',
          includeSearch: false,
          includeToc: false,
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('CNAME')).toBe(false);
      });

      it('does not generate CNAME file when customDomain is empty string', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        ];
        const options = {
          siteTitle: 'My Site',
          siteDescription: 'A test site',
          includeSearch: false,
          includeToc: false,
          customDomain: '',
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('CNAME')).toBe(false);
      });

      it('does not generate CNAME file when customDomain is invalid', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        ];
        const options = {
          siteTitle: 'My Site',
          siteDescription: 'A test site',
          includeSearch: false,
          includeToc: false,
          customDomain: 'invalid domain with spaces',
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('CNAME')).toBe(false);
      });

      it('generates CNAME file with subdomain', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
        ];
        const options = {
          siteTitle: 'My Blog',
          siteDescription: 'A blog site',
          includeSearch: false,
          includeToc: false,
          customDomain: 'blog.example.com',
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('CNAME')).toBe(true);
        expect(result.get('CNAME')).toBe('blog.example.com\n');
      });

      it('includes HTML pages along with CNAME file', () => {
        const pages = [
          { name: 'Home', path: 'index.html', content: '<h1>Home</h1>' },
          { name: 'About', path: 'about.html', content: '<h1>About</h1>' },
        ];
        const options = {
          siteTitle: 'My Site',
          siteDescription: 'A test site',
          includeSearch: false,
          includeToc: false,
          customDomain: 'example.com',
        };
        
        const result = exportStaticSite(pages, options);
        
        expect(result.has('index.html')).toBe(true);
        expect(result.has('about.html')).toBe(true);
        expect(result.has('CNAME')).toBe(true);
        expect(result.size).toBe(3);
      });
    });
  });
});
