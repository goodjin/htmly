import * as vscode from 'vscode';
import {
  showExportSaveDialog,
  convertContent,
  convertToEmbeddedHtmlWithImages,
  saveContentToFile,
  exportStaticSite,
} from '../exportUtils';
import {
  initializePdfMake,
  createPdfMakeConfig,
  createPdfFromHtmlContent,
  PdfMakeConfig
} from '../pdfmakeUtils';
import {
  createDocxFromHtml,
  createDocxConfig,
} from '../docxUtils';
import { ExportFormat, SeoSettings, StaticSiteOptions, StaticSitePage, PdfExportOptions } from '../../shared/types';

/**
 * ExportController - Handles all export operations.
 * This service is responsible for:
 * - PDF export using pdfmake
 * - DOCX export using docx library
 * - Static site export
 * - HTML/markdown export in various formats
 */
export class ExportController {
  /**
   * Handle export request from webview
   * Shows save dialog, converts content, and saves to file
   * PDF export uses pdfmake for proper HTML-to-PDF conversion
   */
  public async handleExportRequest(
    format: ExportFormat,
    content: string,
    docKey: string,
    panel: vscode.WebviewPanel,
    seoSettings?: SeoSettings,
    siteOptions?: Partial<StaticSiteOptions>,
    options?: PdfExportOptions
  ): Promise<void> {
    // Get the original document file name for the default save name
    const originalDocument = vscode.workspace.textDocuments.find(d => d.uri.toString() === docKey);
    const originalFileName = originalDocument?.fileName;

    // Handle PDF export using pdfmake
    if (format === 'pdf') {
      await this.handlePdfExport(content, originalFileName, panel, options);
      return;
    }

    // Handle DOCX export using docx library
    if (format === 'docx') {
      await this.handleDocxExport(content, originalFileName, panel, options);
      return;
    }

    // Handle 'site' format - export as static site
    if (format === 'site') {
      await this.handleSiteExport(content, originalFileName, seoSettings, siteOptions, panel);
      return;
    }

    // Handle other formats (html, markdown, embedded)
    await this.handleGenericExport(format, content, originalFileName, panel);
  }

  /**
   * Handle PDF export using pdfmake
   */
  private async handlePdfExport(
    content: string,
    originalFileName: string | undefined,
    panel: vscode.WebviewPanel,
    options?: PdfExportOptions
  ): Promise<void> {
    try {
      // Initialize pdfmake if not already initialized
      initializePdfMake();

      // Show save dialog
      const saveUri = await showExportSaveDialog('pdf', originalFileName);
      if (!saveUri) {
        panel.webview.postMessage({
          type: 'exportResponse',
          success: false,
          error: 'Export cancelled by user',
        });
        return;
      }

      // Create pdfmake config from options
      const pdfConfig: PdfMakeConfig = createPdfMakeConfig({
        pageSize: options?.pageSize || 'A4',
        orientation: options?.orientation || 'portrait',
        margins: options?.margins || { top: 70, right: 70, bottom: 70, left: 70 },
        header: options?.headerText,
        footer: options?.footerText,
        includePageNumbers: options?.includePageNumbers ?? false,
      });

      // Generate PDF using pdfmake
      const pdfData = await new Promise<Uint8Array>((resolve, reject) => {
        createPdfFromHtmlContent(
          content,
          pdfConfig,
          (data) => resolve(data),
          (error) => reject(error)
        );
      });

      // Save PDF to file
      await vscode.workspace.fs.writeFile(saveUri, pdfData);

      // Send success response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: true,
        filePath: saveUri.fsPath,
      });

