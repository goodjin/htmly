import { backlinksIndex } from '../backlinksIndex';
import type { WikiPage, BacklinkInfo } from '../../shared/types';

/**
 * BacklinksService - Handles backlinks integration.
 * This service is responsible for:
 * - Setting context (workspace root, current page)
 * - Updating the backlinks index
 * - Getting all pages for autocomplete
 * - Getting backlinks for a specific page
 */
export class BacklinksService {
  /**
   * Set context for backlinks index
   */
  public setContext(workspaceRoot: string, docKey: string): void {
    backlinksIndex.setContext(workspaceRoot, docKey);
  }

  /**
   * Update the backlinks index
   */
  public async updateIndex(): Promise<void> {
    await backlinksIndex.updateIndex();
  }

  /**
   * Get all wiki pages
   */
  public getAllPages(): WikiPage[] {
    return backlinksIndex.getAllPages();
  }

  /**
   * Get backlinks for a specific page
   */
  public getBacklinks(pageName: string): BacklinkInfo[] {
    return backlinksIndex.getBacklinks(pageName);
  }

  /**
   * Get current page name from the backlinks index
   */
  public getCurrentPageName(): string {
    return backlinksIndex.getCurrentPageName();
  }
}

/**
 * Creates a new BacklinksService instance
 */
export function createBacklinksService(): BacklinksService {
  return new BacklinksService();
}