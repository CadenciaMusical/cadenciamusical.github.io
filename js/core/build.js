// Construye acordes a partir de una tonalidad y un grado (para ejemplos sonoros).

import { Interval, Note } from '../../vendor/tonal.mjs';
import { parseChord } from './parser.js';
import { DEGREES } from './theory.js';

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

// El acorde «de toda la vida» que ocupa el lugar de uno especial, para
// compararlos de oído (D7 en Do → Dm; D♭7 → G7; Fm → F; C7 → C). Puede ser null.
export function normalVersion(item, key) {
  const mode = key.mode;
  const diatonicAt = (st) => DEGREES[mode].find((d) => d.st === st);
  switch (item.kind) {
    case 'tritone':
      return chordOnDegree(key, (item.target.st + 7) % 12, 'M', '7');
    case 'secondary':
    case 'borrowed':
    case 'leading': {
      const d = diatonicAt(item.st);
      return d ? chordOnDegree(key, item.st, d.triad) : null;
    }
    case 'color':
    case 'blues':
      return chordOnDegree(key, item.st, item.chord.triad);
    default:
      return null;
  }
}
