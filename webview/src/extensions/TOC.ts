import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';

/**
 * Table of Contents plugin for Tiptap
 * 
 * Tracks H1, H2, H3 headings in the document and provides:
 * - Dynamic heading list updates
 * - Scroll-to-heading functionality
 * - Panel visibility state management
 */

export interface TOCHeading {
  level: number;
  text: string;
  pos: number;
  slug: string;
}

export const tocPluginKey = new PluginKey('toc');

export interface TOCState {
  headings: TOCHeading[];
  visible: boolean;
}

// Generate a slug from heading text for anchor links
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // Support Chinese characters
    .replace(/(^-|-$)/g, '');
}

// Plugin to track headings in the document
export const TOCPlugin = new Plugin({
  key: tocPluginKey,
  
  state: {
    init(): TOCState {
      return { headings: [], visible: false };
    },
    
    apply(transaction, state): TOCState {
      // Track visibility changes from UI
      const meta = transaction.getMeta(tocPluginKey);
      if (meta && typeof meta.visible === 'boolean') {
        return { ...state, visible: meta.visible };
      }
      
      // Recalculate headings when document changes
      if (transaction.docChanged) {
        const headings: TOCHeading[] = [];
        transaction.doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && node.attrs.level <= 3) {
            const text = node.textContent;
            headings.push({
              level: node.attrs.level,
              text,
              pos,
              slug: slugify(text),
            });
          }
        });
        return { ...state, headings };
      }
      
      return state;
    },
  },
  
  addCommands() {
    return {
      scrollToHeading:
        (slug: string) =>
        ({ editor }) => {
          const state = tocPluginKey.getState(editor.state) as TOCState | undefined;
          if (!state) return false;
          
          const heading = state.headings.find((h) => h.slug === slug);
          if (!heading) return false;
          
          // Get the editor element
          const editorDom = editor.view.dom as HTMLElement;
          const editorContainer = editorDom.closest('.editor-wrap') as HTMLElement;
          
          if (editorContainer) {
            // Find the heading element
            const headingElements = editorDom.querySelectorAll('h1, h2, h3');
            for (const el of headingElements) {
              if (slugify(el.textContent || '') === slug) {
                // Calculate position with offset for toolbar
                const toolbarHeight = 40; // Approximate toolbar height
                const elementTop = el.getBoundingClientRect().top;
                const containerTop = editorContainer.getBoundingClientRect().top;
                const scrollTarget = elementTop - containerTop + editorDom.scrollTop - toolbarHeight;
                
                // Smooth scroll to the heading
                editorDom.scrollTo({
                  top: Math.max(0, scrollTarget),
                  behavior: 'smooth',
                });
                
                // Optionally update URL hash
                const newHash = `#h-${slug}`;
                if (window.location.hash !== newHash) {
                  history.replaceState(null, '', newHash);
                }
                
                return true;
              }
            }
          }
          
          return false;
        },
      
      toggleTOC:
        () =>
        ({ editor, commands }) => {
          const state = tocPluginKey.getState(editor.state) as TOCState | undefined;
          const newVisible = !state?.visible;
          
          // Use tr to update plugin state
          const { tr } = editor.state;
          tr.setMeta(tocPluginKey, { visible: newVisible });
          editor.view.dispatch(tr);
          
          return true;
        },
      
      setTOCVisible:
        (visible: boolean) =>
        ({ editor }) => {
          const { tr } = editor.state;
          tr.setMeta(tocPluginKey, { visible });
          editor.view.dispatch(tr);
          return true;
        },
    };
  },
});

// Helper to get TOC state from editor
export function getTOCState(editor: Editor): TOCState | undefined {
  return tocPluginKey.getState(editor.state) as TOCState | undefined;
}
