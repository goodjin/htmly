/**
 * HTML to Plain Text converter.
 * Strips HTML tags while preserving text structure and formatting.
 */

import { JSDOM } from 'jsdom';

/**
 * Decode HTML entities to their character equivalents.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&trade;/g, '\u2122')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019');
}

/**
 * Strip HTML tags from text content.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Convert an HTML DOM node to plain text.
 */
function nodeToPlainText(node: Node, result: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    // Preserve whitespace in text nodes but trim appropriately
    let text = node.textContent || '';
    // Normalize whitespace but preserve intentional spaces
    text = text.replace(/[ \t]+/g, ' ');
    result.push(text);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Block-level elements that need newlines before/after
    const blockElements = [
      'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
      'table', 'tr', 'td', 'th', 'thead', 'tbody', 'section',
      'article', 'header', 'footer', 'nav', 'aside', 'main',
      'br', 'hr', 'figure', 'figcaption', 'address'
    ];

    // Handle special block elements
    switch (tagName) {
      case 'br':
        result.push('\n');
        return;
      case 'hr':
        result.push('\n\n');
        return;
      case 'p':
      case 'div':
        // Add blank line before and after
        result.push('\n\n');
        processChildren(element, result);
        result.push('\n\n');
        return;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        result.push('\n\n');
        processChildren(element, result);
        result.push('\n\n');
        return;
      case 'blockquote':
        result.push('\n\n');
        processChildren(element, result);
        result.push('\n\n');
        return;
      case 'pre':
        result.push('\n\n');
        // Preserve whitespace in pre blocks
        const preText = element.textContent || '';
        result.push(preText);
        result.push('\n\n');
        return;
      case 'ul':
      case 'ol':
        result.push('\n\n');
        processChildren(element, result);
        result.push('\n\n');
        return;
      case 'li':
        result.push('\n\u2022 ');
        processChildren(element, result);
        return;
      case 'table':
        result.push('\n\n');
        processTable(element, result);
        result.push('\n\n');
        return;
      case 'a':
        // Convert links to "text (url)" format
        const href = element.getAttribute('href') || '';
        const linkText = element.textContent?.trim() || '';
        if (href && linkText) {
          result.push(linkText + ' (' + href + ')');
        } else if (linkText) {
          result.push(linkText);
        }
        return;
      case 'img':
        // Convert images to "[alt text]" or "[image]" format
        const alt = element.getAttribute('alt') || '';
        const src = element.getAttribute('src') || '';
        if (alt) {
          result.push('[' + alt + ']');
        } else if (src) {
          result.push('[image: ' + src + ']');
        }
        return;
      case 'strong':
      case 'b':
        // Bold text - preserve as plain text (no markup)
        processChildren(element, result);
        return;
      case 'em':
      case 'i':
        // Italic text - preserve as plain text (no markup)
        processChildren(element, result);
        return;
      case 'u':
        // Underlined text - preserve as plain text
        processChildren(element, result);
        return;
      case 's':
      case 'del':
      case 'strike':
        // Strikethrough text - preserve as plain text
        processChildren(element, result);
        return;
      case 'mark':
        // Highlighted text - preserve as plain text
        processChildren(element, result);
        return;
      case 'code':
        // Inline code - preserve content
        const codeText = element.textContent || '';
        result.push(codeText);
        return;
      case 'script':
      case 'style':
      case 'noscript':
        // Skip these elements entirely
        return;
      default:
        if (blockElements.includes(tagName)) {
          result.push('\n\n');
          processChildren(element, result);
          result.push('\n\n');
        } else {
          // Inline elements - just process children
          processChildren(element, result);
        }
    }
  }
}

/**
 * Process child nodes of an element.
 */
function processChildren(element: Element, result: string[]): void {
  const childNodes = element.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    nodeToPlainText(childNodes[i], result);
  }
}

/**
 * Process a table element to plain text.
 */
function processTable(table: Element, result: string[]): void {
  // Get all rows (from thead, tbody, or direct tr elements)
  const rows: Element[] = [];
  
  // Try thead first
  const thead = table.querySelector('thead');
  if (thead) {
    rows.push(...Array.from(thead.querySelectorAll('tr')));
  }
  
  // Then tbody
  const tbody = table.querySelector('tbody');
  if (tbody) {
    rows.push(...Array.from(tbody.querySelectorAll('tr')));
  }
  
  // Finally any direct tr elements (only if no thead/tbody)
  if (!thead && !tbody) {
    rows.push(...Array.from(table.querySelectorAll('tr')));
  }

  // If no structured table, try to get all tr elements
  if (rows.length === 0) {
    rows.push(...Array.from(table.querySelectorAll('tr')));
  }

  // If still no rows, try to get cells directly (for simple tables without rows)
  if (rows.length === 0) {
    const allCells = table.querySelectorAll('th, td');
    if (allCells.length > 0) {
      const cells: string[] = [];
      allCells.forEach((cell) => {
        cells.push(stripHtmlTags(cell.innerHTML).trim());
      });
      if (cells.length > 0) {
        result.push(cells.join(' | '));
      }
    }
    return;
  }

  let headerRowCount = 0;
  if (thead) {
    headerRowCount = thead.querySelectorAll('tr').length;
  }

  rows.forEach((row, rowIndex) => {
    const cells: string[] = [];
    // First headerRowCount rows are headers (use th), rest use td
    const useHeaderCells = rowIndex < headerRowCount;
    
    const cellElements = row.querySelectorAll(useHeaderCells ? 'th' : 'td');
    cellElements.forEach((cell) => {
      cells.push(stripHtmlTags(cell.innerHTML).trim());
    });
    
    // If no th/td found, try any cell
    if (cells.length === 0) {
      row.querySelectorAll('*').forEach((child) => {
        if (child.children.length === 0) {
          cells.push(stripHtmlTags(child.innerHTML).trim());
        }
      });
    }
    
    if (cells.length > 0) {
      result.push(cells.join(' | '));
    }
  });
}

/**
 * Convert HTML string to plain text.
 * @param html - The HTML string to convert
 * @returns The converted plain text string
 */
export function htmlToPlaintext(html: string): string {
  // Handle empty or null input
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First, decode HTML entities directly (before JSDOM parsing)
  // This handles standalone entities like &nbsp; that JSDOM may not process
  let text = decodeHtmlEntities(html);

  // Check if the result is purely whitespace (from entities like &nbsp;)
  // In this case, we want to preserve the space
  if (/^[ \t]+$/.test(text)) {
    return text;
  }

  // Parse HTML using JSDOM
  const dom = new JSDOM(text);
  const document = dom.window.document;

  // Convert the body content
  const result: string[] = [];
  
  if (document.body) {
    const bodyContent = document.body.innerHTML;
    // If body content is just whitespace/entity, return decoded text directly
    if (!bodyContent || bodyContent.trim() === '') {
      return text;
    }
    processChildren(document.body, result);
  } else {
    // If no body, try to parse the whole thing
    const tempDom = new JSDOM('<body>' + text + '</body>');
    processChildren(tempDom.window.document.body, result);
  }

  // Join and clean up the result
  text = result.join('');
  
  // Decode any remaining HTML entities that weren't processed by JSDOM
  text = decodeHtmlEntities(text);
  
  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  
  // Clean up excessive newlines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading and trailing whitespace/newlines
  text = text.trim();

  return text;
}
