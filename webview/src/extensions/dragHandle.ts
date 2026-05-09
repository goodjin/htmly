import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface DragHandleOptions {
  dragHandleWidth: number;
}

export interface DragDropState {
  dragging: boolean;
  draggedPos: number | null;
  dropPos: number | null;
}

export const dragHandlePluginKey = new PluginKey<DragDropState>('dragHandle');

export const DragHandleExtension = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      dragHandleWidth: 24,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    
    return [
      new Plugin<DragDropState>({
        key: dragHandlePluginKey,
        
        state: {
          init(): DragDropState {
            return {
              dragging: false,
              draggedPos: null,
              dropPos: null,
            };
          },
          
          apply(tr, state): DragDropState {
            const meta = tr.getMeta(dragHandlePluginKey);
            if (meta) {
              return { ...state, ...meta };
            }
            // Preserve state for transactions without dragHandlePluginKey meta
            // State is only explicitly reset via cancelDrag or endDrag
            return state;
          },
        },
        
        props: {
          handleDOMEvents: {
            // Add drag handle elements to block nodes
            view(view) {
              // We'll handle drag handles via CSS :hover and data attributes
              return true;
            },
          },
          
          decorations(state) {
            const { dragging, dropPos } = dragHandlePluginKey.getState(state);
            
            if (!dragging || dropPos === null) {
              return DecorationSet.empty;
            }
            
            // Create a drop indicator decoration
            const decos: Decoration[] = [];
            
            // Find the position to show the drop indicator
            const $pos = state.doc.resolve(dropPos);
            const index = $pos.index();
            
            if ($pos.parent.type.spec.group?.includes('block')) {
              // Show indicator after this block
              decos.push(
                Decoration.widget(dropPos, () => {
                  const indicator = document.createElement('div');
                  indicator.className = 'drag-drop-indicator';
                  indicator.style.cssText = `
                    height: 2px;
                    background: var(--vscode-focusBorder, #0e639c);
                    margin: 4px 0;
                    border-radius: 1px;
                    pointer-events: none;
                  `;
                  return indicator;
                }, { key: 'drag-drop-indicator' })
              );
            }
            
            return DecorationSet.create(state.doc, decos);
          },
        },
        
        appendTransaction(transactions, _oldState, newState) {
          // Handle drop logic
          for (const tr of transactions) {
            const meta = tr.getMeta(dragHandlePluginKey);
            if (meta?.dropped) {
              const { from, to } = meta;
              const { pos: dropPos } = meta;
              
              // Ensure we have valid positions
              if (from === null || to === null || dropPos === null) {
                return null;
              }
              
              // Get the node to move
              const node = newState.doc.nodeAt(from);
              if (!node) return null;
              
              // Skip if dropping in the same position
              if (Math.abs(dropPos - from) < 2) return null;
              
              // Create a transaction to move the node
              const targetTr = newState.tr;
              
              // Delete the node from its original position
              targetTr.delete(from, to);
              
              // Calculate adjusted drop position (accounting for the deletion)
              let adjustedDropPos = dropPos;
              if (dropPos > from) {
                adjustedDropPos -= (to - from);
              }
              
              // Make sure adjustedDropPos is valid
              if (adjustedDropPos < 0) adjustedDropPos = 0;
              if (adjustedDropPos > targetTr.doc.content.size) {
                adjustedDropPos = targetTr.doc.content.size;
              }
              
              // Insert at the new position
              targetTr.insert(adjustedDropPos, node);
              
              // Add metadata to indicate this is a drag-drop operation for undo
              targetTr.setMeta('dragDropNode', true);
              targetTr.setMeta('originalFrom', from);
              targetTr.setMeta('originalTo', to);
              
              return targetTr;
            }
          }
          return null;
        },
      }),
    ];
  },
});

// Helper function to get the nearest block node position for a DOM mouse event
export function getBlockPosAtMouseEvent(
  view: any,
  event: MouseEvent
): { pos: number; node: any } | null {
  const { clientX, clientY } = event;
  const pos = view.posAtCoords({ left: clientX, top: clientY });
  
  if (!pos) return null;
  
  const $pos = view.state.doc.resolve(pos.pos);
  
  // Find the nearest block node
  let depth = $pos.depth;
  while (depth > 0) {
    const node = $pos.node(depth);
    if (node.isBlock && depth > 0) {
      // Get the position right before this block
      const blockStart = $pos.before(depth);
      return { pos: blockStart, node };
    }
    depth--;
  }
  
  return null;
}

// Drag state management
let dragState: {
  active: boolean;
  startPos: number | null;
  endPos: number | null;
  currentDropPos: number | null;
} = {
  active: false,
  startPos: null,
  endPos: null,
  currentDropPos: null,
};

export function startDrag(view: any, pos: number, node: any): void {
  dragState = {
    active: true,
    startPos: pos,
    endPos: pos + node.nodeSize,
    currentDropPos: null,
  };
  
  // Set up drag state in plugin
  const tr = view.state.tr;
  tr.setMeta(dragHandlePluginKey, {
    dragging: true,
    draggedPos: pos,
  });
  tr.setMeta('dragHandle', true);
  view.dispatch(tr);
}

export function updateDropPosition(view: any, dropPos: number): void {
  if (!dragState.active) return;
  
  dragState.currentDropPos = dropPos;
  
  const tr = view.state.tr;
  tr.setMeta(dragHandlePluginKey, {
    dragging: true,
    draggedPos: dragState.startPos,
    dropPos: dropPos,
  });
  tr.setMeta('dragHandle', true);
  view.dispatch(tr);
}

export function endDrag(view: any): { from: number; to: number; pos: number } | null {
  if (!dragState.active || dragState.startPos === null || dragState.endPos === null) {
    resetDrag();
    return null;
  }
  
  const result = {
    from: dragState.startPos,
    to: dragState.endPos,
    pos: dragState.currentDropPos ?? dragState.startPos,
  };
  
  // Dispatch final transaction with drop info
  const tr = view.state.tr;
  tr.setMeta(dragHandlePluginKey, {
    dragging: false,
    draggedPos: null,
    dropPos: null,
    dropped: true,
    from: dragState.startPos,
    to: dragState.endPos,
    pos: dragState.currentDropPos ?? dragState.startPos,
  });
  view.dispatch(tr);
  
  resetDrag();
  return result;
}

export function cancelDrag(view: any): void {
  if (dragState.active) {
    const tr = view.state.tr;
    tr.setMeta(dragHandlePluginKey, {
      dragging: false,
      draggedPos: null,
      dropPos: null,
    });
    view.dispatch(tr);
    resetDrag();
  }
}

function resetDrag(): void {
  dragState = {
    active: false,
    startPos: null,
    endPos: null,
    currentDropPos: null,
  };
}

export function isDragging(): boolean {
  return dragState.active;
}

export function getDragState(): typeof dragState {
  return { ...dragState };
}
