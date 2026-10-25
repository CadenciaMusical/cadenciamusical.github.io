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

test('bucles: el primer acorde manda y no hay cadencia final', async () => {
  const { renderProgressionCard } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(false);
  const loop = (text, tonic, mode, roman) => {
    const r = expectKey(text, tonic, mode);
    assert.equal(romans(r), roman, text);
    assert.ok(r.loop, text);
    assert.equal(r.alternative, null, text);
    assert.ok(!r.cadences.some((c) => c.atEnd), text);
    const html = renderProgressionCard(r);
    assert.doesNotMatch(html, /Cadencia/, text);
    assert.match(html, /Da vueltas[\s\S]*vuelve siempre a/, text);
    return html;
  };
  assert.match(loop('Am Em Am Em', 'A', 'minor', 'i v i v'), /Am y Em se van alternando[\s\S]*vuelve siempre a Am/);
  loop('C F C F', 'C', 'major', 'I IV I IV');
  assert.match(loop('C G Am F C G Am F', 'C', 'major', 'I V vi IV I V vi IV'), /los mismos 4 acordes se repiten dos veces/);
  // Si no se repite entero, no es un bucle: «C F C» acaba con una plagal.
  const r = analyze('C F C');
  assert.equal(r.loop, null);
  assert.equal(r.cadences.find((c) => c.atEnd)?.id, 'plagal');
});

// --- Disminuidos con séptima: cuatro nombres para el mismo acorde ---

const C_MAJOR = { pc: 0, mode: 'major', tonic: 'C' };
const dim7 = (text, i, forcedKey = null) => analyze(text, { forcedKey }).items[i];

test('°7 → tónica: cualquiera de sus cuatro nombres es el vii°7', () => {
  for (const text of ['Si°7 Do', 'Fa°7 Do', 'Re°7 Do', 'Lab°7 Do']) {
    expectKey(text, 'C', 'major');
    const item = dim7(text, 0);
    assert.equal(item.roman, 'vii°7', text);
    assert.equal(item.role, 'tonic', text);
    assert.equal(item.readAs, 'B', text);
    assert.equal(item.fn, 'D', text);
    // En mayor viene de la menor.
    assert.equal(item.from, 'minor', text);
  }
  // En menor, escrito como vii°7, es de la tonalidad, como siempre.
  assert.equal(dim7('Am G#dim7 Am', 1).kind, 'diatonic');
  const renamed = dim7('Am Fdim7 Am', 1);
  assert.equal(`${renamed.roman} ${renamed.readAs} ${renamed.from}`, 'vii°7 G# null');
});

test('°7 → otro grado: vii°7/x', () => {
  // Acaban en el acorde al que llevan, así que la detección los ve en esa
  // tonalidad (C♯°7 → Dm es un final en Re menor); en Do mayor, vii°7/x.
  const cases = [
    ['Do Do#°7 Rem', 'vii°7/ii', 'C#'],
    ['Do Mi°7 Rem', 'vii°7/ii', 'C#'],
    ['Do Sib°7 Rem', 'vii°7/ii', 'C#'],
    ['Do Sol#°7 Lam', 'vii°7/vi', 'G#'],
    ['Do Re#°7 Mim', 'vii°7/iii', 'D#'],
  ];
  for (const [text, roman, readAs] of cases) {
    const item = dim7(text, 1, C_MAJOR);
    assert.equal(`${item.roman} ${item.role} ${item.readAs}`, `${roman} secondary ${readAs}`, text);
  }
  expectKey('Do Do#°7 Rem', 'D', 'minor');
  // Con más contexto, Do mayor sin ayuda.
  assert.equal(romans(expectKey('Do Do#°7 Rem Sol7 Do', 'C', 'major')), 'I vii°7/ii ii V7 I');
  assert.equal(romans(expectKey('Do Fa Fa#°7 Sol Do', 'C', 'major')), 'I IV vii°7/V V I');
});

test('°7 de nota común: comparte la raíz del acorde al que va', () => {
  for (const text of ['Do Do°7 Do', 'Do La°7 Do']) {
    expectKey(text, 'C', 'major');
    const item = dim7(text, 1);
    assert.equal(`${item.role} ${item.readAs} ${item.fn}`, 'common C P', text);
  }
});

test('°7 de paso: en paralelo hasta el acorde siguiente', () => {
  const r = expectKey('Fa°7 Sol°7 Domaj7', 'C', 'major');
  for (const i of [0, 1]) {
    assert.equal(r.items[i].role, 'passing');
    assert.equal(r.items[i].fn, 'P');
    assert.ok(r.items[i].passing.parallel);
    assert.ok(r.items[i].passing.semitones > 0, 'suben');
    assert.equal(r.items[i].passing.until.input, 'Domaj7');
  }
  // E♭°7 no es C♯°7 (tiene otras notas): baja medio tono hasta Dm.
  const eb = dim7('Do Mib°7 Rem', 1);
  assert.equal(`${eb.role} ${eb.passing.semitones}`, 'passing -1');
});

test('los semidisminuidos se analizan como antes', () => {
  assert.equal(romans(expectKey('Bm7b5 E7 Am', 'A', 'minor')), 'iiø7 V7 i');
  assert.equal(romans(expectKey('Lam Siø7 Mi7 Lam', 'A', 'minor')), 'i iiø7 V7 i');
  assert.equal(romans(expectKey('Dm7 G7 C Bø7 C', 'C', 'major')), 'ii7 V7 I viiø7 I');
  assert.equal(dim7('C C#m7b5 Dm G7 C', 1).roman, 'viiø7/ii');
});
