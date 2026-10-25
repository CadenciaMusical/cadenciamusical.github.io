import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { PROGRESSIONS } from '../js/core/catalog.js';
import { parseStep } from '../js/core/matcher.js';
import { chordOnDegree } from '../js/core/build.js';
import { chordLabel } from '../js/core/names.js';

const ids = (matches) => matches.map((m) => m.id);
const find = (r, id) => r.progressions.find((m) => m.id === id);

const TONICS = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

// Escribe una progresión del catálogo en una tonalidad («ii V I» en Re → «Em A D»).
function realize(entry, tonic) {
  return entry.steps
    .map((s) => {
      const step = parseStep(s.split('|')[0], entry.mode);
      const seventh = step.seventh ? { M: '7', m: 'm7', dim: 'm7b5' }[step.triad] : '';
      return chordLabel(chordOnDegree({ tonic }, step.st, step.triad, seventh)).replace('♯', '#').replace('♭', 'b');
    })
    .join(' ');
}

test('cada progresión del catálogo se reconoce en las 12 tonalidades', () => {
  for (const entry of PROGRESSIONS) {
    TONICS[entry.mode].forEach((tonic, pc) => {
      const text = realize(entry, tonic);
      const r = analyze(text, { forcedKey: { pc, mode: entry.mode, tonic } });
      const m = find(r, entry.id);
      assert.ok(m, `${entry.id} en ${tonic}: «${text}»`);
      assert.ok(m.whole, `${entry.id} en ${tonic} debería cubrir toda la progresión`);
    });
  }
});

test('la del pop, con detección automática y empezando en otro acorde', () => {
  assert.equal(find(analyze('C G Am F'), 'pop').label, 'I–V–vi–IV');
  assert.equal(find(analyze('Am F C G'), 'pop').label, 'vi–IV–I–V');
  assert.equal(find(analyze('Lam Fa Do Sol'), 'pop').label, 'vi–IV–I–V');
  assert.equal(find(analyze('Em C G D'), 'pop').label, 'vi–IV–I–V');
});

test('la del pop vista desde la relativa menor', () => {
  const r = analyze('Am F C G', { forcedKey: { pc: 9, mode: 'minor', tonic: 'A' } });
  const m = find(r, 'pop');
  assert.ok(m);
  assert.equal(`${m.key.tonic} ${m.key.mode}`, 'C major');
});

test('acordes repetidos y bucles largos', () => {
  const r = analyze('C C G G Am Am F F');
  assert.deepEqual(ids(r.progressions), ['pop']);
  assert.ok(find(r, 'pop').whole);
  const loop = analyze('C G Am F C G Am F');
  assert.equal(loop.progressions.length, 1);
  assert.ok(find(loop, 'pop').whole);
});

test('una progresión dentro de otra más larga', () => {
  const r = analyze('F C Dm C Bb F Gm C F');
  const m = find(r, 'ii-v-i');
  assert.ok(m);
  assert.equal(m.start, 6);
  assert.equal(m.end, 8);
  assert.equal(m.whole, false);
});

test('no se muestra una progresión que es parte de otra encontrada', () => {
  const r = analyze('D A Bm F#m G D G A');
  assert.deepEqual(ids(r.progressions), ['pachelbel']);
});

test('ejemplos de la pantalla de inicio', () => {
  assert.ok(find(analyze('Am G F E'), 'andalusian').whole);
  assert.ok(find(analyze('Dm7 G7 Cmaj7'), 'ii-v-i').whole);
  assert.ok(find(analyze('C Am F G'), 'doowop').whole);
  assert.ok(find(analyze('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7'), 'blues').whole);
  assert.ok(find(analyze('D A Bm F#m G D G A'), 'pachelbel').whole);
});

test('variantes del blues', () => {
  // Con «quick change» (IV en el compás 2) y sin turnaround.
  assert.ok(find(analyze('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 C7'), 'blues'));
  // Sin séptimas también vale.
  assert.ok(find(analyze('A A A A D D A A E D A E'), 'blues'));
  // Con un compás de menos, no.
  assert.equal(find(analyze('C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7'), 'blues'), undefined);
});

test('otras progresiones', () => {
  assert.ok(find(analyze('Bm7b5 E7 Am'), 'ii-v-i-minor'));
  assert.ok(find(analyze('C Am Dm G'), 'turnaround'));
  assert.ok(find(analyze('C F G F'), 'three-chords'));
  assert.ok(find(analyze('D C G D'), 'mixolydian'));
});

