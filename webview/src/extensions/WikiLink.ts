import { Node, mergeAttributes, InputRule } from '@tiptap/core';

/**
 * WikiLink extension for Tiptap
 * 
 * Provides [[Page Name]] wiki link syntax:
 * - Parses [[...]] as a wiki link node
 * - Stores page name in document model
 * - Serializes to: <a class="wiki-link" data-page="Page Name">Page Name</a>
 * 
 * The extension is inline and atomic (not editable directly).
 */

/**
 * Regex to match wiki link syntax [[Page Name]]
 * Supports:
 * - Simple names: [[Page Name]]
 * - Names with spaces: [[Page Name With Spaces]]
 * - Escaped brackets: not supported (use named links instead)
 */
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

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
        title: `Open page: ${page}`,
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
});

/**
 * WikiLink extension
 */
export const WikiLinkExtension = [WikiLink];

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
