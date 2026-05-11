import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * DatePickerCell - A custom table cell that displays a date picker
 * 
 * Features:
 * - Click to open native date picker
 * - Stores date value in cell attribute
 * - Visual calendar icon indicator
 * - Styled to match VS Code theme
 */
export const DatePickerCell = Node.create({
  name: 'datePickerCell',
  
  group: 'block',
  
  content: '',
  
  addAttributes() {
    return {
      date: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-date') || '',
        renderHTML: (attributes) => ({
          'data-date': attributes.date,
        }),
      },
      placeholder: {
        default: 'Select date',
        parseHTML: (element) => element.getAttribute('data-placeholder') || 'Select date',
        renderHTML: (attributes) => ({
          'data-placeholder': attributes.placeholder,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="date-picker-cell"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'date-picker-cell',
        class: 'date-picker-cell',
      }),
      [
        'input',
        {
          type: 'date',
          class: 'date-picker-input',
          value: node.attrs.date || '',
          placeholder: node.attrs.placeholder || 'Select date',
        },
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className = 'date-picker-cell';
      dom.setAttribute('data-type', 'date-picker-cell');
      
      // Create the date input
      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'date-picker-input';
      input.value = node.attrs.date || '';
      input.placeholder = node.attrs.placeholder || 'Select date';
      
      // Create a container for visual styling
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'date-picker-input-wrapper';
      
      // Calendar icon
      const icon = document.createElement('span');
      icon.className = 'date-picker-icon';
      icon.innerHTML = '&#128197;'; // Calendar emoji
      
      inputWrapper.appendChild(input);
      inputWrapper.appendChild(icon);
      dom.appendChild(inputWrapper);
      
      // Handle date changes
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const newDate = target.value;
        
        if (typeof getPos === 'function') {
          const pos = getPos();
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, { 
            date: newDate,
            placeholder: node.attrs.placeholder 
          });
          editor.view.dispatch(tr);
        }
      });
      
      // Prevent default behavior when clicking on the cell
      dom.addEventListener('mousedown', (e) => {
        if (e.target === dom || e.target === inputWrapper || e.target === icon) {
          // Don't prevent on input itself - let user interact with it
          if (e.target !== input) {
            input.focus();
          }
        }
      });
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'datePickerCell') {
            return false;
          }
          input.value = updatedNode.attrs.date || '';
          return true;
        },
        selectNode: () => {
          dom.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        deselectNode: () => {
          dom.style.outline = '';
        },
        destroy: () => {
          input.removeEventListener('input', () => {});
        },
      };
    };
  },

  addCommands() {
    return {
      insertDatePickerCell:
        (attrs = {}) =>
        ({ tr, state, dispatch, commands }) => {
          const datePickerNode = state.schema.nodes.datePickerCell.create(
            { 
              date: attrs.date || '',
              placeholder: attrs.placeholder || 'Select date',
            }
          );
          
          if (dispatch) {
            const docSize = state.doc.content.size;
            tr.insert(docSize, datePickerNode);
            dispatch(tr);
          }
          return true;
        },
      setCellDate:
        (date: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the datePickerCell node
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'datePickerCell') {
              const cellPos = $from.before(depth);
              
              if (dispatch) {
                const tr = state.tr.setNodeMarkup(cellPos, undefined, { date });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});

/**
 * Convert a standard table cell to a date picker cell
 */
export function convertCellToDatePicker(editor: any, cellPos: number) {
  const { state } = editor;
  
  // Check if position is within document bounds
  if (cellPos < 0 || cellPos > state.doc.content.size) {
    return false;
  }
  
  const node = state.doc.nodeAt(cellPos);
  
  if (!node) return false;
  
  const datePickerNode = state.schema.nodes.datePickerCell.create(
    { date: '', placeholder: 'Select date' }
  );
  
  return editor.chain()
    .command(({ tr }) => {
      tr.replaceWith(cellPos, cellPos + node.nodeSize, datePickerNode);
      return true;
    })
    .run();
}
