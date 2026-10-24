// Une la interfaz con el análisis y el sonido.

import { analyze } from './core/analysis.js';
import { tokenize } from './core/parser.js';
import { chordOnDegree, tonicChord, normalVersion } from './core/build.js';
import { chordLabel } from './core/names.js';
import { guitarVoicings } from './core/fretboard.js';
import { playChords, playChord, playNotes, stop } from './audio.js';
import {
  renderErrors, renderKey, renderChords, renderDetail, renderLegend, renderMatches, renderGlossaryList, renderTerm,
} from './ui/render.js';
import { glossaryEntry, DEFAULT_KEY } from './ui/glossary.js';

const EXAMPLES = [
  { label: 'La del pop', chords: 'C G Am F' },
  { label: 'Cadencia andaluza', chords: 'Am G F E' },
  { label: 'ii–V–I', chords: 'Dm7 G7 Cmaj7' },
  { label: 'Doo-wop', chords: 'C Am F G' },
  { label: 'Blues', chords: 'C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7' },
  { label: 'Canon de Pachelbel', chords: 'D A Bm F#m G D G A' },
  { label: 'En latino', chords: 'Lam Fa Do Sol' },
];

const $ = (sel) => document.querySelector(sel);

const els = {
  form: $('#form'),
  input: $('#chords'),
  examples: $('#examples'),
  errors: $('#errors'),
  result: $('#result'),
  intro: $('#intro'),
  keyCard: $('#key-card'),
  grid: $('#chord-grid'),
  detail: $('#detail'),
  matches: $('#matches'),
  legend: $('#legend-items'),
  play: $('#play'),
  notation: $('#notation'),
  themeToggle: $('#theme-toggle'),
  glossaryList: $('#glossary-list'),
  termDialog: $('#term-dialog'),
  termTitle: $('#term-title'),
  termBody: $('#term-body'),
  termPlay: $('#term-play'),
};

const state = {
  result: null,
  forcedKey: null,
  selected: null,
  playing: false,
  latin: false,
  instrument: 'piano',
  position: 0, // posición de guitarra del acorde elegido
};

// --- Preferencias (solo comodidad: si el almacenamiento falla, no pasa nada) ---

function load(name) {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

function save(name, value) {
  try {
    localStorage.setItem(name, value);
  } catch {
    /* sin almacenamiento */
  }
}

// --- Análisis ---

function run() {
  stopPlayback();
  const text = els.input.value.trim();
  state.selected = null;
  if (!text) {
    state.result = null;
    render();
    return;
  }
  state.result = analyze(text, { forcedKey: state.forcedKey });
  render();
}

function render() {
  const r = state.result;
  els.errors.innerHTML = r ? renderErrors(r.errors) : '';
  const hasKey = Boolean(r && r.key);
  els.result.hidden = !hasKey;
  els.intro.hidden = Boolean(r);
  els.play.disabled = !hasKey;
  if (!hasKey) return;
  els.keyCard.innerHTML = renderKey(r);
  renderGrid();
  renderSelected();
}

// Lo que depende del cifrado elegido (americano o latino).
function renderGrid() {
  els.grid.innerHTML = renderChords(state.result.items, { selected: state.selected, latin: state.latin });
  els.matches.innerHTML = renderMatches(state.result, { latin: state.latin });
}

function renderSelected() {
  const item = state.result.items[state.selected];
  els.detail.hidden = !item;
  els.detail.innerHTML = item
    ? renderDetail(item, state.result.key, { latin: state.latin, instrument: state.instrument, position: state.position })
    : '';
}

// --- Sonido ---

function setPlaying(on) {
  state.playing = on;
  els.play.textContent = on ? '■ Parar' : '▶ Escuchar progresión';
  els.play.setAttribute('aria-pressed', String(on));
  if (!on) highlight(null);
}

function highlight(i) {
  els.grid.querySelectorAll('.chord').forEach((el) => {
    el.classList.toggle('playing', Number(el.dataset.index) === i);
  });
}

function stopPlayback() {
  stop();
  setPlaying(false);
}

// offset: posición en la cuadrícula del primer acorde que suena.
function playList(chords, { highlightGrid = false, offset = 0 } = {}) {
  setPlaying(true);
  playChords(chords, {
    onChord: (i) => highlightGrid && highlight(offset + i),
    onEnd: () => setPlaying(false),
  });
}

function playProgression() {
  if (state.playing) return stopPlayback();
  playList(state.result.chords, { highlightGrid: true });
}

// Ejemplos sonoros de cada función en la tonalidad actual.
function playDemo(fn) {
  const key = state.result.key;
  const I = tonicChord(key);
  const IV = chordOnDegree(key, 5, key.mode === 'major' ? 'M' : 'm');
  const V = chordOnDegree(key, 7, 'M');
  const demos = { T: [IV, V, I], S: [I, IV], D: [I, V, I] };
  playList(demos[fn]);
}

// --- Eventos ---

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  state.forcedKey = null;
  run();
});

els.examples.innerHTML = EXAMPLES.map(
  (ex) => `<button type="button" class="chip" data-chords="${ex.chords}">${ex.label}</button>`,
).join('');

els.examples.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-chords]');
  if (!btn) return;
  els.input.value = btn.dataset.chords;
  state.forcedKey = null;
  run();
});

