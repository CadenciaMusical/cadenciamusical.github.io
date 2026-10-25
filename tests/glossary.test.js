import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, linkTerms } from '../js/ui/glossary.js';
import { normalVersion } from '../js/core/build.js';
import { analyze } from '../js/core/analysis.js';

const TONICS = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

test('cada término tiene un ejemplo que suena en las 24 tonalidades', () => {
  for (const mode of ['major', 'minor']) {
    TONICS[mode].forEach((tonic, pc) => {
      for (const entry of GLOSSARY) {
        const ex = entry.example({ tonic, mode, pc }, (c) => c.root + c.suffix);
        assert.ok(ex.caption, `${entry.id}: falta el pie`);
        if (ex.notes) {
          assert.ok(ex.notes.every(Number.isInteger), `${entry.id} en ${tonic} ${mode}`);
        } else {
          assert.ok(ex.chords.length > 0 && ex.chords.every((c) => c.ok), `${entry.id} en ${tonic} ${mode}`);
        }
      }
    });
  }
});

test('cada palabra lleva a un solo término', () => {
  const words = GLOSSARY.flatMap((e) => e.match);
  assert.equal(new Set(words).size, words.length);
});

test('enlaza términos sin confundir palabras parecidas', () => {
  const html = linkTerms('La subdominante y la dominante secundaria. La dominante.');
  assert.match(html, /data-term="subdominante">subdominante</);
  assert.match(html, /data-term="dominante-secundaria">dominante secundaria</);
  assert.match(html, /data-term="dominante">dominante</);
});

test('cada término se enlaza solo la primera vez', () => {
  const html = linkTerms('Tónica, tónica y tónica.');
  assert.equal(html.match(/data-term/g).length, 1);
  assert.match(html, /data-term="tonica">Tónica</);
});

test('no enlaza un término dentro de su propia definición', () => {
  assert.doesNotMatch(linkTerms('Una cadencia es…', { exclude: 'cadencia' }), /data-term/);
});

test('versión «normal» de los acordes especiales', () => {
  const normal = (text, i) => {
    const r = analyze(text);
    const c = normalVersion(r.items[i], r.key);
    return c && c.root + c.suffix;
  };
  assert.equal(normal('C D7 G7 C', 1), 'Dm');
  assert.equal(normal('Dm7 Db7 Cmaj7', 1), 'G7');
  assert.equal(normal('C Ab7 G7 C', 1), 'D7');
  assert.equal(normal('C F Fm C', 2), 'F');
  assert.equal(normal('C Am F G', 0), null);
});

test('tónica, subdominante y dominante explican su papel en el glosario', async () => {
  const { renderTerm } = await import('../js/ui/render.js');
  const { FUNCTIONS } = await import('../js/ui/texts.js');
  const html = (id) => {
    const entry = GLOSSARY.find((e) => e.id === id);
    return renderTerm(entry, entry.example({ tonic: 'C', mode: 'major', pc: 0 }, (c) => c.root));
  };
  for (const [id, f, others] of [['tonica', 'T', ['subdominante', 'dominante']], ['subdominante', 'S', ['tonica', 'dominante']], ['dominante', 'D', ['tonica', 'subdominante']]]) {
    const h = html(id);
    assert.match(h, new RegExp(`class="badge fn-${f}">${FUNCTIONS[f].name} · ${FUNCTIONS[f].short}<`), id);
    assert.ok(h.replace(/<[^>]+>/g, '').includes(FUNCTIONS[f].text.replace(/<[^>]+>/g, '')), `${id}: falta su papel`);
    assert.match(h, /tres papeles/, id);
    for (const o of others) assert.match(h, new RegExp(`data-term="${o}"`), `${id} → ${o}`);
    // No se enlaza a sí mismo.
    assert.doesNotMatch(h, new RegExp(`data-term="${id}"`), id);
  }
  // Los demás términos no cambian.
  assert.doesNotMatch(html('cadencia'), /badge|tres papeles/);
});

test('versión «normal» de los disminuidos con séptima', () => {
  const normal = (text, i) => {
    const r = analyze(text, { forcedKey: { pc: 0, mode: 'major', tonic: 'C' } });
    const c = normalVersion(r.items[i], r.key);
    return c && c.root + c.suffix;
  };
  assert.equal(normal('Fa°7 Do', 0), 'G7');
  assert.equal(normal('Do Do#°7 Rem', 1), 'A7');
  assert.equal(normal('Do La°7 Do', 1), 'C');
  assert.equal(normal('Fa°7 Sol°7 Domaj7', 1), 'G');
  assert.equal(normal('Do Mib°7 Rem', 1), null);
});

test('el glosario explica los cuatro nombres de un disminuido con séptima', () => {
  assert.match(linkTerms('cada acorde tiene cuatro nombres'), /data-term="disminuido-septima"/);
  assert.match(linkTerms('otro disminuido con séptima'), /data-term="disminuido-septima"/);
});
