// Modos griegos: en qué modos encajan los acordes.
//
// Los siete modos usan las mismas siete notas (un «conjunto diatónico»); lo
// que cambia es qué nota hace de casa. Así que:
//   1. se buscan los conjuntos de siete notas que contienen los acordes
//      (si alguna nota se sale, se anota como ajena);
//   2. dentro de cada conjunto, se elige el centro con las mismas pistas que
//      la tonalidad: primer y último acorde, cuántas veces suena y la
//      tonalidad detectada. El acorde sobre el centro debe ser del tipo
//      que pide el modo (mayor, menor o disminuido).

import { Interval, Note } from '../../vendor/tonal.mjs';
import { parseChord } from './parser.js';
import { isLoopLike, pedalOf, resolvesElsewhere } from './key.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

// degree: grado de la escala mayor sobre el que empieza el modo.
// compare: con qué escala se compara (mayor o menor natural).
// char: semitonos de la nota característica, la que lo distingue de esa escala.
// typical: grados (0–6) de una progresión típica del modo.
export const MODES = [
  { id: 'ionian', name: 'jónico', degree: 0, intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7M'], compare: 'major', char: null, typical: [0, 3, 4, 0] },
  { id: 'dorian', name: 'dórico', degree: 1, intervals: ['1P', '2M', '3m', '4P', '5P', '6M', '7m'], compare: 'minor', char: 9, typical: [0, 3, 0, 3] },
  { id: 'phrygian', name: 'frigio', degree: 2, intervals: ['1P', '2m', '3m', '4P', '5P', '6m', '7m'], compare: 'minor', char: 1, typical: [0, 1, 0, 1] },
  { id: 'lydian', name: 'lidio', degree: 3, intervals: ['1P', '2M', '3M', '4A', '5P', '6M', '7M'], compare: 'major', char: 6, typical: [0, 1, 0, 1] },
  { id: 'mixolydian', name: 'mixolidio', degree: 4, intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7m'], compare: 'major', char: 10, typical: [0, 6, 3, 0] },
  { id: 'aeolian', name: 'eólico', degree: 5, intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m'], compare: 'minor', char: null, typical: [0, 5, 6, 0] },
  { id: 'locrian', name: 'locrio', degree: 6, intervals: ['1P', '2m', '3m', '4P', '5d', '6m', '7m'], compare: 'minor', char: 6, typical: [0, 1, 0, 1] },
];

const MODE_BY_ID = new Map(MODES.map((m) => [m.id, m]));
export const modeById = (id) => MODE_BY_ID.get(id);

const steps = (mode) => mode.intervals.map((i) => Interval.semitones(i));

// Tipo de acorde que se forma sobre cada grado del modo.
function triadOn(mode, degree) {
  const s = steps(mode);
  const third = mod12(s[(degree + 2) % 7] - s[degree]);
  const fifth = mod12(s[(degree + 4) % 7] - s[degree]);
  if (fifth === 6) return 'dim';
  return third === 4 ? 'M' : 'm';
}

const fitsCenter = (chord, triad) =>
  chord.triad === triad || ((chord.triad === 'sus' || chord.triad === '5') && triad !== 'dim');

// variant: la nota que sobra tiene nombre propio (ver variantOf). Entre el
// F lidio con Mi♭ y el F mixolidio con Si (la misma escala), gana el que la nombra.
const WEIGHT = { first: 2, last: 1.5, each: 0.5, keyTonic: 2.5, keyNotes: 1, variant: 1 };

// Variantes con nombre propio: un modo con una o dos notas cambiadas.
//   mode: el modo del que parte; foreign: las notas que sobran frente a sus
//     siete notas (en semitonos desde la tónica); changes: cómo cambia su escala.
//   needs: notas que además tienen que sonar (la doble armónica se distingue
//     del frigio dominante por su séptima mayor).
//   char: la nota que la distingue, si no es la del modo.
//   typical: una progresión típica, [grado (0–6), sufijo], si no basta con la del modo.
// El lidio dominante es un lidio con la séptima menor (Do7 Re) o un mixolidio
// con la cuarta aumentada (Do Si♭ Re Do): la misma escala. Lo mismo la menor
// melódica: el menor con la sexta y la séptima mayores, o el dórico con la séptima mayor.
const DOMINANT_LOOP = [[0, '7'], [1, ''], [0, '7'], [1, '']];
const MELODIC_LOOP = [[0, 'm'], [3, ''], [4, ''], [0, 'm']];
const VARIANTS = [
  { id: 'phrygian-dominant', mode: 'phrygian', foreign: [4], changes: { '3m': '3M' } },
  { id: 'harmonic-minor', mode: 'aeolian', foreign: [11], changes: { '7m': '7M' } },
  { id: 'melodic-minor', mode: 'aeolian', foreign: [9, 11], changes: { '6m': '6M', '7m': '7M' }, char: 9, typical: MELODIC_LOOP },
  { id: 'melodic-minor', mode: 'dorian', foreign: [11], changes: { '7m': '7M' }, typical: MELODIC_LOOP },
  { id: 'lydian-dominant', mode: 'lydian', foreign: [10], changes: { '7M': '7m' }, typical: DOMINANT_LOOP },
  { id: 'lydian-dominant', mode: 'mixolydian', foreign: [6], changes: { '4P': '4A' }, typical: DOMINANT_LOOP },
  { id: 'lydian-augmented', mode: 'lydian', foreign: [8], changes: { '5P': '5A' }, char: 8 },
  { id: 'dorian-sharp4', mode: 'dorian', foreign: [6], changes: { '4P': '4A' }, char: 6, typical: [[0, 'm'], [1, '7'], [0, 'm'], [1, '7']] },
  { id: 'double-harmonic', mode: 'ionian', foreign: [1, 8], changes: { '2M': '2m', '6M': '6m' }, needs: [11], char: 1, typical: [[0, 'maj7'], [1, ''], [0, 'maj7'], [1, '']] },
];

const variantEntry = (modeId, variant) => VARIANTS.find((v) => v.id === variant && v.mode === modeId) ?? null;

// Las variantes que siguen siendo claramente modales, con su nota de fuera
// (la menor armónica es el menor de siempre con su sensible).
const MODAL_VARIANTS = new Set(VARIANTS.map((v) => v.id).filter((id) => id !== 'harmonic-minor'));

// Los intervalos de la escala del modo, con los cambios de su variante.
function variantIntervals(modeId, variant) {
  const changes = variantEntry(modeId, variant)?.changes ?? {};
  return modeById(modeId).intervals.map((i) => changes[i] ?? i);
}

// Las notas de la escala del modo desde una tónica concreta.
export function modeScale(modeId, tonic, variant = null) {
  return variantIntervals(modeId, variant).map((i) => {
    const n = Note.transpose(tonic, i);
    return /##|bb/.test(n.slice(1)) ? Note.simplify(n) : n;
  });
}

// La escala mayor o menor de siempre con la que se compara un modo.
export const plainScale = (modeId, tonic) => modeScale(modeById(modeId).compare === 'major' ? 'ionian' : 'aeolian', tonic);

const TRIADS = { '3,7': 'm', '4,7': 'M', '3,6': 'dim', '4,8': 'aug' };
const SEVENTHS = { 'M,11': 'maj7', 'M,10': '7', 'm,10': 'm7', 'm,11': 'mMaj7', 'dim,10': 'm7b5', 'dim,9': 'dim7', 'aug,11': 'maj7' };

// Los acordes que se forman sobre cada grado del modo (con su variante):
// [{ st, triad, seventh }]. En el frigio dominante, el I es mayor.
export function modeDegrees(modeId, variant = null) {
  const s = variantIntervals(modeId, variant).map((i) => Interval.semitones(i));
  return s.map((st, d) => {
    const third = mod12(s[(d + 2) % 7] - st);
    const fifth = mod12(s[(d + 4) % 7] - st);
    const triad = TRIADS[`${third},${fifth}`] ?? 'M';
    return { st, triad, seventh: SEVENTHS[`${triad},${mod12(s[(d + 6) % 7] - st)}`] ?? null };
  });
}

// Una progresión típica del modo, como acordes. En el lidio dominante, la
// tónica lleva su séptima menor (Do7 Re Do7 Re), que es la que lo distingue.
export function typicalProgression(modeId, tonic, variant = null) {
  const scale = modeScale(modeId, tonic, variant);
  const degrees = modeDegrees(modeId, variant);
  const suffix = { M: '', m: 'm', dim: 'dim', aug: 'aug' };
  const steps = variantEntry(modeId, variant)?.typical ?? modeById(modeId).typical.map((d) => [d, suffix[degrees[d].triad]]);
  return steps.map(([d, s]) => parseChord(scale[d] + s));
}

// Cómo escribir la tónica del modo: como la escribió el usuario si puede.
function spellCenter(pc, chords, key) {
  const own = chords.find((c) => c.pc === pc);
  if (own) return own.root;
  if (key && key.pc === pc) return key.tonic;
  return Note.fromMidi(60 + pc).replace(/\d+$/, '');
}

// Nombre de una clase de altura usando la ortografía de los acordes.
function spellPc(pc, chords) {
  for (const c of chords) {
    const n = c.notes.find((x) => Note.chroma(x) === pc);
    if (n) return n;
  }
  return Note.fromMidi(60 + pc).replace(/\d+$/, '');
}

// Casos con nombre propio según las notas que sobran (en semitonos desde la
// tónica) y las que suenan.
function variantOf(modeId, foreignSteps, usedSteps = []) {
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  return VARIANTS.find((v) => v.mode === modeId && same(v.foreign, foreignSteps) && (v.needs ?? []).every((st) => usedSteps.includes(st)))?.id ?? null;
}

// chords: acordes leídos. key: la tonalidad del análisis ({ pc, mode, tonic }).
// Devuelve { main, others } o null. Cada modo:
//   { id, name, tonic, pc, scale, charNote, charChords, foreign, variant, sameNotes }
export function detectModes(chords, key = null) {
  if (chords.length === 0) return null;

  // Los °7 no cuentan para la escala: son simétricos, y cualquiera de sus
  // notas puede ser una sensible prestada (ver classifyDim7). Su Sol♭ haría
  // de Re mayor un Re menor, o su Mi♭, de Re menor un Re frigio.
  const scaleChords = chords.filter((c) => c.seventh !== 'dim7');

  // Cuántas veces sale cada nota (una por acorde).
  const uses = new Map();
  for (const c of scaleChords) {
    for (const pc of new Set(c.notes.map((n) => Note.chroma(n)))) uses.set(pc, (uses.get(pc) ?? 0) + 1);
  }

  // Los 12 conjuntos diatónicos, nombrados por su escala mayor (parent).
  const sets = Array.from({ length: 12 }, (_, parent) => {
    const pcs = new Set(MAJOR_STEPS.map((s) => mod12(parent + s)));
    const outside = [...uses].filter(([pc]) => !pcs.has(pc));
    return { parent, pcs, outside, weight: outside.reduce((a, [, n]) => a + n, 0) };
  });
  const best = Math.min(...sets.map((s) => s.weight));
  const keyParent = key ? mod12(key.pc + (key.mode === 'minor' ? 3 : 0)) : null;
  const used = [...uses.keys()];
  const variantFor = (mode, set, center) => variantOf(mode.id, set.outside.map(([pc]) => mod12(pc - center)), used.map((pc) => mod12(pc - center)));

  // Compiten los conjuntos a los que les sobran menos notas. Si a todos les
  // sobra alguna, también los que una variante explica entera: en Mi Fa Sol♯°
  // Mi, el Sol♯ suena tres veces, pero todo es de Mi frigio dominante.
  const candidates = [];
  for (const set of sets) {
    for (const mode of MODES) {
      const center = mod12(set.parent + MAJOR_STEPS[mode.degree]);
      const variant = variantFor(mode, set, center);
      if (set.weight !== best && !(best > 0 && variant)) continue;
      const triad = triadOn(mode, 0);
      // Un acorde sobre el centro con una nota ajena también vale: el Mi mayor
      // del frigio dominante es un Mi menor con la tercera alterada.
      const outsidePcs = new Set(set.outside.map(([pc]) => pc));
      const altered = (c) => c.notes.some((n) => outsidePcs.has(Note.chroma(n)));
      const isCenter = (c) => c.pc === center && (fitsCenter(c, triad) || altered(c));
      const onCenter = chords.filter(isCenter);
      if (onCenter.length === 0) continue;
      let score = onCenter.length * WEIGHT.each;
      if (isCenter(chords[0])) score += WEIGHT.first;
      if (isCenter(chords[chords.length - 1])) score += WEIGHT.last;
      if (key && key.pc === center) score += WEIGHT.keyTonic;
      if (set.parent === keyParent) score += WEIGHT.keyNotes;
      if (variant) score += WEIGHT.variant;
      candidates.push({ mode, set, center, variant, score });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.mode.degree - b.mode.degree);

  const top = candidates[0];
  const describe = ({ mode, set, center, variant }) => {
    const tonic = spellCenter(center, chords, key);
    const foreignPcs = set.outside.map(([pc]) => pc);
    const scale = modeScale(mode.id, tonic, variant);
    // La nota que lo distingue, frente a la escala mayor o menor de siempre.
    const char = variantEntry(mode.id, variant)?.char ?? mode.char;
    const charIndex = char === null ? -1 : scale.findIndex((n) => Note.chroma(n) === mod12(center + char));
    const charChords = char === null ? [] : scaleChords.filter((c) => c.notes.some((n) => Note.chroma(n) === mod12(center + char)));
    return {
      id: mode.id,
      name: mode.name,
      tonic,
      pc: center,
      scale,
      charNote: charIndex < 0 ? null : scale[charIndex],
      insteadNote: charIndex < 0 ? null : plainScale(mode.id, tonic)[charIndex],
      // Sin repetir acordes iguales.
      charChords: charChords.filter((c, i) => charChords.findIndex((d) => d.root === c.root && d.suffix === c.suffix) === i),
      foreign: foreignPcs.map((pc) => spellPc(pc, chords)),
      variant,
      // ¿Usa las mismas notas que el modo principal, o solo falta información?
      sameNotes: set.parent === top.set.parent,
    };
  };

  return {
    main: describe(top),
    others: candidates.slice(1, 4).map(describe),
  };
}

// ¿Merece la pena hablar del modo? Solo si la progresión es claramente modal:
//   - no es el mayor ni el menor de siempre (jónico, eólico, menor armónica);
//   - se oye su nota característica (no solo en un V7/V) y no sobra ninguna nota (salvo la de
//     una variante con nombre propio, como el frigio dominante, que es parte de ese sonido);
//   - en la menor melódica, la séptima mayor no está solo en la dominante: Lam
//     Re Mi Lam es La menor con el cuarto dórico; Lammaj7 Re7 Mi7 Lammaj7, sí;
//   - hay al menos dos pistas de que su tónica es la casa: empezar en ella,
//     acabar en ella, que coincida con la tonalidad o que suene en la mitad
//     de los acordes o más. En un bucle, empezar en ella cuenta doble: es
//     adonde vuelve en cada vuelta (salvo que una dominante lleve a otro
//     acorde, como el G → C de F G C G). Una nota pedal en ella es otra pista.
const PLAIN = new Set(['ionian', 'aeolian']);

export function isClearlyModal(m, chords, key) {
  if (!m || (PLAIN.has(m.id) && !MODAL_VARIANTS.has(m.variant))) return false;
  if (m.charChords.length === 0) return false;
  // Un II7 que va al V (D7 → G en Do) es la dominante de la dominante, no el
  // color lidio. El IV7 → ♭VII del dórico (D7 → G en La) sí es del modo.
  // Tampoco un ♭II que va al V (D♭/F → G7 en Do): es el napolitano, no el
  // color frigio, que va directo a la tónica. Ni un ♭II7 que va a la tónica
  // (D♭7 → Cmaj7): es el sustituto tritonal de la dominante, del jazz.
  const charPc = Note.chroma(m.charNote);
  const toV = (i) => chords.slice(i + 1).find((c) => c.pc !== m.pc)?.pc === mod12(m.pc + 7);
  const resolving = (c, i) =>
    (c.triad === 'M' && c.seventh === '7' && c.pc === mod12(m.pc + 2) && chords[i + 1]?.pc === mod12(m.pc + 7))
    || (c.triad === 'M' && c.pc === mod12(m.pc + 1) && toV(i) && chords[i + 1]?.pc !== m.pc)
    || (c.triad === 'M' && c.pc === mod12(m.pc + 1) && chords[i + 1]?.pc === m.pc && chords[i + 1].bass && toV(i))
    || (c.triad === 'M' && c.seventh === '7' && c.pc === mod12(m.pc + 1) && chords[i + 1]?.pc === m.pc);
  const colored = chords.filter((c, i) => c.notes.some((n) => Note.chroma(n) === charPc) && !resolving(c, i));
  if (colored.length === 0) return false;
  if (m.foreign.length > 0 && !MODAL_VARIANTS.has(m.variant)) return false;
  if (m.variant === 'melodic-minor') {
    const leading = mod12(m.pc + 11);
    const dominant = (c) => c.pc === mod12(m.pc + 7) || c.pc === leading;
    if (!chords.some((c) => !dominant(c) && c.notes.some((n) => Note.chroma(n) === leading))) return false;
  }
  const home = (c) => c.pc === m.pc;
  const clues = [
    home(chords[0]),
    home(chords[0]) && isLoopLike(chords) && !resolvesElsewhere(chords),
    home(chords[chords.length - 1]),
    key?.pc === m.pc,
    pedalOf(chords) === m.pc,
    chords.filter(home).length >= chords.length / 2,
  ];
  return clues.filter(Boolean).length >= 2;
}
