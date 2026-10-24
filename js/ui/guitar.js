// Diagrama de acorde de guitarra en SVG: cuerdas en vertical, de la 6.ª
// (izquierda) a la 1.ª (derecha), y trastes en horizontal.

import { Note } from '../../vendor/tonal.mjs';
import { latinNote } from '../core/names.js';
import { TUNING } from '../core/fretboard.js';

const GAP = 30; // entre cuerdas
const ROW = 34; // entre trastes
const ROWS = 5;
const LEFT = 34;
const TOP = 34;

// Nombre de la nota que suena en cada cuerda, escrita como en el acorde.
function noteName(chord, midi) {
  const pc = midi % 12;
  const own = chord.notes.find((n) => Note.chroma(n) === pc);
  return latinNote(own ?? Note.fromMidi(midi).replace(/\d+$/, ''));
}

export function renderGuitar(chord, voicing) {
  const { frets, barre } = voicing;
  const fretted = frets.filter((f) => f !== null && f > 0);
  const top = Math.max(0, ...fretted);
  // Si todo cabe en los 4 primeros trastes se dibuja la cejuela; si no, se
  // empieza en el traste más bajo pisado y se indica su número.
  const base = top <= ROWS - 1 ? 1 : Math.min(...fretted);
  const width = LEFT + GAP * 5 + 24;
  const height = TOP + ROW * ROWS + 30;
  const sx = (i) => LEFT + i * GAP;
  const fy = (f) => TOP + (f - base) * ROW + ROW / 2;

  const parts = [];
  for (let r = 0; r <= ROWS; r++) {
    const y = TOP + r * ROW;
    const nut = r === 0 && base === 1;
    parts.push(`<line class="${nut ? 'nut' : 'fret'}" x1="${sx(0)}" x2="${sx(5)}" y1="${y}" y2="${y}"/>`);
  }
  for (let i = 0; i < 6; i++) parts.push(`<line class="string" x1="${sx(i)}" x2="${sx(i)}" y1="${TOP}" y2="${TOP + ROW * ROWS}"/>`);
  if (base > 1) parts.push(`<text class="fret-number" x="${LEFT - 12}" y="${TOP + ROW / 2 + 5}" text-anchor="end">${base}</text>`);

  if (barre !== null) {
    const on = frets.map((f, i) => (f === barre ? i : null)).filter((i) => i !== null);
    if (on.length >= 2) {
      const x1 = sx(on[0]) - 10;
      const x2 = sx(on[on.length - 1]) + 10;
      parts.push(`<rect class="barre" x="${x1}" y="${fy(barre) - 10}" width="${x2 - x1}" height="20" rx="10"/>`);
    }
  }

  frets.forEach((f, i) => {
    const x = sx(i);
    if (f === null) {
      parts.push(`<text class="mark" x="${x}" y="${TOP - 10}" text-anchor="middle">×</text>`);
      return;
    }
    if (f === 0) parts.push(`<circle class="open" cx="${x}" cy="${TOP - 15}" r="6"/>`);
    else parts.push(`<circle class="dot" cx="${x}" cy="${fy(f)}" r="10"/>`);
    parts.push(`<text class="string-note" x="${x}" y="${height - 6}" text-anchor="middle">${noteName(chord, TUNING[i] + f)}</text>`);
  });

  const desc = frets.map((f, i) => `${6 - i}.ª ${f === null ? 'no se toca' : f === 0 ? 'al aire' : `traste ${f}`}`).join(', ');
  return `<svg class="guitar" viewBox="0 0 ${width} ${height}" role="img" aria-label="Guitarra: ${desc}">${parts.join('')}</svg>`;
}
