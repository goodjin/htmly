import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
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
});
