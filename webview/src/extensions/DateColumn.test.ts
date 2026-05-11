import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { DatePickerCell } from './DatePickerCell';

describe('DateColumn Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        DatePickerCell,
      ],
    });
  });

  describe('DatePickerCell extension registration', () => {
    it('should be registered on the editor', () => {
      const datePickerCell = editor.extensionManager.extensions.find(
        ext => ext.name === 'datePickerCell'
      );
      expect(datePickerCell).toBeDefined();
    });

    it('should have correct name', () => {
      const datePickerCell = editor.extensionManager.extensions.find(
        ext => ext.name === 'datePickerCell'
      );
      expect(datePickerCell?.name).toBe('datePickerCell');
    });
  });

  describe('insertDatePickerCell command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.insertDatePickerCell).toBeDefined();
    });

    it('should insert a date picker cell', () => {
      // Move cursor to end of document
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      const result = editor.commands.insertDatePickerCell({
        date: '2024-03-01',
        placeholder: 'Select date',
      });

      expect(result).toBe(true);
      
      // Verify the cell was inserted
      const html = editor.getHTML();
      expect(html).toContain('date-picker-cell');
    });

    it('should insert cell with default values', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      const result = editor.commands.insertDatePickerCell();
      expect(result).toBe(true);
      
      const html = editor.getHTML();
      expect(html).toContain('date-picker-cell');
    });

    it('should insert cell with specific date value', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      editor.commands.insertDatePickerCell({ date: '2024-07-15' });
      
      const html = editor.getHTML();
      expect(html).toContain('2024-07-15');
    });

    it('should insert cell with custom placeholder', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      
      editor.commands.insertDatePickerCell({ 
        placeholder: 'Pick a date' 
      });
      
      const html = editor.getHTML();
      expect(html).toContain('Pick a date');
    });
  });

  describe('setCellDate command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.setCellDate).toBeDefined();
    });

    it('should return false when not in a date picker cell', () => {
      // In an empty document with no date picker cell
      const result = editor.commands.setCellDate('2024-06-15');
      expect(result).toBe(false);
    });

    it('should return false in a regular paragraph', () => {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] });
      
      const result = editor.commands.setCellDate('2024-06-15');
      expect(result).toBe(false);
    });
  });

  describe('convertCellToDatePicker function', () => {
    it('should be importable', async () => {
      const module = await import('./DatePickerCell');
      expect(module.convertCellToDatePicker).toBeDefined();
    });

    it('should return false for invalid position', async () => {
      const { convertCellToDatePicker } = await import('./DatePickerCell');
      
      // Try to convert at invalid position
      const result = convertCellToDatePicker(editor, 99999);
      expect(result).toBe(false);
    });
  });

  describe('rendering', () => {
    it('should render date-picker-cell class in HTML', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertDatePickerCell({ date: '2024-05-10' });
      
      const html = editor.getHTML();
      expect(html).toContain('date-picker-cell');
    });

    it('should render date input element', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertDatePickerCell({ date: '2024-05-10' });
      
      const html = editor.getHTML();
      expect(html).toContain('type="date"');
    });

    it('should include date value in rendered output', () => {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertDatePickerCell({ date: '2024-11-25' });
      
      const html = editor.getHTML();
      expect(html).toContain('2024-11-25');
    });
  });
});

describe('DatePickerCell Node View', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        DatePickerCell,
      ],
    });
  });

  it('should create node view with date input', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ date: '2024-07-20' });
    
    // The node should be created
    const doc = editor.state.doc;
    expect(doc.content.size).toBeGreaterThan(1);
  });

  it('should handle placeholder attribute', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ 
      date: '', 
      placeholder: 'Pick a date' 
    });
    
    const html = editor.getHTML();
    expect(html).toContain('date-picker-cell');
    expect(html).toContain('Pick a date');
  });

  it('should create nodes with different date values', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ date: '2024-01-01' });
    
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ date: '2024-12-31' });
    
    const html = editor.getHTML();
    expect(html).toContain('2024-01-01');
    expect(html).toContain('2024-12-31');
  });
});

describe('DatePickerCell in tables', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        DatePickerCell,
      ],
    });
  });

  it('should work alongside table cells', () => {
    // Insert a table
    editor.commands.insertTable({ rows: 2, cols: 2 });
    
    // Then insert a date picker cell after the table
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ date: '2024-08-01' });
    
    const html = editor.getHTML();
    expect(html).toContain('date-picker-cell');
    expect(html).toContain('2024-08-01');
  });

  it('should preserve table structure after inserting date picker cells', () => {
    // Insert a table
    editor.commands.insertTable({ rows: 2, cols: 2 });
    
    // Insert date picker cell after
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertDatePickerCell({ date: '2024-08-01' });
    
    // Check that the table is still intact
    const table = editor.state.doc.firstChild;
    expect(table?.type.name).toBe('table');
    
    if (table) {
      const rows = table.content.content;
      expect(rows.length).toBe(2); // Header + 1 data row
    }
  });
});
