import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ExportDialog from './ExportDialog.vue';

describe('ExportDialog.vue', () => {
  describe('Rendering', () => {
    it('does not render when visible is false', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: false },
      });
      expect(wrapper.find('.export-dialog-backdrop').exists()).toBe(false);
    });

    it('renders when visible is true', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      expect(wrapper.find('.export-dialog-backdrop').exists()).toBe(true);
      expect(wrapper.find('.export-dialog').exists()).toBe(true);
    });

    it('shows export header with title', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      expect(wrapper.find('.export-title').text()).toBe('Export Document');
    });

    it('renders all four export options', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const options = wrapper.findAll('.export-option');
      expect(options).toHaveLength(4);
    });
  });

  describe('Export Options', () => {
    it('shows PDF export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const pdfOption = wrapper.findAll('.export-option')[0];
      expect(pdfOption.find('.option-icon').text()).toBe('📄');
      expect(pdfOption.find('.option-label').text()).toBe('Export as PDF');
    });

    it('shows Markdown export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const mdOption = wrapper.findAll('.export-option')[1];
      expect(mdOption.find('.option-icon').text()).toBe('📝');
      expect(mdOption.find('.option-label').text()).toBe('Export as Markdown');
    });

    it('shows Plain Text export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const txtOption = wrapper.findAll('.export-option')[2];
      expect(txtOption.find('.option-icon').text()).toBe('📃');
      expect(txtOption.find('.option-label').text()).toBe('Export as Plain Text');
    });

    it('shows Embedded HTML export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const htmlOption = wrapper.findAll('.export-option')[3];
      expect(htmlOption.find('.option-icon').text()).toBe('🔗');
      expect(htmlOption.find('.option-label').text()).toBe('Export as Embedded HTML');
    });
  });

  describe('PDF Options Section', () => {
    it('shows PDF options toggle button', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      expect(wrapper.find('.pdf-options-toggle').exists()).toBe(true);
    });

    it('expands PDF options when toggle is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('.pdf-options-content').exists()).toBe(true);
    });

    it('shows preset selector dropdown', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('#preset-select').exists()).toBe(true);
    });

    it('shows page numbers checkbox', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
      expect(wrapper.find('.checkbox-label span').text()).toBe('Include page numbers');
    });

    it('shows header text input', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('#header-text').exists()).toBe(true);
    });

    it('shows footer text input', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('#footer-text').exists()).toBe(true);
    });

    it('shows save as preset button', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('.save-preset-btn').exists()).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('emits export with "pdf" format and options when PDF option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const pdfOption = wrapper.findAll('.export-option')[0];
      await pdfOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[0]).toBe('pdf');
      // Options should be included
      expect(emitted[1]).toBeDefined();
      expect(emitted[1]).toHaveProperty('includePageNumbers');
      expect(emitted[1]).toHaveProperty('headerText');
      expect(emitted[1]).toHaveProperty('footerText');
    });

    it('emits export with "markdown" format when Markdown option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const mdOption = wrapper.findAll('.export-option')[1];
      await mdOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['markdown']);
    });

    it('emits export with "plaintext" format when Plain Text option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const txtOption = wrapper.findAll('.export-option')[2];
      await txtOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['plaintext']);
    });

    it('emits export with "embedded" format when Embedded HTML option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const htmlOption = wrapper.findAll('.export-option')[3];
      await htmlOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['embedded']);
    });

    it('emits cancel when backdrop is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.export-dialog-backdrop').trigger('mousedown');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('emits cancel on Escape key', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.export-dialog').trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('highlights next option on ArrowDown key', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const dialog = wrapper.find('.export-dialog');
      await dialog.trigger('keydown', { key: 'ArrowDown' });
      // First option should be highlighted (index 0)
      const options = wrapper.findAll('.export-option');
      expect(options[0].classes()).toContain('hovered');
    });

    it('highlights previous option on ArrowUp key', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const dialog = wrapper.find('.export-dialog');
      // First press to go down to index 0
      await dialog.trigger('keydown', { key: 'ArrowDown' });
      // Then press up (should stay at 0 since it's the first)
      await dialog.trigger('keydown', { key: 'ArrowUp' });
      // First option stays highlighted (ArrowUp from 0 doesn't change)
      const options = wrapper.findAll('.export-option');
      expect(options[0].classes()).toContain('hovered');
    });

    it('emits export on Enter when option is highlighted', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const dialog = wrapper.find('.export-dialog');
      // Navigate to second option (index 1)
      await dialog.trigger('keydown', { key: 'ArrowDown' });
      await dialog.trigger('keydown', { key: 'ArrowDown' });
      await dialog.trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['markdown']);
    });
  });

  describe('Hover State', () => {
    it('applies hovered class on mouseenter', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const firstOption = wrapper.findAll('.export-option')[0];
      await firstOption.trigger('mouseenter');
      expect(firstOption.classes()).toContain('hovered');
    });

    it('removes hovered class on mouseleave', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const firstOption = wrapper.findAll('.export-option')[0];
      await firstOption.trigger('mouseenter');
      expect(firstOption.classes()).toContain('hovered');
      await firstOption.trigger('mouseleave');
      expect(firstOption.classes()).not.toContain('hovered');
    });
  });
});
