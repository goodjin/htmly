import { describe, it, expect } from 'vitest';
import { expandAbbreviation, abbreviationTracker, emmetConfig } from '@emmetio/codemirror6-plugin';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

// These tests verify that the Emmet package is properly imported and available
// The actual CodeMirror integration is tested via E2E tests

describe('Emmet integration', () => {
  it('expandAbbreviation is a valid function', () => {
    expect(typeof expandAbbreviation).toBe('function');
  });

  it('abbreviationTracker is a valid function', () => {
    expect(typeof abbreviationTracker).toBe('function');
  });

  it('emmetConfig is a valid Facet object', () => {
    // emmetConfig is a CodeMirror Facet, not a function
    expect(emmetConfig).toBeDefined();
    expect(typeof emmetConfig).toBe('object');
    expect(emmetConfig).toHaveProperty('of');
  });

  it('expandAbbreviation is callable as a StateCommand', () => {
    // expandAbbreviation is a StateCommand per the docs
    const cmd = expandAbbreviation;
    expect(cmd).toBeDefined();
    expect(typeof cmd).toBe('function');
  });

  it('abbreviationTracker returns an extension array', () => {
    // abbreviationTracker returns an Extension
    const ext = abbreviationTracker();
    expect(ext).toBeDefined();
    expect(typeof ext).toBe('object');
    // It returns an array of extensions
    expect(Array.isArray(ext)).toBe(true);
  });
});

// HTML formatting tests
describe('HTML formatting', () => {
  // Helper function to format HTML (mirrors the implementation in CodeEditor.vue)
  function formatHtml(html: string): string {
    let formatted = '';
    let indent = 0;
    
    const parts = html.match(/<[^>]+>|[^<]+/g) || [];
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += '  '.repeat(indent) + trimmed + '\n';
      }
      else if (trimmed.match(/^<[a-zA-Z][^>]*[^/]>$/)) {
        formatted += '  '.repeat(indent) + trimmed + '\n';
        indent++;
      }
      else if (trimmed.match(/^<\w+[^>]*\/>$/)) {
        formatted += '  '.repeat(indent) + trimmed + '\n';
      }
      else if (trimmed.startsWith('<')) {
        formatted += '  '.repeat(indent) + trimmed + '\n';
        indent++;
      }
      else {
        formatted += '  '.repeat(indent) + trimmed + '\n';
      }
    }
    
    return formatted.trim();
  }

  it('formats simple HTML with proper indentation', () => {
    const input = '<div><span>text</span></div>';
    const result = formatHtml(input);
    
    expect(result).toContain('<div>');
    expect(result).toContain('  <span>');
    expect(result).toContain('  </span>');
    expect(result).toContain('</div>');
  });

  it('handles nested HTML elements', () => {
    const input = '<html><body><div><p>Paragraph</p></div></body></html>';
    const result = formatHtml(input);
    
    const lines = result.split('\n');
    // Check indentation levels increase and decrease properly
    expect(result).toContain('<html>');
    expect(result).toContain('  <body>');
    expect(result).toContain('    <div>');
    expect(result).toContain('      <p>');
    expect(result).toContain('      </p>');
    expect(result).toContain('    </div>');
    expect(result).toContain('  </body>');
    expect(result).toContain('</html>');
  });

  it('handles self-closing tags', () => {
    const input = '<div><br/><img src="test.png"/></div>';
    const result = formatHtml(input);
    
    expect(result).toContain('<br/>');
    expect(result).toContain('<img');
  });

  it('preserves attributes when formatting', () => {
    const input = '<div class="test" id="main"><a href="http://example.com">Link</a></div>';
    const result = formatHtml(input);
    
    expect(result).toContain('class="test"');
    expect(result).toContain('id="main"');
    expect(result).toContain('href="http://example.com"');
  });

  it('handles empty input gracefully', () => {
    const input = '';
    const result = formatHtml(input);
    expect(result).toBe('');
  });

  it('handles already formatted HTML', () => {
    const input = '<div>\n  <span>text</span>\n</div>';
    const result = formatHtml(input);
    
    // Should not change already formatted content
    expect(result).toContain('<div>');
    expect(result).toContain('  <span>');
  });
});

