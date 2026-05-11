/**
 * Built-in Snippet Registry
 * 
 * This module exports all built-in snippets as a registry.
 * Each snippet includes its metadata and HTML content.
 */

import type { Snippet, SnippetCategory } from '../types';
import { createSnippetFromHtml } from '../snippet';

// Import built-in snippets as raw strings
import cardBasicHtml from './built-in/card-basic.html?raw';
import cardImageHtml from './built-in/card-image.html?raw';
import cardProfileHtml from './built-in/card-profile.html?raw';
import cardPricingHtml from './built-in/card-pricing.html?raw';
import cardTestimonialHtml from './built-in/card-testimonial.html?raw';

import buttonPrimaryHtml from './built-in/button-primary.html?raw';
import buttonSecondaryHtml from './built-in/button-secondary.html?raw';
import buttonGradientHtml from './built-in/button-gradient.html?raw';
import buttonIconHtml from './built-in/button-icon.html?raw';
import buttonGroupHtml from './built-in/button-group.html?raw';

import navbarSimpleHtml from './built-in/navbar-simple.html?raw';
import navbarCenteredHtml from './built-in/navbar-centered.html?raw';
import navbarDropdownHtml from './built-in/navbar-dropdown.html?raw';
import navbarSearchHtml from './built-in/navbar-search.html?raw';
import navbarMobileHtml from './built-in/navbar-mobile.html?raw';

import tableBasicHtml from './built-in/table-basic.html?raw';
import tableStripedHtml from './built-in/table-striped.html?raw';
import tableBorderedHtml from './built-in/table-bordered.html?raw';
import tableHoverHtml from './built-in/table-hover.html?raw';
import tablePricingHtml from './built-in/table-pricing.html?raw';

import formLoginHtml from './built-in/form-login.html?raw';
import formContactHtml from './built-in/form-contact.html?raw';
import formSearchHtml from './built-in/form-search.html?raw';
import formSurveyHtml from './built-in/form-survey.html?raw';
import formInlineHtml from './built-in/form-inline.html?raw';

/**
 * Built-in snippet definitions
 */
