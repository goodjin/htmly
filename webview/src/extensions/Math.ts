import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

/**
 * Math extension for Tiptap
 * 
 * Provides LaTeX math rendering using KaTeX:
 * - Inline math: $...$ - renders as inline KaTeX output
 * - Block math: $$...$$ - renders as centered KaTeX output
 * 
 * Serializes to:
 * - Inline: <span class="math-inline" data-math="...">rendered HTML</span>
 * - Block: <div class="math-block" data-math="...">rendered HTML</div>
 */

/**
 * Render math expression using KaTeX
 */
function renderMath(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: true,
      strict: false,
    });
  } catch (e) {
    console.error('KaTeX rendering error:', e);
    return `<span class="math-error" style="color: #cc0000;">${escapeHtml(math)}</span>`;
  }
}

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

// Math inline mark - for $...$ syntax
export const MathInline = Node.create({
  name: 'mathInline',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addAttributes() {
    return {
      math: {
        default: '',
        parseHTML: (element) => {
          return element.getAttribute('data-math') || '';
        },
        renderHTML: (attributes) => {
          return { 'data-math': attributes.math };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.math-inline' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const math = node.attrs.math || '';
    const rendered = renderMath(math, false);
    return [
      'span',
      mergeAttributes({ 
        class: 'math-inline',
        'data-math': math,
        'data-rendered': rendered,
      }, HTMLAttributes),
      ['span', { class: 'math-content', innerHTML: rendered }],
    ];
  },

  addCommands() {
    return {
      insertMathInline:
        (math: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { math },
          });
        },
      wrapSelectionAsMathInline:
        () =>
        ({ state, commands }) => {
          const { selection } = state;
          const { from, to } = selection;
          
          if (from === to) {
            // No selection - insert empty math with cursor inside
            return commands.insertContent({
              type: this.name,
              attrs: { math: '' },
            });
          }
          
          // Get selected text
          const text = state.doc.textBetween(from, to);
          
          // Wrap selection in math node
          return commands.wrapIn(this.name, { math: text });
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },
});

// Math block node - for $$...$$ syntax
export const MathBlock = Node.create({
  name: 'mathBlock',
  
  group: 'block',
  
  atom: true,
  
  addAttributes() {
    return {
      math: {
        default: '',
        parseHTML: (element) => {
          return element.getAttribute('data-math') || '';
        },
        renderHTML: (attributes) => {
          return { 'data-math': attributes.math };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Create wrapper div
      const wrapper = document.createElement('div');
      wrapper.className = 'math-block-wrapper';
      
      // Create the display div for KaTeX output
      const display = document.createElement('div');
      display.className = 'math-block';
      display.setAttribute('data-math', node.attrs.math || '');
      
      // Render math with KaTeX
      const math = node.attrs.math || '';
      try {
        display.innerHTML = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000',
          trust: true,
          strict: false,
        });
      } catch (e) {
        display.innerHTML = `<span class="math-error" style="color: #cc0000;">${escapeHtml(math)}</span>`;
      }
      
      wrapper.appendChild(display);
      
      // Store reference to the display element for updates
      (wrapper as any)._displayElement = display;
      
      return {
        dom: wrapper,
        contentDOM: null, // atom nodes don't have editable content
        
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mathBlock') {
            return false;
          }
          
          const math = updatedNode.attrs.math || '';
          display.setAttribute('data-math', math);
          
          try {
            display.innerHTML = katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
              errorColor: '#cc0000',
              trust: true,
              strict: false,
            });
          } catch (e) {
            display.innerHTML = `<span class="math-error" style="color: #cc0000;">${escapeHtml(math)}</span>`;
          }
          
          return true;
        },
        
        selectNode: () => {
          wrapper.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        
        deselectNode: () => {
          wrapper.style.outline = '';
        },
        
        destroy: () => {
          // Cleanup if needed
        },
      };
    };
  },

  parseHTML() {
    return [{ tag: 'div.math-block' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const math = node.attrs.math || '';
    const rendered = renderMath(math, true);
    return [
      'div',
      mergeAttributes({ 
        class: 'math-block',
        'data-math': math,
      }, HTMLAttributes),
      ['div', { class: 'math-content', innerHTML: rendered }],
    ];
  },

  addCommands() {
    return {
      insertMathBlock:
        (math?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { math: math || '' },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },
});

/**
 * Math extension combining inline and block math
 */
export const MathExtension = [MathInline, MathBlock];
