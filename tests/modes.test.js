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
  // El Do7 es de casa, pero no de Do mayor: su Si♭ se explica, sin ✦ (es la tónica).
  assert.equal(r.items[0].kind, 'modal');
  assert.equal(r.items[0].fn, 'T');
  const detail = plainText(renderDetail(r.items[0], r.key));
  assert.match(detail, /lleva Si♭, que no es de su escala/);
  assert.doesNotMatch(detail, /✦/);
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

test('alternativa modal: si empieza en el centro de un modo con las mismas notas', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderKey } = await import('../js/ui/render.js');
  setLatin(true);
  const r = analyze('Rem Fa Do Sol');
  assert.equal(keyName(r.key), 'Do mayor');
  assert.equal(keyName(r.alternative), 'Re dórico');
  assert.equal(r.alternativeIsRelative, false);
  const html = renderKey(r);
  assert.match(html, /data-action="use-alt">Analizar en Re dórico/);
  assert.match(plainText(html), /Usan las mismas notas, pero Re dórico toma Re como casa/);
  // «Analizar en Re dórico» funciona como las demás: con Do mayor para volver.
  const chosen = analyze('Rem Fa Do Sol', { forcedKey: r.alternative });
  assert.equal(keyName(chosen.key), 'Re dórico');
  assert.equal(chosen.items.map((i) => i.roman).join(' '), 'i III VII IV');
  assert.ok(chosen.forced);
  assert.equal(keyName(chosen.alternative), 'Do mayor');
  assert.match(plainText(renderKey(chosen)), /¿O Do mayor\?.*Usan las mismas notas, pero Re dórico toma Re como casa/s);
  // La del pop, en menor: la alternativa sigue siendo la relativa.
  const pop = analyze('Am F C G');
  assert.equal(keyName(pop.alternative), 'Do mayor');
  assert.ok(pop.alternativeIsRelative);
  // Si empieza o acaba en su tónica, no hace falta otra: ii–V–I.
  assert.equal(analyze('Dm7 G7 Cmaj7').alternative, null);
});

test('un bucle alrededor de un disminuido roza el locrio, pero se oye Do mayor', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderKey } = await import('../js/ui/render.js');
  setLatin(true);
  for (const [text, label] of [['Sidim Do Sidim Do', 'Si°'], ['Siø7 Do Siø7 Do', 'Siø7']]) {
    const r = analyze(text);
    assert.equal(keyName(r.key), 'Do mayor', text);
    assert.equal(r.locrian.root, 'B', text);
    assert.match(plainText(renderKey(r)), new RegExp(`Si giras alrededor de ${label}, estás rozando el modo locrio: casi nadie lo usa porque su casa es un acorde disminuido, que no suena a reposo. Por eso tu oído \\(y Cadencia\\) prefiere oír Do mayor.`), text);
  }
  // La escala de Do, de paso por Si°: no gira alrededor de él.
  const scale = analyze('Do Rem Mim Fa Sol Lam Sidim Do');
  assert.equal(keyName(scale.key), 'Do mayor');
  assert.equal(scale.locrian, null);
  assert.doesNotMatch(renderKey(scale), /locrio/);
});

test('el locrio, en el glosario de modos, explica por qué casi no se usa', async () => {
  const { glossaryEntry, termText } = await import('../js/ui/glossary.js');
  const entry = glossaryEntry('modo-locrian');
  assert.equal(entry.term, 'Modo locrio');
  assert.match(termText(entry), /acorde de casa es disminuido/);
});

test('en un modo, la ✦ solo en los acordes con una nota característica, nunca en la tónica', async () => {
  const { renderChords } = await import('../js/ui/render.js');
  setLatin(true);
  const stars = (text) => analyze(text).items.map((i) => (i.special ? '✦' : '·')).join(' ');
  // Re lleva el Fa♯ del lidio; el Do7 es la casa.
  assert.equal(stars('Do7 Re Do7 Re'), '· ✦ · ✦');
  // El Fa del mixolidio, solo en Fa/Sol.
  assert.equal(stars('Sol Do/Sol Sol Fa/Sol'), '· · · ✦');
  // El Fa del frigio; el Sol sería igual en Mi menor.
  assert.equal(stars('Mim Fa Sol Fa'), '· ✦ · ✦');
  // El Mi mayor lleva Sol♯, pero es la tónica del frigio dominante.
  assert.equal(stars('Mi Fa Mi Fa'), '· ✦ · ✦');
  // El Re del dórico, con su Fa♯.
  assert.equal(stars('Lam Re Lam Re'), '· ✦ · ✦');
  // Fuera de los modos, como siempre: el Fam prestado lleva ✦.
  assert.equal(stars('Do Fam Do Fam'), '· ✦ · ✦');
  // Y así se ve en las tarjetas.
  const grid = renderChords(analyze('Do7 Re Do7 Re').items);
  assert.equal((grid.match(/class="star"/g) ?? []).length, 2);
});

