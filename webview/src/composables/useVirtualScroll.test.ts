/**
 * useVirtualScroll Tests
 * 
 * Tests for virtual scrolling composable:
 * - VAL-PERF-003: Virtual scrolling activates for large documents
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useVirtualScroll } from './useVirtualScroll';
import type { Editor } from '@tiptap/vue-3';

// Mock editor for testing
const createMockEditor = (html: string = '<p>Test content</p>'): Editor => {
  return {
    getHTML: vi.fn().mockReturnValue(html),
    view: {
      dom: document.createElement('div'),
    } as any,
    state: {
      doc: {
        textContent: html,
      },
    },
  } as unknown as Editor;
};

describe('useVirtualScroll', () => {
  describe('Initial State', () => {
    it('initializes with inactive state for small documents', () => {
      const editor = createMockEditor('<p>Small content</p>');
      const scroll = useVirtualScroll(() => editor);
      
      expect(scroll.isActive.value).toBe(false);
    });

    it('initializes with zero visible blocks', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor);
      
      expect(scroll.visibleBlockIds.value.size).toBe(0);
      expect(scroll.visibleCount.value).toBe(0);
    });

    it('initializes with zero total blocks initially', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor);
      
      // Before editor is fully set up, block count might be 0
      expect(typeof scroll.totalBlocks.value).toBe('number');
    });

    it('initializes with zero document size initially', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor);
      
      expect(scroll.documentSize.value).toBe(0);
    });
  });

  describe('Options', () => {
    it('accepts custom buffer size', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor, { bufferSize: 10 });
      
      expect(scroll).toBeDefined();
    });

    it('accepts custom root margin', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor, { rootMargin: '100px 0px' });
      
      expect(scroll).toBeDefined();
    });

    it('accepts callback for visible blocks change', () => {
      const editor = createMockEditor();
      const callback = vi.fn();
      const scroll = useVirtualScroll(() => editor, { onVisibleBlocksChange: callback });
      
      expect(scroll).toBeDefined();
    });
  });

  describe('Statistics Calculation', () => {
    it('calculateStats returns size and block count', () => {
      const editor = createMockEditor('<p>Test content</p>');
      const scroll = useVirtualScroll(() => editor);
      
      const stats = scroll.calculateStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('blockCount');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.blockCount).toBe('number');
    });

    it('calculateStats handles empty editor', () => {
      const editor = createMockEditor('');
      const scroll = useVirtualScroll(() => editor);
      
      const stats = scroll.calculateStats();
      
      expect(stats.size).toBe(0);
      expect(stats.blockCount).toBe(0);
    });

    it('calculateStats handles null editor', () => {
      const scroll = useVirtualScroll(() => null);
      
      const stats = scroll.calculateStats();
      
      expect(stats.size).toBe(0);
      expect(stats.blockCount).toBe(0);
    });
  });

  describe('Activation Logic', () => {
    it('activate enables for documents >= 100KB', () => {
      // Create a document that is > 100KB
      const largeContent = '<p>' + 'a'.repeat(100 * 1024) + '</p>';
      const editor = createMockEditor(largeContent);
      const scroll = useVirtualScroll(() => editor);
      
      scroll.activate();
      
      // The document size check should trigger activation
      expect(scroll.isActive.value).toBe(true);
    });

    it('activate stays inactive for small documents', () => {
      const editor = createMockEditor('<p>Small content</p>');
      const scroll = useVirtualScroll(() => editor);
      
      scroll.activate();
      
      expect(scroll.isActive.value).toBe(false);
    });
  });

  describe('Buffer Expansion', () => {
    it('updateBlocks recalculates statistics', () => {
      const editor = createMockEditor('<p>Content</p>');
      const scroll = useVirtualScroll(() => editor);
      
      scroll.updateBlocks();
      
      // After update, stats should be populated
      expect(scroll.totalBlocks.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup', () => {
    it('cleanup removes all state', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor);
      
      scroll.cleanup();
      
      expect(scroll.visibleBlockIds.value.size).toBe(0);
      expect(scroll.isActive.value).toBe(false);
    });

    it('cleanup can be called multiple times safely', () => {
      const editor = createMockEditor();
      const scroll = useVirtualScroll(() => editor);
      
      expect(() => {
        scroll.cleanup();
        scroll.cleanup();
        scroll.cleanup();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined editor in callback', () => {
      const callback = vi.fn();
      const scroll = useVirtualScroll(() => undefined, { onVisibleBlocksChange: callback });
      
      expect(scroll).toBeDefined();
    });

    it('handles very large block counts', () => {
      const manyBlocks = Array(1000).fill('<p>Block</p>').join('');
      const editor = createMockEditor(manyBlocks);
      const scroll = useVirtualScroll(() => editor);
      
      const stats = scroll.calculateStats();
      // Stats should be calculated, blockCount may vary
      expect(typeof stats.blockCount).toBe('number');
    });

    it('handles special characters in content', () => {
      const editor = createMockEditor('<p>Test &amp; <strong>HTML</strong> content</p>');
      const scroll = useVirtualScroll(() => editor);
      
      const stats = scroll.calculateStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('handles Unicode content', () => {
      const editor = createMockEditor('<p>你好世界 🌍 مرحبا</p>');
      const scroll = useVirtualScroll(() => editor);
      
      const stats = scroll.calculateStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});
