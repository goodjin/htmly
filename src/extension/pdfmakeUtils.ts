/**
 * pdfmake integration utilities for PDF generation
 * 
 * This module provides:
 * - Page size configuration (A4, Letter, Legal, A3, A5)
 * - Margin configuration (top, right, bottom, left)
 * - Orientation options (portrait, landscape)
 * - pdfmake initialization and document generation
 */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Type definitions for pdfmake - using any since @types/pdfmake doesn't export them properly
type TDocumentDefinitions = Parameters<typeof pdfMake.createPdf>[0];
type TVirtualFileSystem = { [key: string]: string };

// Type definitions for pdfmake configuration
export type PdfPageSize = 'A4' | 'LETTER' | 'LEGAL' | 'A3' | 'A5' | 'TABLOID' | [number, number];

export interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfMakeConfig {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  margins: PdfMargins;
  header?: string;
  footer?: string;
  includePageNumbers?: boolean;
}

// Standard page sizes in points (1 point = 1/72 inch)
const PAGE_SIZES: Record<string, [number, number]> = {
  'A4': [595.28, 841.89],
  'A3': [841.89, 1190.55],
  'A5': [419.53, 595.28],
  'LETTER': [612, 792],
  'LEGAL': [612, 1008],
  'TABLOID': [792, 1224],
};

// Default configuration values
const DEFAULT_PAGE_SIZE: PdfPageSize = 'A4';
const DEFAULT_ORIENTATION: PdfOrientation = 'portrait';
const DEFAULT_MARGINS: PdfMargins = {
  top: 70,
  right: 70,
  bottom: 70,
  left: 70,
};

/**
 * Initialize pdfmake with standard fonts
 * Should be called once when the extension activates
 */
export function initializePdfMake(): void {
  // Initialize pdfmake with virtual file system fonts
  // pdfFonts can have vfs directly or via pdfMake property depending on build
  const vfs = (pdfFonts as { vfs?: unknown; pdfMake?: { vfs?: unknown } }).vfs || (pdfFonts as { pdfMake?: { vfs?: unknown } }).pdfMake?.vfs;
  pdfMake.addVirtualFileSystem(vfs as TVirtualFileSystem);
  
  // Set up default fonts
  pdfMake.setFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
}

/**
 * Get page size dimensions in points
 * @param pageSize - Named page size (A4, LETTER, etc.) or custom [width, height]
 * @returns [width, height] in points
 */
export function getPageSizeDimensions(pageSize: PdfPageSize): [number, number] {
  if (Array.isArray(pageSize)) {
    return pageSize;
  }
  
  const dimensions = PAGE_SIZES[pageSize];
  if (!dimensions) {
    // Default to A4 if unknown
    return PAGE_SIZES['A4'];
  }
  
  return dimensions;
}

/**
 * Create a pdfmake configuration object with defaults applied
 * @param config - Partial configuration object
 * @returns Complete PdfMakeConfig with defaults
 */
export function createPdfMakeConfig(config: Partial<PdfMakeConfig> = {}): PdfMakeConfig {
  return {
    pageSize: config.pageSize ?? DEFAULT_PAGE_SIZE,
    orientation: config.orientation ?? DEFAULT_ORIENTATION,
    margins: config.margins ?? { ...DEFAULT_MARGINS },
    header: config.header,
    footer: config.footer,
    includePageNumbers: config.includePageNumbers ?? false,
  };
}

/**
 * Create a pdfmake document definition
 * @param config - PDF configuration
 * @param content - HTML content to convert
 * @returns pdfmake document definition object
 */
