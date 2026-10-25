import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/core/analysis.js';
import { renderProgressionCard, progressionRanges } from '../js/ui/render.js';
import { setLatin } from '../js/core/names.js';

test('sin progresión ni cadencia final conocidas, no hay tarjeta', () => {
  assert.equal(renderProgressionCard(analyze('C Em')), '');
  assert.equal(renderProgressionCard(analyze('Am Bb C')), '');
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

test('detalle del acorde: nombre y grado, notas debajo, diagrama y botones antes de la explicación', async () => {
  const { renderDetail } = await import('../js/ui/render.js');
  setLatin(false);
  const r = analyze('C A7 Dm G7 C');
  for (const instrument of ['piano', 'guitar']) {
    const html = renderDetail(r.items[1], r.key, { instrument });
    const at = (s) => html.indexOf(s);
    // El grado va en la misma línea que el nombre; las notas, debajo, fuera de ella.
    assert.match(html, /class="detail-title">\s*<h3>A7<\/h3>\s*<span class="roman big">V7\/ii<\/span>\s*<\/div>\s*<p class="muted">/);
    for (const [before, after] of [
      ['class="detail-head', 'class="diagram'],
      ['class="diagram', 'data-action="play-selected"'],
      ['data-action="arpeggio-selected"', 'class="badge'],
      ['data-action="arpeggio-selected"', 'class="special"'],
      ['class="special"', 'class="explain"'],
    ]) assert.ok(at(before) >= 0 && at(before) < at(after), `${instrument}: ${before} antes que ${after}`);
  }
});

test('con la guitarra, una sola fila: Acorde, Nota a nota y Otra posición; con el piano, igual que antes', async () => {
  const { renderDetail } = await import('../js/ui/render.js');
  setLatin(false);
  const r = analyze('C A7 Dm G7 C');
  const actions = (html) => [...html.matchAll(/data-action="(play-selected|arpeggio-selected|next-position|strum)"/g)].map((m) => m[1]);
  const guitar = renderDetail(r.items[1], r.key, { instrument: 'guitar' });
  assert.deepEqual(actions(guitar), ['play-selected', 'arpeggio-selected', 'next-position']);
  assert.doesNotMatch(guitar, /Rasgueo/);
  assert.match(guitar, /aria-label="Otra posición \(1 de 2\)">↻ Posición 1\/2</);
  assert.equal(guitar.match(/class="button-row listen"/g).length, 1);
  assert.deepEqual(actions(renderDetail(r.items[1], r.key, { instrument: 'piano' })), ['play-selected', 'arpeggio-selected']);
});

test('los disminuidos con séptima: ✦, su papel, el nombre con que se leen y botones para compararlos', async () => {
  const { renderDetail, renderChords } = await import('../js/ui/render.js');
  setLatin(true);
  const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  const tonic = analyze('Fa°7 Do');
  const detail = text(renderDetail(tonic.items[0], tonic.key));
  assert.match(detail, /Fa°7 suena exactamente igual que Si°7: sus cuatro notas están a la misma distancia/);
  assert.match(detail, /prestado de Do menor/);
  assert.match(renderDetail(tonic.items[0], tonic.key), /data-action="context">▶ Así suena[\s\S]*data-action="context-normal">▶ Con Sol7 en su lugar/);

  const passing = analyze('Fa°7 Sol°7 Domaj7');
  const cards = renderChords(passing.items);
  assert.equal(cards.match(/class="star"/g).length, 2);
  assert.equal(cards.match(/De paso/g).length, 2);
  assert.doesNotMatch(cards, /Fuera de la tonalidad/);
  assert.match(text(renderDetail(passing.items[0], passing.key)), /sube un tono hasta Sol°7, otro disminuido con séptima, y los dos suben juntos, en paralelo, hasta Domaj7/);
  assert.match(renderDetail(passing.items[1], passing.key), /Con Sol en su lugar/);

  const common = analyze('Do La°7 Do');
  assert.match(text(renderDetail(common.items[1], common.key)), /La°7 suena exactamente igual que Do°7[\s\S]*disminuido de nota común/);
  // Sin otro nombre, no hace falta explicarlo.
  const plain = analyze('Si°7 Do');
  assert.doesNotMatch(text(renderDetail(plain.items[0], plain.key)), /suena exactamente igual/);
  setLatin(false);
});

test('el cuarto dórico lleva ✦ y se explica', async () => {
  const { renderDetail, renderChords } = await import('../js/ui/render.js');
  setLatin(true);
  const r = analyze('Lam Re Mi Lam');
  assert.equal(renderChords(r.items).match(/class="star"/g).length, 1);
  const html = renderDetail(r.items[1], r.key).replace(/<[^>]+>/g, '');
  assert.match(html, /cuarto dórico[\s\S]*suele ser menor \(Rem\)[\s\S]*lleva Fa♯/);
  assert.match(renderDetail(r.items[1], r.key), /Con Rem en su lugar/);
  setLatin(false);
});
