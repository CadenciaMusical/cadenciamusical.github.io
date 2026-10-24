// Glosario: cada término con una explicación breve y un ejemplo para escuchar.
// Los ejemplos se construyen en la tonalidad que se está analizando (o en Do mayor).

import { Interval, Note } from '../../vendor/tonal.mjs';
import { chordOnDegree, tonicChord } from '../core/build.js';
import { DEGREES } from '../core/theory.js';
import { MODES, modeScale } from '../core/modes.js';
import { MODE_INFO } from './texts.js';
import { chordLabel, keyName, latinNote } from '../core/names.js';

export const DEFAULT_KEY = { tonic: 'C', mode: 'major', pc: 0 };

// Atajos para construir acordes en la tonalidad k.
function degrees(k) {
  const minor = k.mode === 'minor';
  return {
    I: tonicChord(k),
    IV: chordOnDegree(k, 5, minor ? 'm' : 'M'),
    V: chordOnDegree(k, 7, 'M'),
    V7: chordOnDegree(k, 7, 'M', '7'),
    ii7: chordOnDegree(k, 2, minor ? 'dim' : 'm', minor ? 'm7b5' : 'm7'),
    vii: chordOnDegree(k, 11, 'dim'),
  };
}

// Altura MIDI de una nota contada desde la tónica, que va entre Do4 y Si4.
const midiFrom = (k, semitones) => 60 + k.pc + semitones;
const noteName = (k, semitones) => latinNote(Note.transpose(k.tonic, ['1P', '2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M'][semitones]));

