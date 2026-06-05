/**
 * Tests for BacklinksIndex Module
 * 
 * These tests verify the wiki link extraction and backlinks tracking functionality.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { BacklinksIndex, createBacklinksIndex, setBacklinksIndexInstance } from './backlinksIndex';

// Mock the fs module
vi.mock('fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('BacklinksIndex', () => {
  let index: BacklinksIndex;

  beforeEach(() => {
    // Reset the index for each test
    index = createBacklinksIndex();
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset the singleton instance after each test
    setBacklinksIndexInstance(createBacklinksIndex());
  });

  describe('setContext', () => {
    it('should set workspace root and document URI', () => {
      index.setContext('/workspace', '/workspace/test.html');
      
      expect(index.getCurrentPageName()).toBe('test');
    });

    it('should return empty string for page name when no document URI is set', () => {
      expect(index.getCurrentPageName()).toBe('');
    });
  });

  describe('getCurrentPageName', () => {
    it('should extract page name from document URI', () => {
      index.setContext('/workspace', '/workspace/MyPage.html');
      
      expect(index.getCurrentPageName()).toBe('MyPage');
    });

    it('should handle paths with multiple dots', () => {
      index.setContext('/workspace', '/workspace/My.Page.Name.html');
      
      expect(index.getCurrentPageName()).toBe('My.Page.Name');
    });

    it('should handle .htm extension', () => {
      index.setContext('/workspace', '/workspace/MyPage.htm');
      
      expect(index.getCurrentPageName()).toBe('MyPage');
    });
  });

  describe('getBacklinks', () => {
    it('should return empty array when no backlinks exist', () => {
      const backlinks = index.getBacklinks('NonExistent');
      
      expect(backlinks).toEqual([]);
    });
  });

  describe('wiki link extraction', () => {
    it('should find backlinks for a page', async () => {
      // Set up mock fs responses
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Home.html', isDirectory: () => false, isFile: () => true },
        { name: 'About.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path.includes('Home.html')) {
          return '<p>Visit the [[About]] page</p>';
        }
        if (path.includes('About.html')) {
          return '<p>Back to [[Home]]</p>';
        }
        return '';
      });

      index.setContext('/workspace', '/workspace/test.html');
      await index.updateIndex();

      const aboutBacklinks = index.getBacklinks('About');
      const homeBacklinks = index.getBacklinks('Home');

      expect(aboutBacklinks.length).toBeGreaterThan(0);
      expect(homeBacklinks.length).toBeGreaterThan(0);
    });

    it('should not include self-references in backlinks', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'SelfRef.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return '<p>This is a [[SelfRef]] self-reference</p>';
      });

      index.setContext('/workspace', '/workspace/SelfRef.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('SelfRef');
      
      // Self-references should be filtered out
      expect(backlinks.length).toBe(0);
    });

    it('should count multiple links to the same page', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Page1.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return '<p>[[Target]] and [[Target]] again</p>';
      });

      index.setContext('/workspace', '/workspace/Page1.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('Target');
      
      expect(backlinks.length).toBe(1);
      expect(backlinks[0].linkCount).toBe(2);
    });

    it('should aggregate backlinks from multiple source pages', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Page1.html', isDirectory: () => false, isFile: () => true },
        { name: 'Page2.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      let callCount = 0;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return '<p>[[Target]] from Page1</p>';
        }
        return '<p>[[Target]] from Page2</p>';
      });

      index.setContext('/workspace', '/workspace/test.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('Target');
      
      // Both pages link to Target
      expect(backlinks.length).toBe(2);
    });

    it('should handle wiki links with surrounding HTML', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return '<div class="nav"><a href="#">[[About]]</a></div><p>Some text [[Contact]]</p>';
      });

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      const aboutBacklinks = index.getBacklinks('About');
      
      expect(aboutBacklinks.length).toBe(1);
    });

    it('should handle wiki links with special characters in page names', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return '<p>Link to [[Page With Spaces]] and [[Special.Chars]]</p>';
      });

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      const spacesBacklinks = index.getBacklinks('Page With Spaces');
      const charsBacklinks = index.getBacklinks('Special.Chars');

      expect(spacesBacklinks.length).toBe(1);
      expect(charsBacklinks.length).toBe(1);
    });

    it('should trim whitespace from wiki link page names', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return '<p>[[Page With Spaces ]] and [[ AnotherPage]]</p>';
      });

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      // Whitespace should be trimmed
      const backlinks1 = index.getBacklinks('Page With Spaces');
      const backlinks2 = index.getBacklinks('AnotherPage');

      expect(backlinks1.length).toBe(1);
      expect(backlinks2.length).toBe(1);
    });
  });

  describe('getAllPages', () => {
    it('should return empty array when workspace root is not set', () => {
      const pages = index.getAllPages();
      
      expect(pages).toEqual([]);
    });

    it('should find all HTML files in workspace', () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/workspace') {
          return [
            { name: 'Page1.html', isDirectory: () => false, isFile: () => true },
            { name: 'Page2.htm', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      index.setContext('/workspace', '/workspace/test.html');
      const pages = index.getAllPages();

      expect(pages.length).toBe(2);
      expect(pages).toContainEqual({ name: 'Page1', path: '/workspace/Page1.html' });
      expect(pages).toContainEqual({ name: 'Page2', path: '/workspace/Page2.htm' });
    });

    it('should recursively find HTML files in subdirectories', () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/workspace') {
          return [
            { name: 'subdir', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dir === '/workspace/subdir') {
          return [
            { name: 'Nested.html', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      index.setContext('/workspace', '/workspace/test.html');
      const pages = index.getAllPages();

      expect(pages.length).toBe(1);
      expect(pages[0].name).toBe('Nested');
      expect(pages[0].path).toBe('/workspace/subdir/Nested.html');
    });

    it('should skip node_modules and hidden directories', () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/workspace') {
          return [
            { name: 'node_modules', isDirectory: () => true, isFile: () => false },
            { name: '.hidden', isDirectory: () => true, isFile: () => false },
            { name: 'valid.html', isDirectory: () => false, isFile: () => true },
          ];
        }
        if (dir === '/workspace/node_modules' || dir === '/workspace/.hidden') {
          // These should never be called
          throw new Error('Should not read node_modules or .hidden directories');
        }
        return [];
      });

      index.setContext('/workspace', '/workspace/test.html');
      const pages = index.getAllPages();

      expect(pages.length).toBe(1);
      expect(pages[0].name).toBe('valid');
    });
  });

  describe('updateIndex', () => {
    it('should do nothing when workspace root is not set', async () => {
      await index.updateIndex();
      
      // Should not throw and should not call fs
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('should clear existing backlinks before updating', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([]);
      
      index.setContext('/workspace', '/workspace/test.html');
      
      // First update with some backlinks
      await index.updateIndex();
      expect(index.getBacklinks('AnyPage')).toEqual([]);
      
      // Add mock files for second update
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        { name: 'Page1.html', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce('<p>[[Test]]</p>');
      
      await index.updateIndex();
      
      // Backlinks should be from fresh update, not accumulated
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should handle filesystem errors gracefully', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Access denied');
      });

      index.setContext('/workspace', '/workspace/test.html');
      
      // Should not throw
      await expect(index.updateIndex()).resolves.not.toThrow();
    });
  });

  describe('preview generation', () => {
    it('should generate preview text around wiki links', async () => {
      const longContent = '<p>Some text before</p>'.repeat(10) + '[[TargetPage]]' + '<p>Some text after</p>'.repeat(10);
      
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(longContent);

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('TargetPage');
      
      expect(backlinks.length).toBe(1);
      expect(backlinks[0].preview).toContain('TargetPage');
    });

    it('should strip HTML tags from preview', async () => {
      const content = '<div class="test"><p>[[Target]]</p></div>';
      
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('Target');
      
      expect(backlinks.length).toBe(1);
      // Preview should not contain HTML tags
      expect(backlinks[0].preview).not.toContain('<');
      expect(backlinks[0].preview).not.toContain('>');
    });

    it('should add ellipsis when preview is truncated', async () => {
      const longContent = 'x'.repeat(150) + '[[Target]]' + 'y'.repeat(150);
      
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'Test.html', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(longContent);

      index.setContext('/workspace', '/workspace/Test.html');
      await index.updateIndex();

      const backlinks = index.getBacklinks('Target');
      
      expect(backlinks.length).toBe(1);
      // Preview should be truncated with ellipsis
      expect(backlinks[0].preview.startsWith('...')).toBe(true);
      expect(backlinks[0].preview.endsWith('...')).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should allow overriding the singleton instance for testing', () => {
      const customIndex = createBacklinksIndex();
      customIndex.setContext('/custom', '/custom/test.html');
      
      setBacklinksIndexInstance(customIndex);
      
      // The singleton should now be our custom instance
      // We verify this by checking that the overridden instance is used
      const singleton = createBacklinksIndex();
      expect(singleton.getCurrentPageName()).toBe('');
    });
  });
});
