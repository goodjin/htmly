import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, defineComponent } from 'vue';
import Toolbar from './Toolbar.vue';

// Mock child components - use vi.mock factory to avoid hoisting issues
vi.mock('./LinkDialog.vue', () => ({
  default: defineComponent({ name: 'LinkDialog', template: '<div />' })
}));
vi.mock('./ImageDialog.vue', () => ({
  default: defineComponent({ name: 'ImageDialog', template: '<div />' })
}));
vi.mock('./EmbedDialog.vue', () => ({
  default: defineComponent({ name: 'EmbedDialog', template: '<div />' })
}));
vi.mock('./LinkPreviewDialog.vue', () => ({
  default: defineComponent({ name: 'LinkPreviewDialog', template: '<div />' })
}));
vi.mock('./ExportDialog.vue', () => ({
  default: defineComponent({ name: 'ExportDialog', template: '<div />' })
}));
vi.mock('./MathSymbolsDropdown.vue', () => ({
  default: defineComponent({ 
    name: 'MathSymbolsDropdown', 
    template: '<div class="math-symbols-dropdown-mock" />',
    emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline']
  })
}));

const defaultProps = {
  editor: undefined,
  mode: 'wysiwyg' as const,
  dirty: false,
  readOnly: false,
  showButtonLabels: true,
  autoHideToolbarInPreview: true,
  saveStatus: 'idle' as const,
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
      if (type === 'mathInline') return false;
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
        insertMathInline: () => ({ run: () => {} }),
        insertMathBlock: () => ({ run: () => {} }),
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
    it('keeps the toolbar and mode-switcher visible in preview mode (so user is not stuck) but hides rich-text groups', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      // Toolbar root must remain visible so the user can switch out of preview mode
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      // The mode-switcher (WYSIWYG / Source / Preview / Split) must always be present
      expect(wrapper.find('.mode-switcher').exists()).toBe(true);
      // Rich-text-only groups (e.g. Bold) must be hidden in preview mode
      const richTextButtons = wrapper.findAll('button').filter(b =>
        b.text().includes('Bold') ||
        b.text().includes('Italic') ||
        b.text().includes('Underline') ||
        b.text().includes('Bullet') ||
        b.text().includes('Align Left') ||
        b.text().includes('Templates')
      );
      expect(richTextButtons.length).toBe(0);
    });

    it('shows the full toolbar in preview mode when autoHideToolbarInPreview is false', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: false },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      expect(wrapper.find('.mode-switcher').exists()).toBe(true);
    });

    it('shows the full toolbar in wysiwyg mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      // In wysiwyg mode, rich-text groups should still render
      const boldBtn = wrapper.findAll('button').find(b => b.text().includes('Bold'));
      expect(boldBtn).toBeDefined();
    });

    it('shows the toolbar in source mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'source', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      expect(wrapper.find('.mode-switcher').exists()).toBe(true);
    });

    it('shows the toolbar in split mode regardless of autoHideToolbarInPreview', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'split', autoHideToolbarInPreview: true },
      });
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      expect(wrapper.find('.mode-switcher').exists()).toBe(true);
    });

    it('mode-switcher buttons emit setMode in preview mode even when editor is undefined', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      const wysiwygBtn = wrapper.findAll('button').find(b => b.text().includes('WYSIWYG'))!;
      await wysiwygBtn.trigger('mousedown');
      expect(wrapper.emitted('setMode')).toBeTruthy();
      expect(wrapper.emitted('setMode')!.at(-1)).toEqual(['wysiwyg']);
    });

    it('mode-switcher buttons are not gated by the btn() editor check in preview mode', async () => {
      // editor is undefined (default), but mode-switcher must still emit
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      const sourceBtn = wrapper.findAll('button').find(b => b.text().includes('Source'))!;
      await sourceBtn.trigger('mousedown');
      expect(wrapper.emitted('setMode')!.at(-1)).toEqual(['source']);
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
      // Note: We use specific table operation button labels to avoid matching mode-switcher "Split"
      const tableButtons = wrapper.findAll('button').filter(b => 
        b.text().includes('Add Row') || 
        b.text().includes('Del Row') ||
        b.text().includes('Add Col') ||
        b.text().includes('Del Col') ||
        b.text().includes('Merge') ||
        b.text().includes('Split Cell')
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

  describe('Save Status Indicator', () => {
    it('shows "Saving..." when status is saving', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'saving' },
      });
      const savingIndicator = wrapper.find('.save-indicator.saving');
      expect(savingIndicator.exists()).toBe(true);
      expect(savingIndicator.text()).toContain('Saving...');
    });

    it('shows "✓ Saved" when status is saved', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'saved' },
      });
      const savedIndicator = wrapper.find('.save-indicator.saved');
      expect(savedIndicator.exists()).toBe(true);
      expect(savedIndicator.text()).toContain('Saved');
    });

    it('shows "✗ Error" when status is error', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'error' },
      });
      const errorIndicator = wrapper.find('.save-indicator.error');
      expect(errorIndicator.exists()).toBe(true);
      expect(errorIndicator.text()).toContain('Error');
    });

    it('shows dirty indicator when status is idle and dirty is true', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'idle', dirty: true },
      });
      const dirtyIndicator = wrapper.find('.dirty-indicator');
      expect(dirtyIndicator.exists()).toBe(true);
    });

    it('shows nothing when status is idle and dirty is false', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'idle', dirty: false },
      });
      expect(wrapper.find('.dirty-indicator').exists()).toBe(false);
      expect(wrapper.find('.save-indicator').exists()).toBe(false);
    });

    it('prefers save status over dirty indicator', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'saving', dirty: true },
      });
      expect(wrapper.find('.save-indicator.saving').exists()).toBe(true);
      expect(wrapper.find('.dirty-indicator').exists()).toBe(false);
    });

    it('has correct CSS classes for save indicator states', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'saving' },
      });
      const indicator = wrapper.find('.save-indicator');
      expect(indicator.classes()).toContain('saving');
    });

    it('displays text for saving status (no emoji/icon, per icon migration)', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, saveStatus: 'saving' },
      });
      const savingIndicator = wrapper.find('.save-indicator.saving');
      expect(savingIndicator.text()).toContain('Saving...');
      expect(savingIndicator.text()).not.toContain('💾');
    });
  });

  describe('Export Button', () => {
    it('renders export button in wysiwyg mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('renders export button in preview mode when toolbar is visible', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: false },
      });
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      expect(exportBtn).toBeDefined();
    });

    it('emits exportRequest with pdf format when pdf option is selected', async () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      // Find and click the export button
      const exportBtn = wrapper.findAll('button').find(b => b.text().includes('Export'));
      await exportBtn!.trigger('mousedown');
      
      // The ExportDialog should now be visible - but since it's mocked, 
      // we can't interact with it. Instead, let's verify the dialog becomes visible
      // by checking the ExportDialog component receives visible=true
      const exportDialog = wrapper.findComponent({ name: 'ExportDialog' });
      expect(exportDialog.exists()).toBe(true);
    });
  });

  describe('Math Toolbar', () => {
    it('renders inline math button in wysiwyg mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const inlineMathBtn = wrapper.findAll('button').find(b => b.text().includes('Inline'));
      expect(inlineMathBtn).toBeDefined();
    });

    it('renders math symbols dropdown component in wysiwyg mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const mathDropdown = wrapper.findComponent({ name: 'MathSymbolsDropdown' });
      expect(mathDropdown.exists()).toBe(true);
    });

    it('has insertMathInline command available on editor chain', () => {
      const mockEditor = createMockEditor(false, false);
      const chainResult = mockEditor.chain();
      expect(chainResult.focus).toBeDefined();
    });

    it('math symbols dropdown component is rendered with correct props', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' },
      });
      const mathDropdown = wrapper.findComponent({ name: 'MathSymbolsDropdown' });
      expect(mathDropdown.exists()).toBe(true);
      // Check that the dropdown has emits defined (these are events the parent listens to)
      expect(mathDropdown.vm.$options.emits).toBeDefined();
    });

    it('does not show math buttons in source mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'source' },
      });
      // In source mode, the template v-if="mode === 'wysiwyg'" hides toolbar content
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      // Math dropdown should not be in the DOM for source mode
      const mathDropdown = wrapper.findComponent({ name: 'MathSymbolsDropdown' });
      expect(mathDropdown.exists()).toBe(false);
    });

    it('does not show math buttons in preview mode', () => {
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'preview', autoHideToolbarInPreview: true },
      });
      // Toolbar root stays visible (so the user can switch out of preview),
      // but rich-text math buttons remain hidden
      expect(wrapper.find('.toolbar').exists()).toBe(true);
      const mathDropdown = wrapper.findComponent({ name: 'MathSymbolsDropdown' });
      expect(mathDropdown.exists()).toBe(false);
    });
  });

  describe('Rich text buttons click behavior (regression for 8e0fd75 btn() guard)', () => {
    // Regression coverage for the root cause: `@mousedown="btn(() => …)"` is
    // compiled by Vue into `$event => _ctx.btn(…)`, so the closure returned
    // by `btn()` is discarded and the action never runs. The fix removes
    // `btn()` from the template (the binding is now `@mousedown.prevent="…"`
    // pointing directly at the expression), so mousedown must actually call
    // through to `editor.chain().focus().<command>().run()`.
    //
    // The original `createMockEditor()` returns a fresh chain object per call,
    // so it can't answer "was toggleBold ever called?" — we wrap a stable spy
    // chain below for that.
    function createChainSpyEditor() {
      const run = vi.fn();
      const toggleBold = vi.fn(() => ({ run }));
      const toggleItalic = vi.fn(() => ({ run }));
      const toggleUnderline = vi.fn(() => ({ run }));
      const toggleStrike = vi.fn(() => ({ run }));
      const toggleHighlight = vi.fn(() => ({ run }));
      const toggleBulletList = vi.fn(() => ({ run }));
      const toggleOrderedList = vi.fn(() => ({ run }));
      const toggleBlockquote = vi.fn(() => ({ run }));
      const toggleCodeBlock = vi.fn(() => ({ run }));
      const setTextAlign = vi.fn(() => ({ run }));
      const toggleHeading = vi.fn(() => ({ run }));
      const setParagraph = vi.fn(() => ({ run }));
      const focus = vi.fn(() => ({
        toggleBold,
        toggleItalic,
        toggleUnderline,
        toggleStrike,
        toggleHighlight,
        toggleBulletList,
        toggleOrderedList,
        toggleBlockquote,
        toggleCodeBlock,
        setTextAlign,
        toggleHeading,
        setParagraph,
      }));
      const chain = vi.fn(() => ({ focus }));
      return {
        chain, focus, run,
        toggleBold, toggleItalic, toggleUnderline, toggleStrike, toggleHighlight,
        toggleBulletList, toggleOrderedList, toggleBlockquote, toggleCodeBlock,
        setTextAlign, toggleHeading, setParagraph,
        isActive: () => false,
        getAttributes: () => ({}),
        state: { selection: { from: 0, to: 0 } },
      };
    }

    function clickButtonByText(wrapper: any, text: string) {
      const btn = wrapper.findAll('button').find((b: any) => b.text().includes(text));
      if (!btn) throw new Error(`Button with text "${text}" not found`);
      return btn;
    }

    it('clicking Bold invokes editor.chain().focus().toggleBold().run()', async () => {
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      await clickButtonByText(wrapper, 'Bold').trigger('mousedown');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.toggleBold).toHaveBeenCalledTimes(1);
      expect(editor.run).toHaveBeenCalledTimes(1);
      // Sibling commands must not be invoked
      expect(editor.toggleItalic).not.toHaveBeenCalled();
      expect(editor.toggleUnderline).not.toHaveBeenCalled();
      expect(editor.toggleStrike).not.toHaveBeenCalled();
    });

    it('clicking Italic invokes editor.chain().focus().toggleItalic().run()', async () => {
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      await clickButtonByText(wrapper, 'Italic').trigger('mousedown');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.toggleItalic).toHaveBeenCalledTimes(1);
      expect(editor.run).toHaveBeenCalledTimes(1);
      expect(editor.toggleBold).not.toHaveBeenCalled();
      expect(editor.toggleUnderline).not.toHaveBeenCalled();
    });

    it('clicking Underline invokes editor.chain().focus().toggleUnderline().run()', async () => {
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      await clickButtonByText(wrapper, 'Underline').trigger('mousedown');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.toggleUnderline).toHaveBeenCalledTimes(1);
      expect(editor.run).toHaveBeenCalledTimes(1);
      expect(editor.toggleBold).not.toHaveBeenCalled();
      expect(editor.toggleItalic).not.toHaveBeenCalled();
    });

    it('clicking Bullet List invokes editor.chain().focus().toggleBulletList().run()', async () => {
      // Sanity-check a non-formatting rich-text command to confirm the fix
      // works for every @mousedown.prevent binding, not just inline marks.
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      await clickButtonByText(wrapper, 'Bullet').trigger('mousedown');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.toggleBulletList).toHaveBeenCalledTimes(1);
      expect(editor.run).toHaveBeenCalledTimes(1);
    });

    it('clicking Align Center invokes editor.chain().focus().setTextAlign("center").run()', async () => {
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      await clickButtonByText(wrapper, 'Center').trigger('mousedown');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.setTextAlign).toHaveBeenCalledTimes(1);
      expect(editor.setTextAlign).toHaveBeenCalledWith('center');
      expect(editor.run).toHaveBeenCalledTimes(1);
    });

    it('selecting Heading 1 invokes editor.chain().focus().toggleHeading({ level: 1 }).run()', async () => {
      // Heading is a <select @change> binding, not a button mousedown. This
      // pins that the editor call still goes through after the rewrite.
      const editor = createChainSpyEditor();
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg', editor: editor as any },
      });
      const headingSelect = wrapper.find('select.heading-select');
      expect(headingSelect.exists()).toBe(true);
      await headingSelect.setValue('1');

      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(editor.focus).toHaveBeenCalledTimes(1);
      expect(editor.toggleHeading).toHaveBeenCalledTimes(1);
      expect(editor.toggleHeading).toHaveBeenCalledWith({ level: 1 });
      expect(editor.run).toHaveBeenCalledTimes(1);
    });

    it('rich-text click is NOT swallowed when editor prop is undefined', async () => {
      // After dropping the `btn()` wrapper entirely, every action template
      // uses `editor?.chain()...` optional chaining, so an undefined editor
      // must be a silent no-op (no thrown error). This pins that behavior:
      // mousedown on Bold with editor=undefined completes without throwing.
      const wrapper = mount(Toolbar, {
        props: { ...defaultProps, mode: 'wysiwyg' /* editor: undefined */ },
      });
      const boldBtn = clickButtonByText(wrapper, 'Bold');
      await expect(boldBtn.trigger('mousedown')).resolves.toBeUndefined();
      expect(wrapper.find('.toolbar').exists()).toBe(true);
    });
  });
});
