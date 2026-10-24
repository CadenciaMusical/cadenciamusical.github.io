// Teclado de piano en SVG con las notas del acorde marcadas.

import { Note } from '../../vendor/tonal.mjs';
import { noteName } from '../core/names.js';

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
  const names = []; // { name, x, bass } para la fila de debajo
  let x = 0;
  for (let m = start; m <= end; m++) {
    const key = byMidi.get(m);
    const cls = `key ${WHITE_PCS.includes(m % 12) ? 'white' : 'black'}${key ? ' on' : ''}${key?.bass ? ' bass' : ''}`;
    if (WHITE_PCS.includes(m % 12)) {
      whites.push(`<rect class="${cls}" data-midi="${m}" x="${x + 0.5}" y="0.5" width="${W - 1}" height="${H - 1}" rx="3"/>`);
      if (key) {
        whites.push(label(key, x + W / 2, H - 10, W - 4));
        names.push({ ...key, x: x + W / 2 });
      }
      x += W;
    } else {
      // Las negras se dibujan después, encima de las blancas.
      blacks.push(`<rect class="${cls}" data-midi="${m}" x="${x - BW / 2}" y="0.5" width="${BW}" height="${BH}" rx="2"/>`);
      if (key) {
        blacks.push(label(key, x, BH - 9, BW - 3));
        names.push({ ...key, x });
      }
    }
  }
  const all = keys.map((k) => noteName(k.name)).join(', ');
  return `<svg class="piano" viewBox="0 0 ${x} ${H}" role="img" aria-label="Teclado de piano con las notas ${all}">${whites.join('')}${blacks.join('')}</svg>${nameRow(names, x)}`;
}

// Tamaño de letra (en unidades del dibujo) para que el nombre quepa en la
// tecla: «Do♯» en una negra va más pequeño que «Do» en una blanca.
const MAX_FONT = 10;
const CHAR_WIDTH = 0.62; // ancho medio de un carácter, en em

export function labelSize(text, room) {
  return Math.min(MAX_FONT, Math.floor((room / (text.length * CHAR_WIDTH)) * 10) / 10);
}

function label(key, x, y, room) {
  const text = noteName(key.name);
  return `<text class="key-label" x="${x}" y="${y}" text-anchor="middle" font-size="${labelSize(text, room)}">${text}</text>`;
}

// En pantallas estrechas las etiquetas de dentro serían diminutas: los nombres
// van en una fila debajo del teclado, cada uno bajo su tecla (ver el CSS). Si
// dos quedan demasiado juntos, el segundo baja a otra línea.
const MIN_GAP = 9; // % del ancho

function nameRow(names, width) {
  names.sort((a, b) => a.x - b.x);
  let last = -Infinity;
  let line = 0;
  const spans = names.map((n) => {
    const left = (n.x / width) * 100;
    line = left - last < MIN_GAP && line === 0 ? 1 : 0;
    if (line === 0) last = left;
    return `<span class="${n.bass ? 'bass' : ''}${line ? ' second' : ''}" style="left: ${left.toFixed(2)}%">${noteName(n.name)}</span>`;
  });
  const lines = spans.some((s) => s.includes('second')) ? ' two-lines' : '';
  return `<div class="piano-names${lines}" aria-hidden="true">${spans.join('')}</div>`;
}
