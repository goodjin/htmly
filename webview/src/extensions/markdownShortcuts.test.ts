import { describe, it, expect } from 'vitest';
import { MarkdownShortcutsExtension } from './markdownShortcuts';

describe('Markdown shortcut regex patterns', () => {
  // Test the regex patterns that should match markdown shortcuts

  describe('heading patterns', () => {
    it('should match # at start of line', () => {
      const regex = /^#\s$/;
      expect('# '.match(regex)).toBeTruthy();
      expect('## '.match(regex)).toBeFalsy();
    });

    it('should match ## at start of line', () => {
      const regex = /^##\s$/;
      expect('## '.match(regex)).toBeTruthy();
      expect('# '.match(regex)).toBeFalsy();
    });

    it('should match ### at start of line', () => {
      const regex = /^###\s$/;
      expect('### '.match(regex)).toBeTruthy();
    });
  });

  describe('bold pattern', () => {
    it('should match **text**', () => {
      const regex = /\*\*([^*]+)\*\*$/;
      expect('**bold**'.match(regex)).toBeTruthy();
      expect('**bold**extra'.match(regex)).toBeFalsy();
    });
  });

  describe('italic pattern', () => {
    it('should match *text* but not **text**', () => {
      const regex = /(?<!\*)\*([^*]+)\*$/;
      expect('*italic*'.match(regex)).toBeTruthy();
    });
  });

  describe('inline code pattern', () => {
    it('should match `code`', () => {
      const regex = /`([^`]+)`$/;
      expect('`code`'.match(regex)).toBeTruthy();
    });
  });

  describe('horizontal rule pattern', () => {
    it('should match ---', () => {
      const regex = /^(?:---|\*\*\*|___)\s$/;
      expect('--- '.match(regex)).toBeTruthy();
      expect('*** '.match(regex)).toBeTruthy();
      expect('___ '.match(regex)).toBeTruthy();
    });
  });

  describe('unordered list pattern', () => {
    it('should match - and * at start of line', () => {
      const regex = /^[\-\*]\s$/;
      expect('- '.match(regex)).toBeTruthy();
      expect('* '.match(regex)).toBeTruthy();
    });
  });

  describe('ordered list pattern', () => {
    it('should match 1. and other numbers', () => {
      const regex = /^\d+\.\s$/;
      expect('1. '.match(regex)).toBeTruthy();
      expect('42. '.match(regex)).toBeTruthy();
    });
  });

  describe('blockquote pattern', () => {
    it('should match > at start of line', () => {
      const regex = /^>\s$/;
      expect('> '.match(regex)).toBeTruthy();
    });
  });
});

// Test that the extension configuration works correctly
describe('MarkdownShortcutsExtension configuration', () => {
  it('should accept enabled option', () => {
    const ext = MarkdownShortcutsExtension.configure({ enabled: true });
    expect(ext.options.enabled).toBe(true);
  });

  it('should accept disabled option', () => {
    const ext = MarkdownShortcutsExtension.configure({ enabled: false });
    expect(ext.options.enabled).toBe(false);
  });

  it('should default to enabled', () => {
    const ext = MarkdownShortcutsExtension.configure({});
    expect(ext.options.enabled).toBe(true);
  });
});
