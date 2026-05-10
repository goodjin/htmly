import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { VueRenderer } from '@tiptap/vue-3';
import SlashCommandMenu from '../components/SlashCommandMenu.vue';
import { Callout } from './Callout';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: any) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: 'Paragraph',
    description: 'Plain text paragraph',
    icon: '¶',
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: '•',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Ordered List',
    description: 'Create a numbered list',
    icon: '1.',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Blockquote',
    description: 'Capture a quote',
    icon: '❝',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: '{}',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3x3 table',
    icon: '⊞',
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Insert an image from URL',
    icon: '🖼',
    command: (editor) => editor.chain().focus().setImage({ src: '', alt: '' }).run(),
  },
  {
    title: 'Horizontal Rule',
    description: 'Insert a horizontal divider',
    icon: '—',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Divider',
    description: 'Visual section break',
    icon: '⋮',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Callout',
    description: 'Highlight important information',
    icon: '💡',
    command: (editor) => editor.chain().focus().insertCallout().run(),
  },
];

export const SlashCommandsExtension = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
        },

        render: () => {
          let component: VueRenderer | null = null;
          let popup: HTMLElement | null = null;

          return {
            onStart: (props: any) => {
              popup = document.createElement('div');
              popup.className = 'slash-command-popup';
              document.body.appendChild(popup);

              component = new VueRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });

              popup.appendChild(component.el as Node);

              const rect = props.clientRect?.();
              if (rect && popup) {
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 8}px`;
              }
            },

            onUpdate: (props: any) => {
              if (component) {
                component.updateProps(props);
              }

              if (popup) {
                const rect = props.clientRect?.();
                if (rect) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 8}px`;
                }
              }
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup?.remove();
                return true;
              }

              if (component?.ref) {
                return component.ref.onKeyDown(props);
              }
              return false;
            },

            onExit: () => {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },

        command: ({ editor, range, props }: any) => {
          editor.chain().focus().deleteRange(range).run();

          if (props.command) {
            props.command(editor);
          }
        },
      }),
    ];
  },
});
