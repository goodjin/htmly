/**
 * Escape HTML special characters to prevent XSS injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extract the <body> innerHTML from a full HTML document.
 * If the input is a fragment (no doctype/html/body), returns it as-is.
 */
export function extractBodyContent(html: string): string {
  if (!isFullHtmlDocument(html)) {
    return html;
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return parsed.body.innerHTML;
}

/**
 * Replace the <body> innerHTML of a full HTML document while
 * preserving the original <head> and attributes.
 */
export function replaceBodyContent(originalHtml: string, bodyHtml: string): string {
  if (!isFullHtmlDocument(originalHtml)) {
    return bodyHtml;
  }

  if (/<body\b[^>]*>[\s\S]*<\/body>/i.test(originalHtml)) {
    return originalHtml.replace(
      /<body\b([^>]*)>[\s\S]*<\/body>/i,
      `<body$1>${bodyHtml}</body>`
    );
  }

  if (/<\/html>/i.test(originalHtml)) {
    return originalHtml.replace(/<\/html>/i, `<body>${bodyHtml}</body></html>`);
  }

  return bodyHtml;
}

/**
 * Detect whether the input looks like a full HTML document
 * (has doctype, <html>, or <body> tags).
 */
export function isFullHtmlDocument(html: string): boolean {
  return /<!doctype\s+html/i.test(html) || /<html\b/i.test(html) || /<body\b/i.test(html);
}
