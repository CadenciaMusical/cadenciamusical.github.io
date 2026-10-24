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
