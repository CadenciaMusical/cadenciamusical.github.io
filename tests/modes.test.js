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

test('la tarjeta del modo solo sale si la progresión es claramente modal', () => {
  const modal = (text) => analyze(text).modal;
  // Mayor, menor o menor armónica de siempre: nada que contar.
  for (const t of ['C G Am F', 'Am F C G', 'Am G F E', 'C F G7 C', 'Dm7 G7 Cmaj7']) assert.equal(modal(t), false, t);
  // Con una nota de fuera (un préstamo) o sin pistas claras de cuál es la casa.
  for (const t of ['C Eb F C', 'F G F G Em']) assert.equal(modal(t), false, t);
  for (const [t, id] of [['D C G D', 'mixolydian'], ['Re Do Sol Re', 'mixolydian'], ['Dm G Dm G', 'dorian'], ['Em F G Em', 'phrygian'], ['C D C D', 'lydian']]) {
    const r = analyze(t);
    assert.ok(r.modal, t);
    assert.equal(r.modes.main.id, id, t);
  }
  assert.equal(analyze('E F G F E').modes.main.variant, 'phrygian-dominant');
  assert.ok(modal('E F G F E'));
});

test('la tarjeta del modo: explicación sencilla y botón para oír la diferencia', async () => {
  const { renderModes } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(false);
  assert.equal(renderModes(analyze('C G Am F')), '');
  const html = renderModes(analyze('D C G D'));
  assert.match(html, /data-action="mode-compare">▶ Oír la diferencia con D mayor/);
  assert.doesNotMatch(html, /jónico|eólico/);
  setLatin(true);
  assert.match(renderModes(analyze('Re Do Sol Re')), /Oír la diferencia con Re mayor/);
  setLatin(false);
});

test('progresión claramente modal: el centro del modo es la tonalidad', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  const { keyName } = await import('../js/core/names.js');
  setLatin(true);
  const romans = (r) => r.items.map((i) => i.roman).join(' ');
  for (const [t, tonic, roman] of [['Am D Am D', 'La dórico', 'i IV i IV'], ['Lam Re Lam Re', 'La dórico', 'i IV i IV'], ['Dm G Dm G', 'Re dórico', 'i IV i IV']]) {
    const r = analyze(t);
    assert.equal(keyName(r.key), tonic, t);
    assert.equal(romans(r), roman, t);
    assert.equal(r.alternative, null, t);
    const html = renderKey(r);
    assert.doesNotMatch(html, /dos opciones|casa de ninguna/, t);
    assert.match(html, new RegExp(`<h2 class="key-name">${tonic}</h2>`), t);
  }
  assert.match(renderKey(analyze('Am D Am D')), /La casa es La, como en La menor, pero con Fa♯ en lugar de Fa/);
  // El IV mayor es del dórico: se explica como tal, y se compara con el iv de siempre.
  const d = analyze('Am D Am D').items[1];
  assert.equal(d.kind, 'modal');
  assert.equal(d.fn, 'S');
});

test('las progresiones modales que ya iban bien siguen igual', () => {
  const romans = (r) => r.items.map((i) => i.roman).join(' ');
  for (const t of ['D C G D', 'C Bb F C']) {
    const r = analyze(t);
    assert.equal(r.key.mode, 'major', t);
    assert.equal(r.key.pc, r.chords[0].pc, t);
    assert.equal(romans(r), 'I ♭VII IV I', t);
    assert.ok(r.progressions.some((p) => p.id === 'mixolydian'), t);
    assert.equal(r.cadences.find((c) => c.atEnd)?.id, 'plagal', t);
  }
});

test('transportar una progresión modal parte de su centro', async () => {
  const { transposeText } = await import('../js/core/transpose.js');
  const { keyName } = await import('../js/core/names.js');
  setLatin(true);
  const r = analyze('Am D Am D');
  const to = { pc: 11, mode: r.key.mode, tonic: 'B' };
  const moved = transposeText('Am D Am D', r.key, to);
  assert.equal(moved, 'Bm E Bm E');
  const r2 = analyze(moved, { forcedKey: to });
  assert.equal(keyName(r2.key), 'Si dórico');
  assert.equal(r2.items.map((i) => i.roman).join(' '), 'i IV i IV');
});

