import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import Toolbar from './Toolbar.vue';

// Mock child components
vi.mock('./LinkDialog.vue', () => ({ default: { name: 'LinkDialog', template: '<div />' } }));
vi.mock('./ImageDialog.vue', () => ({ default: { name: 'ImageDialog', template: '<div />' } }));

const defaultProps = {
  editor: undefined,
  mode: 'wysiwyg' as const,
  dirty: false,
  readOnly: false,
  showButtonLabels: true,
  autoHideToolbarInPreview: true,
};

describe('Toolbar.vue', () => {
  describe('autoHideToolbarInPreview setting', () => {
    it('hides toolbar when autoHideToolbarInPreview is true and mode is preview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(false);
    });

    it('shows toolbar when autoHideToolbarInPreview is false and mode is preview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: false },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });

    it('shows toolbar in wysiwyg mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });

    it('shows toolbar in source mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'source', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });

    it('shows toolbar in split mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'split', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });
  });

  describe('showButtonLabels setting', () => {
    it('applies hide-labels class when showButtonLabels is false', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', showButtonLabels: false },
      });
      expect(wrapper.find('.toolbar.hide-labels').exists()).toBe(true);
    });

    it('does not apply hide-labels class when showButtonLabels is true', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', showButtonLabels: true },
      });
      expect(wrapper.find('.toolbar.hide-labels').exists()).toBe(false);
    });
  });
});
