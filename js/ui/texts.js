// Textos didácticos. Tono cercano, sin tecnicismos sin explicar.

import { Note } from '../../vendor/tonal.mjs';
import { keyName, chordLabel, latinNote } from '../core/names.js';
import { chordOnDegree, normalVersion } from '../core/build.js';

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

export const CADENCE_TEXT =
  'Una cadencia es la forma en que se cierra una frase musical, como la puntuación al escribir: hay finales que suenan a punto final, otros a coma y otros a sorpresa.';

export const TRANSPOSE_TEXT =
  'Cambia todos los acordes a otra tonalidad sin cambiar las distancias entre ellos: suena igual, pero más agudo o más grave. Sirve para adaptarla a tu voz o buscar acordes más fáciles.';

export const NO_PROGRESSION_TEXT =
  'No coincide con ninguna progresión famosa del catálogo. ¡Eso no la hace peor: puede que sea tuya!';

export function alternativeText(key, alt, relative) {
  const a = keyName(key);
  const b = keyName(alt);
  if (relative) {
    return `${a} y ${b} usan exactamente las mismas notas: son tonalidades «relativas». Lo que cambia es qué acorde suena a casa. Escucha la progresión terminando en cada una y decide cuál te suena a final.`;
  }
  return `${b} también encaja: comparte casi todos los acordes con ${a}. Escucha la progresión terminando en cada una y decide cuál te suena a final.`;
}

// Explicación extra según el tipo de acorde (ver core/classify.js). Texto sin HTML.
export function kindText(item, key, { latin = false } = {}) {
  const name = keyName(key);
  const label = (c) => chordLabel(c, latin);
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
      return `Es un sustituto tritonal: ocupa el lugar de ${label(normal)}, la dominante de ${towards}. Sus raíces están a un tritono de distancia y comparten las dos notas que crean la tensión (${shared.map(latinNote).join(' y ')}), así que empuja igual hacia ${label(target)}, pero con el bajo bajando medio tono. Es muy típico del jazz.`;
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