export function createPdfDocumentDefinition(
  config: PdfMakeConfig,
  content: string
): TDocumentDefinitions {
  const pageMargins: [number, number, number, number] = [
    config.margins.left,
    config.margins.top,
    config.margins.right,
    config.margins.bottom,
  ];

  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        text: content,
        style: 'htmlContent',
      },
    ],
    pageSize: Array.isArray(config.pageSize) 
      ? { width: config.pageSize[0], height: config.pageSize[1] }
      : config.pageSize,
    pageOrientation: config.orientation,
    pageMargins,
    styles: {
      htmlContent: {
        fontSize: 12,
        lineHeight: 1.5,
      },
    },
  };

  // Add header if provided
  if (config.header) {
    docDefinition.header = {
      text: config.header,
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  // Add footer with page numbers if both are configured
  if (config.footer && config.includePageNumbers) {
    // Use columns to show both footer text and page numbers side by side
    docDefinition.footer = {
      columns: [
        {
          text: config.footer,
          alignment: 'left',
          margin: [0, 0, 10, 0] as [number, number, number, number],
        },
        {
          text: 'Page {current-page} of {total-pages}',
          alignment: 'right',
          margin: [0, 0, 0, 0] as [number, number, number, number],
        },
      ],
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  } else if (config.footer) {
    docDefinition.footer = {
      text: config.footer,
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  } else if (config.includePageNumbers) {
    docDefinition.footer = {
      text: 'Page {current-page} of {total-pages}',
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  return docDefinition;
}

/**
 * Create a PDF from HTML content
 * @param htmlContent - HTML string to convert to PDF
 * @param config - PDF configuration options
 * @param onSuccess - Callback with PDF binary data on success
 * @param onError - Callback with error on failure
 */
export function createPdfFromHtml(
  htmlContent: string,
  config: PdfMakeConfig,
  onSuccess: (pdfData: Buffer) => void,
  onError: (error: Error) => void
): void {
  try {
    // Ensure pdfmake is initialized
    initializePdfMake();

    // Create document definition
    const docDefinition = createPdfDocumentDefinition(config, htmlContent);

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    pdfDoc.getBuffer().then(
      (pdfData: Buffer) => {
        onSuccess(pdfData);
      },
      (err: Error) => {
        onError(err);
      }
    );
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Convert margins object to array format for pdfmake
 * @param margins - Margins object
 * @returns [left, top, right, bottom] array
 */
export function marginsToArray(margins: PdfMargins): [number, number, number, number] {
  return [margins.left, margins.top, margins.right, margins.bottom];
}

/**
 * Validate page size configuration
 * @param pageSize - Page size to validate
 * @returns true if valid, false otherwise
 */
export function isValidPageSize(pageSize: PdfPageSize): boolean {
  if (Array.isArray(pageSize)) {
    return pageSize.length === 2 && 
           typeof pageSize[0] === 'number' && 
           typeof pageSize[1] === 'number' &&
           pageSize[0] > 0 &&
           pageSize[1] > 0;
  }
  
  return pageSize in PAGE_SIZES;
}

/**
 * Validate orientation configuration
 * @param orientation - Orientation to validate
 * @returns true if valid, false otherwise
 */
export function isValidOrientation(orientation: string): boolean {
  return orientation === 'portrait' || orientation === 'landscape';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML-to-pdfmake Content Converter
// ═══════════════════════════════════════════════════════════════════════════════

// pdfmake content types for building document content
interface PdfMakeTextRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string;
  fontSize?: number;
}

type PdfMakeContent = PdfMakeTextRun | PdfMakeParagraph | PdfMakeTable | PdfMakeImage | PdfMakeList | string;

interface PdfMakeParagraph {
  text?: PdfMakeTextRun[];
  ul?: PdfMakeListItem[];
  ol?: PdfMakeListItem[];
  style?: string;
  pageBreak?: 'before' | 'after';
}

interface PdfMakeListItem {
  text: PdfMakeTextRun[];
}

interface PdfMakeTable {
  table: {
    headerRows: number;
    widths: (string | number)[];
    body: PdfMakeTableRow[];
  };
  layout?: string;
}

interface PdfMakeList {
  ul?: PdfMakeListItem[];
  ol?: PdfMakeListItem[];
}

interface PdfMakeTableRow {
  table: {
    widths: (string | number)[];
    body: PdfMakeTextRun[][];
  };
  layout?: string;
}

interface PdfMakeImage {
  image: string;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Check if a string is a data URI
 */
function isDataUri(str: string): boolean {
  return str.trim().toLowerCase().startsWith('data:');
}

/**
 * Decode HTML entities in text content
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
 * Strip HTML tags from a string
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

/**
 * Parse inline styles from a style attribute string
 */
function parseInlineStyles(styleAttr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleAttr) return styles;

  const declarations = styleAttr.split(';');
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) continue;
    const property = decl.slice(0, colonIndex).trim().toLowerCase();
    const value = decl.slice(colonIndex + 1).trim();
    if (property && value) {
      styles[property] = value;
    }
  }
  return styles;
}

/**
 * Convert inline formatting elements (strong, b, em, i, u, s, del, code, span) to TextRun
 */
function parseInlineFormatting(html: string): PdfMakeTextRun[] {
  const result: PdfMakeTextRun[] = [];
  const remaining = html;

  // Pattern to match inline elements
  const inlinePattern = /<(strong|b|em|i|u|s|del|code|span|mark|a)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<([^>\s]+)(?:\s+[^>]*)?\/>/gi;

  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(remaining)) !== null) {
    // Add text before this match
    const beforeText = remaining.slice(lastIndex, match.index);
    if (beforeText) {
      result.push({ text: decodeHtmlEntities(beforeText) });
    }

    const tagName = match[1] ? match[1].toLowerCase() : match[3] ? match[3].toLowerCase() : '';
    const content = match[2] || '';
    const fullMatch = match[0];

    // Handle self-closing tags (like <br/>, <hr/>)
    if (fullMatch.endsWith('/>') && !content) {
      if (tagName === 'br') {
        result.push({ text: '\n' });
      } else if (tagName === 'hr') {
        result.push({ text: '\n---\n' });
      }
    } else if (tagName === 'strong' || tagName === 'b') {
      // Bold
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, bold: true });
      }
    } else if (tagName === 'em' || tagName === 'i') {
      // Italic
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, italics: true });
      }
    } else if (tagName === 'u') {
      // Underline
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, underline: true });
      }
    } else if (tagName === 's' || tagName === 'del') {
      // Strikethrough
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, strike: true });
      }
    } else if (tagName === 'code') {
      // Inline code
      result.push({ text: decodeHtmlEntities(content), code: true });
    } else if (tagName === 'mark') {
      // Highlight
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, color: '#ffff00' });
      }
    } else if (tagName === 'a') {
      // Links - just include text (pdfmake links require special handling)
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push(child);
      }
    } else if (tagName === 'span') {
      // Span with potential inline styles
      // Extract style attribute
      const styleMatch = fullMatch.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        const styles = parseInlineStyles(styleMatch[1]);
        const children = parseInlineFormatting(content);
        for (const child of children) {
          if (styles['font-weight'] === 'bold' || styles['font-weight'] === '700') {
            child.bold = true;
          }
          if (styles['font-style'] === 'italic') {
            child.italics = true;
          }
          if (styles['text-decoration'] === 'underline') {
            child.underline = true;
          }
          if (styles['text-decoration'] === 'line-through') {
            child.strike = true;
          }
          result.push(child);
        }
      } else {
        result.push(...parseInlineFormatting(content));
      }
    } else {
      // Unknown tag, just process children
      result.push(...parseInlineFormatting(content));
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  const afterText = remaining.slice(lastIndex);
  if (afterText) {
    result.push({ text: decodeHtmlEntities(afterText) });
  }

  return result;
}

