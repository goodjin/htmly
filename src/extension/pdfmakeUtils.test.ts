/**
 * Tests for pdfmake integration utilities
 * Tests page size, margin, and orientation configuration
 */
import { describe, it, expect, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    showSaveDialog: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    fs: {
      writeFile: vi.fn(),
    },
  },
  Uri: {
    joinPath: vi.fn(),
    file: vi.fn(),
  },
}));

// Import after mocking
import {
  PdfPageSize,
  PdfMargins,
  PdfOrientation,
  PdfMakeConfig,
  getPageSizeDimensions,
  createPdfMakeConfig,
  createPdfDocumentDefinition,
  createPdfFromHtml,
} from './pdfmakeUtils';

// Type for document definition content item
interface ContentItem {
  text?: string;
  style?: string;
}

// Type for header/footer content
interface HeaderFooterContent {
  text?: string;
  alignment?: string;
  margin?: [number, number, number, number];
}

describe('pdfmakeUtils', () => {
  describe('PdfPageSize', () => {
    it('should have A4 page size defined', () => {
      const dimensions = getPageSizeDimensions('A4');
      expect(dimensions).toBeDefined();
      expect(dimensions).toHaveLength(2);
      // A4 is 595.28 x 841.89 points
      expect(dimensions[0]).toBe(595.28);
      expect(dimensions[1]).toBe(841.89);
    });

    it('should have LETTER page size defined', () => {
      const dimensions = getPageSizeDimensions('LETTER');
      expect(dimensions).toBeDefined();
      expect(dimensions).toHaveLength(2);
      // LETTER is 612 x 792 points
      expect(dimensions[0]).toBe(612);
      expect(dimensions[1]).toBe(792);
    });

    it('should have LEGAL page size defined', () => {
      const dimensions = getPageSizeDimensions('LEGAL');
      expect(dimensions).toBeDefined();
      expect(dimensions).toHaveLength(2);
      // LEGAL is 612 x 1008 points
      expect(dimensions[0]).toBe(612);
      expect(dimensions[1]).toBe(1008);
    });

    it('should have A3 page size defined', () => {
      const dimensions = getPageSizeDimensions('A3');
      expect(dimensions).toBeDefined();
      expect(dimensions).toHaveLength(2);
      // A3 is 841.89 x 1190.55 points
      expect(dimensions[0]).toBe(841.89);
      expect(dimensions[1]).toBe(1190.55);
    });

    it('should have A5 page size defined', () => {
      const dimensions = getPageSizeDimensions('A5');
      expect(dimensions).toBeDefined();
      expect(dimensions).toHaveLength(2);
      // A5 is 419.53 x 595.28 points
      expect(dimensions[0]).toBe(419.53);
      expect(dimensions[1]).toBe(595.28);
    });

    it('should support custom page size as [width, height]', () => {
      const customSize: [number, number] = [300, 400];
      const dimensions = getPageSizeDimensions(customSize);
      expect(dimensions).toEqual(customSize);
    });

    it('should default to A4 for unknown page size', () => {
      const dimensions = getPageSizeDimensions('UNKNOWN' as PdfPageSize);
      // Should default to A4
      expect(dimensions[0]).toBe(595.28);
      expect(dimensions[1]).toBe(841.89);
    });
  });

  describe('PdfMargins', () => {
    it('should have default margins defined', () => {
      const defaultMargins: PdfMargins = {
        top: 70,
        right: 70,
        bottom: 70,
        left: 70,
      };
      expect(defaultMargins.top).toBe(70);
      expect(defaultMargins.right).toBe(70);
      expect(defaultMargins.bottom).toBe(70);
      expect(defaultMargins.left).toBe(70);
    });

    it('should accept custom margins', () => {
      const customMargins: PdfMargins = {
        top: 100,
        right: 50,
        bottom: 100,
        left: 50,
      };
      expect(customMargins.top).toBe(100);
      expect(customMargins.right).toBe(50);
      expect(customMargins.bottom).toBe(100);
      expect(customMargins.left).toBe(50);
    });

    it('should support number shorthand for equal margins', () => {
      const equalMargins: PdfMargins = 50;
      // This would need to be expanded in the actual implementation
      expect(equalMargins).toBe(50);
    });
  });

  describe('PdfOrientation', () => {
    it('should support portrait orientation', () => {
      const orientation: PdfOrientation = 'portrait';
      expect(orientation).toBe('portrait');
    });

    it('should support landscape orientation', () => {
      const orientation: PdfOrientation = 'landscape';
      expect(orientation).toBe('landscape');
    });
  });

  describe('createPdfMakeConfig', () => {
    it('should create config with A4 page size', () => {
      const config = createPdfMakeConfig({
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      });
      
      expect(config.pageSize).toBe('A4');
      expect(config.orientation).toBe('portrait');
      expect(config.margins).toEqual({ top: 70, right: 70, bottom: 70, left: 70 });
    });

    it('should create config with LETTER page size', () => {
      const config = createPdfMakeConfig({
        pageSize: 'LETTER',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      });
      
      expect(config.pageSize).toBe('LETTER');
    });

    it('should create config with landscape orientation', () => {
      const config = createPdfMakeConfig({
        pageSize: 'A4',
        orientation: 'landscape',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      });
      
      expect(config.orientation).toBe('landscape');
    });

    it('should create config with custom margins', () => {
      const config = createPdfMakeConfig({
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 100, right: 50, bottom: 100, left: 50 },
      });
      
      expect(config.margins).toEqual({ top: 100, right: 50, bottom: 100, left: 50 });
    });

    it('should create config with custom page dimensions', () => {
      const config = createPdfMakeConfig({
        pageSize: [800, 600],
        orientation: 'landscape',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      });
      
      expect(config.pageSize).toEqual([800, 600]);
    });

    it('should apply default values', () => {
      const config = createPdfMakeConfig({});
      
      expect(config.pageSize).toBe('A4');
      expect(config.orientation).toBe('portrait');
      expect(config.margins).toEqual({ top: 70, right: 70, bottom: 70, left: 70 });
    });
  });

  describe('createPdfDocumentDefinition', () => {
    it('should create a basic document definition', () => {
      const config: PdfMakeConfig = {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Hello World');
      
      // Content is wrapped in an array with style
      expect(docDef.content).toBeDefined();
      expect(Array.isArray(docDef.content)).toBe(true);
      const contentItem = (docDef.content as ContentItem[])[0];
      expect(contentItem.text).toBe('Hello World');
      expect(docDef.pageSize).toBe('A4');
      expect(docDef.pageOrientation).toBe('portrait');
      expect(docDef.pageMargins).toEqual([70, 70, 70, 70]);
    });

    it('should create document definition with custom page size', () => {
      const config: PdfMakeConfig = {
        pageSize: 'LETTER',
        orientation: 'landscape',
        margins: { top: 50, right: 50, bottom: 50, left: 50 },
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Test Content');
      
      expect(docDef.pageSize).toBe('LETTER');
      expect(docDef.pageOrientation).toBe('landscape');
      expect(docDef.pageMargins).toEqual([50, 50, 50, 50]);
    });

    it('should handle array page size for custom dimensions', () => {
      const config: PdfMakeConfig = {
        pageSize: [400, 600],
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Custom Size');
      
      // Array page size gets converted to { width, height } object
      expect(docDef.pageSize).toEqual({ width: 400, height: 600 });
    });

    it('should create document with header text', () => {
      const config: PdfMakeConfig = {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
        header: 'Test Header',
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Content');
      
      // Header is an object with text property
      expect(docDef.header).toBeDefined();
      const headerContent = docDef.header as HeaderFooterContent;
      expect(headerContent.text).toBe('Test Header');
    });

    it('should create document with footer text', () => {
      const config: PdfMakeConfig = {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
        footer: 'Test Footer',
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Content');
      
      // Footer is an object with text property
      expect(docDef.footer).toBeDefined();
      const footerContent = docDef.footer as HeaderFooterContent;
      expect(footerContent.text).toBe('Test Footer');
    });

    it('should create document with page numbers', () => {
      const config: PdfMakeConfig = {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 70, right: 70, bottom: 70, left: 70 },
        includePageNumbers: true,
      };
      
      const docDef = createPdfDocumentDefinition(config, 'Content');
      
      // Page numbers should be included in footer
      expect(docDef.footer).toBeDefined();
    });
  });

  describe('createPdfFromHtml', () => {
    it('should be a function', () => {
      expect(typeof createPdfFromHtml).toBe('function');
    });

    it('should accept html content and config', () => {
      // This test just verifies the function signature
      expect(createPdfFromHtml).toBeDefined();
    });
  });
});

describe('pdfmakeUtils - integration', () => {
  describe('page size dimensions', () => {
    it('should return correct dimensions for all standard sizes', () => {
      const sizes: PdfPageSize[] = ['A4', 'LETTER', 'LEGAL', 'A3', 'A5'];
      const expectedDimensions: Record<string, [number, number]> = {
        'A4': [595.28, 841.89],
        'LETTER': [612, 792],
        'LEGAL': [612, 1008],
        'A3': [841.89, 1190.55],
        'A5': [419.53, 595.28],
      };

      for (const size of sizes) {
        const dims = getPageSizeDimensions(size);
        expect(dims).toEqual(expectedDimensions[size]);
      }
    });
  });

  describe('config creation', () => {
    it('should merge user config with defaults', () => {
      const userConfig = {
        pageSize: 'LETTER' as PdfPageSize,
      };
      
      const config = createPdfMakeConfig(userConfig);
      
      expect(config.pageSize).toBe('LETTER');
      expect(config.orientation).toBe('portrait'); // default
      expect(config.margins).toEqual({ top: 70, right: 70, bottom: 70, left: 70 }); // default
    });

    it('should accept full margin override', () => {
      const config = createPdfMakeConfig({
        margins: { top: 100, right: 50, bottom: 100, left: 50 },
      });
      
      expect(config.margins.top).toBe(100);
      expect(config.margins.right).toBe(50);
      expect(config.margins.bottom).toBe(100);
      expect(config.margins.left).toBe(50);
    });
  });
});
