import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const files = readdirSync(join(root, 'js'), { recursive: true })
  .filter((f) => f.endsWith('.js'))
  .map((f) => join(root, 'js', f));

// app.js usa el DOM nada más cargarse, así que no se puede importar en Node;
// pero sí se puede comprobar que todo lo que importa existe.
test('cada nombre importado existe en su módulo', async () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const [, names, from] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
      const mod = await import(pathToFileURL(join(dirname(file), from)).href);
      for (const name of names.split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        assert.ok(name in mod, `${file.replace(root, '')}: '${from}' no exporta ${name}`);
      }
    }
  }
});
