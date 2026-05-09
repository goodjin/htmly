import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';

export interface ImageResizeOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
}

export const imageResizeKey = new PluginKey('imageResize');

export interface ResizeState {
  active: boolean;
  pos: number | null;
  handle: 'nw' | 'ne' | 'sw' | 'se' | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  originalWidth: number;
  originalHeight: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageResize: {
      setImageSize: (pos: number, width: number, height: number) => ReturnType;
    };
  }
}

export const ImageResizeExtension = Extension.create<ImageResizeOptions>({
  name: 'imageResize',

  addOptions() {
    return {
      minWidth: 20,
      minHeight: 20,
      maxWidth: 2000,
    };
  },

  addCommands() {
    return {
      setImageSize: (pos: number, width: number, height: number) => ({ tr, dispatch }) => {
        const node = tr.doc.nodeAt(pos);
        if (!node || node.type.name !== 'image') return false;
        
        if (dispatch) {
          const newAttrs = { ...node.attrs, width, height };
          tr.setNodeMarkup(pos, undefined, newAttrs);
        }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: imageResizeKey,
        state: {
          init(): ResizeState {
            return {
              active: false,
              pos: null,
              handle: null,
              startX: 0,
              startY: 0,
              startWidth: 0,
              startHeight: 0,
              originalWidth: 0,
              originalHeight: 0,
            };
          },
          apply(tr, value): ResizeState {
            const meta = tr.getMeta(imageResizeKey);
            if (meta) {
              return meta;
            }
            if (tr.docChanged) {
              return {
                active: false,
                pos: null,
                handle: null,
                startX: 0,
                startY: 0,
                startWidth: 0,
                startHeight: 0,
                originalWidth: 0,
                originalHeight: 0,
              };
            }
            return value;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = imageResizeKey.getState(view.state) as ResizeState;
            if (!state.active) return false;

            // Escape cancels resize
            if (event.key === 'Escape') {
              const { tr } = view.state;
              // Restore original dimensions
              if (state.pos !== null) {
                const node = tr.doc.nodeAt(state.pos);
                if (node && node.type.name === 'image') {
                  const newAttrs = { ...node.attrs, width: state.originalWidth, height: state.originalHeight };
                  tr.setNodeMarkup(state.pos, undefined, newAttrs);
                }
              }
              view.dispatch(tr.setMeta(imageResizeKey, {
                active: false,
                pos: null,
                handle: null,
                startX: 0,
                startY: 0,
                startWidth: 0,
                startHeight: 0,
                originalWidth: 0,
                originalHeight: 0,
              }));
              return true;
            }

            return false;
          },
          decorations(state) {
            // Only show handles when a single image is selected
            const { selection } = state;
            if (!(selection instanceof NodeSelection) || selection.empty) {
              return DecorationSet.empty;
            }

            const { from } = selection;
            const node = state.doc.nodeAt(from);

            if (!node || node.type.name !== 'image') {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            // Create resize handles
            const handles = ['nw', 'ne', 'sw', 'se'];
            handles.forEach((handle) => {
              decorations.push(
                Decoration.widget(from, () => {
                  const handleEl = document.createElement('div');
                  handleEl.className = `image-resize-handle image-resize-handle-${handle}`;
                  handleEl.contentEditable = 'false';
                  handleEl.dataset.handle = handle;

                  // Position based on which corner
                  let cursor = 'nw-resize';
                  if (handle === 'ne') cursor = 'ne-resize';
                  else if (handle === 'sw') cursor = 'sw-resize';
                  else if (handle === 'se') cursor = 'se-resize';

                  handleEl.style.cssText = `
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: #0e639c;
                    border: 2px solid white;
                    border-radius: 2px;
                    cursor: ${cursor};
                    z-index: 10;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  `;

                  // Position handles at corners
                  if (handle === 'nw') {
                    handleEl.style.top = '-6px';
                    handleEl.style.left = '-6px';
                  } else if (handle === 'ne') {
                    handleEl.style.top = '-6px';
                    handleEl.style.right = '-6px';
                  } else if (handle === 'sw') {
                    handleEl.style.bottom = '-6px';
                    handleEl.style.left = '-6px';
                  } else if (handle === 'se') {
                    handleEl.style.bottom = '-6px';
                    handleEl.style.right = '-6px';
                  }

                  handleEl.addEventListener('mousedown', (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const img = document.querySelector('.ProseMirror img.ProseMirror-selectednode') as HTMLImageElement;
                    if (!img) return;

                    const rect = img.getBoundingClientRect();
                    const width = parseInt(img.getAttribute('width') || String(rect.width), 10);
                    const height = parseInt(img.getAttribute('height') || String(rect.height), 10);

                    const { tr } = view.state;
                    tr.setMeta(imageResizeKey, {
                      active: true,
                      pos: from,
                      handle: handle as 'nw' | 'ne' | 'sw' | 'se',
                      startX: e.clientX,
                      startY: e.clientY,
                      startWidth: width,
                      startHeight: height,
                      originalWidth: width,
                      originalHeight: height,
                    });
                    view.dispatch(tr);
                  });

                  return handleEl;
                }, { side: handle === 'nw' || handle === 'sw' ? -1 : 1 })
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

// Helper to check if resize is active
export function isResizeActive(): boolean {
  return false; // Will be managed via plugin state
}

// Export resize state getter for external use
export function getImageResizeState(state: any): ResizeState | null {
  return imageResizeKey.getState(state);
}
