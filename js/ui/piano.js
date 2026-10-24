// Teclado de piano en SVG con las notas del acorde marcadas.

import { Note } from '../../vendor/tonal.mjs';
import { latinNote } from '../core/names.js';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const W = 28; // tecla blanca
const H = 112;
const BW = 17; // tecla negra
const BH = 70;

// Posición fundamental: la raíz entre Do4 y Si4 y el resto de notas por encima.
// En un acorde con bajo («C/E»), el bajo va una octava más abajo.
export function pianoVoicing(chord) {
  const keys = [];
  let last = 59 + chord.pc;
  for (const name of chord.notes) {
    const pc = Note.chroma(name);
    const midi = last + 1 + ((((pc - (last + 1)) % 12) + 12) % 12);
    keys.push({ midi, name });
    last = midi;
  }
  if (chord.bass) keys.unshift({ midi: 48 + Note.chroma(chord.bass), name: chord.bass, bass: true });
  return keys;
}

// Dos octavas como mínimo, empezando en el Do de la nota más grave.
export function renderPiano(chord) {
  const keys = pianoVoicing(chord);
  const byMidi = new Map(keys.map((k) => [k.midi, k]));
  const start = Math.floor(keys[0].midi / 12) * 12;
  const end = Math.max(start + 23, Math.ceil((keys[keys.length - 1].midi + 1) / 12) * 12 - 1);

  const whites = [];
  const blacks = [];
  let x = 0;
  for (let m = start; m <= end; m++) {
    const key = byMidi.get(m);
    const cls = `key ${WHITE_PCS.includes(m % 12) ? 'white' : 'black'}${key ? ' on' : ''}${key?.bass ? ' bass' : ''}`;
    if (WHITE_PCS.includes(m % 12)) {
      whites.push(`<rect class="${cls}" data-midi="${m}" x="${x + 0.5}" y="0.5" width="${W - 1}" height="${H - 1}" rx="3"/>`);
      if (key) whites.push(label(key, x + W / 2, H - 10));
      x += W;
    } else {
      // Las negras se dibujan después, encima de las blancas.
      blacks.push(`<rect class="${cls}" data-midi="${m}" x="${x - BW / 2}" y="0.5" width="${BW}" height="${BH}" rx="2"/>`);
      if (key) blacks.push(label(key, x, BH - 9));
    }
  }
  const names = keys.map((k) => latinNote(k.name)).join(', ');
  return `<svg class="piano" viewBox="0 0 ${x} ${H}" role="img" aria-label="Teclado de piano con las notas ${names}">${whites.join('')}${blacks.join('')}</svg>`;
}

function label(key, x, y) {
  return `<text class="key-label" x="${x}" y="${y}" text-anchor="middle">${latinNote(key.name)}</text>`;
}
