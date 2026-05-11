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

// ─── Embedded HTML Constants ───────────────────────────────────────────────────

// Web-safe font stacks for fallback
const WEB_SAFE_FONTS: Record<string, string> = {
  // Sans-serif
  'arial': 'Arial, Helvetica, sans-serif',
  'helvetica': 'Helvetica, Arial, sans-serif',
  'verdana': 'Verdana, Geneva, sans-serif',
  'tahoma': 'Tahoma, Verdana, sans-serif',
  'trebuchet ms': '"Trebuchet MS", sans-serif',
  'gill sans': '"Gill Sans", "Gill Sans MT", sans-serif',
  'impact': 'Impact, Charcoal, sans-serif',
  // Serif
  'times new roman': '"Times New Roman", Times, serif',
  'georgia': 'Georgia, "Times New Roman", serif',
  'palatino': '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  'book antiqua': '"Book Antiqua", Palatino, serif',
  // Monospace
  'courier new': '"Courier New", Courier, monospace',
  'lucida console': '"Lucida Console", Monaco, monospace',
  'monaco': 'Monaco, "Courier New", monospace',
  // Cursive/Fantasy
  'comic sans ms': '"Comic Sans MS", cursive, sans-serif',
  'copperplate': 'Copperplate, "Papyrus", fantasy',
  'papyrus': 'Papyrus, fantasy',
};

// Default embedded styles
const DEFAULT_EMBEDDED_STYLES = `
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    max-width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  td, th {
    border: 1px solid #ddd;
    padding: 8px;
  }
  pre, code {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Courier New", Courier, monospace;
  }
  pre {
    padding: 12px;
    overflow-x: auto;
  }
`;

// MIME type mapping for image files
const MIME_TYPES: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
};

// ─── Embedded HTML Helper Functions ───────────────────────────────────────────

/**
 * Check if a URL is a data URI (already embedded)
 */
function isDataUri(url: string): boolean {
  return url.trim().toLowerCase().startsWith('data:');
}

/**
 * Check if a URL is an external HTTP(S) URL
 */
function isExternalUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Check if a URL is a relative path (local file reference)
 */
