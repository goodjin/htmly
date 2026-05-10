import { Node, mergeAttributes } from '@tiptap/core';

/**
 * LinkPreview Node extension for Tiptap
 * 
 * Provides a link preview card that fetches and displays:
 * - Title from page metadata
 * - Description from page metadata
 * - Image from og:image
 * - Fallback styling for unfetchable URLs
 * 
 * Serializes to: 
 * <div class="link-preview" data-url="...">
 *   <a href="...">
 *     <div class="link-preview-image"><img src="..."></div>
 *     <div class="link-preview-content">
 *       <h4>Title</h4>
 *       <p>Description</p>
 *       <span class="link-preview-url">domain.com</span>
 *     </div>
 *   </a>
 * </div>
 * 
 * Or fallback for unfetchable URLs:
 * <div class="link-preview link-preview--fallback">
 *   <a href="...">URL text</a>
 * </div>
 */

export interface LinkPreviewAttrs {
  url: string;
  title: string;
  description: string;
  image: string;
  hostname: string;
  fetched: boolean;
}

export const LinkPreview = Node.create({
  name: 'linkPreview',
  
  group: 'block',
  
  atom: true, // Non-editable as a whole
  
  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => {
          const link = element.querySelector('a');
          const url = link?.getAttribute('href') || element.getAttribute('data-url') || null;
          // Validate URL to prevent XSS attacks
          if (url && !isSafeUrl(url)) return null;
          return url;
        },
        renderHTML: (attributes) => {
          if (!attributes.url) return {};
          return { 'data-url': attributes.url };
        },
      },
      title: {
        default: '',
        parseHTML: (element) => {
          const titleEl = element.querySelector('.link-preview-title');
          return titleEl?.textContent || '';
        },
        renderHTML: (attributes) => {
          if (!attributes.title) return {};
          return { 'data-title': attributes.title };
        },
      },
      description: {
        default: '',
        parseHTML: (element) => {
          const descEl = element.querySelector('.link-preview-description');
          return descEl?.textContent || '';
        },
        renderHTML: (attributes) => {
          if (!attributes.description) return {};
          return { 'data-description': attributes.description };
        },
      },
      image: {
        default: '',
        parseHTML: (element) => {
          const img = element.querySelector('.link-preview-image img');
          const src = img?.getAttribute('src') || '';
          // Validate image URL to prevent XSS attacks
          if (src && !isSafeUrl(src)) return '';
          return src;
        },
        renderHTML: (attributes) => {
          if (!attributes.image) return {};
          return { 'data-image': attributes.image };
        },
      },
      hostname: {
        default: '',
        parseHTML: (element) => {
          const link = element.querySelector('a');
          if (link) {
            try {
              return new URL(link.getAttribute('href') || '').hostname;
            } catch {
              return '';
            }
          }
          return element.getAttribute('data-hostname') || '';
        },
        renderHTML: (attributes) => {
          if (!attributes.hostname) return {};
          return { 'data-hostname': attributes.hostname };
        },
      },
      fetched: {
        default: false,
        parseHTML: (element) => {
          return !element.classList.contains('link-preview--fallback');
        },
        renderHTML: (attributes) => {
          return { 'data-fetched': attributes.fetched ? 'true' : 'false' };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.link-preview' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { url, title, description, image, hostname, fetched } = node.attrs;
    
    if (!url) {
      return ['div', mergeAttributes({ class: 'link-preview link-preview--empty' }, HTMLAttributes)];
    }
    
    if (!fetched) {
      // Fallback mode - just show a styled link
      return [
        'div',
        mergeAttributes({ class: 'link-preview link-preview--fallback' }, HTMLAttributes),
        ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url]
      ];
    }
    
    // Full preview card
    const contentChildren: any[] = [];
    
    if (image) {
      contentChildren.push(
        ['div', { class: 'link-preview-image' },
          ['img', { src: image, alt: title || 'Preview image', loading: 'lazy' }]
        ]
      );
    }
    
    const textContent: any[] = [];
    if (title) {
      textContent.push(['h4', { class: 'link-preview-title' }, title]);
    }
    if (description) {
      textContent.push(['p', { class: 'link-preview-description' }, description]);
    }
    if (hostname) {
      textContent.push(['span', { class: 'link-preview-hostname' }, hostname]);
    }
    
    contentChildren.push(
      ['div', { class: 'link-preview-content' }, ...textContent]
    );
    
    return [
      'div',
      mergeAttributes({ class: 'link-preview' }, HTMLAttributes),
      ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, ...contentChildren]
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'link-preview-wrapper';
      
      const container = document.createElement('div');
      container.className = 'link-preview';
      
      const { url, title, description, image, hostname, fetched } = node.attrs;
      
      if (!url || !isSafeUrl(url)) {
        container.classList.add('link-preview--empty');
        container.textContent = 'Link preview placeholder';
        wrapper.appendChild(container);
        return { dom: wrapper, contentDOM: null };
      }
      
      if (!fetched) {
        // Fallback mode
        container.classList.add('link-preview--fallback');
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = url;
        container.appendChild(link);
        wrapper.appendChild(container);
        
        // Add click handler for opening in new tab
        container.addEventListener('click', (e) => {
          if (e.target === link) {
            e.preventDefault();
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
        
        return {
          dom: wrapper,
          contentDOM: null,
          update: (updatedNode) => {
            if (updatedNode.type.name !== 'linkPreview') return false;
            const newFetched = updatedNode.attrs.fetched;
            if (newFetched !== fetched) {
              // Re-render when metadata is fetched
              return true;
            }
            // Update URL if changed
            link.href = updatedNode.attrs.url;
            link.textContent = updatedNode.attrs.url;
            return true;
          },
        };
      }
      
      // Full preview card
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Image
      if (image && isSafeUrl(image)) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'link-preview-image';
        const img = document.createElement('img');
        img.src = image;
        img.alt = title || 'Preview image';
        img.loading = 'lazy';
        imageContainer.appendChild(img);
        link.appendChild(imageContainer);
      }
      
      // Content
      const contentContainer = document.createElement('div');
      contentContainer.className = 'link-preview-content';
      
      if (title) {
        const titleEl = document.createElement('h4');
        titleEl.className = 'link-preview-title';
        titleEl.textContent = title;
        contentContainer.appendChild(titleEl);
      }
      
      if (description) {
        const descEl = document.createElement('p');
        descEl.className = 'link-preview-description';
        descEl.textContent = description;
        contentContainer.appendChild(descEl);
      }
      
      if (hostname) {
        const hostnameEl = document.createElement('span');
        hostnameEl.className = 'link-preview-hostname';
        hostnameEl.textContent = hostname;
        contentContainer.appendChild(hostnameEl);
      }
      
      link.appendChild(contentContainer);
      container.appendChild(link);
      wrapper.appendChild(container);
      
      // Add click handler for opening in new tab
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
      });
      
      // Double-click to edit URL
      container.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (typeof getPos === 'function') {
          openLinkPreviewDialog?.(editor, getPos() as number);
        }
      });
      
      return {
        dom: wrapper,
        contentDOM: null,
        
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'linkPreview') return false;
          
          const { url: newUrl, title: newTitle, description: newDesc, image: newImage, hostname: newHostname, fetched: newFetched } = updatedNode.attrs;
          
          // Check if we need to re-render
          if (newFetched !== fetched) {
            return true; // Will trigger re-render
          }
          
          // Update link
          link.href = newUrl;
          
          // Update image
          const imgEl = container.querySelector('.link-preview-image img');
          if (newImage && isSafeUrl(newImage) && imgEl) {
            (imgEl as HTMLImageElement).src = newImage;
            (imgEl as HTMLImageElement).alt = newTitle || 'Preview image';
          } else if (newImage && isSafeUrl(newImage) && !imgEl) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'link-preview-image';
            const img = document.createElement('img');
            img.src = newImage;
            img.alt = newTitle || 'Preview image';
            img.loading = 'lazy';
            imageContainer.appendChild(img);
            link.insertBefore(imageContainer, contentContainer);
          } else if (!newImage && imgEl) {
            imgEl.parentElement?.remove();
          }
          
          // Update title
          const titleEl = container.querySelector('.link-preview-title');
          if (newTitle) {
            if (titleEl) {
              titleEl.textContent = newTitle;
            } else {
              const h4 = document.createElement('h4');
              h4.className = 'link-preview-title';
              h4.textContent = newTitle;
              contentContainer.insertBefore(h4, contentContainer.firstChild);
            }
          } else if (titleEl) {
            titleEl.remove();
          }
          
          // Update description
          const descEl = container.querySelector('.link-preview-description');
          if (newDesc) {
            if (descEl) {
              descEl.textContent = newDesc;
            } else {
              const p = document.createElement('p');
              p.className = 'link-preview-description';
              p.textContent = newDesc;
              contentContainer.appendChild(p);
            }
          } else if (descEl) {
            descEl.remove();
          }
          
          // Update hostname
          const hostnameEl = container.querySelector('.link-preview-hostname');
          if (newHostname) {
            if (hostnameEl) {
              hostnameEl.textContent = newHostname;
            } else {
              const span = document.createElement('span');
              span.className = 'link-preview-hostname';
              span.textContent = newHostname;
              contentContainer.appendChild(span);
            }
          } else if (hostnameEl) {
            hostnameEl.remove();
          }
          
          return true;
        },
        
        selectNode: () => {
          container.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        
        deselectNode: () => {
          container.style.outline = '';
        },
      };
    };
  },

  addCommands() {
    return {
      insertLinkPreview:
        (attrs: Partial<LinkPreviewAttrs> = {}) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          const linkPreviewNode = state.schema.nodes.linkPreview.create({
            url: attrs.url || null,
            title: attrs.title || '',
            description: attrs.description || '',
            image: attrs.image || '',
            hostname: attrs.hostname || extractHostname(attrs.url || ''),
            fetched: !!(attrs.title || attrs.description || attrs.image),
          });
          
          if (dispatch) {
            const transaction = tr;
            transaction.insert(selection.from, linkPreviewNode);
            dispatch(transaction);
          }
          
          return true;
        },
      updateLinkPreview:
        (attrs: Partial<LinkPreviewAttrs>) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          // Find the link preview at current position
          let linkPreviewPos = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'linkPreview') {
              // Check if this position is in or after the link preview
              const end = pos + node.nodeSize;
              if (selection.from >= pos && selection.from <= end) {
                linkPreviewPos = pos;
                return false;
              }
              // If we're inside this node, use it
              if (selection.from === pos + 1) {
                linkPreviewPos = pos;
                return false;
              }
            }
          });
          
          if (linkPreviewPos < 0) {
            // Try to find the link preview at cursor
            const $pos = state.doc.resolve(selection.from);
            for (let depth = $pos.depth; depth >= 0; depth--) {
              const node = $pos.node(depth);
              if (node.type.name === 'linkPreview') {
                linkPreviewPos = $pos.before(depth);
                break;
              }
            }
          }
          
          if (linkPreviewPos < 0) return false;
          
          const currentNode = state.doc.nodeAt(linkPreviewPos);
          if (!currentNode) return false;
          
          const newAttrs = {
            ...currentNode.attrs,
            ...attrs,
            hostname: attrs.hostname || attrs.url ? extractHostname(attrs.url || currentNode.attrs.url) : currentNode.attrs.hostname,
          };
          
          if (dispatch) {
            tr.setNodeMarkup(linkPreviewPos, undefined, newAttrs);
            dispatch(tr);
          }
          
          return true;
        },
      removeLinkPreview:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          
          // Find the link preview at current position
          let linkPreviewPos = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'linkPreview') {
              const end = pos + node.nodeSize;
              if (selection.from >= pos && selection.from <= end) {
                linkPreviewPos = pos;
                return false;
              }
            }
          });
          
          if (linkPreviewPos < 0) {
            // Try to find the link preview at cursor
            const $pos = state.doc.resolve(selection.from);
            for (let depth = $pos.depth; depth >= 0; depth--) {
              const node = $pos.node(depth);
              if (node.type.name === 'linkPreview') {
                linkPreviewPos = $pos.before(depth);
                break;
              }
            }
          }
          
          if (linkPreviewPos < 0) return false;
          
          const linkPreviewNode = state.doc.nodeAt(linkPreviewPos);
          if (!linkPreviewNode) return false;
          
          if (dispatch) {
            tr.delete(linkPreviewPos, linkPreviewPos + linkPreviewNode.nodeSize);
            dispatch(tr);
          }
          
          return true;
        },
    };
  },
});

