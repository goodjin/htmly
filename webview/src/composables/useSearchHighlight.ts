/**
 * Search highlight composable for CodeMirror
 * 
 * Provides a StateField and StateEffect for highlighting search matches
 * in the CodeMirror editor. This needs to be registered with the
 * EditorView extensions for highlighting to work.
 */

import { StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Decoration, DecorationSet } from '@codemirror/view';

/**
 * Effect to update search highlight decorations
 */
export const highlightSearchEffect = StateEffect.define<DecorationSet>();

/**
 * StateField for search highlight decorations
 * 
 * This field must be added to the EditorView's extensions array
 * for the search highlights to be visible.
 */
export const highlightSearchField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    return tr.effects.reduce((set, effect) => {
      if (effect.is(highlightSearchEffect)) {
        return effect.value;
      }
      return set;
    }, decorations.map(tr.changes));
  },
  provide: f => EditorView.decorations.from(f),
});
