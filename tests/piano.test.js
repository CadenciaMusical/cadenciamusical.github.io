import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord } from '../js/core/parser.js';
import { pianoVoicing } from '../js/ui/piano.js';

const midis = (s) => pianoVoicing(parseChord(s)).map((k) => k.midi);

test('posición fundamental desde la raíz, entre Do4 y Si4', () => {
  assert.deepEqual(midis('C'), [60, 64, 67]);
  assert.deepEqual(midis('Am'), [69, 72, 76]);
  assert.deepEqual(midis('G7'), [67, 71, 74, 77]);
  assert.deepEqual(midis('Bm7b5'), [71, 74, 77, 81]);
});

test('el bajo de un acorde con barra va una octava por debajo', () => {
  const keys = pianoVoicing(parseChord('C/E'));
  assert.equal(keys[0].midi, 52);
  assert.ok(keys[0].bass);
  assert.deepEqual(keys.slice(1).map((k) => k.midi), [60, 64, 67]);
});

test('las etiquetas usan ♯/♭ y su tamaño cabe siempre dentro de la tecla', async () => {
  const { renderPiano, labelSize } = await import('../js/ui/piano.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const html = renderPiano(parseChord('A7'));
  assert.match(html, />Do♯</);
  assert.doesNotMatch(html, /Do#/);
  // Cada etiqueta: ancho estimado (caracteres × 0,62 em) ≤ el hueco de su tecla.
  for (const [, size, text] of html.matchAll(/class="key-label"[^>]*font-size="([\d.]+)">([^<]+)</g)) {
    const black = text.length > 2 && /[♯♭]/.test(text);
    assert.ok(text.length * 0.62 * Number(size) <= (black ? 14 : 24), `${text} a ${size}`);
  }
  assert.ok(labelSize('Sol♯', 14) < labelSize('Do♯', 14));
  assert.equal(labelSize('Do', 24), 10);
  setLatin(false);
  assert.match(renderPiano(parseChord('Bb')), />B♭</);
});

test('en pantallas estrechas, los nombres van en una fila debajo del teclado', async () => {
  const { renderPiano } = await import('../js/ui/piano.js');
  const { setLatin } = await import('../js/core/names.js');
  setLatin(true);
  const html = renderPiano(parseChord('A7'));
  const row = /<div class="piano-names[^"]*" aria-hidden="true">(.*?)<\/div>/.exec(html)[1];
  assert.deepEqual([...row.matchAll(/>([^<]+)<\/span>/g)].map((m) => m[1]), ['La', 'Do♯', 'Mi', 'Sol']);
  // Dos notas pegadas (Do y Re, teclas vecinas) no se pisan: la segunda baja de línea.
  assert.match(renderPiano(parseChord('Csus2')), /piano-names two-lines.*<span class=" second"[^>]*>Re</);
  assert.doesNotMatch(renderPiano(parseChord('C')), /two-lines/);
  // El bajo se distingue también en la fila.
  assert.match(renderPiano(parseChord('C/E')), /<span class="bass"[^>]*>Mi<\/span>/);
});
