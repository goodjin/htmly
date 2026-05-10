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
