/**
 * useExport composable - handles export logic in the webview
 * Sends export requests to the extension and handles export responses
 */
import { ref, shallowRef, readonly } from 'vue';
import type { ExportFormat, ExtToWebMsg } from '../../../src/shared/types';
import { useVSCode } from './useVSCode';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// Module-level callback for export results
let onExportResultCallback: ((result: ExportResult) => void) | null = null;

/**
 * Composable for handling document exports
 * Integrates with useVSCode to send/receive export messages
 */
export function useExport() {
  // Export state - instance-level to avoid test pollution
  const isExporting = ref(false);
  const lastExportResult = shallowRef<ExportResult | null>(null);
  const exportError = ref<string | null>(null);

  const { postMessage, onMessage } = useVSCode();

  // Set up listener for export responses
  let unsubscribe: (() => void) | null = null;

  /**
   * Initialize the export response listener
   * Should be called once when the component mounts
   */
  function initExportListener(): void {
    if (unsubscribe) {
      return; // Already initialized
    }

    unsubscribe = onMessage((msg: ExtToWebMsg) => {
      if (msg.type === 'exportResponse') {
        isExporting.value = false;
        
        const result: ExportResult = {
          success: msg.success,
          filePath: msg.filePath,
          error: msg.error,
        };
        
        lastExportResult.value = result;
        
        // Set error state for failed exports
        if (!msg.success) {
          exportError.value = msg.error ?? 'Export failed';
        } else {
          exportError.value = null;
        }
        
        // Call registered callback if any
        if (onExportResultCallback) {
          onExportResultCallback(result);
        }
      }
    });
  }

  /**
   * Clean up the export response listener
   * Should be called when the component unmounts
   */
  function cleanupExportListener(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    onExportResultCallback = null;
  }

  /**
   * Request export of the document in the specified format
   * @param format - The export format (pdf, markdown, plaintext, embedded, site)
   * @param content - The HTML content to export
   * @param seoSettings - Optional SEO settings for static site export
   * @param siteOptions - Optional site options for static site export
   */
  function requestExport(format: ExportFormat, content: string, seoSettings?: import('../../../src/shared/types').SeoSettings, siteOptions?: Partial<import('../../../src/shared/types').StaticSiteOptions>): void {
    if (isExporting.value) {
      console.warn('[useExport] Export already in progress');
      return;
    }

    isExporting.value = true;
    lastExportResult.value = null;
    exportError.value = null;

    postMessage({
      type: 'exportRequest',
      format,
      content,
      seoSettings,
      siteOptions,
    });
  }

  /**
   * Register a callback to be called when export results are received
   * @param callback - Function to call with the export result
   */
  function onExportResult(callback: (result: ExportResult) => void): void {
    onExportResultCallback = callback;
  }

  /**
   * Clear the last export result
   */
  function clearExportResult(): void {
    lastExportResult.value = null;
    exportError.value = null;
  }

  /**
   * Check if the last export was successful
   */
  function wasExportSuccessful(): boolean {
    return lastExportResult.value?.success ?? false;
  }

  /**
   * Get the error message from the last export
   */
  function getExportError(): string | undefined {
    return exportError.value ?? lastExportResult.value?.error;
  }

  /**
   * Get the file path from the last successful export
   */
  function getExportedFilePath(): string | undefined {
    return lastExportResult.value?.filePath;
  }

  return {
    // State (readonly to prevent external mutation)
    isExporting: readonly(isExporting),
    lastExportResult: readonly(lastExportResult),
    exportError: readonly(exportError),

    // Methods
    initExportListener,
    cleanupExportListener,
    requestExport,
    onExportResult,
    clearExportResult,
    wasExportSuccessful,
    getExportError,
    getExportedFilePath,
  };
}
