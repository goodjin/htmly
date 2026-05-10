import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * BlockBackground Mark extension for Tiptap
 * 
 * Applies background color to any block or inline content.
 * This is a Mark that renders as a span with inline style.
 * 
 * Serializes to: <span class="block-background" style="background-color: #xxxxxx" data-bg="#xxxxxx">content</span>
 * 
 * The mark can be applied to any node, and when applied to block-level content,
 * it wraps that content in a styled span.
 */
export const BlockBackground = Mark.create({
  name: 'blockBackground',
  
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          // Try to get color from data-bg attribute first (preserves original hex value)
          const dataBg = element.getAttribute('data-bg');
          if (dataBg) return dataBg;
          
          // Fall back to style attribute (browser may convert to rgb)
          const styleBg = element.style.backgroundColor;
          if (styleBg) return styleBg;
          
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            style: `background-color: ${attributes.color}`,
            'data-bg': attributes.color,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-bg]',
      },
      {
        tag: 'span.block-background',
      },
      // Note: We don't parse div[data-bg] here to avoid conflicting with 
      // Callout which uses data-bg for its own background color
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'block-background' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setBlockBackground:
        (color: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { color });
        },
      unsetBlockBackground:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      toggleBlockBackground:
        (color: string) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { color });
        },
      updateBlockBackground:
        (color: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          // Check if mark is already applied
          const mark = state.schema.marks[this.name];
          if (!mark) return false;
          
          const { from, to } = selection;
          
          // Get all marks in the selection
          let hasMark = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.marks.some(m => m.type.name === this.name)) {
              hasMark = true;
            }
          });
          
          if (dispatch) {
            if (hasMark) {
              // Update existing marks
              const transaction = state.tr;
              state.doc.nodesBetween(from, to, (node, pos) => {
                const blockBgMark = node.marks.find(m => m.type.name === this.name);
                if (blockBgMark) {
                  transaction.addMark(pos, pos + node.nodeSize, mark.create({ color }));
                }
              });
              dispatch(transaction);
            } else {
              // Apply new mark
              commands.setMark(this.name, { color })();
            }
          }
          
          return true;
        },
    };
  },
});
