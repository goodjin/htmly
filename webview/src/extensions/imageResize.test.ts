import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageResizeExtension, imageResizeKey } from './imageResize';

// Mock the tippy dependency for BubbleMenu
vi.mock('tippy.js', () => ({ default: vi.fn() }));

describe('imageResize extension', () => {
  describe('ImageResizeExtension', () => {
    it('creates an extension with the correct name', () => {
      const extension = ImageResizeExtension;
      expect(extension.name).toBe('imageResize');
    });

    it('has static name property', () => {
      expect(ImageResizeExtension.name).toBe('imageResize');
    });
  });

  describe('imageResizeKey', () => {
    it('is defined', () => {
      expect(imageResizeKey).toBeDefined();
    });
  });
});
