// Glosario: cada término con una explicación breve y un ejemplo para escuchar.
// Los ejemplos se construyen en la tonalidad que se está analizando (o en Do mayor).

import { Interval, Note } from '../../vendor/tonal.mjs';
import { chordOnDegree, tonicChord } from '../core/build.js';
import { DEGREES } from '../core/theory.js';
import { parseChord } from '../core/parser.js';
import { MODES, modeScale } from '../core/modes.js';
import { MODE_INFO } from './texts.js';
import { chordLabel, keyName, noteName } from '../core/names.js';

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
const degreeNote = (k, semitones) => noteName(Note.transpose(k.tonic, ['1P', '2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M'][semitones]));

// Para los textos con ejemplos concretos, que siguen el cifrado elegido.
const K = (tonic, mode) => keyName({ tonic, mode });
const sym = (root, suffix = '') => noteName(root) + suffix;
const dim7 = (root) => chordLabel(parseChord(root + 'dim7'));
const aug = (root) => chordLabel(parseChord(root + 'aug'));

// text: una cadena, o una función si nombra notas (para seguir el cifrado).
// fn: en tónica, subdominante y dominante, su papel (FUNCTIONS en texts.js),
//   que se muestra junto a la definición; after, una nota que va detrás.
// Cada ejemplo devuelve { chords } o { notes, together }, y un pie de texto.
// label(c) escribe un acorde con el cifrado elegido.
export const GLOSSARY = [
  {
    id: 'tonalidad',
    term: 'Tonalidad',
    match: ['tonalidades', 'tonalidad'],
    text: () => `El «barrio» de una canción: una nota hace de casa (la tónica) y hay un grupo de acordes que suenan bien a su alrededor. Se nombra por su tónica y su modo: ${K('C', 'major')}, ${K('A', 'minor')}…`,
    example: (k) => {
      const d = degrees(k);
      return { chords: [d.I, d.IV, d.V, d.I], caption: `Los acordes principales de ${keyName(k)}: ${k.mode === 'major' ? 'I, IV, V y de vuelta al I' : 'i, iv, V y de vuelta al i'}.` };
    },
  },
  {
    id: 'tonica',
    term: 'Tónica',
    match: ['tónica'],
    fn: 'T',
    text: 'La nota que hace de casa en una tonalidad, y el acorde que se forma sobre ella (el I).',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.V7, d.I], caption: `Tensión… y llegada a la tónica, ${label(d.I)}.` };
    },
  },
  {
    id: 'dominante',
    term: 'Dominante',
    match: ['dominante'],
    fn: 'D',
    text: 'El acorde del quinto grado (V).',
    after: 'Con séptima (V7), la tensión es aún mayor.',
    example: (k, label) => {
      const d = degrees(k);
      return { chords: [d.I, d.V7], caption: `${label(d.I)} y luego ${label(d.V7)}: se queda en el aire, ¿verdad? Pide volver.` };
    },
  },
  {
    id: 'subdominante',
    term: 'Subdominante',
    match: ['subdominante'],
    fn: 'S',
    text: 'El acorde del cuarto grado (IV).',
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
    match: ['tonalidades relativas', 'tonalidad relativa', 'relativas', 'relativa'],
    text: () => `Cada tonalidad mayor tiene una menor «relativa» que usa exactamente las mismas notas, como ${K('C', 'major')} y ${K('A', 'minor')}. Lo que cambia es qué acorde suena a casa.`,
    example: (k, label) => {
      const I = tonicChord(k);
      const rel = k.mode === 'major' ? chordOnDegree(k, 9, 'm') : chordOnDegree(k, 3, 'M');
      return { chords: [I, rel], caption: `${label(I)} y su relativa, ${label(rel)}.` };
    },
  },
  {
    id: 'modulacion',
    term: 'Cambio de tonalidad (modulación)',
    match: ['cambios de tonalidad', 'cambio de tonalidad', 'modulaciones', 'modulación'],
    text: 'Cuando la casa se muda a mitad de la música: a partir de un momento, los acordes dejan de encajar en la tonalidad del principio y una cadencia asienta la nueva. Los grados se cuentan entonces desde la nueva tónica.',
    example: (k, label) => {
      const d = degrees(k);
      // En mayor, a la dominante (con su V7); en menor, a la relativa (con el VII7).
      const major = k.mode === 'major';
      const to = { tonic: Note.transpose(k.tonic, major ? '5P' : '3m'), mode: 'major' };
      const prep = major ? chordOnDegree(k, 2, 'M', '7') : chordOnDegree(k, 10, 'M', '7');
      const home = major ? d.V : chordOnDegree(k, 3, 'M');
      return { chords: [d.I, d.IV, d.V, d.I, prep, home, prep, home], caption: `Empieza en ${keyName(k)} y, con ${label(prep)} → ${label(home)}, cambia a ${keyName(to)}.` };
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
    example: (k) => ({ notes: [midiFrom(k, 0), midiFrom(k, 1)], caption: `${degreeNote(k, 0)} y la nota que está medio tono por encima.` }),
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
        caption: `${degreeNote(k, 5)} y ${degreeNote(k, 11)}, el tritono que lleva dentro ${label(d.V7)}.`,
      };
    },
  },
  {
    id: 'sensible',
    term: 'Sensible',
    match: ['sensible'],
    text: () => `La nota que está medio tono por debajo de la tónica (${noteName('B')} en ${K('C', 'major')}). Tira con fuerza hacia ella: por eso el acorde de dominante, que la contiene, pide volver a casa.`,
    example: (k) => ({ notes: [midiFrom(k, -1), midiFrom(k, 0)], caption: `${degreeNote(k, 11)} sube a ${degreeNote(k, 0)}: la sensible llega a la tónica.` }),
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
    text: () => `Un acorde que hace de dominante de otro grado que no es la tónica. En ${K('C', 'major')}, ${sym('D', '7')} es la dominante de ${sym('G')}: se escribe V7/V y se lee «quinto del quinto».`,
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
    text: () => `Un acorde tomado de la tonalidad «paralela», que tiene la misma tónica pero el otro modo. En ${K('C', 'major')}, ${sym('F', 'm')} viene de ${K('C', 'minor')} y le da un toque melancólico.`,
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
    text: () => `Un acorde con séptima que ocupa el lugar de la dominante y cuya raíz está a un tritono de ella (${sym('Db', '7')} en lugar de ${sym('G', '7')}, en ${noteName('C')}). Comparten las dos notas que crean la tensión, así que funcionan igual, pero el bajo baja medio tono hasta la tónica. Muy típico del jazz.`,
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
    id: 'disminuido-septima',
    term: 'Disminuido con séptima',
    match: ['disminuidos con séptima', 'disminuido con séptima', 'cuatro nombres'],
    text: () => `Un acorde disminuido con una nota más. Sus cuatro notas están a la misma distancia (tres semitonos), así que es simétrico: ${dim7('B')}, ${dim7('D')}, ${dim7('F')} y ${dim7('Ab')} tienen las mismas notas y suenan exactamente igual. Cada uno tiene cuatro nombres, y por eso el mismo acorde puede llevar a sitios distintos: se le llama por el nombre que explica adónde va.`,
    example: (k, label) => {
      const I = tonicChord(k);
      // El vi en mayor, el III en menor: los dos, medio tono por encima de una nota del vii°7.
      const other = k.mode === 'major' ? chordOnDegree(k, 9, 'm') : chordOnDegree(k, 3, 'M');
      const dim = (target) => {
        const root = Note.transpose(target.root, '-2m');
        return parseChord((/##|bb/.test(root.slice(1)) ? Note.simplify(root) : root) + 'dim7');
      };
      return { chords: [dim(I), I, dim(other), other], caption: `${label(dim(I))} lleva a ${label(I)}, y el mismo acorde, llamado ${label(dim(other))}, lleva a ${label(other)}.` };
    },
  },
  {
    id: 'aumentado',
    term: 'Acorde aumentado',
    match: ['acordes aumentados', 'acorde aumentado', 'aumentados', 'aumentado', 'tres nombres'],
    text: () => `Un acorde mayor con la quinta subida medio tono: suena tenso, misterioso. Sus tres notas están a la misma distancia (cuatro semitonos), así que es simétrico: ${aug('C')}, ${aug('E')} y ${aug('G#')} tienen las mismas notas y suenan exactamente igual. Cada uno tiene tres nombres. Suele ir de paso: sobre la dominante, empuja con más fuerza hacia la tónica.`,
    example: (k, label) => {
      const V = chordOnDegree(k, 7, 'M');
      const Vaug = chordOnDegree(k, 7, 'aug');
      const I = tonicChord(k);
      return { chords: [V, Vaug, I], caption: `${label(V)}, ${label(Vaug)} y ${label(I)}: la quinta sube medio tono y empuja hacia la llegada.` };
    },
  },
  {
    id: 'dominante-alterada',
    term: 'Dominante alterada',
    match: ['dominantes alteradas', 'dominante alterada'],
    text: () => `Una dominante con notas tensas añadidas (♭9, ♯9, ♭5 o ♯5), como ${sym('G', '7alt')} o ${sym('G', '7♭9')} en ${K('C', 'major')}. Suena aún más inestable que la dominante normal y pide resolver con más fuerza. Muy del jazz.`,
    example: (k, label) => {
      const d = degrees(k);
      const alt = chordOnDegree(k, 7, 'M', '7alt');
      return { chords: [d.V7, d.I, alt, d.I], caption: `Primero con ${label(d.V7)} y después con ${label(alt)}: la llegada a casa es más tensa.` };
    },
  },
  {
    id: 'napolitana',
    term: 'Sexta napolitana',
    match: ['sexta napolitana', 'acorde napolitano', 'napolitano'],
    text: () => `Un acorde mayor medio tono por encima de la tónica (el ♭II: ${sym('Bb')} en ${K('A', 'minor')}), casi siempre con la cuarta nota de la escala en el bajo (${sym('Bb')}/${noteName('D')}): por eso se llama «sexta». Prepara la dominante con dramatismo. Muy de Bach, Mozart y Beethoven.`,
    example: (k, label) => {
      const d = degrees(k);
      const N = chordOnDegree(k, 1, 'M');
      const N6 = parseChord(`${N.root}/${N.notes[1]}`);
      return { chords: [d.I, N6, d.V7, d.I], caption: `${label(N6)} prepara ${label(d.V7)}, que vuelve a ${label(d.I)}.` };
    },
  },
  {
    id: 'mediantes',
    term: 'Mediantes cromáticas',
    match: ['mediantes cromáticas', 'mediante cromática'],
    text: () => `Dos acordes del mismo tipo (dos mayores o dos menores) con las fundamentales a una tercera, que no son de la misma tonalidad y comparten como mucho una nota: ${sym('C')} y ${sym('E')}, o ${sym('C')} y ${sym('Ab')}. Suenan grandiosos y sorprendentes: es el sonido épico del cine.`,
    example: (k, label) => {
      const chords = [0, 4, 8, 0].map((st) => chordOnDegree(k, st, 'M'));
      return { chords, caption: `${chords.map(label).join(', ')}: tres saltos de tercera mayor que vuelven al principio.` };
    },
  },
  {
    id: 'acorde-quinta',
    term: 'Acorde de quinta',
    match: ['acordes de quinta', 'acorde de quinta', 'power chords', 'power chord'],
    text: () => `Un acorde con solo dos notas, la fundamental y la quinta (${sym('C', '5')}: ${noteName('C')} y ${noteName('G')}), sin tercera, así que no es ni mayor ni menor. Con distorsión suena potente: es la base de la guitarra del rock (en inglés, «power chord»).`,
    example: (k, label) => {
      const chords = [0, 5, 7, 0].map((st) => chordOnDegree(k, st, 'M', '5'));
      return { chords, caption: `${chords.map(label).join(', ')}: el I–IV–V del rock, sin terceras.` };
    },
  },
  {
    id: 'pentatonica',
    term: 'Escala pentatónica',
    match: ['escala pentatónica', 'pentatónica'],
    text: 'Una escala de solo cinco notas, sin los semitonos que crean tensión: por eso casi todo suena bien con ella. La pentatónica menor es la más usada en el rock y el blues; la mayor, en el country y el folk.',
    example: (k) => {
      const steps = k.mode === 'minor' ? [0, 3, 5, 7, 10, 12] : [0, 2, 4, 7, 9, 12];
      return { notes: steps.map((st) => midiFrom(k, st)), caption: `La pentatónica ${k.mode === 'minor' ? 'menor' : 'mayor'} de ${noteName(k.tonic)}.` };
    },
  },
  {
    id: 'tonos-enteros',
    term: 'Escala de tonos enteros',
    match: ['escala de tonos enteros', 'tonos enteros'],
    text: 'Una escala de seis notas, todas a un tono de distancia. Como todas están a la misma distancia, ninguna suena a casa: suena a sueño o a flotar. Muy de Debussy.',
    example: (k) => ({ notes: [0, 2, 4, 6, 8, 10, 12].map((st) => midiFrom(k, st)), caption: `La escala de tonos enteros desde ${noteName(k.tonic)}.` }),
  },
  {
    id: 'escala-disminuida',
    term: 'Escala disminuida',
    match: ['escala disminuida', 'octatónica'],
    text: 'Una escala de ocho notas que alterna tonos y semitonos (también se llama octatónica). Se repite cada tres semitonos, así que ninguna nota suena a casa: suena tensa e inquietante. Muy del jazz y de las bandas sonoras de suspense.',
    example: (k) => ({ notes: [0, 2, 3, 5, 6, 8, 9, 11, 12].map((st) => midiFrom(k, st)), caption: `La escala disminuida desde ${noteName(k.tonic)}, tono y semitono.` }),
  },
  {
    id: 'inversion',
    term: 'Inversión',
    match: ['inversiones', 'inversión', 'en el bajo'],
    text: () => `Un acorde con otra de sus notas en el bajo, en lugar de su raíz. Se escribe con una barra: ${sym('C')}/${noteName('E')} es ${sym('C')} con ${noteName('E')} abajo. Suena al mismo acorde, pero más ligero, y sirve para que el bajo vaya por pasos cortos de un acorde al siguiente.`,
    example: (k, label) => {
      const I = tonicChord(k);
      const bass = (c, i) => parseChord(`${c.root}${c.suffix}/${c.notes[i]}`);
      const chords = [I, bass(I, 1), bass(I, 2)];
      return { chords, caption: `${chords.map(label).join(', ')}: el mismo acorde con la raíz, la tercera y la quinta en el bajo.` };
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
      return { chords: [I], caption: `${chordLabel(I, false)} o ${chordLabel(I, true)}: el mismo acorde con sus dos nombres.` };
    },
  },
];

// Variantes con nombre propio, explicadas dentro de su modo.
const MODE_VARIANTS = {
  phrygian: [
    { match: 'frigio dominante', text: 'Si además el acorde de la tónica es mayor, se llama frigio dominante: el sonido del flamenco.' },
    { match: 'doble armónica', text: 'Y si al frigio dominante se le sube también la séptima nota, es la doble armónica (o bizantina): muy oriental, el sonido que se asocia a la música árabe.' },
  ],
  dorian: [
    { match: 'dórico ♯4', text: 'Si además la cuarta nota sube medio tono, se llama dórico ♯4 o modo ucraniano: melancólico y exótico, típico de la música klezmer.' },
  ],
  lydian: [
    { match: 'lidio dominante', text: 'Si además la séptima nota baja medio tono, se llama lidio dominante: el acorde de casa admite una séptima, como una dominante que no tiene prisa por resolver, y suena a ensueño con un punto de blues.' },
    { match: 'lidio aumentado', text: 'Si lo que sube es la quinta, se llama lidio aumentado: el acorde de casa es aumentado, brillante y misterioso.' },
  ],
  aeolian: [
    { match: 'menor armónica', text: 'Si la séptima nota sube medio tono para tirar hacia la tónica (la sensible), se llama menor armónica.' },
    { match: 'menor melódica', text: 'Si suben a la vez la sexta y la séptima, se llama menor melódica: la «menor del jazz», más suave y luminosa.' },
  ],
};

// Un término por cada modo, con su escala para escuchar.
const MODE_TERMS = MODES.map((mode) => {
  const variants = MODE_VARIANTS[mode.id] ?? [];
  return {
    id: `modo-${mode.id}`,
    term: `Modo ${mode.name}`,
    match: [...variants.map((v) => v.match), mode.name],
    text: [MODE_INFO[mode.id].text, ...variants.map((v) => v.text)].join(' '),
    example: (k) => {
      const scale = modeScale(mode.id, k.tonic);
      const start = 60 + k.pc;
      const notes = [...scale.map((n) => start + Interval.semitones(Interval.distance(scale[0], n))), start + 12];
      return { notes, caption: `La escala de ${noteName(k.tonic)} ${mode.name}: ${scale.map((n) => noteName(n)).join(' ')}.` };
    },
  };
});
GLOSSARY.push(...MODE_TERMS);

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));
const BY_WORD = new Map(GLOSSARY.flatMap((e) => e.match.map((w) => [w, e])));

export const glossaryEntry = (id) => BY_ID.get(id);

export const termText = (entry) => (typeof entry.text === 'function' ? entry.text() : entry.text);

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
