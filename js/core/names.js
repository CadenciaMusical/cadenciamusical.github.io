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

// Cifrado legible: 'Bbm7' → 'B♭m7'; en latino: 'Si♭m7'.
export function chordLabel(chord, latin = latinByDefault) {
  const bass = chord.bass ? '/' + noteName(chord.bass, latin) : '';
  return noteName(chord.root, latin) + chord.suffix.replace(/#/g, '♯') + bass;
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

// 'Am7' → 'La menor con séptima' (o 'A menor con séptima').
export function chordName(chord) {
  const kind = chord.seventh ? SEVENTH_NAMES[chord.seventh] : TRIAD_NAMES[chord.triad];
  const joiner = chord.seventh ? ' y ' : ' con ';
  const extra = chord.tensions.length ? joiner + chord.tensions.join(' y ') : '';
  return `${noteName(chord.root)} ${kind}${extra}`;
}

// 'Do mayor' (o 'C mayor').
export function keyName(key) {
  return `${noteName(key.tonic)} ${key.mode === 'major' ? 'mayor' : 'menor'}`;
}
