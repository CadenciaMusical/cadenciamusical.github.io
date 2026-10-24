import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, parseProgression, tokenize } from '../js/core/parser.js';

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
  assert.equal(parseChord('Am7-5').seventh, 'm7b5');
  assert.equal(parseChord('Lam7M').seventh, 'mMaj7');
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
