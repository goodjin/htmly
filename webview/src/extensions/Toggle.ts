import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Toggle block extension for Tiptap
 * 
 * Provides a collapsible block with:
 * - Chevron toggle indicator
 * - Summary (header) that is always visible
 * - Content area that can be expanded/collapsed
 * - Can contain any block type inside
 * 
 * Serializes to: <details><summary>...</summary><p>...</p></details>
 */
export const Toggle = Node.create({
  name: 'toggle',
  
  group: 'block',
  
  content: 'block+',
  
  // Note: Removed `defining: true` which prevented cursor from leaving the toggle block,
  // causing issues with inserting multiple toggles as siblings.
  // The toggle's content model still prevents merging with incompatible blocks.
  
  addAttributes() {
    return {
      isOpen: {
        default: false,
        parseHTML: (element) => {
          return element.hasAttribute('open');
        },
        renderHTML: (attributes) => {
          return {};
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Create wrapper div for proper styling
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-wrapper';
      
      // Create the details element
      const details = document.createElement('details');
      
      // Set initial open state from node attribute
      if (node.attrs.isOpen) {
        details.setAttribute('open', '');
      }
      
      // Create the summary element
      const summary = document.createElement('summary');
      summary.className = 'toggle-summary';
      summary.textContent = 'Toggle';
      summary.setAttribute('contenteditable', 'true');
      
      // Add summary to details first
      details.appendChild(summary);
      
      // Create a content container that will hold the ProseMirror content
      const contentContainer = document.createElement('div');
      contentContainer.className = 'toggle-content';
      details.appendChild(contentContainer);
      
      // Add details to wrapper
      wrapper.appendChild(details);
      
      // Click handler for toggling
      const toggleHandler = (e: MouseEvent) => {
        e.preventDefault();
        
        // Toggle the open state on the DOM
        if (details.hasAttribute('open')) {
          details.removeAttribute('open');
        } else {
          details.setAttribute('open', '');
        }
        
        // Update the node attribute
        if (typeof getPos === 'function') {
          const pos = getPos();
          const newIsOpen = details.hasAttribute('open');
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, { isOpen: newIsOpen });
          editor.view.dispatch(tr);
        }
      };
      
      // Add click listener to summary for toggle
      summary.addEventListener('click', toggleHandler);
      
      // Add keyboard support
      summary.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleHandler(e as unknown as MouseEvent);
        }
      });
      
      return {
        dom: details,
        contentDOM: contentContainer,
        
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'toggle') {
            return false;
          }
          
          // Update open state
          if (updatedNode.attrs.isOpen) {
            details.setAttribute('open', '');
          } else {
            details.removeAttribute('open');
          }
          
          return true;
        },
        
        // Called when the node is selected
        selectNode: () => {
          details.style.outline = '2px solid var(--vscode-focusBorder, #0e639c)';
        },
        
        // Called when the node is deselected
        deselectNode: () => {
          details.style.outline = '';
        },
        
        destroy: () => {
          summary.removeEventListener('click', toggleHandler);
          summary.removeEventListener('keydown', () => {});
        },
      };
    };
  },

  parseHTML() {
    return [{ tag: 'details' }];
  },

  // renderHTML returns the <details> element with open attribute.
  // The summary is rendered by the NodeView separately. For HTML serialization,
  // we include the summary text as a data attribute and reconstruct it on parse.
  // Content is serialized by ProseMirror's contentDOM mechanism (contentDOM: contentContainer).
  renderHTML({ node, HTMLAttributes }) {
    // Serialize children using manual DOM building.
    // This approach handles all node types and marks correctly.
    const childHtmlParts: string[] = [];

    function textWithMarks(n: any): string {
      if (!n.isText) return '';
      let text = String(n.text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // Apply marks (outermost to innermost = reverse order)
      // Use Array.from for safe iteration
      const marks = Array.from(n.marks || []);
      for (let i = marks.length - 1; i >= 0; i--) {
        const mark = marks[i];
        if (mark.type.name === 'bold') text = `<strong>${text}</strong>`;
        else if (mark.type.name === 'italic') text = `<em>${text}</em>`;
        else if (mark.type.name === 'underline') text = `<u>${text}</u>`;
        else if (mark.type.name === 'strike') text = `<s>${text}</s>`;
        else if (mark.type.name === 'code') text = `<code>${text}</code>`;
        else if (mark.type.name === 'link') {
          const href = (mark.attrs?.href || '').replace(/"/g, '%22');
          text = `<a href="${href}">${text}</a>`;
        }
        else if (mark.type.name === 'footnote') text = `<sup class="footnote-ref">${text}</sup>`;
        else if (mark.type.name === 'blockBackground') {
          const color = mark.attrs?.color || '';
          text = `<span style="background-color:${color}" data-bg="${color}">${text}</span>`;
        }
      }
      return text;
    }

    function childToHtml(n: any): string {
      if (n.isText) return textWithMarks(n);

      // Handle inline non-text nodes (like Footnote marker, which is an inline leaf node)
      if (n.isInline && !n.isText) {
        const tag = n.type.name === 'footnote' ? 'sup' : 'span';
        let extraAttrs = '';
        if (n.type.name === 'footnote') {
          extraAttrs = ` class="footnote-ref"`;
          const num = n.attrs?.number || '1';
          extraAttrs += ` data-footnote="" id="fnref${num}"`;
        }
        let inner = '';
        for (let i = 0; i < n.childCount; i++) {
          inner += childToHtml(n.child(i));
        }
        return `<${tag}${extraAttrs}>${inner}</${tag}>`;
      }

      if (n.isBlock) {
        let tag: string;
        let extraAttrs = '';

        if (n.type.name === 'paragraph') tag = 'p';
        else if (n.type.name === 'heading') tag = `h${n.attrs?.level || 1}`;
        else if (n.type.name === 'blockquote') tag = 'blockquote';
        else if (n.type.name === 'codeBlock') tag = 'pre';
        else if (n.type.name === 'list_item') tag = 'li';
        else if (n.type.name === 'bullet_list') tag = 'ul';
        else if (n.type.name === 'ordered_list') tag = 'ol';
        else if (n.type.name === 'horizontalRule') tag = 'hr';
        else if (n.type.name === 'callout') {
          tag = 'div';
          const bg = n.attrs?.backgroundColor || '#fef3c7';
          const icon = n.attrs?.icon || '';
          extraAttrs = ` class="callout" style="background-color:${bg}" data-icon="${icon}"`;
        }
        else if (n.type.name === 'embedBlock') {
          tag = 'div';
          const src = n.attrs?.src || '';
          extraAttrs = ` class="embed-block" data-src="${src}"`;
        }
        else if (n.type.name === 'columns') { tag = 'div'; extraAttrs = ' class="columns"'; }
        else if (n.type.name === 'column') {
          tag = 'div';
          const width = n.attrs?.width || '50%';
          extraAttrs = ` class="column" style="width:${width}"`;
        }
        else if (n.type.name === 'linkPreview') {
          tag = 'div';
          const url = n.attrs?.url || '';
          const fetched = n.attrs?.fetched !== false;
          extraAttrs = ` class="link-preview" data-url="${url}" data-fetched="${fetched}"`;
        }
        else if (n.type.name === 'toc') { tag = 'div'; extraAttrs = ' class="toc"'; }
        else if (n.type.name === 'coverImage') {
          tag = 'div';
          const src = n.attrs?.src || '';
          extraAttrs = ` class="cover-image" data-src="${src}"`;
        }
        else if (n.type.name === 'footnote') { tag = 'aside'; extraAttrs = ' class="footnotes"'; }
        else if (n.type.name === 'footnoteItem') {
          tag = 'p';
          const num = n.attrs?.number || '1';
          extraAttrs = ` id="fn-${num}"`;
        }
        else { tag = 'div'; }

        // Block background mark on this block
        const marks = Array.from(n.marks || []);
        let bgMarkColor: string | null = null;
        for (const m of marks) {
          if (m.type.name === 'blockBackground' && m.attrs?.color) {
            bgMarkColor = m.attrs.color;
            break;
          }
        }
        if (bgMarkColor) {
          extraAttrs += ` style="background-color:${bgMarkColor}"`;
        }

        let inner = '';
        // Use index-based iteration for Fragment compatibility
        for (let i = 0; i < n.childCount; i++) {
          inner += childToHtml(n.child(i));
        }

        if (n.type.name === 'horizontalRule') return `<${tag}${extraAttrs}>`;
        return `<${tag}${extraAttrs}>${inner}</${tag}>`;
      }

      // Default: just concatenate children
      let s = '';
      for (let i = 0; i < n.childCount; i++) {
        s += childToHtml(n.child(i));
      }
      return s;
    }

    node.forEach((child) => {
      childHtmlParts.push(childToHtml(child));
    });

    const contentHtml = childHtmlParts.join('');

    // Parse to DOM nodes
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<wrapper>${contentHtml}</wrapper>`, 'text/html');
    const wrapper = parsed.body.firstChild as HTMLElement;

    const children: Node[] = [];
    let c = wrapper?.firstChild;
    while (c) {
      children.push(document.importNode(c, true));
      c = c.nextSibling;
    }

    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        'data-summary': 'Toggle',
        ...(node.attrs.isOpen ? { open: '' } : {}),
      }),
      ...children,
    ];
  },

  addCommands() {
    return {
      insertToggle:
        (attrs = {}) =>
        ({ tr, state, dispatch, commands }) => {
          // Create the toggle node with a paragraph inside
          const toggleNode = state.schema.nodes.toggle.create(
            { isOpen: attrs.isOpen || false },
            [state.schema.nodes.paragraph.create()]
          );
          
          if (dispatch) {
            // Insert at the end of the document to ensure it's a sibling, not nested
            const docSize = state.doc.content.size;
            tr.insert(docSize, toggleNode);
            dispatch(tr);
            
            // Set selection inside the new toggle using commands
            // Position docSize + 2 is the start of the paragraph inside the new toggle
            commands.setTextSelection(docSize + 2);
          }
          return true;
        },
      toggleOpen:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the toggle node that contains this position
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'toggle') {
              const togglePos = $from.before(depth);
              
              if (dispatch) {
                const currentIsOpen = node.attrs.isOpen || false;
                tr.setNodeMarkup(togglePos, undefined, { isOpen: !currentIsOpen });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      setToggleOpen:
        (isOpen: boolean) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the toggle node that contains this position
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'toggle') {
              const togglePos = $from.before(depth);
              
              if (dispatch) {
                tr.setNodeMarkup(togglePos, undefined, { isOpen });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter key expands the toggle
      'Mod-Enter': () => {
        return this.editor.commands.setToggleOpen(true);
      },
      // Ctrl+. also expands (common toggle shortcut)
      'Ctrl-.': () => {
        return this.editor.commands.setToggleOpen(true);
      },
    };
  },
});
