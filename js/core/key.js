// Detección de la tonalidad más probable.
//
// Se puntúan las 24 tonalidades (12 mayores y 12 menores):
//   - cada acorde suma según cuánto encaja (ver classify.js);
//   - suma acabar en la tónica (mucho), empezar en ella (bastante) y que
//     aparezca: el primer y el último acorde son las mejores pistas;
//   - suma que aparezca el acorde de dominante y cada cadencia V → I (o
//     ♭VII7 → I, la dominante por la puerta de atrás);
//   - una menor sin sensible (sin V mayor ni vii°) resta un poco: sin ella,
//     Am F C G suena más a Do mayor que a La menor;
//   - un blues (I7, IV7, V7; en el de jazz, también VI7 y ii7) suma mucho a
//     su tonalidad mayor;
//   - en un bucle (un patrón que se repite entero, como Am Em Am Em, o que
//     va y vuelve, como Em F G F) el último acorde no es un final: todo el
//     peso va al primero;
//   - un acorde que se mantiene varios compases seguidos (aunque cambie el
//     bajo, como Am Am/G Am/F♯) también pesa más si es la tónica;
//   - una nota pedal (el bajo se queda en la misma nota mientras los acordes
//     cambian, como G C/G G F/G) decide la casa: suma mucho a su tonalidad;
//   - el IV que se oscurece (F → Fm en Do mayor: el IV y después el iv
//     prestado de la menor) señala la tonalidad mayor de la que son el IV:
//     Do Mi Fa Fam (Creep) está en Do mayor, no en Fa menor;
//   - un riff de acordes de quinta (sin tercera) que empieza en una nota y
//     cuyas fundamentales son de su pentatónica menor (C5 E♭5 F5 G5 B♭5) es
//     de esa menor: es lo más típico del rock.
// La confianza depende de la distancia entre la primera y la segunda. Si hay
// una duda razonable, la segunda se ofrece como alternativa (ver detectKey).

import { Note } from '../../vendor/tonal.mjs';
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
  loopFirst: 3.5,
  held: 0.6,
  pedal: 2.5,
  pentatonic: 1.0,
  darkenedFour: 1.0,
};

// Las pentatónicas, en semitonos desde la tónica.
export const PENTATONIC = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };

// Si todos los acordes son de quinta y hay al menos cuatro fundamentales
// distintas, todas de la pentatónica de la tonalidad: su modo. Si no, null.
// (Con tres, como C5 F5 G5, es solo el I–IV–V de siempre.)
export function pentatonicOf(chords, key) {
  if (!chords.every((c) => c.triad === '5')) return null;
  const steps = new Set(chords.map((c) => mod12(c.pc - key.pc)));
  if (steps.size < 4 || ![...steps].every((st) => PENTATONIC[key.mode].includes(st))) return null;
  return key.mode;
}

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

const bassPc = (c) => (c.bass ? Note.chroma(c.bass) : c.pc);

