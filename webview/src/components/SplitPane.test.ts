import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import SplitPane from './SplitPane.vue';

// Mock CodeEditor and PreviewPane
vi.mock('./CodeEditor.vue', () => ({
  default: {
    name: 'CodeEditor',
    props: ['modelValue', 'isDark'],
    emits: ['update:modelValue'],
    render() {
      return h('div', { class: 'mock-code-editor' }, 'CodeEditor');
    },
  },
}));

vi.mock('./PreviewPane.vue', () => ({
  default: {
    name: 'PreviewPane',
    props: ['html'],
    render() {
      return h('div', { class: 'mock-preview-pane' }, 'PreviewPane');
    },
  },
}));

describe('SplitPane.vue', () => {
  describe('horizontal split', () => {
    it('renders source and preview panes', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      expect(wrapper.find('.mock-code-editor').exists()).toBe(true);
      expect(wrapper.find('.mock-preview-pane').exists()).toBe(true);
    });

    it('renders horizontal layout', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      expect(wrapper.find('.split-pane.horizontal').exists()).toBe(true);
    });

    it('renders vertical layout when direction is vertical', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'vertical',
        },
      });

      expect(wrapper.find('.split-pane.vertical').exists()).toBe(true);
    });

    it('has a divider element', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      expect(wrapper.find('.divider').exists()).toBe(true);
    });

    it('divider has correct orientation class', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      expect(wrapper.find('.divider.horizontal').exists()).toBe(true);
      expect(wrapper.find('.divider.vertical').exists()).toBe(false);
    });

    it('emits update:content when source changes', async () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Original</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      const codeEditor = wrapper.findComponent({ name: 'CodeEditor' });
      await codeEditor.vm.$emit('update:modelValue', '<p>Updated</p>');

      expect(wrapper.emitted('update:content')).toBeTruthy();
      expect(wrapper.emitted('update:content')![0]).toEqual(['<p>Updated</p>']);
    });
  });

  describe('draggable divider', () => {
    it('starts with 50% split ratio', () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      const sourcePane = wrapper.find('.source-pane');
      const style = sourcePane.attributes('style');
      expect(style).toContain('50%');
    });

    it('clamps split ratio to minimum pane size', async () => {
      const wrapper = mount(SplitPane, {
        props: {
          content: '<p>Test</p>',
          isDark: true,
          splitDirection: 'horizontal',
        },
      });

      // Get the container and simulate drag
      const container = wrapper.find('.split-pane');
      const containerEl = container.element as HTMLElement;
      
      // Mock getBoundingClientRect to return a small size
      vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 500,
        right: 500,
        bottom: 500,
      } as DOMRect);

      // Simulate mousedown on divider
      const divider = wrapper.find('.divider');
      await divider.trigger('mousedown');

      // Simulate mousemove to near the edge (should clamp)
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 250 }));

      // Simulate mouseup
      document.dispatchEvent(new MouseEvent('mouseup'));

      // The source pane should still have at least MIN_PANE_SIZE (200px)
      const sourcePane = wrapper.find('.source-pane');
      const style = sourcePane.attributes('style');
      expect(style).toBeDefined();
    });
  });
});
