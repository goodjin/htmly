/**
 * useLazyExtensionLoader Tests
 * 
 * Tests for lazy loading of non-critical extensions:
 * - VAL-PERF-005: Lazy extension loading
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { useLazyExtensionLoader } from './useLazyExtensionLoader';
import type { Editor } from '@tiptap/vue-3';

// Mock editor for testing
const createMockEditor = (): Editor => {
  return {
    isActive: vi.fn().mockReturnValue(false),
    getHTML: vi.fn().mockReturnValue('<p>Test content</p>'),
  } as unknown as Editor;
};

describe('useLazyExtensionLoader', () => {
  describe('Initial State', () => {
    it('initializes with all extensions unloaded', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.extensions.value.get('footnote')?.loaded).toBe(false);
      expect(loader.extensions.value.get('embed')?.loaded).toBe(false);
      expect(loader.extensions.value.get('linkPreview')?.loaded).toBe(false);
    });

    it('initializes with no extensions loading', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.isLoading.value).toBe(false);
    });

    it('reports zero loading progress initially', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.loadingProgress.value.loaded).toBe(0);
      expect(loader.loadingProgress.value.total).toBe(3);
    });
  });

  describe('Extension Status Checks', () => {
    it('isLoaded returns false for unloaded extensions', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.isLoaded('footnote')).toBe(false);
      expect(loader.isLoaded('embed')).toBe(false);
      expect(loader.isLoaded('linkPreview')).toBe(false);
    });

    it('isExtensionLoading returns false initially', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.isExtensionLoading('footnote')).toBe(false);
      expect(loader.isExtensionLoading('embed')).toBe(false);
      expect(loader.isExtensionLoading('linkPreview')).toBe(false);
    });

    it('getError returns null for unloaded extensions', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.getError('footnote')).toBeNull();
      expect(loader.getError('embed')).toBeNull();
      expect(loader.getError('linkPreview')).toBeNull();
    });
  });

  describe('Extension Detection', () => {
    it('detects footnote patterns', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('Text with [^1] footnote')).toBe('footnote');
    });

    it('detects YouTube embed URLs', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('Check this video: https://youtube.com/watch?v=123')).toBe('embed');
    });

    it('detects Vimeo embed URLs', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('Video at https://vimeo.com/123456789')).toBe('embed');
    });

    it('detects CodePen embed URLs', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('See this demo https://codepen.io/user/pen/demo')).toBe('embed');
    });

    it('detects generic URLs for link preview', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('Link: https://example.com/page')).toBe('linkPreview');
    });

    it('returns null for plain text', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('Just plain text without any special content')).toBeNull();
    });

    it('prefers footnote over link preview when both match', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      // Footnote pattern should be detected first
      expect(loader.detectExtensionUse('Footnote [^1] and link https://example.com')).toBe('footnote');
    });
  });

  describe('Extension Loading', () => {
    it('preloadAll returns a promise', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      const result = loader.preloadAll();
      expect(result).toBeInstanceOf(Promise);
    });

    it('getExtension returns null for unloaded extensions', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.getExtension('footnote')).toBeNull();
      expect(loader.getExtension('embed')).toBeNull();
      expect(loader.getExtension('linkPreview')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles null editor', () => {
      const loader = useLazyExtensionLoader(() => null);
      
      expect(loader.extensions.value.size).toBe(3);
      expect(loader.isLoading.value).toBe(false);
    });

    it('handles undefined editor', () => {
      const loader = useLazyExtensionLoader(() => undefined);
      
      expect(loader.extensions.value.size).toBe(3);
      expect(loader.isLoading.value).toBe(false);
    });

    it('detects multiple URLs correctly', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      // Multiple URLs should still trigger link preview
      const content = 'Links: https://a.com https://b.com https://c.com';
      expect(loader.detectExtensionUse(content)).toBe('linkPreview');
    });

    it('case insensitive URL detection', () => {
      const mockEditor = createMockEditor();
      const loader = useLazyExtensionLoader(() => mockEditor);
      
      expect(loader.detectExtensionUse('HTTPS://YOUTUBE.COM/watch')).toBe('embed');
      expect(loader.detectExtensionUse('HTTP://VIMEO.COM/123')).toBe('embed');
    });
  });
});