// --- Modos inusuales ---

test('un disminuido no rompe el frigio dominante', () => {
  const r = analyze('Mi Fa Sol#° Mi');
  assert.equal(modeName(r.modes.main), 'Mi frigio dominante');
  assert.ok(r.modal);
  assert.equal(r.items[2].fn, 'D');
  // Como antes.
  assert.equal(modeName(analyze('Mi Fa Sol#°7 Mi').modes.main), 'Mi frigio dominante');
  assert.equal(modeName(analyze('Mi Fa Mi Fa').modes.main), 'Mi frigio dominante');
  const vii = analyze('Lam Sol#° Lam');
  assert.equal(`${vii.key.tonic} ${vii.key.mode}`, 'A minor');
  assert.ok(!vii.modal);
  assert.equal(vii.items[1].roman, 'vii°');
});

test('el lidio dominante, aunque el acorde de la tónica no lleve séptima', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderKey } = await import('../js/ui/render.js');
  for (const [text, key] of [['Do Sib Re Do', 'Do lidio dominante'], ['Re Do Mi Re', 'Re lidio dominante'], ['Do7 Re Do7 Re', 'Do lidio dominante']]) {
    const r = analyze(text);
    assert.equal(keyName(r.key), key, text);
    assert.ok(r.modal, text);
  }
  // El ♭VII es del mixolidio, y el II mayor, del lidio: los dos son de la casa.
  const r = analyze('Do Sib Re Do');
  assert.deepEqual(r.items.map((i) => i.kind), ['diatonic', 'modal', 'modal', 'diatonic']);
  assert.match(plainText(renderKey(r)), /Fa♯ en lugar de Fa, y Si♭ en lugar de Si/);
  // Siguen como ahora.
  assert.equal(keyName(analyze('Do Sib Fa Do').key), 'Do mixolidio');
  assert.equal(keyName(analyze('Do Re Do Re').key), 'Do lidio');
});

test('la menor melódica: la sexta y la séptima mayores a la vez', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderModes, renderKey, renderDetail } = await import('../js/ui/render.js');
  const r = analyze('Lammaj7 Re7 Mi7 Lammaj7');
  assert.equal(keyName(r.key), 'La menor melódica');
  assert.ok(r.modal);
  assert.deepEqual(r.modes.main.scale, ['A', 'B', 'C', 'D', 'E', 'F#', 'G#']);
  const modes = renderModes(r);
  // Fa♯ y Sol♯ marcadas, y el botón para compararla con La menor.
  assert.deepEqual(modes.match(/<span class="char">[^<]+/g).map((s) => s.replace(/.*>/, '')), ['Fa♯', 'Sol♯']);
  assert.match(modes, /▶ Oír la diferencia con La menor/);
  assert.match(plainText(renderKey(r)), /es la escala menor melódica/);
  // El Mi7 es el V7 de siempre: sin ✦.
  assert.deepEqual(r.items.map((i) => Boolean(i.special)), [false, true, false, false]);
  // Con el IV y el V mayores en tríadas, La menor con el cuarto dórico, y el texto la nombra.
  for (const [text, tonic] of [['Lam Re Mi Lam', 'La'], ['Dom Fa Sol Dom', 'Do']]) {
    const t = analyze(text);
    assert.equal(keyName(t.key), `${tonic} menor`, text);
    assert.match(plainText(renderDetail(t.items[1], t.key)), /es la escala menor melódica \([^)]*\), la «menor del jazz»/, text);
  }
  // Siguen como ahora.
  assert.equal(keyName(analyze('Lam Re Lam Re').key), 'La dórico');
  const harmonic = analyze('Lam Rem Mi7 Lam');
  assert.equal(keyName(harmonic.key), 'La menor');
  assert.ok(!harmonic.modal);
});

