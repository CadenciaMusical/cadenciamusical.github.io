// Textos didácticos. Tono cercano, sin tecnicismos sin explicar.

import { Note } from '../../vendor/tonal.mjs';
import { keyName, chordLabel, noteName } from '../core/names.js';
import { chordOnDegree, normalVersion } from '../core/build.js';
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
    text: 'Es menor, pero con la sexta mayor: suena menos triste, con un punto de jazz, funk o folk.',
    songs: ['Oye Como Va (Santana)', 'Scarborough Fair (canción tradicional)'],
  },
  phrygian: {
    text: 'Es menor, con la segunda a solo medio tono de la tónica: suena oscuro, con aire español y flamenco.',
    songs: ['El «modo de Mi» del flamenco'],
  },
  lydian: {
    text: 'Es mayor, con la cuarta aumentada: suena luminoso, flotante, de ensueño. Es muy de bandas sonoras.',
    songs: ['La sintonía de Los Simpson', 'Flying in a Blue Dream (Joe Satriani)'],
  },
  mixolydian: {
    text: 'Es mayor, con la séptima menor: suena a rock, a blues y a folk.',
    songs: ['Sweet Home Alabama (Lynyrd Skynyrd)', 'Norwegian Wood (The Beatles)'],
  },
  aeolian: {
    text: 'Es la escala menor natural de siempre: melancólica.',
    songs: ['All Along the Watchtower (Bob Dylan)'],
  },
  locrian: {
    text: 'Su acorde de tónica es disminuido, así que nunca acaba de sonar a casa: tenso y extraño. Es el modo menos usado.',
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
export function modeName(m) {
  const tonic = noteName(m.tonic);
  if (m.variant === 'phrygian-dominant') return `${tonic} frigio dominante`;
  if (m.variant === 'harmonic-minor') return `${tonic} menor armónica`;
  return `${tonic} ${m.name}`;
}

// La nota que distingue el modo de la escala mayor o menor de siempre.
export function modeCharText(m) {
  if (!m.charNote) return '';
  const parallel = keyName({ tonic: m.tonic, mode: m.id === 'lydian' || m.id === 'mixolydian' ? 'major' : 'minor' });
  const first = `${noteName(m.charNote)} en lugar de ${noteName(m.insteadNote)}`;
  if (m.variant === 'phrygian-dominant') {
    const third = m.scale[2];
    return `Frente a ${parallel}, cambian dos notas: ${first}, y ${noteName(third)} en lugar de ${noteName(Note.transpose(m.tonic, '3m'))}.`;
  }
  return `Frente a ${parallel}, cambia una nota: ${first}.`;
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
  return `${intro} ${cluesText(key, alt, chords)} Escucha cómo suena terminando en cada una: la que te suene a final es la buena.`;
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
