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
  assert.match(app, /e\.key === 'Enter' && !e\.shiftKey[\s\S]*requestSubmit\(\)/);
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
