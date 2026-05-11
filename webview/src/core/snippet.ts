/**
 * Snippet System Infrastructure
 * 
 * This module provides the infrastructure for Htmly's snippet system:
 * - Snippet schema and types
 * - Snippet storage utilities
 * - Built-in snippet registry
 */

import type { Snippet, SnippetCategory, SnippetMetadata } from './types';

// Re-export types for external use
export type { Snippet, SnippetCategory, SnippetMetadata };

// Default snippet storage directory name
export const SNIPPETS_DIR = '.htmly/snippets';

// Snippet categories with display names
export const SNIPPET_CATEGORIES: Record<SnippetCategory, string> = {
  cards: 'Cards',
  buttons: 'Buttons',
  navbars: 'Navigation Bars',
  tables: 'Tables',
  forms: 'Forms'
};

/**
 * Snippet schema validator
 */
export interface SnippetValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a snippet object against the schema
 */
export function validateSnippet(snippet: unknown): SnippetValidationResult {
  const errors: string[] = [];
  
  if (!snippet || typeof snippet !== 'object') {
    return { valid: false, errors: ['Snippet must be an object'] };
  }
  
  const s = snippet as Record<string, unknown>;
  
  // Required fields
  if (!s.id || typeof s.id !== 'string') {
    errors.push('Snippet must have a string id');
  }
  
  if (!s.name || typeof s.name !== 'string') {
    errors.push('Snippet must have a string name');
  }
  
  if (!s.category || !SNIPPET_CATEGORIES[s.category as SnippetCategory]) {
    errors.push('Snippet must have a valid category');
  }
  
  if (!s.html || typeof s.html !== 'string') {
    errors.push('Snippet must have string html');
  }
  
  // Optional fields validation
  if (s.preview !== undefined && typeof s.preview !== 'string') {
    errors.push('Preview must be a string if provided');
  }
  
  if (s.description !== undefined && typeof s.description !== 'string') {
    errors.push('Description must be a string if provided');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get built-in snippet directory path (relative to extension root)
 */
export function getBuiltInSnippetPath(snippetId: string): string {
  return `snippets/built-in/${snippetId}.html`;
}

/**
 * Get user snippet directory path
 */
export function getUserSnippetPath(snippetId: string): string {
  return `${SNIPPETS_DIR}/${snippetId}.html`;
}

/**
 * Parse snippet from HTML file content
 * Extracts metadata from HTML comments at the top of the file
 */
export function parseSnippetMetadata(html: string, id: string): Partial<SnippetMetadata> {
  const metadata: Partial<SnippetMetadata> = { id };
  
  // Look for snippet metadata in HTML comments
  const metaMatch = html.match(/<!--\s*snippet:\s*(\{[^}]+\})\s*-->/i);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      Object.assign(metadata, parsed);
    } catch {
      // Invalid JSON in metadata, ignore
    }
  }
  
  return metadata;
}

/**
 * Create a snippet from HTML content with metadata
 */
export function createSnippetFromHtml(
  id: string,
  name: string,
  category: SnippetCategory,
  html: string,
  options?: {
    description?: string;
    preview?: string;
  }
): Snippet {
  return {
    id,
    name,
    category,
    html,
    description: options?.description,
    preview: options?.preview,
    createdAt: Date.now()
  };
}

/**
 * Check if a snippet is a built-in snippet
 */
export function isBuiltInSnippet(snippetId: string, builtInIds: string[]): boolean {
  return builtInIds.includes(snippetId);
}

/**
 * Filter snippets by category
 */
export function filterSnippetsByCategory(
  snippets: Snippet[],
  category: SnippetCategory | null
): Snippet[] {
  if (!category) {
    return snippets;
  }
  return snippets.filter(s => s.category === category);
}

/**
 * Search snippets by name or description
 */
export function searchSnippets(snippets: Snippet[], query: string): Snippet[] {
  if (!query.trim()) {
    return snippets;
  }
  
  const lowerQuery = query.toLowerCase();
  return snippets.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    (s.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

/**
 * Get all snippet categories
 */
export function getSnippetCategories(): SnippetCategory[] {
  return ['cards', 'buttons', 'navbars', 'tables', 'forms'];
}
