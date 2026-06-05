/**
 * Spell Check Extension for CodeMirror
 * Provides visual feedback for misspelled words in source mode
 */
import { ViewPlugin, Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

// Misspelled word mark interface
export interface SpellCheckMark {
  from: number;
  to: number;
  word: string;
}

// Effect to update misspelled words
export const setMisspelledWords = StateEffect.define<SpellCheckMark[]>();

// State field to store misspelled words
const spellCheckField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setMisspelledWords)) {
        const builder = new RangeSetBuilder<Decoration>();
        const marks = effect.value;
        
        for (const mark of marks) {
          if (mark.from >= 0 && mark.to <= tr.state.doc.length) {
            builder.add(
              mark.from,
              mark.to,
              Decoration.mark({
                class: 'cm-spell-check-misspelled',
                attributes: {
                  'data-word': mark.word,
                  title: `Misspelled: ${mark.word}`,
                },
              })
            );
          }
        }
        
        return builder.finish();
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Theme for spell check decorations
const spellCheckTheme = EditorView.baseTheme({
  '.cm-spell-check-misspelled': {
    textDecoration: 'underline wavy #e74c3c',
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },
  '.cm-spell-check-misspelled:hover': {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
});

/**
 * Create a spell check extension for CodeMirror
 */
export function spellCheckExtension(options?: {
  onWordClick?: (word: string, from: number, to: number) => void;
  onAddToDictionary?: (word: string) => void;
}): Extension {
  const { onWordClick, onAddToDictionary } = options || {};

  return [
    spellCheckField,
    spellCheckTheme,
    ViewPlugin.define((view: EditorView) => {
      return {
        update(viewUpdate) {
          // Handle clicks on misspelled words
          if (viewUpdate.docChanged || viewUpdate.selectionSet) {
            // Click handling is done via event listeners below
          }
        },
        destroy() {
          // Cleanup
        },
      };
    }),
    // Add click and double-click handlers
    EditorView.domEventHandlers({
      click(event, view) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('cm-spell-check-misspelled')) {
          const word = target.getAttribute('data-word');
          if (word && onWordClick) {
            // Find the position of this word in the document
            const marks = view.state.field(spellCheckField);
            let from = 0;
            let to = 0;
            
            marks.between(0, view.state.doc.length, (markFrom, markTo, decoration) => {
              const decoWord = decoration.spec.attributes?.['data-word'];
              if (decoWord === word) {
                from = markFrom;
                to = markTo;
                return false; // stop iteration
              }
              return true;
            });
            
            if (from !== to) {
              onWordClick(word, from, to);
            }
          }
        }
        return false;
      },
      dblclick(event, view) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('cm-spell-check-misspelled')) {
          const word = target.getAttribute('data-word');
          if (word && onAddToDictionary) {
            onAddToDictionary(word);
            // Remove the decoration
            const currentMarks = view.state.field(spellCheckField);
            const newMarks: SpellCheckMark[] = [];
            
            currentMarks.between(0, view.state.doc.length, (from, to, decoration) => {
              const decoWord = decoration.spec.attributes?.['data-word'];
              if (decoWord !== word) {
                newMarks.push({ from, to, word: decoWord || '' });
              }
              return true;
            });
            
            view.dispatch({
              effects: setMisspelledWords.of(newMarks),
            });
          }
        }
        return false;
      },
    }),
  ];
}

/**
 * Helper function to find misspelled words in text
 */
export function findMisspelledWordsInText(
  text: string,
  customDictionary: string[],
  isMisspelled?: (word: string) => boolean
): SpellCheckMark[] {
  const marks: SpellCheckMark[] = [];
  const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
  let match;

  // Common words that are rarely misspelled
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  ]);

  // Build dictionary set
  const dictionarySet = new Set(customDictionary.map(w => w.toLowerCase()));

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const lowerWord = word.toLowerCase();
    
    // Skip short words
    if (word.length < 3) continue;
    
    // Skip if in custom dictionary
    if (dictionarySet.has(lowerWord)) continue;
    
    // Skip if in common words
    if (commonWords.has(lowerWord)) continue;
    
    // Use custom check if provided
    if (isMisspelled && !isMisspelled(lowerWord)) continue;
    
    marks.push({
      from: match.index,
      to: match.index + word.length,
      word,
    });
  }

  return marks;
}
