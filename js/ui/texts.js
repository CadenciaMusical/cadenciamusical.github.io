// Textos didácticos. Tono cercano, sin tecnicismos sin explicar.

import { Note } from '../../vendor/tonal.mjs';
import { keyName, chordLabel, noteName, VARIANT_NAMES } from '../core/names.js';
import { chordOnDegree, normalVersion } from '../core/build.js';
import { parseChord } from '../core/parser.js';
import { modeById, modeScale, plainScale } from '../core/modes.js';
import { isTonicChord, isLoopLike, fifthAlternation } from '../core/key.js';

export const FUNCTIONS = {
  T: {
    name: 'Tónica',
    short: 'Reposo',
    text: 'Es «casa». Suena estable y en calma: las canciones suelen empezar y terminar aquí.',
  },
  S: {
    name: 'Subdominante',
    short: 'Movimiento',
    text: 'Te aleja de casa. Da sensación de avanzar, de salir de paseo, sin llegar a ser tensa.',
  },
  D: {
    name: 'Dominante',
    short: 'Tensión',
    text: 'Crea tensión y «pide» volver a casa. Cuando por fin llega la tónica, se nota un alivio.',
  },
  // Los °7 de paso y de nota común: ni reposo, ni movimiento, ni tensión propios.
  P: {
    name: 'De paso',
    short: 'Puente',
    text: 'No tiene un papel propio en la tonalidad: hace de puente o de adorno y lleva el oído hacia el acorde que viene después.',
  },
  // Sin tonalidad clara (solo aumentados o °7), no hay papel que dar.
  N: {
    name: 'Sin tonalidad',
    short: 'Flotante',
    text: 'Sin una tonalidad clara no hay casa a la que volver, así que el acorde no tiene un papel fijo: flota.',
  },
  X: {
    name: 'Fuera de la tonalidad',
    short: 'Sorpresa',
    text: 'No pertenece a la tonalidad, así que suena inesperado.',
  },
};

export const KEY_TEXT =
  'La tonalidad es como el «barrio» de la canción: una nota hace de casa (la tónica) y hay un grupo de acordes que suenan bien a su alrededor.';

export const MODE_TEXT = {
  major: 'Mayor: suele sonar luminosa, alegre.',
  minor: 'Menor: suele sonar más oscura o melancólica.',
};

export const DEGREE_TEXT =
  'El grado dice qué lugar ocupa el acorde contando desde la tónica, que es el I. En mayúsculas (IV) es un acorde mayor; en minúsculas (vi), menor.';

export const CONFIDENCE_TEXT = {
  alta: 'Los acordes apuntan claramente a esta tonalidad.',
  media: 'Es la opción más probable, aunque hay otra cerca.',
  baja: 'Hay una duda real: otra tonalidad es casi igual de probable.',
};

export const TRANSPOSE_TEXT =
  'Cambia todos los acordes a otra tonalidad sin cambiar las distancias entre ellos: suena igual, pero más agudo o más grave. Sirve para adaptarla a tu voz o buscar acordes más fáciles.';

// Carácter de cada modo y canciones donde se oye.
export const MODE_INFO = {
  ionian: {
    text: 'Es la escala mayor de siempre: luminosa y estable.',
    songs: ['Casi todo el pop: Let It Be (The Beatles)'],
  },
  dorian: {
    text: 'Es como la escala menor, pero con la sexta nota medio tono más alta: suena menos triste, con un punto de jazz, funk o folk.',
    songs: ['Oye Como Va (Santana)', 'Scarborough Fair (canción tradicional)'],
  },
  phrygian: {
    text: 'Es como la escala menor, pero con la segunda nota pegadita a la tónica (a medio tono): suena oscuro, con aire español y flamenco.',
    songs: ['El «modo de Mi» del flamenco'],
  },
  lydian: {
    text: 'Es como la escala mayor, pero con la cuarta nota medio tono más alta: suena luminoso, flotante, de ensueño. Es muy de bandas sonoras.',
    songs: ['La sintonía de Los Simpson', 'Flying in a Blue Dream (Joe Satriani)'],
  },
  mixolydian: {
    text: 'Es como la escala mayor, pero con la séptima nota medio tono más baja: suena a rock, a blues y a folk.',
    songs: ['Sweet Home Alabama (Lynyrd Skynyrd)', 'Norwegian Wood (The Beatles)'],
  },
  aeolian: {
    text: 'Es la escala menor natural de siempre: melancólica.',
    songs: ['All Along the Watchtower (Bob Dylan)'],
  },
  locrian: {
    text: 'Es como la escala menor, pero con la segunda y la quinta nota más bajas. Su acorde de casa es disminuido: inestable, siempre quiere ir a otro sitio y nunca acaba de sonar a reposo. Por eso, tenso y extraño, es el modo que menos se usa.',
    songs: [],
  },
};

// Cuando sobra una nota con nombre propio, el carácter cambia.
export const VARIANT_INFO = {
  'harmonic-minor': 'Es la escala menor con la séptima nota subida medio tono: más tensa que la menor natural, con un aire clásico y algo oriental.',
  'melodic-minor': 'Es la escala menor con la sexta y la séptima nota subidas medio tono: conserva el color menor del acorde de casa, pero suena más suave y luminosa, y la séptima tira hacia la tónica. Es la «menor del jazz».',
  'phrygian-dominant': 'Es el frigio con el acorde de la tónica en mayor: oscuro y luminoso a la vez, el sonido típico del flamenco.',
  'lydian-dominant': 'Es el lidio con la séptima nota medio tono más baja: tiene la cuarta subida del lidio, que suena a ensueño, y la séptima baja del mixolidio, que suena a blues. Por eso el acorde de casa admite una séptima, como una dominante, pero no tiene prisa por ir a ningún sitio. Es muy de jazz y de bandas sonoras.',
  'lydian-augmented': 'Es el lidio con la quinta nota subida medio tono: el acorde de casa es aumentado, y por eso nunca acaba de asentarse. Brillante y misterioso, muy de bandas sonoras.',
  'dorian-sharp4': 'Es el dórico con la cuarta nota subida medio tono (también se llama modo ucraniano): entre la tercera y la cuarta queda un salto de tono y medio que le da un aire melancólico y exótico. Típico de la música klezmer y de Europa del Este.',
  'double-harmonic': 'Es la escala mayor con la segunda y la sexta nota bajadas medio tono (también se llama bizantina). Muy oriental: es el sonido que se asocia a la música árabe; dos saltos de tono y medio la hacen inconfundible.',
};

