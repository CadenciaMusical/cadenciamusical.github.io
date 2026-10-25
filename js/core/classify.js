// Qué papel tiene un acorde dentro de una tonalidad concreta.

import { Note } from '../../vendor/tonal.mjs';
import { DEGREES, PARALLEL, romanFor, stepBetween } from './theory.js';

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

// Función de los acordes de un modo que no tienen grado en mayor ni en menor:
// el ♭II del frigio empuja hacia la tónica, como una dominante.
const MODAL_FN = { 1: 'D' };

const isDominantShape = (c) => (c.triad === 'M' && (!c.seventh || c.seventh === '7')) || (c.triad === 'sus' && c.seventh === '7');

// El °7 tiene sus cuatro notas a la misma distancia (tres semitonos), así
// que cualquiera puede hacer de raíz: F°7 = A♭°7 = B°7 = D°7. Se prueba
// cada lectura y se elige la que mejor explica adónde va, en este orden:
//   'tonic'     — una nota es la sensible de la tónica, y va a la tónica (vii°7)
//   'secondary' — una nota está medio tono por debajo del grado al que va (vii°7/x)
//   'common'    — comparte con el siguiente su raíz, y lo adorna (C°7 → C)
//   'passing'   — va por grado conjunto, o sigue a otro °7 en paralelo
// readAs: la raíz con que se lee (B en F°7 → C). Devuelve null si nada encaja.
function classifyDim7(chord, key, next, prev, base) {
  const notes = [0, 3, 6, 9].map((i) => mod12(chord.pc + i));
  const nextSt = next ? mod12(next.pc - key.pc) : null;
  // Un disminuido no hace de destino.
  const arrives = next && next.triad !== 'dim';
  const leadsTo = arrives && notes.includes(mod12(next.pc - 1));
  const below = (note) => {
    const n = Note.transpose(note, '-2m');
    // Solo se simplifican los dobles sostenidos o bemoles (F## → G).
    return /##|bb/.test(n.slice(1)) ? Note.simplify(n) : n;
  };

  if (leadsTo && nextSt === 0) {
    const target = targetDegree(0, key.mode);
    return {
      ...base,
      roman: 'vii°7',
      fn: 'D',
      kind: 'dim7',
      role: 'tonic',
      readAs: below(next.root),
      // En mayor, viene de la menor, donde es el acorde de la sensible.
      from: key.mode === 'major' ? 'minor' : null,
      target: { st: 0, triad: target.triad, roman: romanFor(0, target.triad, null, key.mode), resolves: true },
      fit: 0.6,
    };
  }

  const target = arrives && nextSt !== 0 ? targetDegree(nextSt, key.mode) : null;
  if (leadsTo && target) {
    const targetRoman = romanFor(nextSt, target.triad, null, key.mode);
    return {
      ...base,
      roman: `vii°7/${targetRoman}`,
      fn: 'D',
      kind: 'dim7',
      role: 'secondary',
      readAs: below(next.root),
      target: { st: nextSt, triad: target.triad, roman: targetRoman, resolves: true },
      fit: 0.5,
    };
  }

  // Los dos últimos no dicen nada de la tonalidad: no suman ni restan.
  if (arrives && notes.includes(next.pc)) {
    const triad = targetDegree(nextSt, key.mode)?.triad ?? next.triad;
    return {
      ...base,
      roman: romanFor(nextSt, 'dim', 'dim7', key.mode),
      fn: 'P',
      kind: 'dim7',
      role: 'common',
      readAs: next.root,
      target: { st: nextSt, triad, roman: romanFor(nextSt, triad, null, key.mode), resolves: true },
      fit: 0,
    };
  }

  const toNext = next ? stepBetween(chord.pc, next.pc) : 0;
  const fromPrev = prev?.seventh === 'dim7' ? stepBetween(prev.pc, chord.pc) : 0;
  if (toNext || fromPrev) {
    return {
      ...base,
      fn: 'P',
      kind: 'dim7',
      role: 'passing',
      // Si sigue a otro °7 en paralelo, se cuenta desde él; until lo pone analyze().
      passing: toNext
        ? { semitones: toNext, parallel: next.seventh === 'dim7', prev: null, next }
        : { semitones: fromPrev, parallel: true, prev, next },
      fit: 0,
    };
  }
  return null;
}

