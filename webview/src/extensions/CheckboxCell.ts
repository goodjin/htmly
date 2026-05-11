import { Node, mergeAttributes } from '@tiptap/core';

/**
 * CheckboxCell - A custom table cell that displays a checkbox
 * 
 * Features:
 * - Click to toggle checked state
 * - Visual checkbox indicator with styling
 * - Stores checked state in cell attribute
 * - Styled to match VS Code theme
 */
export const CheckboxCell = Node.create({
  name: 'checkboxCell',
  
  group: 'block',
  
  content: '',
  
  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-checked') === 'true',
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked ? 'true' : 'false',
          // Sort value for table sorting: "1" for checked, "0" for unchecked
          // This allows checkbox columns to be sorted (unchecked first in asc, checked first in desc)
          'data-sort-value': attributes.checked ? '1' : '0',
        }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') || '',
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="checkbox-cell"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const isChecked = node.attrs.checked;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'checkbox-cell',
        'data-checked': isChecked ? 'true' : 'false',
        'data-sort-value': isChecked ? '1' : '0',
        class: 'checkbox-cell',
      }),
      [
        'div',
        {
          class: `checkbox-visual ${isChecked ? 'is-checked' : ''}`,
        },
        isChecked
          ? ['span', { class: 'checkbox-check' }, '✓']
          : '',
      ],
      node.attrs.label
        ? ['span', { class: 'checkbox-label' }, node.attrs.label]
        : '',
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className = 'checkbox-cell';
      dom.setAttribute('data-type', 'checkbox-cell');
      dom.setAttribute('data-checked', node.attrs.checked ? 'true' : 'false');
      dom.setAttribute('data-sort-value', node.attrs.checked ? '1' : '0');
      
      // Create the checkbox visual
      const checkboxVisual = document.createElement('div');
      checkboxVisual.className = `checkbox-visual ${node.attrs.checked ? 'is-checked' : ''}`;
      
      // Check mark (shown when checked)
      const checkMark = document.createElement('span');
      checkMark.className = 'checkbox-check';
      if (node.attrs.checked) {
        checkMark.textContent = '✓';
      }
      checkboxVisual.appendChild(checkMark);
      
      // Optional label
      const label = document.createElement('span');
      label.className = 'checkbox-label';
      label.textContent = node.attrs.label || '';
      
      dom.appendChild(checkboxVisual);
      dom.appendChild(label);
      
      // Toggle on click
      const toggle = () => {
        const newChecked = !node.attrs.checked;
        
        if (typeof getPos === 'function') {
          const pos = getPos();
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, { 
            checked: newChecked,
            label: node.attrs.label 
          });
          editor.view.dispatch(tr);
        }
      };
      
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });
      
      // Keyboard support
      dom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
      
      // Make focusable
      dom.setAttribute('tabindex', '0');
      dom.setAttribute('role', 'checkbox');
      dom.setAttribute('aria-checked', node.attrs.checked ? 'true' : 'false');
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'checkboxCell') {
            return false;
          }
          
          const isChecked = updatedNode.attrs.checked;
          dom.setAttribute('data-checked', isChecked ? 'true' : 'false');
          dom.setAttribute('data-sort-value', isChecked ? '1' : '0');
          dom.setAttribute('aria-checked', isChecked ? 'true' : 'false');
          checkboxVisual.className = `checkbox-visual ${isChecked ? 'is-checked' : ''}`;
          
          if (isChecked) {
            checkMark.textContent = '✓';
          } else {
            checkMark.textContent = '';
          }
          
          label.textContent = updatedNode.attrs.label || '';
          return true;
        },
        selectNode: () => {
          dom.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        deselectNode: () => {
          dom.style.outline = '';
        },
        destroy: () => {
          dom.removeEventListener('click', toggle);
          dom.removeEventListener('keydown', () => {});
        },
      };
    };
  },

  addCommands() {
    return {
      insertCheckboxCell:
        (attrs = {}) =>
        ({ tr, state, dispatch, commands }) => {
          const checkboxNode = state.schema.nodes.checkboxCell.create(
            { 
              checked: attrs.checked || false,
              label: attrs.label || '',
            }
          );
          
          if (dispatch) {
            const docSize = state.doc.content.size;
            tr.insert(docSize, checkboxNode);
            dispatch(tr);
          }
          return true;
        },
      toggleCellCheckbox:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the checkboxCell node
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'checkboxCell') {
              const cellPos = $from.before(depth);
              const newChecked = !node.attrs.checked;
              
              if (dispatch) {
                const tr = state.tr.setNodeMarkup(cellPos, undefined, { 
                  checked: newChecked,
                  label: node.attrs.label 
                });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      setCellLabel:
        (label: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the checkboxCell node
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'checkboxCell') {
              const cellPos = $from.before(depth);
              
              if (dispatch) {
                const tr = state.tr.setNodeMarkup(cellPos, undefined, { 
                  checked: node.attrs.checked,
                  label 
                });
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
 * Convert a standard table cell to a checkbox cell
 */
export function convertCellToCheckbox(editor: any, cellPos: number, checked = false) {
  const { state } = editor;
  
  // Check if position is within document bounds
  if (cellPos < 0 || cellPos > state.doc.content.size) {
    return false;
  }
  
  const node = state.doc.nodeAt(cellPos);
  
  if (!node) return false;
  
  const checkboxNode = state.schema.nodes.checkboxCell.create(
    { checked, label: '' }
  );
  
  return editor.chain()
    .command(({ tr }) => {
      tr.replaceWith(cellPos, cellPos + node.nodeSize, checkboxNode);
      return true;
    })
    .run();
}