      // Show success notification
      vscode.window.showInformationMessage(
        'PDF exported successfully',
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.commands.executeCommand('vscode.open', saveUri);
        }
      });
    } catch (error) {
      // Send failure response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: false,
        error: `PDF export failed: ${error}`,
      });
      vscode.window.showErrorMessage(`PDF export failed: ${error}`);
    }
  }

  /**
   * Handle DOCX export using docx library
   */
  private async handleDocxExport(
    content: string,
    originalFileName: string | undefined,
    panel: vscode.WebviewPanel,
    options?: PdfExportOptions
  ): Promise<void> {
    try {
      // Show save dialog
      const saveUri = await showExportSaveDialog('docx', originalFileName);
      if (!saveUri) {
        panel.webview.postMessage({
          type: 'exportResponse',
          success: false,
          error: 'Export cancelled by user',
        });
        return;
      }

      // Create docx config
      const docxConfig = createDocxConfig({
        pageSize: options?.pageSize || 'LETTER',
        orientation: options?.orientation || 'portrait',
        margins: options?.margins ? {
          top: (options.margins.top || 70) / 72,  // Convert points to inches
          right: (options.margins.right || 70) / 72,
          bottom: (options.margins.bottom || 70) / 72,
          left: (options.margins.left || 70) / 72,
        } : undefined,
      });

      // Generate DOCX using docx library
      const result = await createDocxFromHtml(content, docxConfig);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate DOCX');
      }

      // Save DOCX to file
      await vscode.workspace.fs.writeFile(saveUri, result.data);

      // Send success response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: true,
        filePath: saveUri.fsPath,
      });

      // Show success notification
      vscode.window.showInformationMessage(
        'DOCX exported successfully',
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.commands.executeCommand('vscode.open', saveUri);
        }
      });
    } catch (error) {
      // Send failure response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: false,
        error: `DOCX export failed: ${error}`,
      });
      vscode.window.showErrorMessage(`DOCX export failed: ${error}`);
    }
  }

  /**
   * Handle static site export
   */
  private async handleSiteExport(
    content: string,
    originalFileName: string | undefined,
    seoSettings: SeoSettings | undefined,
    siteOptions: Partial<StaticSiteOptions> | undefined,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      // Get the base name for the site
      const baseName = originalFileName 
        ? originalFileName.replace(/\.[^/.]+$/, '') 
        : 'exported-site';
      
      // Get the directory to save the site
      const siteDir = vscode.Uri.file(baseName);
      
      // Extract page name from file name
      const pageName = originalFileName
        ? originalFileName.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'index'
        : 'index';
      
      // Create a single page for export
      const pages: StaticSitePage[] = [{
        name: pageName,
        path: 'index.html',
        content: content
      }];
      
      // Build static site options with SEO settings
      const staticSiteOptions: StaticSiteOptions = {
        siteTitle: siteOptions?.siteTitle || pageName,
        siteDescription: siteOptions?.siteDescription || seoSettings?.seoDescription || '',
        seoTitle: seoSettings?.seoTitle || siteOptions?.seoTitle,
        customTitle: siteOptions?.customTitle,
        customDescription: seoSettings?.seoDescription || siteOptions?.customDescription,
        ogImage: seoSettings?.ogImage || siteOptions?.ogImage,
        customDomain: seoSettings?.customDomain || siteOptions?.customDomain,
        includeSearch: siteOptions?.includeSearch ?? false,
        includeToc: siteOptions?.includeToc ?? false,
        customCss: siteOptions?.customCss,
      };
      
      // Export the static site
      const siteContent = exportStaticSite(pages, staticSiteOptions);
      
      // Create output directory
      const outputUri = vscode.Uri.joinPath(siteDir, '_site');
      await vscode.workspace.fs.createDirectory(outputUri);
      
      // Save each file in the site
      const savedPaths: string[] = [];
      for (const [filePath, fileContent] of siteContent) {
        const fileUri = vscode.Uri.joinPath(outputUri, filePath);
        const dirUri = vscode.Uri.joinPath(outputUri, filePath.replace(/[^/]+$/, ''));
        
        // Create parent directories if needed
        if (filePath.includes('/')) {
          await vscode.workspace.fs.createDirectory(dirUri);
        }
        
        await saveContentToFile(fileUri, fileContent);
        savedPaths.push(fileUri.fsPath);
      }
      
      // Send success response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: true,
        filePath: outputUri.fsPath,
      });

      // Show success notification
      vscode.window.showInformationMessage(
        'Static site exported successfully',
        'Open Folder'
      ).then(selection => {
        if (selection === 'Open Folder') {
          vscode.commands.executeCommand('revealFileInOS', outputUri);
        }
      });
    } catch (error) {
      // Send failure response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: false,
        error: `Export failed: ${error}`,
      });
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }

  /**
   * Handle generic format export (html, markdown, embedded)
   */
  private async handleGenericExport(
    format: ExportFormat,
    content: string,
    originalFileName: string | undefined,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      // Show save dialog for other formats
      const saveUri = await showExportSaveDialog(format, originalFileName);

      if (!saveUri) {
        // User cancelled
        panel.webview.postMessage({
          type: 'exportResponse',
          success: false,
          error: 'Export cancelled by user',
        });
        return;
      }

      // Convert content based on format
      // For embedded HTML, use async version to convert images to base64
      let convertedContent: string;
      if (format === 'embedded') {
        // Create a readFile function using VS Code's fs API
        const readFile = async (uri: string): Promise<Uint8Array | null> => {
          try {
            return await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
          } catch {
            return null;
          }
        };
        convertedContent = await convertToEmbeddedHtmlWithImages(content, undefined, readFile);
      } else {
        convertedContent = convertContent(format, content);
      }

      // Save the file
      await saveContentToFile(saveUri, convertedContent);

      // Send success response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: true,
        filePath: saveUri.fsPath,
      });

      // Show success notification
      const formatLabel = format.charAt(0).toUpperCase() + format.slice(1);
      vscode.window.showInformationMessage(
        `${formatLabel} exported successfully`,
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.commands.executeCommand('vscode.open', saveUri);
        }
      });
    } catch (error) {
      // Send failure response
      panel.webview.postMessage({
        type: 'exportResponse',
        success: false,
        error: `Export failed: ${error}`,
      });
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }
}

/**
 * Creates a new ExportController instance
 */
export function createExportController(): ExportController {
  return new ExportController();
}