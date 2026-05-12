/**
 * docx library integration utilities for Word document generation
 * 
 * This module provides:
 * - Document factory for creating Word documents
 * - HTML to DOCX content conversion
 * - Basic formatting support (headings, bold, italic, lists, tables)
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  UnderlineType,
} from 'docx';

// Standard page sizes in points (1 inch = 72 points)
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  'A4': { width: 595.28, height: 841.89 },
  'LETTER': { width: 612, height: 792 },
  'LEGAL': { width: 612, height: 1008 },
  'A3': { width: 841.89, height: 1190.55 },
  'A5': { width: 419.53, height: 595.28 },
};

// Standard margins in inches
const DEFAULT_MARGINS = {
  top: 1,
  right: 1,
  bottom: 1,
  left: 1,
};

// Default page size
const DEFAULT_PAGE_SIZE = 'LETTER';
const DEFAULT_ORIENTATION: 'portrait' | 'landscape' = 'portrait';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type DocxPageSize = 'A4' | 'LETTER' | 'LEGAL' | 'A3' | 'A5';

export interface DocxMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type DocxOrientation = 'portrait' | 'landscape';

export interface DocxConfig {
  pageSize: DocxPageSize;
  orientation: DocxOrientation;
  margins: DocxMargins;
}

export interface DocxResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get page size dimensions in points
 */
export function getPageSizeDimensions(pageSize: DocxPageSize): { width: number; height: number } {
  const dimensions = PAGE_SIZES[pageSize];
  if (!dimensions) {
    return PAGE_SIZES['LETTER'];
  }
  return dimensions;
}

/**
 * Create a docx configuration object with defaults applied
 */
export function createDocxConfig(config: Partial<DocxConfig> = {}): DocxConfig {
  return {
    pageSize: config.pageSize ?? DEFAULT_PAGE_SIZE,
    orientation: config.orientation ?? DEFAULT_ORIENTATION,
    margins: config.margins ?? { ...DEFAULT_MARGINS },
  };
}

/**
 * Create a docx Document instance
 */
export function createDocxDocument(config: DocxConfig, content: (Paragraph | Table)[]): Document {
  const pageDimensions = getPageSizeDimensions(config.pageSize);
  
  // Swap width/height for landscape
  const width = config.orientation === 'landscape' ? pageDimensions.height : pageDimensions.width;
  const height = config.orientation === 'landscape' ? pageDimensions.width : pageDimensions.height;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(width / 72),
              height: convertInchesToTwip(height / 72),
            },
            margin: {
              top: convertInchesToTwip(config.margins.top),
              right: convertInchesToTwip(config.margins.right),
              bottom: convertInchesToTwip(config.margins.bottom),
              left: convertInchesToTwip(config.margins.left),
            },
          },
        },
        children: content,
      },
    ],
  });

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML to DOCX Content Converter
// ═══════════════════════════════════════════════════════════════════════════════

// Types for internal content representation
interface TextRunData {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
}

type ContentBlock = ParagraphData | TableData | string;

interface ParagraphData {
  type: 'paragraph';
  children: TextRunData[];
  headingLevel?: typeof HeadingLevel[keyof typeof HeadingLevel];
  alignment?: typeof AlignmentType[keyof typeof AlignmentType];
}

interface TableData {
  type: 'table';
  rows: TableRowData[];
}

interface TableRowData {
  cells: TextRunData[][];
  isHeader?: boolean;
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
 * Parse inline formatting from HTML content
 */
function parseInlineFormatting(html: string): TextRunData[] {
  const result: TextRunData[] = [];
  
  // Pattern to match inline elements
  const inlinePattern = /<(strong|b|em|i|u|s|del|code|span|mark|a)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<([^>\s]+)(?:\s+[^>]*)?\/>/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = inlinePattern.exec(html)) !== null) {
    // Add text before this match
    const beforeText = html.slice(lastIndex, match.index);
    if (beforeText) {
      result.push({ text: decodeHtmlEntities(beforeText) });
    }
    
    const tagName = match[1] ? match[1].toLowerCase() : match[3] ? match[3].toLowerCase() : '';
    const content = match[2] || '';
    const fullMatch = match[0];
    
    // Handle self-closing tags
    if (fullMatch.endsWith('/>') && !content) {
      if (tagName === 'br') {
        result.push({ text: '\n' });
      }
    } else if (tagName === 'strong' || tagName === 'b') {
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, bold: true });
      }
    } else if (tagName === 'em' || tagName === 'i') {
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, italics: true });
      }
    } else if (tagName === 'u') {
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, underline: true });
      }
    } else if (tagName === 's' || tagName === 'del') {
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child, strike: true });
      }
    } else if (tagName === 'code') {
      result.push({ text: decodeHtmlEntities(content), code: true });
    } else if (tagName === 'mark') {
      const children = parseInlineFormatting(content);
      for (const child of children) {
        result.push({ ...child });
      }
    } else if (tagName === 'a') {
      // Links - just include text
      const children = parseInlineFormatting(content);
      result.push(...children);
    } else if (tagName === 'span') {
      // Span - process children
      result.push(...parseInlineFormatting(content));
    } else {
      result.push(...parseInlineFormatting(content));
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  const afterText = html.slice(lastIndex);
  if (afterText) {
    result.push({ text: decodeHtmlEntities(afterText) });
  }
  
  return result;
}

