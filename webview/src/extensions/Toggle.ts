import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Toggle block extension for Tiptap
 * 
 * Provides a collapsible block with:
 * - Chevron toggle indicator
 * - Summary (header) that is always visible
 * - Content area that can be expanded/collapsed
 * - Can contain any block type inside
 * 
 * Serializes to: <details><summary>...</summary><p>...</p></details>
 */
export const Toggle = Node.create({
  name: 'toggle',
  
  group: 'block',
  
  content: 'block+',
  
  defining: true,
  
  addAttributes() {
    return {
      isOpen: {
        default: false,
        parseHTML: (element) => {
          return element.hasAttribute('open');
        },
        renderHTML: (attributes) => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const isOpen = node.attrs.isOpen;
    
    // Return just the details element - the NodeView handles adding the summary element
    // For HTML serialization, we output a simple structure that can be parsed back
    // Note: The summary element is added by the NodeView in the DOM, but for serialization
    // we just output the details with content so it can be parsed correctly
    if (isOpen) {
      return ['details', mergeAttributes({ open: '' }, HTMLAttributes), 0];
    }
    return ['details', HTMLAttributes, 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Create wrapper div for proper styling
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-wrapper';
      
      // Create the details element
      const details = document.createElement('details');
      
      // Set initial open state from node attribute
      if (node.attrs.isOpen) {
        details.setAttribute('open', '');
      }
      
      // Create the summary element
      const summary = document.createElement('summary');
      summary.className = 'toggle-summary';
      summary.textContent = 'Toggle';
      summary.setAttribute('contenteditable', 'true');
      
      // Add summary to details first
      details.appendChild(summary);
      
      // Create a content container that will hold the ProseMirror content
      const contentContainer = document.createElement('div');
      contentContainer.className = 'toggle-content';
      details.appendChild(contentContainer);
      
      // Add details to wrapper
      wrapper.appendChild(details);
      
      // Click handler for toggling
      const toggleHandler = (e: MouseEvent) => {
        e.preventDefault();
        
        // Toggle the open state on the DOM
        if (details.hasAttribute('open')) {
          details.removeAttribute('open');
        } else {
          details.setAttribute('open', '');
        }
        
        // Update the node attribute
        if (typeof getPos === 'function') {
          const pos = getPos();
          const newIsOpen = details.hasAttribute('open');
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, { isOpen: newIsOpen });
          editor.view.dispatch(tr);
        }
      };
      
      // Add click listener to summary for toggle
      summary.addEventListener('click', toggleHandler);
      
      // Add keyboard support
      summary.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleHandler(e as unknown as MouseEvent);
        }
      });
      
      return {
        dom: wrapper,
        detailsDom: details,
        
        // Content DOM element where ProseMirror will render child nodes
        contentDOM: contentContainer,
        
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'toggle') {
            return false;
          }
          
          // Update open state
          if (updatedNode.attrs.isOpen) {
            details.setAttribute('open', '');
          } else {
            details.removeAttribute('open');
          }
          
          return true;
        },
        
        // Called when the node is selected
        selectNode: () => {
          details.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        
        // Called when the node is deselected
        deselectNode: () => {
          details.style.outline = '';
        },
        
        destroy: () => {
          summary.removeEventListener('click', toggleHandler);
          summary.removeEventListener('keydown', () => {});
        },
      };
    };
  },

  addCommands() {
    return {
      insertToggle:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: 'paragraph' }],
          });
        },
      toggleOpen:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the toggle node that contains this position
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'toggle') {
              const togglePos = $from.before(depth);
              
              if (dispatch) {
                const currentIsOpen = node.attrs.isOpen || false;
                tr.setNodeMarkup(togglePos, undefined, { isOpen: !currentIsOpen });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      setToggleOpen:
        (isOpen: boolean) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the toggle node that contains this position
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'toggle') {
              const togglePos = $from.before(depth);
              
              if (dispatch) {
                tr.setNodeMarkup(togglePos, undefined, { isOpen });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter key expands the toggle
      'Mod-Enter': () => {
        return this.editor.commands.setToggleOpen(true);
      },
      // Ctrl+. also expands (common toggle shortcut)
      'Ctrl-.': () => {
        return this.editor.commands.setToggleOpen(true);
      },
    };
  },
});