test('variantes raras: lidio aumentado, dórico ♯4 y doble armónica', async () => {
  const { keyName } = await import('../js/core/names.js');
  const { renderModes, renderKey } = await import('../js/ui/render.js');
  const cases = [
    ['Do+ Re Do+ Re', 'Do lidio aumentado', ['Fa♯', 'Sol♯'], /Brillante y misterioso, muy de bandas sonoras/],
    ['Lam Si7 Lam Si7', 'La dórico ♯4', ['Re♯', 'Fa♯'], /Típico de la música klezmer y de Europa del Este/],
    ['Domaj7 Reb Domaj7 Reb', 'Do doble armónica', ['Re♭', 'La♭'], /música árabe; dos saltos de tono y medio la hacen inconfundible/],
  ];
  for (const [text, key, marked, info] of cases) {
    const r = analyze(text);
    assert.equal(keyName(r.key), key, text);
    assert.ok(r.modal, text);
    const modes = renderModes(r);
    assert.deepEqual(modes.match(/<span class="char">[^<]+/g).map((s) => s.replace(/.*>/, '')), marked, text);
    assert.match(modes, /▶ Oír la diferencia con/, text);
    assert.match(plainText(renderKey(r)), info, text);
    // Ningún acorde «cromático» a secas.
    assert.ok(r.items.every((i) => i.kind !== 'chromatic'), text);
  }
  assert.deepEqual(modeScale('lydian', 'C', 'lydian-augmented'), ['C', 'D', 'E', 'F#', 'G#', 'A', 'B']);
  assert.deepEqual(modeScale('dorian', 'A', 'dorian-sharp4'), ['A', 'B', 'C', 'D#', 'E', 'F#', 'G']);
  assert.deepEqual(modeScale('ionian', 'C', 'double-harmonic'), ['C', 'Db', 'E', 'F', 'G', 'Ab', 'B']);
  // Siguen como ahora.
  assert.equal(analyze('Lam Si7 Mi Lam').items[1].roman, 'V7/V');
  assert.equal(keyName(analyze('Do Reb Do Reb').key), 'Do frigio dominante');
  assert.equal(keyName(analyze('Do7 Re Do7 Re').key), 'Do lidio dominante');
  assert.equal(keyName(analyze('Do Re Do Re').key), 'Do lidio');
});

test('cada variante se reconoce en las 12 tonalidades con su progresión típica', async () => {
  const { keyName } = await import('../js/core/names.js');
  const variants = [
    ['phrygian', 'phrygian-dominant'], ['lydian', 'lydian-dominant'], ['dorian', 'melodic-minor'],
    ['lydian', 'lydian-augmented'], ['dorian', 'dorian-sharp4'], ['ionian', 'double-harmonic'],
  ];
  for (const [mode, variant] of variants) {
    for (let pc = 0; pc < 12; pc++) {
      const chords = typicalProgression(mode, defaultTonic(pc, 'major'), variant);
      const text = chords.map((c) => c.root + c.suffix).join(' ');
      const r = analyze(text);
      // La menor melódica en tríadas es La menor con el cuarto dórico (ver arriba).
      if (variant === 'melodic-minor') {
        assert.equal(`${r.key.pc} ${r.key.mode}`, `${pc} minor`, text);
        continue;
      }
      assert.equal(`${r.key.pc} ${r.key.modal?.variant}`, `${pc} ${variant}`, `${text}: ${keyName(r.key)}`);
    }
  }
});

test('el ejemplo típico de las variantes las hace sonar', () => {
  const play = (mode, variant) => typicalProgression(mode, 'C', variant).map((c) => c.root + c.suffix).join(' ');
  assert.equal(play('phrygian', 'phrygian-dominant'), 'C Db C Db');
  assert.equal(play('lydian', 'lydian-augmented'), 'Caug D Caug D');
  assert.equal(play('dorian', 'dorian-sharp4'), 'Cm D7 Cm D7');
  assert.equal(play('ionian', 'double-harmonic'), 'Cmaj7 Db Cmaj7 Db');
});

test('el glosario explica las variantes nuevas dentro de su modo', async () => {
  const { glossaryEntry, termText, linkTerms } = await import('../js/ui/glossary.js');
  assert.match(termText(glossaryEntry('modo-lydian')), /lidio aumentado/);
  assert.match(termText(glossaryEntry('modo-dorian')), /dórico ♯4 o modo ucraniano/);
  assert.match(termText(glossaryEntry('modo-phrygian')), /doble armónica/);
  assert.match(termText(glossaryEntry('modo-aeolian')), /menor melódica/);
  assert.match(linkTerms('Es la doble armónica.'), /data-term="modo-phrygian">doble armónica</);
});
