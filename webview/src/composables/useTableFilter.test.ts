/**
 * Tests for useTableFilter composable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTableFilter } from './useTableFilter';

describe('useTableFilter', () => {
  let filter: ReturnType<typeof useTableFilter>;

  beforeEach(() => {
    filter = useTableFilter();
  });

  describe('setFilter', () => {
    it('should clear terms when input is empty', () => {
      filter.setFilter('');
      expect(filter.filterTerms.value).toEqual([]);
      expect(filter.isActive.value).toBe(false);
    });

    it('should clear terms when input is only whitespace', () => {
      filter.setFilter('   ');
      expect(filter.filterTerms.value).toEqual([]);
      expect(filter.isActive.value).toBe(false);
    });

    it('should parse single term', () => {
      filter.setFilter('Alice');
      expect(filter.filterTerms.value).toEqual(['Alice']);
      expect(filter.isActive.value).toBe(true);
    });

    it('should parse multiple terms separated by spaces', () => {
      filter.setFilter('Alice Developer');
      expect(filter.filterTerms.value).toEqual(['Alice', 'Developer']);
      expect(filter.isActive.value).toBe(true);
    });

    it('should parse multiple terms separated by commas', () => {
      filter.setFilter('Alice, Developer');
      expect(filter.filterTerms.value).toEqual(['Alice', 'Developer']);
      expect(filter.isActive.value).toBe(true);
    });

    it('should parse multiple terms with mixed separators', () => {
      filter.setFilter('Alice, Developer manager');
      expect(filter.filterTerms.value).toEqual(['Alice', 'Developer', 'manager']);
      expect(filter.isActive.value).toBe(true);
    });

    it('should trim whitespace from terms', () => {
      filter.setFilter('  Alice  ,  Bob  ');
      expect(filter.filterTerms.value).toEqual(['Alice', 'Bob']);
    });

    it('should filter out empty terms from multiple spaces', () => {
      filter.setFilter('Alice    Bob');
      expect(filter.filterTerms.value).toEqual(['Alice', 'Bob']);
    });

    it('should store the raw filter value', () => {
      filter.setFilter('Alice, Bob');
      expect(filter.rawFilter.value).toBe('Alice, Bob');
    });
  });

  describe('clearFilter', () => {
    it('should clear all filter state', () => {
      filter.setFilter('Alice');
      filter.clearFilter();
      expect(filter.filterTerms.value).toEqual([]);
      expect(filter.rawFilter.value).toBe('');
      expect(filter.isActive.value).toBe(false);
    });
  });

  describe('matchesFilter', () => {
    it('should return true when no filter is active', () => {
      const result = filter.matchesFilter(['Alice', 'Developer']);
      expect(result).toBe(true);
    });

    it('should return true when cell contains the search term (case-insensitive)', () => {
      filter.setFilter('alice');
      expect(filter.matchesFilter(['Alice Johnson'])).toBe(true);
      expect(filter.matchesFilter(['ALICE SMITH'])).toBe(true);
      expect(filter.matchesFilter(['bob'])).toBe(false);
    });

    it('should match term in any cell', () => {
      filter.setFilter('manager');
      expect(filter.matchesFilter(['Alice', 'Manager'])).toBe(true);
      expect(filter.matchesFilter(['Manager', 'Alice'])).toBe(true);
    });

    it('should use AND logic for multiple terms', () => {
      filter.setFilter('alice developer');
      expect(filter.matchesFilter(['Alice Johnson', 'Developer'])).toBe(true);
      expect(filter.matchesFilter(['Alice Johnson', 'Designer'])).toBe(false);
      expect(filter.matchesFilter(['Bob Smith', 'Developer'])).toBe(false);
    });

    it('should handle partial matches', () => {
      filter.setFilter('ali');
      expect(filter.matchesFilter(['Alice'])).toBe(true);
      expect(filter.matchesFilter(['alice'])).toBe(true);
      expect(filter.matchesFilter(['Alice'])).toBe(true);
    });

    it('should handle HTML content in cells', () => {
      filter.setFilter('bold');
      expect(filter.matchesFilter(['<strong>bold</strong> text'])).toBe(true);
      expect(filter.matchesFilter(['<span>bold</span>'])).toBe(true);
    });
  });

  describe('extractCellText', () => {
    it('should extract text from plain content', () => {
      expect(filter.extractCellText('Hello World')).toBe('Hello World');
    });

    it('should strip HTML tags', () => {
      expect(filter.extractCellText('<strong>Hello</strong> World')).toBe('Hello World');
    });

    it('should handle nested HTML', () => {
      expect(filter.extractCellText('<div><span>Hello</span> <em>World</em></div>')).toBe('Hello World');
    });

    it('should handle HTML entities', () => {
      expect(filter.extractCellText('Hello &amp; World')).toBe('Hello & World');
    });
  });

  describe('filterTableRows', () => {
    it('should return empty array when no tbody exists', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table></table>';
      const result = filter.filterTableRows(div);
      expect(result).toEqual([]);
    });

    it('should return row visibility for all rows', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td></tr>
            <tr><td>Bob</td></tr>
          </tbody>
        </table>
      `;
      
      filter.setFilter('Alice');
      const result = filter.filterTableRows(div);
      
      expect(result).toHaveLength(2);
      expect(result[0].isVisible).toBe(true);
      expect(result[1].isVisible).toBe(false);
    });

    it('should handle multiple filter criteria', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td><td>Developer</td></tr>
            <tr><td>Bob</td><td>Designer</td></tr>
          </tbody>
        </table>
      `;
      
      filter.setFilter('Alice Developer');
      const result = filter.filterTableRows(div);
      
      expect(result[0].isVisible).toBe(true); // Alice + Developer
      expect(result[1].isVisible).toBe(false); // Missing Alice
    });
  });

  describe('getVisibleRowCount', () => {
    it('should return 0 when no tbody exists', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table></table>';
      expect(filter.getVisibleRowCount(div)).toBe(0);
    });

    it('should return count of visible rows after filtering', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td><td>Developer</td></tr>
            <tr><td>Bob</td><td>Designer</td></tr>
            <tr><td>Carol</td><td>Manager</td></tr>
          </tbody>
        </table>
      `;
      
      // Filter for rows containing 'Alice' OR 'Carol' (comma = OR logic, but we use single term here)
      filter.setFilter('Alice');
      filter.applyFilterToTable(div);
      
      expect(filter.getVisibleRowCount(div)).toBe(1);
      
      // Now filter for 'Developer' should show row 1
      filter.setFilter('Developer');
      filter.applyFilterToTable(div);
      expect(filter.getVisibleRowCount(div)).toBe(1);
      
      // Filter for 'e' should match multiple rows (contains 'e')
      filter.setFilter('e');
      filter.applyFilterToTable(div);
      expect(filter.getVisibleRowCount(div)).toBe(3);
    });
  });

  describe('getTotalRowCount', () => {
    it('should return 0 when no tbody exists', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table></table>';
      expect(filter.getTotalRowCount(div)).toBe(0);
    });

    it('should return total number of rows', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td></tr>
            <tr><td>Bob</td></tr>
          </tbody>
        </table>
      `;
      expect(filter.getTotalRowCount(div)).toBe(2);
    });
  });

  describe('applyFilterToTable', () => {
    it('should hide rows that do not match the filter', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td></tr>
            <tr><td>Bob</td></tr>
          </tbody>
        </table>
      `;
      
      filter.setFilter('Alice');
      filter.applyFilterToTable(div);
      
      const rows = div.querySelectorAll('tbody tr');
      expect((rows[0] as HTMLElement).style.display).toBe('');
      expect((rows[1] as HTMLElement).style.display).toBe('none');
    });

    it('should show all rows when no filter is active', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <table>
          <tbody>
            <tr><td>Alice</td></tr>
            <tr><td>Bob</td></tr>
          </tbody>
        </table>
      `;
      
      filter.clearFilter();
      filter.applyFilterToTable(div);
      
      const rows = div.querySelectorAll('tbody tr');
      expect((rows[0] as HTMLElement).style.display).toBe('');
      expect((rows[1] as HTMLElement).style.display).toBe('');
    });
  });

  describe('highlightMatches', () => {
    it('should wrap matching text in highlight spans', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table><tbody><tr><td>Alice Johnson</td></tr></tbody></table>';
      
      filter.setFilter('Alice');
      filter.highlightMatches(div, 'test-highlight');
      
      const cell = div.querySelector('td');
      expect(cell?.innerHTML).toContain('<span class="test-highlight">Alice</span>');
    });

    it('should handle case-insensitive highlighting', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table><tbody><tr><td>ALICE</td></tr></tbody></table>';
      
      filter.setFilter('alice');
      filter.highlightMatches(div, 'test-highlight');
      
      const cell = div.querySelector('td');
      expect(cell?.innerHTML).toContain('<span class="test-highlight">ALICE</span>');
    });

    it('should highlight multiple terms', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table><tbody><tr><td>Alice Developer</td></tr></tbody></table>';
      
      filter.setFilter('Alice Developer');
      filter.highlightMatches(div, 'test-highlight');
      
      const cell = div.querySelector('td');
      expect(cell?.innerHTML).toContain('test-highlight">Alice</span>');
      expect(cell?.innerHTML).toContain('test-highlight">Developer</span>');
    });

    it('should remove highlights when filter is cleared', () => {
      const div = document.createElement('div');
      div.innerHTML = '<table><tbody><tr><td><span class="test-highlight">Alice</span> Johnson</td></tr></tbody></table>';
      
      filter.clearFilter();
      filter.highlightMatches(div, 'test-highlight');
      
      const cell = div.querySelector('td');
      expect(cell?.innerHTML).not.toContain('class="test-highlight"');
      expect(cell?.textContent).toBe('Alice Johnson');
    });
  });
});
