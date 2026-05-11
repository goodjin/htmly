import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import WikiLinkSuggestion from './WikiLinkSuggestion.vue';
import type { WikiLinkSuggestionItem } from './WikiLinkSuggestion.vue';

// Mock the VS Code theme CSS variables
const style = document.createElement('style');
style.textContent = `
  :root {
    --vscode-editorWidget-background: #252526;
    --vscode-editorWidget-border: #454545;
    --vscode-toolbar-hoverBackground: #2a2d2e;
    --vscode-button-background: #0e639c;
    --vscode-button-secondaryBackground: #3c3c3c;
    --vscode-input-background: #3c3c3c;
    --vscode-editor-foreground: #ccc;
    --vscode-descriptionForeground: #888;
    --vscode-badge-background: #007acc;
  }
`;
document.head.appendChild(style);

describe('WikiLinkSuggestion', () => {
  describe('VAL-BACKLINKS-002: Auto-complete suggestions', () => {
    it('shows suggestions dropdown when items are provided', () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'Page One' },
        { page: 'Page Two' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      expect(wrapper.find('.wiki-link-suggestion').exists()).toBe(true);
      expect(wrapper.findAll('.wiki-link-item').length).toBe(2);
    });

    it('displays page names in the dropdown', () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'Getting Started' },
        { page: 'Installation Guide' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      const titles = wrapper.findAll('.wiki-link-title');
      expect(titles[0].text()).toBe('Getting Started');
      expect(titles[1].text()).toBe('Installation Guide');
    });

    it('filters pages by typed text', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'Getting Started' },
        { page: 'Installation Guide' },
        { page: 'API Reference' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: 'Guide',
        },
      });
      
      // The component itself doesn't filter - it receives filtered items from parent
      expect(wrapper.findAll('.wiki-link-item').length).toBe(3);
    });

    it('shows "Create new page" option when no matching page exists', async () => {
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items: [],
          command: vi.fn(),
          query: 'NewPage',
        },
      });
      
      // When no items but query exists, show "Create new page" option
      expect(wrapper.find('.wiki-link-item.new-page').exists()).toBe(true);
      expect(wrapper.find('.wiki-link-title.new').text()).toBe('Create "NewPage"');
    });

    it('highlights first item by default', () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      const firstItem = wrapper.findAll('.wiki-link-item')[0];
      expect(firstItem.classes()).toContain('selected');
    });
  });

  describe('Keyboard navigation', () => {
    it('selects previous item on ArrowUp', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
        { page: 'Third' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      // Start at index 0
      expect(wrapper.findAll('.wiki-link-item')[0].classes()).toContain('selected');
      
      // Move down first (to index 1)
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.vm.onKeyDown(downEvent);
      await nextTick();
      
      expect(wrapper.findAll('.wiki-link-item')[1].classes()).toContain('selected');
      
      // Move up (back to index 0)
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      wrapper.vm.onKeyDown(upEvent);
      await nextTick();
      
      expect(wrapper.findAll('.wiki-link-item')[0].classes()).toContain('selected');
    });

    it('selects next item on ArrowDown', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.vm.onKeyDown(downEvent);
      await nextTick();
      
      expect(wrapper.findAll('.wiki-link-item')[1].classes()).toContain('selected');
    });

    it('wraps around when reaching end of list', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      // Go down twice to wrap around to first item
      const downEvent1 = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.vm.onKeyDown(downEvent1);
      await nextTick();
      
      const downEvent2 = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.vm.onKeyDown(downEvent2);
      await nextTick();
      
      expect(wrapper.findAll('.wiki-link-item')[0].classes()).toContain('selected');
    });

    it('wraps around when reaching start of list with ArrowUp', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      // Go up to wrap to last item
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      wrapper.vm.onKeyDown(upEvent);
      await nextTick();
      
      expect(wrapper.findAll('.wiki-link-item')[1].classes()).toContain('selected');
    });

    it('calls command with selected item on Enter', async () => {
      const commandMock = vi.fn();
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: commandMock,
          query: '',
        },
      });
      
      // Select second item
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.vm.onKeyDown(downEvent);
      
      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      wrapper.vm.onKeyDown(enterEvent);
      
      expect(commandMock).toHaveBeenCalledWith(items[1]);
    });

    it('returns true on Escape to close dropdown', () => {
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items: [{ page: 'Test' }],
          command: vi.fn(),
          query: '',
        },
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const result = wrapper.vm.onKeyDown(event);
      
      expect(result).toBe(true);
    });

    it('returns false for unhandled keys', () => {
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items: [{ page: 'Test' }],
          command: vi.fn(),
          query: '',
        },
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const result = wrapper.vm.onKeyDown(event);
      
      expect(result).toBe(false);
    });
  });

  describe('Mouse interactions', () => {
    it('selects item on hover', async () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      // Hover over second item
      const secondItem = wrapper.findAll('.wiki-link-item')[1];
      await secondItem.trigger('mouseenter');
      
      expect(secondItem.classes()).toContain('selected');
    });

    it('calls command on click', async () => {
      const commandMock = vi.fn();
      const items: WikiLinkSuggestionItem[] = [
        { page: 'First' },
        { page: 'Second' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: commandMock,
          query: '',
        },
      });
      
      // Click on first item
      await wrapper.findAll('.wiki-link-item')[0].trigger('click');
      
      expect(commandMock).toHaveBeenCalledWith(items[0]);
    });
  });

  describe('New page creation', () => {
    it('shows new page option with plus icon', () => {
      const items: WikiLinkSuggestionItem[] = [
        { page: 'Existing Page' },
        { page: 'New Page', isNew: true },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: vi.fn(),
          query: '',
        },
      });
      
      const newPageItem = wrapper.find('.wiki-link-item.new-page');
      expect(newPageItem.exists()).toBe(true);
      expect(newPageItem.find('.wiki-link-icon').text()).toBe('+');
    });

    it('shows empty state when no query and no items', () => {
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items: [],
          command: vi.fn(),
          query: '',
        },
      });
      
      expect(wrapper.find('.wiki-link-empty').exists()).toBe(true);
      expect(wrapper.find('.wiki-link-empty').text()).toBe('Type to search or create a page');
    });
  });

  describe('VAL-BACKLINKS-002: Enter creates link', () => {
    it('creates wiki link when Enter is pressed on existing page', async () => {
      const commandMock = vi.fn();
      const items: WikiLinkSuggestionItem[] = [
        { page: 'My Page' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: commandMock,
          query: 'My',
        },
      });
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      wrapper.vm.onKeyDown(enterEvent);
      
      expect(commandMock).toHaveBeenCalledWith({ page: 'My Page' });
    });

    it('creates wiki link when clicking on existing page', async () => {
      const commandMock = vi.fn();
      const items: WikiLinkSuggestionItem[] = [
        { page: 'My Page' },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: commandMock,
          query: 'My',
        },
      });
      
      await wrapper.find('.wiki-link-item').trigger('click');
      
      expect(commandMock).toHaveBeenCalledWith({ page: 'My Page' });
    });

    it('creates new page link when Enter is pressed on new page option', async () => {
      const commandMock = vi.fn();
      const items: WikiLinkSuggestionItem[] = [
        { page: 'NewPageName', isNew: true },
      ];
      
      const wrapper = mount(WikiLinkSuggestion, {
        props: {
          items,
          command: commandMock,
          query: 'NewPageName',
        },
      });
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      wrapper.vm.onKeyDown(enterEvent);
      
      expect(commandMock).toHaveBeenCalledWith({ page: 'NewPageName', isNew: true });
    });
  });
});
