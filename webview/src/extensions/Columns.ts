import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Columns container node for multi-column layout.
 * Contains multiple column children that can be resized.
 * 
 * Serializes to: <div class="columns">...</div>
 */
export const Columns = Node.create({
  name: 'columns',
  
  group: 'block',
  
  content: 'column{2,}', // Must contain at least 2 columns
  
  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: 'div.columns' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'columns' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertColumns:
        () =>
        ({ commands }) => {
          // Insert two columns with default 50% width each
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'column',
                attrs: { width: '50%' },
                content: [{ type: 'paragraph' }],
              },
              {
                type: 'column',
                attrs: { width: '50%' },
                content: [{ type: 'paragraph' }],
              },
            ],
          });
        },
      addColumnLeft:
        () =>
        ({ commands }) => {
          // Get current column and add a new one to the left
          return commands.wrapIn('columns', [
            {
              type: 'column',
              attrs: { width: '33%' },
              content: [{ type: 'paragraph' }],
            },
            {
              type: 'column',
              attrs: { width: '33%' },
            },
            {
              type: 'column',
              attrs: { width: '34%' },
            },
          ]);
        },
      addColumnRight:
        () =>
        ({ commands }) => {
          // Get current column and add a new one to the right
          return commands.wrapIn('columns', [
            {
              type: 'column',
              attrs: { width: '33%' },
            },
            {
              type: 'column',
              attrs: { width: '33%' },
            },
            {
              type: 'column',
              attrs: { width: '34%' },
              content: [{ type: 'paragraph' }],
            },
          ]);
        },
      deleteColumn:
        () =>
        ({ commands }) => {
          // Delete the current column
          return commands.lift('column');
        },
      updateColumnWidth:
        (pos: number, width: string) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== 'column') return false;
          
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, width });
          return true;
        },
    };
  },
});
