/**
 * Built-in Template Registry
 * 
 * This module exports all built-in templates as a registry.
 * Each template includes its metadata and HTML content.
 */

import type { Template, TemplateCategory } from '../types';
import { createTemplateFromHtml } from '../template';

// Import built-in templates as raw strings
// Using dynamic imports for code splitting
import blogPostHtml from './built-in/blog-post.html?raw';
import productPageHtml from './built-in/product-page.html?raw';
import resumeHtml from './built-in/resume.html?raw';
import documentationHtml from './built-in/documentation.html?raw';
import emailHtml from './built-in/email.html?raw';

/**
 * Built-in template definitions
 */
export const BUILT_IN_TEMPLATES: Template[] = [
  createTemplateFromHtml(
    'blog-post',
    'Blog Post',
    'blog',
    blogPostHtml,
    {
      description: 'A professional blog article template with header, content sections, and author info',
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyA5aDE4bC0xLjUgMS41TTE4IDl2NUw5IDV2NloiIHN0cm9rZT0iIzY2N2VhYSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4='
    }
  ),
  createTemplateFromHtml(
    'product-page',
    'Product Page',
    'product',
    productPageHtml,
    {
      description: 'A conversion-focused product landing page with hero, features, and CTA sections',
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4PSI2IiB5PSI2IiByeD0iMSIgZmlsbD0iIzY2N2VhYSIvPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIHg9IjEwIiB5PSIxMCIgcng9IjEiIGZpbGw9IiM3NjRiYTIiLz48L3N2Zz4='
    }
  ),
  createTemplateFromHtml(
    'resume',
    'Resume',
    'resume',
    resumeHtml,
    {
      description: 'A professional resume/CV template with contact info, experience, and skills sections',
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMjAiIHg9IjQiIHk9IjIiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPjxtYXBhdGggZD0iTTggN2gxMHYxSDhWN3ptMCAzaDFsMSAxIDEtMUg4em02IDBoNXYxSDhWMTB6bTEtNGgxNHYxSDlWOW0wIDNIMTN2NUg5VjloMS41TDExIDdIMTNabTIgMGEyLjUgMi41IDAgMSAwLTUgMCAyLjUgMi41IDAgMSAwIDUgMHptMS41IDEuNWwuNS0uNSIvLz48L3N2Zz4='
    }
  ),
  createTemplateFromHtml(
    'documentation',
    'Documentation',
    'docs',
    documentationHtml,
    {
      description: 'A clean documentation page with navigation, content sections, and code examples',
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSIzIiB5MT0iNyIgeDI9IjE4IiB5Mj0iNyIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMyIgeTE9IjExIiB4Mj0iMTgiIHkyPSIxMSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMyIgeTE9IjE1IiB4Mj0iMTgiIHkyPSIxNSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4='
    }
  ),
  createTemplateFromHtml(
    'email',
    'Email',
    'email',
    emailHtml,
    {
      description: 'A professional HTML email template with responsive design and email-safe styles',
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHg9IjMiIHk9IjUiIHJ4PSIxIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPjxyZWN0IHdpZHRoPSI2IiBoZWlnaHQ9IjMiIHg9IjUgNiIgcng9IjEiIGZpbGw9IiM2NjdlYWEiLz48L3N2Zz4='
    }
  )
];

/**
 * Get all built-in templates
 */
export function getBuiltInTemplates(): Template[] {
  return BUILT_IN_TEMPLATES;
}

/**
 * Get a built-in template by ID
 */
export function getBuiltInTemplateById(id: string): Template | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return BUILT_IN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): TemplateCategory[] {
  return ['blog', 'product', 'resume', 'docs', 'email'];
}

/**
 * Get template count
 */
export function getTemplateCount(): number {
  return BUILT_IN_TEMPLATES.length;
}
