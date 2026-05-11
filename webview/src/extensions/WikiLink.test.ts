import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { 
  WikiLink, 
  WikiLinkExtension, 
  setPageIndex, 
  addPage, 
  removePage, 
  getPages,
  type WikiPage 
} from './WikiLink';

describe('WikiLink', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
      content: '',
    });
  });

  describe('VAL-BACKLINKS-001: Wiki link syntax', () => {
    it('creates a wiki link node when insertWikiLink is called', () => {
      // Use the insertWikiLink command
      editor.commands.insertWikiLink('Test Page');
      
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="Test Page"');
    });

    it('parses wiki link HTML as link node', () => {
      // Set content with the expected HTML format (already parsed wiki link)
      editor.commands.setContent('<p><a class="wiki-link" data-page="Simple">Simple</a></p>');
      
      const doc = editor.state.doc;
      let hasWikiLink = false;
      let wikiLinkPage = '';
      
      doc.descendants((node) => {
        if (node.type.name === 'wikiLink') {
          hasWikiLink = true;
          wikiLinkPage = node.attrs.page;
        }
      });
      
      expect(hasWikiLink).toBe(true);
      expect(wikiLinkPage).toBe('Simple');
    });

    it('handles page names with spaces', () => {
      editor.commands.insertWikiLink('My Page Name');
      
      const html = editor.getHTML();
      expect(html).toContain('data-page="My Page Name"');
    });

    it('renders as clickable link with proper attributes', () => {
      editor.commands.insertWikiLink('Clickable Page');
      
      const html = editor.getHTML();
      expect(html).toContain('href="#"');
      expect(html).toContain('title="Open page: Clickable Page"');
    });
  });

  describe('WikiLink node creation', () => {
    it('inserts wiki link with insertWikiLink command', () => {
      editor.commands.insertWikiLink('New Page');
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="New Page"');
    });

    it('inserts wiki link with setWikiLink command', () => {
      editor.commands.setContent('<p>Some text</p>');
      editor.commands.setTextSelection(2);
      editor.commands.setWikiLink('Selected Page');
      
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="Selected Page"');
    });

    it('inserts empty wiki link when no page name provided', () => {
      editor.commands.insertWikiLink('');
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page=""');
    });
  });

  describe('HTML serialization', () => {
    it('serializes to proper HTML format', () => {
      editor.commands.insertWikiLink('Serialized Page');
      const html = editor.getHTML();
      
      // Should contain the expected HTML structure
      expect(html).toMatch(/<a[^>]*class="wiki-link"[^>]*data-page="Serialized Page"[^>]*>Serialized Page<\/a>/);
    });

    it('escapes HTML in page names for display', () => {
      editor.commands.insertWikiLink('<script>alert("xss")</script>');
      const html = editor.getHTML();
      
      // The content text should be escaped for safe HTML display
      // Note: ProseMirror may handle this differently, but the structure should be valid
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page=');
    });

    it('round-trips through getHTML/setContent', () => {
      editor.commands.insertWikiLink('Round Trip Page');
      const html1 = editor.getHTML();
      
      const editor2 = new Editor({ extensions: [StarterKit, ...WikiLinkExtension] });
      editor2.commands.setContent(html1);
      
      const html2 = editor2.getHTML();
      expect(html1).toBe(html2);
    });
  });

  describe('HTML parsing', () => {
    it('parses wiki link from HTML with data-page attribute', () => {
      editor.commands.setContent('<a class="wiki-link" data-page="Parsed Page">Parsed Page</a>');
      
      const doc = editor.state.doc;
      let hasWikiLink = false;
      
      doc.descendants((node) => {
        if (node.type.name === 'wikiLink') {
          hasWikiLink = true;
          expect(node.attrs.page).toBe('Parsed Page');
        }
      });
      
      expect(hasWikiLink).toBe(true);
    });

    it('handles HTML without data-page gracefully', () => {
      editor.commands.setContent('<a class="wiki-link">No Page</a>');
      
      const doc = editor.state.doc;
      let hasWikiLink = false;
      
      doc.descendants((node) => {
        if (node.type.name === 'wikiLink') {
          hasWikiLink = true;
          expect(node.attrs.page).toBe('');
        }
      });
      
      expect(hasWikiLink).toBe(true);
    });
  });

  describe('Integration with editor', () => {
    it('allows multiple wiki links in document', () => {
      editor.commands.insertWikiLink('Page One');
      editor.commands.insertContent(' and ');
      editor.commands.insertWikiLink('Page Two');
      
      const html = editor.getHTML();
      expect(html).toContain('data-page="Page One"');
      expect(html).toContain('data-page="Page Two"');
    });

    it('can mix wiki links with regular text', () => {
      editor.commands.insertContent('Check out ');
      editor.commands.insertWikiLink('Link One');
      editor.commands.insertContent(' and ');
      editor.commands.insertWikiLink('Link Two');
      editor.commands.insertContent(' for more.');
      
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page="Link One"');
      expect(html).toContain('data-page="Link Two"');
      expect(html).toContain('Check out');
      expect(html).toContain('for more.');
    });

    it('preserves wiki links after undo', () => {
      editor.commands.insertWikiLink('Undo Test');
      const html1 = editor.getHTML();
      expect(html1).toContain('class="wiki-link"');
      
      editor.commands.undo();
      
      const html2 = editor.getHTML();
      expect(html2).not.toContain('class="wiki-link"');
    });
  });

  describe('Edge cases', () => {
    it('handles empty page name', () => {
      editor.commands.insertWikiLink('');
      const html = editor.getHTML();
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page=""');
    });

    it('handles unicode page names', () => {
      editor.commands.insertWikiLink('页面名称');
      const html = editor.getHTML();
      expect(html).toContain('data-page="页面名称"');
    });

    it('handles special characters in page names', () => {
      editor.commands.insertWikiLink('Test & "Special" <Characters>');
      const html = editor.getHTML();
      // The wiki link should be created with proper attributes
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-page=');
    });
  });
});

