import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Callout block extension for Tiptap
 * 
 * Provides a styled block with:
 * - Customizable emoji icon (default: 💡)
 * - Customizable background color (default: #fef3c7)
 * - Editable content area that can contain any block
 * 
 * Serializes to: <div class="callout" data-icon="..." data-bg="...">content</div>
 */
export const Callout = Node.create({
  name: 'callout',
  
  group: 'block',
  
  content: 'block+',
  
  addAttributes() {
    return {
      icon: {
        default: '💡',
        parseHTML: (element) => {
          return element.getAttribute('data-icon') || '💡';
        },
        renderHTML: (attributes) => {
          return { 'data-icon': attributes.icon };
        },
      },
      backgroundColor: {
        default: '#fef3c7',
        parseHTML: (element) => {
          return element.getAttribute('data-bg') || '#fef3c7';
        },
        renderHTML: (attributes) => {
          return { 'data-bg': attributes.backgroundColor };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.callout' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Apply background color as inline style for proper rendering
    const style = `background-color: ${node.attrs.backgroundColor}`;
    return ['div', mergeAttributes({ class: 'callout', style }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertCallout:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              icon: attrs.icon || '💡',
              backgroundColor: attrs.backgroundColor || '#fef3c7',
            },
            content: [{ type: 'paragraph' }],
          });
        },
      updateCalloutIcon:
        (icon: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { icon });
        },
      updateCalloutBackground:
        (backgroundColor: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { backgroundColor });
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },
});