// Cada ejemplo devuelve { chords } o { notes, together }, y un pie de texto.
// label(c) escribe un acorde con el cifrado elegido.
export const GLOSSARY = [
  {
    id: 'tonalidad',
    term: 'Tonalidad',
    match: ['tonalidades', 'tonalidad'],
    text: 'El «barrio» de una canción: una nota hace de casa (la tónica) y hay un grupo de acordes que suenan bien a su alrededor. Se nombra por su tónica y su modo: Do mayor, La menor…',
    example: (k) => {
      const d = degrees(k);
      return { chords: [d.I, d.IV, d.V, d.I], caption: `Los acordes principales de ${keyName(k)}: ${k.mode === 'major' ? 'I, IV, V y de vuelta al I' : 'i, iv, V y de vuelta al i'}.` };
    },
  },
  {
    id: 'tonica',
    term: 'Tónica',
    match: ['tónica'],
    text: 'La nota que hace de casa en una tonalidad, y el acorde que se forma sobre ella (el I). Cuando suena, la música transmite reposo, sensación de final.',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.V7, d.I], caption: `Tensión… y llegada a la tónica, ${label(d.I)}.` };
    },
  },
  {
    id: 'dominante',
    term: 'Dominante',
    match: ['dominante'],
    text: 'El acorde del quinto grado (V). Es el de la tensión: está deseando volver a la tónica. Con séptima (V7), la tensión es aún mayor.',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.I, d.V7], caption: `${label(d.I)} y luego ${label(d.V7)}: se queda en el aire, ¿verdad? Pide volver.` };
    },
  },
  {
    id: 'subdominante',
    term: 'Subdominante',
    match: ['subdominante'],
    text: 'El acorde del cuarto grado (IV). Aleja de la tónica sin crear mucha tensión: es como salir de paseo.',
    example: (k) => {
      const d = degrees(k);
      return { chords: [d.I, d.IV, d.I], caption: 'De casa a la subdominante y de vuelta.' };
    },
  },
  {
    id: 'grado',
    term: 'Grado',
    match: ['números romanos', 'grados', 'grado'],
    text: 'El lugar que ocupa un acorde dentro de la tonalidad, contando desde la tónica, que es el I. Se escribe con números romanos: en mayúsculas si el acorde es mayor (IV) y en minúsculas si es menor (vi).',
    example: (k) => {
      const seen = new Set();
      const chords = DEGREES[k.mode]
        .filter((d) => !seen.has(d.st) && seen.add(d.st))
        .map((d) => chordOnDegree(k, d.st, d.triad));
      return { chords: [...chords, tonicChord(k)], caption: 'Los siete acordes de la tonalidad, del I al VII, y vuelta al I.' };
    },
  },
  {
    id: 'modo',
    term: 'Modo mayor y menor',
    match: ['modo'],
    text: 'Una tonalidad puede ser mayor (suena luminosa, alegre) o menor (más oscura, melancólica): lo que cambia es la tercera nota del acorde de tónica. Son los dos modos más usados, pero hay siete: jónico, dórico, frigio, lidio, mixolidio, eólico y locrio.',
    example: (k, label) => {
      const major = chordOnDegree(k, 0, 'M');
      const minor = chordOnDegree(k, 0, 'm');
      return { chords: [major, minor], caption: `${label(major)} (mayor) y ${label(minor)} (menor): misma nota de partida, distinto carácter.` };
    },
  },
  {
    id: 'relativa',
    term: 'Tonalidad relativa',
    match: ['relativas', 'relativa'],
    text: 'Cada tonalidad mayor tiene una menor «relativa» que usa exactamente las mismas notas, como Do mayor y La menor. Lo que cambia es qué acorde suena a casa.',
    example: (k, label) => {
      const I = tonicChord(k);
      const rel = k.mode === 'major' ? chordOnDegree(k, 9, 'm') : chordOnDegree(k, 3, 'M');
      return { chords: [I, rel], caption: `${label(I)} y su relativa, ${label(rel)}.` };
    },
  },
  {
    id: 'cadencia',
    term: 'Cadencia',
    match: ['cadencias', 'cadencia'],
    text: 'La forma en que se cierra una frase musical, como la puntuación al escribir: hay finales que suenan a punto final, otros a coma y otros a sorpresa.',
    example: (k) => {
      const d = degrees(k);
      return { chords: [d.IV, d.V7, d.I], caption: 'Una cadencia perfecta: el final más rotundo.' };
    },
  },
  {
    id: 'progresion',
    term: 'Progresión',
    match: ['progresiones', 'progresión'],
    text: 'Una serie de acordes que se encadenan. Muchas canciones comparten las mismas progresiones: por eso algunas «suenan parecidas».',
    example: (k) => {
      const pop = [0, 7, 9, 5].map((st, i) => chordOnDegree(k, st, i === 2 ? 'm' : 'M'));
      return { chords: k.mode === 'major' ? pop : [tonicChord(k), chordOnDegree(k, 10, 'M'), chordOnDegree(k, 8, 'M'), chordOnDegree(k, 7, 'M')], caption: 'Una de las progresiones más conocidas.' };
    },
  },
  {
    id: 'septima',
    term: 'Séptima',
    match: ['séptimas', 'séptima'],
    text: 'Una cuarta nota que se añade a un acorde, siete notas por encima de su raíz. Le da más color o más tensión.',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.V, d.V7], caption: `${label(d.V)} sin séptima y ${label(d.V7)} con ella.` };
    },
  },
  {
    id: 'semitono',
    term: 'Semitono',
    match: ['semitonos', 'semitono', 'medio tono'],
    text: 'La distancia más pequeña entre dos notas: de una tecla del piano a la de al lado (contando las negras), o de un traste de la guitarra al siguiente. Dos semitonos forman un tono.',
    example: (k) => ({ notes: [midiFrom(k, 0), midiFrom(k, 1)], caption: `${noteName(k, 0)} y la nota que está medio tono por encima.` }),
  },
  {
    id: 'tritono',
    term: 'Tritono',
    match: ['tritono'],
    text: 'Una distancia de tres tonos (seis semitonos). Es el intervalo más inestable: está dentro de cada acorde de dominante con séptima, y es lo que hace que «pida» resolver.',
    example: (k, label) => {
      const d = degrees(k);
      return {
        notes: [midiFrom(k, 5), midiFrom(k, 11)],
        together: true,
        caption: `${noteName(k, 5)} y ${noteName(k, 11)}, el tritono que lleva dentro ${label(d.V7)}.`,
      };
    },
  },
  {
    id: 'sensible',
    term: 'Sensible',
    match: ['sensible'],
    text: 'La nota que está medio tono por debajo de la tónica (Si en Do mayor). Tira con fuerza hacia ella: por eso el acorde de dominante, que la contiene, pide volver a casa.',
    example: (k) => ({ notes: [midiFrom(k, -1), midiFrom(k, 0)], caption: `${noteName(k, 11)} sube a ${noteName(k, 0)}: la sensible llega a la tónica.` }),
  },
  {
    id: 'resolver',
    term: 'Resolver',
    match: ['resuelve', 'resolver', 'resolución'],
    text: 'Pasar de un acorde con tensión a otro estable. Cuando la dominante va a la tónica, se dice que «resuelve».',
    example: (k) => {
      const d = degrees(k);
      return { chords: [d.V7, d.I], caption: 'La dominante resuelve en la tónica.' };
    },
  },
  {
    id: 'dominante-secundaria',
    term: 'Dominante secundaria',
    match: ['dominantes secundarias', 'dominante secundaria'],
    text: 'Un acorde que hace de dominante de otro grado que no es la tónica. En Do mayor, D7 es la dominante de G: se escribe V7/V y se lee «quinto del quinto».',
    example: (k, label) => {
      const d = degrees(k);
      const vOfV = chordOnDegree(k, 2, 'M', '7');
      return { chords: [d.I, vOfV, d.V, d.I], caption: `${label(vOfV)} empuja hacia ${label(d.V)}, que a su vez vuelve a casa.` };
    },
  },
  {
    id: 'prestamo',
    term: 'Préstamo modal',
    match: ['préstamo modal', 'préstamo', 'prestado', 'prestados'],
    text: 'Un acorde tomado de la tonalidad «paralela», que tiene la misma tónica pero el otro modo. En Do mayor, Fm viene de Do menor y le da un toque melancólico.',
    example: (k, label) => {
      const I = tonicChord(k);
      const own = chordOnDegree(k, 5, k.mode === 'major' ? 'M' : 'm');
      const borrowed = chordOnDegree(k, 5, k.mode === 'major' ? 'm' : 'M');
      return { chords: [I, own, borrowed, I], caption: `${label(own)} es de la tonalidad; ${label(borrowed)}, prestado.` };
    },
  },
  {
    id: 'sustituto-tritonal',
    term: 'Sustituto tritonal',
    match: ['sustitutos tritonales', 'sustituto tritonal'],
    text: 'Un acorde con séptima que ocupa el lugar de la dominante y cuya raíz está a un tritono de ella (D♭7 en lugar de G7, en Do). Comparten las dos notas que crean la tensión, así que funcionan igual, pero el bajo baja medio tono hasta la tónica. Muy típico del jazz.',
    example: (k, label) => {
      const d = degrees(k);
      const sub = chordOnDegree(k, 1, 'M', '7');
      return { chords: [d.ii7, d.V7, d.I, d.ii7, sub, d.I], caption: `Primero con ${label(d.V7)} y después con ${label(sub)}.` };
    },
  },
  {
    id: 'disminuido',
    term: 'Acorde disminuido',
    match: ['disminuidos', 'disminuido'],
    text: 'Un acorde de sonido tenso e inestable. Casi nunca se queda quieto: suele aparecer de paso, camino de otro acorde que está medio tono por encima.',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.vii, d.I], caption: `${label(d.vii)} va a ${label(d.I)}, medio tono por encima.` };
    },
  },
  {
    id: 'transportar',
    term: 'Transportar',
    match: ['transportar', 'transportada', 'transportado'],
    text: 'Cambiar todos los acordes a otra tonalidad sin cambiar las distancias entre ellos. La música suena igual, solo que más aguda o más grave.',
    example: (k, label) => {
      const steps = k.mode === 'major' ? [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']] : [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']];
      const up = { tonic: Note.transpose(k.tonic, '4P'), mode: k.mode, pc: (k.pc + 5) % 12 };
      const here = steps.map(([st, q]) => chordOnDegree(k, st, q));
      const there = steps.map(([st, q]) => chordOnDegree(up, st, q));
      return { chords: [...here, ...there], caption: `Primero en ${keyName(k)} (${here.map(label).join(' ')}) y luego en ${keyName(up)} (${there.map(label).join(' ')}): misma música, más aguda.` };
    },
  },
  {
    id: 'cifrado',
    term: 'Cifrado',
    match: ['cifrado'],
    text: 'La forma de escribir los acordes. El americano usa letras (C D E F G A B) y el latino, sílabas (Do Re Mi Fa Sol La Si). Una «m» indica que es menor y un «7», que lleva séptima.',
    example: (k) => {
      const I = tonicChord(k);
      return { chords: [I], caption: `${chordLabel(I)} o ${chordLabel(I, true)}: el mismo acorde con sus dos nombres.` };
    },
  },
];

