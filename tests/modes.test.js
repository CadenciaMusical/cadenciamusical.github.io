import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { MODES, detectModes, modeScale, typicalProgression } from '../js/core/modes.js';
import { defaultTonic } from '../js/core/key.js';
import { modeName } from '../js/ui/texts.js';
import { setLatin } from '../js/core/names.js';

// Estas pruebas comprueban los textos en cifrado latino.
setLatin(true);

const main = (text) => analyze(text).modes.main;
const name = (m) => modeName(m);

test('cada modo se reconoce en las 12 tonalidades con su progresión típica', () => {
  for (const mode of MODES) {
    for (let pc = 0; pc < 12; pc++) {
      const tonic = defaultTonic(pc, 'major');
      const chords = typicalProgression(mode.id, tonic);
      // Volviendo a la tónica al final, como se suele cerrar.
      const withEnd = [...chords, chords[0]];
      const m = detectModes(withEnd).main;
      assert.equal(`${m.pc} ${m.id}`, `${pc} ${mode.id}`, `${mode.id} en ${tonic}: ${withEnd.map((c) => c.root + c.suffix).join(' ')}`);
    }
  }
});

test('progresiones modales típicas', () => {
  assert.equal(name(main('D C G D')), 'Re mixolidio');
  assert.equal(name(main('A G D A')), 'La mixolidio');
  assert.equal(name(main('Dm G Dm G')), 'Re dórico');
  assert.equal(name(main('Am7 D9')), 'La dórico');
  assert.equal(name(main('F G F G')), 'Fa lidio');
  assert.equal(name(main('C D C D')), 'Do lidio');
  assert.equal(name(main('Em F Em')), 'Mi frigio');
  assert.equal(name(main('Cm Bb Ab Bb Cm')), 'Do eólico');
});

test('si coincide con la tonalidad, es el jónico o el eólico', () => {
  assert.equal(name(main('C G Am F')), 'Do jónico');
  assert.equal(name(main('Dm7 G7 Cmaj7')), 'Do jónico');
});

test('nota característica y acordes donde se oye', () => {
  const m = main('D C G D');
  assert.equal(m.charNote, 'C');
  assert.equal(m.insteadNote, 'C#');
  assert.deepEqual(m.charChords.map((c) => c.root), ['C']);
  assert.equal(main('F G F G').charNote, 'B');
  assert.equal(main('C G Am F').charNote, null);
});

test('notas ajenas: menor armónica y frigio dominante', () => {
  const andaluza = analyze('Am G F E').modes;
  assert.equal(name(andaluza.main), 'La menor armónica');
  assert.deepEqual(andaluza.main.foreign, ['G#']);
  assert.ok(andaluza.others.some((o) => name(o) === 'Mi frigio dominante'));
  const flamenco = main('E F G F E');
  assert.equal(name(flamenco), 'Mi frigio dominante');
  assert.ok(flamenco.scale.includes('G#'));
});

test('el blues encaja en el mixolidio, con notas de fuera', () => {
  const m = main('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7');
  assert.equal(name(m), 'Do mixolidio');
  assert.ok(m.foreign.length > 0);
});

test('con pocos acordes, se avisa de que faltan notas', () => {
  const { others } = analyze('C G').modes;
  assert.ok(others.some((o) => !o.sameNotes));
});

test('escalas bien escritas', () => {
  assert.deepEqual(modeScale('mixolydian', 'D'), ['D', 'E', 'F#', 'G', 'A', 'B', 'C']);
  assert.deepEqual(modeScale('lydian', 'F'), ['F', 'G', 'A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(modeScale('phrygian', 'E'), ['E', 'F', 'G', 'A', 'B', 'C', 'D']);
  assert.deepEqual(modeScale('aeolian', 'A', 'harmonic-minor'), ['A', 'B', 'C', 'D', 'E', 'F', 'G#']);
  assert.deepEqual(modeScale('dorian', 'Eb'), ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'Db']);
});

test('el frigio dominante explica las dos notas que cambian, en cualquier tonalidad', async () => {
  const { modeCharText } = await import('../js/ui/texts.js');
  assert.equal(modeCharText(main('E F G F E')), 'Frente a Mi menor, cambian dos notas: Fa en lugar de Fa♯, y Sol♯ en lugar de Sol.');
  assert.equal(modeCharText(main('Bb Cb Db Cb Bb')), 'Frente a Si♭ menor, cambian dos notas: Do♭ en lugar de Do, y Re en lugar de Re♭.');
});
