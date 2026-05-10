import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Callout } from '../extensions/Callout';
import { Embed, toEmbedUrl } from '../extensions/Embed';
import { Columns } from '../extensions/Columns';
import { Column } from '../extensions/Column';
import { TOCPlugin } from '../extensions/TOC';

describe('Cross-Area Integration', () => {
  let editor: Editor;

  const createEditorWithAllExtensions = () => {
    return new Editor({
      extensions: [
        StarterKit,
        Callout,
        Embed,
        Columns,
        Column,
        TOCPlugin,
      ],
      content: '',
    });
  };

  beforeEach(() => {
    editor = createEditorWithAllExtensions();
  });

  describe('Mode Switching - WYSIWYG Source Preview WYSIWYG Cycle', () => {
    it('callout survives full mode cycle', () => {
      // WYSIWYG: Insert callout
      editor.commands.insertCallout({ icon: '💡', backgroundColor: '#fef3c7' });
      editor.commands.insertContent('Callout text content');
      
      const html1 = editor.getHTML();
      expect(html1).toContain('class="callout"');
      expect(html1).toContain('Callout text content');
      
      // Source mode: Extract HTML
      const sourceHtml = editor.getHTML();
      
      // Preview mode: Just the HTML content
      
      // Back to WYSIWYG: Set content from source
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(sourceHtml);
      
      const html2 = editor2.getHTML();
      
      // Verify callout preserved
      expect(html2).toContain('class="callout"');
      expect(html2).toContain('data-icon="💡"');
      expect(html2).toContain('data-bg="#fef3c7"');
      expect(html2).toContain('Callout text content');
    });

    it('columns survive full mode cycle', () => {
      // WYSIWYG: Insert columns
      editor.commands.insertColumns();
      editor.commands.insertContent('Column 1 content');
      editor.commands.insertContent('Column 2 content');
      
      const html1 = editor.getHTML();
      expect(html1).toContain('class="columns"');
      expect(html1).toContain('class="column"');
      expect(html1).toContain('Column 1 content');
      expect(html1).toContain('Column 2 content');
      
      // Source mode: Extract HTML
      const sourceHtml = editor.getHTML();
      
      // Back to WYSIWYG
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(sourceHtml);
      
      const html2 = editor2.getHTML();
      
      // Verify columns preserved
      expect(html2).toContain('class="columns"');
      expect(html2).toContain('Column 1 content');
      expect(html2).toContain('Column 2 content');
    });

    it('embed survives full mode cycle', () => {
      // WYSIWYG: Insert embed
      editor.commands.insertEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const html1 = editor.getHTML();
      expect(html1).toContain('class="embed-block"');
      expect(html1).toContain('youtube.com/embed');
      
      // Source mode: Extract HTML
      const sourceHtml = editor.getHTML();
      
      // Back to WYSIWYG
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(sourceHtml);
      
      const html2 = editor2.getHTML();
      
      // Verify embed preserved
      expect(html2).toContain('class="embed-block"');
      expect(html2).toContain('youtube.com/embed');
    });

    it('all block types coexist without interference', () => {
      // Insert callout
      editor.commands.insertCallout({ icon: '💡', backgroundColor: '#fef3c7' });
      editor.commands.insertContent('Callout text');
      
      // Insert columns
      editor.commands.insertColumns();
      
      // Add headings
      editor.commands.setHeading({ level: 1 });
      editor.commands.insertContent('Main Heading');
      
      const html = editor.getHTML();
      
      // Verify all block types present (embed is tested separately)
      expect(html).toContain('class="callout"');
      expect(html).toContain('class="columns"');
      expect(html).toContain('<h1');
      expect(html).toContain('Callout text');
      expect(html).toContain('Main Heading');
      
      // Round-trip test
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(html);
      
      const html2 = editor2.getHTML();
      
      // Verify all types preserved after round-trip
      expect(html2).toContain('class="callout"');
      expect(html2).toContain('class="columns"');
      expect(html2).toContain('<h1');
    });
    
    it('callout and embed coexist without interference', () => {
      // Insert callout
      editor.commands.insertCallout({ icon: '💡', backgroundColor: '#fef3c7' });
      editor.commands.insertContent('Callout text');
      
      // Insert embed
      editor.commands.insertEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const html = editor.getHTML();
      
      // Verify both block types present
      expect(html).toContain('class="callout"');
      expect(html).toContain('class="embed-block"');
      expect(html).toContain('Callout text');
      
      // Round-trip test
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(html);
      
      const html2 = editor2.getHTML();
      
      // Verify both types preserved after round-trip
      expect(html2).toContain('class="callout"');
      expect(html2).toContain('class="embed-block"');
    });
  });

  describe('Search Across All Block Types', () => {
    it('search finds text inside callout', () => {
      // Insert callout with specific text
      editor.commands.insertCallout();
      editor.commands.insertContent('Unique callout search text');
      
      const html = editor.getHTML();
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(html);
      
      // Simulate search by finding matches
      const searchTerm = 'callout search';
      const results: Array<{ from: number; to: number }> = [];
      
      editor2.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;
        const lowerText = node.text.toLowerCase();
        const termLower = searchTerm.toLowerCase();
        let idx = 0;
        while ((idx = lowerText.indexOf(termLower, idx)) !== -1) {
          results.push({ from: pos + idx, to: pos + idx + searchTerm.length });
          idx += searchTerm.length;
        }
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => {
        const text = editor2.state.doc.textBetween(r.from, r.to, ' ');
        return text.includes('callout search');
      })).toBe(true);
    });

    it('search finds text inside column', () => {
      // Insert columns with specific text in second column
      editor.commands.insertColumns();
      
      // Navigate to second column and add content
      editor.commands.insertContent('First column');
      editor.commands.insertContent('Unique column search text');
      
      const html = editor.getHTML();
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(html);
      
      // Simulate search
      const searchTerm = 'column search';
      const results: Array<{ from: number; to: number }> = [];
      
      editor2.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;
        const lowerText = node.text.toLowerCase();
        const termLower = searchTerm.toLowerCase();
        let idx = 0;
        while ((idx = lowerText.indexOf(termLower, idx)) !== -1) {
          results.push({ from: pos + idx, to: pos + idx + searchTerm.length });
          idx += searchTerm.length;
        }
      });
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('search finds text in nested structure (callout inside column)', () => {
      // Insert columns
      editor.commands.insertColumns();
      
      // Insert callout inside first column
      editor.commands.insertCallout({ icon: '🔥' });
      editor.commands.insertContent('Nested callout search text');
      
      const html = editor.getHTML();
      const editor2 = createEditorWithAllExtensions();
      editor2.commands.setContent(html);
      
      // Simulate search
      const searchTerm = 'nested';
      const results: Array<{ from: number; to: number }> = [];
      
      editor2.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;
        const lowerText = node.text.toLowerCase();
        const termLower = searchTerm.toLowerCase();
        let idx = 0;
        while ((idx = lowerText.indexOf(termLower, idx)) !== -1) {
          results.push({ from: pos + idx, to: pos + idx + searchTerm.length });
          idx += searchTerm.length;
        }
      });
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('External Edit Integration', () => {
    it('external edit adds column - editor reflects change', () => {
      // Start with simple content
      editor.commands.setContent('<p>Original content</p>');
      
      // Simulate external edit adding columns
      const externalHtml = `
        <div class="columns">
          <div class="column" style="width:50%"><p>Left column</p></div>
          <div class="column" style="width:50%"><p>Right column</p></div>
        </div>
      `;
      
      editor.commands.setContent(externalHtml);
      
      const html = editor.getHTML();
      expect(html).toContain('class="columns"');
      expect(html).toContain('class="column"');
      expect(html).toContain('Left column');
      expect(html).toContain('Right column');
    });

    it('external edit changes embed URL - editor reflects', () => {
      // Insert initial embed
      editor.commands.insertEmbed('https://www.youtube.com/watch?v=original123');
      
      const initialHtml = editor.getHTML();
      expect(initialHtml).toContain('original123');
      
      // Simulate external edit changing URL - need to update both data-src and iframe src
      let modifiedHtml = initialHtml.replace('original123', 'modified456');
      // The embed uses data-src, but iframe uses src. Both need to match.
      modifiedHtml = modifiedHtml.replace('youtube.com/embed/original123', 'youtube.com/embed/modified456');
      
      editor.commands.setContent(modifiedHtml);
      
      const html = editor.getHTML();
      expect(html).toContain('modified456');
    });
  });

  describe('Preview Pane Content Formatting', () => {
    it('generates proper HTML structure for preview with callout', () => {
      editor.commands.insertCallout({ icon: '💡', backgroundColor: '#fef3c7' });
      editor.commands.insertContent('Preview test content');
      
      const html = editor.getHTML();
      
      // Verify proper HTML structure for preview
      expect(html).toContain('class="callout"');
      expect(html).toContain('data-icon="💡"');
      expect(html).toContain('data-bg="#fef3c7"');
    });

    it('generates proper HTML structure for preview with columns', () => {
      editor.commands.insertColumns();
      editor.commands.insertContent('Column 1');
      editor.commands.insertContent('Column 2');
      
      const html = editor.getHTML();
      
      // Verify proper HTML structure for preview
      expect(html).toContain('class="columns"');
      expect(html).toContain('class="column"');
    });

    it('generates proper HTML structure for preview with embed', () => {
      editor.commands.insertEmbed('https://www.youtube.com/watch?v=test123');
      
      const html = editor.getHTML();
      
      // Verify proper HTML structure for preview
      expect(html).toContain('class="embed-block"');
      expect(html).toContain('<iframe');
    });
  });

  describe('Large Document Performance', () => {
    it('handles document with many nested blocks', () => {
      // Create a document with 50 paragraphs, 10 columns, and 20 callouts
      const blocks: string[] = [];
      
      for (let i = 0; i < 20; i++) {
        blocks.push(`<div class="callout" data-icon="💡" data-bg="#fef3c7"><p>Callout ${i}</p></div>`);
      }
      
      for (let i = 0; i < 5; i++) {
        blocks.push(`<div class="columns">
          <div class="column" style="width:50%"><p>Col ${i}-1</p></div>
          <div class="column" style="width:50%"><p>Col ${i}-2</p></div>
        </div>`);
      }
      
      for (let i = 0; i < 50; i++) {
        blocks.push(`<p>Paragraph ${i}</p>`);
      }
      
      const largeHtml = blocks.join('');
      
      const startTime = Date.now();
      editor.commands.setContent(largeHtml);
      const parseTime = Date.now() - startTime;
      
      // Should parse in reasonable time (< 1 second)
      expect(parseTime).toBeLessThan(1000);
      
      // Verify content is loaded
      const html = editor.getHTML();
      expect(html).toContain('Callout');
      expect(html).toContain('columns');
      expect(html).toContain('Paragraph');
    });
  });

  describe('Bubble Menu Context', () => {
    it('bubble menu context works inside callout inside column', () => {
      // Insert columns
      editor.commands.insertColumns();
      
      // Insert callout in first column
      editor.commands.insertCallout({ icon: '🔥' });
      editor.commands.insertContent('Nested content');
      
      // Verify callout is active
      expect(editor.isActive('callout')).toBe(true);
      
      // The BubbleMenu should show callout-specific options
      const calloutBgColor = editor.getAttributes('callout').backgroundColor;
      expect(calloutBgColor).toBe('#fef3c7');
      
      const calloutIcon = editor.getAttributes('callout').icon;
      expect(calloutIcon).toBe('🔥');
    });
  });
});

describe('Embed URL Sanitization', () => {
  it('converts YouTube watch URL to embed URL', () => {
    const embedUrl = toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('converts YouTube short URL to embed URL', () => {
    const embedUrl = toEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('converts CodePen URL to embed URL', () => {
    const embedUrl = toEmbedUrl('https://codepen.io/user/pen/abc123');
    expect(embedUrl).toContain('codepen.io');
    expect(embedUrl).toContain('/embed/');
  });

  it('rejects disallowed domain', () => {
    const embedUrl = toEmbedUrl('https://example.com/video');
    expect(embedUrl).toBeNull();
  });
});