// Como el °7, el aumentado es simétrico (sus tres notas están a cuatro
// semitonos): C+ = E+ = G♯+. Si una de sus lecturas es la quinta del acorde
// siguiente, es una dominante con la quinta subida medio tono:
//   'dominant'  — va a la tónica (V+)
//   'secondary' — va a otro grado (V+/x)
// readAs: la raíz con que se lee (G en B+ → C). Si no, null.
function classifyAug(chord, key, next, base) {
  if (!next || (next.triad !== 'M' && next.triad !== 'm')) return null;
  const notes = [0, 4, 8].map((i) => mod12(chord.pc + i));
  if (!notes.includes(mod12(next.pc + 7))) return null;
  const nextSt = mod12(next.pc - key.pc);
  const target = targetDegree(nextSt, key.mode);
  if (!target) return null;
  const fifth = Note.transpose(next.root, '5P');
  const readAs = /##|bb/.test(fifth.slice(1)) ? Note.simplify(fifth) : fifth;
  const seventh = chord.seventh === '7' ? '7' : '';
  const targetRoman = romanFor(nextSt, target.triad, null, key.mode);
  return {
    ...base,
    roman: nextSt === 0 ? `V+${seventh}` : `V+${seventh}/${targetRoman}`,
    fn: 'D',
    kind: 'augmented',
    role: nextSt === 0 ? 'dominant' : 'secondary',
    readAs,
    target: { st: nextSt, triad: target.triad, roman: targetRoman, resolves: true },
    fit: nextSt === 0 ? 0.5 : 0.4,
  };
}

// Sin tonalidad clara (ver analyze): el acorde, sin grado ni función.
export const classifyAlone = () => ({ st: null, roman: '', fn: 'N', kind: 'symmetric', fit: 0 });

// key: { pc, mode, blues? }. next: el acorde siguiente (o null); prev, el anterior.
// Devuelve { st, roman, fn, kind, fit, target? }. fn: T, S, D, P (de paso), N (sin tonalidad) o null.
//   kind: 'diatonic'  — pertenece a la tonalidad
//         'blues'     — I7 o IV7 de un blues
//         'suspension'— un sus de la tonalidad que se resuelve en el acorde
//                       siguiente, con la misma raíz (Gsus4 → G)
//         'color'     — pertenece, pero con una séptima que no es de la tonalidad
//         'secondary' — dominante secundaria (V/x)
//         'leading'   — disminuido que lleva al acorde de un semitono por encima (vii°/x)
//         'tritone'   — sustituto tritonal de una dominante (subV/x)
//         'augmented' — dominante aumentada (V+ o V+/x; ver classifyAug)
//         'symmetric' — sin tonalidad clara (ver classifyAlone)
//         'dim7'      — disminuido con séptima, leído con el nombre que
//                       explica adónde va (ver classifyDim7)
//         'dorian'    — el IV mayor en una tonalidad menor («cuarto dórico»)
//         'modal'     — es del modo de la progresión, no del mayor o el menor
//         'borrowed'  — préstamo de la tonalidad paralela (mayor ↔ menor)
//         'chromatic' — ajeno a la tonalidad
//   fit: cuánto apoya este acorde a la tonalidad (lo usa la detección).
//   target: { st, triad, roman, resolves } — el acorde hacia el que empuja.
export function classify(chord, key, next = null, prev = null) {
  const result = classifyChord(chord, key, next, prev);
  if (chord.triad !== 'sus') return result;
  // Vsus4 o Vsus2: sin la tercera, la nota que la sustituye.
  const sus = /sus2/.test(chord.suffix) ? 'sus2' : 'sus4';
  const roman = result.roman.replace(/sus$/, sus);
  if (result.kind === 'diatonic' && next && next.pc === chord.pc && (next.triad === 'M' || next.triad === 'm')) {
    return { ...result, roman, kind: 'suspension', sus, resolvesTo: { triad: next.triad, seventh: next.seventh } };
  }
  return { ...result, roman };
}

