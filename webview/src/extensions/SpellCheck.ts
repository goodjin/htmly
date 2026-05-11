/**
 * Spell Check Extension for Tiptap
 * Provides visual feedback for misspelled words and context menu for suggestions
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SpellCheckMark {
  from: number;
  to: number;
  word: string;
}

export interface SpellCheckOptions {
  enabled: boolean;
  misspelledWords: SpellCheckMark[];
  onWordClick?: (word: string, position: { from: number; to: number }) => void;
  onAddToDictionary?: (word: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spellCheck: {
      /**
       * Set misspelled words to highlight
       */
      setMisspelledWords: (words: SpellCheckMark[]) => ReturnType;
      /**
       * Clear all spell check decorations
       */
      clearMisspelledWords: () => ReturnType;
      /**
       * Replace misspelled word with suggestion
       */
      replaceWord: (from: number, to: number, replacement: string) => ReturnType;
      /**
       * Add word to dictionary
       */
      addToDictionary: (word: string) => ReturnType;
    };
  }
}

export const spellCheckKey = new PluginKey('spellCheck');

export const SpellCheckExtension = Extension.create<SpellCheckOptions>({
  name: 'spellCheck',

  addOptions() {
    return {
      enabled: true,
      misspelledWords: [],
      onWordClick: undefined,
      onAddToDictionary: undefined,
    };
  },

  addCommands() {
    return {
      setMisspelledWords:
        (words: SpellCheckMark[]) =>
        ({ editor, tr }) => {
          // Store the misspelled words in the plugin state
          editor.view.dispatch(
            tr.setMeta(spellCheckKey, { misspelledWords: words })
          );
          return true;
        },

      clearMisspelledWords:
        () =>
        ({ editor, tr }) => {
          editor.view.dispatch(
            tr.setMeta(spellCheckKey, { misspelledWords: [] })
          );
          return true;
        },

      replaceWord:
        (from: number, to: number, replacement: string) =>
        ({ tr }) => {
          tr.replaceWith(from, to, editor.schema.text(replacement));
          return true;
        },

      addToDictionary:
        (word: string) =>
        ({ commands }) => {
          if (this.options.onAddToDictionary) {
            this.options.onAddToDictionary(word);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: spellCheckKey,

        state: {
          init() {
            return {
              misspelledWords: extension.options.misspelledWords,
            };
          },

          apply(tr, value) {
            const meta = tr.getMeta(spellCheckKey);
            if (meta?.misspelledWords !== undefined) {
              return { misspelledWords: meta.misspelledWords };
            }
            return value;
          },
        },

        props: {
          decorations(state) {
            const { misspelledWords } = spellCheckKey.getState(state) || {
              misspelledWords: [],
            };

            if (!misspelledWords || misspelledWords.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            for (const mark of misspelledWords) {
              // Only add decoration if the position is still valid
              if (mark.from >= 0 && mark.to <= state.doc.content.size) {
                decorations.push(
                  Decoration.inline(mark.from, mark.to, {
                    class: 'spell-check-misspelled',
                    'data-word': mark.word,
                    title: `Misspelled: ${mark.word}`,
                  })
                );
              }
            }

            return DecorationSet.create(state.doc, decorations);
          },

          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('spell-check-misspelled')) {
              const word = target.getAttribute('data-word');
              if (word && extension.options.onWordClick) {
                const $pos = view.state.doc.resolve(pos);
                const mark = spellCheckKey.getState(view.state)?.misspelledWords.find(
                  (m) => m.word === word && m.from <= pos && m.to >= pos
                );
                if (mark) {
                  extension.options.onWordClick(word, { from: mark.from, to: mark.to });
                }
              }
            }
            return false;
          },

          handleDoubleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('spell-check-misspelled')) {
              const word = target.getAttribute('data-word');
              if (word && extension.options.onAddToDictionary) {
                extension.options.onAddToDictionary(word);
                // Remove the decoration
                const { misspelledWords } = spellCheckKey.getState(view.state) || {
                  misspelledWords: [],
                };
                const newWords = misspelledWords.filter((m) => m.word !== word);
                view.dispatch(
                  view.state.tr.setMeta(spellCheckKey, {
                    misspelledWords: newWords,
                  })
                );
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
