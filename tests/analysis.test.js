import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';

const romans = (r) => r.items.map((i) => i.roman).join(' ');
const fns = (r) => r.items.map((i) => i.fn).join('');

function expectKey(text, tonic, mode) {
  const r = analyze(text);
  assert.equal(`${r.key.tonic} ${r.key.mode}`, `${tonic} ${mode}`, text);
  return r;
}

test('la del pop: I–V–vi–IV', () => {
  const r = expectKey('C G Am F', 'C', 'major');
  assert.equal(romans(r), 'I V vi IV');
  assert.equal(fns(r), 'TDTS');
});

test('vi–IV–I–V: empieza en La menor, con Do mayor como duda relativa', () => {
  const r = expectKey('Am F C G', 'A', 'minor');
  assert.equal(romans(r), 'i VI III VII');
  assert.equal(r.confidence, 'baja');
  assert.equal(`${r.alternative.tonic} ${r.alternative.mode}`, 'C major');
  assert.ok(r.alternativeIsRelative);
});

test('lo mismo en cifrado latino', () => {
  const r = expectKey('Lam Fa Do Sol', 'A', 'minor');
  assert.equal(`${r.alternative.tonic} ${r.alternative.mode}`, 'C major');
});

test('doo-wop: I–vi–IV–V', () => {
  assert.equal(romans(expectKey('C Am F G', 'C', 'major')), 'I vi IV V');
});

test('ii–V–I con séptimas', () => {
  const r = expectKey('Dm7 G7 Cmaj7', 'C', 'major');
  assert.equal(romans(r), 'ii7 V7 Imaj7');
  assert.equal(fns(r), 'SDT');
  assert.equal(r.confidence, 'alta');
});

test('ii–V–i en menor', () => {
  assert.equal(romans(expectKey('Bm7b5 E7 Am', 'A', 'minor')), 'iiø7 V7 i');
});

test('cadencia andaluza: i–VII–VI–V', () => {
  const r = expectKey('Am G F E', 'A', 'minor');
  assert.equal(romans(r), 'i VII VI V');
  assert.equal(r.confidence, 'alta');
});

test('blues de 12 compases', () => {
  const r = expectKey('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7', 'C', 'major');
  assert.ok(r.key.blues);
  assert.equal(romans(r), 'I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7');
  assert.ok(r.items.every((i) => i.kind === 'diatonic' || i.kind === 'blues'));
});

test('canon de Pachelbel', () => {
  assert.equal(romans(expectKey('D A Bm F#m G D G A', 'D', 'major')), 'I V vi iii IV I IV V');
});

test('dominante secundaria: D7 en Do es V7/V', () => {
  const r = expectKey('C D7 G7 C', 'C', 'major');
  const d7 = r.items[1];
  assert.equal(d7.kind, 'secondary');
  assert.equal(d7.roman, 'V7/V');
  assert.ok(d7.target.resolves);
});

test('préstamo modal: Fm en Do mayor', () => {
  const r = expectKey('C F Fm C', 'C', 'major');
  assert.equal(r.items[2].kind, 'borrowed');
  assert.equal(r.items[2].roman, 'iv');
});

test('bemoles: la tónica se escribe como la escribe el usuario', () => {
  expectKey('Bb Eb F Bb', 'Bb', 'major');
  expectKey('Gb Db Ebm Cb', 'Gb', 'major');
});

test('tonalidad elegida a mano', () => {
  const r = analyze('Am F C G', { forcedKey: { pc: 9, mode: 'minor', tonic: 'A' } });
  assert.equal(romans(r), 'i VI III VII');
  assert.equal(`${r.alternative.tonic} ${r.alternative.mode}`, 'C major');
});

test('los acordes no reconocidos no impiden el análisis', () => {
  const r = analyze('C G Xyz F');
  assert.equal(r.errors.length, 1);
  assert.equal(r.items.length, 3);
});

test('sustituto tritonal: D♭7 en lugar de G7', () => {
  const r = expectKey('Dm7 Db7 Cmaj7', 'C', 'major');
  assert.equal(r.items[1].kind, 'tritone');
  assert.equal(r.items[1].roman, 'subV7');
  assert.equal(r.items[1].fn, 'D');
});

test('sustituto tritonal de una dominante secundaria: A♭7 → G7', () => {
  const r = expectKey('C Ab7 G7 C', 'C', 'major');
  assert.equal(r.items[1].kind, 'tritone');
  assert.equal(r.items[1].roman, 'subV7/V');
});

test('un ♭VII7 que vuelve a la tónica es préstamo, no sustituto', () => {
  const r = expectKey('C Bb7 C', 'C', 'major');
  assert.equal(r.items[1].kind, 'borrowed');
});

test('disminuido de paso: C♯° → Dm', () => {
  const r = expectKey('C C#dim Dm G7 C', 'C', 'major');
  assert.equal(r.items[1].kind, 'leading');
  assert.equal(r.items[1].roman, 'vii°/ii');
  assert.equal(analyze('C C#dim7 Dm7 G7 C').items[1].roman, 'vii°7/ii');
});

test('duda entre una tonalidad y su relativa: el primer y el último acorde dan las pistas', () => {
  const doubt = (text) => {
    const r = analyze(text);
    return r.alternativeIsRelative ? `${r.key.tonic}${r.key.mode === 'minor' ? 'm' : ''} o ${r.alternative.tonic}${r.alternative.mode === 'minor' ? 'm' : ''}` : null;
  };
  assert.equal(doubt('Lam Fa Do Sol'), 'Am o C');
  assert.equal(doubt('Em C G D'), 'Em o G');
  assert.equal(doubt('F G Am'), 'Am o C');
  // Empieza o acaba claramente en casa: sin duda.
  assert.equal(doubt('C G Am F'), null);
  assert.equal(doubt('Am F G C'), null);
  assert.equal(doubt('Am F C G Am'), null);
  assert.equal(doubt('C G Am Em F C F G'), null);
});
