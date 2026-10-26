import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, parseProgression, shortenWords, tokenize } from '../js/core/parser.js';
import { transposeText } from '../js/core/transpose.js';

const symbol = (c) => c.root + c.suffix + (c.bass ? '/' + c.bass : '');

test('cifrado americano', () => {
  for (const [input, expected] of [
    ['Am', 'Am'], ['G7', 'G7'], ['Cmaj7', 'Cmaj7'], ['F#m', 'F#m'], ['Bb', 'Bb'],
    ['Bm7b5', 'Bm7b5'], ['Fadd9', 'Fadd9'], ['Faug', 'Faug'], ['C6/9', 'C6/9'],
  ]) {
    const c = parseChord(input);
    assert.ok(c.ok, input);
    assert.equal(symbol(c), expected);
  }
});

test('cifrado latino', () => {
  for (const [input, expected] of [
    ['Lam', 'Am'], ['Fa', 'F'], ['Do', 'C'], ['Sol', 'G'], ['Sib', 'Bb'], ['Rem7', 'Dm7'],
    ['Fa#m', 'F#m'], ['Mib', 'Eb'], ['Do7M', 'Cmaj7'], ['Lamenor', 'Am'],
  ]) {
    const c = parseChord(input);
    assert.ok(c.ok, input);
    assert.equal(symbol(c), expected);
  }
});

test('minúsculas y mayúsculas', () => {
  assert.equal(symbol(parseChord('am')), 'Am');
  assert.equal(symbol(parseChord('lam')), 'Am');
  assert.equal(symbol(parseChord('bb')), 'Bb');
  const caps = parseProgression('LAM FA DO SOL7 SIB').map(symbol);
  assert.deepEqual(caps, ['Am', 'F', 'C', 'G7', 'Bb']);
});

test('variantes de símbolos', () => {
  assert.equal(parseChord('B°').seventh, null);
  assert.equal(parseChord('B°').triad, 'dim');
  assert.equal(parseChord('Cø').seventh, 'm7b5');
  assert.equal(parseChord('Cø7').seventh, 'm7b5');
  assert.equal(parseChord('Siø7').seventh, 'm7b5');
  assert.equal(parseChord('Am7-5').seventh, 'm7b5');
  assert.equal(parseChord('Lam7M').seventh, 'mMaj7');
});

test('«4» y «2» solos son suspendidos, no un acorde por cuartas ni un add9', () => {
  for (const [input, expected, notes] of [
    ['Do4', 'Csus4', 'C F G'], ['G4', 'Gsus4', 'G C D'], ['C(4)', 'Csus4', 'C F G'],
    ['Re2', 'Dsus2', 'D E A'], ['C7(4)', 'C7sus4', 'C F G Bb'], ['Sol7(4)', 'G7sus4', 'G C D F'],
  ]) {
    const c = parseChord(input);
    assert.ok(c.ok, input);
    assert.equal(symbol(c), expected);
    assert.equal(c.notes.join(' '), notes);
    assert.equal(c.triad, 'sus');
  }
});

test('acordes con bajo', () => {
  assert.equal(symbol(parseChord('C/E')), 'C/E');
  assert.equal(symbol(parseChord('Do/Mi')), 'C/E');
});

test('clasificación de triada y séptima', () => {
  const g7 = parseChord('G7');
  assert.equal(g7.triad, 'M');
  assert.equal(g7.seventh, '7');
  assert.deepEqual(parseChord('C9').tensions, ['novena']);
});

test('separadores', () => {
  assert.deepEqual(tokenize('C-G-Am | F, Dm7 – G7 C-'), ['C', 'G', 'Am', 'F', 'Dm7', 'G7', 'C-']);
});

test('sugerencias para lo que no se reconoce', () => {
  const bad = parseChord('Cmja7');
  assert.equal(bad.ok, false);
  assert.equal(bad.suggestions[0], 'Cmaj7');
  assert.ok(parseChord('Sl').suggestions.includes('Sol'));
  assert.deepEqual(parseChord('H7').suggestions, ['B7']);
});

test('el triángulo es maj7', () => {
  for (const text of ['CΔ7', 'CΔ', 'DoΔ7', 'DoΔ']) {
    const c = parseChord(text);
    assert.ok(c.ok, text);
    assert.equal(`${c.root} ${c.seventh}`, 'C maj7', text);
  }
  assert.equal(parseChord('AmΔ7').seventh, 'mMaj7');
});

test('sugerencias: a igual distancia, primero la que solo añade letras', () => {
  assert.equal(parseChord('Cmj7').suggestions[0], 'Cmaj7');
  assert.equal(parseChord('Cm7b').suggestions[0], 'Cm7b5');
  assert.equal(parseChord('Dmm').suggestions[0], 'Dm');
});

test('el triángulo, sin ninguna minúscula en el texto', () => {
  assert.ok(parseProgression('CΔ7 FΔ7').every((c) => c.ok && c.seventh === 'maj7'));
});

test('acordes escritos con palabras, como habla un principiante', () => {
  const read = (text) => parseProgression(text).map((c) => (c.ok ? symbol(c) : `✗${c.input}`)).join(' ');
  for (const [input, short, chords] of [
    ['La menor, Fa, Do, Sol', 'Lam, Fa, Do, Sol', 'Am F C G'],
    ['Re mayor Sol mayor La séptima', 'Re Sol La7', 'D G A7'],
    ['Si disminuido Do', 'Si° Do', 'Bdim C'],
    ['Do séptima mayor', 'Domaj7', 'Cmaj7'],
    // Sin distinguir mayúsculas ni acentos.
    ['la MENOR re menor mi septima', 'Lam Rem Mi7', 'Am Dm E7'],
    ['DO MAYOR SOL SÉPTIMA', 'Do Sol7', 'C G7'],
    ['Mi menor con séptima', 'Mim7', 'Em7'],
    ['Do aumentado Fa', 'Do+ Fa', 'C+ F'],
    ['Si disminuido séptima Do', 'Si°7 Do', 'Bdim7 C'],
    ['Fa sostenido menor Si bemol', 'Fa#m Sib', 'F#m Bb'],
    ['A menor F C G', 'Am F C G', 'Am F C G'],
  ]) {
    assert.equal(shortenWords(input), short, input);
    assert.equal(read(input), chords, input);
  }
  // Solo detrás de una nota: lo demás se queda igual.
  assert.equal(shortenWords('Am F C G'), 'Am F C G');
  assert.equal(shortenWords('menor Do'), 'menor Do');
});

test('transportar un texto con palabras lo pasa a cifrado', () => {
  assert.equal(transposeText('La menor Fa Do Sol', { tonic: 'A' }, { tonic: 'B' }), 'Sim Sol Re La');
});

test('«Do aumentado» es un acorde aumentado', () => {
  assert.equal(parseProgression('Do aumentado')[0].triad, 'aug');
});
