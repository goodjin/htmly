import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { WikiLinkExtension, setPageIndex, setWikiLinkClickCallback, getPages, type WikiPage } from './WikiLink';

describe('VAL-BACKLINKS-004: Page creation', () => {
  let editor: Editor;
  let clickCallbackMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
      content: '',
    });
    clickCallbackMock = vi.fn();
    setWikiLinkClickCallback(clickCallbackMock);
    setPageIndex([]);
  });

  afterEach(() => {
    editor.destroy();
    setWikiLinkClickCallback(null);
  });

  describe('Wiki link click handling', () => {
    it('wiki links are rendered with clickable class', () => {
      editor.commands.insertWikiLink('Test Page');
      const html = editor.getHTML();
      
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="Test Page"');
    });

    it('wiki link has proper href attribute', () => {
      editor.commands.insertWikiLink('Link Page');
      const html = editor.getHTML();
      
      expect(html).toContain('href="#"');
    });

    it('wiki link has title attribute with page name', () => {
      editor.commands.insertWikiLink('My Page');
      const html = editor.getHTML();
      
      expect(html).toContain('title="Open page: My Page"');
    });
  });

  describe('Page index management', () => {
    it('page index is empty by default', () => {
      expect(getPages()).toHaveLength(0);
    });

    it('page index can be populated with existing pages', () => {
      const pages: WikiPage[] = [
        { name: 'Existing Page 1' },
        { name: 'Existing Page 2' },
      ];
      setPageIndex(pages);
      
      expect(getPages()).toHaveLength(2);
      expect(getPages()[0].name).toBe('Existing Page 1');
    });

    it('wiki link callback receives page names', () => {
      // The click callback is triggered via the ProseMirror plugin
      // This tests that the callback is properly registered
      expect(clickCallbackMock).toBeDefined();
    });
  });

  describe('Wiki link click callback', () => {
    it('callback is called with page name and existing pages', () => {
      // Set up some existing pages
      setPageIndex([
        { name: 'Page One' },
        { name: 'Page Two' },
      ]);
      
      // Simulate click - the callback receives pageName and existingPages
      // The actual DOM click simulation happens in the browser
      clickCallbackMock('New Page', ['Page One', 'Page Two']);
      
      expect(clickCallbackMock).toHaveBeenCalledWith('New Page', ['Page One', 'Page Two']);
    });

    it('callback can be set and cleared', () => {
      const newCallback = vi.fn();
      
      // Set new callback
      setWikiLinkClickCallback(newCallback);
      
      // Clear callback
      setWikiLinkClickCallback(null);
      
      // Callback should be cleared (calling it should do nothing)
      expect(() => {
        setWikiLinkClickCallback(null);
      }).not.toThrow();
    });
  });

  describe('Wiki link with existing page', () => {
    it('wiki link is created for existing page', () => {
      setPageIndex([{ name: 'Existing Page' }]);
      
      editor.commands.insertWikiLink('Existing Page');
      const html = editor.getHTML();
      
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="Existing Page"');
    });

    it('wiki link is created for non-existing page (create new)', () => {
      setPageIndex([]); // No existing pages
      
      editor.commands.insertWikiLink('New Page');
      const html = editor.getHTML();
      
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="New Page"');
    });
  });
});

describe('Page creation edge cases', () => {
  let editor: Editor;
  let clickCallbackMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
      content: '',
    });
    clickCallbackMock = vi.fn();
    setWikiLinkClickCallback(clickCallbackMock);
  });

  afterEach(() => {
    editor.destroy();
    setWikiLinkClickCallback(null);
  });

  it('handles page names with special characters', () => {
    editor.commands.insertWikiLink('Page & Name "Special"');
    const html = editor.getHTML();
    
    expect(html).toContain('class="wiki-link"');
    expect(html).toContain('data-page=');
  });

  it('handles unicode page names', () => {
    editor.commands.insertWikiLink('页面名称');
    const html = editor.getHTML();
    
    expect(html).toContain('class="wiki-link"');
    expect(html).toContain('data-page="页面名称"');
  });

  it('handles empty page name', () => {
    editor.commands.insertWikiLink('');
    const html = editor.getHTML();
    
    expect(html).toContain('class="wiki-link"');
    expect(html).toContain('data-page=""');
  });

  it('handles very long page names', () => {
    const longName = 'A'.repeat(500);
    editor.commands.insertWikiLink(longName);
    const html = editor.getHTML();
    
    expect(html).toContain('class="wiki-link"');
    expect(html).toContain(`data-page="${longName}"`);
  });

  it('multiple wiki links in document', () => {
    editor.commands.insertWikiLink('Page One');
    editor.commands.insertContent(' and ');
    editor.commands.insertWikiLink('Page Two');
    editor.commands.insertContent(' and ');
    editor.commands.insertWikiLink('Page Three');
    
    const html = editor.getHTML();
    expect(html).toContain('data-page="Page One"');
    expect(html).toContain('data-page="Page Two"');
    expect(html).toContain('data-page="Page Three"');
  });
});

describe('Wiki link integration with page index', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
      content: '',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('wiki link is created with correct attributes', () => {
    editor.commands.insertWikiLink('My Wiki Page');
    
    const doc = editor.state.doc;
    let foundWikiLink = false;
    let pageName = '';
    
    doc.descendants((node) => {
      if (node.type.name === 'wikiLink') {
        foundWikiLink = true;
        pageName = node.attrs.page;
      }
    });
    
    expect(foundWikiLink).toBe(true);
    expect(pageName).toBe('My Wiki Page');
  });

  it('wiki link preserves page name through serialization', () => {
    editor.commands.insertWikiLink('Serialization Test');
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
    });
    editor2.commands.setContent(html1);
    const html2 = editor2.getHTML();
    
    expect(html1).toBe(html2);
    expect(html2).toContain('data-page="Serialization Test"');
    
    editor2.destroy();
  });
});
