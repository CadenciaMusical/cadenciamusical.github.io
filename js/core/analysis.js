// Punto de entrada del análisis: texto → acordes → tonalidad → grados y funciones.

import { parseProgression } from './parser.js';
import { detectKey, scoreKey, isRelative, isTonicChord, isLoopLike, loopPeriod, pedalOf, pentatonicOf, fifthAlternation } from './key.js';
import { classify, classifyAlone } from './classify.js';
import { findMatches, relativeOf } from './matcher.js';
import { detectModes, isClearlyModal, modeById, modeDegrees } from './modes.js';
import { bassLines, inversionOf, pedalLine } from './bass.js';
import { Note } from '../../vendor/tonal.mjs';

const mod12 = (n) => ((n % 12) + 12) % 12;

// forcedKey: { pc, mode, tonic } si el usuario ha elegido la tonalidad a mano.
export function analyze(text, { forcedKey = null } = {}) {
  const parsed = parseProgression(text);
  const chords = parsed.filter((c) => c.ok);
  const errors = parsed.filter((c) => !c.ok && !c.rest);
  // Dónde van los silencios («N.C.»): antes de qué acorde (su posición entre los acordes).
  const rests = [];
  parsed.reduce((n, c) => (c.rest ? (rests.push(n), n) : n + (c.ok ? 1 : 0)), 0);
  const detection = detectKey(chords);
  if (!detection) return { parsed, chords, errors, key: null, items: [], progressions: [], cadences: [], modes: null, modal: false, loop: null, bassLines: [], pedal: null, rests };

  let { key, alternative, confidence } = detection;
  if (forcedKey) {
    const { blues } = scoreKey(chords, forcedKey);
    const chosen = { ...forcedKey, blues };
    // La detectada pasa a ser la alternativa que se ofrece.
    alternative = key.pc === chosen.pc && key.mode === chosen.mode ? alternative : key;
    key = chosen;
  }

  // Si todos los acordes son simétricos (aumentados o °7), ninguno fija una
  // tonalidad: cualquiera de sus notas podría ser la casa. Lo mismo si salen
  // de una escala simétrica (tonos enteros o disminuida). Mejor decirlo.
  const symmetric = forcedKey ? null : symmetricScaleOf(chords);
  if (!forcedKey && (chords.every(isSymmetric) || symmetric)) {
    return {
      parsed, chords, errors, key, confidence: 'baja', forced: false, alternative: null, alternativeIsRelative: false,
      unclear: true,
      symmetricScale: symmetric,
      items: chords.map((chord) => ({ chord, ...classifyAlone(), special: true })),
      progressions: [], cadences: [], modes: null, modal: false, loop: null, bassLines: [], pedal: null, rests,
    };
  }

  const modes = detectModes(chords, key);
  // La tarjeta del modo solo se muestra si aporta algo.
  const modal = isClearlyModal(modes?.main, chords, key);
  // Si la progresión es claramente modal, su centro es la casa: Am D Am D
  // está en La dórico, no en Sol mayor (con D como V). Salvo que el usuario
  // haya elegido otra tonalidad a mano.
  if (modal && (!forcedKey || forcedKey.pc === modes.main.pc)) {
    key = modalKey(modes.main);
    // Si la ha elegido el usuario, la detectada sigue ahí para volver a ella.
    if (!forcedKey) {
      alternative = null;
      confidence = modalConfidence(modes.main, chords);
    } else if (alternative?.pc === key.pc && alternative.mode === key.mode) alternative = null;
  } else if (!forcedKey) {
    alternative = modalAlternative(modes, chords, key) ?? alternative;
    if (alternative && isLoopLike(chords) && !reasonableInLoop(alternative, chords, key)) alternative = null;
    // Mi Lam Mi Lam en Mi mayor: el Mi también puede ser el V de La menor.
    const fifths = fifthAlternation(chords);
    if (fifths && key.mode === 'major' && key.pc === fifths.dominant.pc) {
      alternative = detection.ranking.find((k) => k.mode === 'minor' && k.pc === fifths.tonic.pc) ?? alternative;
    }
  }

  const items = chords.map((chord, i) => ({ chord, ...classify(chord, key, chords[i + 1] ?? null, chords[i - 1] ?? null, chords[i + 2] ?? null) }));
  items.forEach((item, i) => {
    item.special = isSpecial(item, key);
    item.inversion = inversionOf(item.chord, chords[i + 1] ?? null);
    // El cuarto dórico con la sensible en otro acorde (Lam Re Mi Lam): juntos, la menor melódica.
    if (item.kind === 'dorian') item.melodic = chords.find((c) => c.notes.some((n) => mod12(Note.chroma(n) - key.pc) === 11)) ?? null;
  });
  const mediants = chromaticMediants(items);
  // Una cadena de °7 en paralelo (F°7 G°7 Cmaj7) va hasta el primer acorde que no lo es.
  items.forEach((item, i) => {
    if (item.passing?.parallel) item.passing.until = chords.slice(i + 1).find((c) => c.seventh !== 'dim7') ?? null;
  });
  const { progressions, cadences: found } = findMatches(chords, key, relativeOf(key));
  // Un bucle no acaba: vuelve al primer acorde. Su «final» no es una cadencia.
  const period = loopPeriod(chords);
  const loop = period && { period, times: chords.length / period };
  const cadences = loop ? found.filter((c) => !c.atEnd) : found;

  return {
    parsed,
    chords,
    errors,
    key,
    confidence,
    forced: Boolean(forcedKey),
    alternative,
    alternativeIsRelative: alternative ? isRelative(key, alternative) : false,
    items,
    progressions,
    cadences,
    modes,
    modal,
    loop,
    bassLines: bassLines(chords, key),
    pedal: pedalLine(chords, pedalOf(chords)),
    locrian: rozaLocrian(chords, key),
    pentatonic: pentatonicScale(chords, key),
    mediants,
    rests,
  };
}

