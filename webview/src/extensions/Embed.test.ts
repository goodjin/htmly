import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Embed, toEmbedUrl, isAllowedEmbedUrl, getEmbedDomainLabel } from './Embed';

describe('Embed URL utilities', () => {
  describe('toEmbedUrl', () => {
    it('converts YouTube watch URL to embed URL', () => {
      const result = toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('converts YouTube short URL to embed URL', () => {
      const result = toEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('converts Vimeo URL to embed URL', () => {
      const result = toEmbedUrl('https://vimeo.com/123456789');
      expect(result).toBe('https://player.vimeo.com/video/123456789');
    });

    it('converts CodePen URL to embed URL', () => {
      const result = toEmbedUrl('https://codepen.io/user/pen/abc123');
      expect(result).toBe('https://codepen.io/user/embed/abc123?default-tab=result');
    });

    it('converts CodeSandbox URL to embed URL', () => {
      const result = toEmbedUrl('https://codesandbox.io/s/abc123');
      expect(result).toBe('https://codesandbox.io/embed/abc123?fontsize=14&hidenavigation=1&theme=dark&view=preview');
    });

    it('returns null for disallowed domains', () => {
      const result = toEmbedUrl('https://example.com/video');
      expect(result).toBeNull();
    });

    it('returns null for invalid URLs', () => {
      const result = toEmbedUrl('not-a-url');
      expect(result).toBeNull();
    });

    it('preserves already embedded CodePen URLs', () => {
      const result = toEmbedUrl('https://codepen.io/user/embed/abc123');
      expect(result).toBe('https://codepen.io/user/embed/abc123');
    });

    it('preserves already embedded CodeSandbox URLs', () => {
      const result = toEmbedUrl('https://codesandbox.io/embed/abc123');
      expect(result).toBe('https://codesandbox.io/embed/abc123');
    });
  });

  describe('isAllowedEmbedUrl', () => {
    it('allows YouTube URLs', () => {
      expect(isAllowedEmbedUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
      expect(isAllowedEmbedUrl('https://youtu.be/abc')).toBe(true);
    });

    it('allows Vimeo URLs', () => {
      expect(isAllowedEmbedUrl('https://vimeo.com/123')).toBe(true);
    });

    it('allows CodePen URLs', () => {
      expect(isAllowedEmbedUrl('https://codepen.io/user/pen/abc')).toBe(true);
    });

    it('allows CodeSandbox URLs', () => {
      expect(isAllowedEmbedUrl('https://codesandbox.io/s/abc')).toBe(true);
    });

    it('disallows other domains', () => {
      expect(isAllowedEmbedUrl('https://example.com')).toBe(false);
      expect(isAllowedEmbedUrl('https://google.com')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isAllowedEmbedUrl('not-a-url')).toBe(false);
    });
  });

  describe('getEmbedDomainLabel', () => {
    it('returns hostname for valid URLs', () => {
      expect(getEmbedDomainLabel('https://www.youtube.com/watch?v=abc')).toBe('www.youtube.com');
      expect(getEmbedDomainLabel('https://codepen.io/user/pen/abc')).toBe('codepen.io');
    });

    it('returns original string for invalid URLs', () => {
      expect(getEmbedDomainLabel('not-a-url')).toBe('not-a-url');
    });
  });
});

describe('Embed Node', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, Embed],
      content: '',
    });
  });

  it('inserts embed with valid YouTube URL', () => {
    editor.commands.insertEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const html = editor.getHTML();
    expect(html).toContain('class="embed-block"');
    expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('inserts embed with valid Vimeo URL', () => {
    editor.commands.insertEmbed('https://vimeo.com/123456789');
    const html = editor.getHTML();
    expect(html).toContain('class="embed-block"');
    expect(html).toContain('player.vimeo.com/video/123456789');
  });

  it('inserts embed with valid CodePen URL', () => {
    editor.commands.insertEmbed('https://codepen.io/user/pen/abc123');
    const html = editor.getHTML();
    expect(html).toContain('class="embed-block"');
    expect(html).toContain('codepen.io');
  });

  it('fails to insert embed with disallowed domain', () => {
    const result = editor.commands.insertEmbed('https://example.com/video');
    expect(result).toBe(false);
  });

  it('round-trips embed through getHTML/setContent', () => {
    editor.commands.insertEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const html1 = editor.getHTML();

    const editor2 = new Editor({ extensions: [StarterKit, Embed] });
    editor2.commands.setContent(html1);

    const html2 = editor2.getHTML();
    expect(html1).toBe(html2);
    expect(html2).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renders iframe with correct attributes', () => {
    editor.commands.insertEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const html = editor.getHTML();
    expect(html).toContain('frameborder="0"');
    expect(html).toContain('allowfullscreen');
    expect(html).toContain('allow');
  });

  it('renders empty state for null src', () => {
    // Directly insert an embed node without a valid URL
    editor.commands.insertContent({
      type: 'embed',
      attrs: { src: null },
    });
    const html = editor.getHTML();
    expect(html).toContain('embed-block--empty');
  });

  it('can insert multiple embeds', () => {
    // Insert embeds using setContent to ensure both are present
    const editor2 = new Editor({ extensions: [StarterKit, Embed] });
    editor2.commands.setContent(`
      <div class="embed-block"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></div>
      <p>Text between embeds</p>
      <div class="embed-block"><iframe src="https://player.vimeo.com/video/456789"></iframe></div>
    `);

    const html = editor2.getHTML();
    expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(html).toContain('player.vimeo.com/video/456789');
    expect(html).toContain('Text between embeds');
  });
});
