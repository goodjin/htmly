import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Columns } from './Columns';
import { Column } from './Column';

describe('Columns', () => {
  let editor: Editor;
  
  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Columns,
        Column,
      ],
      content: '',
    });
  });
  
  it('inserts columns with two columns by default', () => {
    editor.commands.insertColumns();
    const html = editor.getHTML();
    expect(html).toContain('class="columns"');
    // Should have 2 columns
    let columnCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'column') columnCount++;
    });
    expect(columnCount).toBe(2);
  });
  
  it('serializes columns to proper HTML structure', () => {
    editor.commands.insertColumns();
    const html = editor.getHTML();
    expect(html).toContain('class="columns"');
    expect(html).toContain('class="column"');
    expect(html).toContain('</div>');
  });
  
  it('columns have default 50% width', () => {
    editor.commands.insertColumns();
    const html = editor.getHTML();
    // Check that columns have width percentage
    expect(html).toContain('style="width:');
    expect(html).toContain('50%');
  });
  
  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertColumns();
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ 
      extensions: [StarterKit, Columns, Column]
    });
    editor2.commands.setContent(html1);
    const html2 = editor2.getHTML();
    
    // Both should have columns structure
    expect(html2).toContain('class="columns"');
    expect(html2).toContain('class="column"');
  });
  
  it('columns can contain block content', () => {
    editor.commands.insertColumns();
    
    // Set content with a heading inside columns
    editor.commands.setContent('<div class="columns"><div class="column" style="width:50%"><h2>Test heading</h2></div><div class="column" style="width:50%"><p></p></div></div>');
    
    const html = editor.getHTML();
    expect(html).toContain('<h2>');
  });
  
  it('columns can be nested', () => {
    // Set content with nested columns
    const nestedColumnsHtml = '<div class="columns"><div class="column" style="width:50%"><div class="columns"><div class="column" style="width:50%"><p></p></div><div class="column" style="width:50%"><p></p></div></div></div><div class="column" style="width:50%"><p></p></div></div>';
    
    editor.commands.setContent(nestedColumnsHtml);
    const html = editor.getHTML();
    expect(html).toContain('class="columns"');
    // Should have multiple columns (nested) - outer has 2, inner has 2
    const columnCount = countOccurrences(html, 'class="column"');
    expect(columnCount).toBe(4); // 2 outer + 2 inner
  });
  
  it('preserves width percentages after round-trip', () => {
    const htmlWithWidths = '<div class="columns"><div class="column" style="width:30%"><p>Left</p></div><div class="column" style="width:70%"><p>Right</p></div></div>';
    
    editor.commands.setContent(htmlWithWidths);
    const output = editor.getHTML();
    
    // Allow for possible space after "width:"
    expect(output).toMatch(/width:\s*30%/);
    expect(output).toMatch(/width:\s*70%/);
  });
});

// Helper function
function countOccurrences(str: string, sub: string): number {
  return (str.match(new RegExp(sub, 'g')) || []).length;
}
