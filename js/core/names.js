// Nombres de notas, acordes y tonalidades en español.

const LATIN = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

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

// Cifrado legible: 'Bbm7' → 'B♭m7'; en latino: 'Si♭m7'.
export function chordLabel(chord, latin = false) {
  const root = latin ? latinNote(chord.root) : prettyNote(chord.root);
  const bass = chord.bass ? '/' + (latin ? latinNote(chord.bass) : prettyNote(chord.bass)) : '';
  return root + chord.suffix.replace(/#/g, '♯') + bass;
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

// 'Am7' → 'La menor con séptima'
export function chordName(chord) {
  const root = latinNote(chord.root);
  const kind = chord.seventh ? SEVENTH_NAMES[chord.seventh] : TRIAD_NAMES[chord.triad];
  const joiner = chord.seventh ? ' y ' : ' con ';
  const extra = chord.tensions.length ? joiner + chord.tensions.join(' y ') : '';
  return `${root} ${kind}${extra}`;
}

export function keyName(key) {
  return `${latinNote(key.tonic)} ${key.mode === 'major' ? 'mayor' : 'menor'}`;
}
