import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { transposeText } from '../js/core/transpose.js';
import { renderChords, renderKey } from '../js/ui/render.js';
import { setLatin } from '../js/core/names.js';

const romans = (r) => r.items.map((i) => i.roman).join(' ');
// «C major@0 Eb major@4»: la tonalidad de cada tramo y dónde empieza.
// El texto de una tarjeta, sin las etiquetas de los términos enlazados.
const plain = (html) => html.replace(/<[^>]+>/g, '');
const sections = (r) => r.sections?.map((s) => `${s.key.tonic} ${s.key.mode}@${s.start}`).join(' ') ?? null;

test('de Do mayor a Mi♭ mayor desde el acorde 5', () => {
  const r = analyze('Do Fa Sol Do Mib Lab Sib Mib');
  assert.equal(sections(r), 'C major@0 Eb major@4');
  assert.equal(`${r.key.tonic} ${r.key.mode}`, 'C major');
  // Cada tramo se numera en su tonalidad: nada de préstamos.
  assert.equal(romans(r), 'I IV V I I IV V I');
  assert.ok(r.items.every((i) => !i.special));
  assert.equal(r.sections[1].type, 'distant');
  assert.equal(r.items[4].key.tonic, 'Eb');
  assert.equal(r.items[4].section, 1);
});

test('de Do mayor a Sol mayor: a la dominante', () => {
  const r = analyze('Do Fa Sol Do Re7 Sol Re7 Sol');
  assert.equal(sections(r), 'C major@0 G major@4');
  assert.equal(romans(r), 'I IV V I V7 I V7 I');
  assert.equal(r.sections[1].type, 'dominant');
});

test('de Do mayor a Re mayor: el salto de un tono del final', () => {
  const r = analyze('Do Sol Lam Fa Re La Sim Sol');
  assert.equal(sections(r), 'C major@0 D major@4');
  assert.equal(romans(r), 'I V vi IV I V vi IV');
  assert.equal(r.sections[1].type, 'lift');
});

test('de La menor a Do mayor: a la relativa', () => {
  const r = analyze('Lam Mi Lam Mi Do Sol7 Do');
  assert.equal(sections(r), 'A minor@0 C major@4');
  assert.equal(romans(r), 'i V i V I V7 I');
  assert.equal(r.sections[1].type, 'relative');
});

test('dos cambios seguidos', () => {
  const r = analyze('C F G C Eb Ab Bb Eb F Bb C F');
  assert.equal(sections(r), 'C major@0 Eb major@4 F major@8');
});

test('sin cambio de tonalidad: préstamos, dominantes secundarias y finales', () => {
  for (const text of [
    'Do Mi7 Lam Re7 Sol7 Do',
    'Do Lab Sib Do',
    'Do Sib Lab Sib Do',
    'Dm7 G7 Cmaj7 Am7 Dm7 G7 Cmaj7',
    'Lam Rem Sol Do Fa Si° Mi Lam',
    'Do Fa Si° Mim Lam Rem Sol Do',
    'C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7',
    'D A Bm F#m G D G A',
    'Am F C G Am F C G',
    // Una pieza en Do que visita su relativa con el V7/vi no cambia de tonalidad.
    'C Am F G Dm G7 C E7 C Am F G Dm G7 C E7 Am',
  ]) {
    assert.equal(sections(analyze(text)), null, text);
  }
});

test('las progresiones y cadencias se buscan en cada tramo', () => {
  const r = analyze('Do Fa Sol Do Mib Lab Sib Mib');
  const cadence = r.cadences.find((c) => c.atEnd);
  assert.equal(cadence.id, 'perfect');
  assert.deepEqual([cadence.start, cadence.end], [6, 7]);
  assert.equal(cadence.key.tonic, 'Eb');
});

test('transportar mueve todos los tramos a la vez', () => {
  const text = 'Do Fa Sol Do Mib Lab Sib Mib';
  const r = analyze(text);
  const to = { pc: 2, mode: 'major', tonic: 'D' };
  const moved = transposeText(text, r.key, to);
  assert.equal(moved, 'Re Sol La Re Fa Sib Do Fa');
  const again = analyze(moved, { forcedKey: to });
  assert.equal(sections(again), 'D major@0 F major@4');
  assert.equal(romans(again), romans(r));
});

test('la tarjeta dice dónde cambia y cómo, y las tarjetas de los acordes se separan', () => {
  setLatin(true);
  const r = analyze('Do Fa Sol Do Mib Lab Sib Mib');
  const html = plain(renderKey(r));
  assert.match(html, /Do mayor → Mi♭ mayor/);
  assert.match(html, /Empieza en Do mayor y en el acorde 5 cambia a Mi♭ mayor/);
  assert.match(html, /un cambio brusco, de color muy distinto/);
  assert.match(renderKey(r), /data-action="play-range" data-start="2" data-end="6"/);
  const grid = renderChords(r.items, { sections: r.sections });
  assert.equal(grid.match(/section-break/g).length, 1);
  assert.ok(grid.indexOf('Cambia a Mi♭ mayor') < grid.indexOf('data-index="4"'));
  assert.ok(grid.indexOf('Cambia a Mi♭ mayor') > grid.indexOf('data-index="3"'));
  assert.match(plain(renderKey(analyze('Do Fa Sol Do Re7 Sol Re7 Sol'))), /la tonalidad de su dominante: el cambio más natural, a una tonalidad vecina/);
  assert.match(plain(renderKey(analyze('Lam Mi Lam Mi Do Sol7 Do'))), /su relativa: el cambio más natural, a una tonalidad vecina/);
  assert.match(plain(renderKey(analyze('Do Sol Lam Fa Re La Sim Sol'))), /el salto del último estribillo, para darle más energía/);
});

test('la misma progresión en dos tramos se muestra una vez, con dónde vuelve', async () => {
  const { renderProgressionCard, progressionRanges } = await import('../js/ui/render.js');
  setLatin(true);
  const r = analyze('Do Fa Sol Do Mib Lab Sib Mib');
  const html = plain(renderProgressionCard(r));
  assert.equal(html.match(/I–IV–V–I/g).length, 2); // el nombre y los grados, una sola vez
  assert.match(html, /Son los acordes 1 a 4 \(Do Fa Sol Do\)/);
  assert.match(html, /Vuelve en Mi♭ mayor, en los acordes 5 a 8 \(Mi♭ La♭ Si♭ Mi♭\)/);
  assert.deepEqual([...progressionRanges(r)].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
});
