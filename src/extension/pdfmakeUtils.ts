/**
 * pdfmake integration utilities for PDF generation
 * 
 * This module provides:
 * - Page size configuration (A4, Letter, Legal, A3, A5)
 * - Margin configuration (top, right, bottom, left)
 * - Orientation options (portrait, landscape)
 * - pdfmake initialization and document generation
 */
import * as pdfmake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

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
  pdfmake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;
  
  // Set up default fonts
  pdfmake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };
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
): pdfmake.TDocumentDefinitions {
  const pageMargins: [number, number, number, number] = [
    config.margins.left,
    config.margins.top,
    config.margins.right,
    config.margins.bottom,
  ];

  const docDefinition: pdfmake.TDocumentDefinitions = {
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

  // Add footer if provided
  if (config.footer) {
    docDefinition.footer = {
      text: config.footer,
      alignment: 'center',
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  // Add page numbers if requested
  if (config.includePageNumbers) {
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
  onSuccess: (pdfData: Uint8Array) => void,
  onError: (error: Error) => void
): void {
  try {
    // Ensure pdfmake is initialized
    if (!pdfmake.vfs) {
      initializePdfMake();
    }

    // Create document definition
    const docDefinition = createPdfDocumentDefinition(config, htmlContent);

    // Generate PDF
    const pdfDoc = pdfmake.createPdf(docDefinition);
    
    pdfDoc.getBytes().then(
      (pdfData: Uint8Array) => {
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
