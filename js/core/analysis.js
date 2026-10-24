// Punto de entrada del análisis: texto → acordes → tonalidad → grados y funciones.

import { parseProgression } from './parser.js';
import { detectKey, scoreKey, isRelative } from './key.js';
import { classify } from './classify.js';
import { findMatches, relativeOf } from './matcher.js';
import { detectModes, isClearlyModal, modeDegrees } from './modes.js';

// forcedKey: { pc, mode, tonic } si el usuario ha elegido la tonalidad a mano.
export function analyze(text, { forcedKey = null } = {}) {
  const parsed = parseProgression(text);
  const chords = parsed.filter((c) => c.ok);
  const errors = parsed.filter((c) => !c.ok);
  const detection = detectKey(chords);
  if (!detection) return { parsed, chords, errors, key: null, items: [], progressions: [], cadences: [], modes: null, modal: false };

  let { key, alternative, confidence } = detection;
  if (forcedKey) {
    const { blues } = scoreKey(chords, forcedKey);
    const chosen = { ...forcedKey, blues };
    // La detectada pasa a ser la alternativa que se ofrece.
    alternative = key.pc === chosen.pc && key.mode === chosen.mode ? alternative : key;
    key = chosen;
  }

  const modes = detectModes(chords, key);
  // La tarjeta del modo solo se muestra si aporta algo.
  const modal = isClearlyModal(modes?.main, chords, key);
  // Si la progresión es claramente modal, su centro es la casa: Am D Am D
  // está en La dórico, no en Sol mayor (con D como V). Salvo que el usuario
  // haya elegido otra tonalidad a mano.
  if (modal && (!forcedKey || forcedKey.pc === modes.main.pc)) {
    key = modalKey(modes.main);
    alternative = null;
    if (!forcedKey) confidence = modalConfidence(modes.main, chords);
  }

  const items = chords.map((chord, i) => ({ chord, ...classify(chord, key, chords[i + 1] ?? null) }));
  const { progressions, cadences } = findMatches(chords, key, relativeOf(key));

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
  };
}

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

// Empezar o acabar en el centro lo deja claro; si no, hay alguna duda.
function modalConfidence(m, chords) {
  const home = (c) => c.pc === m.pc;
  return home(chords[0]) || home(chords[chords.length - 1]) ? 'alta' : 'media';
}