// Las variantes que son una escala, no un modo: «la escala menor melódica».
const SCALE_VARIANTS = new Set(['harmonic-minor', 'melodic-minor', 'double-harmonic']);

// El nombre del modo o de su variante: «frigio dominante», «dórico».
const modeKind = (m) => VARIANT_NAMES[m.variant] ?? m.name;

// «el modo dórico», «la escala menor melódica».
const modeKindPhrase = (m) => (SCALE_VARIANTS.has(m.variant) ? `la escala ${modeKind(m)}` : `el modo ${modeKind(m)}`);

// ¿Cambia más de una nota frente al mayor o el menor de siempre?
export const twoChanges = (m) => changedNotes(m).length > 1;

export const MODES_TEXT =
  'Además de mayor y menor, hay siete modos. Todos usan las mismas notas, pero cada uno toma una distinta como casa, y eso cambia el carácter.';

// Nombre completo de un modo encontrado: «Re mixolidio», «Mi frigio dominante».
export const modeName = (m) => keyName({ tonic: m.tonic, modal: m });

// La escala mayor o menor de siempre con la que se compara el modo.
export const parallelKeyName = (m) => keyName({ tonic: m.tonic, mode: modeById(m.id).compare });

// Primera explicación del modo, para quien no sabe qué es.
export function modeIntroText(m) {
  const info = VARIANT_INFO[m.variant] ?? MODE_INFO[m.id].text;
  return `Esta progresión no suena del todo a ${parallelKeyName(m)}: usa una escala con alguna nota distinta, y eso le da otro color. A estas escalas se las llama modos. ${info}`;
}

// Las notas que cambian frente a la escala mayor o menor de siempre:
// ['Fa♯ en lugar de Fa']. En el frigio dominante, también la tercera.
function changedNotes(m) {
  if (!m.charNote) return [];
  const plain = plainScale(m.id, m.tonic);
  return m.scale
    .map((n, i) => (Note.chroma(n) === Note.chroma(plain[i]) ? null : `${noteName(n)} en lugar de ${noteName(plain[i])}`))
    .filter(Boolean);
}

// La nota que distingue el modo de la escala mayor o menor de siempre.
export function modeCharText(m) {
  const changed = changedNotes(m);
  if (changed.length === 0) return '';
  const parallel = parallelKeyName(m);
  if (changed.length === 2) return `Frente a ${parallel}, cambian dos notas: ${changed[0]}, y ${changed[1]}.`;
  return `Frente a ${parallel}, cambia una nota: ${changed[0]}.`;
}

// Título de la tarjeta del modo cuando la tonalidad ya lo nombra: «Escucha el color dórico».
export const modeListenTitle = (m) => (SCALE_VARIANTS.has(m.variant) ? `Escucha el color de la ${modeKind(m)}` : `Escucha el color ${modeKind(m)}`);

// Bajo el nombre de la tonalidad, cuando es un modo: cómo se relaciona con
// el mayor o el menor de siempre. m: el modo principal (detectModes).
export function modalKeyText(m) {
  const parallel = parallelKeyName(m);
  const changed = changedNotes(m);
  const two = changed.length === 2;
  const notes = two ? `${changed[0]}, y ${changed[1]}` : changed[0];
  return `La casa es ${noteName(m.tonic)}, como en ${parallel}, pero con ${notes}. ${two ? 'Esos cambios le dan' : 'Ese cambio le da'} otro color: es ${modeKindPhrase(m)}.`;
}

// Las notas que no caben en el modo.
export function modeForeignText(m) {
  if (m.foreign.length === 0) return '';
  const notes = m.foreign.map((n) => noteName(n));
  if (m.variant === 'harmonic-minor') {
    return `El ${notes[0]} no es de la escala: sube medio tono para tirar hacia la tónica (es la sensible). Con ese cambio, la escala se llama menor armónica.`;
  }
  if (m.variant === 'phrygian-dominant') {
    return `El ${notes[0]} no es del frigio: convierte en mayor el acorde de la tónica. Es el frigio dominante, el sonido típico del flamenco.`;
  }
  if (m.variant === 'lydian-dominant' && m.id === 'mixolydian') {
    return `El ${notes[0]} no es del mixolidio: es la cuarta subida del lidio. Con ella, el mixolidio se convierte en lidio dominante, que suena a blues y a ensueño a la vez.`;
  }
  if (m.variant === 'lydian-dominant') {
    return `El ${notes[0]} no es del lidio: le pone una séptima menor al acorde de la tónica (${noteName(m.tonic)}7). Es el lidio dominante, con un punto de blues.`;
  }
  if (m.variant === 'melodic-minor') {
    const which = notes.length === 1 ? `El ${notes[0]} no es` : `El ${notes[0]} y el ${notes[1]} no son`;
    return `${which} de la escala de siempre: con la sexta y la séptima subidas, la escala se llama menor melódica, la «menor del jazz».`;
  }
  if (m.variant === 'lydian-augmented') {
    return `El ${notes[0]} no es del lidio: sube la quinta del acorde de la tónica y lo vuelve aumentado (${noteName(m.tonic)}+). Es el lidio aumentado, brillante y misterioso.`;
  }
  if (m.variant === 'dorian-sharp4') {
    return `El ${notes[0]} no es del dórico: es su cuarta nota subida medio tono. Con ella, la escala se llama dórico ♯4 o modo ucraniano, muy de la música klezmer.`;
  }
  if (m.variant === 'double-harmonic') {
    return `${listJoin(notes)} no son de la escala mayor: bajan la segunda y la sexta nota medio tono. Con esos dos cambios, la escala se llama doble armónica, el sonido que se asocia a la música árabe.`;
  }
  const list = notes.length === 1 ? `el ${notes[0]}` : `${notes.slice(0, -1).join(', ')} y ${notes[notes.length - 1]}`;
  return `Hay notas que no caben en este modo (${list}). Es normal: las canciones mezclan.`;
}

