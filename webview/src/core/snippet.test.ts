/**
 * Snippet System Tests
 * 
 * Tests for snippet infrastructure, schema validation, and built-in snippets.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateSnippet,
  filterSnippetsByCategory,
  searchSnippets,
  SNIPPET_CATEGORIES,
  isBuiltInSnippet,
  createSnippetFromHtml
} from './snippet';
import {
  getBuiltInSnippets,
  getBuiltInSnippetById,
  getSnippetsByCategory,
  getSnippetCategories,
  getSnippetCount,
  getSnippetCountByCategory
} from './snippets/registry';
import type { Snippet, SnippetCategory } from './types';

describe('Snippet Schema Validation', () => {
  it('should validate a valid snippet', () => {
    const validSnippet: Snippet = {
      id: 'test-snippet',
      name: 'Test Snippet',
      category: 'cards',
      html: '<div>Test</div>',
      description: 'A test snippet'
    };
    
    const result = validateSnippet(validSnippet);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject snippet without id', () => {
    const snippet = {
      name: 'Test',
      category: 'cards',
      html: '<div>Test</div>'
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snippet must have a string id');
  });
  
  it('should reject snippet without name', () => {
    const snippet = {
      id: 'test',
      category: 'cards',
      html: '<div>Test</div>'
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snippet must have a string name');
  });
  
  it('should reject snippet with invalid category', () => {
    const snippet = {
      id: 'test',
      name: 'Test',
      category: 'invalid',
      html: '<div>Test</div>'
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snippet must have a valid category');
  });
  
  it('should reject snippet without html', () => {
    const snippet = {
      id: 'test',
      name: 'Test',
      category: 'cards'
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snippet must have string html');
  });
  
  it('should reject null input', () => {
    const result = validateSnippet(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snippet must be an object');
  });
  
  it('should validate optional preview field', () => {
    const snippet: Snippet = {
      id: 'test',
      name: 'Test',
      category: 'cards',
      html: '<div>Test</div>',
      preview: 'data:image/png;base64,...'
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(true);
  });
  
  it('should reject non-string preview', () => {
    const snippet = {
      id: 'test',
      name: 'Test',
      category: 'cards',
      html: '<div>Test</div>',
      preview: 123
    };
    
    const result = validateSnippet(snippet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Preview must be a string if provided');
  });
});

describe('Snippet Categories', () => {
  it('should have all expected categories', () => {
    const categories = Object.keys(SNIPPET_CATEGORIES);
    expect(categories).toContain('cards');
    expect(categories).toContain('buttons');
    expect(categories).toContain('navbars');
    expect(categories).toContain('tables');
    expect(categories).toContain('forms');
    expect(categories).toHaveLength(5);
  });
  
  it('should have human-readable category names', () => {
    expect(SNIPPET_CATEGORIES.cards).toBe('Cards');
    expect(SNIPPET_CATEGORIES.buttons).toBe('Buttons');
    expect(SNIPPET_CATEGORIES.navbars).toBe('Navigation Bars');
    expect(SNIPPET_CATEGORIES.tables).toBe('Tables');
    expect(SNIPPET_CATEGORIES.forms).toBe('Forms');
  });
});

describe('Built-in Snippets', () => {
  let snippets: Snippet[];
  
  beforeAll(() => {
    snippets = getBuiltInSnippets();
  });
  
  it('should have at least 25 built-in snippets (5 per category)', () => {
    expect(snippets.length).toBeGreaterThanOrEqual(25);
    expect(getSnippetCount()).toBeGreaterThanOrEqual(25);
  });
  
  it('should have exactly 5 snippets per category', () => {
    const counts = getSnippetCountByCategory();
    expect(counts.cards).toBe(5);
    expect(counts.buttons).toBe(5);
    expect(counts.navbars).toBe(5);
    expect(counts.tables).toBe(5);
    expect(counts.forms).toBe(5);
  });
  
  it('should have snippets for all categories', () => {
    const categories = getSnippetCategories();
    categories.forEach(category => {
      const categorySnippets = getSnippetsByCategory(category);
      expect(categorySnippets.length).toBe(5);
    });
  });
  
  // Card snippets
  it('should have card-basic snippet', () => {
    const snippet = getBuiltInSnippetById('card-basic');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('cards');
    expect(snippet?.name).toBe('Basic Card');
    expect(snippet?.html).toContain('Card Title');
  });
  
  it('should have card-image snippet', () => {
    const snippet = getBuiltInSnippetById('card-image');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('cards');
    expect(snippet?.name).toBe('Image Card');
    expect(snippet?.html).toContain('img');
  });
  
  it('should have card-profile snippet', () => {
    const snippet = getBuiltInSnippetById('card-profile');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('cards');
    expect(snippet?.name).toBe('Profile Card');
    expect(snippet?.html).toContain('John Doe');
  });
  
  it('should have card-pricing snippet', () => {
    const snippet = getBuiltInSnippetById('card-pricing');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('cards');
    expect(snippet?.name).toBe('Pricing Card');
    expect(snippet?.html).toContain('$29');
  });
  
  it('should have card-testimonial snippet', () => {
    const snippet = getBuiltInSnippetById('card-testimonial');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('cards');
    expect(snippet?.name).toBe('Testimonial Card');
    expect(snippet?.html).toContain('Sarah Mitchell');
  });
  
  // Button snippets
  it('should have button-primary snippet', () => {
    const snippet = getBuiltInSnippetById('button-primary');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('buttons');
    expect(snippet?.name).toBe('Primary Button');
    expect(snippet?.html).toContain('button');
  });
  
  it('should have button-secondary snippet', () => {
    const snippet = getBuiltInSnippetById('button-secondary');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('buttons');
    expect(snippet?.name).toBe('Secondary Button');
  });
  
  it('should have button-gradient snippet', () => {
    const snippet = getBuiltInSnippetById('button-gradient');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('buttons');
    expect(snippet?.name).toBe('Gradient Button');
  });
  
  it('should have button-icon snippet', () => {
    const snippet = getBuiltInSnippetById('button-icon');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('buttons');
    expect(snippet?.name).toBe('Icon Button');
  });
  
  it('should have button-group snippet', () => {
    const snippet = getBuiltInSnippetById('button-group');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('buttons');
    expect(snippet?.name).toBe('Button Group');
  });
  
  // Navbar snippets
  it('should have navbar-simple snippet', () => {
    const snippet = getBuiltInSnippetById('navbar-simple');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('navbars');
    expect(snippet?.name).toBe('Simple Navbar');
    expect(snippet?.html).toContain('nav');
  });
  
  it('should have navbar-centered snippet', () => {
    const snippet = getBuiltInSnippetById('navbar-centered');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('navbars');
    expect(snippet?.name).toBe('Centered Navbar');
  });
  
  it('should have navbar-dropdown snippet', () => {
    const snippet = getBuiltInSnippetById('navbar-dropdown');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('navbars');
    expect(snippet?.name).toBe('Navbar with Dropdown');
  });
  
  it('should have navbar-search snippet', () => {
    const snippet = getBuiltInSnippetById('navbar-search');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('navbars');
    expect(snippet?.name).toBe('Navbar with Search');
  });
  
  it('should have navbar-mobile snippet', () => {
    const snippet = getBuiltInSnippetById('navbar-mobile');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('navbars');
    expect(snippet?.name).toBe('Mobile-friendly Navbar');
  });
  
  // Table snippets
  it('should have table-basic snippet', () => {
    const snippet = getBuiltInSnippetById('table-basic');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('tables');
    expect(snippet?.name).toBe('Basic Table');
    expect(snippet?.html).toContain('table');
  });
  
  it('should have table-striped snippet', () => {
    const snippet = getBuiltInSnippetById('table-striped');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('tables');
    expect(snippet?.name).toBe('Striped Table');
  });
  
  it('should have table-bordered snippet', () => {
    const snippet = getBuiltInSnippetById('table-bordered');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('tables');
    expect(snippet?.name).toBe('Bordered Table');
  });
  
  it('should have table-hover snippet', () => {
    const snippet = getBuiltInSnippetById('table-hover');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('tables');
    expect(snippet?.name).toBe('Hoverable Table');
  });
  
  it('should have table-pricing snippet', () => {
    const snippet = getBuiltInSnippetById('table-pricing');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('tables');
    expect(snippet?.name).toBe('Pricing Comparison Table');
  });
  
  // Form snippets
  it('should have form-login snippet', () => {
    const snippet = getBuiltInSnippetById('form-login');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('forms');
    expect(snippet?.name).toBe('Login Form');
    expect(snippet?.html).toContain('form');
    expect(snippet?.html).toContain('input');
  });
  
  it('should have form-contact snippet', () => {
    const snippet = getBuiltInSnippetById('form-contact');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('forms');
    expect(snippet?.name).toBe('Contact Form');
  });
  
  it('should have form-search snippet', () => {
    const snippet = getBuiltInSnippetById('form-search');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('forms');
    expect(snippet?.name).toBe('Search Form');
  });
  
  it('should have form-survey snippet', () => {
    const snippet = getBuiltInSnippetById('form-survey');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('forms');
    expect(snippet?.name).toBe('Survey Form');
  });
  
  it('should have form-inline snippet', () => {
    const snippet = getBuiltInSnippetById('form-inline');
    expect(snippet).toBeDefined();
    expect(snippet?.category).toBe('forms');
    expect(snippet?.name).toBe('Inline Form');
  });
  
  it('should validate all built-in snippets', () => {
    snippets.forEach(snippet => {
      const result = validateSnippet(snippet);
      expect(result.valid).toBe(true), `Snippet "${snippet.id}" should be valid`;
    });
  });
  
  it('should have descriptions for all snippets', () => {
    snippets.forEach(snippet => {
      expect(snippet.description).toBeDefined();
      expect(typeof snippet.description).toBe('string');
      expect(snippet.description!.length).toBeGreaterThan(0);
    });
  });
  
  it('should have HTML content for all snippets', () => {
    snippets.forEach(snippet => {
      expect(snippet.html).toBeDefined();
      expect(snippet.html.length).toBeGreaterThan(0);
      expect(snippet.html).toContain('<');
    });
  });
  
  it('should have previews for all snippets', () => {
    snippets.forEach(snippet => {
      expect(snippet.preview).toBeDefined();
      expect(snippet.preview).toContain('data:image/svg+xml;base64,');
    });
  });
});

describe('Snippet Filtering', () => {
  const snippets = getBuiltInSnippets();
  
  it('should filter snippets by category', () => {
    const cardSnippets = filterSnippetsByCategory(snippets, 'cards');
    expect(cardSnippets.length).toBe(5);
    expect(cardSnippets.every(s => s.category === 'cards')).toBe(true);
    
    const buttonSnippets = filterSnippetsByCategory(snippets, 'buttons');
    expect(buttonSnippets.length).toBe(5);
    expect(buttonSnippets.every(s => s.category === 'buttons')).toBe(true);
  });
  
  it('should return all snippets when category is null', () => {
    const allSnippets = filterSnippetsByCategory(snippets, null);
    expect(allSnippets.length).toBe(snippets.length);
  });
  
  it('should filter snippets by search query', () => {
    const results = searchSnippets(snippets, 'card');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(s => s.name.toLowerCase().includes('card'))).toBe(true);
  });
  
  it('should search by description as well', () => {
    const results = searchSnippets(snippets, 'action');
    expect(results.length).toBeGreaterThan(0);
  });
  
  it('should be case insensitive', () => {
    const upper = searchSnippets(snippets, 'CARD');
    const lower = searchSnippets(snippets, 'card');
    expect(upper.length).toBe(lower.length);
  });
  
  it('should return all snippets for empty search', () => {
    const results = searchSnippets(snippets, '   ');
    expect(results.length).toBe(snippets.length);
  });
});

describe('Snippet Creation', () => {
  it('should create snippet with createSnippetFromHtml', () => {
    const snippet = createSnippetFromHtml(
      'custom',
      'Custom Snippet',
      'cards',
      '<div>Custom</div>',
      { description: 'A custom snippet' }
    );
    
    expect(snippet.id).toBe('custom');
    expect(snippet.name).toBe('Custom Snippet');
    expect(snippet.category).toBe('cards');
    expect(snippet.html).toBe('<div>Custom</div>');
    expect(snippet.description).toBe('A custom snippet');
    expect(snippet.createdAt).toBeDefined();
  });
  
  it('should identify built-in snippets correctly', () => {
    const builtInIds = getBuiltInSnippets().map(s => s.id);
    
    expect(isBuiltInSnippet('card-basic', builtInIds)).toBe(true);
    expect(isBuiltInSnippet('button-primary', builtInIds)).toBe(true);
    expect(isBuiltInSnippet('non-existent', builtInIds)).toBe(false);
  });
});
