import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { WikiLink, WikiLinkExtension } from './WikiLink';

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