/**
 * Parse a single HTML element and convert to pdfmake content
 */
function parseHtmlElement(html: string): PdfMakeContent[] {
  const content: PdfMakeContent[] = [];
  
  // Remove XML declaration and doctype if present
  html = html.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove head element and its contents
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Extract body content if present
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // Remove html and body tags
  html = html.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '');

  // Process the HTML recursively
  const result = processHtmlNodes(html);
  content.push(...result);

  return content;
}

/**
 * Process HTML nodes and return pdfmake content array
 */
function processHtmlNodes(html: string): PdfMakeContent[] {
  const content: PdfMakeContent[] = [];
  
  // Normalize whitespace but preserve structure
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Match opening and closing tag pairs like <div>...</div>, <p>...</p>
  const pairedTagPattern = /<(h[1-6]|p|div|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|pre)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;

  let lastIndex = 0;
  let match;

  while ((match = pairedTagPattern.exec(html)) !== null) {
    // Add text before this match as a paragraph
    const beforeText = html.slice(lastIndex, match.index).trim();
    if (beforeText && !/^<[^>]*>$/.test(beforeText)) {
      const textRuns = parseInlineFormatting(beforeText);
      if (textRuns.length > 0) {
        content.push({ text: textRuns });
      }
    }

    const fullMatch = match[0];
    const tagName = (match[1] || match[2] || '').toLowerCase();

    if (tagName === 'h1') {
      // Heading 1
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 24;
      }
      content.push({ text: textRuns, style: 'heading1' });
    } else if (tagName === 'h2') {
      // Heading 2
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 20;
      }
      content.push({ text: textRuns, style: 'heading2' });
    } else if (tagName === 'h3') {
      // Heading 3
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 18;
      }
      content.push({ text: textRuns, style: 'heading3' });
    } else if (tagName === 'h4') {
      // Heading 4
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 16;
      }
      content.push({ text: textRuns, style: 'heading4' });
    } else if (tagName === 'h5') {
      // Heading 5
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 14;
      }
      content.push({ text: textRuns, style: 'heading5' });
    } else if (tagName === 'h6') {
      // Heading 6
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      for (const run of textRuns) {
        run.bold = true;
        run.fontSize = 12;
      }
      content.push({ text: textRuns, style: 'heading6' });
    } else if (tagName === 'p') {
      // Paragraph
      const textContent = stripHtmlTags(fullMatch);
      if (textContent.trim()) {
        const textRuns = parseInlineFormatting(textContent);
        content.push({ text: textRuns });
      }
    } else if (tagName === 'br') {
      // Line break
      content.push({ text: '\n' });
    } else if (tagName === 'hr') {
      // Horizontal rule
      content.push({ text: '\n---\n' });
    } else if (tagName === 'blockquote') {
      // Blockquote
      const textContent = stripHtmlTags(fullMatch);
      const textRuns = parseInlineFormatting(textContent);
      content.push({ text: textRuns, style: 'quote' });
    } else if (tagName === 'pre') {
      // Preformatted text / code block
      const codeContent = stripHtmlTags(fullMatch);
      content.push({ text: [{ text: codeContent, code: true }], style: 'code' });
    } else if (tagName === 'ul') {
      // Unordered list
      const listItems = parseListItems(fullMatch);
      if (listItems.length > 0) {
        content.push({ ul: listItems });
      }
    } else if (tagName === 'ol') {
      // Ordered list
      const listItems = parseListItems(fullMatch);
      if (listItems.length > 0) {
        content.push({ ol: listItems });
      }
    } else if (tagName === 'table') {
      // Table
      const tableContent = parseTable(fullMatch);
      if (tableContent) {
        content.push(tableContent);
      }
    } else if (tagName === 'div') {
      // Div - just process children
      const divContent = fullMatch.replace(/<\/?div[^>]*>/gi, '');
      const children = processHtmlNodes(divContent);
      content.push(...children);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text and process any void elements within it
  const remainingText = html.slice(lastIndex);
  if (remainingText.trim()) {
    // First, process any void elements (img, br, hr) in the remaining text
    const voidElementPattern = /<(img|br|hr)(?:\s+[^>]*?)>/gi;
    let voidMatch;
    const voidElements: { index: number; content: PdfMakeContent }[] = [];
    
    while ((voidMatch = voidElementPattern.exec(remainingText)) !== null) {
      const tagName = voidMatch[1].toLowerCase();
      let pdfContent: PdfMakeContent | null = null;
      
      if (tagName === 'br') {
        pdfContent = { text: '\n' };
      } else if (tagName === 'hr') {
        pdfContent = { text: '\n---\n' };
      } else if (tagName === 'img') {
        pdfContent = parseImage(voidMatch[0]);
      }
      
      if (pdfContent) {
        voidElements.push({ index: voidMatch.index, content: pdfContent });
      }
    }
    
    // If we found void elements, split the text around them
    if (voidElements.length > 0) {
      let lastIdx = 0;
      for (const ve of voidElements) {
        // Add text before this void element
        const textBefore = remainingText.slice(lastIdx, ve.index).trim();
        if (textBefore) {
          const textRuns = parseInlineFormatting(textBefore);
          if (textRuns.length > 0) {
            content.push({ text: textRuns });
          }
        }
        // Add the void element content
        content.push(ve.content);
        // Calculate the length of the void element tag
        const voidMatchResult = remainingText.slice(ve.index).match(/<[^>]+>/);
        const voidTagLength = voidMatchResult ? voidMatchResult[0].length : 0;
        lastIdx = ve.index + voidTagLength;
      }
      // Add remaining text after last void element
      const textAfter = remainingText.slice(lastIdx).trim();
      if (textAfter) {
        const textRuns = parseInlineFormatting(textAfter);
        if (textRuns.length > 0) {
          content.push({ text: textRuns });
        }
      }
    } else {
      // No void elements, just add the text
      const textRuns = parseInlineFormatting(remainingText.trim());
      if (textRuns.length > 0) {
        content.push({ text: textRuns });
      }
    }
  }

  return content;
}

