import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { LinkPreview, isUrl, extractHostname } from './LinkPreview';
import { Callout } from './Callout';
import { Columns } from './Columns';
import { Column } from './Column';

describe('LinkPreview', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        LinkPreview,
        Callout,
        Columns,
        Column,
      ],
      content: '',
    });
  });

  it('inserts link preview with URL', () => {
    editor.commands.insertLinkPreview({ url: 'https://example.com' });
    const html = editor.getHTML();
    expect(html).toContain('link-preview');
    expect(html).toContain('https://example.com');
  });

  it('extracts hostname from URL', () => {
    expect(extractHostname('https://example.com/page')).toBe('example.com');
    expect(extractHostname('https://www.subdomain.example.com')).toBe('www.subdomain.example.com');
    expect(extractHostname('invalid-url')).toBe('');
  });

  it('validates URLs correctly', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://example.com')).toBe(true);
    expect(isUrl('example.com')).toBe(false);
    expect(isUrl('not a url')).toBe(false);
    expect(isUrl('ftp://example.com')).toBe(false);
  });

  it('renders fallback when metadata not fetched', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://example.com',
      fetched: false,
    });
    const html = editor.getHTML();
    expect(html).toContain('link-preview--fallback');
  });

  it('renders full preview with metadata', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://example.com',
      title: 'Example Site',
      description: 'An example website',
      image: 'https://example.com/image.jpg',
      hostname: 'example.com',
      fetched: true,
    });
    const html = editor.getHTML();
    expect(html).toContain('link-preview-title');
    expect(html).toContain('Example Site');
    expect(html).toContain('link-preview-description');
    expect(html).toContain('An example website');
    expect(html).toContain('link-preview-image');
    expect(html).toContain('link-preview-hostname');
    expect(html).toContain('example.com');
  });

  it('renders without image when og:image missing', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://example.com',
      title: 'Example Site',
      description: 'An example website',
      image: '',
      hostname: 'example.com',
      fetched: true,
    });
    const html = editor.getHTML();
    expect(html).toContain('link-preview-title');
    expect(html).toContain('Example Site');
    expect(html).not.toContain('link-preview-image');
  });

  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://example.com',
      title: 'Example Site',
      description: 'An example website',
      hostname: 'example.com',
      fetched: true,
    });
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ 
      extensions: [
        StarterKit,
        LinkPreview,
      ] 
    });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    expect(html2).toBe(html1);
  });

  it('serializes to correct HTML format', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://example.com',
      title: 'Test Title',
      description: 'Test Description',
      hostname: 'example.com',
      fetched: true,
    });
    const html = editor.getHTML();
    
    // Check for proper structure
    expect(html).toContain('class="link-preview"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('class="link-preview-title"');
    expect(html).toContain('Test Title');
    expect(html).toContain('class="link-preview-description"');
    expect(html).toContain('Test Description');
    expect(html).toContain('class="link-preview-hostname"');
    expect(html).toContain('example.com');
  });

  it('updates link preview URL', () => {
    editor.commands.insertLinkPreview({ 
      url: 'https://old.com',
      title: 'Old Site',
      fetched: true,
    });
    
    // Move cursor into the link preview
    const doc = editor.state.doc;
    doc.descendants((node, pos) => {
      if (node.type.name === 'linkPreview') {
        editor.commands.setTextSelection(pos + 1);
        return false;
      }
    });
    
    editor.commands.updateLinkPreview({ url: 'https://new.com' });
    
    const html = editor.getHTML();
    expect(html).toContain('https://new.com');
    expect(html).not.toContain('https://old.com');
  });

  it('removes link preview', () => {
    editor.commands.insertLinkPreview({ url: 'https://example.com' });
    expect(editor.getHTML()).toContain('link-preview');
    
    // Move cursor into the link preview
    const doc = editor.state.doc;
    doc.descendants((node, pos) => {
      if (node.type.name === 'linkPreview') {
        editor.commands.setTextSelection(pos + 1);
        return false;
      }
    });
    
    editor.commands.removeLinkPreview();
    expect(editor.getHTML()).not.toContain('link-preview');
  });

  it('coexists with other blocks', () => {
    editor.commands.insertLinkPreview({ url: 'https://example.com' });
    editor.commands.setParagraph();
    editor.commands.insertContent('Some text after');
    
    const html = editor.getHTML();
    expect(html).toContain('link-preview');
    expect(html).toContain('Some text after');
  });

  it('works inside callout block', () => {
    editor.commands.insertCallout();
    editor.commands.insertLinkPreview({ url: 'https://example.com' });
    
    const html = editor.getHTML();
    expect(html).toContain('callout');
    expect(html).toContain('link-preview');
  });

  it('works inside columns block', () => {
    editor.commands.insertColumns();
    // Move to first column
    editor.commands.setTextSelection(editor.state.doc.resolve(2).pos);
    editor.commands.insertLinkPreview({ url: 'https://example.com' });
    
    const html = editor.getHTML();
    expect(html).toContain('columns');
    expect(html).toContain('link-preview');
  });
});

describe('LinkPreview serialization', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        LinkPreview,
      ],
      content: '',
    });
  });

  it('parses link-preview div correctly', () => {
    editor.commands.setContent(`
      <div class="link-preview" data-url="https://example.com">
        <a href="https://example.com">
          <div class="link-preview-image">
            <img src="https://example.com/image.jpg" alt="Preview">
          </div>
          <div class="link-preview-content">
            <h4 class="link-preview-title">Example Title</h4>
            <p class="link-preview-description">Example description text</p>
            <span class="link-preview-hostname">example.com</span>
          </div>
        </a>
      </div>
    `);
    
    const html = editor.getHTML();
    expect(html).toContain('link-preview');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Example Title');
    expect(html).toContain('Example description');
    expect(html).toContain('example.com');
  });

  it('parses fallback link-preview correctly', () => {
    editor.commands.setContent(`
      <div class="link-preview link-preview--fallback" data-url="https://example.com">
        <a href="https://example.com">https://example.com</a>
      </div>
    `);
    
    const html = editor.getHTML();
    expect(html).toContain('link-preview');
    expect(html).toContain('link-preview--fallback');
    expect(html).toContain('https://example.com');
  });
});
