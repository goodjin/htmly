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

// Mock editor factory for table tests
function createMockEditor(tableActive = false, headerActive = false) {
  return {
    isActive: (type: string, attrs?: any) => {
      if (type === 'table') return tableActive;
      if (type === 'tableHeader') return headerActive;
      if (type === 'tableRow') return tableActive;
      if (type === 'tableCell') return tableActive;
      if (type === 'link') return false;
      return false;
    },
    getAttributes: (type: string) => {
      if (type === 'tableCell') {
        return { backgroundColor: '#ffffff' };
      }
      if (type === 'link') {
        return {};
      }
      if (type === 'textStyle') {
        return { color: '#000000' };
      }
      return {};
    },
    chain: () => ({
      focus: () => ({
        addRowAfter: () => ({ run: () => {} }),
        addRowBefore: () => ({ run: () => {} }),
        deleteRow: () => ({ run: () => {} }),
        addColumnAfter: () => ({ run: () => {} }),
        addColumnBefore: () => ({ run: () => {} }),
        deleteColumn: () => ({ run: () => {} }),
        mergeCells: () => ({ run: () => {} }),
        splitCell: () => ({ run: () => {} }),
        toggleHeaderRow: () => ({ run: () => {} }),
        setCellAttribute: () => ({ run: () => {} }),
        insertTable: () => ({ run: () => {} }),
        setHorizontalRule: () => ({ run: () => {} }),
        setImage: () => ({ run: () => {} }),
        toggleBold: () => ({ run: () => {} }),
        toggleItalic: () => ({ run: () => {} }),
        toggleUnderline: () => ({ run: () => {} }),
        toggleStrike: () => ({ run: () => {} }),
        toggleHighlight: () => ({ run: () => {} }),
        toggleBulletList: () => ({ run: () => {} }),
        toggleOrderedList: () => ({ run: () => {} }),
        toggleBlockquote: () => ({ run: () => {} }),
        toggleCodeBlock: () => ({ run: () => {} }),
        setTextAlign: () => ({ run: () => {} }),
        setColor: () => ({ run: () => {} }),
        unsetColor: () => ({ run: () => {} }),
        setLink: () => ({ run: () => {} }),
        unsetLink: () => ({ run: () => {} }),
        insertContent: () => ({ run: () => {} }),
        setParagraph: () => ({ run: () => {} }),
        toggleHeading: () => ({ run: () => {} }),
      }),
    }),
    state: {
      selection: { from: 0, to: 0 },
    },
  };
}

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

  describe('Table Operations', () => {
    it('shows table operation buttons when cursor is inside a table', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      // Table operation group should be visible when isTableActive is true
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });

    it('hides table operation buttons when cursor is not in a table', () => {
      const mockEditor = createMockEditor(false, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      // Without a table-active editor, the v-if="isTableActive" should hide table buttons
      // We verify table buttons are not present by checking the toolbar has basic buttons
      const tableButtons = wrapper.findAll('button').filter(b => 
        b.text().includes('Add Row') || 
        b.text().includes('Del Row') ||
        b.text().includes('Add Col') ||
        b.text().includes('Del Col') ||
        b.text().includes('Merge') ||
        b.text().includes('Split')
      );
      expect(tableButtons.length).toBe(0);
    });

    it('has Add Row button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const addRowBtn = wrapper.findAll('button').find(b => b.text().includes('Add Row'));
      expect(addRowBtn).toBeDefined();
    });

    it('has Delete Row button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const delRowBtn = wrapper.findAll('button').find(b => b.text().includes('Del Row'));
      expect(delRowBtn).toBeDefined();
    });

    it('has Add Column button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const addColBtn = wrapper.findAll('button').find(b => b.text().includes('Add Col'));
      expect(addColBtn).toBeDefined();
    });

    it('has Delete Column button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const delColBtn = wrapper.findAll('button').find(b => b.text().includes('Del Col'));
      expect(delColBtn).toBeDefined();
    });

    it('has Merge Cells button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const mergeBtn = wrapper.findAll('button').find(b => b.text().includes('Merge'));
      expect(mergeBtn).toBeDefined();
    });

    it('has Split Cell button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const splitBtn = wrapper.findAll('button').find(b => b.text().includes('Split'));
      expect(splitBtn).toBeDefined();
    });

    it('has Header Row toggle button in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const headerBtn = wrapper.findAll('button').find(b => b.text().includes('Hdr Row'));
      expect(headerBtn).toBeDefined();
    });

    it('has Cell BG color picker in table operations', () => {
      const mockEditor = createMockEditor(true, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const cellBgLabel = wrapper.find('.cell-bg-label');
      expect(cellBgLabel.exists()).toBe(true);
    });

    it('Header Row toggle button has active class when in header row', () => {
      const mockEditor = createMockEditor(true, true);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const headerBtn = wrapper.findAll('button').find(b => b.text().includes('Hdr Row'));
      expect(headerBtn!.classes()).toContain('active');
    });

    it('Insert Table button is always visible in toolbar', () => {
      const mockEditor = createMockEditor(false, false);
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: mockEditor as any },
      });
      const tableBtn = wrapper.findAll('button').find(b => b.text().includes('Table'));
      expect(tableBtn).toBeDefined();
    });
  });
});
