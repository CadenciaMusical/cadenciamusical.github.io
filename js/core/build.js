// Construye acordes a partir de una tonalidad y un grado (para ejemplos sonoros).

import { Interval, Note } from '../../vendor/tonal.mjs';
import { parseChord } from './parser.js';

const SUFFIX = { M: '', m: 'm', dim: 'dim', aug: 'aug' };

// key: { tonic, mode }. st: semitonos desde la tónica. triad: 'M' | 'm' | 'dim' | 'aug'.
export function chordOnDegree(key, st, triad, seventh = '') {
  let root = Note.transpose(key.tonic, Interval.fromSemitones(st));
  // Solo se simplifican los dobles sostenidos o bemoles (F## → G).
  if (/##|bb/.test(root.slice(1))) root = Note.simplify(root);
  const suffix = seventh || SUFFIX[triad];
  return parseChord(root + suffix);
}

export function tonicChord(key) {
  return chordOnDegree(key, 0, key.mode === 'major' ? 'M' : 'm');
}
