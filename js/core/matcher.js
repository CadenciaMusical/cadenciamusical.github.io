// Busca las progresiones y cadencias del catálogo dentro de una progresión.

import { Note } from '../../vendor/tonal.mjs';
import { PROGRESSIONS, CADENCES } from './catalog.js';

const mod12 = (n) => ((n % 12) + 12) % 12;

const SCALE = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// 'ii7' → { st: 2, triad: 'm', seventh: true }
export function parseStep(text, mode) {
  const m = /^([♭b#♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([°ø+]?)(7?)$/.exec(text);
  if (!m) throw new Error(`Grado no válido en el catálogo: ${text}`);
  const [, acc, numeral, mark, seven] = m;
  const index = NUMERALS.indexOf(numeral.toUpperCase());
  let st = SCALE[mode][index];
  // El vii° de la menor armónica está a un semitono de la tónica.
  if (mode === 'minor' && index === 6 && mark === '°') st = 11;
  if (acc === '♭' || acc === 'b') st -= 1;
  if (acc === '#' || acc === '♯') st += 1;
  const lower = numeral === numeral.toLowerCase();
  let triad = lower ? 'm' : 'M';
  if (mark === '°' || mark === 'ø') triad = 'dim';
  if (mark === '+') triad = 'aug';
  return { st: mod12(st), triad, seventh: Boolean(seven) || mark === 'ø' };
}

function compile(entry) {
  return {
    ...entry,
    compiled: entry.steps.map((s) => s.split('|').map((alt) => parseStep(alt, entry.mode))),
  };
}

const COMPILED_PROGRESSIONS = PROGRESSIONS.map(compile);
const COMPILED_CADENCES = CADENCES.map(compile);

// noDominant7 (ver el catálogo): un paso sin «7» no acepta la séptima de dominante.
function stepMatches(options, chord, key, { noDominant7 = false } = {}) {
  const st = mod12(chord.pc - key.pc);
  return options.some((o) => {
    if (o.st !== st) return false;
    if (noDominant7 && !o.seventh && chord.seventh === '7') return false;
    // Una dominante alterada (G7alt) hace de V aunque su quinta suba.
    const triadOk = chord.triad === o.triad || ((chord.triad === 'sus' || chord.triad === '5') && o.triad !== 'dim') || (chord.altered && o.triad === 'M');
    return triadOk && (!o.seventh || Boolean(chord.seventh));
  });
}

const sameChord = (a, b) => a.pc === b.pc && a.triad === b.triad && a.seventh === b.seventh;

// Junta los acordes repetidos seguidos («C C G G» → «C G»), recordando
// qué posiciones originales ocupa cada uno.
function collapse(chords) {
  const out = [];
  chords.forEach((chord, i) => {
    const last = out[out.length - 1];
    if (last && sameChord(last.chord, chord)) last.end = i;
    else out.push({ chord, start: i, end: i });
  });
  return out;
}

// Todas las apariciones de un patrón. Devuelve rangos [start, end] (inclusive)
// sobre la lista de posiciones dada.
function findRuns(entry, seq, key) {
  const pattern = entry.compiled;
  const n = pattern.length;
  const runs = [];
  if (entry.cyclic) {
    // Para un patrón en bucle se busca el tramo más largo que lo sigue,
    // empezando en cualquier punto del ciclo.
    for (let i = 0; i < seq.length; i++) {
      for (let r = 0; r < n; r++) {
        let j = i;
        while (j < seq.length && stepMatches(pattern[(r + j - i) % n], seq[j].chord, key, entry)) j++;
        if (j - i >= n) runs.push({ start: i, end: j - 1, rotation: r });
      }
    }
  } else {
    for (let i = 0; i + n <= seq.length; i++) {
      if (pattern.every((opts, k) => stepMatches(opts, seq[i + k].chord, key, entry))) {
        runs.push({ start: i, end: i + n - 1, rotation: 0 });
      }
    }
  }
  // Quita los tramos repetidos y los contenidos en otro más largo.
  return runs.filter(
    (a, i) =>
      !runs.some(
        (b, j) =>
          b.start <= a.start &&
          b.end >= a.end &&
          (b.end - b.start > a.end - a.start || (j < i && b.start === a.start && b.end === a.end)),
      ),
  );
}

// Junta las apariciones seguidas de un mismo patrón en una sola, con el
// número de vueltas: Am G F E Am G F E es una andaluza que se repite dos
// veces, no dos andaluzas. Valen seguidas o compartiendo un acorde (C F G C
// F G C: el C del medio cierra una vuelta y abre la otra). Cada tramo lleva
// turns: dónde empieza cada vuelta (posiciones en seq).
function groupRuns(entry, runs) {
  const n = entry.compiled.length;
  if (entry.cyclic) {
    // Un bucle ya sale como un solo tramo: se cuentan las vueltas enteras.
    return runs.map((r) => {
      const len = r.end - r.start + 1;
      const times = len % n === 0 ? len / n : 1;
      return { ...r, turns: Array.from({ length: times }, (_, i) => r.start + i * n) };
    });
  }
  const sorted = [...runs].sort((a, b) => a.start - b.start);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && (r.start === last.end + 1 || r.start === last.end)) {
      last.end = r.end;
      last.turns.push(r.start);
    } else {
      out.push({ ...r, turns: [r.start] });
    }
  }
  return out;
}