/**
 * Convert parsed content to docx Paragraph
 */
function createParagraph(data: ParagraphData): Paragraph {
  const textRuns = data.children.map((child) => {
    const run = new TextRun({
      text: child.text,
      bold: child.bold,
      italics: child.italics,
      underline: child.underline ? { type: UnderlineType.SINGLE } : undefined,
      strike: child.strike,
      font: child.code ? 'Courier New' : undefined,
    });
    return run;
  });
  
  return new Paragraph({
    children: textRuns,
    heading: data.headingLevel,
    alignment: data.alignment,
  });
}

/**
 * Convert table data to docx Table
 */
function createTable(data: TableData): Table {
  const rows = data.rows.map((rowData) => {
    const cells = rowData.cells.map((cellData) => {
      const cellParagraphs = cellData.map((textData) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: textData.text,
              bold: textData.bold,
              italics: textData.italics,
              underline: textData.underline ? { type: UnderlineType.SINGLE } : undefined,
              strike: textData.strike,
            }),
          ],
        });
      });
      
      return new TableCell({
        children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [] })],
        shading: rowData.isHeader ? {
          fill: 'E0E0E0',
          type: ShadingType.CLEAR,
        } : undefined,
        margins: {
          top: convertInchesToTwip(0.05),
          bottom: convertInchesToTwip(0.05),
          left: convertInchesToTwip(0.05),
          right: convertInchesToTwip(0.05),
        },
      });
    });
    
    return new TableRow({
      children: cells,
      tableHeader: rowData.isHeader,
    });
  });
  
  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

/**
 * Parse HTML content to document blocks
 */
function parseHtmlContent(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  
  // Remove XML declaration and doctype
  html = html.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Remove head element
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }
  
  // Remove html and body tags
  html = html.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '');
  
  // Match paired tags
  const pairedTagPattern = /<(h[1-6]|p|div|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|pre)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = pairedTagPattern.exec(html)) !== null) {
    // Add text before this match
    const beforeText = html.slice(lastIndex, match.index).trim();
    if (beforeText && !/^<[^>]*>$/.test(beforeText)) {
      const textRuns = parseInlineFormatting(beforeText);
      if (textRuns.length > 0) {
        blocks.push({ type: 'paragraph', children: textRuns });
      }
    }
    
    const fullMatch = match[0];
    const tagName = (match[1] || '').toLowerCase();
    const content = match[2];
    
    if (tagName === 'h1') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_1 });
    } else if (tagName === 'h2') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_2 });
    } else if (tagName === 'h3') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_3 });
    } else if (tagName === 'h4') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_4 });
    } else if (tagName === 'h5') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_5 });
    } else if (tagName === 'h6') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      blocks.push({ type: 'paragraph', children: textRuns, headingLevel: HeadingLevel.HEADING_6 });
    } else if (tagName === 'p') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      if (textRuns.length > 0) {
        blocks.push({ type: 'paragraph', children: textRuns });
      }
    } else if (tagName === 'blockquote') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      if (textRuns.length > 0) {
        blocks.push({ type: 'paragraph', children: textRuns });
      }
    } else if (tagName === 'pre') {
      const textRuns = parseInlineFormatting(stripHtmlTags(content));
      if (textRuns.length > 0) {
        blocks.push({ type: 'paragraph', children: textRuns.map(t => ({ ...t, code: true })) });
      }
    } else if (tagName === 'ul') {
      const tableData = parseList(content, false);
      blocks.push(tableData);
    } else if (tagName === 'ol') {
      const tableData = parseList(content, true);
      blocks.push(tableData);
    } else if (tagName === 'table') {
      const tableData = parseTable(fullMatch);
      if (tableData) {
        blocks.push(tableData);
      }
    } else if (tagName === 'div') {
      // Process div content recursively
      const divContent = fullMatch.replace(/<\/?div[^>]*>/gi, '');
      const childBlocks = parseHtmlContent(divContent);
      blocks.push(...childBlocks);
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  const remainingText = html.slice(lastIndex).trim();
  if (remainingText) {
    const textRuns = parseInlineFormatting(remainingText);
    if (textRuns.length > 0) {
      blocks.push({ type: 'paragraph', children: textRuns });
    }
  }
  
  return blocks;
}