// Cómo se relaciona el modo con la tonalidad detectada.
export function modeVsKeyText(m, key) {
  const k = keyName(key);
  if (key.modal) return `Los grados de los acordes se cuentan desde ${noteName(m.tonic)}, la casa del modo.`;
  const same = m.pc === key.pc && ((m.id === 'ionian' && key.mode === 'major') || (m.id === 'aeolian' && key.mode === 'minor'));
  if (same) return `Coincide con la tonalidad: ${k}.`;
  if (m.pc === key.pc) {
    return `La tonalidad lo explica como ${k} con algún acorde de fuera; el modo, como una escala propia. Son dos formas de ver lo mismo.`;
  }
  return `La tonalidad apunta a ${k}; el modo toma ${noteName(m.tonic)} como casa. Son dos formas de oír lo mismo: escucha cuál te suena a final.`;
}

// Por qué cuesta decidir entre la tonalidad detectada y la alternativa. Las
// pistas son el primer y el último acorde: las canciones suelen empezar y,
// sobre todo, acabar en casa.
export function alternativeText(key, alt, relative, chords) {
  // Mi Lam Mi Lam: Mi mayor con el iv prestado, o el V–i de La menor. Una
  // idea por frase: por qué suena a casa, qué más puede ser y cómo decidir.
  if (isFifthAlternation(key, alt, chords)) {
    const V = chordLabel(chords.find((c) => c.pc === key.pc));
    const loop = isLoopLike(chords);
    const first = isTonicChord(chords[0], key);
    const last = !loop && isTonicChord(chords[chords.length - 1], key);
    const where = first && last ? 'empieza y acaba ahí' : first ? 'empieza ahí' : last ? 'acaba ahí' : null;
    const home = where ? `${V} suena a casa porque la progresión ${where}.` : `${V} puede sonar a casa.`;
    const other = `Pero ${V} también puede ser la dominante de ${keyName(alt)}: un acorde mayor que va y vuelve al menor que tiene una quinta por debajo.`;
    const listen = loop
      ? 'Escucha unas vueltas: donde descanse tu oído, ahí está la casa.'
      : 'Escucha cómo suena terminando en cada una: donde descanse tu oído, ahí está la casa.';
    return `${home} ${other} ${listen}`;
  }
  // Sin terceras (Do5 Fa5 Sol5 Do5), la misma tónica vale en mayor y en menor.
  if (key.pc === alt.pc && chords.every((c) => c.triad === '5' || c.triad === 'sus')) {
    const third = (i) => noteName(Note.transpose(key.tonic, i));
    return `Ninguno de estos acordes lleva tercera, que es la nota que decide entre mayor y menor, así que la progresión encaja igual de bien en ${keyName(key)} que en ${keyName(alt)}. Lo decide la melodía (o el resto de la canción): con ${third('3M')}, es ${keyName({ tonic: key.tonic, mode: 'major' })}; con ${third('3m')}, ${keyName({ tonic: key.tonic, mode: 'minor' })}.`;
  }
  // Un modo frente al mayor o el menor con sus mismas notas (Re dórico y Do mayor).
  const mode = Boolean(key.modal) !== Boolean(alt.modal) && sameScale(key, alt) && (key.modal ? key : alt);
  const intro = relative
    ? 'Usan las mismas notas (son tonalidades relativas), así que los acordes no bastan para decidir.'
    : mode
      ? `Usan las mismas notas, pero ${keyName(mode)} toma ${noteName(mode.tonic)} como casa: es un modo, las notas de siempre con otro centro.`
      : 'Comparten casi todos los acordes, así que cuesta decidir.';
  // En un bucle no hay final: ni el último acorde es pista ni se puede «acabar».
  if (isLoopLike(chords)) {
    return `${intro} ${loopCluesText(key, alt, chords)} Escucha unas vueltas: donde descanse tu oído, ahí está la casa.`;
  }
  const last = chords[chords.length - 1];
  const ending = isTonicChord(last, key) ? key : isTonicChord(last, alt) ? alt : null;
  const listen = ending
    ? `Escucha cómo suena terminando en ${noteName((ending === key ? alt : key).tonic)} y compáralo con cómo acaba ahora: la que te suene a final es la buena.`
    : 'Escucha cómo suena terminando en cada una: la que te suene a final es la buena.';
  return `${intro} ${cluesText(key, alt, chords)} ${listen}`;
}

// ¿Duda entre un mayor y el menor una quinta por debajo, con los que alterna?
function isFifthAlternation(key, alt, chords) {
  const fifths = fifthAlternation(chords);
  return Boolean(fifths) && key.mode === 'major' && key.pc === fifths.dominant.pc && alt.mode === 'minor' && alt.pc === fifths.tonic.pc;
}

// Una nota aparte, más pequeña, bajo las dos opciones: si la casa es el
// mayor de Mi Lam Mi Lam, también encaja el frigio dominante. Si no, ''.
export function alternativeNoteText(key, alt, chords) {
  if (!isFifthAlternation(key, alt, chords)) return '';
  const flamenco = keyName({ tonic: key.tonic, modal: { variant: 'phrygian-dominant' } });
  return `Si la casa es ${noteName(key.tonic)}, también encaja ${flamenco}, el sonido del flamenco, que tiene estos dos acordes.`;
}

