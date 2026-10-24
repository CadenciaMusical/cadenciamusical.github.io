// Qué papel tiene un acorde dentro de una tonalidad concreta.

import { DEGREES, PARALLEL, romanFor } from './theory.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

// Los acordes suspendidos y de quinta no tienen tercera: encajan en
// cualquier grado mayor o menor que tenga la misma raíz.
function triadMatches(chordTriad, degreeTriad) {
  if (chordTriad === degreeTriad) return true;
  return (chordTriad === 'sus' || chordTriad === '5') && degreeTriad !== 'dim';
}

function findDegree(st, chord, mode) {
  return DEGREES[mode].find((d) => d.st === st && triadMatches(chord.triad, d.triad));
}

// Un grado de la tonalidad al que se puede «llegar» (no disminuido).
const targetDegree = (st, mode) => DEGREES[mode].find((d) => d.st === st && d.triad !== 'dim');

const isDominantShape = (c) => (c.triad === 'M' && (!c.seventh || c.seventh === '7')) || (c.triad === 'sus' && c.seventh === '7');

// key: { pc, mode, blues? }. next: el acorde siguiente (o null).
// Devuelve { st, roman, fn, kind, fit, target? }.
//   kind: 'diatonic'  — pertenece a la tonalidad
//         'blues'     — I7 o IV7 de un blues
//         'color'     — pertenece, pero con una séptima que no es de la tonalidad
//         'secondary' — dominante secundaria (V/x)
//         'leading'   — disminuido que lleva al acorde de un semitono por encima (vii°/x)
//         'tritone'   — sustituto tritonal de una dominante (subV/x)
//         'borrowed'  — préstamo de la tonalidad paralela (mayor ↔ menor)
//         'chromatic' — ajeno a la tonalidad
//   fit: cuánto apoya este acorde a la tonalidad (lo usa la detección).
//   target: { st, triad, roman, resolves } — el acorde hacia el que empuja.
export function classify(chord, key, next = null) {
  const st = mod12(chord.pc - key.pc);
  const roman = romanFor(st, chord.triad, chord.seventh, key.mode);
  const base = { st, roman };

  const degree = findDegree(st, chord, key.mode);
  if (degree) {
    if (!chord.seventh || degree.sev.includes(chord.seventh)) {
      return { ...base, fn: degree.fn, kind: 'diatonic', fit: 1 };
    }
    if (key.blues && chord.seventh === '7' && (st === 0 || st === 5)) {
      return { ...base, fn: degree.fn, kind: 'blues', fit: 1 };
    }
  }

  // Dominante secundaria: un acorde mayor (o con séptima de dominante) que
  // está una quinta por encima de otro grado de la tonalidad.
  if (isDominantShape(chord) && st !== 7) {
    const targetSt = mod12(st + 5);
    const target = targetDegree(targetSt, key.mode);
    if (target && targetSt !== 0) {
      const resolves = next && mod12(next.pc - key.pc) === targetSt;
      const targetRoman = romanFor(targetSt, target.triad, null, key.mode);
      return {
        ...base,
        roman: `V${chord.seventh ? '7' : ''}/${targetRoman}`,
        degreeRoman: roman,
        fn: 'D',
        kind: 'secondary',
        target: { st: targetSt, triad: target.triad, roman: targetRoman, resolves: Boolean(resolves) },
        fit: resolves ? 0.5 : -0.2,
      };
    }
  }

  // Los dos casos siguientes solo cuentan si el acorde de destino llega justo después.
  const nextSt = next ? mod12(next.pc - key.pc) : null;

  // Disminuido de paso: está un semitono por debajo del acorde al que va
  // (C#° → Dm en Do), igual que el vii° está por debajo del I.
  if (chord.triad === 'dim' && nextSt === mod12(st + 1)) {
    const target = targetDegree(nextSt, key.mode);
    if (target && nextSt !== 0) {
      const targetRoman = romanFor(nextSt, target.triad, null, key.mode);
      const mark = chord.seventh === 'm7b5' ? 'ø7' : chord.seventh === 'dim7' ? '°7' : '°';
      return {
        ...base,
        roman: `vii${mark}/${targetRoman}`,
        fn: 'D',
        kind: 'leading',
        target: { st: nextSt, triad: target.triad, roman: targetRoman, resolves: true },
        fit: 0.5,
      };
    }
  }

  // Sustituto tritonal: un acorde con séptima de dominante medio tono por
  // encima del acorde al que va (D♭7 → C), en lugar de la dominante normal (G7).
  if (chord.triad === 'M' && chord.seventh === '7' && nextSt === mod12(st - 1)) {
    const target = targetDegree(nextSt, key.mode);
    if (target) {
      const targetRoman = romanFor(nextSt, target.triad, null, key.mode);
      return {
        ...base,
        roman: nextSt === 0 ? 'subV7' : `subV7/${targetRoman}`,
        fn: 'D',
        kind: 'tritone',
        target: { st: nextSt, triad: target.triad, roman: targetRoman, resolves: true },
        fit: 0.5,
      };
    }
  }

  if (degree) return { ...base, fn: degree.fn, kind: 'color', fit: 0.6 };

  const borrowed = findDegree(st, chord, PARALLEL[key.mode]);
  if (borrowed) {
    return { ...base, fn: borrowed.fn, kind: 'borrowed', from: PARALLEL[key.mode], fit: 0.3 };
  }

  return { ...base, fn: null, kind: 'chromatic', fit: -0.5 };
}
