import { Node, mergeAttributes } from '@tiptap/core';

/**
 * CoverImage Node extension for Tiptap
 * 
 * Provides a full-width cover image pinned to the top of the document:
 * - Single cover image per document (replaces existing)
 * - Full document width display
 * - Optional alt text for accessibility
 * - Optional caption text
 * - Optional link wrapping
 * - Responsive to viewport changes
 * 
 * Serializes to: 
 * - <div class="cover-image"><img src="..." alt="..."></div>
 * - <div class="cover-image"><a href="..."><img src="..." alt="..."></a></div>
 * - <div class="cover-image"><img src="..." alt="..."><p class="cover-caption">Caption</p></div>
 */
export const CoverImage = Node.create({
  name: 'coverImage',
  
  group: 'block',
  
  atom: true, // Non-editable as a whole, only the image is editable
  
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img?.getAttribute('src') || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          return { 'data-src': attributes.src };
        },
      },
      alt: {
        default: '',
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img?.getAttribute('alt') || '';
        },
        renderHTML: (attributes) => {
          return { alt: attributes.alt };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => {
          const link = element.querySelector('a');
          return link?.getAttribute('href') || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return { 'data-href': attributes.href };
        },
      },
      caption: {
        default: '',
        parseHTML: (element) => {
          const caption = element.querySelector('.cover-caption');
          return caption?.textContent || '';
        },
        renderHTML: (attributes) => {
          return { 'data-caption': attributes.caption };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.cover-image' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, href, caption } = node.attrs;
    
    if (!src) {
      // Empty cover image placeholder
      return ['div', mergeAttributes({ class: 'cover-image cover-image--empty' }, HTMLAttributes), 
        ['p', {}, 'Click to add cover image']
      ];
    }
    
    // Build the image element
    const imgElement: any[] = ['img', { 
      src, 
      alt: alt || '',
      loading: 'lazy',
    }];
    
    // If there's a caption, add it
    if (caption) {
      return ['div', mergeAttributes({ class: 'cover-image' }, HTMLAttributes),
        href 
          ? ['a', { href, target: '_blank', rel: 'noopener noreferrer' }, imgElement]
          : imgElement,
        ['p', { class: 'cover-caption' }, caption]
      ];
    }
    
    // Without caption
    return ['div', mergeAttributes({ class: 'cover-image' }, HTMLAttributes),
      href 
        ? ['a', { href, target: '_blank', rel: 'noopener noreferrer' }, imgElement]
        : imgElement
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'cover-image-wrapper';
      
      // Create the cover image container
      const container = document.createElement('div');
      container.className = 'cover-image';
      
      const { src, alt, href, caption } = node.attrs;
      
      if (!src) {
        // Empty state - show placeholder
        container.classList.add('cover-image--empty');
        const placeholder = document.createElement('p');
        placeholder.className = 'cover-image-placeholder';
        placeholder.textContent = 'Click to add cover image';
        container.appendChild(placeholder);
        
        // Make placeholder clickable to open dialog
        placeholder.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof getPos === 'function') {
            openCoverImageDialog(editor, getPos() as number);
          }
        });
        placeholder.style.cursor = 'pointer';
        
        wrapper.appendChild(container);
        return {
          dom: wrapper,
          contentDOM: container,
          update: (updatedNode) => {
            if (updatedNode.type.name !== 'coverImage') return false;
            return true;
          },
        };
      }
      
      // Create the image element
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.className = 'cover-image-img';
      
      if (href) {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.appendChild(img);
        container.appendChild(link);
      } else {
        container.appendChild(img);
      }
      
      // Add caption if present
      if (caption) {
        const captionEl = document.createElement('p');
        captionEl.className = 'cover-caption';
        captionEl.textContent = caption;
        captionEl.contentEditable = 'true';
        captionEl.addEventListener('blur', () => {
          if (typeof getPos === 'function') {
            const pos = getPos() as number;
            const tr = editor.state.tr;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, caption: captionEl.textContent });
            editor.view.dispatch(tr);
          }
        });
        container.appendChild(captionEl);
      }
      
      wrapper.appendChild(container);
      
      return {
        dom: wrapper,
        contentDOM: container,
        
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'coverImage') return false;
          
          const { src: newSrc, alt: newAlt, href: newHref, caption: newCaption } = updatedNode.attrs;
          
          // Update image source
          if (newSrc) {
            img.src = newSrc;
            img.alt = newAlt || '';
            container.classList.remove('cover-image--empty');
          } else {
            img.src = '';
            container.classList.add('cover-image--empty');
          }
          
          // Update link if needed
          const existingLink = container.querySelector('a');
          if (newHref) {
            if (existingLink) {
              existingLink.href = newHref;
            } else {
              const link = document.createElement('a');
              link.href = newHref;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              img.parentNode?.insertBefore(link, img);
              link.appendChild(img);
            }
          } else if (existingLink) {
            const parent = existingLink.parentNode;
            if (parent) {
              parent.insertBefore(img, existingLink);
              existingLink.remove();
            }
          }
          
          // Update caption
          let captionEl = container.querySelector('.cover-caption') as HTMLElement;
          if (newCaption) {
            if (captionEl) {
              captionEl.textContent = newCaption;
            } else {
              captionEl = document.createElement('p');
              captionEl.className = 'cover-caption';
              captionEl.textContent = newCaption;
              captionEl.contentEditable = 'true';
              captionEl.addEventListener('blur', () => {
                if (typeof getPos === 'function') {
                  const pos = getPos() as number;
                  const tr = editor.state.tr;
                  tr.setNodeMarkup(pos, undefined, { ...updatedNode.attrs, caption: captionEl.textContent });
                  editor.view.dispatch(tr);
                }
              });
              container.appendChild(captionEl);
            }
          } else if (captionEl) {
            captionEl.remove();
          }
          
          return true;
        },
        
        selectNode: () => {
          img.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        
        deselectNode: () => {
          img.style.outline = '';
        },
      };
    };
  },

  addCommands() {
    return {
      insertCoverImage:
        (attrs = {}) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          // Find and remove any existing cover image
          let existingCoverPos = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'coverImage') {
              existingCoverPos = pos;
              return false; // Stop traversing
            }
          });
          
          // Create the cover image node
          const coverImageNode = state.schema.nodes.coverImage.create({
            src: attrs.src || null,
            alt: attrs.alt || '',
            href: attrs.href || null,
            caption: attrs.caption || '',
          });
          
          if (dispatch) {
            const transaction = tr;
            
            // Remove existing cover if present
            if (existingCoverPos >= 0) {
              const existingNode = state.doc.nodeAt(existingCoverPos);
              if (existingNode) {
                transaction.delete(existingCoverPos, existingCoverPos + existingNode.nodeSize);
              }
            }
            
            // Insert at document beginning (position 0)
            transaction.insert(0, coverImageNode);
            
            dispatch(transaction);
          }
          
          return true;
        },
      updateCoverImage:
        (attrs: { src?: string; alt?: string; href?: string | null; caption?: string }) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          // Find the cover image (should be at position 0 or near it)
          let coverPos = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'coverImage') {
              coverPos = pos;
              return false;
            }
          });
          
          if (coverPos < 0) return false;
          
          const currentNode = state.doc.nodeAt(coverPos);
          if (!currentNode) return false;
          
          const newAttrs = {
            ...currentNode.attrs,
            ...attrs,
          };
          
          if (dispatch) {
            tr.setNodeMarkup(coverPos, undefined, newAttrs);
            dispatch(tr);
          }
          
          return true;
        },
      removeCoverImage:
        () =>
        ({ tr, state, dispatch }) => {
          // Find the cover image
          let coverPos = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'coverImage') {
              coverPos = pos;
              return false;
            }
          });
          
          if (coverPos < 0) return false;
          
          const coverNode = state.doc.nodeAt(coverPos);
          if (!coverNode) return false;
          
          if (dispatch) {
            tr.delete(coverPos, coverPos + coverNode.nodeSize);
            dispatch(tr);
          }
          
          return true;
        },
      setCoverImageCaption:
        (caption: string) =>
        ({ commands }) => {
          return commands.updateCoverImage({ caption });
        },
      setCoverImageLink:
        (href: string | null) =>
        ({ commands }) => {
          return commands.updateCoverImage({ href });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        // Insert cover image at document top
        return this.editor.commands.insertCoverImage({});
      },
      'Mod-Shift-C': () => {
        return this.editor.commands.insertCoverImage({});
      },
    };
  },
});

// Dialog opener function - will be set by TiptapEditor
let openCoverDialogFn: ((editor: any) => void) | null = null;

export function setCoverImageDialogOpener(fn: (editor: any) => void) {
  openCoverDialogFn = fn;
}

function openCoverImageDialog(editor: any, pos: number) {
  openCoverDialogFn?.(editor);
}

export function hasCoverImage(state: any): boolean {
  let hasCover = false;
  state.doc.descendants((node: any) => {
    if (node.type.name === 'coverImage') {
      hasCover = true;
      return false;
    }
  });
  return hasCover;
}

export function getCoverImagePos(state: any): number {
  let pos = -1;
  state.doc.descendants((node: any, p: number) => {
    if (node.type.name === 'coverImage') {
      pos = p;
      return false;
    }
  });
  return pos;
}
