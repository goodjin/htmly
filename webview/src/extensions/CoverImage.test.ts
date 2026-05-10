import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CoverImage, hasCoverImage, getCoverImagePos } from './CoverImage';

describe('CoverImage', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, CoverImage],
      content: '',
    });
  });

  describe('insertCoverImage', () => {
    it('inserts cover image with src', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      const html = editor.getHTML();
      expect(html).toContain('class="cover-image"');
      expect(html).toContain('src="https://example.com/image.png"');
    });

    it('inserts cover image with alt text', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        alt: 'A beautiful sunset'
      });
      const html = editor.getHTML();
      expect(html).toContain('alt="A beautiful sunset"');
    });

    it('inserts cover image at document top', () => {
      editor.commands.setContent('<p>Existing content</p>');
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      const html = editor.getHTML();
      // Cover image should be at the beginning
      expect(html.indexOf('cover-image')).toBeLessThan(html.indexOf('Existing content'));
    });

    it('inserts cover image with href (link wrapping)', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        href: 'https://example.com'
      });
      const html = editor.getHTML();
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('<a ');
      expect(html).toContain('src="https://example.com/image.png"');
    });

    it('inserts cover image with caption', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        caption: 'This is a caption'
      });
      const html = editor.getHTML();
      expect(html).toContain('class="cover-caption"');
      expect(html).toContain('This is a caption');
    });
  });

  describe('single cover image enforcement', () => {
    it('replaces existing cover image when inserting new one', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/first.png' });
      editor.commands.insertCoverImage({ src: 'https://example.com/second.png' });
      
      const html = editor.getHTML();
      // Should have only one cover image
      const coverImageCount = (html.match(/class="cover-image"/g) || []).length;
      expect(coverImageCount).toBe(1);
      // Should have the second image
      expect(html).toContain('src="https://example.com/second.png"');
      // Should not have the first image
      expect(html).not.toContain('src="https://example.com/first.png"');
    });
  });

  describe('updateCoverImage', () => {
    it('updates src of existing cover image', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/old.png' });
      editor.commands.updateCoverImage({ src: 'https://example.com/new.png' });
      
      const html = editor.getHTML();
      expect(html).toContain('src="https://example.com/new.png"');
      expect(html).not.toContain('src="https://example.com/old.png"');
    });

    it('updates alt text', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png', alt: 'Old alt' });
      editor.commands.updateCoverImage({ alt: 'New alt text' });
      
      const html = editor.getHTML();
      expect(html).toContain('alt="New alt text"');
    });

    it('adds href to existing cover image', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      editor.commands.updateCoverImage({ href: 'https://example.com' });
      
      const html = editor.getHTML();
      expect(html).toContain('href="https://example.com"');
    });

    it('removes href from cover image', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        href: 'https://example.com'
      });
      editor.commands.updateCoverImage({ href: null });
      
      const html = editor.getHTML();
      expect(html).not.toContain('href="https://example.com"');
    });

    it('updates caption', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        caption: 'Old caption'
      });
      editor.commands.updateCoverImage({ caption: 'New caption' });
      
      const html = editor.getHTML();
      expect(html).toContain('New caption');
      expect(html).not.toContain('Old caption');
    });
  });

  describe('removeCoverImage', () => {
    it('removes cover image from document', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      editor.commands.removeCoverImage();
      
      const html = editor.getHTML();
      expect(html).not.toContain('cover-image');
      expect(html).not.toContain('https://example.com/image.png');
    });

    it('returns false when no cover image exists', () => {
      const result = editor.commands.removeCoverImage();
      expect(result).toBe(false);
    });
  });

  describe('HTML parsing', () => {
    it('parses cover image from HTML', () => {
      editor.commands.setContent('<div class="cover-image"><img src="https://example.com/image.png" alt="Test image"></div>');
      
      const html = editor.getHTML();
      expect(html).toContain('cover-image');
      expect(html).toContain('src="https://example.com/image.png"');
      expect(html).toContain('alt="Test image"');
    });

    it('parses cover image with link from HTML', () => {
      editor.commands.setContent(`
        <div class="cover-image">
          <a href="https://example.com"><img src="https://example.com/image.png"></a>
        </div>
      `);
      
      const html = editor.getHTML();
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('src="https://example.com/image.png"');
    });

    it('parses cover image with caption from HTML', () => {
      editor.commands.setContent(`
        <div class="cover-image">
          <img src="https://example.com/image.png">
          <p class="cover-caption">Test caption</p>
        </div>
      `);
      
      const html = editor.getHTML();
      expect(html).toContain('cover-caption');
      expect(html).toContain('Test caption');
    });
  });

  describe('round-trip', () => {
    it('round-trips through getHTML/setContent', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        alt: 'Test image',
        href: 'https://example.com',
        caption: 'Test caption'
      });
      
      const html1 = editor.getHTML();
      
      const editor2 = new Editor({ extensions: [StarterKit, CoverImage] });
      editor2.commands.setContent(html1);
      
      const html2 = editor2.getHTML();
      
      expect(html1).toBe(html2);
      expect(html2).toContain('src="https://example.com/image.png"');
      expect(html2).toContain('alt="Test image"');
      expect(html2).toContain('href="https://example.com"');
      expect(html2).toContain('Test caption');
    });
  });

  describe('helper functions', () => {
    it('hasCoverImage returns true when cover exists', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      expect(hasCoverImage(editor.state)).toBe(true);
    });

    it('hasCoverImage returns false when no cover exists', () => {
      expect(hasCoverImage(editor.state)).toBe(false);
    });

    it('getCoverImagePos returns correct position', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      const pos = getCoverImagePos(editor.state);
      expect(pos).toBe(0);
    });

    it('getCoverImagePos returns -1 when no cover exists', () => {
      const pos = getCoverImagePos(editor.state);
      expect(pos).toBe(-1);
    });
  });

  describe('coexistence with other blocks', () => {
    it('cover image coexists with heading below', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      editor.commands.setHeading({ level: 1 });
      editor.commands.insertContent('Main Heading');
      
      const html = editor.getHTML();
      expect(html).toContain('cover-image');
      expect(html).toContain('<h1');
      expect(html).toContain('Main Heading');
    });

    it('cover image coexists with paragraph below', () => {
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      editor.commands.setParagraph();
      editor.commands.insertContent('Some paragraph text');
      
      const html = editor.getHTML();
      expect(html).toContain('cover-image');
      expect(html).toContain('Some paragraph text');
    });

    it('cover image coexists with multiple blocks', () => {
      // Insert cover image
      editor.commands.insertCoverImage({ src: 'https://example.com/image.png' });
      // Add heading
      editor.commands.setHeading({ level: 1 });
      editor.commands.insertContent('Heading');
      // Add paragraph
      editor.commands.setParagraph();
      editor.commands.insertContent('Paragraph');
      // Add bullet list
      editor.commands.toggleBulletList();
      editor.commands.insertContent('List item');
      
      const html = editor.getHTML();
      expect(html).toContain('cover-image');
      // Both the cover image and other content should be present
      expect(html).toContain('https://example.com/image.png');
      expect(html).toContain('Heading');
      expect(html).toContain('Paragraph');
    });
  });

  describe('accessibility', () => {
    it('generates alt attribute for screen readers', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/image.png',
        alt: 'Descriptive alt text for accessibility'
      });
      
      const html = editor.getHTML();
      expect(html).toContain('alt="Descriptive alt text for accessibility"');
    });

    it('allows empty alt for decorative images', () => {
      editor.commands.insertCoverImage({ 
        src: 'https://example.com/decorative.png',
        alt: ''
      });
      
      const html = editor.getHTML();
      expect(html).toContain('alt=""');
    });
  });
});
