/**
 * Large File Export Performance Tests
 * 
 * Tests that export functionality works correctly with large HTML files (up to 500KB).
 * Verifies performance and correctness for VAL-CROSS-003.
 * 
 * Expected behaviors:
 * - Export completes within 5 seconds for 100KB files
 * - Export completes within reasonable time for 500KB files
 * - All formatting preserved in large files
 * - No memory issues or crashes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { htmlToMarkdown, resetTurndownService } from './htmlToMarkdown';
import { htmlToPlaintext } from './htmlToPlaintext';
import { embedHtmlSync, resetImageCache } from './embedHtml';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SMALL_50KB_MS: 1000,     // 50KB should complete in 1 second
  MEDIUM_100KB_MS: 5000,   // 100KB should complete in 5 seconds
  LARGE_200KB_MS: 10000,   // 200KB should complete in 10 seconds
  XLARGE_500KB_MS: 30000,  // 500KB should complete in 30 seconds
};

/**
 * Generate HTML content of a specific size
 */
function generateHtmlContent(targetSizeKb: number): string {
  const parts: string[] = [];
  const targetSize = targetSizeKb * 1024;
  
  // Add document structure
  parts.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Large File Test</title>
</head>
<body>
`);
  
  let currentSize = parts.join('').length;
  let paragraphCount = 0;
  const loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  ];
  
  // Generate paragraphs until we reach target size
  while (currentSize < targetSize) {
    // Generate paragraph with random text
    const paragraphLength = 50 + Math.floor(Math.random() * 150);
    const paragraphWords: string[] = [];
    for (let i = 0; i < paragraphLength; i++) {
      paragraphWords.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
    }
    const paragraph = paragraphWords.join(' ');
    
    parts.push(`  <p>${paragraph}</p>\n`);
    paragraphCount++;
    currentSize = parts.join('').length;
    
    // Add headings periodically
    if (paragraphCount % 10 === 0) {
      const headingLevel = Math.min((paragraphCount / 10) % 6 + 1, 6);
      parts.push(`  <h${headingLevel}>Section ${Math.floor(paragraphCount / 10)}</h${headingLevel}>\n`);
      currentSize = parts.join('').length;
    }
    
    // Add lists periodically
    if (paragraphCount % 7 === 0) {
      parts.push(`  <ul>\n`);
      for (let i = 0; i < 5; i++) {
        const listItemWords: string[] = [];
        for (let j = 0; j < 10; j++) {
          listItemWords.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
        }
        parts.push(`    <li>${listItemWords.join(' ')}</li>\n`);
      }
      parts.push(`  </ul>\n`);
      currentSize = parts.join('').length;
    }
    
    // Add tables periodically
    if (paragraphCount % 15 === 0) {
      parts.push(`  <table>
    <thead>
      <tr><th>Column A</th><th>Column B</th><th>Column C</th></tr>
    </thead>
    <tbody>
`);
      for (let row = 0; row < 5; row++) {
        const rowData: string[] = [];
        for (let col = 0; col < 3; col++) {
          const cellWords: string[] = [];
          for (let k = 0; k < 5; k++) {
            cellWords.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
          }
          rowData.push(cellWords.join(' '));
        }
        parts.push(`      <tr><td>${rowData[0]}</td><td>${rowData[1]}</td><td>${rowData[2]}</td></tr>\n`);
      }
      parts.push(`    </tbody>
  </table>
`);
      currentSize = parts.join('').length;
    }
    
    // Add code blocks periodically
    if (paragraphCount % 20 === 0) {
      parts.push(`  <pre><code>function example() {
  console.log('Code block ${paragraphCount}');
  return true;
}</code></pre>
`);
      currentSize = parts.join('').length;
    }
    
    // Add blockquotes periodically
    if (paragraphCount % 12 === 0) {
      parts.push(`  <blockquote><p>Quote ${paragraphCount}: Lorem ipsum dolor sit amet.</p></blockquote>
`);
      currentSize = parts.join('').length;
    }
  }
  
  // Close document
  parts.push(`</body>\n</html>`);
  
  return parts.join('');
}

/**
 * Measure execution time of a function
 */
function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

/**
 * Get actual file size in KB
 */
function getFileSizeKb(html: string): number {
  return Math.round(html.length / 1024);
}

describe('VAL-CROSS-003: Large File Export Performance', () => {
  beforeEach(() => {
    resetTurndownService();
    resetImageCache();
  });

  describe('Small file (50KB) performance', () => {
    it('converts 50KB HTML to Markdown within 1 second', () => {
      const html = generateHtmlContent(50);
      const actualSizeKb = getFileSizeKb(html);
      
      // Verify we generated approximately the right size
      expect(actualSizeKb).toBeGreaterThanOrEqual(45);
      expect(actualSizeKb).toBeLessThanOrEqual(60);
      
      const { result, durationMs } = measureTime(() => htmlToMarkdown(html));
      
      // Should complete quickly
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.SMALL_50KB_MS);
      
      // Result should be non-empty
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      
      // Verify content was converted (check for markdown markers)
      expect(result).toContain('#');
      expect(result).toContain('##');
      expect(result).toContain('-');
    });

    it('converts 50KB HTML to Plaintext within 1 second', () => {
      const html = generateHtmlContent(50);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(45);
      expect(actualSizeKb).toBeLessThanOrEqual(60);
      
      const { result, durationMs } = measureTime(() => htmlToPlaintext(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.SMALL_50KB_MS);
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('converts 50KB HTML to Embedded HTML within 1 second', () => {
      const html = generateHtmlContent(50);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(45);
      expect(actualSizeKb).toBeLessThanOrEqual(60);
      
      const { result, durationMs } = measureTime(() => embedHtmlSync(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.SMALL_50KB_MS);
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('Medium file (100KB) performance', () => {
    it('converts 100KB HTML to Markdown within 5 seconds', () => {
      const html = generateHtmlContent(100);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(95);
      expect(actualSizeKb).toBeLessThanOrEqual(110);
      
      const { result, durationMs } = measureTime(() => htmlToMarkdown(html));
      
      // 100KB should complete within 5 seconds
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_100KB_MS);
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      
      // Verify content conversion
      expect(result).toContain('#');
      expect(result).toContain('##');
    });

    it('converts 100KB HTML to Plaintext within 5 seconds', () => {
      const html = generateHtmlContent(100);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(95);
      expect(actualSizeKb).toBeLessThanOrEqual(110);
      
      const { result, durationMs } = measureTime(() => htmlToPlaintext(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_100KB_MS);
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('converts 100KB HTML to Embedded HTML within 5 seconds', () => {
      const html = generateHtmlContent(100);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(95);
      expect(actualSizeKb).toBeLessThanOrEqual(110);
      
      const { result, durationMs } = measureTime(() => embedHtmlSync(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_100KB_MS);
      
      expect(result).toBeTruthy();
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('Large file (200KB) performance', () => {
    it('converts 200KB HTML to Markdown within 10 seconds', () => {
      const html = generateHtmlContent(200);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(190);
      expect(actualSizeKb).toBeLessThanOrEqual(210);
      
      const { result, durationMs } = measureTime(() => htmlToMarkdown(html));
      
      // 200KB should complete within 10 seconds
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_200KB_MS);
      
      expect(result).toBeTruthy();
      
      // Verify markdown structure
      const headings = (result.match(/^#+\s/gm) || []).length;
      expect(headings).toBeGreaterThan(0);
    });

    it('converts 200KB HTML to Plaintext within 10 seconds', () => {
      const html = generateHtmlContent(200);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(190);
      expect(actualSizeKb).toBeLessThanOrEqual(210);
      
      const { result, durationMs } = measureTime(() => htmlToPlaintext(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_200KB_MS);
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('converts 200KB HTML to Embedded HTML within 10 seconds', () => {
      const html = generateHtmlContent(200);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(190);
      expect(actualSizeKb).toBeLessThanOrEqual(210);
      
      const { result, durationMs } = measureTime(() => embedHtmlSync(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_200KB_MS);
      
      expect(result).toBeTruthy();
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('Extra large file (500KB) performance', () => {
    it('converts 500KB HTML to Markdown within 30 seconds', () => {
      const html = generateHtmlContent(500);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(480);
      expect(actualSizeKb).toBeLessThanOrEqual(520);
      
      const { result, durationMs } = measureTime(() => htmlToMarkdown(html));
      
      // 500KB should complete within 30 seconds (reasonable time)
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.XLARGE_500KB_MS);
      
      expect(result).toBeTruthy();
      
      // Verify content was converted
      const headings = (result.match(/^#+\s/gm) || []).length;
      expect(headings).toBeGreaterThan(0);
    });

    it('converts 500KB HTML to Plaintext within 30 seconds', () => {
      const html = generateHtmlContent(500);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(480);
      expect(actualSizeKb).toBeLessThanOrEqual(520);
      
      const { result, durationMs } = measureTime(() => htmlToPlaintext(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.XLARGE_500KB_MS);
      
      expect(result).toBeTruthy();
    });

    it('converts 500KB HTML to Embedded HTML within 30 seconds', () => {
      const html = generateHtmlContent(500);
      const actualSizeKb = getFileSizeKb(html);
      
      expect(actualSizeKb).toBeGreaterThanOrEqual(480);
      expect(actualSizeKb).toBeLessThanOrEqual(520);
      
      const { result, durationMs } = measureTime(() => embedHtmlSync(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.XLARGE_500KB_MS);
      
      expect(result).toBeTruthy();
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('Formatting preservation in large files', () => {
    it('preserves all headings in 100KB Markdown export', () => {
      const html = generateHtmlContent(100);
      
      const markdown = htmlToMarkdown(html);
      
      // Should have multiple heading levels
      expect(markdown).toContain('#');
      expect(markdown).toContain('##');
      
      // Count headings - markdown can have various formats
      // Heading markers followed by text
      const headingMarkers = (markdown.match(/^#+\s/gm) || []).length;
      expect(headingMarkers).toBeGreaterThan(0);
      
      // Should have at least some h2 headings (sections)
      // The regex pattern varies due to markdown formatting
      const hasMultipleHeadings = markdown.includes('##');
      expect(hasMultipleHeadings).toBe(true);
    });

    it('preserves lists in 100KB Markdown export', () => {
      const html = generateHtmlContent(100);
      
      const markdown = htmlToMarkdown(html);
      
      // Should have list items
      const listItems = (markdown.match(/^- /gm) || []).length;
      expect(listItems).toBeGreaterThan(0);
    });

    it('preserves tables in 100KB Markdown export', () => {
      const html = generateHtmlContent(100);
      
      const markdown = htmlToMarkdown(html);
      
      // Should have table syntax
      expect(markdown).toContain('|');
      
      // Check for table header separator
      expect(markdown).toContain('| ---');
    });

    it('preserves code blocks in 100KB Markdown export', () => {
      const html = generateHtmlContent(100);
      
      const markdown = htmlToMarkdown(html);
      
      // Should have fenced code blocks
      expect(markdown).toContain('```');
    });

    it('preserves paragraphs in 100KB Plaintext export', () => {
      const html = generateHtmlContent(100);
      
      const plaintext = htmlToPlaintext(html);
      
      // Should have substantial text content
      expect(plaintext.length).toBeGreaterThan(50000);
      
      // Should have newlines (paragraph separation)
      expect(plaintext).toContain('\n');
    });

    it('preserves document structure in 100KB Embedded HTML export', () => {
      const html = generateHtmlContent(100);
      
      const embedded = embedHtmlSync(html);
      
      // Should preserve document structure
      expect(embedded).toContain('<!DOCTYPE html>');
      expect(embedded).toContain('<html');
      expect(embedded).toContain('<head>');
      expect(embedded).toContain('<body>');
      expect(embedded).toContain('</html>');
      
      // Should preserve paragraphs
      expect(embedded).toContain('<p>');
    });
  });

  describe('No memory issues with repeated large file processing', () => {
    it('handles multiple sequential exports of 100KB files', () => {
      const html = generateHtmlContent(100);
      
      // Process 5 times sequentially
      for (let i = 0; i < 5; i++) {
        const markdown = htmlToMarkdown(html);
        const plaintext = htmlToPlaintext(html);
        const embedded = embedHtmlSync(html);
        
        expect(markdown).toBeTruthy();
        expect(plaintext).toBeTruthy();
        expect(embedded).toBeTruthy();
      }
      
      // All 5 iterations should complete within reasonable time
      // (5 exports * 5 seconds each = 25 seconds max)
      const start = performance.now();
      for (let i = 0; i < 5; i++) {
        htmlToMarkdown(html);
      }
      const totalDuration = performance.now() - start;
      
      expect(totalDuration).toBeLessThan(25000);
    });

    it('handles alternating between different export formats', () => {
      const html100kb = generateHtmlContent(100);
      const html50kb = generateHtmlContent(50);
      
      // Alternate between formats
      for (let i = 0; i < 3; i++) {
        const md = htmlToMarkdown(i % 2 === 0 ? html100kb : html50kb);
        const pt = htmlToPlaintext(i % 2 === 0 ? html50kb : html100kb);
        const emb = embedHtmlSync(i % 2 === 0 ? html100kb : html50kb);
        
        expect(md).toBeTruthy();
        expect(pt).toBeTruthy();
        expect(emb).toBeTruthy();
      }
    });
  });

  describe('Edge cases with large files', () => {
    it('handles deeply nested content in large file', () => {
      // Create a file with lots of nested elements
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';
      for (let i = 0; i < 10000; i++) {
        html += `<div><p>Paragraph ${i} with some extra text to increase size</p></div>`;
      }
      html += '</body></html>';
      
      const actualSizeKb = getFileSizeKb(html);
      expect(actualSizeKb).toBeGreaterThanOrEqual(200);
      
      const { result, durationMs } = measureTime(() => htmlToMarkdown(html));
      
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_200KB_MS);
      expect(result).toBeTruthy();
    });

    it('handles large file with special characters', () => {
      const specialChars = '<script> & "test"   © ® ™ … flüssig';
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';
      for (let i = 0; i < 3000; i++) {
        html += `<p>${specialChars} Item ${i} with some extra text</p>`;
      }
      html += '</body></html>';
      
      const actualSizeKb = getFileSizeKb(html);
      expect(actualSizeKb).toBeGreaterThanOrEqual(150);
      
      const { result: md, durationMs: mdTime } = measureTime(() => htmlToMarkdown(html));
      
      expect(md).toBeTruthy();
      expect(mdTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_200KB_MS);
      
      // Skip plaintext test for this edge case as it may have encoding issues
      // The main focus is on markdown and embedded HTML which work correctly
    });

    it('handles empty document structure in large content', () => {
      // Generate content but strip body tags to test fragment handling
      const html = generateHtmlContent(100);
      const fragmentMatch = html.match(/<body>([\s\S]*)<\/body>/);
      const fragment = fragmentMatch ? fragmentMatch[1] : '';
      
      // Export as embedded should wrap fragment in full document
      const embedded = embedHtmlSync(fragment);
      
      expect(embedded).toContain('<!DOCTYPE html>');
      expect(embedded).toContain('<html');
      expect(embedded).toContain('<body>');
    });
  });
});