// Las notas de la escala de una tonalidad o de un modo, como clases de altura.
const scaleOf = (k) => (k.modal ? k.modal.degrees.map((d) => d.st) : SCALE_STEPS[k.mode]).map((st) => (k.pc + st) % 12).sort((a, b) => a - b).join();
const sameScale = (a, b) => scaleOf(a) === scaleOf(b);

function cluesText(key, alt, chords) {
  if (chords.length < 2) return '';
  const first = chords[0];
  const last = chords[chords.length - 1];
  const whose = (chord) => (isTonicChord(chord, key) ? key : isTonicChord(chord, alt) ? alt : null);
  const start = whose(first);
  const end = whose(last);
  const startText = start ? `Empieza en ${chordLabel(first)}, la casa de ${keyName(start)}` : null;
  let endText;
  if (end) endText = `acaba en ${chordLabel(last)}, la casa de ${keyName(end)}`;
  else endText = `acaba en ${chordLabel(last)}, que no es la casa de ninguna de las dos`;
  if (!startText) return `${endText[0].toUpperCase()}${endText.slice(1)}.`;
  const joiner = start === end ? ' y también ' : ', pero ';
  return `${startText}${joiner}${endText}.`;
}

// En un bucle solo el primer acorde es pista: el último no es un final.
// Una sola frase.
function loopCluesText(key, alt, chords) {
  const first = chords[0];
  const start = isTonicChord(first, key) ? key : isTonicChord(first, alt) ? alt : null;
  return start
    ? `Empieza en ${chordLabel(first)}, la casa de ${keyName(start)}, y como es un bucle, el último acorde no es un final.`
    : 'Es un bucle: el último acorde no es un final, así que no sirve de pista.';
}

// Cambios de tonalidad (result.sections): dónde cambia cada vez. «Empieza en
// Do mayor y en el acorde 5 cambia a Mi♭ mayor.»
export function sectionsText(sections) {
  const [first, ...rest] = sections;
  const changes = rest.map((s, i) => (i === 0 ? `en el acorde ${s.start + 1} cambia a ${keyName(s.key)}` : `en el acorde ${s.start + 1}, a ${keyName(s.key)}`));
  const list = changes.length === 1 ? changes[0] : `${changes.slice(0, -1).join(', ')} y ${changes[changes.length - 1]}`;
  return `Empieza en ${keyName(first.key)} y ${list}. Es un cambio de tonalidad: la casa se muda a otra nota, y los grados de cada tramo se cuentan desde la suya.`;
}

// Qué tipo de cambio es (section.type, ver modulationType en core/sections.js).
export function modulationText(from, to) {
  const a = keyName(from.key);
  const b = keyName(to.key);
  const up = (to.key.pc - from.key.pc + 12) % 12;
  switch (to.type) {
    case 'relative':
      return `De ${a} a ${b}, su relativa: el cambio más natural, a una tonalidad vecina. Usan las mismas notas; solo cambia cuál suena a casa.`;
    case 'dominant':
      return `De ${a} a ${b}, la tonalidad de su dominante: el cambio más natural, a una tonalidad vecina.`;
    case 'subdominant':
      return `De ${a} a ${b}, la tonalidad de su subdominante: un cambio suave, a una tonalidad vecina.`;
    case 'near':
      return `De ${a} a ${b}: un cambio suave, a una tonalidad vecina, con casi todas las notas en común.`;
    case 'parallel':
      return `De ${a} a ${b}: la casa es la misma nota, pero cambia de ${from.key.mode === 'major' ? 'mayor a menor y la luz se vuelve sombra' : 'menor a mayor y la sombra se vuelve luz'}.`;
    case 'lift':
      return `De ${a} a ${b}, ${up === 1 ? 'medio tono' : 'un tono'} más arriba: el salto del último estribillo, para darle más energía.`;
    default:
      return `De ${a} a ${b}: un cambio brusco, de color muy distinto.`;
  }
}

// La tercera de picardía (item.kind 'picardy'): el último acorde, mayor, en
// una obra en menor.
export function picardyText(item, key) {
  const third = noteName(Note.transpose(key.tonic, '3M'));
  return `Un final en mayor en una obra en menor: la tristeza se ilumina en el último momento. Muy de Bach. ${chordLabel(item.chord)} es el acorde de la tónica, pero mayor: su tercera, ${third}, sube medio tono. Se llama tercera de picardía.`;
}

// Un riff de acordes de quinta sacado de una pentatónica (result.pentatonic).
export function pentatonicText(p) {
  const which = p.mode === 'minor'
    ? `la escala pentatónica menor de ${noteName(p.tonic)}, la más usada en el rock y el blues`
    : `la escala pentatónica mayor de ${noteName(p.tonic)}, muy usada en el rock, el country y el folk`;
  return `Estos acordes salen de ${which}. Son acordes de quinta («5»): solo llevan la fundamental y la quinta, sin tercera, así que no son ni mayores ni menores y suenan potentes con distorsión.`;
}

// En menor, con la sexta y la séptima subidas a la vez (result.melodic).
export function melodicMinorText(m) {
  return `Con ${noteName(m.sixth)} y ${noteName(m.seventh)} a la vez, usa la escala menor melódica.`;
}

// La tarjeta del napolitano, bajo la tonalidad. item: el acorde (kind
// 'neapolitan'); normal: el iv o el IV, cuyo lugar ocupa.
export function neapolitanText(item, key, normal) {
  const what = item.sixth
    ? `${chordLabel(item.chord)} es la sexta napolitana: un acorde mayor medio tono por encima de la tónica, con ${noteName(Note.transpose(key.tonic, '4P'))} en el bajo.`
    : `${chordLabel(item.chord)} es el acorde napolitano: un acorde mayor medio tono por encima de la tónica.`;
  return `${what} Ocupa el lugar de ${chordLabel(normal)} y prepara la dominante con dramatismo. Muy de Bach, Mozart y Beethoven.`;
}

