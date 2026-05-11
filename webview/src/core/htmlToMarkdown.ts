/**
 * HTML to Markdown converter using Turndown library.
 * Converts HTML elements to Markdown syntax with custom rules.
 */

import TurndownService from 'turndown';

/**
 * Create a configured TurndownService instance with custom rules
 * for proper HTML to Markdown conversion.
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',      // Use # for headings
    codeBlockStyle: 'fenced', // Use ``` for code blocks
    bulletListMarker: '-',    // Use - for unordered lists
    emDelimiter: '*',         // Use * for italic
    strongDelimiter: '**',    // Use ** for bold
    linkStyle: 'inlined',     // Use [text](url) style
    linkReferenceStyle: 'full',
  });

  // Custom rule for strikethrough (del/s)
  turndown.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content: string) => `~~${content}~~`,
  });

  // Custom rule for inline code within text (code tag)
  turndown.addRule('inlineCode', {
    filter: (node: Node) => {
      return (
        node.nodeName === 'CODE' &&
        node.parentNode?.nodeName !== 'PRE'
      );
    },
    replacement: (content: string) => {
      // Escape backticks within code if present
      if (content.includes('`')) {
        return `\`\`${content}\`\``;
      }
      return `\`${content}\``;
    },
  });

  // Custom rule for code blocks (pre > code)
  turndown.addRule('codeBlock', {
    filter: 'pre',
    replacement: (content: string, node: Node) => {
      const pre = node as Element;
      const codeElement = pre.querySelector('code');
      const className = codeElement?.getAttribute('class') || '';
      const languageMatch = className.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : '';
      
      // Remove the code element wrapper from content
      const codeContent = codeElement?.textContent || pre.textContent || '';
      
      return `\n\`\`\`${language}\n${codeContent.trim()}\n\`\`\`\n`;
    },
  });

  // Custom rule for tables
  turndown.addRule('tables', {
    filter: 'table',
    replacement: (content: string, node: Node) => {
      const table = node as Element;
      let markdown = '';
      
      // Process header row
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        const headers = headerRow.querySelectorAll('th');
        markdown += '| ' + Array.from(headers).map((th: Element) => th.textContent?.trim() || '').join(' | ') + ' |\n';
        markdown += '| ' + Array(headers.length).fill('---').join(' | ') + ' |\n';
      }
      
      // Process body rows
      const bodyRows = table.querySelectorAll('tbody tr');
      bodyRows.forEach((row: Element) => {
        const cells = row.querySelectorAll('td');
        markdown += '| ' + Array.from(cells).map((td: Element) => td.textContent?.trim() || '').join(' | ') + ' |\n';
      });
      
      // Also handle tables without tbody
      if (!table.querySelector('tbody')) {
        const rows = table.querySelectorAll('tr');
        const headerProcessed = !!table.querySelector('thead');
        
        rows.forEach((row: Element, index: number) => {
          const cells = row.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map((cell: Element) => cell.textContent?.trim() || '');
          
          if (!headerProcessed && index === 0) {
            // This might be a header row without thead
            markdown += '| ' + cellTexts.join(' | ') + ' |\n';
            markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
          } else {
            markdown += '| ' + cellTexts.join(' | ') + ' |\n';
          }
        });
      }
      
      return '\n' + markdown + '\n';
    },
  });

  // Custom rule for blockquotes
  turndown.addRule('blockquotes', {
    filter: 'blockquote',
    replacement: (content: string) => {
      // Prefix each line with >
      const lines = content.trim().split('\n');
      return '\n' + lines.map(line => '> ' + line).join('\n') + '\n';
    },
  });

  // Custom rule for images
  turndown.addRule('images', {
    filter: 'img',
    replacement: (content: string, node: Node) => {
      const img = node as HTMLImageElement;
      const alt = img.alt || '';
      const src = img.src || '';
      return `![${alt}](${src})`;
    },
  });

  // Custom rule for links
  turndown.addRule('links', {
    filter: 'a',
    replacement: (content: string, node: Node) => {
      const link = node as HTMLAnchorElement;
      const href = link.href || '';
      const text = content.trim();
      
      // Handle mailto links
      if (href.startsWith('mailto:')) {
        return `[${text}](${href})`;
      }
      
      return `[${text}](${href})`;
    },
  });

  // Custom rule for horizontal rules
  turndown.addRule('horizontalRules', {
    filter: 'hr',
    replacement: () => '\n---\n\n',
  });

  return turndown;
}

// Cache the turndown service instance
let turndownInstance: TurndownService | null = null;

/**
 * Get or create the TurndownService instance
 */
function getTurndownService(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService();
  }
  return turndownInstance;
}

/**
 * Convert HTML string to Markdown.
 * @param html - The HTML string to convert
 * @returns The converted Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const turndown = getTurndownService();
  return turndown.turndown(html);
}

/**
 * Reset the TurndownService instance (useful for testing)
 */
export function resetTurndownService(): void {
  turndownInstance = null;
}