/**
 * Parse list items from ul or ol
 */
function parseListItems(listHtml: string): PdfMakeListItem[] {
  const items: PdfMakeListItem[] = [];
  
  // Match li elements
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = liPattern.exec(listHtml)) !== null) {
    const liContent = match[1];
    const textContent = stripHtmlTags(liContent);
    const textRuns = parseInlineFormatting(textContent);
    items.push({ text: textRuns });
  }

  return items;
}

/**
 * Parse a table and convert to pdfmake table format
 */
function parseTable(tableHtml: string): PdfMakeTable | null {
  // Extract header rows
  const headerRows: PdfMakeTextRun[][] = [];
  const bodyRows: PdfMakeTextRun[][] = [];

  // Try to find thead
  const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const headerCells = extractTableCells(theadMatch[1], 'th');
    headerRows.push(...headerCells);
  }

  // Try to find tbody
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (tbodyMatch) {
    const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = extractTableCells(row, 'td');
      bodyRows.push(...cells);
    }
  }

  // If no tbody found, try to extract rows directly
  if (bodyRows.length === 0) {
    const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    let isFirstRow = true;
    for (const row of rows) {
      // First try to extract th cells (for header rows)
      let cells = extractTableCells(row, 'th');
      // If no th cells found, try td cells
      if (cells.length === 0) {
        cells = extractTableCells(row, 'td');
      }
      if (cells.length > 0) {
        if (isFirstRow && headerRows.length === 0) {
          headerRows.push(...cells);
        } else {
          bodyRows.push(...cells);
        }
        isFirstRow = false;
      }
    }
  }

  // If still no header, use first body row as header
  if (headerRows.length === 0 && bodyRows.length > 0) {
    headerRows.push(bodyRows.shift()!);
  }

  if (headerRows.length === 0 && bodyRows.length === 0) {
    return null;
  }

  // Calculate column widths (evenly distributed)
  const numCols = Math.max(
    headerRows.length > 0 ? headerRows[0].length : 0,
    bodyRows.length > 0 ? bodyRows[0].length : 0
  );

  const widths: (string | number)[] = Array(numCols).fill('*');

  // Build table structure with header and body
  const tableRows: PdfMakeTableRow[] = [];

  // Add header row
  if (headerRows.length > 0) {
    tableRows.push({
      table: {
        widths,
        body: headerRows,
      },
      layout: 'header',
    });
  }

  // Add body rows
  for (const row of bodyRows) {
    tableRows.push({
      table: {
        widths,
        body: [row],
      },
      layout: 'lightHorizontalLines',
    });
  }

  return {
    table: {
      headerRows: headerRows.length > 0 ? 1 : 0,
      widths,
      body: tableRows,
    },
    layout: 'noBorders',
  };
}