function toMatch(entry, run, seq, key, total) {
  const start = seq[run.start].start;
  const end = seq[run.end].end;
  // Para mostrarlo, la primera opción de cada paso («ii°|iiø7» → «ii°»).
  const plain = entry.steps.map((s) => s.split('|')[0]);
  const steps = entry.cyclic ? [...plain.slice(run.rotation), ...plain.slice(0, run.rotation)] : plain;
  return {
    id: entry.id,
    name: entry.name,
    text: entry.text,
    songs: entry.songs ?? [],
    label: entry.label ?? steps.join('–'),
    start,
    end,
    // Vueltas: cuántas veces se repite seguida y dónde empieza cada una.
    times: run.turns?.length ?? 1,
    turns: (run.turns ?? [run.start]).map((t) => seq[t].start),
    key: { pc: key.pc, mode: key.mode, tonic: key.tonic },
    whole: start === 0 && end === total - 1,
    atEnd: end === total - 1,
  };
}

const RELATIVE = {
  major: { shift: 9, interval: '6M', mode: 'minor' },
  minor: { shift: 3, interval: '3m', mode: 'major' },
};

// chords: acordes leídos. key: { pc, mode, tonic }.
// relativeKey (opcional): la relativa, con su nombre, para buscar también
// progresiones escritas en el otro modo (vi–IV–I–V vista desde La menor).
// Devuelve { progressions, cadences }.
export function findMatches(chords, key, relativeKey = null) {
  if (chords.length === 0) return { progressions: [], cadences: [] };
  const total = chords.length;
  const collapsed = collapse(chords);
  const bars = chords.map((chord, i) => ({ chord, start: i, end: i }));

  const progressions = [];
  for (const entry of COMPILED_PROGRESSIONS) {
    const k = entry.mode === key.mode ? key : relativeKey;
    if (!k || k.mode !== entry.mode) continue;
    const seq = entry.bars ? bars : collapsed;
    for (const run of groupRuns(entry, findRuns(entry, seq, k))) progressions.push(toMatch(entry, run, seq, k, total));
  }

  // Una progresión que forma parte de otra más larga encontrada no se muestra
  // aparte (el IV–I–IV–V del final del canon de Pachelbel).
  const visible = progressions.filter(
    (a) => !progressions.some((b) => b !== a && b.start <= a.start && b.end >= a.end && b.end - b.start > a.end - a.start),
  );

  const cadences = [];
  for (const entry of COMPILED_CADENCES) {
    if (entry.mode !== key.mode) continue;
    for (const run of findRuns(entry, collapsed, key)) {
      const match = toMatch(entry, run, collapsed, key, total);
      if (entry.endOnly) {
        if (!match.atEnd || run.start === 0) continue;
        // Para oírla hace falta el acorde que llega a la dominante.
        match.start = collapsed[run.start - 1].start;
      }
      cadences.push(match);
    }
  }

  // Las que cubren más acordes primero; las cadencias finales primero.
  visible.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  cadences.sort((a, b) => Number(b.atEnd) - Number(a.atEnd) || a.start - b.start);
  return { progressions: visible, cadences };
}

// La relativa, con la tónica bien escrita (Do mayor → La menor; Mi♭ mayor → Do menor).
export function relativeOf(key) {
  const r = RELATIVE[key.mode];
  const tonic = Note.transpose(key.tonic, r.interval);
  return { pc: mod12(key.pc + r.shift), mode: r.mode, tonic };
}
