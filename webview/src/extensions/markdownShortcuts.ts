import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/core';

// Helper to create heading input rule
function createHeadingRule(level: 1 | 2 | 3) {
  const hash = '#'.repeat(level);
  return new InputRule({
    find: new RegExp(`^${hash}\\s$`),
    handler: ({ commands, range }) => {
      commands.deleteRange(range).setBlockType(range.from, range.to, 'heading', { level });
    },
  });
}

// Helper to create horizontal rule input rule
function createHrRule() {
  return new InputRule({
    find: /^(?:---|\*\*\*|___)\s$/,
    handler: ({ commands, range }) => {
      commands.deleteRange(range).setHorizontalRule();
    },
  });
}

// Helper to create unordered list input rule
function createUlRule() {
  return new InputRule({
    find: /^[\-\*]\s$/,
    handler: ({ commands, range }) => {
      commands.deleteRange(range).toggleBulletList();
    },
  });
}

// Helper to create ordered list input rule
function createOlRule() {
  return new InputRule({
    find: /^\d+\.\s$/,
    handler: ({ commands, range }) => {
      commands.deleteRange(range).toggleOrderedList();
    },
  });
}

// Helper to create blockquote input rule
function createBlockquoteRule() {
  return new InputRule({
    find: /^>\s$/,
    handler: ({ commands, range }) => {
      commands.deleteRange(range).toggleBlockquote();
    },
  });
}

// Helper to create code block input rule
function createCodeBlockRule() {
  return new InputRule({
    find: /^```$/,
    handler: ({ commands, range }) => {
      commands.deleteRange(range).toggleCodeBlock();
    },
  });
}

// Helper to create bold input rule
function createBoldRule() {
  return new InputRule({
    find: /\*\*([^*]+)\*\*$/,
    handler: ({ state, range, match }) => {
      const { from, to } = range;
      const innerText = match[1] || '';

      const tr = state.tr;
      tr.delete(from, to);

      const mark = state.schema.marks.strong;
      if (mark) {
        const node = state.schema.text(innerText, [mark.create()]);
        tr.insert(from, node);
      }
    },
  });
}

// Helper to create italic input rule
function createItalicRule() {
  return new InputRule({
    find: /(?<!\*)\*([^*]+)\*$/,
    handler: ({ state, range, match }) => {
      const { from, to } = range;
      const innerText = match[1] || '';

      const tr = state.tr;
      tr.delete(from, to);

      const mark = state.schema.marks.em;
      if (mark) {
        const node = state.schema.text(innerText, [mark.create()]);
        tr.insert(from, node);
      }
    },
  });
}

// Helper to create inline code input rule
function createInlineCodeRule() {
  return new InputRule({
    find: /`([^`]+)`$/,
    handler: ({ state, range, match }) => {
      const { from, to } = range;
      const innerText = match[1] || '';

      const tr = state.tr;
      tr.delete(from, to);

      const mark = state.schema.marks.code;
      if (mark) {
        const node = state.schema.text(innerText, [mark.create()]);
        tr.insert(from, node);
      }
    },
  });
}

export interface MarkdownShortcutsOptions {
  enabled: boolean;
}

export const MarkdownShortcutsExtension = Extension.create<MarkdownShortcutsOptions>({
  name: 'markdownShortcuts',

  addOptions() {
    return {
      enabled: true,
    };
  },

  addInputRules() {
    if (!this.options.enabled) return [];

    return [
      // Headings
      createHeadingRule(1),
      createHeadingRule(2),
      createHeadingRule(3),

      // Marks
      createBoldRule(),
      createItalicRule(),
      createInlineCodeRule(),

      // Block elements
      createHrRule(),
      createUlRule(),
      createOlRule(),
      createBlockquoteRule(),
      createCodeBlockRule(),
    ];
  },
});
