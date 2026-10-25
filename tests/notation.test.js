import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setLatin, noteName, chordLabel, chordName, keyName } from '../js/core/names.js';
import { parseChord } from '../js/core/parser.js';
import { analyze } from '../js/core/analysis.js';
import { kindText, modeName, modeCharText } from '../js/ui/texts.js';
import { GLOSSARY, termText } from '../js/ui/glossary.js';
import { renderPiano } from '../js/ui/piano.js';

afterEach(() => setLatin(false));

test('el cifrado elegido se aplica a notas, acordes y tonalidades', () => {
  const bbm7 = parseChord('Bbm7');
  setLatin(false);
  assert.equal(noteName('Bb'), 'B♭');
  assert.equal(chordLabel(bbm7), 'B♭m7');
  assert.equal(chordName(bbm7), 'B♭ menor con séptima');
  assert.equal(keyName({ tonic: 'F#', mode: 'minor' }), 'F♯ menor');
  setLatin(true);
  assert.equal(noteName('Bb'), 'Si♭');
  assert.equal(chordLabel(bbm7), 'Si♭m7');
  assert.equal(chordName(bbm7), 'Si♭ menor con séptima');
  assert.equal(keyName({ tonic: 'F#', mode: 'minor' }), 'Fa♯ menor');
});

test('en latino, aumentado, disminuido y add9 con símbolos también en la página', () => {
  setLatin(true);
  const labels = ['Faug', 'Cdim', 'Cdim7', 'Fadd9', 'Bm7b5'].map((s) => chordLabel(parseChord(s)));
  assert.deepEqual(labels, ['Fa+', 'Do°', 'Do°7', 'Fa(add9)', 'Siø7']);
  setLatin(false);
  assert.equal(chordLabel(parseChord('Faug')), 'Faug');
});

test('los disminuidos, con su símbolo en los dos cifrados, en las tarjetas y en los textos', async () => {
  const { renderChords, renderKey, renderProgressionCard } = await import('../js/ui/render.js');
  const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  setLatin(false);
  assert.deepEqual(['Bdim', 'Bo', 'Bdim7', 'Bm7b5', 'Bø7'].map((s) => chordLabel(parseChord(s))), ['B°', 'B°', 'B°7', 'Bø7', 'Bø7']);
  for (const [text, label] of [['Bdim C Bdim C', 'B°'], ['Bm7b5 C Bm7b5 C', 'Bø7']]) {
    const r = analyze(text);
    assert.match(renderChords(r.items), new RegExp(`class="symbol">${label}<`), text);
    assert.match(plain(renderKey(r)), new RegExp(`Si giras alrededor de ${label},`), text);
    assert.match(plain(renderProgressionCard(r)), new RegExp(`Es un bucle: ${label} y C se van alternando\\. Empieza en ${label},`), text);
    assert.doesNotMatch(plain(renderKey(r) + renderProgressionCard(r)), /Bdim|Bm7b5/, text);
  }
  setLatin(true);
  assert.match(plain(renderKey(analyze('Siø7 Do Siø7 Do'))), /Si giras alrededor de Siø7,/);
});

test('se puede pedir un cifrado concreto aunque el elegido sea otro', () => {
  setLatin(true);
  assert.equal(chordLabel(parseChord('C/E'), false), 'C/E');
});

test('los textos explicativos siguen el cifrado elegido', () => {
  const r = analyze('Dm7 Db7 Cmaj7');
  setLatin(false);
  assert.match(kindText(r.items[1], r.key), /lugar de G7, la dominante de la tónica, C\b.*\(B y F\)/);
  setLatin(true);
  assert.match(kindText(r.items[1], r.key), /lugar de Sol7, la dominante de la tónica, Do\b.*\(Si y Fa\)/);
});

test('los modos siguen el cifrado elegido', () => {
  const m = analyze('D C G D').modes.main;
  setLatin(false);
  assert.equal(modeName(m), 'D mixolidio');
  assert.equal(modeCharText(m), 'Frente a D mayor, cambia una nota: C en lugar de C♯.');
  setLatin(true);
  assert.equal(modeName(m), 'Re mixolidio');
});

test('el glosario y los diagramas siguen el cifrado elegido', () => {
  const sensible = GLOSSARY.find((e) => e.id === 'sensible');
  setLatin(false);
  assert.match(termText(sensible), /\(B en C mayor\)/);
  assert.match(renderPiano(parseChord('Am')), />A<.*>C<.*>E</);
  setLatin(true);
  assert.match(termText(sensible), /\(Si en Do mayor\)/);
  assert.match(renderPiano(parseChord('Am')), />La<.*>Do<.*>Mi</);
});

test('ningún texto del glosario mezcla cifrados: en americano no quedan sílabas latinas', () => {
  setLatin(false);
  const latinSyllable = /(?<![\p{L}])(Do|Re|Mi|Fa|Sol|La|Si)[♯♭]?(?![\p{L}])/u;
  for (const entry of GLOSSARY) {
    if (entry.id === 'cifrado') continue; // explica los dos a propósito
    const text = termText(entry).replace(/(La|Si) (?=[a-záéíóú])/g, ''); // «La forma…», «Si además…»
    assert.doesNotMatch(text, latinSyllable, `${entry.id}: ${text}`);
  }
});