export const BUILT_IN_SNIPPETS: Snippet[] = [
  // Card snippets
  createSnippetFromHtml(
    'card-basic',
    'Basic Card',
    'cards',
    cardBasicHtml,
    {
      description: 'A simple card with title, text, and action button',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjEwIiB5PSIxMiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+0JDQodCiPC90ZXh0Pjwvc3ZnPg=='
    }
  ),
  createSnippetFromHtml(
    'card-image',
    'Image Card',
    'cards',
    cardImageHtml,
    {
      description: 'A card with an image header, title, description, and footer',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMjAiIHg9IjMiIHk9IjIiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSI2IiB4PSIzIiB5PSIyIiBmaWxsPSIjNjY2Ii8+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'card-profile',
    'Profile Card',
    'cards',
    cardProfileHtml,
    {
      description: 'A profile card with avatar, name, role, and social links',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIGZpbGw9IiM2NjZBQ0MiLz48dGV4dCB4PSIxMiIgeT0iMTUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUivjx0ZXh0IHg9IjEyIiB5PSIxOCIgZm9udC1zaXplPSI2IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIjvQodCh0J/QodC40JzQotCe0JHQoNCi0J/QkNCX0JzQqdCu0LnQtdCi0L3QtdCf0LfQtdCk0LfQtdCy0L7QvdCx0K/QvtCy0JXQsNC50LfQqdC70LjQs9Cw0IjQsNCJ0LzQvtCn0LfQmdCw0JbQtdCl0KfQsNC50LHQtNC90KzQqdC00J/QrtCT0LLQnNCm0LTQodCw0IPQp9C60KPQnNC40JzQpdC20LHQmtCk0J/QmdCo'
    }
  ),
  createSnippetFromHtml(
    'card-pricing',
    'Pricing Card',
    'cards',
    cardPricingHtml,
    {
      description: 'A pricing card with plan name, price, features, and CTA',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMjAiIHg9IjMiIHk9IjIiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiM2NjZBQ0MiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjEyIiB5PSIxMiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+JDk8L3RleHQ+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'card-testimonial',
    'Testimonial Card',
    'cards',
    cardTestimonialHtml,
    {
      description: 'A testimonial card with quote, author, and avatar',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMjAiIHg9IjMiIHk9IjIiIHJ4PSIyIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjEyIiB5PSIxMiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+0J7Qn9Ci0J/QmtCh0KbQntCm0J/QnNCX0JrQotCm0J/QoNCi0JzQn9Ca0KLQmdCf0JvQodC40JzQndCk0JzQndCj0KLQo9Ci'
    }
  ),

  // Button snippets
  createSnippetFromHtml(
    'button-primary',
    'Primary Button',
    'buttons',
    buttonPrimaryHtml,
    {
      description: 'A standard primary action button',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHg9IjQiIHk9IjciIHJ4PSIyIiBmaWxsPSIjNjY2Q0NDIi8+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'button-secondary',
    'Secondary Button',
    'buttons',
    buttonSecondaryHtml,
    {
      description: 'A secondary outline button',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHg9IjQiIHk9IjciIHJ4PSIyIiBmaWxsPSJ0cmFuc3BhcmVudCIgc3Ryb2tlPSIjNjY2Q0NDIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'button-gradient',
    'Gradient Button',
    'buttons',
    buttonGradientHtml,
    {
      description: 'A button with gradient background',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHg9IjQiIHk9IjciIHJ4PSIyIiBmaWxsPSJ1cmwoI2dyYWQpIi8+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCIgeTE9IjAiIHgyPSIxMDAiIHkyPSIxMDAiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzY2N0VBQyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzc2NEJBMiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg=='
    }
  ),
  createSnippetFromHtml(
    'button-icon',
    'Icon Button',
    'buttons',
    buttonIconHtml,
    {
      description: 'A button with an icon',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTAiIHg9IjMiIHk9IjciIHJ4PSIyIiBmaWxsPSIjRjVGNUY1IiBzdHJva2U9IiNEREQiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjEyIiB5PSIxMyIgZm9udC1zaXplPSI4IiBmaWxsPSIjMzMzIj7in5Q8L3RleHQ+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'button-group',
    'Button Group',
    'buttons',
    buttonGroupHtml,
    {
      description: 'A group of related buttons',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxMCIgeD0iNCIgeT0iNyIgZmlsbD0iIzY2NkNDQyIvPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEwIiB4PSI4IiB5PSI3IiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjREREIiBzdHJva2Utd2lkdGg9IjEiLz48cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxMCIgeD0iMTIiIHk9IjciIGZpbGw9IndoaXRlIiBzdHJva2U9IiNEREQiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg=='
    }
  ),

  // Navbar snippets
  createSnippetFromHtml(
    'navbar-simple',
    'Simple Navbar',
    'navbars',
    navbarSimpleHtml,
    {
      description: 'A simple horizontal navigation bar',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI2IiB5MT0iMTEiIHgyPSI2LjUiIHkyPSIxMiIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4='
    }
  ),
  createSnippetFromHtml(
    'navbar-centered',
    'Centered Navbar',
    'navbars',
    navbarCenteredHtml,
    {
      description: 'A navigation bar with centered links',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIGZpbGw9IiM2NjZBQ0MiLyTucKXQrdCu0LXQrtCt0K/QrdCt0K/QrdCt0K3QrdCt0K3Qr'
    }
  ),
  createSnippetFromHtml(
    'navbar-dropdown',
    'Navbar with Dropdown',
    'navbars',
    navbarDropdownHtml,
    {
      description: 'A navigation bar with dropdown menu',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMSIvPjxwIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiMzMzMiPvCf0K3QrdCt0K/QrdCt'
    }
  ),
  createSnippetFromHtml(
    'navbar-search',
    'Navbar with Search',
    'navbars',
    navbarSearchHtml,
    {
      description: 'A navigation bar with integrated search box',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMSIvPjxyZWN0IHdpZHRoPSIxMiIgaGVpZ2h0PSI0IiB4PSI2IiB5PSIxMSIgcng9IjIiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4='
    }
  ),
  createSnippetFromHtml(
    'navbar-mobile',
    'Mobile-friendly Navbar',
    'navbars',
    navbarMobileHtml,
    {
      description: 'A responsive navigation bar with hamburger menu',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjYiIHk9IjE0IiBmb250LXNpemU9IjgiIGZpbGw9IiMzMzMivvCj'
    }
  ),

  // Table snippets
  createSnippetFromHtml(
    'table-basic',
    'Basic Table',
    'tables',
    tableBasicHtml,
    {
      description: 'A simple data table with headers',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGFibGUgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2IiB4PSIzIiB5PSI0Ij48dGJvZHk+PHRyPjx0aCBwYWRkaW5nPSIxMCIgZmlsbD0iI0Y1RjVGNiI+0J/Ql9Cl0J/QmtCc'
    }
  ),
  createSnippetFromHtml(
    'table-striped',
    'Striped Table',
    'tables',
    tableStripedHtml,
    {
      description: 'A table with alternating row colors',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGFibGUgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2IiB4PSIzIiB5PSI0Ij48dGJvZHk+PHRyPj90aCBwYWRkaW5nPSIxMCIgZmlsbD0iIzY2NkNDQyIvPjx0ciBmaWxsPSIjRjlGOUY5Ij48dGQgcGFkZGluZz0iMTAiv'
    }
  ),
  createSnippetFromHtml(
    'table-bordered',
    'Bordered Table',
    'tables',
    tableBorderedHtml,
    {
      description: 'A table with borders around all cells',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGFibGUgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2IiB4PSIzIiB5PSI0IiBzdHJva2U9IiNEREQiPjx0Ym9keT48dHI+'
    }
  ),
  createSnippetFromHtml(
    'table-hover',
    'Hoverable Table',
    'tables',
    tableHoverHtml,
    {
      description: 'A table that highlights rows on hover',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGFibGUgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2IiB4PSIzIiB5PSI0Ij48dGJvZHk+PHRyPj90aCBwYWRkaW5nPSIxMCIgZmlsbD0iIzMzMyI+'
    }
  ),
  createSnippetFromHtml(
    'table-pricing',
    'Pricing Comparison Table',
    'tables',
    tablePricingHtml,
    {
      description: 'A pricing comparison table with feature checkmarks',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGFibGUgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2IiB4PSIzIiB5PSI0Ij48dGJvZHk+PHRyPj90aCBwYWRkaW5nPSIxMCIgZmlsbD0iI0Y4RjlGOCIvPjx0ciBmaWxsPSIjRjBGN0ZGIjv'
    }
  ),

  // Form snippets
  createSnippetFromHtml(
    'form-login',
    'Login Form',
    'forms',
    formLoginHtml,
    {
      description: 'A login form with email and password fields',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iNCIgeD0iNSIgeT0iNyIgcng9IjEiIGZpbGw9IiNGNUY1RjUiLz48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iNCIgeD0iNSIgeT0iMTIiIHJ4PSIxIiBmaWxsPSIjRjVGNUY1Ii8+'
    }
  ),
  createSnippetFromHtml(
    'form-contact',
    'Contact Form',
    'forms',
    formContactHtml,
    {
      description: 'A contact form with name, email, subject, and message',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMjAiIHg9IjMiIHk9IjIiIHJ4PSIyIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIzIiB4PSI1IiB5PSI2IiByeD0iMSIIGZpbGw9IiNGNUY1RjUiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIzIiB4PSIxMiIgeT0iNiIgcng9IjEiIGZpbGw9IiNGNUY1RjUiLz48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMyIgeD0iNSIgeT0iMTQiIHJ4PSIxIiBmaWxsPSIjRjVGNUY1Ii8+'
    }
  ),
  createSnippetFromHtml(
    'form-search',
    'Search Form',
    'forms',
    formSearchHtml,
    {
      description: 'A search input with submit button',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTQiIGhlaWdodD0iNCIgeD0iMiIgeT0iMTAiIHJ4PSIyMCIgZmlsbD0iI0Y1RjVGNSIvPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIHg9IjE2IiB5PSIxMCIgcng9IjIwIiBmaWxsPSIjNjY2Q0NDIi8+PC9zdmc+'
    }
  ),
  createSnippetFromHtml(
    'form-survey',
    'Survey Form',
    'forms',
    formSurveyHtml,
    {
      description: 'A survey form with various input types',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMjAiIHg9IjMiIHk9IjIiIHJ4PSIyIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNSIgeTE9IjYiIHgyPSIxMCIgeTI9IjYiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUggeDE9IjEwIiB5MT0iNiIgeDI9IjE1IiB5Mj0iNiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTUiIHkxPSI2IiB4Mj0iMjAiIHkyPSI2IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPg=='
    }
  ),
  createSnippetFromHtml(
    'form-inline',
    'Inline Form',
    'forms',
    formInlineHtml,
    {
      description: 'An inline form with fields and submit on the same line',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI0IiB4PSI0IiB5PSIxMCIgcng9IjEiIGZpbGw9IiNGNUY1RjUiLz48cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI0IiB4PSIxNCIgeT0iMTAiIHJ4PSIxIiBmaWxsPSIjMjhBNzQ1Ii8+PC9zdmc+'
    }
  )
];

/**
 * Get all built-in snippets
 */
export function getBuiltInSnippets(): Snippet[] {
  return BUILT_IN_SNIPPETS;
}

/**
 * Get a built-in snippet by ID
 */
export function getBuiltInSnippetById(id: string): Snippet | undefined {
  return BUILT_IN_SNIPPETS.find(s => s.id === id);
}

/**
 * Get snippets by category
 */
export function getSnippetsByCategory(category: SnippetCategory): Snippet[] {
  return BUILT_IN_SNIPPETS.filter(s => s.category === category);
}

/**
 * Get all snippet categories
 */
export function getSnippetCategories(): SnippetCategory[] {
  return ['cards', 'buttons', 'navbars', 'tables', 'forms'];
}

/**
 * Get snippet count
 */
export function getSnippetCount(): number {
  return BUILT_IN_SNIPPETS.length;
}

/**
 * Get snippet count by category
 */
export function getSnippetCountByCategory(): Record<SnippetCategory, number> {
  const categories = getSnippetCategories();
  const counts: Record<SnippetCategory, number> = {} as Record<SnippetCategory, number>;
  
  for (const category of categories) {
    counts[category] = getSnippetsByCategory(category).length;
  }
  
  return counts;
}
