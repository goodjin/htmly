import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Footnote extension for Tiptap
 * 
 * Provides inline footnote markers with:
 * - Superscript footnote number
 * - Click to jump to definition
 * - Auto-numbering across document
 * - Definitions at document end in <aside class="footnotes">
 * 
 * Serializes to: 
 * - Marker: <sup class="footnote-ref"><a href="#fn-N" id="fnref-N">N</a></sup>
 * - Definition: <aside class="footnotes"><hr><p id="fn-N"><a href="#fnref-N">N</a></a>. Footnote text</p></aside>
 */

// Plugin key for tracking footnotes state
export const footnotePluginKey = new PluginKey('footnote');

// Footnote mark for inline markers
export const Footnote = Node.create({
  name: 'footnote',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addAttributes() {
    return {
      number: {
        default: 1,
        parseHTML: (element) => {
          const link = element.querySelector('a');
          if (link) {
            const href = link.getAttribute('href') || '';
            const match = href.match(/^#fn(\d+)$/);
            if (match) return parseInt(match[1], 10);
          }
          return parseInt(element.getAttribute('data-number') || '1', 10);
        },
        renderHTML: (attributes) => {
          return { 'data-number': String(attributes.number) };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'sup.footnote-ref a' },
      { tag: 'sup[data-footnote]' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const n = node.attrs.number;
    return [
      'sup',
      mergeAttributes({ class: 'footnote-ref', 'data-footnote': '' }, HTMLAttributes),
      ['a', { href: `#fn${n}`, id: `fnref${n}` }, String(n)],
    ];
  },

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ commands, state }) => {
          // Get current footnote count to determine next number
          let count = 0;
          state.doc.descendants((node) => {
            if (node.type.name === 'footnote') {
              count++;
            }
          });
          
          const nextNumber = count + 1;
          
          // Insert the footnote node at current position
          return commands.insertContent({
            type: this.name,
            attrs: { number: nextNumber },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => {
        return this.editor.commands.insertFootnote();
      },
      'Mod-Shift-F': () => {
        return this.editor.commands.insertFootnote();
      },
    };
  },
});

// Footnotes container node - a block node that holds all footnote definitions
export const Footnotes = Node.create({
  name: 'footnotes',
  
  group: 'block',
  
  content: 'paragraph*',
  
  atom: true,
  
  addAttributes() {
    return {
      count: {
        default: 0,
        parseHTML: (element) => {
          return parseInt(element.getAttribute('data-count') || '0', 10);
        },
        renderHTML: (attributes) => {
          return { 'data-count': String(attributes.count) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside.footnotes' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes({ class: 'footnotes' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      ensureFootnotes:
        () =>
        ({ state, commands }) => {
          // Check if footnotes node exists
          let hasFootnotes = false;
          state.doc.descendants((node) => {
            if (node.type.name === 'footnotes') {
              hasFootnotes = true;
            }
          });
          
          if (!hasFootnotes) {
            return commands.insertContent({
              type: this.name,
              content: [{ type: 'paragraph' }],
            });
          }
          return true;
        },
    };
  },
});

/**
 * Footnote Plugin - handles automatic footnote management
 * 
 * This plugin:
 * 1. Auto-inserts footnotes section at document end when first footnote is added
 * 2. Renumbers footnotes when markers are added/removed
 * 3. Updates definitions to match markers
 */
export const FootnotePlugin = new Plugin({
  key: footnotePluginKey,
  
  state: {
    init() {
      return { footnotes: [], updating: false };
    },
    
    apply(transaction, prevState) {
      // Skip if already updating to prevent infinite loops
      const meta = transaction.getMeta(footnotePluginKey);
      if (meta?.updating) {
        return { ...prevState, updating: true };
      }
      
      // Track footnote markers in the document
      const footnotes: Array<{ id: string; pos: number; number: number }> = [];
      
      transaction.doc.descendants((node, pos) => {
        if (node.type.name === 'footnote') {
          footnotes.push({
            id: `fn${node.attrs.number}`,
            pos,
            number: node.attrs.number,
          });
        }
      });
      
      // Sort by position
      footnotes.sort((a, b) => a.pos - b.pos);
      
      return { footnotes, updating: false };
    },
  },
  
  appendTransaction(transactions, oldState, newState) {
    // Check if any transaction modified the document
    let docChanged = false;
    
    for (const tr of transactions) {
      if (tr.docChanged) {
        docChanged = true;
        break;
      }
    }
    
    if (!docChanged) return null;
    
    // Skip if already updating
    const meta = transactions[0]?.getMeta(footnotePluginKey);
    if (meta?.updating) return null;
    
    // Get current footnote markers
    const markers: Array<{ pos: number; number: number }> = [];
    
    newState.doc.descendants((node, pos) => {
      if (node.type.name === 'footnote') {
        markers.push({ pos, number: node.attrs.number });
      }
    });
    
    // Sort by position
    markers.sort((a, b) => a.pos - b.pos);
    
    // Check if we need to renumber
    let needsRenumber = false;
    let expectedNumber = 1;
    
    for (const marker of markers) {
      if (marker.number !== expectedNumber) {
        needsRenumber = true;
        break;
      }
      expectedNumber++;
    }
    
    if (markers.length === 0) {
      // No footnotes - remove footnotes section if it exists
      let footnotesNodePos = -1;
      
      newState.doc.descendants((node, pos) => {
        if (node.type.name === 'footnotes') {
          footnotesNodePos = pos;
        }
      });
      
      if (footnotesNodePos >= 0) {
        const tr = newState.tr;
        tr.setMeta(footnotePluginKey, { updating: true });
        tr.delete(footnotesNodePos, footnotesNodePos + 1); // footnotes is a block node
        return tr;
      }
      
      return null;
    }
    
    // Create a new transaction
    const tr = newState.tr;
    tr.setMeta(footnotePluginKey, { updating: true });
    
    // Renumber markers if needed
    if (needsRenumber) {
      expectedNumber = 1;
      for (const marker of markers) {
        if (marker.number !== expectedNumber) {
          tr.setNodeMarkup(marker.pos, undefined, { number: expectedNumber });
        }
        expectedNumber++;
      }
    }
    
    // Find footnotes section
    let footnotesNodePos = -1;
    let footnotesNodeSize = 0;
    
    newState.doc.descendants((node, pos) => {
      if (node.type.name === 'footnotes') {
        footnotesNodePos = pos;
        footnotesNodeSize = node.nodeSize;
      }
    });
    
    // Calculate document end position (after footnotes section if it exists)
    const endPos = footnotesNodePos >= 0 ? footnotesNodePos : newState.doc.content.size;
    
    // Delete existing footnotes section if it exists
    if (footnotesNodePos >= 0) {
      tr.delete(footnotesNodePos, footnotesNodePos + footnotesNodeSize);
    }
    
    // Insert horizontal rule
    tr.insert(endPos, newState.schema.nodes.horizontalRule.create());
    
    // Create footnote definitions - each as a paragraph with id and backref link
    let insertPos = endPos + 1; // after HR
    
    for (let i = 0; i < markers.length; i++) {
      const num = i + 1;
      
      // Create the paragraph with backref and text content
      const backrefLink = newState.schema.text(
        `${num}. `,
        [
          newState.schema.marks.link.create({ href: `#fnref${num}` }),
        ]
      );
      
      // Create the paragraph with the footnote number and text
      const paragraphContent = [
        newState.schema.text(`${num}. `),
        newState.schema.text(`Footnote ${num} definition text.`),
      ];
      
      const paragraph = newState.schema.nodes.paragraph.create(
        { id: `fn${num}` },
        paragraphContent
      );
      
      tr.insert(insertPos, paragraph);
      insertPos += paragraph.nodeSize;
    }
    
    // Insert footnotes container
    const footnotesContainer = newState.schema.nodes.footnotes.create(
      { count: markers.length },
      []
    );
    
    tr.insert(insertPos, footnotesContainer);
    
    return tr;
  },
});
