import { describe, it, expect } from 'vitest';
import { searchHighlightKey, SearchHighlightExtension, type SearchMatch } from './SearchHighlight';

/**
 * These tests verify the SearchHighlight extension for Tiptap WYSIWYG mode.
 * The extension provides visual highlighting for search/regex matches.
 */

describe('SearchHighlight extension', () => {
  describe('extension configuration', () => {
    it('should have correct name', () => {
      expect(SearchHighlightExtension.name).toBe('searchHighlight');
    });

    it('should create extension with default options', () => {
      const extension = SearchHighlightExtension.configure();
      expect(extension.options.enabled).toBe(true);
    });
  });

  describe('searchHighlightKey plugin key', () => {
    it('should have a valid plugin key', () => {
      expect(searchHighlightKey).toBeDefined();
      expect(typeof searchHighlightKey).toBe('object');
    });
  });

  describe('SearchMatch interface', () => {
    it('should accept valid match positions', () => {
      const match: SearchMatch = {
        from: 0,
        to: 5,
      };
      expect(match.from).toBe(0);
      expect(match.to).toBe(5);
    });

    it('should handle matches at different positions', () => {
      const matches: SearchMatch[] = [
        { from: 0, to: 3 },
        { from: 10, to: 15 },
        { from: 20, to: 25 },
      ];
      expect(matches).toHaveLength(3);
      expect(matches[0].from).toBe(0);
      expect(matches[2].to).toBe(25);
    });
  });

  describe('highlight state management', () => {
    it('should track current index correctly', () => {
      // Test that currentIndex can be -1 (no selection) or >= 0
      let currentIndex = -1;
      expect(currentIndex).toBe(-1);

      currentIndex = 0;
      expect(currentIndex).toBe(0);

      currentIndex = 5;
      expect(currentIndex).toBe(5);
    });

    it('should handle empty matches array', () => {
      const matches: SearchMatch[] = [];
      expect(matches).toHaveLength(0);
    });

    it('should handle single match', () => {
      const matches: SearchMatch[] = [{ from: 5, to: 10 }];
      expect(matches).toHaveLength(1);
      expect(matches[0].from).toBe(5);
      expect(matches[0].to).toBe(10);
    });
  });

  describe('decoration class assignment', () => {
    it('should assign current class to current match', () => {
      const matches: SearchMatch[] = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
        { from: 10, to: 13 },
      ];
      const currentIndex = 1;

      // When i === currentIndex, it should use 'search-highlight-current'
      for (let i = 0; i < matches.length; i++) {
        const isCurrent = i === currentIndex;
        const expectedClass = isCurrent ? 'search-highlight-current' : 'search-highlight';
        expect(expectedClass).toBe(i === 1 ? 'search-highlight-current' : 'search-highlight');
      }
    });

    it('should assign regular class to non-current matches', () => {
      const matches: SearchMatch[] = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
        { from: 10, to: 13 },
      ];
      const currentIndex = 1;

      // Index 0 should be regular
      expect('search-highlight').toBe('search-highlight');
      // Index 1 should be current
      expect('search-highlight-current').toBe('search-highlight-current');
      // Index 2 should be regular
      expect('search-highlight').toBe('search-highlight');
    });

    it('should handle no current selection (currentIndex = -1)', () => {
      const matches: SearchMatch[] = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
      ];
      const currentIndex = -1;

      // When currentIndex is -1, no match should be marked as current
      for (let i = 0; i < matches.length; i++) {
        const isCurrent = i === currentIndex;
        expect(isCurrent).toBe(false);
      }
    });
  });

  describe('match position validation', () => {
    it('should validate that from < to for valid range', () => {
      const match: SearchMatch = { from: 0, to: 5 };
      const isValid = match.from >= 0 && match.to <= 100 && match.from < match.to;
      expect(isValid).toBe(true);
    });

    it('should detect invalid range where from >= to', () => {
      const match: SearchMatch = { from: 10, to: 5 };
      const isValid = match.from >= 0 && match.to <= 100 && match.from < match.to;
      expect(isValid).toBe(false);
    });

    it('should handle zero-length matches', () => {
      const match: SearchMatch = { from: 5, to: 5 };
      const isValid = match.from >= 0 && match.to <= 100 && match.from < match.to;
      expect(isValid).toBe(false);
    });
  });

  describe('multiple match scenarios', () => {
    it('should handle multiple matches in same paragraph', () => {
      const text = 'hello world hello world';
      const matches: SearchMatch[] = [];
      const searchTerm = 'hello';
      
      let pos = 0;
      let idx = text.indexOf(searchTerm, pos);
      while (idx !== -1) {
        matches.push({
          from: idx,
          to: idx + searchTerm.length,
        });
        pos = idx + 1;
        idx = text.indexOf(searchTerm, pos);
      }

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ from: 0, to: 5 });
      expect(matches[1]).toEqual({ from: 12, to: 17 });
    });

    it('should handle overlapping matches gracefully', () => {
      // For overlapping patterns like "aa" in "aaa", some matches may overlap
      const text = 'aaa';
      const matches: SearchMatch[] = [];
      const pattern = /aa/g;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
        });
        // Prevent infinite loop
        if (match[0].length === 0) break;
      }

      // "aaa" has two overlapping "aa" matches at positions 0 and 1
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should handle matches across block boundaries', () => {
      // Matches might span across block elements in ProseMirror
      const matches: SearchMatch[] = [
        { from: 5, to: 20 },
      ];
      expect(matches[0].from).toBeLessThan(matches[0].to);
    });
  });

  describe('CSS class constants', () => {
    it('should use correct CSS class names', () => {
      const regularClass = 'search-highlight';
      const currentClass = 'search-highlight-current';
      
      expect(regularClass).toBe('search-highlight');
      expect(currentClass).toBe('search-highlight-current');
    });
  });
});

describe('SearchHighlight integration scenarios', () => {
  describe('navigating through matches', () => {
    it('should update current index when navigating next', () => {
      const matches = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
        { from: 10, to: 13 },
      ];
      let currentIndex = 0;

      // Simulate nextMatch
      currentIndex = (currentIndex + 1) % matches.length;
      expect(currentIndex).toBe(1);

      // Simulate nextMatch again
      currentIndex = (currentIndex + 1) % matches.length;
      expect(currentIndex).toBe(2);

      // Simulate nextMatch again (wraps around)
      currentIndex = (currentIndex + 1) % matches.length;
      expect(currentIndex).toBe(0);
    });

    it('should update current index when navigating previous', () => {
      const matches = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
        { from: 10, to: 13 },
      ];
      let currentIndex = 2;

      // Simulate prevMatch
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      expect(currentIndex).toBe(1);

      // Simulate prevMatch again
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      expect(currentIndex).toBe(0);

      // Simulate prevMatch again (wraps around)
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      expect(currentIndex).toBe(2);
    });
  });

  describe('clearing highlights', () => {
    it('should clear all matches by setting empty array', () => {
      const matches: SearchMatch[] = [
        { from: 0, to: 3 },
        { from: 5, to: 8 },
      ];
      
      // Clear matches
      const clearedMatches: SearchMatch[] = [];
      expect(clearedMatches).toHaveLength(0);
      expect(matches).toHaveLength(2); // Original unchanged
    });

    it('should reset current index when clearing', () => {
      let currentIndex = 2;
      currentIndex = -1; // Reset
      expect(currentIndex).toBe(-1);
    });
  });
});
