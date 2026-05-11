/**
 * Export utilities for converting HTML content to various formats
 * and handling file operations
 */
import * as vscode from 'vscode';
import type { ExportFormat } from '../shared/types';

// File extension mapping for each export format
const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: 'pdf',
  markdown: 'md',
  plaintext: 'txt',
  embedded: 'html',
};

// Default file name for export
const DEFAULT_FILE_NAME = 'exported-document';

/**
 * Get the file extension for a given export format
 */
export function getFormatExtension(format: ExportFormat): string {
  return FORMAT_EXTENSIONS[format];
}

/**
 * Show a save dialog for the given export format
 * Returns the selected URI or undefined if cancelled
 */
export async function showExportSaveDialog(
  format: ExportFormat,
  originalFileName?: string
): Promise<vscode.Uri | undefined> {
  const extension = getFormatExtension(format);
  const baseName = originalFileName 
    ? originalFileName.replace(/\.[^/.]+$/, '')  // Remove existing extension
    : DEFAULT_FILE_NAME;
  
  const defaultFileName = `${baseName}.${extension}`;

  const filters: Record<ExportFormat, [string, string]> = {
    pdf: ['PDF Files', 'pdf'],
    markdown: ['Markdown Files', 'md'],
    plaintext: ['Text Files', 'txt'],
    embedded: ['HTML Files', 'html'],
  };

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file(''),
      defaultFileName
    ),
    filters: { [filters[format][0]]: [filters[format][1]] },
    saveLabel: `Export as ${format.charAt(0).toUpperCase() + format.slice(1)}`,
  });

  return uri;
}

/**
 * Convert HTML content to Markdown format
 * Basic conversion - handles common HTML elements
 */
export function convertToMarkdown(html: string): string {
  let markdown = html;

  // First, handle inline elements that should preserve their content
  // These are processed early so their content isn't affected by stripHtmlTags

  // Inline code (before stripHtmlTags)
  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Code blocks
  markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const code = stripHtmlTags(content.trim());
    return `\`\`\`\n${code}\n\`\`\`\n\n`;
  });

  // Bold (before stripHtmlTags)
  markdown = markdown.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, (_, __, content) => {
    const strippedContent = stripHtmlTags(content);
    return `**${strippedContent}**`;
  });

  // Italic (before stripHtmlTags)
  markdown = markdown.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, (_, __, content) => {
    const strippedContent = stripHtmlTags(content);
    return `*${strippedContent}*`;
  });

  // Strikethrough (before stripHtmlTags)
  markdown = markdown.replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/(del|s|strike)>/gi, (_, __, content) => {
    const strippedContent = stripHtmlTags(content);
    return `~~${strippedContent}~~`;
  });

  // Links (before stripHtmlTags)
  markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => {
    const strippedContent = stripHtmlTags(content);
    return `[${strippedContent}](${href})`;
  });

  // Images (before stripHtmlTags)
  markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)');
  markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');

  // Ordered lists (before stripHtmlTags)
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match: string, content: string) => {
    let index = 0;
    const processedContent = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (liMatch: string, liContent: string) => {
      const itemContent = stripHtmlTags(liContent).trim();
      return `${++index}. ${itemContent}\n`;
    });
    return processedContent + '\n';
  });

  // Unordered lists (before stripHtmlTags)
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match: string, content: string) => {
    const processedContent = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (liMatch: string, liContent: string) => {
      const itemContent = stripHtmlTags(liContent).trim();
      return `- ${itemContent}\n`;
    });
    return processedContent + '\n';
  });

  // Blockquotes (before stripHtmlTags)
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const strippedContent = stripHtmlTags(content);
    const lines = strippedContent.split('\n');
    return lines.map(line => `> ${line}`).join('\n') + '\n\n';
  });

  // Headings (before stripHtmlTags)
  markdown = markdown.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, level, content) => {
    const hashes = '#'.repeat(parseInt(level));
    const strippedContent = stripHtmlTags(content);
    return `${hashes} ${strippedContent}\n\n`;
  });

  // Preserve paragraphs - convert <p>...</p> to ...\n\n
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const strippedContent = stripHtmlTags(content);
    return `${strippedContent}\n\n`;
  });

  // Horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n\n');

  // Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // Tables - basic support
  markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) => {
    const rows: string[] = [];
    
    // Extract headers
    const headerMatch = content.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    if (headerMatch) {
      const headers = extractTableCells(headerMatch[1], 'th');
      rows.push('| ' + headers.join(' | ') + ' |');
      rows.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    }
    
    // Extract body rows
    const bodyMatch = content.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (bodyMatch) {
      const bodyRows = bodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of bodyRows) {
        const cells = extractTableCells(row, 'td');
        rows.push('| ' + cells.join(' | ') + ' |');
      }
    }
    
    return rows.join('\n') + '\n\n';
  });

  // Strip any remaining HTML tags (but preserve markdown formatting characters)
  markdown = stripHtmlPreservingMarkdown(markdown);

  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