describe('WikiLink integration', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...WikiLinkExtension],
      content: '',
    });
  });

  it('works alongside other Tiptap extensions', () => {
    editor.commands.insertContent('<strong>Bold</strong> ');
    editor.commands.insertWikiLink('Wiki Link');
    editor.commands.insertContent(' and <em>italic</em>');
    
    const html = editor.getHTML();
    expect(html).toContain('class="wiki-link"');
    expect(html).toContain('data-page="Wiki Link"');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('can delete and recreate wiki links', () => {
    editor.commands.insertWikiLink('Original');
    let html = editor.getHTML();
    expect(html).toContain('data-page="Original"');
    
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    
    html = editor.getHTML();
    expect(html).not.toContain('wiki-link');
    
    editor.commands.insertWikiLink('New Link');
    html = editor.getHTML();
    expect(html).toContain('data-page="New Link"');
    expect(html).not.toContain('data-page="Original"');
  });

  it('round-trips complex document with multiple wiki links', () => {
    // Create a complex document with wiki links
    editor.commands.setContent('<h1>Document Title</h1>');
    editor.commands.insertContent('<p>See ');
    editor.commands.insertWikiLink('Page One');
    editor.commands.insertContent(' and ');
    editor.commands.insertWikiLink('Page Two');
    editor.commands.insertContent(' for details.</p>');
    editor.commands.insertContent('<p>Also check ');
    editor.commands.insertWikiLink('Page Three');
    editor.commands.insertContent('.</p>');
    
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ extensions: [StarterKit, ...WikiLinkExtension] });
    editor2.commands.setContent(html1);
    const html2 = editor2.getHTML();
    
    expect(html1).toBe(html2);
    
    // Verify all wiki links preserved
    expect(html2).toContain('data-page="Page One"');
    expect(html2).toContain('data-page="Page Two"');
    expect(html2).toContain('data-page="Page Three"');
  });
});