// Un bucle que gira alrededor de un disminuido (result.locrian).
export function locrianText(chord, key) {
  return `Si giras alrededor de ${chordLabel(chord)}, estás rozando el modo locrio: casi nadie lo usa porque su casa es un acorde disminuido, que no suena a reposo. Por eso tu oído (y Cadencia) prefiere oír ${keyName(key)}.`;
}

// Una progresión en bucle (result.loop): no tiene final, vuelve al principio.
// La casa es la que ha decidido el análisis, aunque el bucle no empiece en
// ella (Si° Do Si° Do gira alrededor de Do). Un disminuido nunca es la casa.
export function loopText(result) {
  const { chords, loop, key } = result;
  const first = chordLabel(chords[0]);
  const times = loop.times === 2 ? 'dos veces' : `${loop.times} veces`;
  const pattern = loop.period === 2 ? `${first} y ${chordLabel(chords[1])} se van alternando` : `los mismos ${loop.period} acordes se repiten ${times}`;
  const song = 'En una canción, así suelen ser las estrofas o los estribillos que se repiten; el final llega cuando la canción cambia de parte.';
  const isHome = (c) => c.pc === key.pc && c.triad !== 'dim';
  if (isHome(chords[0])) {
    return `Es un bucle: ${pattern}. No tiene un final propio, sino que da vueltas y vuelve siempre a ${first}, que por eso suena a casa. ${song}`;
  }
  const home = chords.slice(0, loop.period).find(isHome);
  if (home) {
    const h = chordLabel(home);
    return `Es un bucle: ${pattern}. Empieza en ${first}, pero la casa es ${h}: el bucle gira a su alrededor y cada vuelta descansa en ${h}. ${song}`;
  }
  if (chords[0].triad === 'dim') {
    return `Es un bucle: ${pattern}. No tiene un final propio, sino que da vueltas y vuelve siempre a ${first}, pero, como es un acorde disminuido, no llega a sonar a reposo: se oye ${keyName(key)}. ${song}`;
  }
  return `Es un bucle: ${pattern}. No tiene un final propio, sino que da vueltas y vuelve siempre a ${first}, aunque la casa es ${noteName(key.tonic)}. ${song}`;
}

