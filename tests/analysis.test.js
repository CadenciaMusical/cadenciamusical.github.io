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

// --- Dominantes secundarias: solo si van a su destino ---

test('una dominante secundaria tiene que ir a su destino', () => {
  // Re mayor en La menor no va a Sol: es el «cuarto dórico».
  for (const [text, roman] of [['Lam Re Mi Lam', 'i IV V i'], ['Lam Re7 Mi7 Lam', 'i IV7 V7 i']]) {
    const r = expectKey(text, 'A', 'minor');
    assert.equal(romans(r), roman, text);
    assert.equal(r.items[1].kind, 'dorian', text);
    assert.equal(r.items[1].fn, 'S', text);
    assert.equal(r.modal, false, text);
  }
  // Solos, acaban en cadencia perfecta en Sol mayor y en La menor; en Do mayor:
  const inC = (text, i) => analyze(text, { forcedKey: C_MAJOR }).items[i];
  assert.equal(inC('Do Re7 Sol', 1).roman, 'V7/V');
  assert.equal(inC('Do Mi7 Lam', 1).roman, 'V7/vi');
  assert.notEqual(inC('Do Re7 Fa', 1).kind, 'secondary');
  // Llegar al sustituto tritonal del destino también vale.
  assert.equal(romans(expectKey('Do Re7 Reb7 Do', 'C', 'major')), 'I V7/V subV7 I');
  assert.equal(romans(expectKey('Mi7 La7 Re7 Sol7 Do', 'C', 'major')), 'V7/vi V7/ii V7/V V7 I');
  // Si vuelve una y otra vez a la tónica, es La dórico.
  const dorian = analyze('Lam Re Lam Re');
  assert.equal(dorian.key.modal.id, 'dorian');
  assert.equal(dorian.items[1].kind, 'modal');
});

// --- Acordes sus: sin tercera, no deciden entre mayor y menor ---

test('los sus pesan por su fundamental, no por sus notas añadidas', () => {
  const r = analyze('Dosus2 Fasus2');
  const key = (k) => `${k.tonic} ${k.mode}`;
  assert.deepEqual([key(r.key), key(r.alternative)].sort(), ['C major', 'F major']);
  assert.equal(r.confidence, 'baja');
  assert.equal(romans(r), r.key.tonic === 'F' ? 'Vsus2 Isus2' : 'Isus2 IVsus2');
});