function isRelativePath(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('/') || 
         trimmed.startsWith('./') || 
         trimmed.startsWith('../') ||
         (!trimmed.includes('://') && !trimmed.startsWith('data:'));
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Apply a CSS declaration (property: value) to a style attribute string
 */
function applyCssDeclaration(styleAttr: string, declaration: string): string {
  const colonIndex = declaration.indexOf(':');
  if (colonIndex === -1) return styleAttr;
  
  const property = declaration.slice(0, colonIndex).trim();
  const value = declaration.slice(colonIndex + 1).trim();
  
  if (!property || !value) return styleAttr;
  
  // Convert camelCase to kebab-case for CSS properties
  const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
  
  // Check if property already exists in style attribute
  const existingPattern = new RegExp(`${cssProperty}\\s*:\\s*[^;]+;?`, 'i');
  if (existingPattern.test(styleAttr)) {
    // Replace existing property
    return styleAttr.replace(existingPattern, '').trim() + ` ${cssProperty}: ${value};`;
  }
  
  return (styleAttr + ` ${cssProperty}: ${value};`).trim();
}

/**
 * Inline styles from a CSS string into HTML elements
 * Handles basic selectors: tag, .class, #id, [attr]
 */
function inlineStylesFromCSS(html: string, cssContent: string): string {
  // Extract CSS rules
  const ruleMatches = cssContent.match(/([^{}]+)\{([^}]*)\}/g) || [];
  
  let result = html;
  
  for (const rule of ruleMatches) {
    const braceOpen = rule.indexOf('{');
    const braceClose = rule.lastIndexOf('}');
    
    if (braceOpen === -1 || braceClose === -1) continue;
    
    const selector = rule.slice(0, braceOpen).trim();
    const declarations = rule.slice(braceOpen + 1, braceClose).trim();
    
    if (!selector || !declarations) continue;
    
    // Skip @media queries and other at-rules
    if (selector.startsWith('@')) continue;
    
    // Parse declarations
    const declarationParts = declarations.split(';');
    const cssProps: string[] = [];
    for (const decl of declarationParts) {
      const trimmed = decl.trim();
      if (trimmed) {
        cssProps.push(trimmed);
      }
    }
    
    if (cssProps.length === 0) continue;
    
    // Apply to elements matching the selector
    if (selector.startsWith('.')) {
      // Class selector
      const className = selector.slice(1);
      const classPattern = new RegExp(`class="([^"]*)"`, 'g');
      result = result.replace(classPattern, (match, classes) => {
        const classList = classes.split(/\s+/).filter((c: string) => c);
        if (!classList.includes(className)) {
          classList.push(className);
        }
        // Find elements with this class and add inline styles
        return `class="${classList.join(' ')}"`;
      });
      
      // Add inline styles to elements with this class
      const classTagPattern = new RegExp(`<([^ >]+)(?=[^>]*class="[^"]*\\b${className}\\b[^"]*")([^>]*)>`, 'gi');
      result = result.replace(classTagPattern, (match, tag, attrs) => {
        // Check if element has style attribute
        const styleMatch = attrs.match(/style="([^"]*)"/);
        let styleAttr = styleMatch ? styleMatch[1] : '';
        
        for (const cssProp of cssProps) {
          styleAttr = applyCssDeclaration(styleAttr, cssProp);
        }
        
        // Replace or add style attribute
        if (styleMatch) {
          attrs = attrs.replace(/style="[^"]*"/, `style="${styleAttr}"`);
        } else {
          attrs += ` style="${styleAttr}"`;
        }
        
        return `<${tag}${attrs}>`;
      });
    } else if (selector.startsWith('#')) {
      // ID selector
      const idName = selector.slice(1);
      const idTagPattern = new RegExp(`<([^ >]+)(?=[^>]*id="[^"]*\\b${idName}\\b[^"]*")([^>]*)>`, 'gi');
      result = result.replace(idTagPattern, (match, tag, attrs) => {
        const styleMatch = attrs.match(/style="([^"]*)"/);
        let styleAttr = styleMatch ? styleMatch[1] : '';
        
        for (const cssProp of cssProps) {
          styleAttr = applyCssDeclaration(styleAttr, cssProp);
        }
        
        if (styleMatch) {
          attrs = attrs.replace(/style="[^"]*"/, `style="${styleAttr}"`);
        } else {
          attrs += ` style="${styleAttr}"`;
        }
        
        return `<${tag}${attrs}>`;
      });
    } else if (selector.startsWith('[') && selector.endsWith(']')) {
      // Attribute selector - skip for simplicity
      continue;
    } else {
      // Tag selector
      const tagName = selector.split(/\s/)[0].toLowerCase(); // Handle "tag.class" etc.
      const tagPattern = new RegExp(`<${tagName}([^>]*)>`, 'gi');
      result = result.replace(tagPattern, (match, attrs) => {
        const styleMatch = attrs.match(/style="([^"]*)"/);
        let styleAttr = styleMatch ? styleMatch[1] : '';
        
        for (const cssProp of cssProps) {
          styleAttr = applyCssDeclaration(styleAttr, cssProp);
        }
        
        if (styleMatch) {
          attrs = attrs.replace(/style="[^"]*"/, `style="${styleAttr}"`);
        } else {
          attrs += ` style="${styleAttr}"`;
        }
        
        return `<${tagName}${attrs}>`;
      });
    }
  }
  
  return result;
}

/**
 * Extract and inline styles from <style> tags
 */
function inlineStylesFromStyleTags(html: string): string {
  // Extract all <style> tag contents
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let cssContent = '';
  
  html = html.replace(stylePattern, (match, content) => {
    cssContent += content;
    return ''; // Remove the style tag
  });
  
  // Apply the extracted CSS to matching elements
  if (cssContent.trim()) {
    html = inlineStylesFromCSS(html, cssContent);
  }
  
  return html;
}

/**
 * Process font-family declarations, replacing custom fonts with web-safe fallbacks
 */
