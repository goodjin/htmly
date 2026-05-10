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
            
            // Update widths of all columns - collect positions BEFORE calculating
            // because after insertion, positions shift
            const basePos = $from.before(columnsDepth);
            const oldChildCount = columnsNode.childCount;
            
            // Collect all column positions from the old state
            const columnPositions: number[] = [];
            let cumOffset = 0;
            for (let i = 0; i < oldChildCount; i++) {
              columnPositions.push(basePos + cumOffset);
              cumOffset += columnsNode.child(i)!.nodeSize;
            }
            
            // Add position for the new column (at columnPos)
            const newColumnPos = columnPos;
            
            // Update widths for all columns (including new one)
            // Redistribute so they sum to 100%
            const allWidths: string[] = [];
            for (let i = 0; i < oldChildCount - 1; i++) {
              allWidths.push(`${newWidth}%`);
            }
            // Last column gets the remainder to ensure total is 100%
            const lastColWidth = 100 - (newWidth * (oldChildCount - 1));
            allWidths.push(`${lastColWidth}%`);
            
            // Apply widths to existing columns (they shifted after insertion)
            for (let i = 0; i < oldChildCount; i++) {
              const originalPos = columnPositions[i];
              // After inserting newColumn at columnPos, columns at or after that position shift
              if (originalPos >= columnPos) {
                // This column is at or after the insertion point, shift it
                const newActualPos = originalPos + newColumn.nodeSize;
                tr.setNodeMarkup(newActualPos, undefined, { width: allWidths[i] });
              } else {
                tr.setNodeMarkup(originalPos, undefined, { width: allWidths[i] });
              }
            }
            
            // Set width for the new column
            tr.setNodeMarkup(newColumnPos, undefined, { width: `${newWidth}%` });
            
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
            
            // Collect column positions BEFORE deletion
            // Bug 4 fix: collect positions before tr.delete() modifies document
            const basePos = columnStart - columnsNode.offset(columnIndex);
            const columnPositions: number[] = [];
            let cumOffset = 0;
            for (let i = 0; i < columnsNode.childCount; i++) {
              columnPositions.push(basePos + cumOffset);
              cumOffset += columnsNode.child(i)!.nodeSize;
            }
            const deletedNodeSize = columnNode.nodeSize;
            
            // Delete the column
            tr.delete(columnStart, columnStart + deletedNodeSize);
            
            // Update widths of remaining columns using collected positions
            // Bug 3 fix: properly identify the last remaining column
            const lastRemainingIndex = remainingColumns - 1;
            for (let i = 0; i < columnsNode.childCount; i++) {
              if (i === columnIndex) continue; // Skip deleted column
              
              // Get the original position
              let newColPos = columnPositions[i];
              
              // Columns after the deleted one shift by deletedNodeSize
              if (i > columnIndex) {
                newColPos -= deletedNodeSize;
              }
              
              // Determine the correct width
              let newWidthValue: string;
              if (i > lastRemainingIndex) {
                // This is the last remaining column (original index was after lastRemainingIndex)
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
            }
            
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
