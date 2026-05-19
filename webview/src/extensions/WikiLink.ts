import { Node, mergeAttributes, InputRule, Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { VueRenderer } from '@tiptap/vue-3';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import WikiLinkSuggestion from '../components/WikiLinkSuggestion.vue';
import type { WikiLinkSuggestionItem } from '../components/WikiLinkSuggestion.vue';

// Plugin key for wiki link suggestion
const wikiLinkSuggestionPluginKey = new PluginKey('wikiLinkSuggestion');

/**
 * WikiLink extension for Tiptap
 * 
 * Provides [[Page Name]] wiki link syntax:
 * - Parses [[...]] as a wiki link node
 * - Stores page name in document model
 * - Serializes to: <a class="wiki-link" data-page="Page Name">Page Name</a>
 * - Provides autocomplete suggestions when typing [[
 * - Handles click on wiki links to open or create pages
 * 
 * The extension is inline and atomic (not editable directly).
 */

/**
 * Simple page index for wiki link suggestions
 * In a real implementation, this would be populated from the workspace
 */
export interface WikiPage {
  name: string;
  path?: string;
}

/**
 * Callback type for when a wiki link is clicked
 */
export type WikiLinkClickCallback = (pageName: string, existingPages: string[]) => void;

/**
 * Set the callback for wiki link clicks
 */
let wikiLinkClickCallback: WikiLinkClickCallback | null = null;

/**
 * Set the callback for wiki link click events
 */
export function setWikiLinkClickCallback(callback: WikiLinkClickCallback | null): void {
  wikiLinkClickCallback = callback;
}

const pageIndex: WikiPage[] = [];

/**
 * Set the page index for wiki link suggestions
 * This should be called from the extension to update available pages
 */
export function setPageIndex(pages: WikiPage[]): void {
  pageIndex.length = 0;
  pageIndex.push(...pages);
}

/**
 * Add a page to the index
 */
export function addPage(page: WikiPage): void {
  if (!pageIndex.find(p => p.name === page.name)) {
    pageIndex.push(page);
  }
}

/**
 * Remove a page from the index
 */
export function removePage(name: string): void {
  const index = pageIndex.findIndex(p => p.name === name);
  if (index !== -1) {
    pageIndex.splice(index, 1);
  }
}

/**
 * Get all pages from the index
 */
export function getPages(): WikiPage[] {
  return [...pageIndex];
}

/**
 * Regex to match wiki link syntax [[Page Name]]
 * Supports:
 * - Simple names: [[Page Name]]
 * - Names with spaces: [[Page Name With Spaces]]
 * - Escaped brackets: not supported (use named links instead)
 */
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Regex to match opening bracket [[
 */
const WIKI_LINK_OPEN_REGEX = /\[\[([^\]]*)?$/;

/**
 * Creates an input rule that converts [[...]] to wiki link nodes
 */
function createWikiLinkInputRule() {
  return new InputRule({
    find: WIKI_LINK_REGEX,
    handler: ({ state, range, match, commands }) => {
      const { from, to } = range;
      const pageName = match[1]?.trim() || '';
      
      if (!pageName) {
        return;
      }

      const tr = state.tr;
      
      // Create the wiki link node attributes
      const attrs = {
        page: pageName,
      };

      // Delete the matched text and insert the wiki link node
      tr.delete(from, to);
      
      // Create a node type for the current schema
      const wikiLinkType = state.schema.nodes.wikiLink;
      if (wikiLinkType) {
        const node = wikiLinkType.create(attrs);
        tr.insert(from, node);
      } else {
        // Fallback: insert as HTML if node type doesn't exist
        const html = `<a class="wiki-link" data-page="${escapeHtml(pageName)}">${escapeHtml(pageName)}</a>`;
        tr.insert(from, state.schema.text(' ') as any);
      }
    },
  });
}

// Wiki link node - inline atomic node for [[Page Name]] syntax
export const WikiLink = Node.create({
  name: 'wikiLink',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addAttributes() {
    return {
      page: {
        default: '',
        parseHTML: (element) => {
          return element.getAttribute('data-page') || '';
        },
        renderHTML: (attributes) => {
          return { 'data-page': attributes.page };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a.wiki-link' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const page = node.attrs.page || '';
    return [
      'a',
      mergeAttributes({ 
        class: 'wiki-link',
        'data-page': page,
        href: '#',
        title: `Open page: ${escapeHtml(page)}`,
      }, HTMLAttributes),
      page,
    ];
  },

  addCommands() {
    return {
      insertWikiLink:
        (page: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { page },
          });
        },
      setWikiLink:
        (page: string) =>
        ({ state, commands }) => {
          const { selection } = state;
          const { from, to } = selection;
          
          if (from === to) {
            // No selection - insert wiki link node
            return commands.insertContent({
              type: this.name,
              attrs: { page },
            });
          }
          
          // Wrap selection in wiki link
          return commands.wrapIn(this.name, { page });
        },
      updateWikiLinkPage:
        (newPage: string) =>
        ({ state, commands }) => {
          const { selection } = state;
          const { from, to } = selection;
          
          // Update all wiki links in selection
          return commands.updateAttributes(this.name, { page: newPage });
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },

  addInputRules() {
    return [
      createWikiLinkInputRule(),
    ];
  },

  addProseMirrorPlugins() {
    return [
      createWikiLinkClickPlugin(),
    ];
  },
});

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Plugin key for wiki link click handler
 */
export const wikiLinkClickPluginKey = new PluginKey('wikiLinkClick');

/**
 * Create a plugin to handle clicks on wiki links
 */
function createWikiLinkClickPlugin() {
  return new Plugin({
    key: wikiLinkClickPluginKey,
    props: {
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        
        // Check if clicked on a wiki link
        if (target.classList.contains('wiki-link') || target.closest('.wiki-link')) {
          const wikiLink = target.classList.contains('wiki-link') 
            ? target 
            : target.closest('.wiki-link') as HTMLElement;
          
          if (wikiLink) {
            const pageName = wikiLink.getAttribute('data-page');
            if (pageName && wikiLinkClickCallback) {
              // Prevent default link behavior
              event.preventDefault();
              
              // Get all existing page names
              const existingPages = pageIndex.map(p => p.name);
              
              // Call the callback
              wikiLinkClickCallback(pageName, existingPages);
              
              // Mark the click as handled
              return true;
            }
          }
        }
        
        return false;
      },
    },
  });
}

/**
 * Create suggestion options for wiki link autocomplete
 */
function createWikiLinkSuggestionOptions(): Omit<SuggestionOptions, 'editor'> {
  return {
    char: '[[',
    allowSpaces: true,
    startOfLine: false,
    command: ({ editor, range, props }: { editor: any; range: { from: number; to: number }; props: any }) => {
      // Delete the [[ and any typed text
      editor.chain().focus().deleteRange(range).run();
      
      // Insert the wiki link
      if (props.isNew) {
        // Create new page - still insert the link
        editor.chain().focus().insertContent({
          type: 'wikiLink',
          attrs: { page: props.page },
        }).run();
      } else {
        editor.chain().focus().insertContent({
          type: 'wikiLink',
          attrs: { page: props.page },
        }).run();
      }
    },
    items: ({ query }: { query: string }) => {
      const filtered: WikiLinkSuggestionItem[] = [];
      const queryLower = query.toLowerCase();
      
      // Add matching existing pages
      for (const page of pageIndex) {
        if (page.name.toLowerCase().includes(queryLower)) {
          filtered.push({
            page: page.name,
            isNew: false,
          });
        }
      }
      
      // Add "create new" option if query has text and no exact match
      if (query && !filtered.find(p => p.page.toLowerCase() === queryLower)) {
        filtered.push({
          page: query,
          isNew: true,
        });
      }
      
      return filtered;
    },
    render: () => {
      let component: VueRenderer | null = null;
      let popup: HTMLElement | null = null;

      return {
        onStart: (props: any) => {
          popup = document.createElement('div');
          popup.className = 'wiki-link-popup';
          document.body.appendChild(popup);

          component = new VueRenderer(WikiLinkSuggestion, {
            props,
            editor: props.editor,
          });

          popup.appendChild(component.el as Node);

          const rect = props.clientRect?.();
          if (rect && popup) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 8}px`;
          }
        },

        onUpdate: (props: any) => {
          if (component) {
            component.updateProps(props);
          }

          if (popup) {
            const rect = props.clientRect?.();
            if (rect) {
              popup.style.left = `${rect.left}px`;
              popup.style.top = `${rect.bottom + 8}px`;
            }
          }
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup?.remove();
            return true;
          }

          if (component?.ref) {
            return component.ref.onKeyDown(props);
          }
          return false;
        },

        onExit: () => {
          popup?.remove();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  };
}

/**
 * WikiLink Suggestion extension
 * Provides autocomplete functionality for wiki links
 */
const WikiLinkSuggestionExtension = Extension.create({
  name: 'wikiLinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: wikiLinkSuggestionPluginKey,
        ...createWikiLinkSuggestionOptions(),
      }),
    ];
  },
});

/**
 * WikiLink extension with autocomplete
 */
export const WikiLinkExtension = [WikiLink, WikiLinkSuggestionExtension];
