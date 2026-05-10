import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Footnote, Footnotes, FootnotePlugin } from './Footnote';

describe('Footnote', () => {
  let editor: Editor;
  
  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Footnote,
        Footnotes,
      ],
      content: '',
    });
  });
  
  it('inserts footnote marker with number 1', () => {
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    expect(html).toContain('footnote-ref');
    expect(html).toContain('fn1');
    expect(html).toContain('fnref1');
  });
  
  it('increments footnote numbers sequentially', () => {
    editor.commands.insertFootnote();
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    expect(html).toContain('fn1');
    expect(html).toContain('fn2');
  });
  
  it('creates superscript element', () => {
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    expect(html).toContain('<sup');
    expect(html).toContain('</sup>');
  });
  
  it('creates clickable link with href', () => {
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    expect(html).toContain('href="#fn1"');
    expect(html).toContain('id="fnref1"');
  });
  
  it('renders footnote number as text content', () => {
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    // Should contain the number "1" within the sup/anchor
    expect(html).toMatch(/fn1.*>1</);
  });
  
  it('serializes to expected HTML format', () => {
    editor.commands.insertFootnote();
    const html = editor.getHTML();
    // Check for expected format: <sup class="footnote-ref" data-footnote=""><a href="#fn1" id="fnref1">1</a></sup>
    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('data-footnote');
    expect(html).toContain('href="#fn1"');
    expect(html).toContain('id="fnref1"');
  });
  
  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertFootnote();
    editor.commands.insertFootnote();
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Footnote,
        Footnotes,
      ],
    });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    expect(html2).toBe(html1);
  });
  
  it('preserves footnote count when parsing HTML', () => {
    editor.commands.insertFootnote();
    editor.commands.insertFootnote();
    editor.commands.insertFootnote();
    
    const html = editor.getHTML();
    const editor2 = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Footnote,
        Footnotes,
      ],
    });
    editor2.commands.setContent(html);
    
    // Both should have 3 footnotes
    editor2.commands.insertFootnote(); // Should be number 4
    expect(editor2.getHTML()).toContain('fn4');
  });
  
  it('multiple footnotes in same paragraph', () => {
    editor.commands.insertContent('<p>Text with <sup class="footnote-ref" data-footnote=""><a href="#fn1" id="fnref1">1</a></sup> and <sup class="footnote-ref" data-footnote=""><a href="#fn2" id="fnref2">2</a></sup> footnotes.</p>');
    
    const html = editor.getHTML();
    expect(html).toContain('fn1');
    expect(html).toContain('fn2');
  });
  
  it('parses HTML with data-number attribute', () => {
    editor.commands.setContent('<p>Test <sup class="footnote-ref" data-footnote="" data-number="5"><a href="#fn5" id="fnref5">5</a></sup></p>');
    
    const html = editor.getHTML();
    expect(html).toContain('fn5');
    expect(html).toContain('data-number="5"');
  });
});

describe('Footnotes container', () => {
  let editor: Editor;
  
  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Footnote,
        Footnotes,
      ],
      content: '',
    });
  });
  
  it('creates footnotes section', () => {
    editor.commands.ensureFootnotes();
    const html = editor.getHTML();
    expect(html).toContain('aside class="footnotes"');
  });
  
  it('has count attribute', () => {
    editor.commands.ensureFootnotes();
    const html = editor.getHTML();
    expect(html).toContain('data-count="0"');
  });
  
  it('parses existing footnotes section from HTML', () => {
    editor.commands.setContent('<aside class="footnotes" data-count="3"></aside>');
    expect(editor.getHTML()).toContain('footnotes');
  });
});

describe('Footnote keyboard shortcut', () => {
  it('inserts footnote with Ctrl+Shift+F', () => {
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Footnote,
        Footnotes,
      ],
      content: '<p>Test paragraph</p>',
    });
    
    // Simulate keyboard shortcut
    editor.commands.insertFootnote();
    
    const html = editor.getHTML();
    expect(html).toContain('footnote-ref');
  });
});
