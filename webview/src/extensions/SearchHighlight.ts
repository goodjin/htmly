/**
 * Search Highlight Extension for Tiptap
 * Provides visual highlighting for search/regex matches in the editor
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchHighlightOptions {
  enabled: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      /**
       * Set search highlights for the given matches
       * @param matches Array of match positions
       * @param currentIndex Index of the currently selected match (-1 for none)
       */
      setSearchHighlights: (matches: SearchMatch[], currentIndex: number) => ReturnType;
      /**
       * Clear all search highlights
       */
      clearSearchHighlights: () => ReturnType;
    };
  }
}

export const searchHighlightKey = new PluginKey('searchHighlight');

export const SearchHighlightExtension = Extension.create<SearchHighlightOptions>({
  name: 'searchHighlight',

  addOptions() {
    return {
      enabled: true,
    };
  },

  addCommands() {
    return {
      setSearchHighlights:
        (matches: SearchMatch[], currentIndex: number) =>
        ({ editor, tr }) => {
          editor.view.dispatch(
            tr.setMeta(searchHighlightKey, { matches, currentIndex })
          );
          return true;
        },

      clearSearchHighlights:
        () =>
        ({ editor, tr }) => {
          editor.view.dispatch(
            tr.setMeta(searchHighlightKey, { matches: [], currentIndex: -1 })
          );
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: searchHighlightKey,

        state: {
          init() {
            return {
              matches: [] as SearchMatch[],
              currentIndex: -1,
            };
          },

          apply(tr, value) {
            const meta = tr.getMeta(searchHighlightKey);
            if (meta?.matches !== undefined) {
              return { matches: meta.matches, currentIndex: meta.currentIndex };
            }
            return value;
          },
        },

        props: {
          decorations(state) {
            const { matches, currentIndex } = searchHighlightKey.getState(state) || {
              matches: [],
              currentIndex: -1,
            };

            if (!matches || matches.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            for (let i = 0; i < matches.length; i++) {
              const mark = matches[i];
              // Only add decoration if the position is still valid
              if (mark.from >= 0 && mark.to <= state.doc.content.size && mark.from < mark.to) {
                const isCurrent = i === currentIndex;
                decorations.push(
                  Decoration.inline(mark.from, mark.to, {
                    class: isCurrent ? 'search-highlight-current' : 'search-highlight',
                    'data-match-index': i.toString(),
                  })
                );
              }
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