test('frigio y frigio dominante: centro en Mi, I–♭II y sin cadencia rota', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderKey, renderProgressionCard } = await import('../js/ui/render.js');
  setLatin(true);
  const romans = (r) => r.items.map((i) => i.roman).join(' ');
  const flamenco = analyze('E F E F');
  assert.equal(keyName(flamenco.key), 'Mi frigio dominante');
  assert.equal(romans(flamenco), 'I ♭II I ♭II');
  assert.ok(!flamenco.cadences.some((c) => c.id === 'deceptive'));
  assert.doesNotMatch(renderProgressionCard(flamenco), /Cadencia rota/);
  assert.match(renderKey(flamenco), /Esos cambios le dan otro color/);
  // «Escuchar la tónica» toca Mi mayor, no Mi menor.
  const { tonicChord } = await import('../js/core/build.js');
  assert.equal(tonicChord(flamenco.key).triad, 'M');
  const frigio = analyze('Em F Em F');
  assert.equal(keyName(frigio.key), 'Mi frigio');
  assert.equal(romans(frigio), 'i ♭II i ♭II');
});

test('cadencia frigia: acabar en ♭II → I', async () => {
  const { renderProgressionCard } = await import('../js/ui/render.js');
  const end = (text) => analyze(text).cadences.find((c) => c.atEnd)?.id;
  assert.equal(end('E F G F E'), 'phrygian');
  assert.equal(end('Em F Em'), 'phrygian');
  assert.equal(end('E F E F'), undefined);
  assert.match(renderProgressionCard(analyze('E F G F E')), /Cadencia frigia[\s\S]*final flamenco/);
  // La andaluza sigue en La menor, con su semicadencia.
  const andaluza = analyze('Am G F E');
  assert.equal(`${andaluza.key.tonic} ${andaluza.key.mode}`, 'A minor');
  assert.ok(andaluza.progressions.some((p) => p.id === 'andalusian'));
  assert.equal(end('Am G F E'), 'half');
});

test('si la tonalidad ya es el modo, la tarjeta del modo no repite la explicación', async () => {
  const { renderModes, renderKey } = await import('../js/ui/render.js');
  setLatin(true);
  const r = analyze('Lam Re Lam Re');
  const modes = renderModes(r);
  assert.match(renderKey(r), /<h2 class="key-name">La dórico<\/h2>[\s\S]*Fa♯ en lugar de Fa/);
  assert.match(modes, /<h2 class="key-name">Escucha el color dórico<\/h2>/);
  assert.doesNotMatch(modes, /La dórico<\/h2>|en lugar de|no suena del todo|Más sobre el modo/);
  // Solo la escala, con la nota que cambia marcada, y los dos botones.
  assert.match(modes, /<span class="">La<\/span><span class="">Si<\/span><span class="">Do<\/span><span class="">Re<\/span><span class="">Mi<\/span><span class="char">Fa♯<\/span><span class="">Sol<\/span>/);
  assert.match(modes, /data-action="mode-compare">▶ Oír la diferencia con La menor/);
  assert.match(modes, /data-action="mode-typical">▶ Ejemplo típico/);
  // Adaptado a cada modo; en el frigio dominante, las dos notas que cambian.
  assert.match(renderModes(analyze('Re Do Sol Re')), /Escucha el color mixolidio/);
  const flamenco = renderModes(analyze('Mi Fa Mi Fa'));
  assert.match(flamenco, /Escucha el color frigio dominante/);
  assert.equal(flamenco.match(/class="char"/g).length, 2);
  // Si eliges a mano otra tonalidad, la tarjeta del modo sigue explicándolo todo.
  const forced = renderModes(analyze('Lam Re Lam Re', { forcedKey: { pc: 7, mode: 'major', tonic: 'G' } }));
  assert.match(forced, /La dórico<\/h2>[\s\S]*no suena del todo a La menor/);
});

