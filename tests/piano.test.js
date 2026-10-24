import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord } from '../js/core/parser.js';
import { pianoVoicing } from '../js/ui/piano.js';

const midis = (s) => pianoVoicing(parseChord(s)).map((k) => k.midi);

test('posición fundamental desde la raíz, entre Do4 y Si4', () => {
  assert.deepEqual(midis('C'), [60, 64, 67]);
  assert.deepEqual(midis('Am'), [69, 72, 76]);
  assert.deepEqual(midis('G7'), [67, 71, 74, 77]);
  assert.deepEqual(midis('Bm7b5'), [71, 74, 77, 81]);
});

test('el bajo de un acorde con barra va una octava por debajo', () => {
  const keys = pianoVoicing(parseChord('C/E'));
  assert.equal(keys[0].midi, 52);
  assert.ok(keys[0].bass);
  assert.deepEqual(keys.slice(1).map((k) => k.midi), [60, 64, 67]);
});
