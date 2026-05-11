import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import SnippetSelector from './SnippetSelector.vue';
import type { Snippet, UserSnippetMetadata } from '../core/types';

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

// Sample user snippets for testing
const mockUserSnippets: UserSnippetMetadata[] = [
  {
    id: 'user-card-1',
    name: 'My Custom Card',
    category: 'cards',
    description: 'A custom card I created',
    preview: 'data:image/svg+xml;base64,custom',
    createdAt: 1234567895,
    modifiedAt: 1234567895
  },
  {
    id: 'user-button-1',
    name: 'My Custom Button',
    category: 'buttons',
    description: 'A custom button',
    preview: 'data:image/svg+xml;base64,custom2',
    createdAt: 1234567896,
    modifiedAt: 1234567896
  }
];

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

    it('should display tab bar with Built-in and My Snippets tabs', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.tab-bar').exists()).toBe(true);
      expect(wrapper.findAll('.tab-btn').length).toBe(2);
      expect(wrapper.find('.tab-btn:first-child').text()).toContain('Built-in');
      expect(wrapper.find('.tab-btn:nth-child(2)').text()).toContain('My Snippets');
    });

    it('should show Save Selection button when content is provided', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>'
        }
      });
      
      expect(wrapper.find('.save-as-btn').exists()).toBe(true);
      expect(wrapper.find('.save-as-btn').text()).toContain('Save Selection');
    });

    it('should not show Save Selection button when no content', () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: ''
        }
      });
      
      expect(wrapper.find('.save-as-btn').exists()).toBe(false);
    });
  });

  describe('User Snippets', () => {
    it('should display user snippets when switching to My Snippets tab', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Click on My Snippets tab
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      await mySnippetsTab?.trigger('click');
      
      await flushPromises();
      
      // Should now show user snippets
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(2);
    });

    it('should show "No custom snippets yet" when user snippets is empty', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>',
          userSnippets: []
        }
      });
      
      // Click on My Snippets tab
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      await mySnippetsTab?.trigger('click');
      
      await flushPromises();
      
      // Should show no custom snippets message
      expect(wrapper.find('.no-results').text()).toContain('No custom snippets yet');
    });

    it('should display user snippet count in badge', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Check My Snippets tab has badge with count
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      expect(mySnippetsTab?.find('.tab-badge').text()).toBe('2');
    });

    it('should switch back to Built-in tab', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Go to My Snippets
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      await mySnippetsTab?.trigger('click');
      await flushPromises();
      
      // Go back to Built-in
      const builtInTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('Built-in'));
      await builtInTab?.trigger('click');
      await flushPromises();
      
      // Should show built-in snippets again
      const snippetItems = wrapper.findAll('.snippet-item');
      expect(snippetItems.length).toBe(5);
    });
  });

  describe('Save as Snippet', () => {
    it('should emit saveAsSnippet event when Save Selection is clicked', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div>Selected content</div>'
        }
      });
      
      const saveBtn = wrapper.find('.save-as-btn');
      await saveBtn.trigger('click');
      
      await flushPromises();
      
      // Should show save dialog
      expect(wrapper.find('.save-dialog').exists()).toBe(true);
    });

    it('should show save dialog with name, category, and description fields', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div>Selected content</div>'
        }
      });
      
      await wrapper.find('.save-as-btn').trigger('click');
      await flushPromises();
      
      expect(wrapper.find('.dialog-title').text()).toBe('Save as Snippet');
      expect(wrapper.find('.form-input').exists()).toBe(true);
      expect(wrapper.find('.form-select').exists()).toBe(true);
    });

    it('should emit saveAsSnippet with correct payload on confirm', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div class="custom">My snippet content</div>'
        }
      });
      
      // Open save dialog
      await wrapper.find('.save-as-btn').trigger('click');
      await flushPromises();
      
      // Fill in the form
      const nameInput = wrapper.findAll('.form-input')[0];
      await nameInput.setValue('My Custom Snippet');
      
      const categorySelect = wrapper.find('.form-select');
      await categorySelect.setValue('buttons');
      
      const descInput = wrapper.findAll('.form-input')[1];
      await descInput.setValue('A test snippet');
      
      // Confirm
      await wrapper.find('.dialog-btn.save').trigger('click');
      
      await flushPromises();
      
      // Check emit
      const emitted = wrapper.emitted();
      expect(emitted.saveAsSnippet).toBeDefined();
      const saveEvent = emitted.saveAsSnippet[0] as [{ name: string; category: string; html: string; description: string }];
      expect(saveEvent[0].name).toBe('My Custom Snippet');
      expect(saveEvent[0].category).toBe('buttons');
      expect(saveEvent[0].html).toBe('<div class="custom">My snippet content</div>');
      expect(saveEvent[0].description).toBe('A test snippet');
    });

    it('should close dialog on cancel', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div>Content</div>'
        }
      });
      
      await wrapper.find('.save-as-btn').trigger('click');
      await flushPromises();
      
      expect(wrapper.find('.save-dialog').exists()).toBe(true);
      
      await wrapper.find('.dialog-btn.cancel').trigger('click');
      await flushPromises();
      
      expect(wrapper.find('.save-dialog').exists()).toBe(false);
    });
  });

  describe('Delete Snippet', () => {
    it('should show context menu on right-click in My Snippets tab', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Go to My Snippets
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      await mySnippetsTab?.trigger('click');
      await flushPromises();
      
      // Right-click on a snippet
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('contextmenu');
      
      await flushPromises();
      
      expect(wrapper.find('.context-menu').exists()).toBe(true);
      expect(wrapper.find('.context-menu-item.delete').text()).toContain('Delete Snippet');
    });

    it('should emit deleteSnippet event when delete is clicked', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Go to My Snippets
      const mySnippetsTab = wrapper.findAll('.tab-btn').find(tab => tab.text().includes('My Snippets'));
      await mySnippetsTab?.trigger('click');
      await flushPromises();
      
      // Right-click on first snippet
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('contextmenu');
      await flushPromises();
      
      // Click delete
      await wrapper.find('.context-menu-item.delete').trigger('click');
      
      await flushPromises();
      
      const emitted = wrapper.emitted();
      expect(emitted.deleteSnippet).toBeDefined();
      const deleteEvent = emitted.deleteSnippet[0] as [string];
      expect(deleteEvent[0]).toBe('user-card-1');
    });

    it('should not show context menu in Built-in tab', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Stay on Built-in tab (default)
      const firstSnippet = wrapper.find('.snippet-item');
      await firstSnippet.trigger('contextmenu');
      
      await flushPromises();
      
      expect(wrapper.find('.context-menu').exists()).toBe(false);
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

    it('should close save dialog on Escape', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div>Content</div>'
        }
      });
      
      await wrapper.find('.save-as-btn').trigger('click');
      await flushPromises();
      
      expect(wrapper.find('.save-dialog').exists()).toBe(true);
      
      const selector = wrapper.find('.snippet-selector');
      await selector.trigger('keydown', { key: 'Escape' });
      
      await flushPromises();
      
      expect(wrapper.find('.save-dialog').exists()).toBe(false);
    });

    it('should confirm save on Enter in save dialog', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<div>Content</div>'
        }
      });
      
      await wrapper.find('.save-as-btn').trigger('click');
      await flushPromises();
      
      const nameInput = wrapper.findAll('.form-input')[0];
      await nameInput.setValue('Test Snippet');
      
      const selector = wrapper.find('.snippet-selector');
      await selector.trigger('keydown', { key: 'Enter' });
      
      await flushPromises();
      
      const emitted = wrapper.emitted();
      expect(emitted.saveAsSnippet).toBeDefined();
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

    it('should reset to Built-in tab when dialog opens', async () => {
      const wrapper = mount(SnippetSelector, {
        props: {
          visible: true,
          currentContent: '<p>Test content</p>',
          userSnippets: mockUserSnippets
        }
      });
      
      // Switch to My Snippets
      const vm = wrapper.vm as any;
      vm.activeTab = 'custom';
      await wrapper.vm.$nextTick();
      
      // Close and reopen
      await wrapper.setProps({ visible: false });
      await wrapper.vm.$nextTick();
      
      await wrapper.setProps({ visible: true });
      await wrapper.vm.$nextTick();
      
      // Should be back to Built-in
      expect(vm.activeTab).toBe('built-in');
    });
  });
});