function processFonts(html: string): string {
  // Match style attributes with font-family
  const styleAttrPattern = /style="([^"]*)"/gi;
  
  return html.replace(styleAttrPattern, (match, styleValue) => {
    if (!styleValue.includes('font-family')) {
      return match;
    }
    
    // Extract font-family value
    const fontFamilyMatch = styleValue.match(/font-family\s*:\s*([^;]+)/i);
    if (!fontFamilyMatch) {
      return match;
    }
    
    const fontValue = fontFamilyMatch[1];
    const fonts = fontValue.split(',').map((f: string) => f.trim().toLowerCase().replace(/['"]/g, ''));
    
    let hasCustomFont = false;
    let processedFonts: string[] = [];
    
    for (const font of fonts) {
      // Remove size/weight qualifiers
      const baseFont = font.replace(/\s+(bold|italic|oblique|light|thin|medium|regular|semibold|extrabold|black)$/i, '').trim();
      
      if (WEB_SAFE_FONTS[baseFont]) {
        processedFonts.push(WEB_SAFE_FONTS[baseFont].split(',')[0]);
      } else {
        // Check if it's already a web-safe fallback
        const isAlreadySafe = Object.values(WEB_SAFE_FONTS).some(webSafe => 
          webSafe.toLowerCase().includes(baseFont)
        );
        if (!isAlreadySafe) {
          hasCustomFont = true;
        }
        processedFonts.push(font);
      }
    }
    
    // Add safe fallback if there's a custom font
    if (hasCustomFont) {
      processedFonts.push('sans-serif');
    }
    
    // Replace font-family in style value
    const newFontValue = processedFonts.join(', ');
    const newStyleValue = styleValue.replace(
      /font-family\s*:\s*([^;]+)/i,
      `font-family: ${newFontValue}`
    );
    
    return `style="${newStyleValue}"`;
  });
}

/**
 * Sanitize content by removing dangerous elements and attributes
 */
function sanitizeContent(html: string): string {
  // Remove script tags
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags (we'll extract and inline them)
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Remove noscript tags
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  
  // Remove iframes
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  
  // Remove object and embed elements
  html = html.replace(/<object[\s\S]*?<\/object>/gi, '');
  html = html.replace(/<embed[\s\S]*?>/gi, '');
  html = html.replace(/<applet[\s\S]*?<\/applet>/gi, '');
  
  // Remove event handler attributes (onclick, onerror, etc.)
  const eventHandlers = [
    'onclick', 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover',
    'onmouseup', 'onload', 'onerror', 'onabort', 'onblur', 'onchange', 'onfocus',
    'onreset', 'onsubmit', 'onunload', 'onkeydown', 'onkeypress', 'onkeyup',
    'onresize', 'onscroll', 'oncopy', 'oncut', 'onpaste', 'onanimationend',
    'onanimationiteration', 'onanimationstart', 'ontransitionend', 'oninput'
  ];
  
  for (const handler of eventHandlers) {
    const pattern = new RegExp(`\\s*${handler}\\s*=\\s*["'][^"']*["']`, 'gi');
    html = html.replace(pattern, '');
  }
  
  // Remove any attribute starting with 'on' (fallback for unknown handlers)
  html = html.replace(/\s+on[a-z]+\s*=\s*["'][^"']*["']/gi, '');
  
  return html;
}

/**
 * Get the content to embed (body or full document)
 */
function extractContent(html: string): string {
  // Try to extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1].trim()) {
    return bodyMatch[1].trim();
  }
  
  // Try to extract content from html element
  const htmlMatch = html.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
  if (htmlMatch) {
    // Remove head if present
    return htmlMatch[1].replace(/<head[^>]*>[\s\S]*?<\/head>/i, '').trim();
  }
  
  // Return as-is if no recognized structure
  return html.trim();
}

/**
 * Get all style tags content from the document
 */
function getStyleTags(html: string): string {
  const styles: string[] = [];
  
  // Check for style tags
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = stylePattern.exec(html)) !== null) {
    const content = match[1].trim();
    if (content) {
      styles.push(content);
    }
  }
  
  return styles.join('\n');
}

/**
 * Build the complete embedded HTML document
 */
