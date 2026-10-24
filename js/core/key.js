// Detección de la tonalidad más probable.
//
// Se puntúan las 24 tonalidades (12 mayores y 12 menores):
//   - cada acorde suma según cuánto encaja (ver classify.js);
//   - suma acabar en la tónica (mucho), empezar en ella (bastante) y que
//     aparezca: el primer y el último acorde son las mejores pistas;
//   - suma que aparezca el acorde de dominante y cada cadencia V → I;
//   - una menor sin sensible (sin V mayor ni vii°) resta un poco: sin ella,
//     Am F C G suena más a Do mayor que a La menor;
//   - un blues (I7, IV7, V7) suma mucho a su tonalidad mayor;
//   - en un bucle (un patrón que se repite entero, como Am Em Am Em) el
//     último acorde no es un final: todo el peso va al primero.
// La confianza depende de la distancia entre la primera y la segunda. Si hay
// una duda razonable, la segunda se ofrece como alternativa (ver detectKey).

import { classify } from './classify.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

const BONUS = {
  last: 1.0,
  first: 0.8,
  present: 0.3,
  dominant: 0.4,
  cadence: 0.6,
  noLeadingTone: -0.3,
  blues: 3.0,
  loopFirst: 2.8,
};

const TONIC_NAMES = {
  sharps: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  flats: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

// La forma habitual de escribir cada tónica (Mi♭ mayor, Do♯ menor…).
export function defaultTonic(pc, mode) {
  return TONIC_NAMES[mode][pc];
}

// Escribe la tónica con sostenidos o bemoles según lo que use el usuario.
function tonicName(pc, mode, chords) {
  const spelled = chords.flatMap((c) => [c.root, c.bass].filter(Boolean));
  const sharps = spelled.some((n) => n.includes('#'));
  const flats = spelled.some((n) => n.includes('b'));
  if (sharps && !flats) return TONIC_NAMES.sharps[pc];
  if (flats && !sharps) return TONIC_NAMES.flats[pc];
  return TONIC_NAMES[mode][pc];
}

const sameChord = (a, b) => a.pc === b.pc && a.triad === b.triad && a.seventh === b.seventh && a.bass === b.bass;

// Cuántos acordes tiene el patrón si la progresión es un bucle: un trozo que
// se repite entero dos veces o más (Am Em Am Em → 2). Si no, null.
export function loopPeriod(chords) {
  const n = chords.length;
  for (let p = 2; p <= n / 2; p++) {
    if (n % p === 0 && chords.every((c, i) => sameChord(c, chords[i % p]))) return p;
  }
  return null;
}

export const isTonicChord = (chord, key) => mod12(chord.pc - key.pc) === 0 && chord.triad === (key.mode === 'major' ? 'M' : 'm');
const isDominantChord = (chord, key) => mod12(chord.pc - key.pc) === 7 && chord.triad === 'M';
const isLeadingToneChord = (chord, key) => mod12(chord.pc - key.pc) === 11 && chord.triad === 'dim';

function isBlues(chords, key) {
  if (key.mode !== 'major') return false;
  const steps = new Set(chords.map((c) => mod12(c.pc - key.pc)));
  const dom7On = (st) => chords.some((c) => c.seventh === '7' && mod12(c.pc - key.pc) === st);
  return dom7On(0) && dom7On(5) && [...steps].every((s) => s === 0 || s === 5 || s === 7);
}

export function scoreKey(chords, key) {
  key = { ...key, blues: isBlues(chords, key) };
  let score = key.blues ? BONUS.blues : 0;
  chords.forEach((c, i) => {
    score += classify(c, key, chords[i + 1] ?? null).fit;
  });
  if (loopPeriod(chords)) {
    if (isTonicChord(chords[0], key)) score += BONUS.loopFirst;
  } else {
    if (isTonicChord(chords[chords.length - 1], key)) score += BONUS.last;
    if (isTonicChord(chords[0], key)) score += BONUS.first;
  }
  if (chords.some((c) => isTonicChord(c, key))) score += BONUS.present;
  if (chords.some((c) => isDominantChord(c, key))) score += BONUS.dominant;
  else if (key.mode === 'minor' && !chords.some((c) => isLeadingToneChord(c, key))) score += BONUS.noLeadingTone;
  for (let i = 0; i + 1 < chords.length; i++) {
    if (isDominantChord(chords[i], key) && isTonicChord(chords[i + 1], key)) score += BONUS.cadence;
  }
  return { score, blues: key.blues };
}

const RELATIVE_SHIFT = { major: 9, minor: 3 };

export function isRelative(a, b) {
  return a.mode !== b.mode && mod12(a.pc + RELATIVE_SHIFT[a.mode]) === b.pc;
}

// chords: acordes ya leídos (solo los válidos).
// Devuelve { key, confidence, alternative, ranking }.
//   confidence: 'alta' | 'media' | 'baja'
//   alternative: la segunda tonalidad si está cerca de la primera, o null.
export function detectKey(chords) {
  if (chords.length === 0) return null;
  const ranking = [];
  for (const mode of ['major', 'minor']) {
    for (let pc = 0; pc < 12; pc++) {
      const { score, blues } = scoreKey(chords, { pc, mode });
      ranking.push({ pc, mode, blues, tonic: tonicName(pc, mode, chords), score });
    }
  }
  // Ante un empate exacto, primero la mayor.
  ranking.sort((a, b) => b.score - a.score || (a.mode === 'major' ? -1 : 1));
  const [best, second] = ranking;
  const margin = (best.score - second.score) / Math.max(Math.abs(best.score), 1);
  const confidence = margin >= 0.2 ? 'alta' : margin >= 0.08 ? 'media' : 'baja';
  const close = ranking.slice(1).filter((k) => k.score >= best.score - Math.max(0.6, best.score * 0.12));
  // La relativa usa las mismas notas, así que se le da más margen; salvo que
  // la progresión empiece y acabe en la tónica de la primera: eso despeja la duda.
  // En un bucle basta con empezar en ella.
  const clear = isTonicChord(chords[0], best) && (loopPeriod(chords) || isTonicChord(chords[chords.length - 1], best));
  const relative = ranking.find((k) => isRelative(best, k));
  const relativeClose = !clear && relative.score >= best.score - Math.max(1.0, best.score * 0.12);
  // Si la relativa está entre las cercanas, es la duda más interesante de explicar.
  const alternative = relativeClose ? relative : (close[0] ?? null);
  return { key: best, confidence, alternative, ranking };
}
