import * as fs from 'fs';
import * as path from 'path';
import type { BacklinkInfo, WikiPage } from '../shared/types';

/**
 * Regex to match wiki link syntax [[Page Name]]
 */
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * BacklinksIndex - tracks which pages link to which other pages
 */
export class BacklinksIndex {
  private backlinksMap: Map<string, BacklinkInfo[]> = new Map();
  private workspaceRoot: string | null = null;
  private documentUri: string | null = null;

  /**
   * Set the workspace root and current document URI
   */
  public setContext(workspaceRoot: string, documentUri: string) {
    this.workspaceRoot = workspaceRoot;
    this.documentUri = documentUri;
  }

  /**
   * Get all pages in the workspace
   */
  public getAllPages(): WikiPage[] {
    const pages: WikiPage[] = [];
    
    if (!this.workspaceRoot) {
      return pages;
    }

    try {
      const htmlFiles = this.findHtmlFiles(this.workspaceRoot);
      
      for (const filePath of htmlFiles) {
        const pageName = this.getPageNameFromPath(filePath);
        pages.push({
          name: pageName,
          path: filePath,
        });
      }
    } catch (error) {
      console.error('Error getting all pages:', error);
    }

    return pages;
  }

  /**
   * Find all HTML files in the workspace
   */
  private findHtmlFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and hidden directories
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            files.push(...this.findHtmlFiles(fullPath));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.htm'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Extract page name from file path
   */
  private getPageNameFromPath(filePath: string): string {
    const basename = path.basename(filePath);
    // Remove extension
    return basename.replace(/\.(html|htm)$/i, '');
  }

  /**
   * Get backlinks for a specific page name
   */
  public getBacklinks(pageName: string): BacklinkInfo[] {
    return this.backlinksMap.get(pageName) || [];
  }

  /**
   * Update the backlinks index by scanning all HTML files in the workspace
   */
  public async updateIndex(): Promise<void> {
    this.backlinksMap.clear();
    
    if (!this.workspaceRoot) {
      return;
    }

    try {
      const htmlFiles = this.findHtmlFiles(this.workspaceRoot);
      
      for (const filePath of htmlFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const backlinks = this.extractBacklinks(content, filePath);
        
        // Add each backlink to the index
        for (const backlink of backlinks) {
          const existing = this.backlinksMap.get(backlink.pageName) || [];
          
          // Check if we already have this page
          const existingEntry = existing.find(e => e.pagePath === backlink.pagePath);
          if (existingEntry) {
            existingEntry.linkCount += backlink.linkCount;
          } else {
            existing.push(backlink);
          }
          
          this.backlinksMap.set(backlink.pageName, existing);
        }
      }
    } catch (error) {
      console.error('Error updating backlinks index:', error);
    }
  }

  /**
   * Extract backlinks from HTML content
   */
  private extractBacklinks(content: string, sourcePath: string): BacklinkInfo[] {
    const backlinks: BacklinkInfo[] = [];
    const matches = content.matchAll(WIKI_LINK_REGEX);
    const sourcePageName = this.getPageNameFromPath(sourcePath);
    
    // Count links per target page
    const linkCounts = new Map<string, number>();
    
    for (const match of matches) {
      const pageName = match[1]?.trim();
      if (pageName) {
        const count = linkCounts.get(pageName) || 0;
        linkCounts.set(pageName, count + 1);
      }
    }
    
    // Create backlink info entries
    for (const [pageName, count] of linkCounts) {
      // Skip self-references
      if (pageName.toLowerCase() === sourcePageName.toLowerCase()) {
        continue;
      }
      
      backlinks.push({
        pageName,
        pagePath: sourcePath,
        preview: this.getPreview(content, pageName),
        linkCount: count,
      });
    }

    return backlinks;
  }

  /**
   * Get a preview of the context around wiki links
   */
  private getPreview(content: string, pageName: string): string {
    // Find the first occurrence of the wiki link
    const escapedName = pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[\\[${escapedName}\\]\\]`, 'i');
    const match = content.match(regex);
    
    if (!match || match.index === undefined) {
      return '';
    }

    // Extract surrounding text (up to 100 chars before and after)
    const start = Math.max(0, match.index - 100);
    const end = Math.min(content.length, match.index + match[0].length + 100);
    let preview = content.slice(start, end);
    
    // Clean up HTML tags
    preview = preview.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    preview = preview.replace(/\s+/g, ' ').trim();
    
    // Add ellipsis if truncated
    if (start > 0) {
      preview = '...' + preview;
    }
    if (end < content.length) {
      preview = preview + '...';
    }

    return preview;
  }

  /**
   * Get the current page name from the document
   */
  public getCurrentPageName(): string {
    if (!this.documentUri) {
      return '';
    }

    return this.getPageNameFromPath(this.documentUri);
  }
}

// Singleton instance
export const backlinksIndex = new BacklinksIndex();
