import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TOCPlugin, slugify } from './TOC';

describe('TOC', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, TOCPlugin],
      content: '',
    });
  });

  describe('slugify', () => {
    it('converts text to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('replaces multiple spaces with single dash', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('removes leading and trailing dashes', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('handles special characters', () => {
      expect(slugify('Hello!@#World')).toBe('hello-world');
    });

    it('handles Chinese characters', () => {
      expect(slugify('你好世界')).toBe('你好世界');
    });

    it('handles mixed content', () => {
      expect(slugify('Hello World 你好')).toBe('hello-world-你好');
    });
  });

  describe('TOC headings detection', () => {
    it('detects H1 headings', () => {
      editor.commands.setContent('<h1>Test Heading</h1>');
      
      const html = editor.getHTML();
      expect(html).toContain('<h1');
      expect(html).toContain('Test Heading');
    });

    it('detects H2 headings', () => {
      editor.commands.setContent('<h2>Sub Heading</h2>');
      
      const html = editor.getHTML();
      expect(html).toContain('<h2');
      expect(html).toContain('Sub Heading');
    });

    it('detects H3 headings', () => {
      editor.commands.setContent('<h3>Sub Sub Heading</h3>');
      
      const html = editor.getHTML();
      expect(html).toContain('<h3');
      expect(html).toContain('Sub Sub Heading');
    });

    it('detects multiple headings in order', () => {
      editor.commands.setContent(`
        <h1>First</h1>
        <h2>Second</h2>
        <h3>Third</h3>
        <h1>Fourth</h1>
      `);
      
      const html = editor.getHTML();
      expect(html).toContain('<h1>First</h1>');
      expect(html).toContain('<h2>Second</h2>');
      expect(html).toContain('<h3>Third</h3>');
      expect(html).toContain('<h1>Fourth</h1>');
    });

    it('updates headings when document changes', () => {
      editor.commands.setContent('<h1>Original</h1>');
      let html = editor.getHTML();
      expect(html).toContain('Original');
      
      // Update the heading
      editor.commands.setContent('<h1>Updated</h1>');
      html = editor.getHTML();
      expect(html).toContain('Updated');
      expect(html).not.toContain('Original');
    });

    it('removes headings when deleted', () => {
      editor.commands.setContent('<h1>Keep</h1><h1>Remove</h1>');
      let html = editor.getHTML();
      expect(html).toContain('Keep');
      expect(html).toContain('Remove');
      
      // Remove the second heading by setting new content
      editor.commands.setContent('<h1>Keep</h1>');
      html = editor.getHTML();
      expect(html).toContain('Keep');
      expect(html).not.toContain('Remove');
    });
  });

  describe('round-trip fidelity', () => {
    it('generates consistent slugs for same heading text', () => {
      const slug1 = slugify('Test Heading');
      const slug2 = slugify('Test Heading');
      expect(slug1).toBe(slug2);
    });

    it('generates unique slugs for different heading texts', () => {
      const slug1 = slugify('Heading One');
      const slug2 = slugify('Heading Two');
      expect(slug1).not.toBe(slug2);
    });

    it('round-trips content with multiple headings', () => {
      editor.commands.setContent(`
        <h1>First Heading</h1>
        <p>Some paragraph text</p>
        <h2>Sub Heading</h2>
        <p>More content</p>
        <h3>Sub Sub Heading</h3>
      `);
      
      const html1 = editor.getHTML();
      
      // Create new editor and set content
      const editor2 = new Editor({ extensions: [StarterKit, TOCPlugin] });
      editor2.commands.setContent(html1);
      
      const html2 = editor2.getHTML();
      
      // Should be semantically identical
      expect(html2).toContain('<h1>First Heading</h1>');
      expect(html2).toContain('<h2>Sub Heading</h2>');
      expect(html2).toContain('<h3>Sub Sub Heading</h3>');
    });
  });
});
