import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Column resize plugin state
interface ColumnResizeState {
  active: boolean;
  columnPos: number | null;
  startX: number;
  startWidth: number;
  targetWidth: number;
}

// Column resize plugin key
export const columnResizeKey = new PluginKey<ColumnResizeState>('columnResize');

// Minimum column width in pixels
const MIN_COLUMN_WIDTH = 100;

/**
 * Column resize extension for drag-to-resize columns.
 * Adds drag handles between columns that allow resizing by dragging.
 */
export const ColumnResizeExtension = Extension.create({
  name: 'columnResize',

  addProseMirrorPlugins() {
    const extensionThis = this;
    
    return [
      new Plugin<ColumnResizeState>({
        key: columnResizeKey,
        
        state: {
          init(): ColumnResizeState {
            return {
              active: false,
              columnPos: null,
              startX: 0,
              startWidth: 0,
              targetWidth: 0,
            };
          },
          
          apply(tr, state): ColumnResizeState {
            const meta = tr.getMeta(columnResizeKey);
            if (meta) {
              return { ...state, ...meta };
            }
            return state;
          },
        },
        
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const doc = state.doc;
            
            // Find all column borders (positions between columns)
            doc.descendants((node, pos) => {
              if (node.type.name === 'columns') {
                // Iterate through direct column children
                let columnStart = pos + 1; // After the columns wrapper
                
                for (let i = 0; i < node.childCount - 1; i++) {
                  const column = node.child(i);
                  const columnEnd = columnStart + column.nodeSize;
                  
                  // Add decoration at the border (end of column i, start of column i+1)
                  decorations.push(
                    Decoration.widget(columnEnd, () => {
                      const handle = document.createElement('div');
                      handle.className = 'column-resize-handle';
                      handle.contentEditable = 'false';
                      handle.setAttribute('data-column-end', String(columnEnd));
                      
                      // Style the handle
                      handle.style.cssText = `
                        position: absolute;
                        width: 8px;
                        height: 100%;
                        cursor: col-resize;
                        background: transparent;
                        z-index: 5;
                        transform: translateX(-50%);
                        left: 50%;
                      `;
                      
                      // Show handle on hover
                      let isHovering = false;
                      
                      handle.addEventListener('mouseenter', () => {
                        isHovering = true;
                        handle.style.background = 'var(--vscode-focusBorder, #0e639c)';
                      });
                      
                      handle.addEventListener('mouseleave', () => {
                        isHovering = false;
                        handle.style.background = 'transparent';
                      });
                      
                      // Handle drag start
                      handle.addEventListener('mousedown', (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Capture pos and node in local variables to avoid closure bug
                        const currentPos = pos;
                        const currentNode = node;
                        
                        const leftColumn = currentNode.child(i);
                        const rightColumn = currentNode.child(i + 1);
                        
                        // Calculate starting widths
                        const leftWidth = parseFloat(leftColumn.attrs.width) || 50;
                        const rightWidth = parseFloat(rightColumn.attrs.width) || 50;
                        
                        // Store initial state
                        const state = columnResizeKey.getState(extensionThis.editor.state);
                        if (state) {
                          const tr = extensionThis.editor.state.tr;
                          tr.setMeta(columnResizeKey, {
                            active: true,
                            columnPos: columnEnd,
                            startX: e.clientX,
                            startWidth: leftWidth,
                            targetWidth: leftWidth,
                          });
                          extensionThis.editor.view.dispatch(tr);
                        }
                        
                        // Handle drag
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const currentState = columnResizeKey.getState(extensionThis.editor.state);
                          if (!currentState?.active) return;
                          
                          const deltaX = moveEvent.clientX - e.clientX;
                          const container = handle.closest('.columns') as HTMLElement;
                          
                          if (container) {
                            const containerWidth = container.offsetWidth;
                            // Convert pixel delta to percentage
                            const deltaPercent = (deltaX / containerWidth) * 100;
                            let newLeftWidth = currentState.startWidth + deltaPercent;
                            
                            // Calculate what the right column would be
                            let newRightWidth = 100 - newLeftWidth;
                            
                            // Enforce minimum width
                            const containerWidthPx = (containerWidth * newLeftWidth) / 100;
                            if (containerWidthPx < MIN_COLUMN_WIDTH) {
                              // Adjust to minimum
                              newLeftWidth = (MIN_COLUMN_WIDTH / containerWidth) * 100;
                              newRightWidth = 100 - newLeftWidth;
                            }
                            
                            // Also enforce minimum on right column
                            const rightWidthPx = (containerWidth * newRightWidth) / 100;
                            if (rightWidthPx < MIN_COLUMN_WIDTH) {
                              newRightWidth = (MIN_COLUMN_WIDTH / containerWidth) * 100;
                              newLeftWidth = 100 - newRightWidth;
                            }
                            
                            // Update decorations visually during drag
                            const handleEl = document.querySelector(`[data-column-end="${columnEnd}"]`);
                            if (handleEl) {
                              // We'll update the columns' visual state via CSS class
                              const columnsEl = handleEl.closest('.columns');
                              if (columnsEl) {
                                columnsEl.classList.add('is-resizing');
                                const leftCol = columnsEl.children[i] as HTMLElement;
                                const rightCol = columnsEl.children[i + 1] as HTMLElement;
                                if (leftCol && rightCol) {
                                  leftCol.style.width = `${newLeftWidth}%`;
                                  rightCol.style.width = `${newRightWidth}%`;
                                }
                              }
                            }
                          }
                        };
                        
                        // Handle drag end
                        const onMouseUp = (upEvent: MouseEvent) => {
                          const currentState = columnResizeKey.getState(extensionThis.editor.state);
                          if (!currentState?.active) return;
                          
                          const deltaX = upEvent.clientX - e.clientX;
                          const container = handle.closest('.columns') as HTMLElement;
                          
                          if (container) {
                            const containerWidth = container.offsetWidth;
                            const deltaPercent = (deltaX / containerWidth) * 100;
                            let newLeftWidth = currentState.startWidth + deltaPercent;
                            let newRightWidth = 100 - newLeftWidth;
                            
                            // Enforce minimum width (100px)
                            const containerWidthPx = (containerWidth * newLeftWidth) / 100;
                            if (containerWidthPx < MIN_COLUMN_WIDTH) {
                              newLeftWidth = (MIN_COLUMN_WIDTH / containerWidth) * 100;
                              newRightWidth = 100 - newLeftWidth;
                            }
                            
                            const rightWidthPx = (containerWidth * newRightWidth) / 100;
                            if (rightWidthPx < MIN_COLUMN_WIDTH) {
                              newRightWidth = (MIN_COLUMN_WIDTH / containerWidth) * 100;
                              newLeftWidth = 100 - newRightWidth;
                            }
                            
                            // Update the actual document
                            extensionThis.editor.chain().command(({ tr, state }) => {
                              // Find the column nodes in the document
                              let colIndex = 0;
                              let foundLeft = false;
                              let foundRight = false;
                              
                              state.doc.nodesBetween(currentPos, currentPos + currentNode.nodeSize, (n, p) => {
                                if (n.type.name === 'column' && !foundLeft && colIndex === i) {
                                  const newAttrs = { ...n.attrs, width: `${newLeftWidth.toFixed(1)}%` };
                                  tr.setNodeMarkup(p, undefined, newAttrs);
                                  foundLeft = true;
                                } else if (n.type.name === 'column' && foundLeft && !foundRight) {
                                  const newAttrs = { ...n.attrs, width: `${newRightWidth.toFixed(1)}%` };
                                  tr.setNodeMarkup(p, undefined, newAttrs);
                                  foundRight = true;
                                }
                                if (n.type.name === 'column') {
                                  colIndex++;
                                }
                              });
                              
                              return true;
                            }).run();
                            
                            // Remove resizing class
                            container.classList.remove('is-resizing');
                          }
                          
                          // Reset state
                          const tr = extensionThis.editor.state.tr;
                          tr.setMeta(columnResizeKey, {
                            active: false,
                            columnPos: null,
                            startX: 0,
                            startWidth: 0,
                            targetWidth: 0,
                          });
                          extensionThis.editor.view.dispatch(tr);
                          
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                        };
                        
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      });
                      
                      return handle;
                    }, {
                      side: -1, // Don't create a side, use widget
                    })
                  );
                  
                  columnStart = columnEnd;
                }
              }
            });
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
