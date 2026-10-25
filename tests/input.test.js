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