// Helper function to extract hostname from URL
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Helper function to validate URLs against XSS attacks (javascript: scheme)
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // If URL parsing fails, check for javascript: scheme directly
    return !url.trim().toLowerCase().startsWith('javascript:');
  }
}

// Dialog opener function - will be set by TiptapEditor
let openLinkPreviewDialogFn: ((editor: any, pos?: number) => void) | null = null;

export function setLinkPreviewDialogOpener(fn: (editor: any, pos?: number) => void) {
  openLinkPreviewDialogFn = fn;
}

// Export the opener for use in TiptapEditor
export function openLinkPreviewDialog(editor: any, pos?: number) {
  openLinkPreviewDialogFn?.(editor, pos);
}

// Check if a string looks like a URL
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fetch link preview metadata from URL
// Note: In a VS Code webview, we cannot directly fetch cross-origin URLs
// We'll use a fallback approach where the metadata is extracted client-side
// or we show a placeholder that the user can click to edit
export async function fetchLinkPreview(url: string): Promise<LinkPreviewAttrs> {
  // Since we can't fetch from cross-origin URLs in a webview,
  // we'll return a basic preview with just the URL info
  // The actual metadata fetching would need to be done via VS Code's native messaging
  // or a proxy server
  
  const hostname = extractHostname(url);
  
  return {
    url,
    title: '', // Would be populated by actual fetch
    description: '', // Would be populated by actual fetch
    image: '', // Would be populated by actual fetch
    hostname,
    fetched: false, // Mark as unfetched since we can't actually fetch
  };
}

export function hasLinkPreview(state: any): boolean {
  let hasLinkPreview = false;
  state.doc.descendants((node: any) => {
    if (node.type.name === 'linkPreview') {
      hasLinkPreview = true;
      return false;
    }
  });
  return hasLinkPreview;
}
