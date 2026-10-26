// Comprobaciones de la maqueta que se pueden hacer sin navegador: que el
// HTML y el CSS tienen lo que hace falta en móvil y en escritorio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const css = read('css/styles.css');
const app = read('js/app.js');

// Las reglas dentro de un @media (max-width: 599px), juntas.
const narrowCss = [...css.matchAll(/@media \(max-width: 599px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');

test('la casilla es un área de texto que crece y se analiza con Intro', () => {
  assert.match(html, /<textarea id="chords" rows="1"/);
  assert.doesNotMatch(html, /<input id="chords"/);
  assert.match(css, /#chords,\s*\.input-marks \{[^}]*white-space: pre-wrap/);
  assert.match(app, /function fitInput\(\)/);
  assert.match(app, /e\.key === 'Enter' && !e\.isComposing[\s\S]*requestSubmit\(\)/);
});

test('en móvil, el botón Analizar va debajo de la casilla, a todo el ancho', () => {
  assert.match(narrowCss, /\.input-row \{[^}]*flex-direction: column[^}]*align-items: stretch/);
});

test('hoja del acorde: la ✕ separada del borde y con 44 px de área táctil', () => {
  const close = /\.sheet-close \{([^}]*)\}/.exec(css)[1];
  assert.match(close, /top: 12px/);
  assert.match(close, /right: 12px/);
  assert.match(close, /min-width: 44px/);
  assert.match(close, /height: 44px/);
  // El grado, más pequeño en la hoja, y sitio para la ✕ junto al nombre.
  assert.match(css, /\.detail-sheet \.roman\.big \{ font-size: 1\.4rem; \}/);
  assert.match(css, /\.detail-sheet \.detail-title \{[^}]*padding-right: 56px/);
});

test('al cambiar el # con la app abierta, se vuelve a analizar', () => {
  assert.match(app, /addEventListener\('hashchange', openFromUrl\)/);
  // saveToUrl no debe lanzar hashchange (sería un bucle): usa replaceState.
  assert.match(/function saveToUrl[\s\S]*?\n\}/.exec(app)[0], /history\.replaceState/);
  // Lo que cambia la dirección no deja la tonalidad elegida ni el transporte anteriores.
  const open = /function openFromUrl[\s\S]*?\n\}/.exec(app)[0];
  assert.match(open, /state\.forcedKey = null/);
  assert.match(open, /state\.original = null/);
  assert.match(open, /run\(\)/);
});

