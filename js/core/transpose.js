// Transportar: cambiar todos los acordes a otra tonalidad manteniendo las
// distancias entre ellos, así que el análisis (grados y funciones) no cambia.
// También, reescribir el texto en el otro cifrado (americano ↔ latino).

import { Chord, Interval, Note } from '../../vendor/tonal.mjs';
import { parseChord, parseProgression, tokenSpans } from './parser.js';
import { latinSuffix } from './names.js';

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

const same = (a, b) => a.ok && a.pc === b.pc && a.triad === b.triad && a.seventh === b.seventh && a.bass === b.bass;

// Escribe un acorde con otra raíz o en otro cifrado, conservando el sufijo tal
// como lo escribió el usuario («Lam7» → «Am7»). Si con ese sufijo se leería
// otra cosa («Reo», Re disminuido, daría «Do», Do mayor), prueba con los
// otros nombres del acorde («Ddim»).
export function writeChord(chord, notation, root = chord.root, bass = chord.bass) {
  const tail = bass ? '/' + write(bass, notation) : '';
  const expected = { ...chord, pc: Note.chroma(root), bass };
  const suffixes = [chord.rawSuffix, chord.suffix, ...Chord.get(chord.root + chord.suffix).aliases];
  // En latino, «aug», «dim» y «add9» pegados a la sílaba se leen mal
  // («Faaug», «Doo», «Faadd9»): se escriben «Fa+», «Do°» y «Fa(add9)».
  if (notation === 'latin') suffixes.unshift(latinSuffix(chord.rawSuffix));
  for (const suffix of suffixes) {
    const text = write(root, notation) + suffix + tail;
    if (same(parseChord(text), expected)) return text;
  }
  return write(root, notation) + chord.suffix + tail;
}

// Devuelve el acorde transportado como texto, en el mismo cifrado y con el
// mismo sufijo con que lo escribió el usuario («Lam7» → «Mim7»).
export function transposeChord(chord, from, to) {
  const bass = chord.bass ? transposeNote(chord.bass, from, to) : null;
  return writeChord(chord, chord.notation, transposeNote(chord.root, from, to), bass);
}

// Cambia cada acorde de un texto con fn(acorde) y deja igual todo lo demás:
// lo que no se reconoce como acorde y los separadores («|», comas…).
function mapChords(text, fn) {
  const chords = parseProgression(text);
  let out = '';
  let pos = 0;
  tokenSpans(text).forEach(({ token, start, end }, i) => {
    out += text.slice(pos, start) + (chords[i].ok ? fn(chords[i]) : token);
    pos = end;
  });
  return out + text.slice(pos);
}

// Transporta un texto entero.
export function transposeText(text, from, to) {
  return mapChords(text, (c) => transposeChord(c, from, to));
}

// Reescribe un texto en cifrado americano o latino («Lam Fa | Do» ↔ «Am F | C»).
export function convertNotation(text, notation) {
  return mapChords(text, (c) => writeChord(c, notation));
}

// Semitonos del camino más corto entre dos tónicas (de −5 a +6).
export function semitonesBetween(from, to) {
  const d = (((to.pc - from.pc) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}
