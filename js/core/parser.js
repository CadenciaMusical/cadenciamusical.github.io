// Convierte el texto que escribe el usuario en acordes.
// Acepta cifrado americano (Am F C G) y latino (Lam Fa Do Sol), mezclados,
// en mayúsculas o minúsculas, con las séptimas y alteraciones habituales.

import { Chord, Note } from '../../vendor/tonal.mjs';

const LATIN_ROOTS = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };

const LATIN_RE = /^(sol|do|re|mi|fa|la|si)([#♯b♭]?)(.*)$/i;
const AMERICAN_RE = /^([a-g])([#♯b♭]?)(.*)$/i;

// Separa por espacios, comas, barras de compás y guiones entre acordes
// («C-G-Am»), pero no el guion de «C-» (menor) ni el de «m7-5».
export function tokenize(text) {
  return text
    .split(/[\s,;|–—]+|-(?=[a-z])/i)
    .map((t) => t.trim())
    // Un guion o una barra sueltos («C - G») también separan.
    .filter((t) => t && !/^[-–—|]+$/.test(t));
}

// Cada trozo con su posición en el texto, para marcar uno en la casilla.
export function tokenSpans(text) {
  const spans = [];
  let pos = 0;
  for (const token of tokenize(text)) {
    const start = text.indexOf(token, pos);
    spans.push({ token, start, end: start + token.length });
    pos = start + token.length;
  }
  return spans;
}

function normalizeAcc(acc) {
  return acc.replace('♯', '#').replace(/♭|B/, 'b');
}

// Variantes habituales del sufijo → la forma que entiende Tonal.
function normalizeSuffix(raw) {
  let s = raw
    .replace(/[()\s]/g, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/[°º]/g, 'dim')
    // «Cø» y «Cø7»: el 7 ya va dentro de m7b5.
    .replace(/ø7?/g, 'm7b5')
    // El triángulo es maj7, con el 7 o sin él: CΔ, CΔ7.
    .replace(/Δ7?/g, 'maj7');
  s = s
    .replace(/^menor/i, 'm')
    .replace(/^mayor/i, '')
    .replace(/^(min|mi)(?![a-z])/, 'm')
    .replace(/^aum/i, 'aug')
    .replace(/^disminuido/i, 'dim')
    .replace(/(\d)-(\d)/g, '$1b$2')
    .replace(/^m7M$|^m(maj|ma|M)7$/, 'mMaj7')
    .replace(/^7M/, 'maj7')
    .replace(/^M$/, '');
  return s;
}

function readRoot(text) {
  const latin = LATIN_RE.exec(text);
  const american = AMERICAN_RE.exec(text);
  const options = [];
  if (latin) options.push({ letter: LATIN_ROOTS[latin[1].toLowerCase()], acc: latin[2], rest: latin[3], notation: 'latin' });
  if (american) options.push({ letter: american[1].toUpperCase(), acc: american[2], rest: american[3], notation: 'american' });
  return options;
}

// Una nota suelta (para el bajo de «C/E» o «Do/Mi»).
function readNote(text) {
  for (const o of readRoot(text)) {
    if (o.rest === '') return o.letter + normalizeAcc(o.acc);
  }
  return null;
}

function describe(intervals) {
  const has = (i) => intervals.includes(i);
  let triad;
  if (has('3M')) triad = has('5A') ? 'aug' : 'M';
  else if (has('3m')) triad = has('5d') ? 'dim' : 'm';
  else if (has('4P') || has('2M')) triad = 'sus';
  else triad = '5';

  let seventh = null;
  if (has('7m')) seventh = { M: '7', sus: '7', 5: '7', aug: '7', m: 'm7', dim: 'm7b5' }[triad];
  else if (has('7M')) seventh = triad === 'm' ? 'mMaj7' : 'maj7';
  else if (has('7d')) seventh = 'dim7';

  const tensions = [];
  if (has('6M') || has('13M')) tensions.push(seventh ? 'trecena' : 'sexta');
  if (intervals.some((i) => i.startsWith('9'))) tensions.push('novena');
  if (has('11P') || has('11A')) tensions.push('oncena');
  return { triad, seventh, tensions };
}

// Intenta leer un acorde. Devuelve { ok: true, ... } o { ok: false, input, suggestions }.
export function parseChord(input, { allCaps = false } = {}) {
  // «C/E» lleva bajo; «C6/9» no.
  const [, main, bassText] = /^(.*?)(?:\/([a-z#♯♭]+))?$/i.exec(input);
  if (main) {
    for (const o of readRoot(main)) {
      // Solo las letras latinas: «Δ» en minúscula sería «δ».
      const rest = allCaps ? o.rest.replace(/[A-Z]/g, (c) => c.toLowerCase()) : o.rest;
      const root = o.letter + normalizeAcc(o.acc);
      const suffix = normalizeSuffix(rest);
      const data = Chord.get(root + suffix);
      if (data.empty) continue;
      let bass = null;
      if (bassText !== undefined) {
        bass = readNote(bassText);
        if (!bass) continue;
      }
      return {
        ok: true,
        input,
        root,
        bass,
        suffix,
        // Cómo lo escribió el usuario, para transportar sin cambiarle el estilo.
        notation: o.notation,
        rawSuffix: rest,
        pc: Note.chroma(root),
        notes: data.notes,
        ...describe(data.intervals),
      };
    }
  }
  return { ok: false, input, suggestions: suggest(input) };
}

// Símbolos de cancionero: «N.C.» (sin acorde, un silencio) y «%» (otra vez
// el acorde anterior).
const NO_CHORD_RE = /^n\.?c\.?$/i;

// Cada trozo, leído. «%» es una copia del acorde anterior (repeat: true);
// «N.C.», { ok: false, rest: true }: no es un acorde, pero tampoco un error.
export function parseProgression(text) {
  // Si todo está en mayúsculas (bloqueo de mayúsculas), «LAM» es La menor.
  const allCaps = /[A-Z]/.test(text.replace(NO_CHORD_RE, '')) && !/[a-z]/.test(text);
  const out = [];
  let previous = null;
  for (const t of tokenize(text)) {
    if (NO_CHORD_RE.test(t)) {
      out.push({ ok: false, rest: true, input: t });
    } else if (t === '%') {
      out.push(previous ? { ...previous, input: t, repeat: true } : { ok: false, input: t, suggestions: [] });
    } else {
      const chord = parseChord(t, { allCaps });
      if (chord.ok) previous = chord;
      out.push(chord);
    }
  }
  return out;
}

// El cifrado en que está escrito todo lo reconocido: 'latin', 'american', o
// null si se mezclan (o no hay acordes).
export function writtenNotation(parsed) {
  const used = new Set(parsed.filter((c) => c.ok && !c.repeat).map((c) => c.notation));
  return used.size === 1 ? [...used][0] : null;
}

// --- Sugerencias para lo que no se reconoce ---

const SUGGEST_ROOTS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Do', 'Do#', 'Reb', 'Re', 'Re#', 'Mib', 'Mi', 'Fa', 'Fa#', 'Solb', 'Sol', 'Sol#', 'Lab', 'La', 'La#', 'Sib', 'Si',
];
const SUGGEST_SUFFIXES = ['', 'm', '7', 'm7', 'maj7', 'dim', 'dim7', 'm7b5', 'aug', 'sus4', 'sus2', '6', 'm6', '9', 'add9'];
const CANDIDATES = SUGGEST_ROOTS.flatMap((r) => SUGGEST_SUFFIXES.map((s) => r + s));

// Distancia de edición con transposiciones («Cmja7» → «Cmaj7» cuesta 1).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// ¿Se puede formar b añadiendo letras a a? («Cmj7» dentro de «Cmaj7»).
function isSubsequence(a, b) {
  let i = 0;
  for (const ch of b) if (ch === a[i]) i++;
  return i === a.length;
}

export function suggest(input) {
  // Notación alemana: H es Si.
  if (/^h/i.test(input)) {
    const fixed = 'B' + input.slice(1);
    if (parseChord(fixed).ok) return [fixed];
  }
  const target = input.toLowerCase();
  const maxDist = target.length <= 3 ? 1 : 2;
  // A igual distancia, primero los que solo añaden letras a lo escrito: es más
  // fácil comerse una letra que escribir una de más («Cmj7» → «Cmaj7», no «Cm7»).
  return CANDIDATES.map((c) => ({ c, d: distance(target, c.toLowerCase()), within: isSubsequence(target, c.toLowerCase()) }))
    .filter((x) => x.d <= maxDist)
    .sort((x, y) => x.d - y.d || y.within - x.within || x.c.length - y.c.length)
    .slice(0, 3)
    .map((x) => x.c);
}
