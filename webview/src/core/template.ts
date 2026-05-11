/**
 * Template System Infrastructure
 * 
 * This module provides the infrastructure for Htmly's template system:
 * - Template schema and types
 * - Template storage utilities
 * - Built-in template registry
 */

import type { Template, TemplateCategory, TemplateMetadata } from './types';

// Re-export types for external use
export type { Template, TemplateCategory, TemplateMetadata };

// Default template storage directory name
export const TEMPLATES_DIR = '.htmly/templates';

// Template categories with display names
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  blog: 'Blog',
  product: 'Product Page',
  resume: 'Resume',
  docs: 'Documentation',
  email: 'Email'
};

/**
 * Template schema validator
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a template object against the schema
 */
export function validateTemplate(template: unknown): TemplateValidationResult {
  const errors: string[] = [];
  
  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }
  
  const t = template as Record<string, unknown>;
  
  // Required fields
  if (!t.id || typeof t.id !== 'string') {
    errors.push('Template must have a string id');
  }
  
  if (!t.name || typeof t.name !== 'string') {
    errors.push('Template must have a string name');
  }
  
  if (!t.category || !TEMPLATE_CATEGORIES[t.category as TemplateCategory]) {
    errors.push('Template must have a valid category');
  }
  
  if (!t.content || typeof t.content !== 'string') {
    errors.push('Template must have string content');
  }
  
  // Optional fields validation
  if (t.thumbnail !== undefined && typeof t.thumbnail !== 'string') {
    errors.push('Thumbnail must be a string if provided');
  }
  
  if (t.description !== undefined && typeof t.description !== 'string') {
    errors.push('Description must be a string if provided');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get built-in template directory path (relative to extension root)
 */
export function getBuiltInTemplatePath(templateId: string): string {
  return `templates/built-in/${templateId}.html`;
}

/**
 * Get user template directory path
 */
export function getUserTemplatePath(templateId: string): string {
  return `${TEMPLATES_DIR}/${templateId}.html`;
}

/**
 * Parse template from HTML file content
 * Extracts metadata from HTML comments at the top of the file
 */
export function parseTemplateMetadata(html: string, id: string): Partial<TemplateMetadata> {
  const metadata: Partial<TemplateMetadata> = { id };
  
  // Look for template metadata in HTML comments
  const metaMatch = html.match(/<!--\s*template:\s*(\{[^}]+\})\s*-->/i);
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
 * Create a template from HTML content with metadata
 */
export function createTemplateFromHtml(
  id: string,
  name: string,
  category: TemplateCategory,
  html: string,
  options?: {
    description?: string;
    thumbnail?: string;
  }
): Template {
  return {
    id,
    name,
    category,
    content: html,
    description: options?.description,
    thumbnail: options?.thumbnail,
    createdAt: Date.now()
  };
}

/**
 * Check if a template is a built-in template
 */
export function isBuiltInTemplate(templateId: string, builtInIds: string[]): boolean {
  return builtInIds.includes(templateId);
}

/**
 * Filter templates by category
 */
export function filterByCategory(
  templates: Template[],
  category: TemplateCategory | null
): Template[] {
  if (!category) {
    return templates;
  }
  return templates.filter(t => t.category === category);
}

/**
 * Search templates by name or description
 */
export function searchTemplates(templates: Template[], query: string): Template[] {
  if (!query.trim()) {
    return templates;
  }
  
  const lowerQuery = query.toLowerCase();
  return templates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    (t.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}
