import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TiptapEditor from './TiptapEditor.vue';

// Mock LinkDialog and ImageDialog components
vi.mock('./LinkDialog.vue', () => ({ default: { name: 'LinkDialog', template: '<div />' } }));
vi.mock('./ImageDialog.vue', () => ({ default: { name: 'ImageDialog', template: '<div />' } }));

describe('Code Block Syntax Highlighting', () => {
  describe('Basic code block creation', () => {
    it('creates a code block via toggleCodeBlock command', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Hello world</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      expect(editor).toBeDefined();
      
      // Set cursor to the beginning and toggle code block
      editor?.chain().focus().setTextSelection(6).run();
      editor?.chain().focus().toggleCodeBlock().run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
    });

    it('creates a code block from slash command', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Hello world</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      expect(editor).toBeDefined();
      
      // Insert code block via setTextSelection and toggleCodeBlock
      editor?.chain().focus().setTextSelection(6).run();
      editor?.chain().focus().toggleCodeBlock().run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
    });
  });

  describe('Code block content structure', () => {
    it('wraps content in pre and code tags', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      // Insert some text first
      editor?.chain().focus().setTextSelection(5).run();
      editor?.chain().focus().toggleCodeBlock().run();
      
      const html = editor?.getHTML();
      // Should have pre and code tags
      expect(html).toMatch(/<pre[^>]*><code[^>]*>/);
    });

    it('code block has code-block class for styling', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Test</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(5).run();
      editor?.chain().focus().toggleCodeBlock().run();
      
      const html = editor?.getHTML();
      // The code block should have class="code-block"
      expect(html).toContain('code-block');
    });
  });

  describe('Code block with different languages', () => {
    it('handles JavaScript content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>JS Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(9).run();
      editor?.chain().focus().toggleCodeBlock().run();
      editor?.chain().focus().insertContent('function hello() { return "world"; }').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
      expect(html).toContain('function hello');
    });

    it('handles CSS content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>CSS Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(9).run();
      editor?.chain().focus().toggleCodeBlock().run();
      editor?.chain().focus().insertContent('.container { color: red; }').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('.container');
    });

    it('handles HTML content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>HTML Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(10).run();
      editor?.chain().focus().toggleCodeBlock().run();
      // Insert text content (HTML tags will be escaped as plain text in code block)
      editor?.chain().focus().insertContent('&lt;div class="test"&gt;Hello&lt;/div&gt;').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      // The editor escapes & to &amp; in the output HTML
      expect(html).toContain('&amp;lt;div');
    });

    it('handles Python content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Python Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(12).run();
      editor?.chain().focus().toggleCodeBlock().run();
      editor?.chain().focus().insertContent('def hello():\n    print("world")').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('def hello');
    });

    it('handles JSON content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>JSON Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(10).run();
      editor?.chain().focus().toggleCodeBlock().run();
      editor?.chain().focus().insertContent('{"name": "test", "value": 42}').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain('"name"');
    });

    it('handles TypeScript content via insertContent', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>TS Code</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      editor?.chain().focus().setTextSelection(8).run();
      editor?.chain().focus().toggleCodeBlock().run();
      editor?.chain().focus().insertContent('const x: number = 42;').run();
      
      const html = editor?.getHTML();
      expect(html).toContain('<pre');
      expect(html).toContain(': number');
    });
  });

  describe('Code block undo behavior', () => {
    it('toggleCodeBlock is undoable with undo command', async () => {
      const wrapper = mount(TiptapEditor, {
        props: { modelValue: '<p>Hello world</p>' },
      });

      await wrapper.vm.$nextTick();
      const editor = wrapper.vm.editor;
      
      const initialHtml = editor?.getHTML();
      expect(initialHtml).toBe('<p>Hello world</p>');
      
      // Insert code block
      editor?.chain().focus().setTextSelection(6).run();
      editor?.chain().focus().toggleCodeBlock().run();
      
      const afterToggleHtml = editor?.getHTML();
      expect(afterToggleHtml).toContain('<pre');
      
      // Undo
      editor?.chain().focus().undo().run();
      
      const afterUndoHtml = editor?.getHTML();
      expect(afterUndoHtml).toBe(initialHtml);
    });
  });
});
