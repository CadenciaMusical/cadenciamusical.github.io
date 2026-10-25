// Nombres de notas, acordes y tonalidades en español.
//
// El cifrado que se muestra (americano: C, D, E…; latino: Do, Re, Mi…) es
// una preferencia de toda la página: se cambia con setLatin() y lo usan por
// defecto noteName, chordLabel, chordName y keyName.

const LATIN = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

let latinByDefault = false;

export function setLatin(on) {
  latinByDefault = Boolean(on);
}

export const isLatin = () => latinByDefault;

function prettyAcc(acc) {
  return acc.replace(/#/g, '♯').replace(/b/g, '♭');
}

// 'Bb' → 'Si♭'
export function latinNote(note) {
  return LATIN[note[0]] + prettyAcc(note.slice(1));
}

// 'Bb' → 'B♭'
export function prettyNote(note) {
  return note[0] + prettyAcc(note.slice(1));
}

// Una nota en el cifrado elegido: 'Bb' → 'B♭' o 'Si♭'.
export function noteName(note, latin = latinByDefault) {
  return latin ? latinNote(note) : prettyNote(note);
}

// En latino, «aug», «dim» y «add9» pegados a la sílaba se leen mal («Faaug»,
// «Dodim», «Faadd9»): se escriben «Fa+», «Do°» y «Fa(add9)». Sin espacios,
// porque en la casilla los espacios separan acordes.
export const latinSuffix = (suffix) =>
  suffix
    .replace(/^(aug|aum)/i, '+')
    .replace(/^(dim|o)(?![a-z])/i, '°')
    .replace(/(?<!\()add(\d+)(?!\))/i, '(add$1)');

// Los disminuidos, con su símbolo en los dos cifrados, igual en las tarjetas
// que en los textos: B°, B°7, Bø7 (no Bdim ni Bm7b5).
const DIMINISHED = { dim: '°', o: '°', dim7: '°7', o7: '°7', m7b5: 'ø7' };

// Cifrado legible: 'Bbm7' → 'B♭m7'; en latino: 'Si♭m7'.
export function chordLabel(chord, latin = latinByDefault) {
  const bass = chord.bass ? '/' + noteName(chord.bass, latin) : '';
  const suffix = DIMINISHED[chord.suffix] ?? (latin ? latinSuffix(chord.suffix) : chord.suffix);
  return noteName(chord.root, latin) + suffix.replace(/#/g, '♯') + bass;
}

const TRIAD_NAMES = {
  M: 'mayor',
  m: 'menor',
  dim: 'disminuido',
  aug: 'aumentado',
  sus: 'suspendido',
  5: 'quinta (sin tercera)',
};

const SEVENTH_NAMES = {
  7: 'con séptima',
  maj7: 'con séptima mayor',
  m7: 'menor con séptima',
  m7b5: 'semidisminuido',
  dim7: 'disminuido con séptima',
  mMaj7: 'menor con séptima mayor',
};

// 'Am7' → 'La menor con séptima' (o 'A menor con séptima'). Las dominantes
// alteradas (G7alt, G7♭9, G7♯5…), por su nombre: 'Sol dominante alterada'.
export function chordName(chord) {
  if (chord.altered) return `${noteName(chord.root)} dominante alterada`;
  const kind = chord.seventh ? SEVENTH_NAMES[chord.seventh] : TRIAD_NAMES[chord.triad];
  const joiner = chord.seventh ? ' y ' : ' con ';
  const extra = chord.tensions.length ? joiner + chord.tensions.join(' y ') : '';
  return `${noteName(chord.root)} ${kind}${extra}`;
}

export const VARIANT_NAMES = {
  'phrygian-dominant': 'frigio dominante',
  'harmonic-minor': 'menor armónica',
  'melodic-minor': 'menor melódica',
  'lydian-dominant': 'lidio dominante',
  'lydian-augmented': 'lidio aumentado',
  'dorian-sharp4': 'dórico ♯4',
  'double-harmonic': 'doble armónica',
};

// 'Do mayor' (o 'C mayor'). Si la progresión es modal, el modo: 'La dórico'.
export function keyName(key) {
  if (key.modal) return `${noteName(key.tonic)} ${VARIANT_NAMES[key.modal.variant] ?? key.modal.name}`;
  return `${noteName(key.tonic)} ${key.mode === 'major' ? 'mayor' : 'menor'}`;
}
