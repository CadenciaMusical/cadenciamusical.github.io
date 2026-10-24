// Punto de entrada del análisis: texto → acordes → tonalidad → grados y funciones.

import { parseProgression } from './parser.js';
import { detectKey, scoreKey, isRelative } from './key.js';
import { classify } from './classify.js';
import { findMatches, relativeOf } from './matcher.js';

// forcedKey: { pc, mode, tonic } si el usuario ha elegido la tonalidad a mano.
export function analyze(text, { forcedKey = null } = {}) {
  const parsed = parseProgression(text);
  const chords = parsed.filter((c) => c.ok);
  const errors = parsed.filter((c) => !c.ok);
  const detection = detectKey(chords);
  if (!detection) return { parsed, chords, errors, key: null, items: [], progressions: [], cadences: [] };

  let { key, alternative, confidence } = detection;
  if (forcedKey) {
    const { blues } = scoreKey(chords, forcedKey);
    const chosen = { ...forcedKey, blues };
    // La detectada pasa a ser la alternativa que se ofrece.
    alternative = key.pc === chosen.pc && key.mode === chosen.mode ? alternative : key;
    key = chosen;
  }

  const items = chords.map((chord, i) => ({ chord, ...classify(chord, key, chords[i + 1] ?? null) }));
  const { progressions, cadences } = findMatches(chords, key, relativeOf(key));

  return {
    parsed,
    chords,
    errors,
    key,
    confidence,
    forced: Boolean(forcedKey),
    alternative,
    alternativeIsRelative: alternative ? isRelative(key, alternative) : false,
    items,
    progressions,
    cadences,
  };
}
