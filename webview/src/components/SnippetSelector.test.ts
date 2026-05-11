import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import SnippetSelector from './SnippetSelector.vue';
import type { Snippet } from '../core/types';

// Mock the snippet registry
vi.mock('../core/snippets/registry', () => ({
  getBuiltInSnippets: () => [
    {
      id: 'card-basic',
      name: 'Basic Card',
      category: 'cards',
      html: '<div class="card"><h3>Card Title</h3><p>Card content</p></div>',
      description: 'A simple card component',
      preview: 'data:image/svg+xml;base64,test',
      createdAt: 1234567890
    },
    {
      id: 'button-primary',
      name: 'Primary Button',
      category: 'buttons',
      html: '<button class="btn btn-primary">Click Me</button>',
      description: 'A primary action button',
      preview: 'data:image/svg+xml;base64,test2',
      createdAt: 1234567891
    },
    {
      id: 'navbar-simple',
      name: 'Simple Navbar',
      category: 'navbars',
      html: '<nav class="navbar"><a href="#">Home</a></nav>',
      description: 'A simple navigation bar',
      preview: 'data:image/svg+xml;base64,test3',
      createdAt: 1234567892
    },
    {
      id: 'table-basic',
      name: 'Basic Table',
      category: 'tables',
      html: '<table><tr><th>Header</th></tr></table>',
      description: 'A simple table',
      preview: 'data:image/svg+xml;base64,test4',
      createdAt: 1234567893
    },
    {
      id: 'form-login',
      name: 'Login Form',
      category: 'forms',
      html: '<form><input type="text" /><input type="password" /></form>',
      description: 'A login form',
      preview: 'data:image/svg+xml;base64,test5',
      createdAt: 1234567894
    }
  ]
}));

describe('SnippetSelector.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: false,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.snippet-selector-backdrop').exists()).toBe(false);
    });

    it('should render when visible is true', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.snippet-selector-backdrop').exists()).toBe(true);
      expect(wrapper.find('.snippet-selector').exists()).toBe(true);
    });

    it('should display snippet title', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.selector-title').text()).toBe('Snippets');
    });

    it('should display search input', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.search-input').exists()).toBe(true);
    });

    it('should display category tabs', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const categoryTabs = wrapper.findAll('.category-tab');
      expect(categoryTabs.length).toBe(6); // All + 5 categories
    });

    it('should display snippet grid with all snippets', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(5);
    });

    it('should display preview panel', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.preview-panel').exists()).toBe(true);
    });

    it('should display footer with keyboard hints', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.selector-footer').exists()).toBe(true);
      expect(wrapper.find('.hint').text()).toContain('Navigate');
    });
  });

  describe('Search/Filter', () => {
    it('should filter snippets by search query', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('card');
      
      await flushPromises();
      
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(1);
      expect(snippetItems[0].find('.snippet-name').text()).toBe('Basic Card');
    });

    it('should be case insensitive', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('BUTTON');
      
      await flushPromises();
      
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(1);
      expect(snippetItems[0].find('.snippet-name').text()).toBe('Primary Button');
    });

    it('should filter snippets by category', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      // Click on the Buttons category tab
      const categoryTabs = wrapper.findAll('.category-tab');
      const buttonsTab = categoryTabs.find(tab => tab.text() === 'Buttons');
      await buttonsTab?.trigger('click');
      
      await flushPromises();
      
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(1);
      expect(snippetItems[0].find('.snippet-name').text()).toBe('Primary Button');
    });

    it('should show all snippets when category is cleared', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      // First select a category
      const categoryTabs = wrapper.findAll('.category-tab');
      const buttonsTab = categoryTabs.find(tab => tab.text() === 'Buttons');
      await buttonsTab?.trigger('click');
      
      await flushPromises();
      
      // Then clear it by clicking All
      const allTab = categoryTabs.find(tab => tab.text() === 'All');
      await allTab?.trigger('click');
      
      await flushPromises();
      
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(5);
    });
  });

  describe('Snippet Selection', () => {
    it('should emit select event when snippet is clicked', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('click');
      
      const emitted = wrapper.emitted();
      expect(emitted.select).toBeDefined();
      const selectEvent = emitted.select[0] as [Snippet];
      expect(selectEvent[0].id).toBe('card-basic');
    });

    it('should show snippet preview on hover', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('mouseenter');
      
      await flushPromises();
      
      // Check preview panel shows the hovered snippet
      const previewTitle = wrapper.find('.preview-title');
      expect(previewTitle.text()).toBe('Basic Card');
    });

    it('should clear preview when mouse leaves', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('mouseenter');
      await flushPromises();
      
      await firstSnippet.trigger('mouseleave');
      await flushPromises();
      
      // The empty preview panel should be shown
      expect(wrapper.find('.preview-panel.empty').exists()).toBe(true);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      const selector = wrapper.find('.snippet-selector');
      await selector.trigger('keydown', { key: 'Escape' });
      
      const emitted = wrapper.emitted();
      expect(emitted.cancel).toBeDefined();
    });

    it('should emit select event when Enter is pressed with hovered index', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      // Set hovered index via the component's internal method
      const vm = wrapper.vm as any;
      vm.hoveredIndex = 0;
      await wrapper.vm.$nextTick();
      
      const selector = wrapper.find('.snippet-selector');
      await selector.trigger('keydown', { key: 'Enter' });
      
      const emitted = wrapper.emitted();
      expect(emitted.select).toBeDefined();
      const selectEvent = emitted.select[0] as [Snippet];
      expect(selectEvent[0].id).toBe('card-basic');
    });
  });

  describe('State Reset', () => {
    it('should reset search query when dialog opens', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      // Set search query directly
      const vm = wrapper.vm as any;
      vm.searchQuery = 'something';
      await wrapper.vm.$nextTick();
      
      // Close and reopen by toggling visible prop
      await wrapper.setProps({ visible: false });
      await wrapper.vm.$nextTick();
      
      await wrapper.setProps({ visible: true });
      await wrapper.vm.$nextTick();
      
      // Search should be cleared
      expect(vm.searchQuery).toBe('');
    });
  });
});
