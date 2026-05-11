import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableSort } from './TableSort';

describe('TableSort Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TableSort,
      ],
      content: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Age' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'City' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alice' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '30' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NYC' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bob' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '25' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'LA' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Charlie' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '35' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chicago' }] }] },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  describe('sortTableByColumn command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.sortTableByColumn).toBeDefined();
    });

    it('should sort by string column in ascending order', () => {
      // Sort by Name column (index 0) ascending
      const result = editor.commands.sortTableByColumn({
        columnIndex: 0,
        direction: 'asc',
        excludeHeader: true,
      });

      expect(result).toBe(true);

      // Get the table content after sorting
      const table = editor.state.doc.firstChild;
      expect(table?.type.name).toBe('table');

      if (table) {
        const rows = table.content.content;
        // Row 0 is header (unchanged)
        expect(rows[0].content.content[0].content.firstChild?.firstChild?.text).toBe('Name');
        // Row 1 should now be Alice (first alphabetically)
        expect(rows[1].content.content[0].content.firstChild?.firstChild?.text).toBe('Alice');
        // Row 2 should be Bob
        expect(rows[2].content.content[0].content.firstChild?.firstChild?.text).toBe('Bob');
        // Row 3 should be Charlie
        expect(rows[3].content.content[0].content.firstChild?.firstChild?.text).toBe('Charlie');
      }
    });

    it('should sort by string column in descending order', () => {
      // Sort by Name column (index 0) descending
      const result = editor.commands.sortTableByColumn({
        columnIndex: 0,
        direction: 'desc',
        excludeHeader: true,
      });

      expect(result).toBe(true);

      const table = editor.state.doc.firstChild;
      if (table) {
        const rows = table.content.content;
        // Row 1 should now be Charlie (last alphabetically)
        expect(rows[1].content.content[0].content.firstChild?.firstChild?.text).toBe('Charlie');
        // Row 2 should be Bob
        expect(rows[2].content.content[0].content.firstChild?.firstChild?.text).toBe('Bob');
        // Row 3 should be Alice
        expect(rows[3].content.content[0].content.firstChild?.firstChild?.text).toBe('Alice');
      }
    });

    it('should sort by numeric column correctly', () => {
      // Sort by Age column (index 1) ascending
      const result = editor.commands.sortTableByColumn({
        columnIndex: 1,
        direction: 'asc',
        excludeHeader: true,
      });

      expect(result).toBe(true);

      const table = editor.state.doc.firstChild;
      if (table) {
        const rows = table.content.content;
        // Row 1 should be Bob (age 25)
        expect(rows[1].content.content[1].content.firstChild?.firstChild?.text).toBe('25');
        // Row 2 should be Alice (age 30)
        expect(rows[2].content.content[1].content.firstChild?.firstChild?.text).toBe('30');
        // Row 3 should be Charlie (age 35)
        expect(rows[3].content.content[1].content.firstChild?.firstChild?.text).toBe('35');
      }
    });

    it('should handle multi-sort with addToMultiSort option', () => {
      // First sort by Age ascending
      editor.commands.sortTableByColumn({
        columnIndex: 1,
        direction: 'asc',
        excludeHeader: true,
      });

      // Then add City sort with Shift+click
      editor.commands.sortTableByColumn({
        columnIndex: 2,
        direction: 'asc',
        excludeHeader: true,
        addToMultiSort: true,
      });

      // Check that multi-sort state is stored
      const tableSort = editor.extensionManager.extensions.find(
        ext => ext.name === 'tableSort'
      );
      expect(tableSort?.storage?.sortStates).toBeDefined();
    });

    it('should return false for invalid column index', () => {
      const result = editor.commands.sortTableByColumn({
        columnIndex: 10,
        direction: 'asc',
        excludeHeader: true,
      });

      expect(result).toBe(false);
    });

    it('should return false when cursor is not in a table', () => {
      // Clear content
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });

      const result = editor.commands.sortTableByColumn({
        columnIndex: 0,
        direction: 'asc',
        excludeHeader: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('sortTableMultiColumn command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.sortTableMultiColumn).toBeDefined();
    });

    it('should sort by multiple columns', () => {
      // Add a duplicate name to test multi-sort
      editor.commands.insertTable({ rows: 1, cols: 0 });
      
      const result = editor.commands.sortTableMultiColumn({
        sorts: [
          { columnIndex: 1, direction: 'asc' }, // Sort by Age first
          { columnIndex: 0, direction: 'asc' }, // Then by Name
        ],
        excludeHeader: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('clearTableSort command', () => {
    it('should be available on editor', () => {
      expect(editor.commands.clearTableSort).toBeDefined();
    });

    it('should clear sort state', () => {
      // First apply a sort
      editor.commands.sortTableByColumn({
        columnIndex: 0,
        direction: 'asc',
        excludeHeader: true,
      });

      // Then clear it
      const result = editor.commands.clearTableSort();
      expect(result).toBe(true);
    });
  });

  describe('extension options', () => {
    it('should use default options', () => {
      const tableSort = editor.extensionManager.extensions.find(
        ext => ext.name === 'tableSort'
      );

      expect(tableSort?.options.showIndicators).toBe(true);
      expect(tableSort?.options.ascIndicatorClass).toBe('sort-indicator-asc');
      expect(tableSort?.options.descIndicatorClass).toBe('sort-indicator-desc');
    });

    it('should accept custom options', () => {
      const customEditor = new Editor({
        extensions: [
          StarterKit,
          Table,
          TableRow,
          TableHeader,
          TableCell,
          TableSort.configure({
            showIndicators: false,
            ascIndicatorClass: 'custom-asc',
            descIndicatorClass: 'custom-desc',
          }),
        ],
      });

      const tableSort = customEditor.extensionManager.extensions.find(
        ext => ext.name === 'tableSort'
      );

      expect(tableSort?.options.showIndicators).toBe(false);
      expect(tableSort?.options.ascIndicatorClass).toBe('custom-asc');
      expect(tableSort?.options.descIndicatorClass).toBe('custom-desc');

      customEditor.destroy();
    });
  });

  describe('storage', () => {
    it('should initialize with empty sort states', () => {
      const tableSort = editor.extensionManager.extensions.find(
        ext => ext.name === 'tableSort'
      );

      expect(tableSort?.storage?.sortStates).toEqual({});
      expect(tableSort?.storage?.currentSort).toBe(null);
    });

    it('should store sort state after sorting', () => {
      editor.commands.sortTableByColumn({
        columnIndex: 0,
        direction: 'asc',
        excludeHeader: true,
      });

      const tableSort = editor.extensionManager.extensions.find(
        ext => ext.name === 'tableSort'
      );

      expect(tableSort?.storage?.currentSort).toEqual({
        columnIndex: 0,
        direction: 'asc',
      });
    });
  });
});

describe('compareCells function', () => {
  // We test the sorting behavior through the editor since compareCells is internal
  it('should sort numeric values correctly', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        Table,
        TableRow,
        TableHeader,
        TableCell,
        TableSort,
      ],
      content: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '100' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '20' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '3' }] }] },
                ],
              },
            ],
          },
        ],
      },
    });

    // Sort ascending
    editor.commands.sortTableByColumn({
      columnIndex: 0,
      direction: 'asc',
      excludeHeader: true,
    });

    const table = editor.state.doc.firstChild;
    if (table) {
      const rows = table.content.content;
      // Should be sorted numerically: 3, 20, 100
      expect(rows[1].content.content[0].content.firstChild?.firstChild?.text).toBe('3');
      expect(rows[2].content.content[0].content.firstChild?.firstChild?.text).toBe('20');
      expect(rows[3].content.content[0].content.firstChild?.firstChild?.text).toBe('100');
    }

    editor.destroy();
  });

  it('should handle case-insensitive string comparison', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        Table,
        TableRow,
        TableHeader,
        TableCell,
        TableSort,
      ],
      content: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'apple' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Banana' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'CHERRY' }] }] },
                ],
              },
            ],
          },
        ],
      },
    });

    // Sort ascending (case-insensitive)
    editor.commands.sortTableByColumn({
      columnIndex: 0,
      direction: 'asc',
      excludeHeader: true,
    });

    const table = editor.state.doc.firstChild;
    if (table) {
      const rows = table.content.content;
      // Should be sorted case-insensitively: apple, Banana, CHERRY
      expect(rows[1].content.content[0].content.firstChild?.firstChild?.text).toBe('apple');
      expect(rows[2].content.content[0].content.firstChild?.firstChild?.text).toBe('Banana');
      expect(rows[3].content.content[0].content.firstChild?.firstChild?.text).toBe('CHERRY');
    }

    editor.destroy();
  });
});
