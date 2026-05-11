/**
 * Unit tests for embedHtml converter
 * Tests HTML to embedded HTML conversion for various elements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { embedHtml, embedHtmlSync, getImageInfo, resetImageCache } from './embedHtml';

describe('embedHtmlSync', () => {
  beforeEach(() => {
    // Reset the image cache before each test
    resetImageCache();
  });

  describe('Document Structure', () => {
    it('preserves complete HTML document structure', () => {
      const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Content</p></body></html>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</html>');
    });

    it('wraps fragment HTML in basic document structure', () => {
      const html = '<p>Just a paragraph</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
      expect(result).toContain('Just a paragraph');
    });

    it('preserves HTML content inside body', () => {
      const html = '<body><h1>Title</h1><p>Paragraph</p></body>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Paragraph</p>');
    });
  });

  describe('Image Handling', () => {
    it('identifies data URI images as already embedded', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const html = `<img src="${dataUri}" alt="Test">`;
      const result = embedHtmlSync(html);
      // Should keep the data URI as-is
      expect(result).toContain(dataUri);
    });

    it('handles images with various attributes', () => {
      const html = '<img src="image.png" alt="Test Image" width="100" height="50" class="my-image">';
      const result = embedHtmlSync(html);
      // Image structure should be preserved
      expect(result).toContain('alt="Test Image"');
      expect(result).toContain('width="100"');
      expect(result).toContain('height="50"');
      expect(result).toContain('class="my-image"');
    });

    it('handles multiple images in document', () => {
      const html = '<div><img src="img1.png" alt="First"><p>Text</p><img src="img2.png" alt="Second"></div>';
      const result = embedHtmlSync(html);
      expect(result).toContain('alt="First"');
      expect(result).toContain('alt="Second"');
      expect(result).toContain('Text');
    });

    it('handles images with empty src', () => {
      const html = '<img src="" alt="Empty src">';
      const result = embedHtmlSync(html);
      expect(result).toContain('alt="Empty src"');
    });

    it('handles background images in style attribute', () => {
      const html = '<div style="background-image: url(bg.png)">Content</div>';
      const result = embedHtmlSync(html);
      expect(result).toContain('style=');
      expect(result).toContain('Content');
    });
  });

  describe('CSS Inlining', () => {
    it('inlines inline styles', () => {
      const html = '<p style="color: red; font-size: 16px;">Styled text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('style=');
      expect(result).toContain('Styled text');
    });

    it('handles elements with class attributes', () => {
      const html = '<p class="highlight">Class text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('class="highlight"');
      expect(result).toContain('Class text');
    });

    it('preserves computed styles when inlineStyles option is true', () => {
      const html = '<p style="color: blue;">Blue text</p>';
      const result = embedHtmlSync(html, { inlineStyles: true });
      expect(result).toContain('style=');
      expect(result).toContain('color');
    });

    it('handles nested styled elements', () => {
      const html = '<div style="margin: 10px;"><p style="color: green;">Nested</p></div>';
      const result = embedHtmlSync(html);
      expect(result).toContain('margin');
      expect(result).toContain('color');
      expect(result).toContain('Nested');
    });

    it('handles elements with multiple classes', () => {
      const html = '<p class="class1 class2 class3">Multi-class</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('class="class1 class2 class3"');
      expect(result).toContain('Multi-class');
    });
  });

  describe('Font Handling', () => {
    it('handles inline font-family style', () => {
      const html = '<p style="font-family: Arial, sans-serif;">Text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('font-family');
      expect(result).toContain('Text');
    });

    it('preserves web-safe fonts', () => {
      const webSafeFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana'];
      for (const font of webSafeFonts) {
        const html = `<p style="font-family: '${font}', sans-serif;">${font}</p>`;
        const result = embedHtmlSync(html);
        expect(result).toContain(font);
      }
    });

    it('handles custom font-family with fallbacks', () => {
      const html = '<p style="font-family: CustomFont, Arial, sans-serif;">Custom font text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('Arial');
      expect(result).toContain('Custom font text');
    });

    it('handles font-size inline style', () => {
      const html = '<p style="font-size: 18px;">Large text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('font-size');
      expect(result).toContain('Large text');
    });

    it('handles font-weight inline style', () => {
      const html = '<p style="font-weight: bold;">Bold text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('font-weight');
      expect(result).toContain('Bold text');
    });
  });

  describe('Style Tag Handling', () => {
    it('preserves <style> tag content', () => {
      const html = '<style>.test { color: red; }</style><p>Content</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('.test');
      expect(result).toContain('color: red');
      expect(result).toContain('Content');
    });

    it('handles multiple style tags', () => {
      const html = '<style>.a { color: red; }</style><style>.b { font-size: 12px; }</style><p>Text</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('.a');
      expect(result).toContain('.b');
      expect(result).toContain('Text');
    });

    it('inlines styles from style tags when inlineStyles option is true', () => {
      const html = '<style>.highlight { background: yellow; }</style><p class="highlight">Highlighted</p>';
      const result = embedHtmlSync(html, { inlineStyles: true });
      expect(result).toContain('highlight');
      expect(result).toContain('Highlighted');
    });
  });

  describe('Link Tag Handling', () => {
    it('handles link tags in head', () => {
      const html = '<head><link rel="stylesheet" href="styles.css"></head><body><p>Content</p></body>';
      const result = embedHtmlSync(html);
      // External links are not processed (would need to fetch)
      expect(result).toContain('Content');
    });

    it('preserves meta tags', () => {
      const html = '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body><p>Content</p></body>';
      const result = embedHtmlSync(html);
      expect(result).toContain('charset="UTF-8"');
      expect(result).toContain('viewport');
      expect(result).toContain('Content');
    });
  });

  describe('Script Tag Handling', () => {
    it('removes script tags for security', () => {
      const html = '<script>alert("xss")</script><p>Safe content</p>';
      const result = embedHtmlSync(html);
      expect(result).not.toContain('alert');
      expect(result).not.toContain('script');
      expect(result).toContain('Safe content');
    });

    it('removes inline event handlers', () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      const result = embedHtmlSync(html);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string', () => {
      const result = embedHtmlSync('');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
    });

    it('handles null/undefined input', () => {
      expect(embedHtmlSync('' as any)).toBeDefined();
      expect(embedHtmlSync(null as any)).toBeDefined();
    });

    it('handles deeply nested elements', () => {
      const html = '<div><div><div><div><p>Deep</p></div></div></div></div>';
      const result = embedHtmlSync(html);
      expect(result).toContain('Deep');
    });

    it('handles special characters in content', () => {
      const html = '<p>&lt;script&gt; &amp; &quot;test&quot;</p>';
      const result = embedHtmlSync(html);
      expect(result).toContain('test');
    });

    it('handles SVG elements', () => {
      const html = '<svg><rect width="100" height="100"/></svg>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('handles table elements', () => {
      const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<table');
      expect(result).toContain('Cell 1');
      expect(result).toContain('Cell 2');
    });

    it('handles list elements', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<ul');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('handles form elements', () => {
      const html = '<form><input type="text" name="name"><button>Submit</button></form>';
      const result = embedHtmlSync(html);
      expect(result).toContain('<form');
      expect(result).toContain('type="text"');
      expect(result).toContain('Submit');
    });
  });

  describe('Complete Documents', () => {
    it('converts full HTML document with mixed content', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Document</title>
          <style>.test { color: blue; }</style>
        </head>
        <body>
          <h1>Main Title</h1>
          <p style="color: red;">Styled paragraph</p>
          <img src="image.png" alt="An image">
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </body>
        </html>
      `;
      const result = embedHtmlSync(html);
      
      // Check document structure
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('</html>');
      
      // Check content preservation
      expect(result).toContain('Main Title');
      expect(result).toContain('Styled paragraph');
      expect(result).toContain('List item 1');
      expect(result).toContain('List item 2');
      
      // Check image handling
      expect(result).toContain('alt="An image"');
      
      // Check style handling
      expect(result).toContain('.test');
    });

    it('preserves document semantics with embedded content', () => {
      const html = `
        <article>
          <header><h1>Article Title</h1></header>
          <main>
            <section>
              <h2>Section 1</h2>
              <p>Paragraph in section</p>
            </section>
          </main>
          <footer>Footer content</footer>
        </article>
      `;
      const result = embedHtmlSync(html);
      
      expect(result).toContain('Article Title');
      expect(result).toContain('Section 1');
      expect(result).toContain('Paragraph in section');
      expect(result).toContain('Footer content');
    });
  });

  describe('Options', () => {
    it('respects inlineStyles option when false', () => {
      const html = '<p style="color: blue;">Blue</p>';
      const result = embedHtmlSync(html, { inlineStyles: false });
      expect(result).toBeDefined();
    });

    it('respects embedImages option when false', () => {
      const html = '<img src="test.png" alt="Test">';
      const result = embedHtmlSync(html, { embedImages: false });
      expect(result).toContain('test.png');
    });

    it('handles unknown options gracefully', () => {
      const html = '<p>Test</p>';
      const result = embedHtmlSync(html, { unknownOption: true } as any);
      expect(result).toContain('Test');
    });

    it('combines multiple options', () => {
      const html = '<p style="color: red;">Styled</p><img src="img.png" alt="Image">';
      const result = embedHtmlSync(html, { 
        inlineStyles: true, 
        embedImages: false 
      });
      expect(result).toContain('Styled');
      expect(result).toContain('img.png');
    });
  });

  describe('getImageInfo', () => {
    it('extracts image information from HTML', () => {
      const html = '<img src="test.png" alt="Test"><img src="https://example.com/img.jpg">';
      const images = getImageInfo(html);
      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        src: 'test.png',
        isDataUri: false,
        isExternal: false
      });
      expect(images[1]).toEqual({
        src: 'https://example.com/img.jpg',
        isDataUri: false,
        isExternal: true
      });
    });

    it('identifies data URIs', () => {
      const dataUri = 'data:image/png;base64,abc123';
      const html = `<img src="${dataUri}">`;
      const images = getImageInfo(html);
      expect(images[0]).toEqual({
        src: dataUri,
        isDataUri: true,
        isExternal: false
      });
    });

    it('handles empty HTML', () => {
      const images = getImageInfo('');
      expect(images).toHaveLength(0);
    });
  });

  describe('Async embedHtml', () => {
    it('returns Promise for async operation', async () => {
      const html = '<p>Test</p>';
      const result = await embedHtml(html);
      expect(result).toContain('Test');
    });
  });
});
