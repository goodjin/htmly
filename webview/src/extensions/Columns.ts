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
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the column that contains the current position
          let columnDepth = -1;
          let columnPos = -1;
          
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'column') {
              columnDepth = depth;
              columnPos = $from.before(depth);
              break;
            }
          }
          
          if (columnPos === -1 || columnDepth === -1) {
            return false;
          }
          
          // Find the parent columns container
          const columnNode = $from.node(columnDepth);
          const columnsDepth = columnDepth + 1;
          if (columnsDepth > $from.depth) return false;
          
          const columnsNode = $from.node(columnsDepth);
          if (columnsNode.type.name !== 'columns') return false;
          
          // Find the index of the current column within columns
          const columnIndex = $from.index(columnsDepth);
          
          // Calculate new column width (divide evenly among all columns + 1)
          const totalColumns = columnsNode.childCount + 1;
          const newWidth = Math.round(100 / totalColumns);
          const lastWidth = 100 - (newWidth * (totalColumns - 1));
          
          // Create the new column
          const newColumn = state.schema.nodes.column.create({
            width: `${newWidth}%`,
          }, [state.schema.nodes.paragraph.create()]);
          
          // Create the transaction
          if (dispatch) {
            const pos = $from.before(columnDepth);
            
            // Insert the new column at the left of current column
            tr.insert(pos, newColumn);
            
            // Update widths of all columns
            columnsNode.forEach((child, offset, index) => {
              if (index === columnIndex) {
                // Current column becomes wider (with the new column)
                const colStart = pos + offset;
                const newColAttrs = { ...child.attrs, width: `${newWidth}%` };
                tr.setNodeMarkup(colStart, undefined, newColAttrs);
              } else if (index === columnIndex - 1) {
                // Previous column becomes the new column
                const colStart = pos + offset;
                const newColAttrs = { width: `${newWidth}%` };
                tr.setNodeMarkup(colStart, undefined, newColAttrs);
              } else if (index >= columnIndex) {
                // All columns after get shifted, update their widths
                const colStart = pos + offset;
                const newColAttrs = { ...child.attrs, width: `${newWidth}%` };
                tr.setNodeMarkup(colStart, undefined, newColAttrs);
              }
            });
            
            // Fix the last column to ensure total is 100%
            const lastIndex = columnsNode.childCount;
            const lastColPos = pos + columnsNode.content.size - columnsNode.lastChild!.nodeSize;
            tr.setNodeMarkup(lastColPos, undefined, { width: `${lastWidth}%` });
            
            dispatch(tr);
          }
          
          return true;
        },
      addColumnRight:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the column that contains the current position
          let columnDepth = -1;
          let columnPos = -1;
          
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'column') {
              columnDepth = depth;
              columnPos = $from.after(depth);
              break;
            }
          }
          
          if (columnPos === -1 || columnDepth === -1) {
            return false;
          }
          
          // Find the parent columns container
          const columnNode = $from.node(columnDepth);
          const columnsDepth = columnDepth + 1;
          if (columnsDepth > $from.depth) return false;
          
          const columnsNode = $from.node(columnsDepth);
          if (columnsNode.type.name !== 'columns') return false;
          
          // Calculate new column width (divide evenly among all columns + 1)
          const totalColumns = columnsNode.childCount + 1;
          const newWidth = Math.round(100 / totalColumns);
          
          // Create the new column
          const newColumn = state.schema.nodes.column.create({
            width: `${newWidth}%`,
          }, [state.schema.nodes.paragraph.create()]);
          
          // Create the transaction
          if (dispatch) {
            // Insert the new column after current column
            tr.insert(columnPos, newColumn);
            
            // Update widths of all columns
            const basePos = $from.before(columnsDepth);
            columnsNode.forEach((child, offset, index) => {
              const colStart = basePos + offset;
              if (index === 0) {
                // First column gets the new width
                tr.setNodeMarkup(colStart, undefined, { width: `${newWidth}%` });
              } else {
                tr.setNodeMarkup(colStart, undefined, { ...child.attrs, width: `${newWidth}%` });
              }
            });
            
            // The new column was already created with newWidth, so we just need to update the last one
            // to make sure total is 100%
            const totalWidth = columnsNode.childCount * newWidth;
            const lastColWidth = 100 - (totalWidth - newWidth);
            
            dispatch(tr);
          }
          
          return true;
        },
      deleteColumn:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the column that contains the current position
          let columnDepth = -1;
          let columnStart = -1;
          
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'column') {
              columnDepth = depth;
              columnStart = $from.before(depth);
              break;
            }
          }
          
          if (columnStart === -1 || columnDepth === -1) {
            return false;
          }
          
          // Find the parent columns container
          const columnsDepth = columnDepth + 1;
          if (columnsDepth > $from.depth) return false;
          
          const columnsNode = $from.node(columnsDepth);
          if (columnsNode.type.name !== 'columns') return false;
          
          // Don't delete if only 2 columns remain (must keep at least 1 column)
          if (columnsNode.childCount <= 1) {
            return false;
          }
          
          // Find the index of the column to delete
          const columnIndex = $from.index(columnsDepth);
          
          // Calculate new widths for remaining columns
          const remainingColumns = columnsNode.childCount - 1;
          const newWidth = Math.round(100 / remainingColumns);
          const lastWidth = 100 - (newWidth * (remainingColumns - 1));
          
          // Create the transaction
          if (dispatch) {
            const columnNode = state.doc.nodeAt(columnStart);
            if (!columnNode) return false;
            
            // Delete the column
            tr.delete(columnStart, columnStart + columnNode.nodeSize);
            
            // Update widths of remaining columns
            let offset = 0;
            columnsNode.forEach((child, childOffset, index) => {
              if (index === columnIndex) return; // Skip deleted column
              
              // Calculate new position after deletion
              const newColPos = columnStart + offset;
              
              // Update width attribute
              let newWidthValue: string;
              if (index === remainingColumns) {
                // Last remaining column gets the remainder to ensure 100%
                newWidthValue = `${lastWidth}%`;
              } else {
                newWidthValue = `${newWidth}%`;
              }
              
              if (newColPos > 0) {
                const nodeAtPos = state.doc.nodeAt(newColPos);
                if (nodeAtPos && nodeAtPos.type.name === 'column') {
                  tr.setNodeMarkup(newColPos, undefined, { width: newWidthValue });
                }
              }
              
              // Only increment offset if this wasn't the deleted column
              offset += child.nodeSize;
            });
            
            dispatch(tr);
          }
          
          return true;
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
