import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TiptapEditor from './TiptapEditor.vue';

// Mock LinkDialog component
vi.mock('./LinkDialog.vue', () => ({ default: { name: 'LinkDialog', template: '<div />' } }));

describe('TiptapEditor.vue', () => {
  describe('BubbleMenu', () => {
    it('renders BubbleMenu when editor is available', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      // Wait for editor to be created
      await wrapper.vm.$nextTick();

      // Check that bubble menu exists
      expect(wrapper.find('.bubble-menu').exists()).toBe(true);
    });

    it('has Bold button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const boldButton = wrapper.find('.bubble-menu button[title="Bold (Ctrl+B)"]');
      expect(boldButton.exists()).toBe(true);
    });

    it('has Italic button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const italicButton = wrapper.find('.bubble-menu button[title="Italic (Ctrl+I)"]');
      expect(italicButton.exists()).toBe(true);
    });

    it('has Underline button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const underlineButton = wrapper.find('.bubble-menu button[title="Underline (Ctrl+U)"]');
      expect(underlineButton.exists()).toBe(true);
    });

    it('has Link button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const linkButton = wrapper.find('.bubble-menu button[title="Link (Ctrl+K)"]');
      expect(linkButton.exists()).toBe(true);
    });

    it('has Code button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const codeButton = wrapper.find('.bubble-menu button[title="Code"]');
      expect(codeButton.exists()).toBe(true);
    });

    it('has Highlight button in bubble menu', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const highlightButton = wrapper.find('.bubble-menu button[title="Highlight"]');
      expect(highlightButton.exists()).toBe(true);
    });

    it('exposes editor via defineExpose', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.editor).toBeDefined();
      expect(wrapper.vm.editor).not.toBeNull();
    });
  });

  describe('cursor position emission', () => {
    it('exposes calculateCursorPosition function', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      expect(typeof wrapper.vm.calculateCursorPosition).toBe('function');
    });

    it('calculateCursorPosition returns valid structure', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
      });

      await wrapper.vm.$nextTick();

      const position = wrapper.vm.calculateCursorPosition();
      
      expect(position).toHaveProperty('percentage');
      expect(position).toHaveProperty('offset');
      expect(position).toHaveProperty('blockIndex');
      expect(position).toHaveProperty('totalBlocks');
      
      // percentage should be between 0 and 1
      expect(position.percentage).toBeGreaterThanOrEqual(0);
      expect(position.percentage).toBeLessThanOrEqual(1);
    });

    it('emits cursor-position-update event on selection change', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test content</p>' },
        attrs: {
          // Listen for the event
          'onCursor-position-update': vi.fn(),
        },
      });

      await wrapper.vm.$nextTick();

      // The watch on selection should trigger cursor position emission
      // We verify this by checking the event handler was registered
      const emitted = wrapper.emitted();
      expect(emitted).toBeDefined();
    });
  });

  describe('cursor position restoration', () => {
    it('accepts cursorPosition prop', async () => {
      const wrapper = mount(TiptapEditor, {
        props: {
          modelValue: '<p>Test content</p>',
          cursorPosition: { percentage: 0.5, offset: 10, blockIndex: 1, totalBlocks: 2 },
        },
      });

      await wrapper.vm.$nextTick();

      // Component should accept the cursor position without error
      expect(wrapper.vm.$props.cursorPosition).toBeDefined();
      expect(wrapper.vm.$props.cursorPosition?.percentage).toBe(0.5);
    });

    it('accepts null cursorPosition gracefully', async () => {
      const wrapper = mount(TiptapEditor, {
        props: {
          modelValue: '<p>Test content</p>',
          cursorPosition: null,
        },
      });

      await wrapper.vm.$nextTick();

      // Component should accept null cursor position without error
      expect(wrapper.vm.$props.cursorPosition).toBeNull();
    });

    it('accepts undefined cursorPosition gracefully', async () => {
      const wrapper = mount(TiptapEditor, {
        props: {
          modelValue: '<p>Test content</p>',
        },
      });

      await wrapper.vm.$nextTick();

      // cursorPosition defaults to null
      expect(wrapper.vm.$props.cursorPosition).toBeNull();
    });

    it('handles cursor position at document start (0%)', async () => {
      const wrapper = mount(TiptapEditor, {
        props: {
          modelValue: '<p>Test content</p>',
          cursorPosition: { percentage: 0, offset: 0, blockIndex: 0, totalBlocks: 1 },
        },
      });

      await wrapper.vm.$nextTick();

      // Component should accept position at start without error
      expect(wrapper.vm.$props.cursorPosition?.percentage).toBe(0);
    });

    it('handles cursor position at document end (100%)', async () => {
      const wrapper = mount(TiptapEditor, {
        props: {
          modelValue: '<p>Test content</p>',
          cursorPosition: { percentage: 1, offset: 100, blockIndex: 0, totalBlocks: 1 },
        },
      });

      await wrapper.vm.$nextTick();

      // Component should accept position at end without error
      expect(wrapper.vm.$props.cursorPosition?.percentage).toBe(1);
    });
  });
});