function buildEmbeddedDocument(content: string, originalStyles: string): string {
  const embeddedStyles = [
    DEFAULT_EMBEDDED_STYLES,
    originalStyles,
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${embeddedStyles}
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Convert HTML content to embedded HTML format
 * Inlines styles and converts images to base64
 * 
 * Features:
 * - CSS from <style> tags is inlined into matching elements
 * - Custom fonts are replaced with web-safe fallbacks
 * - Scripts and dangerous content are removed
 * - Images remain as-is (use convertToEmbeddedHtmlWithImages for base64 conversion)
 */
export function convertToEmbeddedHtml(html: string): string {
  // Handle empty or null input
  if (!html || typeof html !== 'string') {
    return buildEmbeddedDocument('', '');
  }

  // Step 1: Sanitize content (remove scripts, event handlers, etc.)
  let processed = sanitizeContent(html);

  // Step 2: Extract and inline styles from <style> tags
  processed = inlineStylesFromStyleTags(processed);

  // Step 3: Extract original styles for preservation
  const originalStyles = getStyleTags(html);

  // Step 4: Process fonts (replace custom fonts with web-safe fallbacks)
  processed = processFonts(processed);

  // Step 5: Extract content (body or full document)
  const content = extractContent(processed);

  // Step 6: Build the final embedded document
  return buildEmbeddedDocument(content, originalStyles);
}

/**
 * Convert HTML content to embedded HTML format with image-to-base64 conversion
 * This async version can embed local images as base64 data URIs
 * 
 * @param html - The HTML string to convert
 * @param documentUri - Optional URI of the source document (for resolving relative image paths)
 * @param readFile - Optional function to read file contents (for testing)
 */
export async function convertToEmbeddedHtmlWithImages(
  html: string,
  documentUri?: string,
  readFile?: (uri: string) => Promise<Uint8Array | null>
): Promise<string> {
  if (!html || typeof html !== 'string') {
    return buildEmbeddedDocument('', '');
  }

  // First, do all the synchronous processing
  let processed = sanitizeContent(html);
  processed = inlineStylesFromStyleTags(processed);
  const originalStyles = getStyleTags(html);
  processed = processFonts(processed);

  // If readFile is not provided, fall back to synchronous conversion
  if (!readFile) {
    const content = extractContent(processed);
    return buildEmbeddedDocument(content, originalStyles);
  }

  // Process images - convert local images to base64
  const imgPattern = /<img([^>]*?)src=["']([^"']*)["']([^>]*)>/gi;
  const imageMatches: { original: string; src: string; before: string; after: string }[] = [];
  
  let imgMatch;
  while ((imgMatch = imgPattern.exec(processed)) !== null) {
    const src = imgMatch[2];
    
    // Skip if already a data URI or external URL
    if (isDataUri(src) || isExternalUrl(src)) {
      continue;
    }
    
    imageMatches.push({
      original: imgMatch[0],
      src: src,
      before: imgMatch[1],
      after: imgMatch[3]
    });
  }

  // Convert images to base64
  for (const img of imageMatches) {
    try {
      let imagePath = img.src;
      
      // Resolve relative paths
      if (imagePath.startsWith('./')) {
        imagePath = imagePath.slice(2);
      } else if (imagePath.startsWith('../')) {
        // Handle parent directory references
        if (documentUri) {
          const basePath = documentUri.replace(/\/[^/]+$/, '');
          imagePath = basePath.replace(/\/[^/]+$/, '') + '/' + imagePath.slice(3);
        }
      } else if (!imagePath.startsWith('/') && documentUri) {
        // Relative path - resolve against document
        imagePath = documentUri.replace(/\/[^/]+$/, '') + '/' + imagePath;
      }
      
      const fileData = await readFile(imagePath);
      if (fileData) {
        const mimeType = getMimeType(img.src);
        const base64 = Buffer.from(fileData).toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;
        const newTag = `<img${img.before}src="${dataUri}"${img.after}>`;
        processed = processed.replace(img.original, newTag);
      }
    } catch {
      // Keep original src if conversion fails
    }
  }

  // Process background images in inline styles
  const styleAttrPattern = /style="([^"]*)"/gi;
  processed = processed.replace(styleAttrPattern, (match, styleValue) => {
    if (!styleValue.includes('background-image')) {
      return match;
    }
    
    const bgMatch = styleValue.match(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i);
    if (!bgMatch) {
      return match;
    }
    
    const imageUrl = bgMatch[1];
    
    // Skip if already a data URI or external URL
    if (isDataUri(imageUrl) || isExternalUrl(imageUrl)) {
      return match;
    }
    
    // For background images, we can't easily convert them without async file reading
    // So we leave them as-is with a comment
    return match;
  });

  const content = extractContent(processed);
  return buildEmbeddedDocument(content, originalStyles);
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
