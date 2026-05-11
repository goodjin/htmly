import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { CheckboxCell } from './CheckboxCell';

describe('CheckboxColumn Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CheckboxCell,
      ],
    });
  });

  describe('CheckboxCell extension registration', () => {
    it('should be registered on the editor', () => {
      const checkboxCell = editor.extensionManager.extensions.find(
        ext => ext.name === 'checkboxCell'
      );
      expect(checkboxCell).toBeDefined();
    });

    it('should have correct name', () => {
      const checkboxCell = editor.extensionManager.extensions.find(
        ext => ext.name === 'checkboxCell'
      );
      expect(checkboxCell?.name).toBe('checkboxCell');
    });
  });

  describe('insertCheckboxCell command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.insertCheckboxCell).toBeDefined();
    });

    it('should insert an unchecked checkbox cell', () => {
      // Move cursor to end of document
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      const result = editor.commands.insertCheckboxCell({
        checked: false,
        label: 'Task 1',
      });

      expect(result).toBe(true);
      
      // Verify the cell was inserted
      const html = editor.getHTML();
      expect(html).toContain('checkbox-cell');
      expect(html).toContain('data-checked="false"');
    });

    it('should insert a checked checkbox cell', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      editor.commands.insertCheckboxCell({ checked: true });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-cell');
      expect(html).toContain('data-checked="true"');
    });

    it('should insert cell with default unchecked state', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      const result = editor.commands.insertCheckboxCell();
      expect(result).toBe(true);
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-cell');
      expect(html).toContain('data-checked="false"');
    });

    it('should insert cell with label', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      editor.commands.insertCheckboxCell({ 
        checked: true,
        label: 'Completed task' 
      });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-cell');
      expect(html).toContain('Completed task');
    });
  });

  describe('toggleCellCheckbox command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.toggleCellCheckbox).toBeDefined();
    });

    it('should return false when not in a checkbox cell', () => {
      // In an empty document with no checkbox cell
      const result = editor.commands.toggleCellCheckbox();
      expect(result).toBe(false);
    });

    it('should return false in a regular paragraph', () => {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] });
      
      const result = editor.commands.toggleCellCheckbox();
      expect(result).toBe(false);
    });
  });

  describe('setCellLabel command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.setCellLabel).toBeDefined();
    });

    it('should return false when not in a checkbox cell', () => {
      const result = editor.commands.setCellLabel('New Label');
      expect(result).toBe(false);
    });
  });

  describe('convertCellToCheckbox function', () => {
    it('should be importable', async () => {
      const module = await import('./CheckboxCell');
      expect(module.convertCellToCheckbox).toBeDefined();
    });

    it('should return false for invalid position', async () => {
      const { convertCellToCheckbox } = await import('./CheckboxCell');
      
      // Try to convert at invalid position
      const result = convertCellToCheckbox(editor, 99999);
      expect(result).toBe(false);
    });
  });

  describe('rendering', () => {
    it('should render checkbox-cell class in HTML', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: false });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-cell');
    });

    it('should render data-checked attribute', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: true });
      
      const html = editor.getHTML();
      expect(html).toContain('data-checked="true"');
    });

    it('should render data-sort-value attribute for sorting', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: true });
      
      const html = editor.getHTML();
      expect(html).toContain('data-sort-value="1"');
    });

    it('should render unchecked state with data-sort-value="0"', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: false });
      
      const html = editor.getHTML();
      expect(html).toContain('data-sort-value="0"');
    });

    it('should render checkbox visual', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: true });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-visual');
    });

    it('should render checkmark for checked cells', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: true });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-check');
      expect(html).toContain('✓');
    });

    it('should render label text', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertCheckboxCell({ checked: false, label: 'My Task' });
      
      const html = editor.getHTML();
      expect(html).toContain('checkbox-label');
      expect(html).toContain('My Task');
    });
  });
});

describe('CheckboxCell Node View', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CheckboxCell,
      ],
    });
  });

  it('should create node view with checkbox', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: false });
    
    // The node should be created
    const doc = editor.state.doc;
    expect(doc.content.size).toBeGreaterThan(1);
  });

  it('should handle checked attribute', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: true });
    
    const html = editor.getHTML();
    expect(html).toContain('checkbox-cell');
    expect(html).toContain('data-checked="true"');
  });

  it('should handle label attribute', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ 
      checked: false, 
      label: 'Test Task' 
    });
    
    const html = editor.getHTML();
    expect(html).toContain('checkbox-cell');
    expect(html).toContain('Test Task');
  });

  it('should create nodes with different checked states', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: false });
    
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: true });
    
    const html = editor.getHTML();
    expect(html).toContain('data-checked="false"');
    expect(html).toContain('data-checked="true"');
  });
});

describe('CheckboxCell in tables', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CheckboxCell,
      ],
    });
  });

  it('should work alongside table cells', () => {
    // Insert a table
    editor.commands.insertTable({ rows: 2, cols: 2 });
    
    // Then insert a checkbox cell after the table
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: false });
    
    const html = editor.getHTML();
    expect(html).toContain('checkbox-cell');
    expect(html).toContain('table');
  });

  it('should preserve table structure after inserting checkbox cells', () => {
    // Insert a table
    editor.commands.insertTable({ rows: 2, cols: 2 });
    
    // Insert checkbox cell after
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: true });
    
    // Check that the table is still intact
    const table = editor.state.doc.firstChild;
    expect(table?.type.name).toBe('table');
    
    if (table) {
      const rows = table.content.content;
      expect(rows.length).toBe(2); // Header + 1 data row
    }
  });
});

describe('CheckboxCell sorting support', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CheckboxCell,
      ],
    });
  });

  it('should have data-sort-value for ascending sort (unchecked first)', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: false });
    
    const html = editor.getHTML();
    // "0" sorts before "1" in ascending order, so unchecked rows appear first
    expect(html).toContain('data-sort-value="0"');
  });

  it('should have data-sort-value for descending sort (checked first)', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertCheckboxCell({ checked: true });
    
    const html = editor.getHTML();
    // "1" sorts after "0" in ascending, but after in descending (so checked appears first)
    expect(html).toContain('data-sort-value="1"');
  });
});