/**
 * Extract table cells from a row string
 */
function extractTableCells(row: string, cellType: 'th' | 'td'): string[] {
  const cells: string[] = [];
  const regex = new RegExp(`<${cellType}[^>]*>([\\s\\S]*?)<\\/${cellType}>`, 'gi');
  let match;
  while ((match = regex.exec(row)) !== null) {
    cells.push(stripHtmlTags(match[1]).trim());
  }
  return cells;
}

/**
 * Strip all HTML tags from a string
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
 * Strip HTML tags while preserving Markdown formatting characters
 */
function stripHtmlPreservingMarkdown(html: string): string {
  // First decode HTML entities that might conflict with markdown
  let result = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // Now strip remaining HTML tags
  // This regex preserves content inside markdown formatting but strips tags
  // Match tags and their content, but be careful with markdown characters
  result = result.replace(/<[^>]+>/g, '');

  return result.trim();
}

/**
 * Convert HTML content to plain text format
 * Strips all HTML tags and preserves text structure
 */
export function convertToPlainText(html: string): string {
  let text = html;

  // Preserve paragraphs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    return stripHtmlTags(content) + '\n\n';
  });

  // Headings
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, content) => {
    return '\n' + stripHtmlTags(content).toUpperCase() + '\n' + '-'.repeat(stripHtmlTags(content).length) + '\n\n';
  });

  // Lists - preserve structure
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    return '• ' + stripHtmlTags(content) + '\n';
  });

  // Links - show text and URL
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');

  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags
  text = stripHtmlTags(text);

  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Convert HTML content to embedded HTML format
 * Inlines styles and converts images to base64
 */
export function convertToEmbeddedHtml(html: string): string {
  // Basic implementation - in future, this should:
  // 1. Inline all CSS styles
  // 2. Convert external images to base64 data URIs
  // 3. Embed fonts or convert to web-safe fallbacks
  
  // For now, return the HTML with a basic wrapper
  const embeddedStyles = `
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; }
      td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${embeddedStyles}
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Handle PDF export - this is primarily handled in the webview
 * with window.print(), so this just returns the content as-is
 * The actual PDF generation happens in the browser
 */
export function preparePdfExport(html: string): string {
  // PDF export is handled by the webview using window.print()
  // The webview applies print-specific CSS and triggers the print dialog
  // This function returns the content unchanged
  return html;
}

/**
 * Get the converted content for a given format
 */
export function convertContent(format: ExportFormat, html: string): string {
  switch (format) {
    case 'markdown':
      return convertToMarkdown(html);
    case 'plaintext':
      return convertToPlainText(html);
    case 'embedded':
      return convertToEmbeddedHtml(html);
    case 'pdf':
      return preparePdfExport(html);
    default:
      return html;
  }
}

/**
 * Save content to a file
 */
export async function saveContentToFile(uri: vscode.Uri, content: string): Promise<void> {
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
}