test('los °7 no deciden el modo: sus notas no son de la escala', () => {
  for (const [text, roman, readAs] of [['Do#°7 Rem', 'vii°7', undefined], ['Mi°7 Rem', 'vii°7', 'C#'], ['Mib°7 Rem', '♭ii°7', undefined]]) {
    const r = analyze(text);
    assert.equal(`${r.key.tonic} ${r.key.mode}`, 'D minor', text);
    assert.equal(r.key.modal, undefined, text);
    assert.equal(r.modal, false, text);
    assert.equal(r.items[0].roman, roman, text);
    assert.equal(r.items[0].readAs, readAs, text);
  }
  // Mi♭°7 = Do°7 = Fa♯°7 = La°7: no lleva la sensible de Re, así que es de paso.
  assert.equal(analyze('Mib°7 Rem').items[0].role, 'passing');
  // Sin °7, el frigio sigue ahí.
  const r = analyze('Mim Fa Mim Fa');
  assert.ok(r.modal);
  assert.equal(r.key.modal.id, 'phrygian');
});

test('un V7/V no convierte la tonalidad en lidio; el IV7 del dórico sigue siendo dórico', () => {
  const r = analyze('Do Re7 Sol Do');
  assert.equal(r.modal, false);
  assert.equal(r.items.map((i) => i.roman).join(' '), 'I V7/V V I');
  assert.equal(analyze('Do Re Do Re').key.modal.id, 'lydian');
  assert.equal(analyze('Lam Re7 Sol Lam').key.modal.id, 'dorian');
});

const plainText = (html) => html.replace(/<[^>]+>/g, '');

test('lidio dominante: el lidio con la séptima menor', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderKey, renderModes, renderDetail } = await import('../js/ui/render.js');
  setLatin(true);
  const romans = (r) => r.items.map((i) => i.roman).join(' ');
  for (const [text, name] of [['Do7 Re Do7 Re', 'Do lidio dominante'], ['Fa7 Sol Fa7 Sol', 'Fa lidio dominante']]) {
    const r = analyze(text);
    assert.equal(keyName(r.key), name, text);
    assert.equal(romans(r), 'I7 II I7 II', text);
    assert.equal(r.alternative, null, text);
  }
  const r = analyze('Do7 Re Do7 Re');
  assert.deepEqual(r.modes.main.scale, ['C', 'D', 'E', 'F#', 'G', 'A', 'Bb']);
  assert.match(renderKey(r), /Fa♯ en lugar de Fa, y Si♭ en lugar de Si/);
  assert.match(plainText(renderKey(r)), /séptima nota medio tono más baja/);
  // La escala, con las dos notas que cambian marcadas, y los botones.
  const modes = renderModes(r);
  assert.match(modes, /Escucha el color lidio dominante/);
  assert.match(modes, /<span class="char">Fa♯<\/span><span class="">Sol<\/span><span class="">La<\/span><span class="char">Si♭<\/span>/);
  assert.match(modes, /data-action="mode-compare">▶ Oír la diferencia con Do mayor/);
  assert.match(modes, /las notas marcadas son las que cambian/);
  // El Do7 es de casa, pero no de Do mayor: su Si♭ se marca y se explica.
  assert.equal(r.items[0].kind, 'modal');
  assert.equal(r.items[0].fn, 'T');
  assert.match(plainText(renderDetail(r.items[0], r.key)), /✦ Algo especial.*lleva Si♭, que no es de su escala/s);
  // El ejemplo típico lleva la séptima en la tónica.
  assert.deepEqual(typicalProgression('lydian', 'C', 'lydian-dominant').map((c) => c.root + c.suffix), ['C7', 'D', 'C7', 'D']);
});

test('el lidio de siempre sigue siendo lidio', async () => {
  const { keyName } = await import('../js/core/names.js');
  setLatin(true);
  for (const text of ['Domaj7 Re7 Domaj7 Re7', 'Do Re Do Re']) assert.equal(keyName(analyze(text).key), 'Do lidio', text);
});

test('un acorde con séptima de fuera de la tonalidad nunca pasa por diatónico', async () => {
  const { renderDetail } = await import('../js/ui/render.js');
  setLatin(true);
  // En Sol mayor, el Do7 lleva Si♭: es un toque de color, y se dice cuál.
  const r = analyze('Sol Do7 Sol Do7 Re Sol');
  assert.equal(r.items[1].kind, 'color');
  assert.match(plainText(renderDetail(r.items[1], r.key)), /su séptima \(Si♭\), no/);
  // En un modo, el I7 del mixolidio lleva la nota del modo.
  const mixo = analyze('Re7 Do Sol Re7');
  assert.equal(mixo.items[0].kind, 'modal');
  assert.match(plainText(renderDetail(mixo.items[0], mixo.key)), /lleva Do, la nota que distingue el modo/);
});
