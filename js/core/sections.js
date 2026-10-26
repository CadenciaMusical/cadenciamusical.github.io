// Cambios de tonalidad (modulaciones): la progresión se parte en tramos, cada
// uno en su tonalidad.
//
// Un corte vale si:
//   - cada tramo tiene al menos tres acordes, y dos seguidos, tonalidades distintas;
//   - en su tonalidad, cada tramo solo tiene acordes de casa (o dominantes
//     secundarias que van a su destino) y pasa por su tónica: un préstamo
//     suelto o una dominante secundaria aislada no bastan para cambiar;
//   - el primer tramo empieza en su tónica: la casa de partida tiene que
//     quedar clara;
//   - el cambio se confirma: el nuevo tramo llega a su tónica desde su
//     dominante, o repite el primero tal cual, más arriba (el salto del
//     último estribillo).
// A la relativa (mismas notas) se le pide más: el nuevo tramo tiene que
// llegar a su tónica desde la dominante, y ninguno de los dos, a la tónica
// del otro (si no, solo la visita).
// Si toda la progresión ya encaja en una tonalidad, no hay cambio (salvo a la
// relativa, que usa las mismas notas): Lam Rem Sol Do Fa Si° Mi Lam es una
// secuencia de quintas en La menor, no «Fa mayor y luego La menor».
// Entre varias formas de partirla se elige la que mejor asienta cada tramo en
// su tonalidad (scoreKey: empezar y acabar en la tónica, cadencias…), con los
// menos tramos posibles.

import { detectKey, scoreKey, isRelative, isTonicChord, loopPeriod } from './key.js';
import { classify } from './classify.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

const MIN = 3;

// Lo que cuenta como «de la tonalidad» dentro de un tramo.
const HOME = new Set(['diatonic', 'blues', 'suspension', 'secondary', 'leading', 'altered', 'dim7', 'augmented']);

const isDominantChord = (chord, key) => mod12(chord.pc - key.pc) === 7 && (chord.triad === 'M' || chord.altered);

const sameKey = (a, b) => a.pc === b.pc && a.mode === b.mode;

function fits(chords, key) {
  return chords.every((c, i) => HOME.has(classify(c, key, chords[i + 1] ?? null, chords[i - 1] ?? null, chords[i + 2] ?? null).kind));
}

const hasCadence = (chords, key) => chords.some((c, i) => i + 1 < chords.length && isDominantChord(c, key) && isTonicChord(chords[i + 1], key));

// ¿El tramo b repite el a (o su principio) tal cual, a otra altura?
function repeats(a, b) {
  const shift = mod12(b[0].pc - a[0].pc);
  const n = Math.min(a.length, b.length);
  return shift !== 0 && n >= MIN && a.slice(0, n).every((c, i) => mod12(b[i].pc - c.pc) === shift && b[i].triad === c.triad && b[i].seventh === c.seventh);
}

// Las tonalidades que se prueban para un tramo: las más probables según
// detectKey. Con pocas, la primera puede fallar por poco: D7 G D7 G, como
// bucle, sale en Re (empieza ahí), pero es el V7–I de Sol.
const candidates = (chords) => detectKey(chords).ranking.slice(0, 4);

// Cada tramo de más resta: entre dos formas de partirla, la de menos tramos.
const PER_SECTION = 1.5;

// Programación dinámica sobre los tramos posibles [i, j) y su tonalidad: el
// mejor reparto que llega hasta j acabando en ese tramo. Devuelve los tramos
// [{ start, end, key }] o null.
function bestSections(chords) {
  const n = chords.length;
  // Tramos válidos en una tonalidad, con su puntuación.
  const spans = [];
  for (let i = 0; i + MIN <= n; i++) {
    for (let j = i + MIN; j <= n; j++) {
      if (j < n && n - j < MIN) continue;
      const part = chords.slice(i, j);
      for (const key of candidates(part)) {
        if (!fits(part, key) || !part.some((c) => isTonicChord(c, key))) continue;
        if (i === 0 && !isTonicChord(part[0], key)) continue;
        spans.push({ i, j, key, part, score: scoreKey(part, key).score - PER_SECTION, cadence: hasCadence(part, key) });
      }
    }
  }
  const best = new Map(); // tramo → { total, prev }
  for (const span of spans.filter((sp) => sp.i === 0)) best.set(span, { total: span.score, prev: null });
  for (const span of spans) {
    if (span.i === 0) continue;
    for (const prev of spans) {
      if (prev.j !== span.i || !best.has(prev) || sameKey(prev.key, span.key)) continue;
      const repeated = repeats(prev.part, span.part);
      if (!span.cadence && !repeated) continue;
      if (isRelative(prev.key, span.key) && !(span.cadence && !hasCadence(span.part, prev.key) && !hasCadence(prev.part, span.key))) continue;
      const total = best.get(prev).total + span.score;
      if (!best.has(span) || total > best.get(span).total) best.set(span, { total, prev });
    }
  }
  let end = null;
  for (const span of spans) {
    if (span.j === n && span.i > 0 && best.has(span) && (!end || best.get(span).total > best.get(end).total)) end = span;
  }
  if (!end) return null;
  const out = [];
  for (let sp = end; sp; sp = best.get(sp).prev) out.unshift({ start: sp.i, end: sp.j - 1, key: sp.key });
  return out;
}

// Tipo de cambio, para explicarlo:
//   'relative'    — a la relativa (mismas notas)
//   'dominant'    — a la tonalidad de la dominante (una quinta arriba)
//   'subdominant' — a la de la subdominante (una quinta abajo)
//   'parallel'    — misma tónica, otro modo (Do mayor → Do menor)
//   'lift'        — medio tono o un tono arriba, al final (el último estribillo)
//   'distant'     — cualquier otra: un cambio brusco
// La armadura de cada tonalidad, en quintas (Do mayor 0, Sol mayor 1, Fa mayor −1…).
const fifths = (key) => {
  const pc = key.mode === 'minor' ? mod12(key.pc + 3) : key.pc;
  const f = mod12(pc * 7);
  return f > 6 ? f - 12 : f;
};

export function modulationType(from, to, { last = false } = {}) {
  if (isRelative(from, to)) return 'relative';
  if (from.pc === to.pc) return 'parallel';
  const up = mod12(to.pc - from.pc);
  if (from.mode === to.mode && (up === 1 || up === 2) && last) return 'lift';
  if (from.mode === to.mode && up === 7) return 'dominant';
  if (from.mode === to.mode && up === 5) return 'subdominant';
  return Math.abs(fifths(to) - fifths(from)) <= 1 ? 'near' : 'distant';
}

// chords: los acordes leídos. Devuelve los tramos, [{ start, end, key, type }]
// (type: cómo se llega desde el anterior; null en el primero), o null si no
// hay cambio de tonalidad. Un bucle no cambia: vuelve a empezar.
export function detectSections(chords) {
  if (chords.length < 2 * MIN || loopPeriod(chords)) return null;
  const sections = bestSections(chords);
  if (!sections) return null;
  const relative = sections.every((s, i) => i === 0 || isRelative(sections[i - 1].key, s.key));
  if (!relative && fits(chords, detectKey(chords).key)) return null;
  return sections.map((s, i) => ({
    ...s,
    type: i === 0 ? null : modulationType(sections[i - 1].key, s.key, { last: i === sections.length - 1 }),
  }));
}
