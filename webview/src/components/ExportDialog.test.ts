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

    it('renders all six export options', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const options = wrapper.findAll('.export-option');
      expect(options).toHaveLength(6);
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

    it('shows DOCX export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const docxOption = wrapper.findAll('.export-option')[1];
      expect(docxOption.find('.option-icon').text()).toBe('📘');
      expect(docxOption.find('.option-label').text()).toBe('Export as Word Document');
    });

    it('shows Markdown export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const mdOption = wrapper.findAll('.export-option')[2];
      expect(mdOption.find('.option-icon').text()).toBe('📝');
      expect(mdOption.find('.option-label').text()).toBe('Export as Markdown');
    });

    it('shows Plain Text export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const txtOption = wrapper.findAll('.export-option')[3];
      expect(txtOption.find('.option-icon').text()).toBe('📃');
      expect(txtOption.find('.option-label').text()).toBe('Export as Plain Text');
    });

    it('shows Embedded HTML export option with correct icon and label', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const htmlOption = wrapper.findAll('.export-option')[4];
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

    it('shows page size dropdown with A4 and Letter options', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      const pageSizeSelect = wrapper.find('#page-size');
      expect(pageSizeSelect.exists()).toBe(true);
      const options = pageSizeSelect.findAll('option');
      expect(options).toHaveLength(2);
      expect(options[0].text()).toBe('A4');
      expect(options[1].text()).toBe('Letter');
    });

    it('shows orientation toggle with portrait and landscape buttons', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      const orientationButtons = wrapper.findAll('.orientation-btn');
      expect(orientationButtons).toHaveLength(2);
      expect(orientationButtons[0].exists()).toBe(true);
      expect(orientationButtons[1].exists()).toBe(true);
    });

    it('shows all margin inputs', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      expect(wrapper.find('#margin-top').exists()).toBe(true);
      expect(wrapper.find('#margin-right').exists()).toBe(true);
      expect(wrapper.find('#margin-bottom').exists()).toBe(true);
      expect(wrapper.find('#margin-left').exists()).toBe(true);
    });

    it('emits export with page size, orientation, and margins in options', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const pdfOption = wrapper.findAll('.export-option')[0];
      await pdfOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1]).toBeDefined();
      expect(emitted[1]).toHaveProperty('pageSize', 'A4');
      expect(emitted[1]).toHaveProperty('orientation', 'portrait');
      expect(emitted[1]).toHaveProperty('margins');
      expect(emitted[1].margins).toHaveProperty('top', 70);
      expect(emitted[1].margins).toHaveProperty('right', 70);
      expect(emitted[1].margins).toHaveProperty('bottom', 70);
      expect(emitted[1].margins).toHaveProperty('left', 70);
    });

    it('can change page size to Letter', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      await wrapper.find('#page-size').setValue('LETTER');
      const pdfOption = wrapper.findAll('.export-option')[0];
      await pdfOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1]).toHaveProperty('pageSize', 'LETTER');
    });

    it('can change orientation to landscape', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      // Click the landscape button (second orientation button)
      const orientationButtons = wrapper.findAll('.orientation-btn');
      await orientationButtons[1].trigger('click');
      const pdfOption = wrapper.findAll('.export-option')[0];
      await pdfOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1]).toHaveProperty('orientation', 'landscape');
    });

    it('can change margin values', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.pdf-options-toggle').trigger('click');
      await wrapper.find('#margin-top').setValue(100);
      await wrapper.find('#margin-right').setValue(50);
      await wrapper.find('#margin-bottom').setValue(100);
      await wrapper.find('#margin-left').setValue(50);
      const pdfOption = wrapper.findAll('.export-option')[0];
      await pdfOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1].margins).toHaveProperty('top', 100);
      expect(emitted[1].margins).toHaveProperty('right', 50);
      expect(emitted[1].margins).toHaveProperty('bottom', 100);
      expect(emitted[1].margins).toHaveProperty('left', 50);
    });
  });

  describe('DOCX Options Section', () => {
    it('shows DOCX options toggle button', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      expect(wrapper.find('.docx-options-toggle').exists()).toBe(true);
    });

    it('expands DOCX options when toggle is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      expect(wrapper.find('.docx-options-content').exists()).toBe(true);
    });

    it('shows page size dropdown with A4 and Letter options', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      const pageSizeSelect = wrapper.find('#docx-page-size');
      expect(pageSizeSelect.exists()).toBe(true);
      const options = pageSizeSelect.findAll('option');
      expect(options).toHaveLength(2);
      expect(options[0].text()).toBe('A4');
      expect(options[1].text()).toBe('Letter');
    });

    it('shows orientation toggle with portrait and landscape buttons', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      const orientationButtons = wrapper.findAll('.orientation-btn');
      expect(orientationButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows all margin inputs', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      expect(wrapper.find('#docx-margin-top').exists()).toBe(true);
      expect(wrapper.find('#docx-margin-right').exists()).toBe(true);
      expect(wrapper.find('#docx-margin-bottom').exists()).toBe(true);
      expect(wrapper.find('#docx-margin-left').exists()).toBe(true);
    });

    it('emits export with docx format and options when DOCX option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const docxOption = wrapper.findAll('.export-option')[1];
      await docxOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[0]).toBe('docx');
      expect(emitted[1]).toBeDefined();
      expect(emitted[1]).toHaveProperty('pageSize', 'LETTER');
      expect(emitted[1]).toHaveProperty('orientation', 'portrait');
      expect(emitted[1]).toHaveProperty('margins');
      expect(emitted[1].margins).toHaveProperty('top', 72);
      expect(emitted[1].margins).toHaveProperty('right', 72);
      expect(emitted[1].margins).toHaveProperty('bottom', 72);
      expect(emitted[1].margins).toHaveProperty('left', 72);
    });

    it('can change DOCX page size to A4', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      await wrapper.find('#docx-page-size').setValue('A4');
      const docxOption = wrapper.findAll('.export-option')[1];
      await docxOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1]).toHaveProperty('pageSize', 'A4');
    });

    it('can change DOCX orientation to landscape', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      // Find orientation buttons within DOCX section specifically
      const docxSection = wrapper.find('.docx-options-content');
      const orientationButtons = docxSection.findAll('.orientation-btn');
      await orientationButtons[1].trigger('click');
      const docxOption = wrapper.findAll('.export-option')[1];
      await docxOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1]).toHaveProperty('orientation', 'landscape');
    });

    it('can change DOCX margin values', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.docx-options-toggle').trigger('click');
      await wrapper.find('#docx-margin-top').setValue(100);
      await wrapper.find('#docx-margin-right').setValue(50);
      await wrapper.find('#docx-margin-bottom').setValue(100);
      await wrapper.find('#docx-margin-left').setValue(50);
      const docxOption = wrapper.findAll('.export-option')[1];
      await docxOption.trigger('click');
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[1].margins).toHaveProperty('top', 100);
      expect(emitted[1].margins).toHaveProperty('right', 50);
      expect(emitted[1].margins).toHaveProperty('bottom', 100);
      expect(emitted[1].margins).toHaveProperty('left', 50);
    });
  });

  describe('SEO Settings Section', () => {
    it('shows SEO settings toggle button', () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      expect(wrapper.find('.seo-options-toggle').exists()).toBe(true);
    });

    it('expands SEO options when toggle is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.seo-options-toggle').trigger('click');
      expect(wrapper.find('.seo-options-content').exists()).toBe(true);
    });

    it('shows SEO title input', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.seo-options-toggle').trigger('click');
      expect(wrapper.find('#seo-title').exists()).toBe(true);
    });

    it('shows SEO description textarea', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.seo-options-toggle').trigger('click');
      expect(wrapper.find('#seo-description').exists()).toBe(true);
    });

    it('shows OG image URL input', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.seo-options-toggle').trigger('click');
      expect(wrapper.find('#og-image').exists()).toBe(true);
    });

    it('shows help text about OG image', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      await wrapper.find('.seo-options-toggle').trigger('click');
      expect(wrapper.find('.seo-help-hint').text()).toContain('social media');
    });

    it('emits export with seo settings when site export is selected', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      
      // Expand SEO options and fill in values
      await wrapper.find('.seo-options-toggle').trigger('click');
      await wrapper.find('#seo-title').setValue('My Custom SEO Title');
      await wrapper.find('#seo-description').setValue('My custom description for SEO');
      await wrapper.find('#og-image').setValue('https://example.com/og-image.png');
      
      // Click Static Site export option (index 5)
      const siteOption = wrapper.findAll('.export-option')[5];
      await siteOption.trigger('click');
      
      expect(wrapper.emitted('export')).toBeTruthy();
      const emitted = wrapper.emitted('export')![0];
      expect(emitted[0]).toBe('site');
      expect(emitted[1]).toBeUndefined(); // No PDF options
      expect(emitted[2]).toBeDefined(); // SEO settings
      expect(emitted[2]).toHaveProperty('seoTitle', 'My Custom SEO Title');
      expect(emitted[2]).toHaveProperty('seoDescription', 'My custom description for SEO');
      expect(emitted[2]).toHaveProperty('ogImage', 'https://example.com/og-image.png');
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
      expect(emitted[1]).toHaveProperty('pageSize');
      expect(emitted[1]).toHaveProperty('orientation');
      expect(emitted[1]).toHaveProperty('margins');
    });

    it('emits export with "markdown" format when Markdown option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const mdOption = wrapper.findAll('.export-option')[2];
      await mdOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['markdown']);
    });

    it('emits export with "plaintext" format when Plain Text option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const txtOption = wrapper.findAll('.export-option')[3];
      await txtOption.trigger('click');
      expect(wrapper.emitted('export')).toBeTruthy();
      expect(wrapper.emitted('export')![0]).toEqual(['plaintext']);
    });

    it('emits export with "embedded" format when Embedded HTML option is clicked', async () => {
      const wrapper = mount(ExportDialog, {
        props: { visible: true },
      });
      const htmlOption = wrapper.findAll('.export-option')[4];
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
      // Navigate to third option (index 2) - Markdown
      await dialog.trigger('keydown', { key: 'ArrowDown' });
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
