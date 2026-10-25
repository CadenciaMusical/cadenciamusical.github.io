// Punto de entrada del análisis: texto → acordes → tonalidad → grados y funciones.

import { parseProgression } from './parser.js';
import { detectKey, scoreKey, isRelative, isTonicChord, isLoopLike, loopPeriod, pedalOf } from './key.js';
import { classify, classifyAlone } from './classify.js';
import { findMatches, relativeOf } from './matcher.js';
import { detectModes, isClearlyModal, modeDegrees } from './modes.js';
import { bassLines, inversionOf, pedalLine } from './bass.js';

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
  // tonalidad: cualquiera de sus notas podría ser la casa. Mejor decirlo.
  if (!forcedKey && chords.every(isSymmetric)) {
    return {
      parsed, chords, errors, key, confidence: 'baja', forced: false, alternative: null, alternativeIsRelative: false,
      unclear: true,
      items: chords.map((chord) => ({ chord, ...classifyAlone() })),
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
  }

  const items = chords.map((chord, i) => ({ chord, ...classify(chord, key, chords[i + 1] ?? null, chords[i - 1] ?? null) }));
  items.forEach((item, i) => {
    item.inversion = inversionOf(item.chord, chords[i + 1] ?? null);
  });
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
    rests,
  };
}

// Un bucle que empieza y gira en torno a un disminuido o semidisminuido (B°
// C B° C) roza el locrio, pero su casa no suena a reposo: se oye la tonalidad
// de siempre. Devuelve ese acorde, para avisarlo, o null.
function rozaLocrian(chords, key) {
  const [first] = chords;
  if (first.triad !== 'dim' || first.seventh === 'dim7' || key.modal || !isLoopLike(chords)) return null;
  return first;
}

export const isSymmetric = (c) => (c.triad === 'aug' && (!c.seventh || c.seventh === '7')) || c.seventh === 'dim7';

// Los modos que se parecen a la escala mayor (lidio, mixolidio) se analizan
// desde el mayor; el resto, desde el menor. modal guarda lo que hace falta
// para nombrarlo («La dórico») y para saber qué acordes son suyos.
const MAJOR_LIKE = new Set(['ionian', 'lydian', 'mixolydian']);

function modalKey(m) {
  const degrees = modeDegrees(m.id, m.variant);
  return {
    pc: m.pc,
    mode: MAJOR_LIKE.has(m.id) ? 'major' : 'minor',
    tonic: m.tonic,
    blues: false,
    modal: { id: m.id, name: m.name, variant: m.variant, charNote: m.charNote, triad: degrees[0].triad, degrees },
  };
}

// Si la tonalidad no empieza ni acaba en su tónica, pero la progresión
// empieza (o, si no, acaba) en el centro de un modo con las mismas notas,
// ese modo es mejor alternativa que la relativa: Dm F C G puede ser Do mayor
// o Re dórico. El jónico y el eólico no cuentan: son el mayor y el menor.
const PLAIN = new Set(['ionian', 'aeolian']);

function modalAlternative(modes, chords, key) {
  const first = chords[0];
  const last = chords[chords.length - 1];
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