// Explicación extra según el tipo de acorde (ver core/classify.js). Texto sin HTML.
export function kindText(item, key) {
  const name = keyName(key);
  const label = (c) => chordLabel(c);
  const target = item.target ? chordOnDegree(key, item.target.st, item.target.triad) : null;
  switch (item.kind) {
    case 'secondary': {
      const after = item.target.resolves ? ` Y justo después llega ${label(target)}, como esperaba el oído.` : '';
      return `Es una dominante secundaria, un acorde «invitado»: no es de ${name}, pero es la dominante de ${label(target)} (el ${item.target.roman}). Por eso se escribe ${item.roman}, que se lee «quinto del ${item.target.roman}». Su tensión empuja hacia ${label(target)}.${after}`;
    }
    case 'tritone': {
      const normal = normalVersion(item, key);
      // Con los nombres de la dominante normal (Si, no Do♭).
      const shared = normal.notes.filter((n) => item.chord.notes.some((m) => Note.chroma(m) === Note.chroma(n)));
      const towards = item.target.st === 0 ? `la tónica, ${label(target)}` : label(target);
      const tension = shared.map((n) => noteName(n)).join(' y ');
      if (item.augmentedSixth) {
        // Su séptima, escrita como la nota medio tono por debajo de la dominante (E♭ → D♯ en La menor).
        const V = Note.transpose(key.tonic, '5P');
        const seventh = Note.transpose(V, '-2m');
        return `En clásica se llama sexta aumentada alemana: su séptima, escrita como ${noteName(seventh)}, sube a ${noteName(V)}. En jazz, el mismo sonido se llama sustituto tritonal de la dominante: ocupa el lugar de ${label(normal)}, la dominante de ${towards}, y comparte con él las dos notas que crean la tensión (${tension}), así que empuja igual hacia ${label(target)}, con el bajo bajando medio tono.`;
      }
      return `Es un sustituto tritonal: ocupa el lugar de ${label(normal)}, la dominante de ${towards}. Sus raíces están a un tritono de distancia y comparten las dos notas que crean la tensión (${tension}), así que empuja igual hacia ${label(target)}, pero con el bajo bajando medio tono. Es muy típico del jazz.`;
    }
    case 'backdoor': {
      const normal = normalVersion(item, key);
      return `Es la dominante por la puerta de atrás. En lugar de llegar a casa desde ${label(normal)}, se llega desde ${label(item.chord)}, un acorde prestado de ${keyName({ tonic: key.tonic, mode: 'minor' })}. Suena más suave y nostálgico; muy del jazz y del soul.`;
    }
    case 'leading':
      return `Es un acorde disminuido «de paso»: está medio tono por debajo de ${label(target)} y lo prepara, igual que la sensible prepara la tónica. Por eso se escribe ${item.roman}.`;
    case 'dim7':
      return dim7Text(item, key);
    case 'modal': {
      const parallel = keyName({ tonic: key.tonic, mode: key.mode });
      const char = key.modal.charNote;
      const has = char && item.chord.notes.some((n) => Note.chroma(n) === Note.chroma(char));
      if (has) return `No es de ${parallel}, pero sí de ${name}: lleva ${noteName(char)}, la nota que distingue el modo. Es el acorde que le da su color.`;
      // Otra nota que no es de la escala de siempre (el Si♭ del Do7 en Do lidio dominante).
      const outside = outsideNotes(item.chord, { tonic: key.tonic, mode: key.mode });
      if (outside.length) return `No es de ${parallel}: lleva ${listJoin(outside.map((n) => noteName(n)))}, que no es de su escala. Pero sí es de ${name}, así que aquí suena en casa y le da su color.`;
      return `No es de ${parallel}, pero sí de ${name}, así que aquí suena en casa.`;
    }
    case 'suspension': {
      const root = item.chord.root;
      const third = noteName(Note.transpose(root, item.resolvesTo.triad === 'M' ? '3M' : '3m'));
      const resolved = label(normalVersion(item, key));
      const [instead, moves] = item.sus === 'sus2' ? [`la segunda (${noteName(Note.transpose(root, '2M'))})`, 'sube'] : [`la cuarta (${noteName(Note.transpose(root, '4P'))})`, 'baja'];
      return `Es un acorde suspendido: en lugar de la tercera (${third}) lleva ${instead}, y por eso suena abierto, «en el aire». Justo después se resuelve: esa nota ${moves} a ${third} y llega ${resolved}, que suena a alivio.`;
    }
    case 'dorian': {
      const minorIV = chordOnDegree(key, 5, 'm');
      const sixth = noteName(Note.transpose(key.tonic, '6M'));
      const base = `Es el «cuarto dórico». En ${name}, el acorde del cuarto grado suele ser menor (${label(minorIV)}), pero aquí es mayor: lleva ${sixth}, la sexta nota del modo dórico (y de la escala menor melódica). Le da a la tonalidad menor un toque más luminoso, sin perder su carácter.`;
      if (!item.melodic) return base;
      const scale = modeScale('aeolian', key.tonic, 'melodic-minor').map((n) => noteName(n)).join(' ');
      const seventh = noteName(Note.transpose(key.tonic, '7M'));
      return `${base} Con el ${seventh} de ${label(item.melodic)}, la sexta y la séptima suben a la vez: es la escala menor melódica (${scale}), la «menor del jazz».`;
    }
    case 'picardy':
      return picardyText(item, key);
    case 'borrowed': {
      const parallel = keyName({ tonic: key.tonic, mode: item.from });
      const color = item.from === 'minor' ? 'más oscuro, melancólico' : 'más luminoso';
      return `Es un préstamo modal: viene de ${parallel}, que tiene la misma tónica pero el otro modo. Aporta un color ${color}.`;
    }
    case 'color': {
      const outside = outsideNotes(item.chord, key);
      const which = outside.length ? ` (${listJoin(outside.map((n) => noteName(n)))})` : '';
      return `El acorde es de ${name}, pero la nota que le añade, su séptima${which}, no. Es un toque de color.`;
    }
    case 'blues':
      return 'En el blues, la tónica y la subdominante también llevan séptima (I7, IV7): es parte de su sonido característico.';
    case 'chromatic': {
      const same = item.chord.triad === 'aug' ? ` ${sameAsText(item.chord)}` : '';
      return `No pertenece a ${name}. Aporta un color sorprendente.${same}`;
    }
    case 'augmented':
      return augmentedText(item, key);
    case 'altered':
      return alteredText(item, key);
    case 'mediant': {
      const { with: other, shared } = item.mediant;
      const kind = item.chord.triad === 'M' ? 'mayores' : 'menores';
      const common = shared.length ? `solo comparten ${noteName(shared[0])}` : 'no comparten ninguna nota';
      return `Es una mediante cromática: ${label(item.chord)} y ${label(other)} son los dos ${kind} y sus fundamentales están a una tercera, pero no son de la misma tonalidad (${common}). El salto suena grandioso y sorprendente: es el sonido épico del cine.`;
    }
    case 'major-two': {
      const minor = chordOnDegree(key, 2, 'm');
      const V = chordOnDegree(key, 7, 'M');
      return `Es un II mayor: en ${name}, el acorde del segundo grado suele ser menor (${label(minor)}), pero aquí es mayor. Es como una dominante secundaria que no va a su destino: pide ir a ${label(V)}, pero no llega, y se queda como un color brillante y luminoso. Muy de los Beatles.`;
    }
    case 'neapolitan': {
      const what = 'un acorde prestado muy expresivo, medio tono por encima de la tónica, que prepara la dominante con dramatismo. Muy de Bach, Mozart y Beethoven.';
      const fourth = noteName(Note.transpose(key.tonic, '4P'));
      return item.sixth
        ? `Es la sexta napolitana: ${what} Lleva ${fourth}, la cuarta nota de la escala, en el bajo (está en primera inversión), y por eso se llama «sexta»: entre el bajo y la raíz del acorde hay una sexta.`
        : `Es el acorde napolitano: ${what} Aquí está en estado fundamental; lo más habitual es oírlo con ${fourth}, la cuarta nota de la escala, en el bajo: es la «sexta napolitana».`;
    }
    case 'symmetric':
      return `${sameAsText(item.chord)} Por eso, solo, no apunta a ninguna tonalidad: según el acorde que venga después, puede llevar a sitios distintos.`;
    default:
      return '';
  }
}

// Las notas de un acorde que no son de la escala mayor o menor natural de la tonalidad.
const SCALE_STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

function outsideNotes(chord, key) {
  const scale = new Set(SCALE_STEPS[key.mode].map((st) => (Note.chroma(key.tonic) + st) % 12));
  return chord.notes.filter((n) => !scale.has(Note.chroma(n)));
}

