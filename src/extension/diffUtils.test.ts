/**
 * Tests for Diff Utilities Module
 */
import { describe, it, expect } from 'vitest';
import {
  computeLineDiff,
  computeWordDiff,
  computeCharDiff,
  stripHtmlTags,
  areStringsEqual,
} from './diffUtils';

describe('diffUtils', () => {
  describe('computeLineDiff', () => {
    it('returns empty diff for identical texts', () => {
      const text = 'Hello\nWorld\nTest';
      const result = computeLineDiff(text, text);
      
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBe(3);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('unchanged');
    });
    
    it('detects added lines', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = 'Line 1\nLine 2\nLine 3';
      
      const result = computeLineDiff(oldText, newText);
      
      expect(result.stats.added).toBe(1); // Line 3 added
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBe(2); // Line 1 and Line 2
      
      // Find the added change
      const addedChange = result.changes.find(c => c.type === 'added');
      expect(addedChange).toBeDefined();
      expect(addedChange?.value).toContain('Line 3');
    });
    
    it('detects removed lines', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 3';
      
      const result = computeLineDiff(oldText, newText);
      
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(1); // Line 2 removed
      expect(result.stats.unchanged).toBe(2); // Line 1 and Line 3
      
      // Find the removed change
      const removedChange = result.changes.find(c => c.type === 'removed');
      expect(removedChange).toBeDefined();
      expect(removedChange?.value).toContain('Line 2');
    });
    
    it('detects both added and removed lines', () => {
      const oldText = 'Line A\nLine B\nLine C';
      const newText = 'Line A\nLine X\nLine C';
      
      const result = computeLineDiff(oldText, newText);
      
      // diffLines works at token level - Line B replaced with Line X
      expect(result.stats.added).toBe(1); // Line X
      expect(result.stats.removed).toBe(1); // Line B
      // Note: unchanged may be 2 or 3 depending on trailing newline handling
      expect(result.stats.unchanged).toBeGreaterThanOrEqual(2);
    });
    
    it('handles empty old text', () => {
      const oldText = '';
      const newText = 'New content\nLine 2';
      
      const result = computeLineDiff(oldText, newText);
      
      expect(result.stats.added).toBe(2);
      expect(result.stats.removed).toBe(0);
    });
    
    it('handles empty new text', () => {
      const oldText = 'Old content\nLine 2';
      const newText = '';
      
      const result = computeLineDiff(oldText, newText);
      
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(2);
    });
    
    it('handles HTML content', () => {
      const oldText = '<p>Hello</p>\n<div>World</div>';
      const newText = '<p>Hello</p>\n<div>Changed</div>';
      
      const result = computeLineDiff(oldText, newText);
      
      expect(result.stats.added).toBe(1);
      expect(result.stats.removed).toBe(1);
      // Note: unchanged may be 1 or 2 depending on trailing newline handling
      expect(result.stats.unchanged).toBeGreaterThanOrEqual(1);
    });
    
    it('tracks line numbers correctly', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 2\nLine 3\nLine 4';
      
      const result = computeLineDiff(oldText, newText);
      
      // Find unchanged and added changes
      const unchanged = result.changes.find(c => c.type === 'unchanged');
      const added = result.changes.find(c => c.type === 'added');
      
      expect(unchanged?.oldLineNumber).toBe(1);
      expect(unchanged?.newLineNumber).toBe(1);
      expect(added?.newLineNumber).toBe(4);
    });
  });
  
  describe('computeWordDiff', () => {
    it('detects added words', () => {
      const oldText = 'Hello World';
      const newText = 'Hello Beautiful World';
      
      const result = computeWordDiff(oldText, newText);
      
      const addedWords = result.filter(c => c.type === 'added');
      expect(addedWords.length).toBeGreaterThan(0);
      expect(addedWords.map(c => c.value.trim())).toContain('Beautiful');
    });
    
    it('detects removed words', () => {
      const oldText = 'Hello Beautiful World';
      const newText = 'Hello World';
      
      const result = computeWordDiff(oldText, newText);
      
      const removedWords = result.filter(c => c.type === 'removed');
      expect(removedWords.length).toBeGreaterThan(0);
      expect(removedWords.map(c => c.value.trim())).toContain('Beautiful');
    });
    
    it('returns unchanged for identical texts', () => {
      const text = 'Hello World';
      const result = computeWordDiff(text, text);
      
      const allUnchanged = result.every(c => c.type === 'unchanged');
      expect(allUnchanged).toBe(true);
    });
  });
  
  describe('computeCharDiff', () => {
    it('detects character changes', () => {
      const oldText = 'Hello';
      const newText = 'Helo';
      
      const result = computeCharDiff(oldText, newText);
      
      const removedChars = result.filter(c => c.type === 'removed');
      expect(removedChars.length).toBeGreaterThan(0);
    });
    
    it('detects character additions', () => {
      const oldText = 'Helo';
      const newText = 'Hello';
      
      const result = computeCharDiff(oldText, newText);
      
      const addedChars = result.filter(c => c.type === 'added');
      expect(addedChars.length).toBeGreaterThan(0);
    });
  });
  
  describe('stripHtmlTags', () => {
    it('removes HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = stripHtmlTags(html);
      
      expect(result).toBe('Hello World');
    });
    
    it('decodes HTML entities', () => {
      const html = 'Hello &amp; World &lt;div&gt;';
      const result = stripHtmlTags(html);
      
      expect(result).toBe('Hello & World <div>');
    });
    
    it('collapses whitespace', () => {
      const html = 'Hello    World\n\nTest';
      const result = stripHtmlTags(html);
      
      expect(result).toBe('Hello World Test');
    });
    
    it('handles empty string', () => {
      const result = stripHtmlTags('');
      expect(result).toBe('');
    });
    
    it('handles text without HTML', () => {
      const text = 'Plain text without tags';
      const result = stripHtmlTags(text);
      
      expect(result).toBe(text);
    });
  });
  
  describe('areStringsEqual', () => {
    it('returns true for two null strings', () => {
      expect(areStringsEqual(null, null)).toBe(true);
    });
    
    it('returns false when one is null', () => {
      expect(areStringsEqual(null, 'text')).toBe(false);
      expect(areStringsEqual('text', null)).toBe(false);
    });
    
    it('returns true for identical strings', () => {
      expect(areStringsEqual('hello', 'hello')).toBe(true);
    });
    
    it('returns false for different strings', () => {
      expect(areStringsEqual('hello', 'world')).toBe(false);
    });
    
    it('handles empty strings', () => {
      expect(areStringsEqual('', '')).toBe(true);
      expect(areStringsEqual('', 'text')).toBe(false);
    });
  });
});
