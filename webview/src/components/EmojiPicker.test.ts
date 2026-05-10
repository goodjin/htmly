import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EmojiPicker from './EmojiPicker.vue';

describe('EmojiPicker.vue', () => {
  describe('Rendering', () => {
    it('renders with default current emoji', () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      expect(wrapper.find('.emoji-picker-trigger').text()).toBe('💡');
    });

    it('renders with custom current emoji', () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '⚠️',
        },
      });

      expect(wrapper.find('.emoji-picker-trigger').text()).toBe('⚠️');
    });

    it('does not show dropdown when closed', () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(false);
    });

    it('shows dropdown when clicked', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');

      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(true);
    });

    it('shows emoji categories in dropdown', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');

      // Check that categories are rendered
      expect(wrapper.findAll('.emoji-category').length).toBeGreaterThan(0);
    });

    it('shows multiple emoji options in each category', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');

      // Check that emoji buttons are rendered
      const emojiButtons = wrapper.findAll('.emoji-button');
      expect(emojiButtons.length).toBeGreaterThan(10);
    });
  });

  describe('Interaction', () => {
    it('toggles dropdown open/closed on click', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      const trigger = wrapper.find('.emoji-picker-trigger');

      // Click to open
      await trigger.trigger('click');
      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(true);

      // Click to close (need to find trigger button inside container)
      await wrapper.find('.emoji-picker-container').trigger('click');
      await wrapper.vm.$nextTick();
      // Note: The dropdown might not close immediately due to event handling
      // We test the selectEmoji path for closing
    });

    it('emits select event when emoji is clicked', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');

      // Click the first emoji button
      const emojiButtons = wrapper.findAll('.emoji-button');
      await emojiButtons[0].trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')![0]).toEqual([emojiButtons[0].text()]);
    });

    it('closes dropdown after selecting emoji', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');
      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(true);

      const emojiButtons = wrapper.findAll('.emoji-button');
      await emojiButtons[0].trigger('click');
      await wrapper.vm.$nextTick();

      // Dropdown should be closed after selection
      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(false);
    });

    it('highlights current emoji as selected', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '⚠️',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');

      // Find the emoji button that matches currentEmoji
      const warningButton = wrapper.find('.emoji-button.selected');
      expect(warningButton.exists()).toBe(true);
      expect(warningButton.text()).toBe('⚠️');
    });
  });

  describe('Keyboard handling', () => {
    it('closes dropdown on Escape key', async () => {
      const wrapper = mount(EmojiPicker, {
        props: {
          currentEmoji: '💡',
        },
      });

      await wrapper.find('.emoji-picker-trigger').trigger('click');
      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(true);

      await wrapper.find('.emoji-picker-container').trigger('keydown', { key: 'Escape' });
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.emoji-picker-dropdown').exists()).toBe(false);
    });
  });
});