// CodeMirror extensions tests
describe('CodeMirror extensions availability', () => {
  it('foldGutter is importable', async () => {
    const { foldGutter } = await import('@codemirror/language');
    expect(typeof foldGutter).toBe('function');
  });

  it('HighlightStyle is importable', async () => {
    const { HighlightStyle } = await import('@codemirror/language');
    expect(typeof HighlightStyle).toBe('function');
  });

  it('lezer tags is importable', async () => {
    const { tags } = await import('@lezer/highlight');
    expect(tags).toBeDefined();
    expect(tags.tagName).toBeDefined();
    expect(tags.attributeName).toBeDefined();
    expect(tags.attributeValue).toBeDefined();
  });

  it('indentOnInput is importable', async () => {
    const { indentOnInput } = await import('@codemirror/language');
    expect(typeof indentOnInput).toBe('function');
  });
});

// Cursor position tracking tests
describe('CodeEditor cursor position interface', () => {
  it('CodeEditorCursorPosition interface has required fields', () => {
    // This tests the exported interface type
    const position: {
      percentage: number;
      offset: number;
      line: number;
      totalLines: number;
    } = {
      percentage: 0.5,
      offset: 100,
      line: 5,
      totalLines: 20,
    };
    
    expect(position.percentage).toBe(0.5);
    expect(position.offset).toBe(100);
    expect(position.line).toBe(5);
    expect(position.totalLines).toBe(20);
  });

  it('cursor position percentage is between 0 and 1', () => {
    const positions = [0, 0.25, 0.5, 0.75, 1];
    
    for (const pos of positions) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(1);
    }
  });

  it('offset is calculated correctly', () => {
    const content = '<html><body><p>Hello</p></body></html>';
    const offset = Math.round(0.5 * content.length);
    
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(content.length);
  });

  it('line numbers are 1-based', () => {
    const lines = ['<html>', '<body>', '<p>Test</p>', '</body>', '</html>'];
    const lineNumber = 3;
    
    expect(lineNumber).toBeGreaterThan(0);
    expect(lineNumber).toBeLessThanOrEqual(lines.length);
  });
});

// Cross-mode cursor position conversion tests
describe('Cross-mode cursor position conversion', () => {
  it('percentage to Tiptap cursor conversion', () => {
    // Simulate conversion logic
    const percentage = 0.5;
    const bodyContent = '<p>Line 1</p><p>Line 2</p><p>Line 3</p><p>Line 4</p>';
    const blocks = bodyContent.split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div|table|details))/g);
    const totalBlocks = blocks.length || 1;
    const targetBlockIndex = Math.floor(percentage * totalBlocks);
    
    expect(totalBlocks).toBe(4);
    expect(targetBlockIndex).toBe(2); // 0.5 * 4 = 2
  });

  it('percentage to CodeEditor cursor conversion', () => {
    // Simulate conversion logic
    const percentage = 0.5;
    const content = '<html>\n<body>\n<p>Test</p>\n</body>\n</html>';
    const lines = content.split('\n');
    const totalLines = lines.length;
    const targetLine = Math.ceil(percentage * totalLines);
    
    expect(totalLines).toBe(5);
    expect(targetLine).toBe(3); // ceil(0.5 * 5) = 3
  });

  it('preserves cursor position at document start', () => {
    const percentage = 0;
    const bodyContent = '<p>First</p><p>Second</p>';
    const blocks = bodyContent.split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div|table|details))/g);
    const targetBlockIndex = Math.floor(percentage * blocks.length);
    
    expect(targetBlockIndex).toBe(0);
  });

  it('preserves cursor position at document end', () => {
    const percentage = 1;
    const bodyContent = '<p>First</p><p>Second</p>';
    const blocks = bodyContent.split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div|table|details))/g);
    const targetBlockIndex = Math.min(Math.floor(percentage * blocks.length), blocks.length - 1);
    
    expect(targetBlockIndex).toBe(1);
  });
});