// Mediantes cromáticas: dos acordes seguidos, los dos mayores (o los dos
// menores), con las fundamentales a una tercera y como mucho una nota en
// común (C E G → E G♯ B). Se buscan tramos seguidos (Do Mi La♭ Do) y solo
// cuentan si alguno de sus acordes no tiene otra explicación (un C → A♭ solo
// es el ♭VI prestado de siempre). Esos acordes pasan a ser kind 'mediant',
// con el vecino con que forman el salto (mediant.with) y las notas que
// comparten. Devuelve los tramos: [{ start, end, chain }]; chain: tres saltos
// iguales de tercera mayor que vuelven al primer acorde.
function chromaticMediants(items) {
  const pcs = (c) => new Set(c.notes.map((n) => Note.chroma(n)));
  const shared = (a, b) => a.notes.filter((n) => pcs(b).has(Note.chroma(n)));
  const jump = (a, b) => mod12(b.pc - a.pc);
  const related = (a, b) => (a.triad === 'M' || a.triad === 'm') && a.triad === b.triad && [3, 4, 8, 9].includes(jump(a, b)) && shared(a, b).length <= 1;
  const runs = [];
  for (let i = 0; i + 1 < items.length; i++) {
    if (!related(items[i].chord, items[i + 1].chord)) continue;
    const last = runs[runs.length - 1];
    if (last && last.end === i) last.end = i + 1;
    else runs.push({ start: i, end: i + 1 });
  }
  const found = runs.filter((r) => items.slice(r.start, r.end + 1).some((item) => item.kind === 'chromatic'));
  for (const r of found) {
    for (let i = r.start; i <= r.end; i++) {
      const item = items[i];
      if (item.kind !== 'chromatic') continue;
      const other = i > r.start ? items[i - 1].chord : items[i + 1].chord;
      Object.assign(item, { kind: 'mediant', mediant: { with: other, shared: shared(item.chord, other) } });
    }
    const span = items.slice(r.start, r.end + 1).map((item) => item.chord);
    const steps = span.slice(1).map((c, i) => jump(span[i], c));
    r.chain = span.length === 4 && steps.every((st) => st === steps[0]) && (steps[0] === 4 || steps[0] === 8);
  }
  return found;
}

// Un riff de acordes de quinta cuyas fundamentales son de la pentatónica de
// la tonalidad (ver pentatonicOf): { mode, tonic, scale }. Si no, null.
const PENTATONIC_INTERVALS = { major: ['1P', '2M', '3M', '5P', '6M'], minor: ['1P', '3m', '4P', '5P', '7m'] };

function pentatonicScale(chords, key) {
  if (key.modal || !pentatonicOf(chords, key)) return null;
  const scale = PENTATONIC_INTERVALS[key.mode].map((i) => {
    const n = Note.transpose(key.tonic, i);
    return /##|bb/.test(n.slice(1)) ? Note.simplify(n) : n;
  });
  return { mode: key.mode, tonic: key.tonic, scale };
}

// Un bucle que empieza y gira en torno a un disminuido o semidisminuido (B°
// C B° C) roza el locrio, pero su casa no suena a reposo: se oye la tonalidad
// de siempre. Devuelve ese acorde, para avisarlo, o null.
function rozaLocrian(chords, key) {
  const [first] = chords;
  if (first.triad !== 'dim' || first.seventh === 'dim7' || key.modal || !isLoopLike(chords)) return null;
  return first;
}

// En un bucle, el último acorde no es un final: no sirve para proponer otra
// tonalidad (Do Fam Do Fam no está en Fa menor por acabar en Fam). Solo se
// mantienen las que se apoyan en algo más: las mismas notas (la relativa o
// un modo) o que el bucle empiece en su tónica.
function reasonableInLoop(alt, chords, key) {
  return isRelative(key, alt) || Boolean(alt.modal) || isTonicChord(chords[0], alt);
}

// ¿Lleva ✦? Fuera de los modos, todo lo que no es de la tonalidad. En un
// modo, la tónica es la casa y nunca la lleva; el resto de sus acordes, solo
// si tienen alguna nota que no es de la escala mayor o menor de referencia
// (el Re con Fa♯ en La dórico, no el Sol). En menor, la sensible también es
// de casa: el Mi7 de La menor melódica es el de La menor. Si todo es
// especial, nada lo es.
const NATURAL = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10, 11] };

