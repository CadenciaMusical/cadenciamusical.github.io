import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgression, tokenSpans, writtenNotation } from '../js/core/parser.js';
import { analyze } from '../js/core/analysis.js';
import { renderErrors, renderKey } from '../js/ui/render.js';
import { setLatin } from '../js/core/names.js';

const notationOf = (text) => writtenNotation(parseProgression(text));

test('la página responde en el cifrado en que se escribe', () => {
  assert.equal(notationOf('Lam Fa Do Sol'), 'latin');
  assert.equal(notationOf('Am F C G'), 'american');
  assert.equal(notationOf('lam fa do sol7'), 'latin');
  // Mezclado o sin acordes: no se cambia.
  assert.equal(notationOf('Lam F Do G'), null);
  assert.equal(notationOf('Xz'), null);
  // Lo que no se reconoce no cuenta.
  assert.equal(notationOf('Lam Xz Sol'), 'latin');
});

test('«Lam Fa Do Sol» en latino dice «La menor», no «A menor»', () => {
  setLatin(true);
  const html = renderKey(analyze('Lam Fa Do Sol'));
  setLatin(false);
  assert.match(html, /La menor/);
  assert.doesNotMatch(html, /A menor/);
});

test('posición de cada trozo, para marcarlo en la casilla', () => {
  assert.deepEqual(tokenSpans(' C  Xz|G '), [
    { token: 'C', start: 1, end: 2 },
    { token: 'Xz', start: 4, end: 6 },
    { token: 'G', start: 7, end: 8 },
  ]);
});

test('un acorde sin reconocer bloquea el análisis y se sugiere el más parecido', () => {
  const r = analyze('C Xz G');
  assert.equal(r.errors.length, 1);
  const html = renderErrors(r.parsed);
  assert.match(html, /«Xz»/);
  // Nada parecido: se ofrece quitarlo, señalando el trozo 1.
  assert.match(html, /data-index="1" data-to="">Quitarlo/);
  assert.match(html, /Corrige el acorde marcado/);

  const typo = renderErrors(analyze('C Gmm7 Am').parsed);
  assert.match(typo, /¿Querías decir <button[^>]*data-index="1" data-to="Gm7">Gm7<\/button>\?/);
});

test('la sugerencia sale en el cifrado de la página', () => {
  setLatin(true);
  const html = renderErrors(analyze('Do Soll Lam').parsed);
  setLatin(false);
  assert.match(html, /data-to="Sol">Sol</);
  assert.equal(renderErrors(analyze('C G Am F').parsed), '');
});

test('si ya acaba en la casa de una opción, no se ofrece «Terminar en» esa', () => {
  setLatin(true);
  const html = renderKey(analyze('Dosus2 Fasus2'));
  setLatin(false);
  assert.match(html, /Terminar en Do/);
  assert.doesNotMatch(html, /Terminar en Fa/);
  assert.match(html, /terminando en Do y compáralo con cómo acaba ahora/);
});

test('separadores de cancionero: «-», «–» y «|»', () => {
  for (const text of ['C - G - Am - F', 'Do – Sol – Lam – Fa', 'C | G | Am | F', 'C — G — Am — F']) {
    const r = analyze(text);
    assert.equal(r.errors.length, 0, text);
    assert.equal(r.items.map((i) => i.roman).join(' '), 'I V vi IV', text);
    assert.ok(r.progressions.some((m) => m.id === 'pop'), text);
  }
  // El guion de «C-» (menor) sigue siendo parte del acorde.
  assert.equal(parseProgression('C- G')[0].triad, 'm');
});

test('«%» repite el acorde anterior', async () => {
  const { transposeText, convertNotation } = await import('../js/core/transpose.js');
  const r = analyze('C % F G');
  assert.equal(r.errors.length, 0);
  assert.equal(r.items.map((i) => i.roman).join(' '), 'I I IV V');
  assert.equal(r.chords[1].root, 'C');
  // Se queda como «%» al transportar o cambiar de cifrado.
  assert.equal(transposeText('C % F G', { pc: 0, mode: 'major', tonic: 'C' }, { pc: 2, mode: 'major', tonic: 'D' }), 'D % G A');
  assert.equal(convertNotation('C % F G', 'latin'), 'Do % Fa Sol');
  // Sin acorde antes, se avisa.
  setLatin(true);
  const html = renderErrors(parseProgression('% C'));
  setLatin(false);
  assert.match(html, /repite el acorde anterior, pero aquí no hay ninguno antes/);
});

test('«N.C.» es un silencio: se muestra, pero no cuenta para el análisis', async () => {
  const { renderChords } = await import('../js/ui/render.js');
  const r = analyze('C N.C. G C');
  assert.equal(r.errors.length, 0);
  assert.equal(r.items.map((i) => i.roman).join(' '), 'I V I');
  assert.deepEqual(r.rests, [1]);
  assert.equal(renderErrors(r.parsed), '');
  for (const text of ['C NC G C', 'C n.c. G C', 'C N.C G C']) assert.deepEqual(analyze(text).rests, [1], text);
  // En la cuadrícula, entre Do y Sol, una tarjeta de silencio que no se toca.
  const html = renderChords(r.items, { rests: r.rests });
  assert.match(html, /data-index="0"[\s\S]*class="chord rest[\s\S]*Silencio[\s\S]*data-index="1"/);
  assert.equal(html.match(/data-index=/g).length, 3);
  // Al principio y al final también.
  assert.deepEqual(analyze('N.C. C G C N.C.').rests, [0, 3]);
});