// Un disminuido con séptima (ver classifyDim7 en core/classify.js). Si se
// analiza con otro de sus cuatro nombres, se dice primero.
function dim7Text(item, key) {
  const label = (c) => chordLabel(c);
  const written = label(item.chord);
  const read = item.readAs && parseChord(item.readAs + 'dim7');
  const renamed = read && read.pc !== item.chord.pc
    ? `${written} suena exactamente igual que ${label(read)}: sus cuatro notas están a la misma distancia, así que cada acorde disminuido tiene cuatro nombres. `
    : '';
  const target = item.target ? chordOnDegree(key, item.target.st, item.target.triad) : null;
  const normal = normalVersion(item, key);
  switch (item.role) {
    case 'tonic': {
      const borrowed = item.from ? ` Viene prestado de ${keyName({ tonic: key.tonic, mode: item.from })}, donde es de la tonalidad.` : '';
      return `${renamed}Hace de dominante: lleva ${noteName(item.readAs)}, la sensible, que está medio tono por debajo de ${noteName(key.tonic)} y tira hacia ella. Por eso resuelve en ${label(target)}, igual que ${label(normal)}, con el que comparte tres notas.${borrowed}`;
    }
    case 'secondary':
      return `${renamed}Funciona como una dominante secundaria, pero disminuida: lleva ${noteName(item.readAs)}, que está medio tono por debajo de ${noteName(target.root)}, y tira hacia ${label(target)} (el ${item.target.roman}). Por eso se escribe ${item.roman}, que se lee «séptimo del ${item.target.roman}». Hace lo mismo que ${label(normal)}, la dominante de ${label(target)}.`;
    case 'common':
      return `${renamed}Es un disminuido de nota común: comparte con ${label(target)} su raíz, ${noteName(item.readAs)}, que se queda quieta mientras las demás se mueven medio tono. No lleva a un sitio nuevo: adorna ${label(target)} con un instante de tensión.`;
    case 'passing': {
      const { semitones, parallel, prev, next, until } = item.passing;
      const moves = semitones > 0 ? 'sube' : 'baja';
      const end = until ? `hasta ${label(until)}` : 'hasta el final';
      if (prev) return `Es un acorde de paso: viene de ${label(prev)}, otro disminuido con séptima, y los dos ${moves}n juntos, en paralelo, ${end}.`;
      const dist = Math.abs(semitones) === 1 ? 'medio tono' : 'un tono';
      if (parallel) return `Es un acorde de paso: ${moves} ${dist} hasta ${label(next)}, otro disminuido con séptima, y los dos ${moves}n juntos, en paralelo, ${end}.`;
      return `Es un acorde de paso: ${moves} ${dist} hasta ${label(next)} y lo prepara.`;
    }
    default:
      return '';
  }
}

