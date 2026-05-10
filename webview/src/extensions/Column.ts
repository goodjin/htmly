import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Column node for multi-column layout.
 * Each column contains block content and has a configurable width.
 * 
 * Serializes to: <div class="column" style="width: X%">...</div>
 */
export const Column = Node.create({
  name: 'column',
  
  group: 'block',
  
  content: 'block+', // Column must contain at least one block
  
  addAttributes() {
    return {
      width: {
        default: '50%',
        parseHTML: (element) => {
          return element.style.width || '50%';
        },
        renderHTML: (attributes) => {
          return { style: `width: ${attributes.width}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.column' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes({ class: 'column' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertColumn:
        (width = '50%') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { width },
            content: [{ type: 'paragraph' }],
          });
        },
      updateColumnWidth:
        (width: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { width });
        },
    };
  },
});