test('en pantallas anchas, el piano y la guitarra van centrados y el piano crece', () => {
  const rule = (sel) => new RegExp(`\\n${sel.replace('.', '\\.')} \\{([^}]*)\\}`).exec(css)[1];
  const piano = rule('.piano');
  assert.match(piano, /width: 100%/);
  assert.match(piano, /max-width: 600px/);
  assert.match(piano, /margin: 0 auto/);
  // Con height: auto, el viewBox mantiene las proporciones de las teclas.
  assert.match(piano, /height: auto/);
  assert.match(rule('.guitar'), /margin: 0 auto/);
  const wide = [...css.matchAll(/@media \(min-width: 600px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  assert.match(wide, /\.diagram \{ text-align: center; \}/);
  assert.match(wide, /\.diagram \.button-row,\s*\.button-row\.listen \{ justify-content: center; \}/);
});

test('pie con la autoría, y el año se pone solo', () => {
  assert.match(html, /<footer class="site-footer">\s*<p>© <span id="year">\d{4}<\/span> Emilio Casanova Biscarri · <a href="mailto:ecasanovabisc@gmail\.com">ecasanovabisc@gmail\.com<\/a><\/p>/);
  assert.match(app, /\$\('#year'\)\.textContent = new Date\(\)\.getFullYear\(\)/);
});

test('la página nace vacía: sin parpadeo del glosario ni de «Escuchar progresión»', () => {
  assert.match(html, /<body class="empty">/);
  assert.match(css, /body\.empty \.glossary,\s*body\.empty \.playbar \{ display: none; \}/);
  // El JavaScript la quita al haber un análisis.
  assert.match(app, /document\.body\.classList\.toggle\('empty', !hasKey\)/);
});

test('el cifrado, el ejemplo de la casilla y el tema guardados se aplican antes de pintar', () => {
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1];
  // Un script normal (no un módulo, que espera a que acabe de leerse la página).
  const early = /<script>([\s\S]*?)<\/script>/.exec(head)[1];
  assert.match(early, /localStorage\.getItem\('cadencia-notation'\)/);
  assert.match(early, /html\.dataset\.notation =/);
  assert.match(early, /localStorage\.getItem\('cadencia-theme'\)/);
  // El ejemplo de la casilla no lleva texto fijo: lo pone un script justo después.
  assert.match(html, /<textarea id="chords"[^>]*placeholder=""[^>]*><\/textarea>\s*<script>[\s\S]*?'Am F C G' : 'Lam Fa Do Sol'/);
  // El selector se marca con el data-notation, y app.js lo mantiene al día.
  assert.match(css, /html\[data-notation="latin"\] \.seg\[data-notation="latin"\]/);
  assert.match(css, /html\[data-notation="american"\] \.seg\[data-notation="american"\]/);
  assert.match(app, /document\.documentElement\.dataset\.notation = notation\(\)/);
});

test('la fila de nombres del piano solo se ve en pantallas estrechas', () => {
  assert.match(css, /\.piano-names \{ display: none; \}/);
  assert.match(narrowCss, /\.piano \.key-label \{ display: none; \}/);
  assert.match(narrowCss, /\.piano-names \{[^}]*display: block/);
});

test('con la guitarra, «Acorde» suena rasgueado y «Nota a nota» sigue la posición', () => {
  assert.match(app, /case 'play-selected':[\s\S]*?state\.instrument === 'guitar'\) playNotes\(guitarMidis\(\), \{ step: 0\.035/);
  assert.match(app, /case 'arpeggio-selected':[\s\S]*?state\.instrument === 'guitar'\) playNotes\(guitarMidis\(\)/);
  assert.doesNotMatch(app, /case 'strum'/);
  // En móvil, una sola fila.
  assert.match(narrowCss, /\.button-row\.listen \{ flex-wrap: nowrap; \}/);
});

test('la casilla crece hasta 4 líneas y después se desplaza, con el subrayado a la par', () => {
  assert.match(css, /#chords \{[^}]*max-height: calc\(4 \* 1\.4em \+ 28px\)/);
  assert.match(css, /#chords,\s*\.input-marks \{[^}]*scrollbar-gutter: stable/);
  const fit = /function fitInput[\s\S]*?\n\}/.exec(app)[0];
  assert.match(fit, /overflowY = els\.input\.scrollHeight > els\.input\.clientHeight \? 'auto' : 'hidden'/);
  assert.match(app, /addEventListener\('scroll', \(\) => \{\s*els\.marks\.scrollTop = els\.input\.scrollTop;/);
});

test('el logo va dentro de la página, igual que icons/icon.svg, para que no parpadee', () => {
  const header = /<header class="topbar">([\s\S]*?)<\/header>/.exec(html)[1];
  assert.doesNotMatch(header, /<img/);
  const inline = /<svg class="logo"[^>]*>([\s\S]*?)<\/svg>/.exec(header)[1];
  const file = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(readFileSync(join(root, 'icons/icon.svg'), 'utf8'))[1];
  assert.equal(inline, file);
});

test('las etiquetas de función nunca parten palabras: «Subdom.» si no cabe', async () => {
  const { renderChords } = await import('../js/ui/render.js');
  const { analyze } = await import('../js/core/analysis.js');
  const badge = /\.chord \.badge \{([^}]*)\}/.exec(css)[1];
  assert.doesNotMatch(badge, /hyphens: auto/);
  assert.match(badge, /hyphens: manual/);
  // La abreviatura depende del ancho de la tarjeta, no del de la pantalla.
  assert.match(css, /\.chord \{ container: chord \/ inline-size; \}/);
  assert.match(css, /@container chord \(max-width: 112px\) \{[\s\S]*?\.chord \.badge-short \{ display: inline; \}/);
  // En pantallas anchas, tarjetas con sitio para la palabra entera.
  assert.match(css, /@media \(min-width: 600px\) \{\s*\.chord-grid \{ grid-template-columns: repeat\(auto-fill, minmax\(124px, 1fr\)\); \}/);
  // El lector de pantalla lee «Subdominante»; la abreviatura queda oculta para él.
  const html = renderChords(analyze('C F G C').items);
  assert.match(html, /<span class="badge-full">Subdominante<\/span><span class="badge-short" aria-hidden="true">Subdom\.<\/span>/);
  assert.match(html, /<span class="badge">Tónica<\/span>/);
});
