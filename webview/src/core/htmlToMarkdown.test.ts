/**
 * Unit tests for htmlToMarkdown converter
 * Tests HTML to Markdown conversion for various elements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { htmlToMarkdown, resetTurndownService } from './htmlToMarkdown';

describe('htmlToMarkdown', () => {
  beforeEach(() => {
    // Reset the Turndown service before each test to ensure clean state
    resetTurndownService();
  });

  describe('Headings', () => {
    it('converts h1 to # heading', () => {
      const html = '<h1>Hello World</h1>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('# Hello World');
    });

    it('converts h2 to ## heading', () => {
      const html = '<h2>Subtitle</h2>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('## Subtitle');
    });

    it('converts h3 to ### heading', () => {
      const html = '<h3>Section</h3>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('### Section');
    });

    it('converts h4 to #### heading', () => {
      const html = '<h4>Subsection</h4>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('#### Subsection');
    });

    it('converts h5 to ##### heading', () => {
      const html = '<h5>Minor Section</h5>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('##### Minor Section');
    });

    it('converts h6 to ###### heading', () => {
      const html = '<h6>Smallest Heading</h6>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('###### Smallest Heading');
    });
  });

  describe('Text Formatting', () => {
    it('converts bold (strong) to **text**', () => {
      const html = '<strong>bold text</strong>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('**bold text**');
    });

    it('converts bold (b) to **text**', () => {
      const html = '<b>bold text</b>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('**bold text**');
    });

    it('converts italic (em) to *text*', () => {
      const html = '<em>italic text</em>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('*italic text*');
    });

    it('converts italic (i) to *text*', () => {
      const html = '<i>italic text</i>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('*italic text*');
    });

    it('converts strikethrough (del) to ~~text~~', () => {
      const html = '<del>deleted text</del>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('~~deleted text~~');
    });

    it('converts strikethrough (s) to ~~text~~', () => {
      const html = '<s>strikethrough text</s>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('~~strikethrough text~~');
    });

    it('converts strikethrough (strike) to ~~text~~', () => {
      const html = '<strike>strikethrough text</strike>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('~~strikethrough text~~');
    });

    it('converts inline code to `code`', () => {
      const html = '<code>console.log("hello")</code>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('`console.log("hello")`');
    });

    it('handles code with backticks inside', () => {
      const html = '<code>`inline`</code>';
      const markdown = htmlToMarkdown(html);
      // Turndown escapes backticks by wrapping with extra backticks
      expect(markdown).toContain('`inline`');
    });
  });

  describe('Code Blocks', () => {
    it('converts pre/code block to fenced code block', () => {
      const html = '<pre><code>function hello() {\n  return "world";\n}</code></pre>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('```');
      expect(markdown).toContain('function hello()');
      expect(markdown).toContain('return "world";');
    });

    it('extracts language from code class', () => {
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('```javascript');
    });

    it('handles pre without nested code', () => {
      const html = '<pre>preformatted text</pre>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('```');
      expect(markdown).toContain('preformatted text');
    });
  });

  describe('Links', () => {
    it('converts anchor to [text](url)', () => {
      const html = '<a href="https://example.com">Example Link</a>';
      const markdown = htmlToMarkdown(html);
      // jsdom converts relative URLs to absolute, so check for the link text
      expect(markdown).toContain('[Example Link](');
      expect(markdown).toContain('https://example.com');
    });

    it('handles anchor with different href', () => {
      const html = '<a href="https://example.com/path/to/page">Page Link</a>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('[Page Link](');
      expect(markdown).toContain('https://example.com/path/to/page');
    });

    it('handles anchor with mailto', () => {
      const html = '<a href="mailto:test@example.com">Email</a>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('[Email](mailto:test@example.com)');
    });
  });

  describe('Images', () => {
    it('converts img to ![alt](url)', () => {
      const html = '<img src="https://example.com/image.png" alt="My Image">';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('![My Image](');
      expect(markdown).toContain('https://example.com/image.png');
    });

    it('handles img without alt', () => {
      const html = '<img src="https://example.com/photo.jpg">';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('![](https://example.com/photo.jpg)');
    });

    it('handles img with full URL', () => {
      const html = '<img src="https://example.com/logo.png" alt="Logo">';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('![Logo](https://example.com/logo.png)');
    });
  });

  describe('Lists', () => {
    it('converts unordered list to - items', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const markdown = htmlToMarkdown(html);
      // Turndown uses 4 spaces for indentation
      expect(markdown).toContain('-   Item 1');
      expect(markdown).toContain('-   Item 2');
      expect(markdown).toContain('-   Item 3');
    });

    it('converts ordered list to 1. 2. 3. items', () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const markdown = htmlToMarkdown(html);
      // Turndown uses 4 spaces for indentation
      expect(markdown).toContain('1.  First');
      expect(markdown).toContain('2.  Second');
      expect(markdown).toContain('3.  Third');
    });

    it('handles nested lists', () => {
      const html = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('-   Parent');
      expect(markdown).toContain('    -   Child');
    });
  });

  describe('Tables', () => {
    it('converts table with thead and tbody', () => {
      const html = `
        <table>
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
            <tr><td>Cell 3</td><td>Cell 4</td></tr>
          </tbody>
        </table>
      `;
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('| Header 1 | Header 2 |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Cell 1 | Cell 2 |');
      expect(markdown).toContain('| Cell 3 | Cell 4 |');
    });
  });

  describe('Blockquotes', () => {
    it('converts blockquote to > text', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('> This is a quote');
    });

    it('handles multiline blockquote', () => {
      const html = '<blockquote><p>Line 1</p><p>Line 2</p></blockquote>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('> Line 1');
      expect(markdown).toContain('> Line 2');
    });
  });

  describe('Horizontal Rules', () => {
    it('converts hr to ---', () => {
      const html = '<hr>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('---');
    });
  });

  describe('Complex Document', () => {
    it('converts full HTML document with mixed content', () => {
      const html = `
        <h1>Main Title</h1>
        <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
        <h2>Code Example</h2>
        <pre><code class="language-javascript">const greeting = "Hello";</code></pre>
        <h2>Links and Images</h2>
        <p>Visit <a href="https://example.com">our site</a> or see <img src="https://example.com/diagram.png" alt="diagram">.</p>
        <h2>List</h2>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
      `;
      const markdown = htmlToMarkdown(html);
      
      // Check headings
      expect(markdown).toContain('# Main Title');
      expect(markdown).toContain('## Code Example');
      expect(markdown).toContain('## Links and Images');
      expect(markdown).toContain('## List');
      
      // Check formatting
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      
      // Check code
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const greeting = "Hello";');
      
      // Check links and images
      expect(markdown).toContain('[our site](');
      expect(markdown).toContain('https://example.com');
      expect(markdown).toContain('![diagram](');
      
      // Check lists
      expect(markdown).toContain('-   First item');
      expect(markdown).toContain('-   Second item');
    });
  });
});