test('cadencias', () => {
  const end = (text) => analyze(text).cadences.find((c) => c.atEnd)?.id;
  assert.equal(end('Dm7 G7 C'), 'perfect');
  assert.equal(end('Bm7b5 E7 Am'), 'perfect');
  assert.equal(end('C F C'), 'plagal');
  assert.equal(end('C F Fm C'), 'minor-plagal');
  assert.equal(end('C F G Am'), 'deceptive');
  assert.equal(end('Am Dm E F'), 'deceptive');
  assert.equal(end('C F C G'), 'half');
  assert.equal(end('Am G F E'), 'half');
});

test('la semicadencia necesita al menos dos acordes', () => {
  assert.deepEqual(analyze('G').cadences, []);
});

test('cadencias en mitad de la progresión', () => {
  const r = analyze('C G Am F');
  const deceptive = r.cadences.find((c) => c.id === 'deceptive');
  assert.equal(deceptive.start, 1);
  assert.equal(deceptive.atEnd, false);
});

test('casos de la tarjeta «Progresión conocida»', () => {
  const first = (text) => analyze(text).progressions[0]?.id;
  const end = (text) => analyze(text).cadences.find((c) => c.atEnd)?.id;
  assert.equal(first('C G Am F'), 'pop');
  assert.equal(first('Am G F E'), 'andalusian');
  assert.equal(first('Dm7 G7 Cmaj7'), 'ii-v-i');
  assert.equal(first('Do Sol Lam Fa'), 'pop');
  assert.equal(end('C F G C'), 'perfect');
  assert.equal(end('C A7 Dm G7 Fm C'), 'minor-plagal');
  assert.equal(end('Do La7 Rem Sol7 Fam Do'), 'minor-plagal');
});

test('las dos progresiones básicas, con su cadencia perfecta', () => {
  const end = (r) => r.cadences.find((c) => c.atEnd)?.id;
  const major = analyze('C F G C');
  assert.ok(find(major, 'basic-major').whole);
  assert.equal(find(major, 'basic-major').label, 'I–IV–V–I');
  assert.equal(end(major), 'perfect');
  for (const text of ['Am Dm E Am', 'Am Dm E7 Am']) {
    const r = analyze(text);
    assert.ok(find(r, 'basic-minor')?.whole, text);
    assert.equal(find(r, 'basic-minor').label, 'i–iv–V–i');
    assert.equal(end(r), 'perfect', text);
  }
});

test('una progresión que se repite entera es una sola, con sus vueltas', async () => {
  const { renderProgressionCard, renderChords, progressionRanges, progressionTurns } = await import('../js/ui/render.js');
  for (const [text, id] of [['Am G F E Am G F E', 'andalusian'], ['C G Am F C G Am F', 'pop']]) {
    const r = analyze(text);
    const all = r.progressions.filter((m) => m.id === id);
    assert.equal(all.length, 1, text);
    assert.equal(all[0].times, 2, text);
    assert.deepEqual(all[0].turns, [0, 4], text);
    assert.ok(all[0].whole, text);
    const html = renderProgressionCard(r);
    assert.match(html, /Se repite dos veces/, text);
    assert.doesNotMatch(html, /Son los acordes 1 a 4/, text);
    // Se marcan las dos vueltas, y dónde empieza la segunda.
    assert.deepEqual([...progressionRanges(r)], [0, 1, 2, 3, 4, 5, 6, 7], text);
    assert.match(renderChords(r.items, { turns: progressionTurns(r) }), /data-index="4"[^>]*>\s*<span class="turn">↻ 2\.ª vuelta<\/span>/, text);
  }
  // Compartiendo el acorde del medio, también cuenta como repetida.
  assert.equal(find(analyze('C F G C F G C'), 'basic-major').times, 2);
  // Sin repetir, una vuelta y sin marcar.
  const once = analyze('Am G F E');
  assert.equal(find(once, 'andalusian').times, 1);
  assert.deepEqual([...progressionRanges(once)], []);
});

test('blues menor de 12 compases, con y sin séptimas', () => {
  for (const text of [
    'Lam Lam Lam Lam Rem Rem Lam Lam Mi7 Rem Lam Mi7',
    'Lam7 Lam7 Lam7 Lam7 Rem7 Rem7 Lam7 Lam7 Mi7 Rem7 Lam7 Mi7',
    // The Thrill Is Gone: ♭VI7 → V7 en los compases 9 y 10.
    'Am7 Am7 Am7 Am7 Dm7 Dm7 Am7 Am7 F7 E7 Am7 E7',
  ]) {
    const r = analyze(text);
    assert.equal(`${r.key.tonic} ${r.key.mode}`, 'A minor', text);
    assert.ok(find(r, 'minor-blues')?.whole, text);
    assert.equal(find(r, 'blues'), undefined, text);
  }
  // El mayor sigue siendo el mayor.
  assert.equal(find(analyze('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7'), 'minor-blues'), undefined);
});