// La nota pedal: si todos los acordes (o todos menos uno, a partir de cinco)
// tienen la misma nota en el bajo y por encima cambian, su clase de altura.
// Si no, null.
export function pedalOf(chords) {
  const n = chords.length;
  if (n < 3) return null;
  const counts = new Map();
  for (const c of chords) counts.set(bassPc(c), (counts.get(bassPc(c)) ?? 0) + 1);
  const [pc, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (count < n - Math.floor(n / 5)) return null;
  const above = new Set(chords.filter((c) => bassPc(c) === pc).map((c) => `${c.pc} ${c.triad}`));
  return above.size >= 2 ? pc : null;
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

// Una dominante que resuelve una quinta abajo en otro acorde que no es el
// primero (G → C en F G C G): esa llegada dice más de la casa que empezar.
export function resolvesElsewhere(chords) {
  return chords.some((c, i) => {
    const next = chords[i + 1];
    return next && c.triad === 'M' && (!c.seventh || c.seventh === '7') && mod12(c.pc - next.pc) === 7
      && (next.triad === 'M' || next.triad === 'm') && next.pc !== chords[0].pc;
  });
}

// ¿Da vueltas? Un patrón que se repite entero (Am Em Am Em) o que va y
// vuelve hacia el primer acorde: tras él, los demás son simétricos
// (Em | F G F, Am | G F G). Al repetirse, vuelve a empezar por el primero.
export function isLoopLike(chords) {
  if (loopPeriod(chords)) return true;
  const rest = chords.slice(1);
  return rest.length >= 3 && rest.every((c, i) => sameChord(c, rest[rest.length - 1 - i])) && !sameChord(rest[0], chords[0]) && !resolvesElsewhere(chords);
}

// Un acorde mayor que alterna con el menor una quinta por debajo (Mi Lam Mi
// Lam): suele ser su dominante, así que se oye en los dos sitios. Devuelve
// { dominant, tonic } (los dos acordes) o null.
export function fifthAlternation(chords) {
  if (chords.length < 3 || chords.some((c, i) => i > 0 && c.pc === chords[i - 1].pc)) return null;
  const [a, b] = chords;
  if (!chords.every((c, i) => c.pc === (i % 2 ? b : a).pc && c.triad === (i % 2 ? b : a).triad)) return null;
  const dominant = [a, b].find((c) => c.triad === 'M' && (!c.seventh || c.seventh === '7'));
  const tonic = [a, b].find((c) => c.triad === 'm');
  return dominant && tonic && mod12(dominant.pc - tonic.pc) === 7 ? { dominant, tonic } : null;
}

// El mismo acorde seguido, aunque cambie el bajo (Am Am/G Am/F♯).
const sameHarmony = (a, b) => a.pc === b.pc && a.triad === b.triad;

// Cuántos acordes de más dura cada acorde que se mantiene: [{ chord, extra }].
function heldRuns(chords) {
  const runs = [];
  for (let i = 0; i < chords.length; ) {
    let j = i;
    while (j + 1 < chords.length && sameHarmony(chords[j + 1], chords[i])) j++;
    if (j > i) runs.push({ chord: chords[i], extra: j - i });
    i = j + 1;
  }
  return runs;
}

// Un sus o un acorde de quinta no tiene tercera: sobre la tónica, vale igual
// en mayor que en menor, así que no inclina la balanza hacia ninguno.
export const isTonicChord = (chord, key) =>
  mod12(chord.pc - key.pc) === 0 && (chord.triad === (key.mode === 'major' ? 'M' : 'm') || chord.triad === 'sus' || chord.triad === '5');
const isDominantChord = (chord, key) => mod12(chord.pc - key.pc) === 7 && (chord.triad === 'M' || chord.altered);
// El ♭VII7 de la puerta de atrás (B♭7 → C): también llega a casa, si viene
// de otro acorde que no es la tónica (ver classify).
const isBackdoorChord = (chord, key) => key.mode === 'major' && mod12(chord.pc - key.pc) === 10 && chord.triad === 'M' && chord.seventh === '7';
const isLeadingToneChord = (chord, key) => mod12(chord.pc - key.pc) === 11 && chord.triad === 'dim';
const isOpenDominant = (chord, key) => mod12(chord.pc - key.pc) === 7 && chord.triad === '5';

// Un blues: I7 y IV7, y nada más que I, IV y V. En el de jazz, también el VI7
// que lleva al ii, y el ii (el ii–V de los compases 9 y 10).
function isBlues(chords, key) {
  if (key.mode !== 'major') return false;
  const st = (c) => mod12(c.pc - key.pc);
  const dom7On = (s) => chords.some((c) => c.seventh === '7' && st(c) === s);
  const own = (c) => [0, 5, 7].includes(st(c)) || (st(c) === 9 && c.triad === 'M' && c.seventh === '7') || (st(c) === 2 && c.triad === 'm');
  return dom7On(0) && dom7On(5) && chords.every(own);
}

export function scoreKey(chords, key) {
  key = { ...key, blues: isBlues(chords, key) };
  let score = key.blues ? BONUS.blues : 0;
  chords.forEach((c, i) => {
    score += classify(c, key, chords[i + 1] ?? null, chords[i - 1] ?? null, chords[i + 2] ?? null).fit;
  });
  if (isLoopLike(chords)) {
    if (isTonicChord(chords[0], key)) score += BONUS.loopFirst;
  } else {
    if (isTonicChord(chords[chords.length - 1], key)) score += BONUS.last;
    if (isTonicChord(chords[0], key)) score += BONUS.first;
  }
  for (const run of heldRuns(chords)) if (isTonicChord(run.chord, key)) score += BONUS.held * run.extra;
  if (pedalOf(chords) === key.pc) score += BONUS.pedal;
  if (chords.some((c) => isTonicChord(c, key))) score += BONUS.present;
  if (chords.some((c) => isDominantChord(c, key))) score += BONUS.dominant;
  // Sin tercera, el V5 de un riff puede ser mayor: no falta la sensible.
  else if (key.mode === 'minor' && !chords.some((c) => isLeadingToneChord(c, key) || isOpenDominant(c, key))) score += BONUS.noLeadingTone;
  if (key.mode === 'minor' && pentatonicOf(chords, key) && mod12(chords[0].pc - key.pc) === 0) score += BONUS.pentatonic;
  if (key.mode === 'major' && chords.some((c, i) => i + 1 < chords.length && mod12(c.pc - key.pc) === 5 && c.triad === 'M' && chords[i + 1].pc === c.pc && chords[i + 1].triad === 'm')) {
    score += BONUS.darkenedFour;
  }
  for (let i = 0; i + 1 < chords.length; i++) {
    const backdoor = i > 0 && isBackdoorChord(chords[i], key) && mod12(chords[i - 1].pc - key.pc) !== 0;
    if ((isDominantChord(chords[i], key) || backdoor) && isTonicChord(chords[i + 1], key)) score += BONUS.cadence;
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
  const [best] = ranking;
  // Solo compiten las que tienen sentido como otra forma de oírla: la
  // relativa, la paralela (misma tónica, otro modo) o una cuya tónica sea
  // el primer o el último acorde. Do Sib Lab Sib Do puntúa alto en Fa mayor
  // (tiene sus notas), pero nadie la oye allí.
  const ends = [chords[0].pc, chords[chords.length - 1].pc];
  const rivals = ranking.slice(1).filter((k) => isRelative(best, k) || k.pc === best.pc || ends.includes(k.pc));
  const second = rivals[0] ?? ranking[1];
  const margin = (best.score - second.score) / Math.max(Math.abs(best.score), 1);
  const confidence = margin >= 0.2 ? 'alta' : margin >= 0.08 ? 'media' : 'baja';
  const close = rivals.filter((k) => k.score >= best.score - Math.max(0.6, best.score * 0.12));
  // La relativa usa las mismas notas, así que se le da más margen; salvo que
  // la progresión empiece y acabe en la tónica de la primera: eso despeja la duda.
  // En un bucle basta con empezar en ella.
  const loop = isLoopLike(chords);
  const clear = isTonicChord(chords[0], best) && (loop || isTonicChord(chords[chords.length - 1], best));
  const relative = ranking.find((k) => isRelative(best, k));
  // Y solo si su tónica suena en algún momento: en Do Mi Fa Fam no hay La menor que oír.
  const relativeClose = !clear && chords.some((c) => isTonicChord(c, relative)) && relative.score >= best.score - Math.max(1.0, best.score * 0.12);
  // Si la relativa está entre las cercanas, es la duda más interesante de explicar.
  let alternative = relativeClose ? relative : (close[0] ?? null);
  // En un bucle, o si el primer acorde se mantiene, el primer acorde suena a
  // casa: si aun así gana otra, la suya se ofrece como alternativa.
  const heldStart = chords.length > 1 && sameHarmony(chords[0], chords[1]);
  if ((loop || heldStart) && !isTonicChord(chords[0], best)) {
    alternative = ranking.find((k) => k !== best && isTonicChord(chords[0], k) && k.mode === (chords[0].triad === 'm' ? 'minor' : 'major')) ?? alternative;
  }
  return { key: best, confidence, alternative, ranking };
}