/**
 * Parse list content (ul or ol)
 */
function parseList(listHtml: string, _ordered: boolean): TableData {
  // Note: ordered parameter reserved for future use when differentiating bullet vs numbered lists
  void _ordered;
  const rows: TableRowData[] = [];
  
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  
  while ((match = liPattern.exec(listHtml)) !== null) {
    const liContent = match[1];
    const textRuns = parseInlineFormatting(stripHtmlTags(liContent));
    
    // For simplicity, we use a table with a single cell per list item
    rows.push({
      cells: [textRuns],
    });
  }
  
  return {
    type: 'table',
    rows,
  };
}

/**
 * Parse table HTML
 */
function parseTable(tableHtml: string): TableData | null {
  const rows: TableRowData[] = [];
  
  // Extract header cells
  const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const headerRow = parseTableRow(theadMatch[1], 'th', true);
    if (headerRow) {
      rows.push(headerRow);
    }
  }
  
  // Extract body rows
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (tbodyMatch) {
    const trPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    let trMatch;
    while ((trMatch = trPattern.exec(tbodyMatch[1])) !== null) {
      const row = parseTableRow(trMatch[0], 'td', false);
      if (row) {
        rows.push(row);
      }
    }
  }
  
  // If no tbody, try to extract rows directly
  if (rows.length === 0) {
    const trPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    let trMatch;
    let isFirst = true;
    while ((trMatch = trPattern.exec(tableHtml)) !== null) {
      const row = parseTableRow(trMatch[0], 'td', isFirst);
      if (row) {
        rows.push(row);
      }
      isFirst = false;
    }
  }
  
  if (rows.length === 0) {
    return null;
  }
  
  return {
    type: 'table',
    rows,
  };
}

/**
 * Parse a table row
 */
function parseTableRow(rowHtml: string, cellType: 'th' | 'td', isHeader: boolean): TableRowData | null {
  const cells: TextRunData[][] = [];
  
  const cellPattern = new RegExp(`<${cellType}[^>]*>([\\s\\S]*?)<\\/${cellType}>`, 'gi');
  let match;
  
  while ((match = cellPattern.exec(rowHtml)) !== null) {
    const cellContent = match[1];
    const textRuns = parseInlineFormatting(stripHtmlTags(cellContent));
    cells.push(textRuns.length > 0 ? textRuns : [{ text: '' }]);
  }
  
  if (cells.length === 0) {
    return null;
  }
  
  return {
    cells,
    isHeader,
  };
}

/**
 * Convert HTML content to docx Paragraph array
 */
export function convertHtmlToDocxContent(html: string): (Paragraph | Table)[] {
  if (!html || typeof html !== 'string') {
    return [new Paragraph({ children: [] })];
  }
  
  try {
    const blocks = parseHtmlContent(html);
    
    return blocks.map((block) => {
      if (typeof block === 'string') {
        return new Paragraph({
          children: [new TextRun({ text: block })],
        });
      }
      
      if (block.type === 'table') {
        return createTable(block);
      }
      
      return createParagraph(block);
    });
  } catch (error) {
    console.error('Error converting HTML to DOCX content:', error);
    return [
      new Paragraph({
        children: [new TextRun({ text: 'Error converting content to DOCX' })],
      }),
    ];
  }
}

/**
 * Create a DOCX document from HTML content
 */
export function createDocxFromHtml(
  htmlContent: string,
  config: Partial<DocxConfig> = {}
): Promise<DocxResult> {
  return new Promise((resolve) => {
    try {
      const fullConfig = createDocxConfig(config);
      const paragraphs = convertHtmlToDocxContent(htmlContent);
      const doc = createDocxDocument(fullConfig, paragraphs);
      
      Packer.toBuffer(doc).then(
        (buffer: Uint8Array) => {
          resolve({
            success: true,
            data: buffer,
          });
        },
        (err: Error) => {
          resolve({
            success: false,
            error: err.message,
          });
        }
      );
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Validate page size configuration
 */
export function isValidDocxPageSize(pageSize: string): boolean {
  return pageSize in PAGE_SIZES;
}

/**
 * Validate orientation configuration
 */
export function isValidDocxOrientation(orientation: string): boolean {
  return orientation === 'portrait' || orientation === 'landscape';
}

/**
 * Validate margins configuration
 */
export function isValidDocxMargins(margins: Partial<DocxMargins>): boolean {
  const values = [margins.top, margins.right, margins.bottom, margins.left];
  return values.every((v) => v === undefined || (typeof v === 'number' && v >= 0));
}