function isSpecial(item, key) {
  const plain = item.kind === 'diatonic' || item.kind === 'blues';
  if (!key.modal) return !plain;
  if (item.st === 0) return false;
  if (!plain && item.kind !== 'modal') return true;
  return item.chord.notes.some((n) => !NATURAL[key.mode].includes(mod12(Note.chroma(n) - key.pc)));
}

// Escalas simétricas: se repiten cada pocos semitonos, así que ninguna nota
// suena a casa.
//   'whole-tone' — tonos enteros: fundamentales a distancia de tono (C7 D7 E7
//                  F♯7, al menos cuatro, o tres con séptima), o aumentados que
//                  la llenan (C+ D+).
//   'octatonic'  — disminuida, que alterna tonos y semitonos: al menos tres
//                  fundamentales a distancia de tercera menor (C E♭ G♭ A) y
//                  todas sus notas dentro.
// Devuelve { id, scale } o null.
const SYMMETRIC_SCALES = {
  'whole-tone': [['1P', '2M', '3M', '4A', '5A', '7m']],
  octatonic: [['1P', '2m', '3m', '3M', '4A', '5P', '6M', '7m'], ['1P', '2M', '3m', '4P', '5d', '6m', '6M', '7M']],
};

function symmetricScaleOf(chords) {
  const roots = new Set(chords.map((c) => c.pc));
  const notes = new Set(chords.flatMap((c) => c.notes.map((n) => Note.chroma(n))));
  const first = chords[0];
  const spell = (intervals) => intervals.map((i) => {
    const n = Note.transpose(first.root, i);
    return /##|bb/.test(n.slice(1)) ? Note.simplify(n) : n;
  });
  const fits = (intervals) => [...notes].every((pc) => spell(intervals).some((n) => Note.chroma(n) === pc));
  const relative = [...roots].map((pc) => mod12(pc - first.pc));
  const sameKind = chords.every((c) => c.triad === first.triad && c.seventh === first.seventh);
  const shapes = new Set(chords.map((c) => [...new Set(c.notes.map((n) => Note.chroma(n)))].sort().join()));

  if (relative.every((st) => st % 2 === 0)) {
    const [wholeTone] = SYMMETRIC_SCALES['whole-tone'];
    const filled = fits(wholeTone) && shapes.size >= 2;
    const stepping = sameKind && (roots.size >= 4 || (roots.size >= 3 && first.seventh === '7'));
    if (filled || stepping) return { id: 'whole-tone', scale: spell(wholeTone) };
  }
  if (roots.size >= 3 && relative.every((st) => st % 3 === 0)) {
    const octatonic = SYMMETRIC_SCALES.octatonic.find(fits);
    if (octatonic) return { id: 'octatonic', scale: spell(octatonic) };
  }
  return null;
}

// Solo la tríada aumentada: con séptima ya no es simétrica (ver classifyAug).
export const isSymmetric = (c) => (c.triad === 'aug' && !c.seventh) || c.seventh === 'dim7';

// Los modos que se parecen a la escala mayor (lidio, mixolidio) se analizan
// desde el mayor; el resto, desde el menor. modal guarda lo que hace falta
// para nombrarlo («La dórico») y para saber qué acordes son suyos: los de la
// variante y, si no, los del modo del que parte (el Si♭ de Do Si♭ Re Do, en
// Do lidio dominante, es el ♭VII del mixolidio).
function modalKey(m) {
  const degrees = modeDegrees(m.id, m.variant);
  return {
    pc: m.pc,
    mode: modeById(m.id).compare,
    tonic: m.tonic,
    blues: false,
    modal: { id: m.id, name: m.name, variant: m.variant, charNote: m.charNote, triad: degrees[0].triad, degrees, base: m.variant ? modeDegrees(m.id) : [] },
  };
}

// Si la tonalidad no empieza ni acaba en su tónica, pero la progresión
// empieza (o, si no, acaba) en el centro de un modo con las mismas notas,
// ese modo es mejor alternativa que la relativa: Dm F C G puede ser Do mayor
// o Re dórico. El jónico y el eólico no cuentan: son el mayor y el menor.
const PLAIN = new Set(['ionian', 'aeolian']);

function modalAlternative(modes, chords, key) {
  const first = chords[0];
  // En un bucle, el último acorde no es un final: solo cuenta el primero.
  const last = isLoopLike(chords) ? first : chords[chords.length - 1];
  if (!modes || isTonicChord(first, key) || isTonicChord(last, key)) return null;
  const fits = [modes.main, ...modes.others].filter((m) => m.sameNotes && !PLAIN.has(m.id) && m.foreign.length === 0 && m.charChords.length > 0);
  const on = (chord) => fits.find((m) => isTonicChord(chord, modalKey(m)));
  const m = on(first) ?? on(last);
  return m ? modalKey(m) : null;
}

// Empezar o acabar en el centro lo deja claro; si no, hay alguna duda.
function modalConfidence(m, chords) {
  const home = (c) => c.pc === m.pc;
  return home(chords[0]) || home(chords[chords.length - 1]) ? 'alta' : 'media';
}