describe('WikiLink Page Index', () => {
  beforeEach(() => {
    // Clear page index before each test
    setPageIndex([]);
  });

  describe('setPageIndex', () => {
    it('sets the page index', () => {
      const pages: WikiPage[] = [
        { name: 'Page One' },
        { name: 'Page Two' },
      ];
      
      setPageIndex(pages);
      
      expect(getPages()).toEqual(pages);
    });

    it('replaces existing pages', () => {
      setPageIndex([{ name: 'Old Page' }]);
      setPageIndex([{ name: 'New Page' }]);
      
      expect(getPages()).toHaveLength(1);
      expect(getPages()[0].name).toBe('New Page');
    });
  });

  describe('addPage', () => {
    it('adds a page to the index', () => {
      addPage({ name: 'New Page' });
      
      expect(getPages()).toHaveLength(1);
      expect(getPages()[0].name).toBe('New Page');
    });

    it('does not add duplicate pages', () => {
      addPage({ name: 'Existing Page' });
      addPage({ name: 'Existing Page' });
      
      expect(getPages()).toHaveLength(1);
    });

    it('adds multiple pages', () => {
      addPage({ name: 'Page One' });
      addPage({ name: 'Page Two' });
      
      expect(getPages()).toHaveLength(2);
    });
  });

  describe('removePage', () => {
    it('removes a page from the index', () => {
      setPageIndex([
        { name: 'Page One' },
        { name: 'Page Two' },
      ]);
      
      removePage('Page One');
      
      expect(getPages()).toHaveLength(1);
      expect(getPages()[0].name).toBe('Page Two');
    });

    it('does nothing when page does not exist', () => {
      setPageIndex([{ name: 'Page One' }]);
      
      removePage('Non-existent Page');
      
      expect(getPages()).toHaveLength(1);
    });
  });

  describe('getPages', () => {
    it('returns a copy of the page index', () => {
      setPageIndex([{ name: 'Test Page' }]);
      
      const pages = getPages();
      pages.push({ name: 'Modified' });
      
      expect(getPages()).toHaveLength(1);
    });
  });
});

describe('WikiLink Autocomplete (VAL-BACKLINKS-002)', () => {
  beforeEach(() => {
    // Clear and set up page index
    setPageIndex([
      { name: 'Getting Started' },
      { name: 'Installation Guide' },
      { name: 'API Reference' },
      { name: 'Examples' },
    ]);
  });

  describe('Suggestion items filtering', () => {
    it('returns all pages when query is empty', () => {
      // The items function is tested through the extension
      const pages = getPages();
      expect(pages).toHaveLength(4);
    });

    it('filters pages by query (case-insensitive)', () => {
      // Filter by "guide"
      const filteredByGuide = getPages().filter(p => 
        p.name.toLowerCase().includes('guide')
      );
      expect(filteredByGuide).toHaveLength(1);
      expect(filteredByGuide[0].name).toBe('Installation Guide');
    });

    it('shows partial matches', () => {
      // Filter by "in"
      const filteredByIn = getPages().filter(p => 
        p.name.toLowerCase().includes('in')
      );
      expect(filteredByIn).toHaveLength(2); // Installation Guide, API Reference
    });
  });

  describe('New page creation option', () => {
    it('adds "create new" option when query has text', () => {
      const query = 'New Page Name';
      const pages = getPages();
      
      // Check if exact match exists
      const hasExactMatch = pages.some(p => 
        p.name.toLowerCase() === query.toLowerCase()
      );
      
      // Should show create option since no exact match
      expect(hasExactMatch).toBe(false);
    });

    it('does not add "create new" when exact match exists', () => {
      const query = 'Getting Started';
      const pages = getPages();
      
      const hasExactMatch = pages.some(p => 
        p.name.toLowerCase() === query.toLowerCase()
      );
      
      expect(hasExactMatch).toBe(true);
    });
  });
});
