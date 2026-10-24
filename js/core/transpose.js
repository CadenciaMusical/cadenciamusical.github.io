// Transportar: cambiar todos los acordes a otra tonalidad manteniendo las
// distancias entre ellos, así que el análisis (grados y funciones) no cambia.

import { Interval, Note } from '../../vendor/tonal.mjs';
import { parseProgression } from './parser.js';

const LATIN = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

// Cada nota se escribe según su grado en la tonalidad de destino: el ♭VII de
// Re es Do, no Si♯. Para no confundir a quien empieza, los dobles sostenidos
// y bemoles y las notas que suenan como una tecla blanca (Fa♭, Do♭, Mi♯, Si♯)
// se escriben con su nombre más sencillo.
export function transposeNote(note, from, to) {
  let out = Note.transpose(to.tonic, Interval.distance(from.tonic, note));
  if (/##|bb/.test(out.slice(1)) || ['Cb', 'Fb', 'E#', 'B#'].includes(out)) out = Note.simplify(out);
  return out;
}

const write = (note, notation) => (notation === 'latin' ? LATIN[note[0]] + note.slice(1) : note);

// Devuelve el acorde transportado como texto, en el mismo cifrado y con el
// mismo sufijo con que lo escribió el usuario («Lam7» → «Mim7»).
export function transposeChord(chord, from, to) {
  const root = write(transposeNote(chord.root, from, to), chord.notation);
  const bass = chord.bass ? '/' + write(transposeNote(chord.bass, from, to), chord.notation) : '';
  return root + chord.rawSuffix + bass;
}

// Transporta un texto entero. Lo que no se reconoce como acorde se deja igual.
export function transposeText(text, from, to) {
  return parseProgression(text)
    .map((c) => (c.ok ? transposeChord(c, from, to) : c.input))
    .join(' ');
}

// Semitonos del camino más corto entre dos tónicas (de −5 a +6).
export function semitonesBetween(from, to) {
  const d = (((to.pc - from.pc) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}
