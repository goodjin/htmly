import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BlockBackground } from './BlockBackground';

describe('BlockBackground', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, BlockBackground],
      content: '',
    });
  });

  it('sets block background color on text', () => {
    editor.commands.insertContent('Hello World');
    editor.commands.setTextSelection({ from: 1, to: 12 });
    editor.commands.setBlockBackground('#fef3c7');
    
    const html = editor.getHTML();
    // Check for either hex or rgb format (browsers may convert)
    expect(html).toMatch(/background-color:\s*(#[a-fA-F0-9]{6}|rgb\(\d+,\s*\d+,\s*\d+\))/);
    expect(html).toContain('data-bg="#fef3c7"');
    expect(html).toContain('Hello World');
  });

  it('parses block background color from HTML with data-bg', () => {
    editor.commands.setContent('<p><span data-bg="#fee2e2">Colored text</span></p>');
    expect(editor.isActive('blockBackground')).toBe(true);
  });

  it('parses block background from data-bg attribute', () => {
    editor.commands.setContent('<p><span data-bg="#fee2e2">Colored text</span></p>');
    expect(editor.isActive('blockBackground')).toBe(true);
  });

  it('clears block background color', () => {
    editor.commands.insertContent('Hello World');
    editor.commands.setTextSelection({ from: 1, to: 12 });
    editor.commands.setBlockBackground('#fef3c7');
    editor.commands.unsetBlockBackground();
    
    const html = editor.getHTML();
    expect(html).not.toContain('background-color');
    expect(html).not.toContain('data-bg');
  });

  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertContent('Test content');
    editor.commands.setTextSelection({ from: 1, to: 13 });
    editor.commands.setBlockBackground('#fef3c7');
    
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({
      extensions: [StarterKit, BlockBackground],
    });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    
    // Both should contain the block-background class
    expect(html1).toContain('class="block-background"');
    expect(html2).toContain('class="block-background"');
    // Both should preserve the color in some form
    expect(html1).toMatch(/background-color|data-bg/);
    expect(html2).toMatch(/background-color|data-bg/);
  });

  it('applies to paragraph', () => {
    editor.commands.setContent('<p>Paragraph text</p>');
    editor.commands.setTextSelection({ from: 1, to: 16 });
    editor.commands.setBlockBackground('#fee2e2');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#fee2e2"');
    expect(html).toContain('Paragraph text');
  });

  it('applies to heading', () => {
    editor.commands.setContent('<h1>Heading text</h1>');
    editor.commands.setTextSelection({ from: 1, to: 14 });
    editor.commands.setBlockBackground('#dbeafe');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#dbeafe"');
    expect(html).toContain('<h1');
  });

  it('applies to list items', () => {
    editor.commands.setContent('<ul><li>List item</li></ul>');
    editor.commands.setTextSelection({ from: 1, to: 11 });
    editor.commands.setBlockBackground('#dcfce7');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#dcfce7"');
  });

  it('works with custom hex colors', () => {
    editor.commands.insertContent('Custom color');
    editor.commands.setTextSelection({ from: 1, to: 13 });
    editor.commands.setBlockBackground('#a78bfa');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#a78bfa"');
  });

  it('toggles block background', () => {
    editor.commands.insertContent('Toggle test');
    editor.commands.setTextSelection({ from: 1, to: 13 });
    
    // Apply background
    editor.commands.toggleBlockBackground('#fef3c7');
    expect(editor.isActive('blockBackground')).toBe(true);
    
    // Toggle off
    editor.commands.toggleBlockBackground('#fef3c7');
    expect(editor.isActive('blockBackground')).toBe(false);
  });

  it('preserves text formatting with background color', () => {
    editor.commands.setContent('<p><strong>Bold text</strong></p>');
    editor.commands.setTextSelection({ from: 1, to: 11 });
    editor.commands.setBlockBackground('#fef3c7');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#fef3c7"');
    // Bold tags may be around or inside the span depending on selection
    expect(html).toContain('Bold text');
    expect(html).toContain('<strong>');
  });

  it('applies to blockquote', () => {
    editor.commands.setContent('<blockquote>Quote text</blockquote>');
    editor.commands.setTextSelection({ from: 1, to: 12 });
    editor.commands.setBlockBackground('#f3e8ff');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#f3e8ff"');
    expect(html).toContain('blockquote');
  });

  it('handles empty selection gracefully', () => {
    editor.commands.insertContent('Some text');
    // Don't set selection, just try to apply background
    editor.commands.setBlockBackground('#fef3c7');
    
    // Should not throw, but might not apply
    const html = editor.getHTML();
    expect(html).toContain('Some text');
  });

  it('has block-background class', () => {
    editor.commands.insertContent('Test content');
    editor.commands.setTextSelection({ from: 1, to: 13 });
    editor.commands.setBlockBackground('#fef3c7');
    
    const html = editor.getHTML();
    expect(html).toContain('class="block-background"');
  });
});
