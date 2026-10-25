// El bajo: la nota más grave de cada acorde (la de después de la barra en
// «G/B», o la raíz si no hay barra).

import { Note } from '../../vendor/tonal.mjs';
import { stepBetween } from './theory.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

const SCALE = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export const bassNote = (chord) => chord.bass ?? chord.root;
const bassPc = (chord) => Note.chroma(bassNote(chord));

// Las líneas de bajo que bajan o suben por grados conjuntos (uno o dos
// semitonos cada vez, siempre en la misma dirección) durante al menos cuatro
// acordes. Cada una: { start, end, dir: 'down' | 'up', notes, midis, chromatic }.
//   chromatic: alguna nota no es de la escala de la tonalidad, o hay dos
//   pasos de medio tono seguidos.
//   midis: para oír solo el bajo, en un registro grave.
export function bassLines(chords, key) {
  const pcs = chords.map(bassPc);
  const lines = [];
  let i = 0;
  while (i < chords.length - 1) {
    const dir = Math.sign(stepBetween(pcs[i], pcs[i + 1]));
    if (!dir) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j + 1 < chords.length && Math.sign(stepBetween(pcs[j], pcs[j + 1])) === dir) j++;
    if (j - i + 1 >= 4) lines.push(describeLine(chords, pcs, i, j, dir, key));
    i = j;
  }
  return lines;
}

function describeLine(chords, pcs, start, end, dir, key) {
  const steps = [];
  for (let k = start; k < end; k++) steps.push(stepBetween(pcs[k], pcs[k + 1]));
  const scale = SCALE[key.mode];
  const outside = pcs.slice(start, end + 1).some((pc) => !scale.includes(mod12(pc - key.pc)));
  const halfSteps = steps.some((s, k) => Math.abs(s) === 1 && Math.abs(steps[k + 1] ?? 0) === 1);
  // Del Do3 hacia abajo o hacia arriba, sin salirse de un registro de bajo.
  let midis = [48 + pcs[start]];
  for (const s of steps) midis.push(midis[midis.length - 1] + s);
  while (Math.min(...midis) < 36) midis = midis.map((m) => m + 12);
  while (Math.max(...midis) > 62) midis = midis.map((m) => m - 12);
  return {
    start,
    end,
    dir: dir < 0 ? 'down' : 'up',
    notes: chords.slice(start, end + 1).map(bassNote),
    midis,
    chromatic: outside || halfSteps,
  };
}

// Qué nota del acorde va en el bajo en un acorde con barra:
// 'third' (primera inversión), 'fifth' (segunda), 'seventh' (tercera) u
// 'other' (una nota que no es del acorde). connects: el bajo va por grado
// conjunto al del acorde siguiente. Sin barra, null.
export function inversionOf(chord, next = null) {
  if (!chord.bass) return null;
  const st = mod12(Note.chroma(chord.bass) - chord.pc);
  const third = chord.triad === 'M' || chord.triad === 'aug' ? 4 : chord.triad === 'm' || chord.triad === 'dim' ? 3 : null;
  const fifth = chord.triad === 'dim' ? 6 : chord.triad === 'aug' ? 8 : 7;
  const seventh = { 7: 10, m7: 10, m7b5: 10, maj7: 11, mMaj7: 11, dim7: 9 }[chord.seventh];
  const type = st === third ? 'third' : st === fifth ? 'fifth' : st === seventh ? 'seventh' : 'other';
  const connects = Boolean(next) && stepBetween(bassPc(chord), bassPc(next)) !== 0;
  return { type, connects };
}

// La nota pedal (ver pedalOf en core/key.js): { note, midis }, o null.
//   note: como la escribió el usuario. midis: el bajo de cada acorde, entre Mi1 y Re♯2.
export function pedalLine(chords, pc) {
  if (pc === null) return null;
  const note = chords.map(bassNote).find((n) => Note.chroma(n) === pc);
  return { note, midis: chords.map((c) => 40 + mod12(bassPc(c) - 4)) };
}
