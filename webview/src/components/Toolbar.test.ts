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
  describe('Format Painter', () => {
    it('renders format painter button in wysiwyg mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const paintBtn = wrapper.findAll('button').find(b => b.text().includes('Paint'));
      expect(paintBtn).toBeDefined();
    });

    it('emits activateFormatPainter with false on single click', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const paintBtn = wrapper.findAll('button').find(b => b.text().includes('Paint'));
      await paintBtn!.trigger('click');
      // Single click waits 200ms to distinguish from double-click
      await new Promise(r => setTimeout(r, 250));
      expect(wrapper.emitted('activateFormatPainter')).toBeTruthy();
      const emitted = wrapper.emitted('activateFormatPainter') as any[];
      expect(emitted[emitted.length - 1][0]).toBe(false);
    });

    it('emits activateFormatPainter with true on double-click', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const paintBtn = wrapper.findAll('button').find(b => b.text().includes('Paint'));
      await paintBtn!.trigger('click');
      await paintBtn!.trigger('click');
      await new Promise(r => setTimeout(r, 10));
      expect(wrapper.emitted('activateFormatPainter')).toBeTruthy();
      const emitted = wrapper.emitted('activateFormatPainter') as any[];
      expect(emitted[emitted.length - 1][0]).toBe(true);
    });

    it('format painter button has active class when formatPainterActive is true', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', formatPainterActive: true },
      });
      const paintBtn = wrapper.findAll('button').find(b => b.text().includes('Paint'));
      expect(paintBtn!.classes()).toContain('active');
    });
  });

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
