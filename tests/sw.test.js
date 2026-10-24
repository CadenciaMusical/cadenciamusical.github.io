import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');

const sw = read('sw.js');
const ASSETS = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

function filesIn(dir, ext) {
  return readdirSync(join(root, dir), { recursive: true })
    .filter((f) => f.endsWith(ext))
    .map((f) => `${dir}/${f}`);
}

test('el service worker guarda todo el código de la app', () => {
  const needed = [...filesIn('js', '.js'), ...filesIn('css', '.css'), ...filesIn('vendor', '.mjs'), 'index.html', 'manifest.webmanifest'];
  for (const f of needed) assert.ok(ASSETS.includes(f), `falta en sw.js: ${f}`);
});

test('y los iconos que usan la página y el manifest', () => {
  const html = read('index.html');
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const used = [
    ...[...html.matchAll(/(?:href|src)="(icons\/[^"]+)"/g)].map((m) => m[1]),
    ...manifest.icons.map((i) => i.src),
  ];
  for (const f of used) assert.ok(ASSETS.includes(f), `falta en sw.js: ${f}`);
});

test('todo lo que guarda existe y usa rutas relativas', () => {
  for (const f of ASSETS) {
    assert.ok(!f.startsWith('/'), `ruta absoluta: ${f}`);
    if (f !== './') assert.ok(existsSync(join(root, f)), `no existe: ${f}`);
  }
});

test('la página y el manifest usan rutas relativas (GitHub Pages en subdirectorio)', () => {
  const html = read('index.html');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok(!url.startsWith('/'), `ruta absoluta en index.html: ${url}`);
  const manifest = JSON.parse(read('manifest.webmanifest'));
  for (const url of [manifest.start_url, manifest.scope, manifest.id, ...manifest.icons.map((i) => i.src)]) {
    assert.ok(!url.startsWith('/'), `ruta absoluta en el manifest: ${url}`);
  }
});
