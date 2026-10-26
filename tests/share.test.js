import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { analyze } from '../js/core/analysis.js';
import { shareText } from '../js/ui/texts.js';
import { shownProgressions } from '../js/ui/render.js';
import { setLatin } from '../js/core/names.js';

const root = new URL('..', import.meta.url).pathname;
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'js/app.js'), 'utf8');

const textFor = (chords) => {
  const r = analyze(chords);
  return shareText(chords, r, shownProgressions(r)[0] ?? null);
};

test('el texto compartido lleva los acordes y la progresión reconocida', () => {
  setLatin(true);
  assert.equal(textFor('Lam Fa Do Sol'), 'Lam Fa Do Sol: la del pop en La menor. Analízala en Cadencia');
  assert.equal(textFor('Dm7 G7 Cmaj7'), 'Dm7 G7 Cmaj7: ii–V–I en Do mayor. Analízala en Cadencia');
  // Sin progresión conocida, la tonalidad.
  assert.equal(textFor('Do Mi Lab Do'), 'Do Mi Lab Do, en Do mayor. Analízala en Cadencia');
  // Con cambio de tonalidad, las dos.
  assert.match(textFor('Do Fa Sol Do Mib Lab Sib Mib'), /en Do mayor y luego Mi♭ mayor\. Analízala en Cadencia$/);
  // Sin tonalidad clara, solo los acordes.
  assert.equal(textFor('C+ E+'), 'C+ E+. Analízala en Cadencia');
  // Los espacios de más no se cuelan.
  assert.match(shareText('  Lam   Fa ', null, null), /^Lam Fa\. /);
});

test('botón Compartir: menú del sistema, o copiar el enlace', () => {
  assert.match(html, /<button type="button" id="share" class="btn secondary small">[\s\S]*?Compartir\s*<\/button>/);
  assert.match(html, /id="share-status"[^>]*role="status"/);
  const share = /async function share\(\)[\s\S]*?\n\}/.exec(app)[0];
  assert.match(share, /navigator\.share\(\{ title: 'Cadencia', text, url \}\)/);
  assert.match(share, /AbortError/);
  assert.match(share, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(share, /Enlace copiado/);
});

test('etiquetas Open Graph y Twitter Card, con una imagen de 1200×630', () => {
  const meta = (attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]+)">`).exec(html)?.[1];
  for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:site_name', 'og:locale']) assert.ok(meta('property', p), p);
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.ok(meta('name', n), n);
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
  // Direcciones completas, y la imagen existe con ese tamaño.
  const image = meta('property', 'og:image');
  assert.match(image, /^https:\/\/cadenciamusical\.github\.io\//);
  assert.equal(meta('name', 'twitter:image'), image);
  const file = join(root, image.replace('https://cadenciamusical.github.io/', ''));
  assert.ok(existsSync(file));
  const png = readFileSync(file);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