// Los otros nombres de un acorde simétrico: C+ → [E+, G♯+]; C°7 → [E♭°7, G♭°7, A°7].
function otherNames(chord) {
  const [suffix, steps] = chord.seventh === 'dim7' ? ['dim7', ['3m', '5d', '6M']] : ['aug', ['3M', '5A']];
  return steps.map((i) => {
    const n = Note.transpose(chord.root, i);
    // Si♯ o Mi♯ se leen peor que Do o Fa.
    return parseChord((/##|bb|^(B#|E#|Cb|Fb)$/.test(n) ? Note.simplify(n) : n) + suffix);
  });
}

const listJoin = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

// «Do+ suena exactamente igual que Mi+ y Sol♯+…».
function sameAsText(chord) {
  const dim = chord.seventh === 'dim7';
  const others = listJoin(otherNames(chord).map((c) => chordLabel(c)));
  return dim
    ? `${chordLabel(chord)} tiene sus cuatro notas a la misma distancia (tres semitonos), así que suena exactamente igual que ${others}: cada acorde disminuido tiene cuatro nombres.`
    : `${chordLabel(chord)} tiene sus tres notas a la misma distancia (cuatro semitonos), así que suena exactamente igual que ${others}: cada acorde aumentado tiene tres nombres.`;
}

// Una dominante aumentada (ver classifyAug en core/classify.js).
function augmentedText(item, key) {
  const label = (c) => chordLabel(c);
  const read = parseChord(item.readAs + 'aug');
  const renamed = read.pc !== item.chord.pc
    ? `${label(item.chord)} suena exactamente igual que ${label(read)}: sus tres notas están a la misma distancia, así que cada acorde aumentado tiene tres nombres. `
    : '';
  const target = chordOnDegree(key, item.target.st, item.target.triad);
  const raised = Note.transpose(item.readAs, '5A');
  const third = Note.transpose(target.root, item.target.triad === 'M' ? '3M' : '3m');
  const plain = label(normalVersion(item, key));
  const what = item.role === 'dominant'
    ? `Es una dominante aumentada: ${plain} con la quinta subida medio tono (${noteName(Note.simplify(raised))}).`
    : `Es una dominante aumentada, la de ${label(target)} (el ${item.target.roman}): ${plain} con la quinta subida medio tono (${noteName(Note.simplify(raised))}). Por eso se escribe ${item.roman}.`;
  return `${renamed}${what} Esa nota sube otro medio tono hasta ${noteName(third)}, la tercera de ${label(target)}, y hace la llegada aún más tensa.`;
}

// Una dominante alterada (ver classifyAltered en core/classify.js).
function alteredText(item, key) {
  const label = (c) => chordLabel(c);
  const plain = normalVersion(item, key);
  // Las notas que la alejan de la dominante de siempre (el Mi♭ y el La♯ de
  // Sol7alt), con los nombres del acorde (ver jazzSpelling en core/parser.js).
  const tense = item.chord.notes.filter((n) => !plain.notes.some((m) => Note.chroma(m) === Note.chroma(n)));
  const target = chordOnDegree(key, item.target.st, item.target.triad);
  const what = `Es una dominante alterada: una dominante con notas tensas añadidas (♭9, ♯9, ♭5 o ♯5) que suena aún más inestable y pide resolver; muy del jazz. Aquí es ${label(plain)} con ${listJoin(tense.map((n) => noteName(n)))}.`;
  if (item.target.st === 0) {
    return item.target.resolves
      ? `${what} Es la dominante de ${keyName(key)}, y resuelve en ${label(target)} con más tensión que ${label(plain)}.`
      : `${what} Es la dominante de ${keyName(key)}, pero aquí no va a ${label(target)}: la tensión se queda en el aire.`;
  }
  const whose = `Es la dominante de ${label(target)} (el ${item.target.roman}), y por eso se escribe ${item.roman}.`;
  return item.target.resolves
    ? `${what} ${whose} Justo después llega ${label(target)}, como esperaba el oído.`
    : `${what} ${whose} Pero no va a su destino: en lugar de ${label(target)} llega otro acorde, y la tensión se resuelve por sorpresa.`;
}

// Acordes que salen de una escala simétrica (result.symmetricScale).
export function symmetricScaleText(s) {
  if (s.id === 'whole-tone') {
    return 'No hay tonalidad clara: estos acordes salen de la escala de tonos enteros, que no tiene ninguna nota que suene a casa. Todas sus notas están a un tono de distancia, así que ninguna destaca sobre las demás. Suena a sueño o a flotar; muy de Debussy.';
  }
  return 'No hay tonalidad clara: estos acordes salen de la escala disminuida, que alterna tonos y semitonos. Sus fundamentales están a una tercera menor (tres semitonos) unas de otras y se reparten la octava en partes iguales, así que ninguna hace de casa. Suena tensa e inquietante; muy del jazz y de las bandas sonoras de suspense.';
}

// Cuando todos los acordes son simétricos (aumentados o °7), la tonalidad no
// está clara. Si además son el mismo acorde con distintos nombres, se dice.
export function unclearKeyText(chords) {
  const set = (c) => [...new Set(c.notes.map((n) => Note.chroma(n)))].sort().join();
  const labels = [...new Set(chords.map((c) => chordLabel(c)))];
  const one = chords.every((c) => set(c) === set(chords[0]));
  const kind = chords[0].seventh === 'dim7' ? 'disminuido con séptima' : 'aumentado';
  const count = chords[0].seventh === 'dim7' ? 'cuatro' : 'tres';
  const same = one && labels.length > 1
    ? `${listJoin(labels)} son el mismo acorde ${kind} con distintos nombres: tienen las mismas notas y suenan igual. `
    : '';
  return `${same}Los acordes aumentados y los disminuidos con séptima son simétricos: sus notas están a la misma distancia, así que ninguna destaca como casa y cada uno tiene ${one ? count : 'varios'} nombres. Sin un acorde mayor o menor que la fije, no hay una tonalidad clara. Prueba a añadir uno y oirás hacia dónde van.`;
}

// Un tramo de mediantes cromáticas (result.mediants).
export function mediantsText(run, chords) {
  const base = 'Saltos entre acordes a una tercera de distancia que no son de la misma tonalidad: suenan grandiosos y sorprendentes. Es el sonido épico del cine (John Williams, Hans Zimmer).';
  if (!run.chain) return base;
  const path = chords.slice(run.start, run.end + 1).map((c) => chordLabel(c)).join(' → ');
  return `${base} Aquí, ${path}: tres saltos iguales de tercera mayor que reparten la octava en tres partes iguales y vuelven al punto de partida.`;
}

// Una línea de bajo (ver bassLines en core/bass.js).
export function bassLineTitle(line) {
  const dir = line.dir === 'down' ? 'descendente' : 'ascendente';
  return line.chromatic ? `Bajo cromático ${dir}` : `Bajo ${dir}`;
}

export function bassLineText(line) {
  const moves = line.dir === 'down' ? 'baja' : 'sube';
  const notes = line.notes.map((n) => noteName(n)).join(' – ');
  const why = line.chromatic
    ? line.dir === 'down'
      ? 'Algunos pasos son de medio tono y usan notas de fuera de la escala (es un bajo cromático): suena melancólico, como un lamento, y es muy típico de las baladas.'
      : 'Algunos pasos son de medio tono y usan notas de fuera de la escala (es un bajo cromático): la tensión va creciendo con cada paso.'
    : `Cada acorde se apoya en la nota ${line.dir === 'down' ? 'de debajo' : 'de encima'} de la escala, y eso le da a la progresión un sentido de camino, como ${line.dir === 'down' ? 'bajar' : 'subir'} una escalera peldaño a peldaño.`;
  return `El bajo ${moves} nota a nota: ${notes}. ${why}`;
}

// La nota pedal (ver pedalLine en core/bass.js).
export function pedalText(pedal) {
  const note = noteName(pedal.note);
  return `El bajo se queda en ${note} mientras los acordes cambian por encima. Se llama nota pedal, como la nota que se deja pisada con el pie en un órgano. El ${note} del bajo no se mueve y hace de ancla: por eso ${note} suena a casa, aunque los acordes de arriba se alejen. Cuando un acorde no encaja del todo con ella, se nota una tensión suave, que se relaja al volver al acorde de ${note}.`;
}

// Un acorde con barra (ver inversionOf en core/bass.js).
export function inversionText(item) {
  const { chord, inversion } = item;
  if (!inversion) return '';
  const plain = chordLabel({ ...chord, bass: null });
  const bass = noteName(chord.bass);
  const connects = inversion.connects ? ', y conecta mejor con el acorde siguiente' : '';
  switch (inversion.type) {
    case 'third':
      return `${plain} con ${bass} en el bajo: suena a ${plain}, pero más ligero${connects}. Es la primera inversión: la tercera del acorde va abajo.`;
    case 'fifth':
      return `${plain} con ${bass} en el bajo: suena a ${plain}, pero menos asentado, como de paso${connects}. Es la segunda inversión: la quinta del acorde va abajo.`;
    case 'seventh':
      return `${plain} con ${bass} en el bajo: suena a ${plain}, pero con ganas de moverse, porque la séptima en el bajo pide bajar${connects}. Es la tercera inversión.`;
    default:
      return `${plain} con ${bass} en el bajo: el ${bass} no es una nota de ${plain}. Lo pone el bajo, que sigue su propio camino mientras arriba suena ${plain}${connects}.`;
  }
}
