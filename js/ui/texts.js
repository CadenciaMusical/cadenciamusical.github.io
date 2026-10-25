// Textos didácticos. Tono cercano, sin tecnicismos sin explicar.

import { Note } from '../../vendor/tonal.mjs';
import { keyName, chordLabel, noteName } from '../core/names.js';
import { chordOnDegree, normalVersion } from '../core/build.js';
import { parseChord } from '../core/parser.js';
import { isTonicChord } from '../core/key.js';

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
    text: 'Es como la escala menor, pero con la segunda y la quinta nota más bajas: su acorde de casa nunca acaba de sonar a reposo. Tenso y extraño, es el modo menos usado.',
    songs: [],
  },
};

// Cuando sobra una nota con nombre propio, el carácter cambia.
export const VARIANT_INFO = {
  'harmonic-minor': 'Es la escala menor con la séptima nota subida medio tono: más tensa que la menor natural, con un aire clásico y algo oriental.',
  'phrygian-dominant': 'Es el frigio con el acorde de la tónica en mayor: oscuro y luminoso a la vez, el sonido típico del flamenco.',
};

export const MODES_TEXT =
  'Además de mayor y menor, hay siete modos. Todos usan las mismas notas, pero cada uno toma una distinta como casa, y eso cambia el carácter.';

// Nombre completo de un modo encontrado: «Re mixolidio», «Mi frigio dominante».
export const modeName = (m) => keyName({ tonic: m.tonic, modal: m });

// La escala mayor o menor de siempre con la que se compara el modo.
export const parallelKeyName = (m) => keyName({ tonic: m.tonic, mode: m.id === 'lydian' || m.id === 'mixolydian' ? 'major' : 'minor' });

// Primera explicación del modo, para quien no sabe qué es.
export function modeIntroText(m) {
  const info = VARIANT_INFO[m.variant] ?? MODE_INFO[m.id].text;
  return `Esta progresión no suena del todo a ${parallelKeyName(m)}: usa una escala con alguna nota distinta, y eso le da otro color. A estas escalas se las llama modos. ${info}`;
}

// Las notas que cambian frente a la escala mayor o menor de siempre:
// ['Fa♯ en lugar de Fa']. En el frigio dominante, también la tercera.
function changedNotes(m) {
  if (!m.charNote) return [];
  const out = [`${noteName(m.charNote)} en lugar de ${noteName(m.insteadNote)}`];
  if (m.variant === 'phrygian-dominant') out.push(`${noteName(m.scale[2])} en lugar de ${noteName(Note.transpose(m.tonic, '3m'))}`);
  return out;
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
export const modeListenTitle = (m) => `Escucha el color ${m.variant === 'phrygian-dominant' ? 'frigio dominante' : m.name}`;

// Bajo el nombre de la tonalidad, cuando es un modo: cómo se relaciona con
// el mayor o el menor de siempre. m: el modo principal (detectModes).
export function modalKeyText(m) {
  const parallel = parallelKeyName(m);
  const changed = changedNotes(m);
  const two = changed.length === 2;
  const notes = two ? `${changed[0]}, y ${changed[1]}` : changed[0];
  return `La casa es ${noteName(m.tonic)}, como en ${parallel}, pero con ${notes}. ${two ? 'Esos cambios le dan' : 'Ese cambio le da'} otro color: es el modo ${m.variant === 'phrygian-dominant' ? 'frigio dominante' : m.name}.`;
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
  const intro = relative
    ? 'Usan las mismas notas (son tonalidades relativas), así que los acordes no bastan para decidir.'
    : 'Comparten casi todos los acordes, así que cuesta decidir.';
  const last = chords[chords.length - 1];
  const ending = isTonicChord(last, key) ? key : isTonicChord(last, alt) ? alt : null;
  const listen = ending
    ? `Escucha cómo suena terminando en ${noteName((ending === key ? alt : key).tonic)} y compáralo con cómo acaba ahora: la que te suene a final es la buena.`
    : 'Escucha cómo suena terminando en cada una: la que te suene a final es la buena.';
  return `${intro} ${cluesText(key, alt, chords)} ${listen}`;
}

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

// Una progresión en bucle (result.loop): no tiene final, vuelve al principio.
export function loopText(result) {
  const { chords, loop } = result;
  const first = chordLabel(chords[0]);
  const times = loop.times === 2 ? 'dos veces' : `${loop.times} veces`;
  const pattern = loop.period === 2 ? `${first} y ${chordLabel(chords[1])} se van alternando` : `los mismos ${loop.period} acordes se repiten ${times}`;
  return `Es un bucle: ${pattern}. No tiene un final propio, sino que da vueltas y vuelve siempre a ${first}, que por eso suena a casa. En una canción, así suelen ser las estrofas o los estribillos que se repiten; el final llega cuando la canción cambia de parte.`;
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
      return `Es un sustituto tritonal: ocupa el lugar de ${label(normal)}, la dominante de ${towards}. Sus raíces están a un tritono de distancia y comparten las dos notas que crean la tensión (${shared.map((n) => noteName(n)).join(' y ')}), así que empuja igual hacia ${label(target)}, pero con el bajo bajando medio tono. Es muy típico del jazz.`;
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
      return `No es de ${parallel}, pero sí de ${name}, así que aquí suena en casa.`;
    }
    case 'borrowed': {
      const parallel = keyName({ tonic: key.tonic, mode: item.from });
      const color = item.from === 'minor' ? 'más oscuro, melancólico' : 'más luminoso';
      return `Es un préstamo modal: viene de ${parallel}, que tiene la misma tónica pero el otro modo. Aporta un color ${color}.`;
    }
    case 'color':
      return `El acorde es de ${name}, pero la nota que le añade (su séptima) no. Es un toque de color.`;
    case 'blues':
      return 'En el blues, la tónica y la subdominante también llevan séptima (I7, IV7): es parte de su sonido característico.';
    case 'chromatic':
      return `No pertenece a ${name}. Aporta un color sorprendente.`;
    default:
      return '';
  }
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
