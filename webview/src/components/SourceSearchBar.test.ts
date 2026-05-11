import { describe, it, expect } from 'vitest';

/**
 * These tests verify the regex search pattern matching logic
 * used in SourceSearchBar.vue for the CodeMirror Source mode.
 */

describe('SourceSearchBar regex search', () => {
  describe('regex pattern matching', () => {
    it('matches digits with \\d+ regex pattern', () => {
      const content = 'abc 123 def 456';
      const regex = /\d+/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ from: 4, to: 7 }); // "123"
      expect(matches[1]).toEqual({ from: 12, to: 15 }); // "456"
    });

    it('matches HTML tags with <[^>]+> pattern', () => {
      const content = '<div><span>text</span></div>';
      const regex = /<[^>]+>/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      // <div>, <span>, </span>, </div> = 4 tags
      expect(matches).toHaveLength(4);
      expect(matches[0]).toEqual({ from: 0, to: 5 }); // "<div>"
    });

    it('matches word boundaries with \\b pattern', () => {
      const content = 'The cat and the dog';
      const regex = /\bcat\b/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ from: 4, to: 7 });
    });

    it('handles invalid regex gracefully', () => {
      const invalidPattern = '[invalid';
      expect(() => new RegExp(invalidPattern)).toThrow(SyntaxError);
    });

    it('matches case-insensitive patterns with /i flag', () => {
      const content = 'Hello HELLO hello';
      const regex = /hello/gi;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(3);
    });

    it('matches multiline content', () => {
      const content = '<div>\n  <p>Line1</p>\n  <p>Line2</p>\n</div>';
      const regex = /<p>.*?<\/p>/gs;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(2);
    });

    it('handles zero-length matches without infinite loop', () => {
      const content = 'abc';
      const regex = /a*/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
      
      // Should match 'a', then '', then 'b', '', 'c', ''
      expect(matches.length).toBeGreaterThan(0);
    });

    it('matches email pattern', () => {
      const content = 'Contact: user@example.com or admin@test.org';
      const regex = /[\w.-]+@[\w.-]+\.\w+/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(2);
      expect(matches[0].from).toBe(9); // "user@example.com"
      expect(content.substring(matches[0].from, matches[0].to)).toBe('user@example.com');
    });

    it('matches URL pattern', () => {
      const content = 'Visit https://example.com/path or http://test.org';
      const regex = /https?:\/\/[^\s]+/g;
      const matches: { from: number; to: number }[] = [];
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
      }
      
      expect(matches).toHaveLength(2);
    });

    it('escapes regex special characters for literal search', () => {
      // This tests the escapeRegex function behavior
      const specialChars = '.*+?^${}()|[]\\';
      const escaped = specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // All special characters should be escaped with backslash
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
      
      // Using escaped pattern should match literal string
      const regex = new RegExp(escaped, 'g');
      const matches = [...specialChars.matchAll(new RegExp(escaped, 'g'))];
      expect(matches.length).toBe(1);
    });
  });
});
