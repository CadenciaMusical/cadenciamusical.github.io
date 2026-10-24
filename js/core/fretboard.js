// Posiciones de acordes en la guitarra.
//
// Las cuerdas van de la 6.ª (Mi grave) a la 1.ª (Mi agudo). Cada posición es
// una lista de 6 trastes: 0 = al aire, null = no se toca.
// Primero se buscan los acordes abiertos de siempre; después, las cejillas
// con forma de Mi (raíz en la 6.ª cuerda) y de La (raíz en la 5.ª).

import { Note } from '../../vendor/tonal.mjs';

export const TUNING = [40, 45, 50, 55, 59, 64]; // Mi2 La2 Re3 Sol3 Si3 Mi4 (MIDI)

const x = null;

// Acordes abiertos, por nota (clase de altura) y tipo.
const OPEN = {
  'C:M': [x, 3, 2, 0, 1, 0],
  'A:M': [x, 0, 2, 2, 2, 0],
  'G:M': [3, 2, 0, 0, 0, 3],
  'E:M': [0, 2, 2, 1, 0, 0],
  'D:M': [x, x, 0, 2, 3, 2],
  'A:m': [x, 0, 2, 2, 1, 0],
  'E:m': [0, 2, 2, 0, 0, 0],
  'D:m': [x, x, 0, 2, 3, 1],
  'C:7': [x, 3, 2, 3, 1, 0],
  'A:7': [x, 0, 2, 0, 2, 0],
  'G:7': [3, 2, 0, 0, 0, 1],
  'E:7': [0, 2, 0, 1, 0, 0],
  'D:7': [x, x, 0, 2, 1, 2],
  'B:7': [x, 2, 1, 2, 0, 2],
  'A:m7': [x, 0, 2, 0, 1, 0],
  'E:m7': [0, 2, 0, 0, 0, 0],
  'D:m7': [x, x, 0, 2, 1, 1],
  'C:maj7': [x, 3, 2, 0, 0, 0],
  'F:maj7': [x, x, 3, 2, 1, 0],
  'G:maj7': [3, 2, 0, 0, 0, 2],
  'A:maj7': [x, 0, 2, 1, 2, 0],
  'D:maj7': [x, x, 0, 2, 2, 2],
  'E:maj7': [0, 2, 1, 1, 0, 0],
  'A:sus4': [x, 0, 2, 2, 3, 0],
  'D:sus4': [x, x, 0, 2, 3, 3],
  'E:sus4': [0, 2, 2, 2, 0, 0],
  'A:sus2': [x, 0, 2, 2, 0, 0],
  'D:sus2': [x, x, 0, 2, 3, 0],
};

const OPEN_BY_PC = new Map(
  Object.entries(OPEN).map(([k, frets]) => {
    const [root, type] = k.split(':');
    return [`${Note.chroma(root)}:${type}`, frets];
  }),
);

// Formas móviles: trastes relativos al de la cejilla.
const SHAPES = {
  E: {
    string: 0,
    types: {
      M: [0, 2, 2, 1, 0, 0],
      m: [0, 2, 2, 0, 0, 0],
      7: [0, 2, 0, 1, 0, 0],
      m7: [0, 2, 0, 0, 0, 0],
      maj7: [0, x, 1, 1, 0, x],
      m7b5: [0, x, 0, 0, -1, x],
      sus4: [0, 2, 2, 2, 0, 0],
      aug: [0, x, 2, 1, 1, x],
      5: [0, 2, 2, x, x, x],
    },
  },
  A: {
    string: 1,
    types: {
      M: [x, 0, 2, 2, 2, 0],
      m: [x, 0, 2, 2, 1, 0],
      7: [x, 0, 2, 0, 2, 0],
      m7: [x, 0, 2, 0, 1, 0],
      maj7: [x, 0, 2, 1, 2, 0],
      mMaj7: [x, 0, 2, 1, 1, 0],
      m7b5: [x, 0, 1, 0, 1, x],
      dim: [x, 0, 1, 2, 1, x],
      dim7: [x, 0, 1, -1, 1, x],
      sus4: [x, 0, 2, 2, 3, 0],
      sus2: [x, 0, 2, 2, 0, 0],
      6: [x, 0, 2, 2, 2, 2],
      m6: [x, 0, 2, 2, 1, 2],
      9: [x, 0, -1, 0, 0, 0],
      5: [x, 0, 2, 2, x, x],
    },
  },
};

// Qué forma buscar para un acorde. Las notas añadidas que no tienen forma
// propia se dejan fuera (simplified = true).
export function shapeType(chord) {
  const has = (t) => chord.tensions.includes(t);
  if (chord.seventh === '7' && has('novena') && chord.triad === 'M') return { type: '9', simplified: chord.tensions.length > 1 };
  if (chord.seventh) {
    const type = chord.triad === 'sus' ? '7' : chord.seventh;
    return { type, simplified: chord.tensions.length > 0 || chord.triad === 'sus' };
  }
  if (!chord.seventh && has('sexta') && (chord.triad === 'M' || chord.triad === 'm')) {
    return { type: chord.triad === 'M' ? '6' : 'm6', simplified: chord.tensions.length > 1 };
  }
  if (chord.triad === 'sus') return { type: chord.suffix.includes('sus2') ? 'sus2' : 'sus4', simplified: false };
  return { type: chord.triad, simplified: chord.tensions.length > 0 };
}

function midisOf(frets) {
  return frets.map((f, i) => (f === null ? null : TUNING[i] + f));
}

// Todas las posiciones razonables, de la más sencilla a la más difícil.
// Devuelve [{ frets, barre: fret | null, midis, open }].
export function guitarVoicings(chord) {
  const { type, simplified } = shapeType(chord);
  const out = [];
  const open = OPEN_BY_PC.get(`${chord.pc}:${type}`);
  if (open) out.push({ frets: open, barre: null, open: true });

  for (const shape of Object.values(SHAPES)) {
    const rel = shape.types[type];
    if (!rel) continue;
    let fret = (chord.pc - TUNING[shape.string] + 120) % 12;
    // Si la forma necesita un traste por debajo de la cejilla, se sube una octava.
    if (fret + Math.min(...rel.filter((f) => f !== null)) < 0) fret += 12;
    const frets = rel.map((f) => (f === null ? null : f + fret));
    // Con la cejilla en el traste 0, la forma ya es un acorde abierto.
    const isOpen = fret === 0;
    if (out.some((v) => v.frets.join() === frets.join())) continue;
    out.push({ frets, barre: isOpen ? null : fret, open: isOpen });
  }

  out.sort((a, b) => Number(b.open) - Number(a.open) || highestFret(a) - highestFret(b));
  return out.map((v) => ({ ...v, midis: midisOf(v.frets), simplified }));
}

const highestFret = (v) => Math.max(...v.frets.filter((f) => f !== null));
