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

// ─── HTML Entity Decode ──────────────────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
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


// ─── Regex-based HTML → Plain Text Converter ────────────────────────────────

/**
 * Convert HTML string to plain text.
 * Mirrors webview/src/core/htmlToPlaintext.ts behavior but uses
 * regex-based parsing so it runs in the VS Code extension context
 * (no JSDOM dependency required).
 */
export function convertToPlainText(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let text = decodeHtmlEntities(html);

  // Step 1: Remove dangerous/script content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Step 2: Convert images to [alt] or [image: src]
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '[$1]');
  text = text.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '[$2]');
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '[$1]');
  text = text.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '[image: $1]');
  text = text.replace(/<img[^>]*\/?>/gi, '[image]');

  // Step 3: Convert links to "text (url)"
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => {
    const plainContent = stripHtmlTags(content);
    return plainContent ? `${plainContent} (${href})` : '';
  });

  // Step 4: Convert headings (h1-h6) with surrounding blank lines
  for (let i = 1; i <= 6; i++) {
    text = text.replace(new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi'), (_, content) => {
      return '\n\n' + stripHtmlTags(content) + '\n\n';
    });
  }

  // Step 5: Convert paragraphs with surrounding blank lines
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    return '\n\n' + stripHtmlTags(content) + '\n\n';
  });

  // Step 6: Convert blockquotes with surrounding blank lines
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    return '\n\n' + stripHtmlTags(content) + '\n\n';
  });

  // Step 7: Convert pre blocks preserving whitespace
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const raw = content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    return '\n\n' + raw + '\n\n';
  });

  // Step 8: Convert horizontal rules
  text = text.replace(/<hr\s*\/?>/gi, '\n\n');

  // Step 9: Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Step 10: Convert tables to pipe-separated rows
  // First extract all tables and convert them
  const tableResults = new Map<string, string>();
  let tableCounter = 0;
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const key = `__TABLE_${tableCounter++}__`;
    const rows: string[] = [];

    // Process header rows (th elements)
    const headerMatches = tableContent.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    for (const rowMatch of headerMatches) {
      const rowContent = rowMatch[0];
      const cells: string[] = [];

      // Extract th cells
      const thMatches = rowContent.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi);
      for (const cellMatch of thMatches) {
        cells.push(stripHtmlTags(cellMatch[1]).trim());
      }

      // Extract td cells if no th found
      if (cells.length === 0) {
        const tdMatches = rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        for (const cellMatch of tdMatches) {
          cells.push(stripHtmlTags(cellMatch[1]).trim());
        }
      }

      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    }

    // If no structured rows, try to extract cells directly
    if (rows.length === 0) {
      const cellMatches = tableContent.matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/gi);
      const allCells: string[] = [];
      for (const cellMatch of cellMatches) {
        allCells.push(stripHtmlTags(cellMatch[2]).trim());
      }
      if (allCells.length > 0) {
        rows.push(allCells.join(' | '));
      }
    }

    tableResults.set(key, '\n\n' + rows.join('\n') + '\n\n');
    return key;
  });

  // Step 11: Replace table placeholders with converted text
  for (const [key, value] of tableResults) {
    text = text.replace(key, value);
  }

  // Step 12: Convert lists
  // Unordered lists
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, listContent) => {
    const items: string[] = [];
    const itemMatches = listContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const match of itemMatches) {
      // Recursively process nested content (handles nested lists)
      const itemText = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_: string, nested: string) => {
          const nestedItems: string[] = [];
          const nestedMatches = nested.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          for (const n of nestedMatches) {
            nestedItems.push('\n\u2022 ' + stripHtmlTags(n[1]).trim());
          }
          return nestedItems.join('');
        })
        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_: string, nested: string) => {
          const nestedItems: string[] = [];
          const nestedMatches = nested.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          let idx = 1;
          for (const n of nestedMatches) {
            nestedItems.push(`\n${idx}. ` + stripHtmlTags(n[1]).trim());
            idx++;
          }
          return nestedItems.join('');
        });
      items.push('\n\u2022 ' + stripHtmlTags(itemText).trim());
    }
    return '\n\n' + items.join('') + '\n\n';
  });

  // Ordered lists
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_: string, listContent: string) => {
    const items: string[] = [];
    const itemMatches = listContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    let idx = 1;
    for (const match of itemMatches) {
      const itemText = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_: string, nested: string) => {
          const nestedItems: string[] = [];
          const nestedMatches = nested.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          for (const n of nestedMatches) {
            nestedItems.push('\n\u2022 ' + stripHtmlTags(n[1]).trim());
          }
          return nestedItems.join('');
        })
        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_: string, nested: string) => {
          const nestedItems: string[] = [];
          const nestedMatches = nested.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          let ni = 1;
          for (const n of nestedMatches) {
            nestedItems.push(`\n${ni}. ` + stripHtmlTags(n[1]).trim());
            ni++;
          }
          return nestedItems.join('');
        });
      items.push(`\n${idx}. ` + stripHtmlTags(itemText).trim());
      idx++;
    }
    return '\n\n' + items.join('') + '\n\n';
  });

  // Step 13: Strip all remaining HTML tags
  text = stripHtmlTags(text);

  // Step 14: Decode any remaining HTML entities
  text = decodeHtmlEntities(text);

  // Step 15: Clean up whitespace
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
