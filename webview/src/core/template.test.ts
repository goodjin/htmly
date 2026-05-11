/**
 * Template System Tests
 * 
 * Tests for template infrastructure, schema validation, and built-in templates.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateTemplate,
  filterByCategory,
  searchTemplates,
  TEMPLATE_CATEGORIES,
  isBuiltInTemplate,
  createTemplateFromHtml
} from './template';
import {
  getBuiltInTemplates,
  getBuiltInTemplateById,
  getTemplatesByCategory,
  getTemplateCategories,
  getTemplateCount
} from './templates/registry';
import type { Template, TemplateCategory } from './types';

describe('Template Schema Validation', () => {
  it('should validate a valid template', () => {
    const validTemplate: Template = {
      id: 'test-template',
      name: 'Test Template',
      category: 'blog',
      content: '<html><body>Test</body></html>',
      description: 'A test template'
    };
    
    const result = validateTemplate(validTemplate);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject template without id', () => {
    const template = {
      name: 'Test',
      category: 'blog',
      content: '<html></html>'
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must have a string id');
  });
  
  it('should reject template without name', () => {
    const template = {
      id: 'test',
      category: 'blog',
      content: '<html></html>'
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must have a string name');
  });
  
  it('should reject template with invalid category', () => {
    const template = {
      id: 'test',
      name: 'Test',
      category: 'invalid',
      content: '<html></html>'
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must have a valid category');
  });
  
  it('should reject template without content', () => {
    const template = {
      id: 'test',
      name: 'Test',
      category: 'blog'
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must have string content');
  });
  
  it('should reject null input', () => {
    const result = validateTemplate(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must be an object');
  });
  
  it('should validate optional thumbnail field', () => {
    const template: Template = {
      id: 'test',
      name: 'Test',
      category: 'blog',
      content: '<html></html>',
      thumbnail: 'data:image/png;base64,...'
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(true);
  });
  
  it('should reject non-string thumbnail', () => {
    const template = {
      id: 'test',
      name: 'Test',
      category: 'blog',
      content: '<html></html>',
      thumbnail: 123
    };
    
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Thumbnail must be a string if provided');
  });
});

describe('Template Categories', () => {
  it('should have all expected categories', () => {
    const categories = Object.keys(TEMPLATE_CATEGORIES);
    expect(categories).toContain('blog');
    expect(categories).toContain('product');
    expect(categories).toContain('resume');
    expect(categories).toContain('docs');
    expect(categories).toContain('email');
    expect(categories).toHaveLength(5);
  });
  
  it('should have human-readable category names', () => {
    expect(TEMPLATE_CATEGORIES.blog).toBe('Blog');
    expect(TEMPLATE_CATEGORIES.product).toBe('Product Page');
    expect(TEMPLATE_CATEGORIES.resume).toBe('Resume');
    expect(TEMPLATE_CATEGORIES.docs).toBe('Documentation');
    expect(TEMPLATE_CATEGORIES.email).toBe('Email');
  });
});

describe('Built-in Templates', () => {
  let templates: Template[];
  
  beforeAll(() => {
    templates = getBuiltInTemplates();
  });
  
  it('should have exactly 5 built-in templates', () => {
    expect(templates).toHaveLength(5);
    expect(getTemplateCount()).toBe(5);
  });
  
  it('should have templates for all categories', () => {
    const categories = getTemplateCategories();
    categories.forEach(category => {
      const categoryTemplates = getTemplatesByCategory(category);
      expect(categoryTemplates.length).toBeGreaterThan(0);
    });
  });
  
  it('should have a blog post template', () => {
    const blogTemplate = getBuiltInTemplateById('blog-post');
    expect(blogTemplate).toBeDefined();
    expect(blogTemplate?.category).toBe('blog');
    expect(blogTemplate?.name).toBe('Blog Post');
    expect(blogTemplate?.content).toContain('<html');
    expect(blogTemplate?.content).toContain('Article Title');
  });
  
  it('should have a product page template', () => {
    const productTemplate = getBuiltInTemplateById('product-page');
    expect(productTemplate).toBeDefined();
    expect(productTemplate?.category).toBe('product');
    expect(productTemplate?.name).toBe('Product Page');
    expect(productTemplate?.content).toContain('Product Name');
    expect(productTemplate?.content).toContain('Pricing');
  });
  
  it('should have a resume template', () => {
    const resumeTemplate = getBuiltInTemplateById('resume');
    expect(resumeTemplate).toBeDefined();
    expect(resumeTemplate?.category).toBe('resume');
    expect(resumeTemplate?.name).toBe('Resume');
    expect(resumeTemplate?.content).toContain('YOUR NAME');
    expect(resumeTemplate?.content).toContain('Work Experience');
  });
  
  it('should have a documentation template', () => {
    const docsTemplate = getBuiltInTemplateById('documentation');
    expect(docsTemplate).toBeDefined();
    expect(docsTemplate?.category).toBe('docs');
    expect(docsTemplate?.name).toBe('Documentation');
    expect(docsTemplate?.content).toContain('Documentation');
    expect(docsTemplate?.content).toContain('Getting Started');
  });
  
  it('should have an email template', () => {
    const emailTemplate = getBuiltInTemplateById('email');
    expect(emailTemplate).toBeDefined();
    expect(emailTemplate?.category).toBe('email');
    expect(emailTemplate?.name).toBe('Email');
    expect(emailTemplate?.content).toContain('Company Logo');
  });
  
  it('should validate all built-in templates', () => {
    templates.forEach(template => {
      const result = validateTemplate(template);
      expect(result.valid).toBe(true), `Template "${template.id}" should be valid`;
    });
  });
  
  it('should have descriptions for all templates', () => {
    templates.forEach(template => {
      expect(template.description).toBeDefined();
      expect(typeof template.description).toBe('string');
      expect(template.description!.length).toBeGreaterThan(0);
    });
  });
  
  it('should have HTML content for all templates', () => {
    templates.forEach(template => {
      expect(template.content).toBeDefined();
      expect(template.content).toContain('<html');
      expect(template.content).toContain('<body');
    });
  });
});

describe('Template Filtering', () => {
  const templates = getBuiltInTemplates();
  
  it('should filter templates by category', () => {
    const blogTemplates = filterByCategory(templates, 'blog');
    expect(blogTemplates.length).toBe(1);
    expect(blogTemplates[0].id).toBe('blog-post');
    
    const productTemplates = filterByCategory(templates, 'product');
    expect(productTemplates.length).toBe(1);
    expect(productTemplates[0].id).toBe('product-page');
  });
  
  it('should return all templates when category is null', () => {
    const allTemplates = filterByCategory(templates, null);
    expect(allTemplates.length).toBe(templates.length);
  });
  
  it('should filter templates by search query', () => {
    const results = searchTemplates(templates, 'blog');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(t => t.name.toLowerCase().includes('blog'))).toBe(true);
  });
  
  it('should search by description as well', () => {
    const results = searchTemplates(templates, 'professional');
    expect(results.length).toBeGreaterThan(0);
  });
  
  it('should be case insensitive', () => {
    const upper = searchTemplates(templates, 'BLOG');
    const lower = searchTemplates(templates, 'blog');
    expect(upper.length).toBe(lower.length);
  });
  
  it('should return all templates for empty search', () => {
    const results = searchTemplates(templates, '   ');
    expect(results.length).toBe(templates.length);
  });
});

describe('Template Creation', () => {
  it('should create template with createTemplateFromHtml', () => {
    const template = createTemplateFromHtml(
      'custom',
      'Custom Template',
      'blog',
      '<html><body>Custom</body></html>',
      { description: 'A custom template' }
    );
    
    expect(template.id).toBe('custom');
    expect(template.name).toBe('Custom Template');
    expect(template.category).toBe('blog');
    expect(template.content).toBe('<html><body>Custom</body></html>');
    expect(template.description).toBe('A custom template');
    expect(template.createdAt).toBeDefined();
  });
  
  it('should identify built-in templates correctly', () => {
    const builtInIds = getBuiltInTemplates().map(t => t.id);
    
    expect(isBuiltInTemplate('blog-post', builtInIds)).toBe(true);
    expect(isBuiltInTemplate('product-page', builtInIds)).toBe(true);
    expect(isBuiltInTemplate('non-existent', builtInIds)).toBe(false);
  });
});
