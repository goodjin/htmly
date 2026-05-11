/**
 * Template System Types
 * 
 * Defines the schema for Htmly templates.
 */

/**
 * Template categories
 */
export type TemplateCategory = 'blog' | 'product' | 'resume' | 'docs' | 'email';

/**
 * Template metadata (without full content)
 * Used for template listing and selection
 */
export interface TemplateMetadata {
  /** Unique identifier for the template */
  id: string;
  /** Display name */
  name: string;
  /** Template category */
  category: TemplateCategory;
  /** Optional thumbnail preview (base64 or URL) */
  thumbnail?: string;
  /** Optional description */
  description?: string;
  /** When this template was created */
  createdAt?: number;
}

/**
 * Full template with content
 * The complete template including HTML content
 */
export interface Template extends TemplateMetadata {
  /** HTML content of the template */
  content: string;
}

/**
 * User template storage entry
 */
export interface UserTemplate {
  /** Template ID (filename without extension) */
  id: string;
  /** File path relative to workspace */
  path: string;
  /** When the template was last modified */
  modifiedAt: number;
}

/**
 * Template storage configuration
 */
export interface TemplateStorageConfig {
  /** Directory for user templates */
  userTemplatesDir: string;
  /** Directory for built-in templates (relative to extension) */
  builtInTemplatesDir: string;
}

/**
 * Template selector state
 */
export interface TemplateSelectorState {
  /** Currently selected category filter */
  selectedCategory: TemplateCategory | null;
  /** Search query */
  searchQuery: string;
  /** Currently selected template */
  selectedTemplate: Template | null;
  /** Whether the selector is open */
  isOpen: boolean;
}

/**
 * Create a new user template from current content
 */
export interface SaveTemplateOptions {
  /** Template name (will be used as filename) */
  name: string;
  /** Template category */
  category: TemplateCategory;
  /** Optional description */
  description?: string;
  /** Optional thumbnail */
  thumbnail?: string;
}

// ============================================================
// Snippet System Types
// ============================================================

/**
 * Snippet categories
 */
export type SnippetCategory = 'cards' | 'buttons' | 'navbars' | 'tables' | 'forms';

/**
 * Snippet metadata (without full content)
 * Used for snippet listing and selection
 */
export interface SnippetMetadata {
  /** Unique identifier for the snippet */
  id: string;
  /** Display name */
  name: string;
  /** Snippet category */
  category: SnippetCategory;
  /** Optional preview/thumbnail (base64 or URL) */
  preview?: string;
  /** Optional description */
  description?: string;
  /** When this snippet was created */
  createdAt?: number;
}

/**
 * Full snippet with HTML content
 * The complete snippet including HTML
 */
export interface Snippet extends SnippetMetadata {
  /** HTML content of the snippet */
  html: string;
}

/**
 * User snippet storage entry
 */
export interface UserSnippet {
  /** Snippet ID (filename without extension) */
  id: string;
  /** File path relative to workspace */
  path: string;
  /** When the snippet was last modified */
  modifiedAt: number;
}

/**
 * Snippet storage configuration
 */
export interface SnippetStorageConfig {
  /** Directory for user snippets */
  userSnippetsDir: string;
  /** Directory for built-in snippets (relative to extension) */
  builtInSnippetsDir: string;
}

/**
 * Snippet selector state
 */
export interface SnippetSelectorState {
  /** Currently selected category filter */
  selectedCategory: SnippetCategory | null;
  /** Search query */
  searchQuery: string;
  /** Currently selected snippet */
  selectedSnippet: Snippet | null;
  /** Whether the selector is open */
  isOpen: boolean;
}

/**
 * Create a new user snippet from current content
 */
export interface SaveSnippetOptions {
  /** Snippet name (will be used as filename) */
  name: string;
  /** Snippet category */
  category: SnippetCategory;
  /** Optional description */
  description?: string;
  /** Optional preview */
  preview?: string;
}
