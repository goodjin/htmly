import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Callout } from './Callout';

describe('Callout', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, Callout],
      content: '',
    });
  });

  it('inserts callout with default attributes', () => {
    editor.commands.insertCallout();
    const html = editor.getHTML();
    expect(html).toContain('class="callout"');
    expect(html).toContain('data-icon="💡"');
    expect(html).toContain('data-bg="#fef3c7"');
  });

  it('inserts callout with custom attributes', () => {
    editor.commands.insertCallout({ icon: '⚠️', backgroundColor: '#fee2e2' });
    const html = editor.getHTML();
    expect(html).toContain('data-icon="⚠️"');
    expect(html).toContain('data-bg="#fee2e2"');
  });

  it('parses callout from HTML', () => {
    editor.commands.setContent('<div class="callout" data-icon="🔥" data-bg="#000">Test</div>');
    expect(editor.isActive('callout')).toBe(true);
  });

  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertCallout({ icon: '💡', backgroundColor: '#fef3c7' });
    editor.commands.insertCallout({ icon: '⚠️', backgroundColor: '#fee2e2' });
    
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ extensions: [StarterKit, Callout] });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    
    // Both should contain the same callouts
    expect(html1).toBe(html2);
    expect(html2).toContain('data-icon="💡"');
    expect(html2).toContain('data-icon="⚠️"');
  });

  it('updates callout icon', () => {
    editor.commands.insertCallout();
    editor.commands.updateCalloutIcon('🔥');
    
    const html = editor.getHTML();
    expect(html).toContain('data-icon="🔥"');
  });

  it('updates callout background color', () => {
    editor.commands.insertCallout();
    editor.commands.updateCalloutBackground('#fee2e2');
    
    const html = editor.getHTML();
    expect(html).toContain('data-bg="#fee2e2"');
  });

  it('contains editable content', () => {
    editor.commands.insertCallout();
    editor.commands.insertContent('Hello World');
    
    const html = editor.getHTML();
    expect(html).toContain('Hello World');
  });

  it('can contain nested blocks', () => {
    editor.commands.insertCallout();
    editor.commands.setHeading({ level: 2 });
    editor.commands.insertContent('Heading in Callout');
    
    const html = editor.getHTML();
    expect(html).toContain('<h2');
    expect(html).toContain('Heading in Callout');
  });

  it('can be toggled (inserted and deleted)', () => {
    // Insert callout
    editor.commands.insertCallout();
    expect(editor.isActive('callout')).toBe(true);
    
    // Delete it by selecting all and replacing
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(editor.isActive('callout')).toBe(false);
  });
});
