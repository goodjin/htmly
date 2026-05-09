import { describe, it, expect } from 'vitest';
import { escapeHtml, extractBodyContent, replaceBodyContent, isFullHtmlDocument } from './htmlUtils';

describe('escapeHtml', () => {
  it('escapes & to &amp;', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes < to &lt;', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes > to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes " to &quot;', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes \' to &#039;', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="url?foo=1&bar=2">link</a>')).toBe(
      '&lt;a href=&quot;url?foo=1&amp;bar=2&quot;&gt;link&lt;/a&gt;'
    );
  });

  it('returns string unchanged when no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('prevents XSS in URLs', () => {
    // javascript: URL scheme should be escaped
    expect(escapeHtml('javascript:alert(1)')).toBe('javascript:alert(1)');
    // The colon and parens are not escaped, but javascript: is treated as plain text
    // The key is that < > " ' are escaped, preventing attribute breakout
    expect(escapeHtml('"><script>alert(1)</script>')).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('isFullHtmlDocument', () => {
  it('returns true for doctype html', () => {
    expect(isFullHtmlDocument('<!doctype html><html><body><p>hi</p></body></html>')).toBe(true);
  });

  it('returns true for html tag only', () => {
    expect(isFullHtmlDocument('<html><body><p>hi</p></body></html>')).toBe(true);
  });

  it('returns true for body tag only', () => {
    expect(isFullHtmlDocument('<body><p>hi</p></body>')).toBe(true);
  });

  it('returns false for a fragment', () => {
    expect(isFullHtmlDocument('<p>hello</p><div>world</div>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isFullHtmlDocument('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isFullHtmlDocument('<!DOCTYPE HTML><html><body>x</body></html>')).toBe(true);
    expect(isFullHtmlDocument('<HTML><body>x</body></HTML>')).toBe(true);
  });
});

describe('extractBodyContent', () => {
  it('returns fragment as-is when not a full document', () => {
    const fragment = '<p>hello</p><div>world</div>';
    expect(extractBodyContent(fragment)).toBe(fragment);
  });

  it('extracts body innerHTML from a full document', () => {
    const doc = '<!doctype html><html><head><title>T</title></head><body><p>content</p></body></html>';
    const result = extractBodyContent(doc);
    expect(result).toContain('<p>content</p>');
    expect(result).not.toContain('<head>');
    expect(result).not.toContain('<title>');
  });

  it('preserves nested body content', () => {
    const doc = '<html><body><h1>Title</h1><p>text</p></body></html>';
    const result = extractBodyContent(doc);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>text</p>');
  });

  it('returns empty string for empty body', () => {
    const doc = '<html><body></body></html>';
    expect(extractBodyContent(doc)).toBe('');
  });
});

describe('replaceBodyContent', () => {
  it('returns bodyHtml as-is when original is not a full document', () => {
    const original = '<p>old</p>';
    const replacement = '<p>new</p>';
    expect(replaceBodyContent(original, replacement)).toBe(replacement);
  });

  it('replaces body content in a full document', () => {
    const original = '<!doctype html><html><head><title>T</title></head><body><p>old</p></body></html>';
    const result = replaceBodyContent(original, '<p>new</p>');
    expect(result).toContain('<p>new</p>');
    expect(result).not.toContain('<p>old</p>');
    expect(result).toContain('<title>T</title>');
  });

  it('preserves body attributes', () => {
    const original = '<html><body class="main"><p>old</p></body></html>';
    const result = replaceBodyContent(original, '<p>new</p>');
    expect(result).toContain('class="main"');
    expect(result).toContain('<p>new</p>');
  });

  it('adds body tag if missing but html closing tag exists', () => {
    const original = '<html><p>old</p></html>';
    const result = replaceBodyContent(original, '<p>new</p>');
    expect(result).toContain('<body><p>new</p></body>');
    expect(result).toContain('</html>');
  });

  it('returns bodyHtml when no body or html closing tag', () => {
    const original = '<html><p>old</p>';
    const result = replaceBodyContent(original, '<p>new</p>');
    expect(result).toBe('<p>new</p>');
  });
});
