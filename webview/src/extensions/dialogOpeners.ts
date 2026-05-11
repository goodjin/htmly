/**
 * Dialog opener functions - separated from main extensions to enable lazy loading
 * These are small, simple functions that can be statically imported
 */

// Link preview dialog opener
let openLinkPreviewDialogFn: ((editor: any, pos?: number) => void) | null = null;

export function setLinkPreviewDialogOpener(fn: (editor: any, pos?: number) => void) {
  openLinkPreviewDialogFn = fn;
}

export function openLinkPreviewDialog(editor: any, pos?: number) {
  openLinkPreviewDialogFn?.(editor, pos);
}

// Embed dialog opener
let openEmbedDialogFn: (() => void) | null = null;

export function setEmbedDialogOpener(fn: () => void) {
  openEmbedDialogFn = fn;
}

export function openEmbedDialog() {
  openEmbedDialogFn?.();
}

// Cover image dialog opener
let openCoverImageDialogFn: ((editor: any) => void) | null = null;

export function setCoverImageDialogOpener(fn: (editor: any) => void) {
  openCoverImageDialogFn = fn;
}

export function openCoverImageDialog(editor: any) {
  openCoverImageDialogFn?.(editor);
}
