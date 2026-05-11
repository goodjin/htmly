/**
 * Unit tests for htmlToPlaintext converter
 * Tests HTML to plain text conversion for various elements
 */

import { describe, it, expect } from 'vitest';
import { htmlToPlaintext } from './htmlToPlaintext';

describe('htmlToPlaintext', () => {
  describe('Basic HTML stripping', () => {
    it('strips all HTML tags', () => {
      const html = '<p><strong>bold</strong> and <em>italic</em></p>';
      const result = htmlToPlaintext(html);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('handles nested tags', () => {
      const html = '<div><span><strong><em>nested</em></strong></span></div>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('nested');
    });

    it('handles self-closing tags', () => {
      const html = '<p>Line 1<br>Line 2</p>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('Paragraphs', () => {
    it('preserves paragraph breaks with blank lines', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const result = htmlToPlaintext(html);
      expect(result).toMatch(/First paragraph\s+Second paragraph/);
    });

    it('handles multiple paragraphs', () => {
      const html = '<p>Para 1</p><p>Para 2</p><p>Para 3</p>';
      const result = htmlToPlaintext(html);
      const paragraphs = result.split(/\n\n+/).filter(p => p.trim());
      expect(paragraphs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Headings', () => {
    it('converts h1 to plain text', () => {
      const html = '<h1>Main Title</h1>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Main Title');
    });

    it('converts all heading levels', () => {
      expect(htmlToPlaintext('<h1>H1</h1>')).toContain('H1');
      expect(htmlToPlaintext('<h2>H2</h2>')).toContain('H2');
      expect(htmlToPlaintext('<h3>H3</h3>')).toContain('H3');
      expect(htmlToPlaintext('<h4>H4</h4>')).toContain('H4');
      expect(htmlToPlaintext('<h5>H5</h5>')).toContain('H5');
      expect(htmlToPlaintext('<h6>H6</h6>')).toContain('H6');
    });
  });

  describe('Links', () => {
    it('converts links to "text (url)" format', () => {
      const html = '<a href="https://example.com">Example Link</a>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Example Link');
      expect(result).toContain('(https://example.com)');
    });

    it('handles links with different URLs', () => {
      const html = '<a href="https://example.com/path/to/page">Page</a>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Page');
      expect(result).toContain('(https://example.com/path/to/page)');
    });

    it('handles mailto links', () => {
      const html = '<a href="mailto:test@example.com">Email</a>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Email');
      expect(result).toContain('(mailto:test@example.com)');
    });

    it('handles links without href', () => {
      const html = '<a>Just text</a>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('Just text');
    });
  });

  describe('Text Formatting (Bold/Italic preserved without markup)', () => {
    it('preserves bold text without markup', () => {
      const html = '<strong>bold text</strong>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('bold text');
      expect(result).not.toContain('**');
    });

    it('preserves italic text without markup', () => {
      const html = '<em>italic text</em>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('italic text');
      expect(result).not.toContain('*');
    });

    it('handles b tag as bold', () => {
      const html = '<b>bold</b>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('bold');
    });

    it('handles i tag as italic', () => {
      const html = '<i>italic</i>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('italic');
    });

    it('handles strikethrough without markup', () => {
      const html = '<del>deleted</del>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('deleted');
    });

    it('handles underline without markup', () => {
      const html = '<u>underlined</u>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('underlined');
    });

    it('handles highlight without markup', () => {
      const html = '<mark>highlighted</mark>';
      const result = htmlToPlaintext(html);
      expect(result).toBe('highlighted');
    });
  });

  describe('Lists', () => {
    it('preserves unordered list items with bullets', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('•');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('preserves ordered list structure', () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const result = htmlToPlaintext(html);
      // Ordered lists use bullets too for simplicity
      expect(result).toContain('•');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('handles nested lists', () => {
      const html = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('Parent');
      expect(result).toContain('Child');
    });
  });

  describe('Code', () => {
    it('preserves inline code content', () => {
      const html = '<p>Use <code>console.log()</code> for debugging</p>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('console.log()');
    });

    it('preserves preformatted text', () => {
      const html = '<pre>function hello() {\n  return "world";\n}</pre>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('function hello()');
      expect(result).toContain('return "world"');
    });
  });

  describe('Tables', () => {
    it('converts simple table to plain text', () => {
      const html = `
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
        </table>
      `;
      const result = htmlToPlaintext(html);
      expect(result).toContain('Header 1 | Header 2');
      expect(result).toContain('Cell 1 | Cell 2');
    });

    it('handles table with thead and tbody', () => {
      const html = `
        <table>
          <thead>
            <tr><th>Col1</th><th>Col2</th></tr>
          </thead>
          <tbody>
            <tr><td>A</td><td>B</td></tr>
          </tbody>
        </table>
      `;
      const result = htmlToPlaintext(html);
      expect(result).toContain('Col1 | Col2');
      expect(result).toContain('A | B');
    });
  });

  describe('Images', () => {
    it('converts image with alt text', () => {
      const html = '<img src="photo.jpg" alt="My Photo">';
      const result = htmlToPlaintext(html);
      expect(result).toContain('[My Photo]');
    });

    it('converts image without alt but with src', () => {
      const html = '<img src="photo.jpg">';
      const result = htmlToPlaintext(html);
      expect(result).toContain('[image: photo.jpg]');
    });
  });

  describe('Blockquotes', () => {
    it('preserves blockquote content', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = htmlToPlaintext(html);
      expect(result).toContain('This is a quote');
    });
  });

  describe('HTML Entities', () => {
    it('decodes common HTML entities', () => {
      expect(htmlToPlaintext('&amp;')).toBe('&');
      expect(htmlToPlaintext('&lt;')).toBe('<');
      expect(htmlToPlaintext('&gt;')).toBe('>');
      expect(htmlToPlaintext('&quot;')).toBe('"');
      expect(htmlToPlaintext('&#39;')).toBe("'");
      expect(htmlToPlaintext('&nbsp;')).toBe(' ');
      expect(htmlToPlaintext('&mdash;')).toBe('—');
      expect(htmlToPlaintext('&ndash;')).toBe('–');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string', () => {
      expect(htmlToPlaintext('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(htmlToPlaintext(null as any)).toBe('');
      expect(htmlToPlaintext(undefined as any)).toBe('');
    });

    it('handles plain text without HTML', () => {
      const text = 'Just plain text';
      expect(htmlToPlaintext(text)).toBe(text);
    });

    it('handles whitespace-only content', () => {
      const html = '<p>   </p>';
      const result = htmlToPlaintext(html);
      expect(result.trim()).toBe('');
    });

    it('removes script and style content', () => {
      const html = '<script>alert("xss");</script><p>Safe</p><style>.hidden{display:none}</style>';
      const result = htmlToPlaintext(html);
      expect(result).not.toContain('alert');
      expect(result).not.toContain('.hidden');
      expect(result).toContain('Safe');
    });
  });

  describe('Complex Documents', () => {
    it('converts full HTML document with mixed content', () => {
      const html = `
        <h1>Main Title</h1>
        <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
        <h2>Links Section</h2>
        <p>Visit <a href="https://example.com">our site</a> for more info.</p>
        <h2>List</h2>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <blockquote>A famous quote</blockquote>
      `;
      const result = htmlToPlaintext(html);
      
      // Check headings
      expect(result).toContain('Main Title');
      expect(result).toContain('Links Section');
      expect(result).toContain('List');
      
      // Check formatting is preserved without markup
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      
      // Check links
      expect(result).toContain('our site');
      expect(result).toContain('(https://example.com)');
      
      // Check list
      expect(result).toContain('•');
      expect(result).toContain('First item');
      expect(result).toContain('Second item');
      
      // Check blockquote
      expect(result).toContain('A famous quote');
      
      // Ensure no HTML tags remain
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });
});
