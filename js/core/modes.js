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

const mod12 = (n) => ((n % 12) + 12) % 12;

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

// degree: grado de la escala mayor sobre el que empieza el modo.
// compare: con qué escala se compara (mayor o menor natural).
// char: semitonos de la nota característica, la que lo distingue de esa escala;
//   instead: el intervalo que esa escala tiene en su lugar.
// typical: grados (0–6) de una progresión típica del modo.
export const MODES = [
  { id: 'ionian', name: 'jónico', degree: 0, intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7M'], compare: 'major', char: null, instead: null, typical: [0, 3, 4, 0] },
  { id: 'dorian', name: 'dórico', degree: 1, intervals: ['1P', '2M', '3m', '4P', '5P', '6M', '7m'], compare: 'minor', char: 9, instead: '6m', typical: [0, 3, 0, 3] },
  { id: 'phrygian', name: 'frigio', degree: 2, intervals: ['1P', '2m', '3m', '4P', '5P', '6m', '7m'], compare: 'minor', char: 1, instead: '2M', typical: [0, 1, 0, 1] },
  { id: 'lydian', name: 'lidio', degree: 3, intervals: ['1P', '2M', '3M', '4A', '5P', '6M', '7M'], compare: 'major', char: 6, instead: '4P', typical: [0, 1, 0, 1] },
  { id: 'mixolydian', name: 'mixolidio', degree: 4, intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7m'], compare: 'major', char: 10, instead: '7M', typical: [0, 6, 3, 0] },
  { id: 'aeolian', name: 'eólico', degree: 5, intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m'], compare: 'minor', char: null, instead: null, typical: [0, 5, 6, 0] },
  { id: 'locrian', name: 'locrio', degree: 6, intervals: ['1P', '2m', '3m', '4P', '5d', '6m', '7m'], compare: 'minor', char: 6, instead: '5P', typical: [0, 1, 0, 1] },
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

const WEIGHT = { first: 2, last: 1.5, each: 0.5, keyTonic: 2.5, keyNotes: 1 };

// Variantes con una nota alterada.
const VARIANTS = {
  'phrygian-dominant': { from: '3m', to: '3M' },
  'harmonic-minor': { from: '7m', to: '7M' },
};

// Las notas de la escala del modo desde una tónica concreta.
export function modeScale(modeId, tonic, variant = null) {
  const alt = VARIANTS[variant];
  return modeById(modeId).intervals.map((i) => (alt && i === alt.from ? alt.to : i)).map((i) => {
    const n = Note.transpose(tonic, i);
    return /##|bb/.test(n.slice(1)) ? Note.simplify(n) : n;
  });
}

const TRIADS = { '3,7': 'm', '4,7': 'M', '3,6': 'dim', '4,8': 'aug' };
const SEVENTHS = { 'M,11': 'maj7', 'M,10': '7', 'm,10': 'm7', 'm,11': 'mMaj7', 'dim,10': 'm7b5', 'dim,9': 'dim7' };

// Los acordes que se forman sobre cada grado del modo (con su variante):
// [{ st, triad, seventh }]. En el frigio dominante, el I es mayor.
export function modeDegrees(modeId, variant = null) {
  const alt = VARIANTS[variant];
  const s = modeById(modeId).intervals.map((i) => Interval.semitones(alt && i === alt.from ? alt.to : i));
  return s.map((st, d) => {
    const third = mod12(s[(d + 2) % 7] - st);
    const fifth = mod12(s[(d + 4) % 7] - st);
    const triad = TRIADS[`${third},${fifth}`] ?? 'M';
    return { st, triad, seventh: SEVENTHS[`${triad},${mod12(s[(d + 6) % 7] - st)}`] ?? null };
  });
}

// Una progresión típica del modo, como acordes.
export function typicalProgression(modeId, tonic) {
  const mode = modeById(modeId);
  const scale = modeScale(modeId, tonic);
  const suffix = { M: '', m: 'm', dim: 'dim' };
  return mode.typical.map((d) => parseChord(scale[d] + suffix[triadOn(mode, d)]));
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

// Casos con nombre propio cuando sobra una sola nota.
function variantOf(modeId, foreignSteps) {
  if (foreignSteps.length !== 1) return null;
  if (modeId === 'phrygian' && foreignSteps[0] === 4) return 'phrygian-dominant';
  if (modeId === 'aeolian' && foreignSteps[0] === 11) return 'harmonic-minor';
  return null;
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

  const candidates = [];
  for (const set of sets.filter((s) => s.weight === best)) {
    for (const mode of MODES) {
      const center = mod12(set.parent + MAJOR_STEPS[mode.degree]);
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
      candidates.push({ mode, set, center, score });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.mode.degree - b.mode.degree);

  const top = candidates[0];
  const describe = ({ mode, set, center }) => {
    const tonic = spellCenter(center, chords, key);
    const foreignPcs = set.outside.map(([pc]) => pc);
    const variant = variantOf(mode.id, foreignPcs.map((pc) => mod12(pc - center)));
    const scale = modeScale(mode.id, tonic, variant);
    const charNote = mode.char === null ? null : scale[steps(mode).indexOf(mode.char)];
    const insteadNote = mode.instead && Note.transpose(tonic, mode.instead);
    const charChords = mode.char === null ? [] : scaleChords.filter((c) => c.notes.some((n) => Note.chroma(n) === mod12(center + mode.char)));
    return {
      id: mode.id,
      name: mode.name,
      tonic,
      pc: center,
      scale,
      charNote,
      insteadNote,
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
//   - se oye su nota característica (no solo en un V7/V) y no sobra ninguna nota (salvo la del
//     frigio dominante, que es parte de ese sonido);
//   - hay al menos dos pistas de que su tónica es la casa: empezar en ella,
//     acabar en ella, que coincida con la tonalidad o que suene en la mitad
//     de los acordes o más.
const PLAIN = new Set(['ionian', 'aeolian']);

export function isClearlyModal(m, chords, key) {
  if (!m || PLAIN.has(m.id)) return false;
  if (m.charChords.length === 0) return false;
  // Un II7 que va al V (D7 → G en Do) es la dominante de la dominante, no el
  // color lidio. El IV7 → ♭VII del dórico (D7 → G en La) sí es del modo.
  const charPc = Note.chroma(m.charNote);
  const resolving = (c, i) =>
    c.triad === 'M' && c.seventh === '7' && c.pc === mod12(m.pc + 2) && chords[i + 1]?.pc === mod12(m.pc + 7);
  const colored = chords.filter((c, i) => c.notes.some((n) => Note.chroma(n) === charPc) && !resolving(c, i));
  if (colored.length === 0) return false;
  if (m.foreign.length > 0 && m.variant !== 'phrygian-dominant') return false;
  const home = (c) => c.pc === m.pc;
  const clues = [
    home(chords[0]),
    home(chords[chords.length - 1]),
    key?.pc === m.pc,
    chords.filter(home).length >= chords.length / 2,
  ];
  return clues.filter(Boolean).length >= 2;
}