/**
 * Extract cells from a table row
 */
function extractTableCells(rowHtml: string, cellType: 'th' | 'td'): PdfMakeTextRun[][] {
  const cells: PdfMakeTextRun[][] = [];
  const pattern = new RegExp(`<${cellType}[^>]*>([\\s\\S]*?)<\\/${cellType}>`, 'gi');
  let match;

  while ((match = pattern.exec(rowHtml)) !== null) {
    const cellContent = match[1];
    const textContent = stripHtmlTags(cellContent);
    const textRuns = parseInlineFormatting(textContent);
    if (textRuns.length === 0) {
      cells.push([{ text: '' }]);
    } else {
      cells.push(textRuns);
    }
  }

  return cells;
}

/**
 * Parse an image element
 */
function parseImage(imgHtml: string): PdfMakeImage | null {
  // Extract src attribute
  const srcMatch = imgHtml.match(/src=["']([^"']*)["']/i);
  if (!srcMatch) {
    return null;
  }

  const src = srcMatch[1];

  // Extract width and height if present
  const widthMatch = imgHtml.match(/width=["']?(\d+)/i);
  const heightMatch = imgHtml.match(/height=["']?(\d+)/i);

  const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;
  const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

  // Check if it's a data URI
  if (isDataUri(src)) {
    // Extract base64 data from data URI
    const base64Match = src.match(/data:image\/\w+;base64,(.+)/i);
    if (base64Match) {
      return {
        image: base64Match[1],
        width,
        height,
        alignment: 'center',
      };
    }
  }

  // For non-data URI images, we can't embed them directly in PDF
  // Return null to skip the image
  return null;
}

/**
 * Convert HTML content to pdfmake document content array
 * @param html - HTML string to convert
 * @returns Array of pdfmake content objects
 */
export function convertHtmlToPdfMakeContent(html: string): PdfMakeContent[] {
  if (!html || typeof html !== 'string') {
    return [];
  }

  try {
    return parseHtmlElement(html);
  } catch (error) {
    console.error('Error converting HTML to PDF content:', error);
    // Return plain text on error
    return [{ text: [{ text: stripHtmlTags(html) }] }];
  }
}

/**
 * Create a pdfmake document definition from HTML content
 * Uses proper HTML-to-pdfmake conversion instead of raw text
 * @param config - PDF configuration
 * @param htmlContent - HTML content to convert
 * @returns pdfmake document definition object
 */
export function createPdfDocumentDefinitionFromHtml(
  config: PdfMakeConfig,
  htmlContent: string
): TDocumentDefinitions {
  const pageMargins: [number, number, number, number] = [
    config.margins.left,
    config.margins.top,
    config.margins.right,
    config.margins.bottom,
  ];

  // Convert HTML to pdfmake content
  const pdfContent = convertHtmlToPdfMakeContent(htmlContent);

  const docDefinition: TDocumentDefinitions = {
    content: pdfContent as unknown as TDocumentDefinitions['content'],
    pageSize: Array.isArray(config.pageSize)
      ? { width: config.pageSize[0], height: config.pageSize[1] }
      : config.pageSize,
    pageOrientation: config.orientation,
    pageMargins,
    styles: {
      heading1: {
        fontSize: 24,
        bold: true,
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      heading2: {
        fontSize: 20,
        bold: true,
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      heading3: {
        fontSize: 18,
        bold: true,
        margin: [0, 8, 0, 4] as [number, number, number, number],
      },
      heading4: {
        fontSize: 16,
        bold: true,
        margin: [0, 6, 0, 3] as [number, number, number, number],
      },
      heading5: {
        fontSize: 14,
        bold: true,
        margin: [0, 5, 0, 2] as [number, number, number, number],
      },
      heading6: {
        fontSize: 12,
        bold: true,
        margin: [0, 5, 0, 2] as [number, number, number, number],
      },
      quote: {
        italics: true,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      code: {
        font: 'Courier',
        fontSize: 10,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      htmlContent: {
        fontSize: 12,
        lineHeight: 1.5,
      },
    },
    defaultStyle: {
      fontSize: 12,
      lineHeight: 1.5,
    },
  };

  // Add header if provided
  if (config.header) {
    docDefinition.header = {
      text: config.header,
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  // Add footer with page numbers if both are configured
  if (config.footer && config.includePageNumbers) {
    // Use columns to show both footer text and page numbers side by side
    docDefinition.footer = {
      columns: [
        {
          text: config.footer,
          alignment: 'left',
          margin: [0, 0, 10, 0] as [number, number, number, number],
        },
        {
          text: 'Page {current-page} of {total-pages}',
          alignment: 'right',
          margin: [0, 0, 0, 0] as [number, number, number, number],
        },
      ],
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  } else if (config.footer) {
    docDefinition.footer = {
      text: config.footer,
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  } else if (config.includePageNumbers) {
    docDefinition.footer = {
      text: 'Page {current-page} of {total-pages}',
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  return docDefinition;
}

/**
 * Create a PDF from HTML content using proper HTML-to-pdfmake conversion
 * @param htmlContent - HTML string to convert to PDF
 * @param config - PDF configuration options
 * @param onSuccess - Callback with PDF binary data on success
 * @param onError - Callback with error on failure
 */
export function createPdfFromHtmlContent(
  htmlContent: string,
  config: PdfMakeConfig,
  onSuccess: (pdfData: Buffer) => void,
  onError: (error: Error) => void
): void {
  try {
    // Ensure pdfmake is initialized
    initializePdfMake();

    // Create document definition with proper HTML conversion
    const docDefinition = createPdfDocumentDefinitionFromHtml(config, htmlContent);

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    pdfDoc.getBuffer().then(
      (pdfData: Buffer) => {
        onSuccess(pdfData);
      },
      (err: Error) => {
        onError(err);
      }
    );
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}