test('una suspensión que se resuelve', async () => {
  const { kindText } = await import('../js/ui/texts.js');
  const { normalVersion } = await import('../js/core/build.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const sus4 = expectKey('Solsus4 Sol Do', 'C', 'major');
  assert.equal(romans(sus4), 'Vsus4 V I');
  assert.equal(sus4.items[0].kind, 'suspension');
  assert.match(kindText(sus4.items[0], sus4.key), /en lugar de la tercera \(Si\) lleva la cuarta \(Do\)[\s\S]*baja a Si y llega Sol/);
  const home = expectKey('Do Dosus4 Do', 'C', 'major');
  assert.equal(romans(home), 'I Isus4 I');
  assert.equal(home.items[1].fn, 'T');
  const sus2 = expectKey('Lam Lasus2 Lam', 'A', 'minor');
  assert.match(kindText(sus2.items[1], sus2.key), /lleva la segunda \(Si\)[\s\S]*sube a Do y llega Lam/);
  // Con séptima, se resuelve en el acorde con séptima.
  const seventh = expectKey('Sol7sus4 Sol7 Do', 'C', 'major');
  assert.equal(normalVersion(seventh.items[0], seventh.key).input, 'G7');
  // Si no se resuelve, es un acorde de la tonalidad sin más.
  assert.equal(analyze('Do Fa Solsus4 Do').items[2].kind, 'diatonic');
  setLatin(false);
});

// --- Acordes aumentados ---

test('solo acordes simétricos: no hay una tonalidad clara', async () => {
  const { renderKey, renderChords } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  for (const text of ['Do+ Mi+ Sol#+', 'Do+', 'Do°7 Mib°7']) {
    const r = analyze(text);
    assert.ok(r.unclear, text);
    assert.ok(r.items.every((i) => i.kind === 'symmetric' && i.roman === '' && i.fn === 'N'), text);
    assert.match(renderKey(r), /No hay una tonalidad clara/, text);
    assert.doesNotMatch(renderChords(r.items), /class="roman"|Fuera de la tonalidad/, text);
  }
  const html = renderKey(analyze('Do+ Mi+ Sol#+')).replace(/<[^>]+>/g, '');
  assert.match(html, /Do\+, Mi\+ y Sol♯\+ son el mismo acorde aumentado/);
  // Con la tonalidad elegida a mano, se analiza en ella.
  assert.ok(!analyze('Do+ Mi+ Sol#+', { forcedKey: C_MAJOR }).unclear);
  // Basta un acorde mayor o menor para fijarla.
  assert.ok(!analyze('Do+ Do').unclear);
  setLatin(false);
});

test('dominante aumentada: V+ y V+/x', async () => {
  const { kindText } = await import('../js/ui/texts.js');
  const { normalVersion } = await import('../js/core/build.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const r = expectKey('Sol Sol+ Do', 'C', 'major');
  assert.equal(romans(r), 'V V+ I');
  assert.equal(`${r.items[1].kind} ${r.items[1].role} ${r.items[1].fn}`, 'augmented dominant D');
  assert.match(kindText(r.items[1], r.key), /dominante aumentada: Sol con la quinta subida medio tono \(Re♯\)[\s\S]*hasta Mi, la tercera de Do/);
  assert.equal(normalVersion(r.items[1], r.key).input, 'G');
  // Do Do+ Fa acaba en Fa (V–V+–I); en Do mayor, V+/IV.
  assert.equal(romans(expectKey('Do Do+ Fa', 'F', 'major')), 'V V+ I');
  assert.equal(analyze('Do Do+ Fa', { forcedKey: C_MAJOR }).items[1].roman, 'V+/IV');
  // Con otro de sus nombres: Si+ = Sol+.
  const renamed = expectKey('Si+ Do', 'C', 'major');
  assert.equal(`${renamed.items[0].roman} ${renamed.items[0].readAs}`, 'V+ G');
  assert.match(kindText(renamed.items[0], renamed.key), /^Si\+ suena exactamente igual que Sol\+/);
  // En menor, también: Mi+ → Lam.
  assert.equal(romans(expectKey('Mi+ Lam', 'A', 'minor')), 'V+ i');
  // Sin resolver, sigue siendo cromático, con sus tres nombres.
  const lone = analyze('Do Fa+ Sol');
  assert.equal(lone.items[1].kind, 'chromatic');
  assert.match(kindText(lone.items[1], lone.key), /igual que La\+ y Do♯\+/);
  const sym = analyze('Do+ Mi+ Sol#+');
  assert.match(kindText(sym.items[1], sym.key), /igual que Sol♯\+ y Do\+/);
  setLatin(false);
});

// --- Alternativas de tonalidad con sentido ---

test('la alternativa es la relativa, la paralela o la del primer o el último acorde', () => {
  const alt = (text) => {
    const r = analyze(text);
    return r.alternative && `${r.alternative.tonic} ${r.alternative.mode}`;
  };
  // Fa mayor tiene sus notas, pero empieza y acaba en Do: no es una alternativa.
  const r = expectKey('Do Sib Lab Sib Do', 'C', 'major');
  assert.ok([null, 'C minor'].includes(alt('Do Sib Lab Sib Do')));
  assert.equal(r.items[1].kind, 'borrowed');
  // Sin rival con sentido, la confianza no es baja.
  assert.notEqual(r.confidence, 'baja');
  // Siguen las que tienen sentido.
  assert.equal(alt('Am F C G'), 'C major');
  assert.equal(alt('Em C G D'), 'G major');
  assert.equal(alt('Dosus2 Fasus2'), 'C major');
  assert.equal(alt('F G Am'), 'C major');
});

// --- El bajo ---

test('líneas de bajo por grados conjuntos', () => {
  const pop = analyze('Do Sol/Si Lam Lam/Sol Fa Do/Mi Rem7 Sol');
  assert.ok(pop.progressions.some((m) => m.id === 'pop'));
  assert.equal(pop.bassLines.length, 1);
  const [down] = pop.bassLines;
  assert.deepEqual([down.start, down.end, down.dir, down.chromatic], [0, 6, 'down', false]);
  assert.deepEqual(down.notes, ['C', 'B', 'A', 'G', 'F', 'E', 'D']);
  assert.deepEqual(down.midis.map((m, i, all) => m - (all[i - 1] ?? m)), [0, -1, -2, -2, -2, -1, -2]);

  const [lament] = analyze('Lam Lam/Sol Lam/Fa# Fa').bassLines;
  assert.deepEqual([lament.dir, lament.chromatic], ['down', true]);
  assert.deepEqual(lament.notes, ['A', 'G', 'F#', 'F']);

  // Sin barras también: la andaluza baja La – Sol – Fa – Mi.
  assert.deepEqual(analyze('Am G F E').bassLines[0].notes, ['A', 'G', 'F', 'E']);
  assert.equal(analyze('C D E F G').bassLines[0].dir, 'up');
  // Menos de cuatro acordes, o sin grados conjuntos: nada.
  assert.equal(analyze('C G/B Am').bassLines.length, 0);
  assert.equal(analyze('C G Am F').bassLines.length, 0);
});

test('las inversiones, en lenguaje llano', async () => {
  const { inversionText } = await import('../js/ui/texts.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const r = analyze('Do Sol/Si Lam Lam/Sol Fa Do/Mi Rem7 Sol');
  assert.equal(inversionText(r.items[1]), 'Sol con Si en el bajo: suena a Sol, pero más ligero, y conecta mejor con el acorde siguiente. Es la primera inversión: la tercera del acorde va abajo.');
  assert.equal(r.items[0].inversion, null);
  assert.equal(r.items[3].inversion.type, 'other');
  const types = (text) => analyze(text).items.map((i) => i.inversion?.type ?? '-').join(' ');
  assert.equal(types('Do Do/Sol Sol7 Do'), '- fifth - -');
  assert.equal(types('Do7/Sib Fa/La'), 'seventh third');
  assert.match(inversionText(analyze('Do Do/Sol Sol7 Do').items[1]), /segunda inversión/);
  setLatin(false);
});

test('en un bucle, la casa es el primer acorde', async () => {
  const { keyName, setLatin } = await import('../js/core/names.js');
  setLatin(true);
  // Em F G F va y vuelve a Em: Mi frigio, no Do mayor.
  const frigio = analyze('Mim Fa Sol Fa');
  assert.equal(keyName(frigio.key), 'Mi frigio');
  assert.equal(romans(frigio), 'i ♭II III ♭II');
  // Do Fam Do Fam: Do con el iv prestado, no Fa menor con Do como V.
  const prestado = analyze('Do Fam Do Fam');
  assert.equal(keyName(prestado.key), 'Do mayor');
  assert.equal(romans(prestado), 'I iv I iv');
  assert.equal(prestado.items[1].kind, 'borrowed');
  // Acabar en Fam no es un final, pero Do alterna con Fam, una quinta por
  // debajo: también se oye como su V. La alternativa es Fa menor por eso.
  assert.equal(keyName(prestado.alternative), 'Fa menor');
  setLatin(false);
});

test('un acorde que se mantiene, aunque cambie el bajo, pesa más', async () => {
  const { renderProgressionCard } = await import('../js/ui/render.js');
  const { keyName, setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const r = analyze('Lam Lam/Sol Lam/Fa# Fa');
  assert.equal(keyName(r.key), 'La menor');
  assert.equal(romans(r), 'i i i VI');
  assert.match(renderProgressionCard(r), /Bajo cromático descendente/);
  setLatin(false);
});

test('si gana otra tonalidad, la del primer acorde de un bucle sale como alternativa', () => {
  // IV–V–I–V dos veces: el Sol → Do decide Do mayor, pero empieza en Fa.
  const r = expectKey('F G C G F G C G', 'C', 'major');
  assert.equal(romans(r), 'IV V I V IV V I V');
  assert.equal(`${r.alternative.tonic} ${r.alternative.mode}`, 'F major');
  // Con una dominante que lleva a otro acorde, empezar no basta para ser la casa.
  expectKey('F G C G', 'C', 'major');
  expectKey('Dm G C G', 'C', 'major');
});

test('los bucles de siempre no cambian', () => {
  expectKey('Lam Sol Fa Sol', 'A', 'minor');
  expectKey('Fa Sol Mim Lam', 'A', 'minor');
  expectKey('C G Am F', 'C', 'major');
  const r = expectKey('Am F C G', 'A', 'minor');
  assert.equal(`${r.alternative.tonic} ${r.alternative.mode}`, 'C major');
});

test('nota pedal: el bajo que no se mueve decide la casa', async () => {
  const { renderProgressionCard } = await import('../js/ui/render.js');
  const { keyName, setLatin } = await import('../js/core/names.js');
  setLatin(true);
  for (const [text, name, roman, note] of [
    ['Sol Do/Sol Sol Fa/Sol', 'Sol mixolidio', 'I IV I ♭VII', 'G'],
    ['Re Do/Re Sol/Re Re', 'Re mixolidio', 'I ♭VII IV I', 'D'],
    ['Do Fa/Do Sol/Do Do', 'Do mayor', 'I IV V I', 'C'],
  ]) {
    const r = analyze(text);
    assert.equal(keyName(r.key), name, text);
    assert.equal(romans(r), roman, text);
    assert.equal(r.pedal.note, note, text);
    assert.ok(r.pedal.midis.every((m) => m === r.pedal.midis[0]), text);
    const html = renderProgressionCard(r);
    assert.match(html, /<h2 class="match-name">Nota pedal<\/h2>/, text);
    const tonic = name.split(' ')[0];
    assert.match(html, new RegExp(`El bajo se queda en ${tonic} mientras los acordes cambian por encima`), text);
    assert.match(html, /data-action="play-pedal">▶ Solo el bajo/, text);
  }
  // Un acorde que se mantiene no es una nota pedal: arriba no cambia nada.
  assert.equal(analyze('Am Am Am F').pedal, null);
  assert.equal(analyze('C G Am F').pedal, null);
  setLatin(false);
});

// --- Acordes de quinta («5»): sin tercera, ni mayores ni menores ---

test('los acordes de quinta cuentan por su fundamental, y sus grados no sugieren tercera', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  // La pentatónica menor de Do, lo más típico del rock: nunca Si♭ mayor.
  const rock = expectKey('Do5 Mib5 Fa5 Sol5 Sib5', 'C', 'minor');
  assert.equal(romans(rock), 'I5 III5 IV5 V5 VII5');
  assert.deepEqual(rock.pentatonic, { mode: 'minor', tonic: 'C', scale: ['C', 'Eb', 'F', 'G', 'Bb'] });
  const html = renderKey(rock);
  assert.match(plain(html), /Estos acordes salen de la escala pentatónica menor de Do, la más usada en el rock y el blues\./);
  assert.match(html, /data-action="play-pentatonic">▶ Escuchar la pentatónica/);
  // Sus fundamentales no son de la pentatónica de Mi: Mi menor, sin pentatónica.
  const e = expectKey('Mi5 Sol5 La5 Do5 Re5', 'E', 'minor');
  assert.equal(e.pentatonic, null);
  // El I–IV–V de siempre, sin terceras: Do, y no hay pentatónica que nombrar.
  const basic = expectKey('Do5 Fa5 Sol5 Do5', 'C', 'major');
  assert.equal(romans(basic), 'I5 IV5 V5 I5');
  assert.equal(basic.pentatonic, null);
  // Si la duda es entre Do mayor y Do menor, se explica por qué.
  assert.match(plain(renderKey(basic)), /Ninguno de estos acordes lleva tercera, que es la nota que decide entre mayor y menor/);
  setLatin(false);
});

// --- Dominantes alteradas ---

test('las dominantes alteradas no son aumentados simétricos', async () => {
  const { kindText } = await import('../js/ui/texts.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const g = expectKey('Sol7alt Do', 'C', 'major');
  assert.equal(romans(g), 'V7alt I');
  assert.equal(`${g.items[0].kind} ${g.items[0].fn}`, 'altered D');
  assert.ok(g.items[0].target.resolves);
  assert.match(kindText(g.items[0], g.key), /dominante alterada: una dominante con notas tensas añadidas \(♭9, ♯9, ♭5 o ♯5\) que suena aún más inestable y pide resolver; muy del jazz/);
  assert.equal(g.cadences.find((c) => c.atEnd)?.id, 'perfect');
  // Si7alt no es Sol+7: es la dominante alterada de Mi, que no va a su destino.
  const b = expectKey('Si7alt Do', 'C', 'major');
  assert.notEqual(b.items[0].roman, 'V+7');
  assert.equal(`${b.items[0].kind} ${b.items[0].roman}`, 'altered V7alt/iii');
  assert.ok(!b.items[0].target.resolves);
  assert.match(kindText(b.items[0], b.key), /no va a su destino/);
  assert.equal(expectKey('Re7alt Sol Do', 'C', 'major').items[0].roman, 'V7alt/V');
  // Las otras alteraciones, igual.
  assert.equal(expectKey('Sol7b9 Do', 'C', 'major').items[0].roman, 'V7♭9');
  assert.equal(analyze('Mi7#9 Lam').items[0].kind, 'altered');
  // En un blues, el I7 con ♯9 (el acorde de Hendrix) sigue siendo del blues.
  assert.deepEqual(analyze('E7#9 A7 E7#9 A7').items.map((i) => i.kind), ['blues', 'blues', 'blues', 'blues']);
  // La tríada aumentada sigue siendo simétrica: V+.
  const aug = expectKey('Sol Sol+ Do', 'C', 'major');
  assert.equal(`${aug.items[1].roman} ${aug.items[1].kind}`, 'V+ augmented');
  setLatin(false);
});

// --- Acordes clásicos con nombre propio ---

test('la sexta napolitana', async () => {
  const { renderDetail, renderChords } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  const n6 = expectKey('Lam Sib/Re Mi7 Lam', 'A', 'minor');
  assert.equal(romans(n6), 'i ♭II6 V7 i');
  assert.equal(`${n6.items[1].kind} ${n6.items[1].fn}`, 'neapolitan S');
  const detail = plain(renderDetail(n6.items[1], n6.key));
  assert.match(detail, /✦ Algo especial\. Es la sexta napolitana: un acorde prestado muy expresivo, medio tono por encima de la tónica, que prepara la dominante con dramatismo\. Muy de Bach, Mozart y Beethoven\./);
  assert.match(detail, /Con Rem en su lugar/);
  assert.doesNotMatch(renderChords(n6.items), /Fuera de la tonalidad/);
  // En estado fundamental, el napolitano.
  const root = expectKey('Lam Sib Mi Lam', 'A', 'minor');
  assert.equal(`${root.items[1].roman} ${root.items[1].kind}`, '♭II neapolitan');
  assert.match(plain(renderDetail(root.items[1], root.key)), /Es el acorde napolitano/);
  // También en mayor, y pasando por la tónica en 6/4.
  assert.equal(romans(expectKey('Do Reb/Fa Sol7 Do', 'C', 'major')), 'I ♭II6 V7 I');
  assert.equal(analyze('Lam Sib/Re Lam/Mi Mi7 Lam').items[1].kind, 'neapolitan');
  // El ♭II del frigio, que va directo a la tónica, sigue siendo frigio.
  const frigio = analyze('Mim Fa Mim Fa');
  assert.equal(frigio.key.modal?.id, 'phrygian');
  assert.ok(frigio.items.every((i) => i.kind !== 'neapolitan'));
  setLatin(false);
});

test('el II mayor del pop', async () => {
  const { kindText } = await import('../js/ui/texts.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const r = expectKey('Do Re Fa Do', 'C', 'major');
  assert.equal(romans(r), 'I II IV I');
  assert.equal(r.items[1].kind, 'major-two');
  assert.ok(r.items[1].special);
  assert.match(kindText(r.items[1], r.key), /dominante secundaria que no va a su destino: pide ir a Sol, pero no llega, y se queda como un color brillante y luminoso\. Muy de los Beatles\./);
  assert.ok(r.progressions.some((p) => p.id === 'major-two'));
  // Siguen como ahora.
  assert.equal(analyze('Do Re7 Sol', { forcedKey: C_MAJOR }).items[1].roman, 'V7/V');
  assert.equal(analyze('Do Re Do Re').key.modal?.id, 'lydian');
  setLatin(false);
});

test('un mayor que alterna con el menor una quinta por debajo: también su V–i', async () => {
  const { keyName, setLatin } = await import('../js/core/names.js');
  const { renderKey } = await import('../js/ui/render.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  const r = analyze('Mi Lam Mi Lam');
  assert.equal(keyName(r.key), 'Mi mayor');
  assert.equal(keyName(r.alternative), 'La menor');
  const text = plain(renderKey(r));
  assert.match(text, /Pero Mi también puede ser la dominante de La menor: un acorde mayor que va y vuelve al menor que tiene una quinta por debajo\./);
  // Si se queda en Mi, el frigio dominante.
  assert.match(text, /también encaja Mi frigio dominante, el sonido del flamenco/);
  // Sin cambios.
  const a = analyze('Lam Mi Lam Mi');
  assert.equal(keyName(a.key), 'La menor');
  assert.equal(a.alternative, null);
  const c = analyze('Do Fam Do Fam');
  assert.equal(keyName(c.key), 'Do mayor');
  assert.equal(c.items[1].kind, 'borrowed');
  setLatin(false);
});

// --- Escalas simétricas y colores especiales ---

test('tonos enteros y escala disminuida: no hay tonalidad clara', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  for (const [text, id, words] of [
    ['Do7 Re7 Mi7 Fa#7', 'whole-tone', /escala de tonos enteros, que no tiene ninguna nota que suene a casa[\s\S]*Suena a sueño o a flotar; muy de Debussy/],
    ['Do+ Re+ Do+ Re+', 'whole-tone', /escala de tonos enteros/],
    ['Do Mib Solb La', 'octatonic', /escala disminuida, que alterna tonos y semitonos[\s\S]*Suena tensa e inquietante; muy del jazz y de las bandas sonoras de suspense/],
    ['Do7 Mib7 Fa#7 La7', 'octatonic', /escala disminuida/],
  ]) {
    const r = analyze(text);
    assert.ok(r.unclear, text);
    assert.equal(r.symmetricScale.id, id, text);
    // Sin grados ni funciones.
    assert.ok(r.items.every((i) => i.roman === '' && i.fn === 'N'), text);
    const html = renderKey(r);
    assert.match(html, /No hay una tonalidad clara/, text);
    assert.match(plain(html), words, text);
    assert.match(html, /data-action="play-symmetric">▶ Escuchar la escala/, text);
  }
  assert.deepEqual(analyze('Do7 Re7 Mi7 Fa#7').symmetricScale.scale, ['C', 'D', 'E', 'F#', 'G#', 'Bb']);
  assert.deepEqual(analyze('Do Mib Solb La').symmetricScale.scale, ['C', 'Db', 'Eb', 'E', 'F#', 'G', 'A', 'Bb']);
  // Siguen teniendo tonalidad.
  for (const text of ['Do Re Mi Fa Sol', 'Do Mib Fa Do', 'Do Mib Do Mib', 'Do Re Mi']) assert.ok(!analyze(text).unclear, text);
  // Un mismo aumentado con tres nombres: como antes, sin escala.
  assert.equal(analyze('Do+ Mi+ Sol#+').symmetricScale, null);
  setLatin(false);
});

test('mediantes cromáticas', async () => {
  const { renderDetail } = await import('../js/ui/render.js');
  const { renderProgressionCard } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  for (const text of ['Do Mi Lab Do', 'Do Lab Mi Do']) {
    const r = expectKey(text, 'C', 'major');
    assert.equal(r.mediants.length, 1, text);
    assert.ok(r.mediants[0].chain, text);
    const mi = r.items.find((i) => i.chord.root === 'E');
    assert.equal(`${mi.kind} ${mi.special}`, 'mediant true', text);
    assert.match(plain(renderDetail(mi, r.key)), /✦ Algo especial\. Es una mediante cromática/, text);
    const card = plain(renderProgressionCard(r));
    assert.match(card, /Mediantes cromáticas Saltos entre acordes a una tercera de distancia que no son de la misma tonalidad: suenan grandiosos y sorprendentes\. Es el sonido épico del cine \(John Williams, Hans Zimmer\)\./, text);
    assert.match(card, /reparten la octava en tres partes iguales/, text);
  }
  assert.equal(romans(analyze('Do Mi Lab Do')), 'I III ♭VI I');
  // Siguen como ahora.
  const epic = analyze('Do Lab Sib Do');
  assert.equal(epic.cadences.find((c) => c.atEnd)?.id, 'epic');
  assert.deepEqual(epic.mediants, []);
  const secondary = analyze('Do Mi7 Lam', { forcedKey: C_MAJOR });
  assert.equal(secondary.items[1].roman, 'V7/vi');
  assert.deepEqual(secondary.mediants, []);
  setLatin(false);
});

// --- Retoques de pulido ---

test('dominantes alteradas: notas sin dobles alteraciones y el mismo nombre en todas partes', async () => {
  const { renderDetail } = await import('../js/ui/render.js');
  const { kindText } = await import('../js/ui/texts.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const [text, notes, tense] of [
    ['Si7alt Do', 'B D# G A D', ['Sol', 'Re']],
    ['Sol7alt Do', 'G B Eb F A#', ['Mi♭', 'La♯']],
  ]) {
    const item = analyze(text).items[0];
    const { key } = analyze(text);
    // La ♯5 como ♭13 y la ♯9 con su nombre más sencillo.
    assert.equal(item.chord.notes.join(' '), notes, text);
    assert.ok(item.chord.notes.every((n) => !/##|bb/.test(n.slice(1))), text);
    for (const instrument of ['piano', 'guitar']) {
      const detail = plain(renderDetail(item, key, { instrument }));
      assert.doesNotMatch(detail, /♯♯|♭♭|𝄪|𝄫/, `${text} (${instrument})`);
      assert.match(detail, /(Si|Sol) dominante alterada · notas/, text);
      assert.doesNotMatch(detail, /séptima y novena/, text);
      // Las notas que nombra el texto son las del subtítulo.
      const shown = detail.match(/notas ((?:\S+ · )+\S+)/)[1].split(' · ');
      for (const n of tense) assert.ok(shown.includes(n), `${text}: ${n} en ${shown}`);
    }
    assert.match(kindText(item, key), new RegExp(`con ${tense[0]} y ${tense[1]}\\.`), text);
  }
  // Las demás alteraciones, igual.
  for (const symbol of ['Si7#9', 'Si7#5', 'Fa#7alt', 'Reb7alt', 'La7#9']) {
    const c = analyze(`${symbol} Do`).items[0].chord;
    assert.ok(c.notes.every((n) => !/##|bb/.test(n.slice(1))), `${symbol}: ${c.notes}`);
  }
  setLatin(false);
});

test('«hay dos opciones»: frases cortas, una idea por frase', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  const { alternativeText } = await import('../js/ui/texts.js');
  const { keyName, setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const sentences = (t) => t.split(/(?<=\.)\s+/).filter(Boolean);
  for (const [text, home, other] of [['Do Fam Do Fam', 'Do', 'Fa menor'], ['Mi Lam Mi Lam', 'Mi', 'La menor']]) {
    const r = analyze(text);
    const t = alternativeText(r.key, r.alternative, r.alternativeIsRelative, r.chords);
    assert.ok(sentences(t).length <= 3, `${text}: ${t}`);
    assert.equal(t, `${home} suena a casa porque la progresión empieza ahí. Pero ${home} también puede ser la dominante de ${other}: un acorde mayor que va y vuelve al menor que tiene una quinta por debajo. Escucha unas vueltas: donde descanse tu oído, ahí está la casa.`);
    // El frigio dominante, aparte y en pequeño.
    assert.doesNotMatch(t, /frigio/);
    assert.match(renderKey(r), new RegExp(`<p class="muted">Si la casa es ${home}, también encaja`));
  }
  // Siguen como ahora.
  const pop = analyze('Am F C G');
  assert.equal(alternativeText(pop.key, pop.alternative, pop.alternativeIsRelative, pop.chords), 'Usan las mismas notas (son tonalidades relativas), así que los acordes no bastan para decidir. Empieza en Lam, la casa de La menor, pero acaba en Sol, que no es la casa de ninguna de las dos. Escucha cómo suena terminando en cada una: la que te suene a final es la buena.');
  const dorian = analyze('Lam Re Lam Re');
  assert.equal(keyName(dorian.key), 'La dórico');
  assert.equal(dorian.alternative, null);
  setLatin(false);
});

test('el napolitano tiene su tarjeta bajo la tonalidad', async () => {
  const { renderProgressionCard, progressionRanges } = await import('../js/ui/render.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const [text, title, iv] of [
    ['Lam Sib/Re Mi7 Lam', 'Sexta napolitana', 'iv (Rem)'],
    ['Lam Sib Mi Lam', 'Acorde napolitano', 'iv (Rem)'],
    ['Do Reb/Fa Sol7 Do', 'Sexta napolitana', 'IV (Fa)'],
  ]) {
    const r = analyze(text);
    const html = renderProgressionCard(r);
    const card = plain(html);
    assert.match(card, new RegExp(`✦ Algo especial ${title} `), text);
    assert.match(card, /prepara la dominante con dramatismo/, text);
    assert.match(card, /▶ Así suena/, text);
    assert.match(card, new RegExp(`▶ Con el ${iv.replace(/[()]/g, '\\$&')} en su lugar`), text);
    assert.match(html, /data-action="play-swapped" data-start="0" data-end="3" data-index="1"/, text);
    // Marcado en las tarjetas de los acordes.
    assert.ok(progressionRanges(r).has(1), text);
  }
  // El ♭II del frigio no es un napolitano.
  const frigio = analyze('Mim Fa Mim Fa');
  assert.doesNotMatch(plain(renderProgressionCard(frigio)), /napolitan/);
  assert.equal(progressionRanges(frigio).size, 0);
  setLatin(false);
});

test('la menor melódica, a la vista en la tarjeta de tonalidad', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  const { keyName, setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  for (const [text, name, notes] of [['Lam Re Mi Lam', 'La menor', 'Fa♯ y Sol♯'], ['Dom Fa Sol Dom', 'Do menor', 'La y Si']]) {
    const r = analyze(text);
    // El análisis no cambia.
    assert.equal(keyName(r.key), name, text);
    assert.ok(!r.key.modal, text);
    const html = renderKey(r);
    assert.match(plain(html), new RegExp(`Con ${notes} a la vez, usa la escala menor melódica\\.`), text);
    assert.match(html, /data-term="modo-aeolian">menor melódica</, text);
    assert.match(html, /data-action="play-melodic">▶ Escuchar la escala/, text);
  }
  assert.deepEqual(analyze('Lam Re Mi Lam').melodic.scale, ['A', 'B', 'C', 'D', 'E', 'F#', 'G#']);
  // Como título, si es la escala de la progresión.
  const jazz = analyze('Lammaj7 Re7 Mi7 Lammaj7');
  assert.equal(keyName(jazz.key), 'La menor melódica');
  assert.doesNotMatch(renderKey(jazz), /play-melodic/);
  // Sin la sexta o sin la séptima subidas, nada.
  for (const text of ['Lam Rem Mi7 Lam', 'Lam Re Lam Re']) {
    assert.equal(analyze(text).melodic, null, text);
    assert.doesNotMatch(renderKey(analyze(text)), /play-melodic/, text);
  }
  setLatin(false);
});
