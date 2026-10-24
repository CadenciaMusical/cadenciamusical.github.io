import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { renderProgressionCard, progressionRanges } from '../js/ui/render.js';
import { setLatin } from '../js/core/names.js';

test('sin progresión ni cadencia final conocidas, no hay tarjeta', () => {
  assert.equal(renderProgressionCard(analyze('C Em')), '');
  assert.equal(renderProgressionCard(analyze('C D E')), '');
});

test('la tarjeta nombra la progresión y la cadencia final, con botón para oírlas', () => {
  const html = renderProgressionCard(analyze('Dm7 G7 Cmaj7'));
  assert.match(html, /ii–V–I/);
  assert.match(html, /Cadencia perfecta/);
  assert.match(html, /data-action="play-range" data-start="0" data-end="2"/);
  assert.match(renderProgressionCard(analyze('C A7 Dm G7 Fm C')), /Cadencia plagal menor/);
});

test('solo se marcan los acordes si la progresión está dentro de otra más larga', () => {
  assert.deepEqual([...progressionRanges(analyze('C G Am F'))], []);
  assert.deepEqual([...progressionRanges(analyze('Em Dm C G Am F'))], [2, 3, 4, 5]);
});

test('los acordes de la tarjeta siguen el cifrado elegido', () => {
  const r = analyze('C F G C');
  setLatin(true);
  assert.match(renderProgressionCard(r), /Escuchar el final \(Sol → Do\)/);
  setLatin(false);
  assert.match(renderProgressionCard(r), /Escuchar el final \(G → C\)/);
});

test('tonalidad dudosa: las dos opciones a la vista, con las pistas y el glosario', async () => {
  const { renderKey } = await import('../js/ui/render.js');
  setLatin(true);
  const html = renderKey(analyze('Lam Fa Do Sol'));
  setLatin(false);
  assert.match(html, /Más probable[\s\S]*La menor[\s\S]*También posible[\s\S]*Do mayor/);
  assert.match(html, /Empieza en Lam, la casa de La menor, pero acaba en Sol, que no es la casa de ninguna de las dos\./);
  assert.match(html, /data-term="relativa"/);
  assert.doesNotMatch(renderKey(analyze('C F G C')), /dos opciones/);
});

test('una progresión que aparece dos veces se muestra una sola vez', () => {
  for (const text of ['C F G C F G C', 'D C G D D C G D']) {
    const html = renderProgressionCard(analyze(text));
    assert.equal(html.match(/class="match-name"/g).length, 2, text); // la progresión y cómo acaba
  }
});