els.errors.addEventListener('click', (e) => {
  const btn = e.target.closest('.suggestion');
  if (!btn) return;
  const tokens = tokenize(els.input.value);
  const i = tokens.indexOf(btn.dataset.from);
  if (i >= 0) tokens[i] = btn.dataset.to;
  els.input.value = tokens.join(' ');
  run();
});

els.grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.chord');
  if (!btn) return;
  stopPlayback();
  state.selected = Number(btn.dataset.index);
  state.position = 0;
  playChord(state.result.items[state.selected].chord);
  renderGrid();
  renderSelected();
});

els.play.addEventListener('click', playProgression);

// Teclas del piano: cada una suena al tocarla.
els.detail.addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (key) playNotes([Number(key.dataset.midi)], { hold: 1.2 });
});

// Botones dentro de las tarjetas de resultados.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || !state.result) return;
  const r = state.result;
  switch (btn.dataset.action) {
    case 'play-tonic':
      stopPlayback();
      playChord(tonicChord(r.key));
      break;
    case 'end-on': {
      const key = btn.dataset.which === 'alt' ? r.alternative : r.key;
      playList([...r.chords, tonicChord(key)], { highlightGrid: true });
      break;
    }
    case 'play-range': {
      const start = Number(btn.dataset.start);
      const end = Number(btn.dataset.end);
      playList(r.chords.slice(start, end + 1), { highlightGrid: true, offset: start });
      break;
    }
    case 'use-alt':
      state.forcedKey = r.alternative;
      run();
      break;
    case 'auto-key':
      state.forcedKey = null;
      run();
      break;
    case 'play-selected':
      stopPlayback();
      playChord(r.items[state.selected].chord);
      break;
    case 'arpeggio-selected':
      stopPlayback();
      playChord(r.items[state.selected].chord, { arpeggio: true });
      break;
    case 'context':
    case 'context-normal': {
      // El acorde elegido con sus vecinos; con context-normal, cambiado por el «normal».
      const i = state.selected;
      const start = Math.max(0, i - 1);
      const chords = r.chords.slice(start, i + 2);
      if (btn.dataset.action === 'context-normal') chords[i - start] = normalVersion(r.items[i], r.key);
      playList(chords, { highlightGrid: true, offset: start });
      break;
    }
    case 'instrument':
      state.instrument = btn.dataset.instrument;
      save('cadencia-instrument', state.instrument);
      renderSelected();
      break;
    case 'next-position':
      state.position += 1;
      renderSelected();
      break;
    case 'strum': {
      const chord = r.items[state.selected].chord;
      const voicings = guitarVoicings(chord);
      const midis = voicings[state.position % voicings.length].midis.filter((m) => m !== null);
      playNotes(midis, { step: 0.035, hold: 2 });
      break;
    }
    case 'demo':
      stopPlayback();
      playDemo(btn.dataset.fn);
      break;
  }
});

// Cifrado principal: americano (C) o latino (Do).
function setNotation(latin) {
  state.latin = latin;
  els.notation.textContent = latin ? 'Do → C' : 'C → Do';
  els.notation.setAttribute('aria-label', latin ? 'Mostrar cifrado americano' : 'Mostrar cifrado latino');
  save('cadencia-notation', latin ? 'latin' : 'american');
  if (state.result?.key) {
    renderGrid();
    renderSelected();
  }
}

els.notation.addEventListener('click', () => setNotation(!state.latin));

// Tema: sigue al sistema hasta que el usuario elige uno.
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1C1714' : '#E2603A';
}

els.themeToggle.addEventListener('click', () => {
  const current =
    document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  save('cadencia-theme', next);
});

// --- Glosario ---

let openTerm = null;

function showTerm(id) {
  const entry = glossaryEntry(id);
  if (!entry) return;
  stopPlayback();
  openTerm = entry;
  els.termTitle.textContent = entry.term;
  els.termBody.innerHTML = renderTerm(entry, termExample(entry));
  if (!els.termDialog.open) els.termDialog.showModal();
}

// Los ejemplos suenan en la tonalidad que se está analizando, o en Do mayor.
function termExample(entry) {
  const key = state.result?.key ?? DEFAULT_KEY;
  return entry.example(key, (c) => chordLabel(c, state.latin));
}

// Cualquier término subrayado, dentro o fuera de la ventana, la abre.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-term]');
  if (btn) showTerm(btn.dataset.term);
});

els.termPlay.addEventListener('click', () => {
  const example = termExample(openTerm);
  stop();
  if (example.notes) playNotes(example.notes, { together: example.together });
  else playChords(example.chords);
});

els.termDialog.addEventListener('click', (e) => {
  // Un toque fuera de la ventana (en el fondo) o en la X la cierra.
  if (e.target === els.termDialog || e.target.closest('[data-close]')) els.termDialog.close();
});

els.termDialog.addEventListener('close', () => stop());

els.glossaryList.innerHTML = renderGlossaryList();

const savedTheme = load('cadencia-theme');
if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
setNotation(load('cadencia-notation') === 'latin');
if (load('cadencia-instrument') === 'guitar') state.instrument = 'guitar';
els.legend.innerHTML = renderLegend();
render();
