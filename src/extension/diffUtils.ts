/**
 * Diff Utilities Module
 * 
 * Provides diff computation for version history comparison.
 * Uses the 'diff' package for computing differences between text versions.
 */
import * as Diff from 'diff';

/**
 * Represents a change in the diff
 */
export interface DiffChange {
  /** Type of change: 'added', 'removed', or 'unchanged' */
  type: 'added' | 'removed' | 'unchanged';
  /** The text content of this change */
  value: string;
  /** Line number in the old text (for removed/unchanged) */
  oldLineNumber?: number;
  /** Line number in the new text (for added/unchanged) */
  newLineNumber?: number;
}

/**
 * Represents a diff between two text versions
 */
export interface DiffResult {
  /** Array of changes between the two versions */
  changes: DiffChange[];
  /** Statistics about the diff */
  stats: {
    /** Number of lines added */
    added: number;
    /** Number of lines removed */
    removed: number;
    /** Number of lines unchanged */
    unchanged: number;
  };
}

/**
 * Compute a line-by-line diff between two text strings
 * 
 * @param oldText - The original text
 * @param newText - The modified text
 * @returns DiffResult containing changes and statistics
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  const changes: DiffChange[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  
  // Normalize inputs to ensure they end with newlines for consistent line counting
  const normalizedOld = oldText.endsWith('\n') ? oldText : oldText + '\n';
  const normalizedNew = newText.endsWith('\n') ? newText : newText + '\n';
  
  // Use diffLines to compute line-by-line differences
  const diffResult = Diff.diffLines(normalizedOld, normalizedNew, {
    ignoreWhitespace: false,
    newlineIsToken: true
  });
  
  let oldLine = 1;
  let newLine = 1;
  
  for (const part of diffResult) {
    if (part.added) {
      changes.push({
        type: 'added',
        value: part.value,
        newLineNumber: newLine
      });
      // Count lines (each newline is a line, plus 1 if doesn't end with newline)
      const lineCount = countLines(part.value);
      newLine += lineCount;
      added += lineCount;
    } else if (part.removed) {
      changes.push({
        type: 'removed',
        value: part.value,
        oldLineNumber: oldLine
      });
      const lineCount = countLines(part.value);
      oldLine += lineCount;
      removed += lineCount;
    } else {
      changes.push({
        type: 'unchanged',
        value: part.value,
        oldLineNumber: oldLine,
        newLineNumber: newLine
      });
      const lineCount = countLines(part.value);
      oldLine += lineCount;
      newLine += lineCount;
      unchanged += lineCount;
    }
  }
  
  return {
    changes,
    stats: { added, removed, unchanged }
  };
}

/**
 * Compute a word-by-word diff between two text strings
 * Good for inline diffs within lines
 * 
 * @param oldText - The original text
 * @param newText - The modified text
 * @returns Array of word-level changes
 */
export function computeWordDiff(oldText: string, newText: string): DiffChange[] {
  const changes: DiffChange[] = [];
  
  const diffResult = Diff.diffWords(oldText, newText);
  
  for (const part of diffResult) {
    if (part.added) {
      changes.push({
        type: 'added',
        value: part.value
      });
    } else if (part.removed) {
      changes.push({
        type: 'removed',
        value: part.value
      });
    } else {
      changes.push({
        type: 'unchanged',
        value: part.value
      });
    }
  }
  
  return changes;
}

/**
 * Compute a character-by-character diff between two text strings
 * Most detailed but can be verbose for large texts
 * 
 * @param oldText - The original text
 * @param newText - The modified text
 * @returns Array of character-level changes
 */
export function computeCharDiff(oldText: string, newText: string): DiffChange[] {
  const changes: DiffChange[] = [];
  
  const diffResult = Diff.diffChars(oldText, newText);
  
  for (const part of diffResult) {
    if (part.added) {
      changes.push({
        type: 'added',
        value: part.value
      });
    } else if (part.removed) {
      changes.push({
        type: 'removed',
        value: part.value
      });
    } else {
      changes.push({
        type: 'unchanged',
        value: part.value
      });
    }
  }
  
  return changes;
}

/**
 * Count the number of lines in a string
 * A line is counted for each newline character + 1 if the string doesn't end with newline
 */
function countLines(text: string): number {
  if (!text) return 0;
  const hasTrailingNewline = text.endsWith('\n');
  const lines = text.split('\n').length;
  // If text ends with newline, split gives us an extra empty string, so subtract 1
  // If it doesn't end with newline, we still count that final line
  return hasTrailingNewline ? lines - 1 : lines;
}

/**
 * Strip HTML tags from text for display in diff
 * Used when comparing HTML content to show readable diff
 * 
 * @param html - HTML string
 * @returns Plain text with HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two strings are equal
 */
export function areStringsEqual(a: string | null, b: string | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a === b;
}
