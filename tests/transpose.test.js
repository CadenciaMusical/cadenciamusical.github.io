import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { defaultTonic } from '../js/core/key.js';
import { transposeText, semitonesBetween } from '../js/core/transpose.js';

const romans = (r) => r.items.map((i) => i.roman).join(' ');
const key = (pc, mode) => ({ pc, mode, tonic: defaultTonic(pc, mode) });

const PROGRESSIONS = [
  'C G Am F',
  'Am G F E',
  'Dm7 G7 Cmaj7',
  'C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7',
  'D A Bm F#m G D G A',
  'C D7 G7 C',
  'C F Fm C',
  'Dm7 Db7 Cmaj7',
  'C C#dim Dm G7 C',
  'Bm7b5 E7 Am',
];

test('transportar mantiene el análisis en las 12 tonalidades', () => {
  for (const text of PROGRESSIONS) {
    const original = analyze(text);
    for (let pc = 0; pc < 12; pc++) {
      const to = key(pc, original.key.mode);
      const moved = transposeText(text, original.key, to);
      const r = analyze(moved, { forcedKey: to });
      assert.equal(r.errors.length, 0, `${text} → ${moved}`);
      assert.equal(romans(r), romans(original), `${text} → ${moved}`);
      assert.deepEqual(r.progressions.map((m) => m.id), original.progressions.map((m) => m.id), `${text} → ${moved}`);
    }
  }
});

test('ortografía según la tonalidad de destino', () => {
  const C = key(0, 'major');
  assert.equal(transposeText('C G Am F', C, key(2, 'major')), 'D A Bm G');
  assert.equal(transposeText('C G Am F', C, key(3, 'major')), 'Eb Bb Cm Ab');
  assert.equal(transposeText('C Bb F C', C, key(2, 'major')), 'D C G D');
  assert.equal(transposeText('Am G F E', key(9, 'minor'), key(4, 'minor')), 'Em D C B');
  // D♭7 → E7 y no F♭7: más sencillo para quien empieza.
  assert.equal(transposeText('Dm7 Db7 Cmaj7', C, key(3, 'major')), 'Fm7 E7 Ebmaj7');
});

test('respeta cómo se escribió cada acorde', () => {
  const C = key(0, 'major');
  const D = key(2, 'major');
  assert.equal(transposeText('Lam Fa Do Sol', C, D), 'Sim Sol Re La');
  assert.equal(transposeText('Am Fa C Sol7', C, D), 'Bm Sol D La7');
  assert.equal(transposeText('Do7M Rem7', C, key(10, 'major')), 'Sib7M Dom7');
  assert.equal(transposeText('C/E Do/Mi', C, D), 'D/F# Re/Fa#');
});

test('lo que no se reconoce se deja como está', () => {
  assert.equal(transposeText('C Xyz G', key(0, 'major'), key(2, 'major')), 'D Xyz A');
});

test('semitonos por el camino más corto', () => {
  assert.equal(semitonesBetween(key(0, 'major'), key(2, 'major')), 2);
  assert.equal(semitonesBetween(key(0, 'major'), key(10, 'major')), -2);
  assert.equal(semitonesBetween(key(0, 'major'), key(6, 'major')), 6);
});

test('cambiar de cifrado lo escrito en la casilla', async () => {
  const { convertNotation } = await import('../js/core/transpose.js');
  assert.equal(convertNotation('Am F C G7', 'latin'), 'Lam Fa Do Sol7');
  assert.equal(convertNotation('Lam Fa Do Sol7', 'american'), 'Am F C G7');
  // Conserva el sufijo tal como se escribió, los separadores y lo que no es un acorde.
  assert.equal(convertNotation('Do7M | Lamenor, Sib/Re Xyz', 'american'), 'C7M | Amenor, Bb/D Xyz');
  assert.equal(convertNotation('LAM FA DO', 'american'), 'Am F C');
  // Re disminuido escrito «Reo»: «Do» se leería como Do mayor.
  assert.equal(convertNotation('Reo', 'american'), 'Ddim');
});

test('ida y vuelta entre cifrados sin cambiar ningún acorde', async () => {
  const { convertNotation } = await import('../js/core/transpose.js');
  const { parseChord } = await import('../js/core/parser.js');
  const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const suffixes = ['', 'm', '7', 'm7', 'maj7', '7M', 'm7b5', 'dim', 'o', '°', 'aug', '+', 'sus4', 'add9', '6', '9', '/E'];
  const key = (c) => `${c.pc} ${c.triad} ${c.seventh} ${c.bass && parseChord(c.bass).pc}`;
  for (const r of roots) {
    for (const s of suffixes) {
      const original = parseChord(r + s);
      if (!original.ok) continue;
      const latin = convertNotation(r + s, 'latin');
      const back = convertNotation(latin, 'american');
      assert.equal(key(parseChord(latin)), key(original), `${r + s} → ${latin}`);
      assert.equal(key(parseChord(back)), key(original), `${r + s} → ${latin} → ${back}`);
    }
  }
});

test('transportar también respeta los separadores', () => {
  assert.equal(transposeText('C | G, Am - F', key(0, 'major'), key(2, 'major')), 'D | A, Bm - G');
});