// Variantes con nombre propio, explicadas dentro de su modo.
const MODE_VARIANTS = {
  phrygian: { match: 'frigio dominante', text: 'Si además el acorde de la tónica es mayor, se llama frigio dominante: el sonido del flamenco.' },
  aeolian: { match: 'menor armónica', text: 'Si la séptima nota sube medio tono para tirar hacia la tónica (la sensible), se llama menor armónica.' },
};

// Un término por cada modo, con su escala para escuchar.
const MODE_TERMS = MODES.map((mode) => ({
  id: `modo-${mode.id}`,
  term: `Modo ${mode.name}`,
  match: MODE_VARIANTS[mode.id] ? [MODE_VARIANTS[mode.id].match, mode.name] : [mode.name],
  text: MODE_VARIANTS[mode.id] ? `${MODE_INFO[mode.id].text} ${MODE_VARIANTS[mode.id].text}` : MODE_INFO[mode.id].text,
  example: (k) => {
    const scale = modeScale(mode.id, k.tonic);
    const start = 60 + k.pc;
    const notes = [...scale.map((n) => start + Interval.semitones(Interval.distance(scale[0], n))), start + 12];
    return { notes, caption: `La escala de ${latinNote(k.tonic)} ${mode.name}: ${scale.map(latinNote).join(' ')}.` };
  },
}));
GLOSSARY.push(...MODE_TERMS);

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));
const BY_WORD = new Map(GLOSSARY.flatMap((e) => e.match.map((w) => [w, e])));

export const glossaryEntry = (id) => BY_ID.get(id);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORDS = [...BY_WORD.keys()].sort((a, b) => b.length - a.length);
const TERM_RE = new RegExp(`(?<!\\p{L})(${WORDS.map(escapeRe).join('|')})(?!\\p{L})`, 'giu');

// Convierte en botones los términos del glosario de un texto sin HTML.
// Cada término se enlaza solo la primera vez; exclude evita enlazar un término
// dentro de su propia definición.
export function linkTerms(text, { exclude = null } = {}) {
  const used = new Set([exclude]);
  return text.replace(TERM_RE, (word) => {
    const entry = BY_WORD.get(word.toLowerCase());
    if (!entry || used.has(entry.id)) return word;
    used.add(entry.id);
    return `<button type="button" class="term" data-term="${entry.id}">${word}</button>`;
  });
}
