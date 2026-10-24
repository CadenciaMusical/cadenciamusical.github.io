import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord } from '../js/core/parser.js';
import { guitarVoicings, TUNING } from '../js/core/fretboard.js';
import { Note } from '../vendor/tonal.mjs';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SUFFIXES = ['', 'm', '7', 'm7', 'maj7', 'm7b5', 'dim', 'dim7', 'aug', 'sus4', 'sus2', '6', 'm6', '9', 'mMaj7', '5'];

const pcsOf = (frets) => new Set(frets.flatMap((f, i) => (f === null ? [] : [(TUNING[i] + f) % 12])));

test('cada posición contiene solo notas del acorde, incluida la raíz y la tercera', () => {
  for (const root of ROOTS) {
    for (const suffix of SUFFIXES) {
      const chord = parseChord(root + suffix);
      assert.ok(chord.ok, root + suffix);
      const voicings = guitarVoicings(chord);
      assert.ok(voicings.length > 0, `sin posición para ${root + suffix}`);
      const chordPcs = new Set(chord.notes.map((n) => Note.chroma(n)));
      for (const v of voicings) {
        const pcs = pcsOf(v.frets);
        for (const pc of pcs) assert.ok(chordPcs.has(pc), `${root + suffix} ${v.frets}: nota ajena`);
        assert.ok(pcs.has(chord.pc), `${root + suffix} ${v.frets}: falta la raíz`);
        // La tercera (o la cuarta/segunda de los sus) define el acorde.
        if (chord.notes.length >= 3) assert.ok(pcs.size >= 3, `${root + suffix} ${v.frets}: le faltan notas`);
        assert.ok(v.frets.every((f) => f === null || (f >= 0 && f <= 15)), `${root + suffix} ${v.frets}: traste imposible`);
      }
    }
  }
});

test('los acordes de siempre salen en su posición abierta', () => {
  const first = (s) => guitarVoicings(parseChord(s))[0].frets;
  assert.deepEqual(first('C'), [null, 3, 2, 0, 1, 0]);
  assert.deepEqual(first('Am'), [null, 0, 2, 2, 1, 0]);
  assert.deepEqual(first('G7'), [3, 2, 0, 0, 0, 1]);
  assert.deepEqual(first('Do'), [null, 3, 2, 0, 1, 0]);
});

test('el resto, con cejilla', () => {
  const [f] = guitarVoicings(parseChord('F'));
  assert.deepEqual(f.frets, [1, 3, 3, 2, 1, 1]);
  assert.equal(f.barre, 1);
  const [bm] = guitarVoicings(parseChord('Bm'));
  assert.deepEqual(bm.frets, [null, 2, 4, 4, 3, 2]);
});

test('las notas añadidas sin forma propia se marcan como simplificadas', () => {
  assert.equal(guitarVoicings(parseChord('Cadd9'))[0].simplified, true);
  assert.equal(guitarVoicings(parseChord('C'))[0].simplified, false);
});
