/**
 * Service Identifiers for Dependency Injection
 * 
 * These Symbols serve as unique identifiers for services registered in the container.
 * Using Symbols ensures type safety and prevents string-based name collisions.
 */

export const SERVICE_IDS = {
  BACKLINKS_INDEX: Symbol('BacklinksIndex'),
  VERSION_HISTORY_DB: Symbol('VersionHistoryDb'),
  KEYBINDING_MANAGER: Symbol('KeybindingManager'),
  TEMPLATE_STORAGE: Symbol('TemplateStorage'),
  SNIPPET_STORAGE: Symbol('SnippetStorage'),
  EXPORT_UTILS: Symbol('ExportUtils'),
  PDF_MAKE_UTILS: Symbol('PdfMakeUtils'),
  DOCX_UTILS: Symbol('DocxUtils'),
  CIRCUIT_BREAKER: Symbol('CircuitBreaker'),
  RETRY_POLICY: Symbol('RetryPolicy'),
} as const;

export type ServiceId = typeof SERVICE_IDS[keyof typeof SERVICE_IDS];