function classifyChord(chord, key, next, prev) {
  const st = mod12(chord.pc - key.pc);
  const roman = romanFor(st, chord.triad, chord.seventh, key.mode);
  const base = { st, roman };

  // En un modo (key.modal), sus acordes son de casa aunque no lo sean del
  // mayor o el menor de siempre: el IV mayor del dórico, el ♭II del frigio.
  const own = key.modal?.degrees.find((d) => d.st === st && triadMatches(chord.triad, d.triad));
  if (own && (!chord.seventh || chord.seventh === own.seventh)) {
    const plain = findDegree(st, chord, key.mode);
    if (plain) return { ...base, fn: plain.fn, kind: 'diatonic', fit: 1 };
    // La tónica es la casa, aunque sea mayor en un modo menor (frigio dominante).
    if (st === 0) return { ...base, fn: 'T', kind: 'diatonic', fit: 1 };
    const fn = findDegree(st, chord, PARALLEL[key.mode])?.fn ?? MODAL_FN[st] ?? 'S';
    return { ...base, fn, kind: 'modal', fit: 1 };
  }

  const degree = findDegree(st, chord, key.mode);
  if (degree) {
    if (!chord.seventh || degree.sev.includes(chord.seventh)) {
      return { ...base, fn: degree.fn, kind: 'diatonic', fit: 1 };
    }
    if (key.blues && chord.seventh === '7' && (st === 0 || st === 5)) {
      return { ...base, fn: degree.fn, kind: 'blues', fit: 1 };
    }
  }

  if (chord.seventh === 'dim7') {
    const dim = classifyDim7(chord, key, next, prev, base);
    if (dim) return dim;
  }
  if (chord.triad === 'aug') {
    const aug = classifyAug(chord, key, next, base);
    if (aug) return aug;
  }

  // Dominante secundaria: un acorde mayor (o con séptima de dominante) que
  // está una quinta por encima de otro grado de la tonalidad y va a él, o a
  // su sustituto tritonal (D7 → D♭7 → C). Si no va, se busca otra explicación.
  if (isDominantShape(chord) && st !== 7) {
    const targetSt = mod12(st + 5);
    const target = targetDegree(targetSt, key.mode);
    const nextAt = next && mod12(next.pc - key.pc);
    const resolves = nextAt === targetSt || (nextAt === mod12(targetSt + 6) && next.triad === 'M' && next.seventh === '7');
    if (target && targetSt !== 0 && resolves) {
      const targetRoman = romanFor(targetSt, target.triad, null, key.mode);
      return {
        ...base,
        roman: `V${chord.seventh ? '7' : ''}/${targetRoman}`,
        degreeRoman: roman,
        fn: 'D',
        kind: 'secondary',
        target: { st: targetSt, triad: target.triad, roman: targetRoman, resolves: true },
        fit: 0.5,
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

  // En menor, el IV mayor (D en La menor) toma la sexta nota del dórico o de
  // la menor melódica: es el «cuarto dórico».
  if (key.mode === 'minor' && st === 5 && chord.triad === 'M' && (!chord.seventh || chord.seventh === '7')) {
    return { ...base, fn: 'S', kind: 'dorian', fit: 0.3 };
  }

  const borrowed = findDegree(st, chord, PARALLEL[key.mode]);
  if (borrowed) {
    return { ...base, fn: borrowed.fn, kind: 'borrowed', from: PARALLEL[key.mode], fit: 0.3 };
  }

  return { ...base, fn: null, kind: 'chromatic', fit: -0.5 };
}
