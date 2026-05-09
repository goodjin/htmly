import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SlashCommandMenu from './SlashCommandMenu.vue';
import type { SlashCommandItem } from '../extensions/slashCommands';

// Mock CSS modules
vi.mock('../extensions/slashCommands', () => ({
  slashCommandItems: [
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: 'H1',
      command: vi.fn(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H2',
      command: vi.fn(),
    },
    {
      title: 'Paragraph',
      description: 'Plain text paragraph',
      icon: '¶',
      command: vi.fn(),
    },
  ],
}));

describe('SlashCommandMenu.vue', () => {
  const mockItems: SlashCommandItem[] = [
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: 'H1',
      command: vi.fn(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H2',
      command: vi.fn(),
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: '•',
      command: vi.fn(),
    },
  ];

  describe('Rendering', () => {
    it('renders all items when provided', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      const items = wrapper.findAll('.slash-command-item');
      expect(items).toHaveLength(3);
    });

    it('renders item title and description', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: [mockItems[0]],
          command: vi.fn(),
        },
      });

      expect(wrapper.find('.slash-command-title').text()).toBe('Heading 1');
      expect(wrapper.find('.slash-command-description').text()).toBe('Large section heading');
    });

    it('renders item icon', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: [mockItems[0]],
          command: vi.fn(),
        },
      });

      expect(wrapper.find('.slash-command-icon').text()).toBe('H1');
    });

    it('shows empty state when no items match', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: [],
          command: vi.fn(),
        },
      });

      expect(wrapper.find('.slash-command-empty').exists()).toBe(true);
      expect(wrapper.find('.slash-command-empty').text()).toBe('No matching commands');
    });

    it('does not show empty state when items exist', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      expect(wrapper.find('.slash-command-empty').exists()).toBe(false);
    });
  });

  describe('Keyboard navigation', () => {
    it('exposes onKeyDown method', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      expect(typeof wrapper.vm.onKeyDown).toBe('function');
    });

    it('ArrowDown navigates to next item', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      wrapper.vm.onKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() } as any);

      await wrapper.vm.$nextTick();
      // Initially index 0 is selected, ArrowDown moves to index 1
      expect(wrapper.findAll('.slash-command-item')[1].classes()).toContain('selected');
    });

    it('ArrowUp navigates to previous item', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      // Start at index 1
      (wrapper.vm as any).selectedIndex = 1;
      await wrapper.vm.$nextTick();

      wrapper.vm.onKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() } as any);
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll('.slash-command-item')[0].classes()).toContain('selected');
    });

    it('ArrowDown wraps around to first item', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      // Start at last item
      (wrapper.vm as any).selectedIndex = mockItems.length - 1;
      await wrapper.vm.$nextTick();

      wrapper.vm.onKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() } as any);
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll('.slash-command-item')[0].classes()).toContain('selected');
    });

    it('ArrowUp wraps around to last item', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      wrapper.vm.onKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() } as any);
      await wrapper.vm.$nextTick();

      const lastIndex = mockItems.length - 1;
      expect(wrapper.findAll('.slash-command-item')[lastIndex].classes()).toContain('selected');
    });

    it('Enter selects current item and calls command', async () => {
      const mockCommand = vi.fn();
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: mockCommand,
        },
      });

      // Select second item
      (wrapper.vm as any).selectedIndex = 1;
      await wrapper.vm.$nextTick();

      wrapper.vm.onKeyDown({ key: 'Enter', preventDefault: vi.fn() } as any);

      expect(mockCommand).toHaveBeenCalledWith(mockItems[1]);
    });

    it('Escape returns true (handled externally)', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      const result = wrapper.vm.onKeyDown({ key: 'Escape' } as any);
      expect(result).toBe(true);
    });

    it('other keys return false', () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      const result = wrapper.vm.onKeyDown({ key: 'Tab' } as any);
      expect(result).toBe(false);
    });
  });

  describe('Mouse interaction', () => {
    it('clicking item calls command with that item', async () => {
      const mockCommand = vi.fn();
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: mockCommand,
        },
      });

      await wrapper.findAll('.slash-command-item')[1].trigger('click');

      expect(mockCommand).toHaveBeenCalledWith(mockItems[1]);
    });

    it('hovering item changes selected index', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      await wrapper.findAll('.slash-command-item')[2].trigger('mouseenter');

      expect((wrapper.vm as any).selectedIndex).toBe(2);
    });
  });

  describe('Filtering', () => {
    it('updates selectedIndex when items change', async () => {
      const wrapper = mount(SlashCommandMenu, {
        props: {
          items: mockItems,
          command: vi.fn(),
        },
      });

      (wrapper.vm as any).selectedIndex = 2;
      await wrapper.vm.$nextTick();

      // Change items array
      await wrapper.setProps({
        items: [mockItems[0]],
      });

      expect((wrapper.vm as any).selectedIndex).toBe(0);
    });
  });
});
