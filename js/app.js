// Une la interfaz con el análisis y el sonido.

import { analyze } from './core/analysis.js';
import { tokenize } from './core/parser.js';
import { chordOnDegree, tonicChord, normalVersion } from './core/build.js';
import { chordLabel, isLatin, keyName, setLatin } from './core/names.js';
import { guitarVoicings } from './core/fretboard.js';
import { defaultTonic } from './core/key.js';
import { convertNotation, transposeText } from './core/transpose.js';
import { playChords, playChord, playNotes, stop } from './audio.js';
import {
  renderErrors, renderKey, renderProgressionCard, progressionRanges, renderChords, renderDetail, renderLegend, renderGlossaryList, renderTerm, renderTranspose, renderModes,
} from './ui/render.js';
import { modeScale, typicalProgression } from './core/modes.js';
import { Interval } from '../vendor/tonal.mjs';
import { glossaryEntry, DEFAULT_KEY } from './ui/glossary.js';

const EXAMPLES = [
  { label: 'La del pop', chords: 'C G Am F' },
  { label: 'Cadencia andaluza', chords: 'Am G F E' },
  { label: 'ii–V–I', chords: 'Dm7 G7 Cmaj7' },
  { label: 'Doo-wop', chords: 'C Am F G' },
  { label: 'Blues', chords: 'C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7' },
  { label: 'Canon de Pachelbel', chords: 'D A Bm F#m G D G A' },
  // Este se deja siempre en latino: enseña que ese cifrado también vale.
  { label: 'En latino', chords: 'Lam Fa Do Sol', keepNotation: true },
];

const $ = (sel) => document.querySelector(sel);

const els = {
  form: $('#form'),
  input: $('#chords'),
  examples: $('#examples'),
  errors: $('#errors'),
  result: $('#result'),
  examplesMenu: $('#examples-menu'),
  keyCard: $('#key-card'),
  transposeCard: $('#transpose-card'),
  modesCard: $('#modes-card'),
  progressionCard: $('#progression-card'),
  grid: $('#chord-grid'),
  detail: $('#detail'),
  legend: $('#legend-items'),
  play: $('#play'),
  notation: $('#notation'),
  themeToggle: $('#theme-toggle'),
  updateToast: $('#update-toast'),
  updateBtn: $('#update-btn'),
  glossaryList: $('#glossary-list'),
  termDialog: $('#term-dialog'),
  detailSheet: $('#detail-sheet'),
  detailBody: $('#detail-body'),
  termTitle: $('#term-title'),
  termBody: $('#term-body'),
  termPlay: $('#term-play'),
};

const state = {
  result: null,
  forcedKey: null,
  selected: null,
  playing: false,
  instrument: 'piano',
  position: 0, // posición de guitarra del acorde elegido
  original: null, // { text, forcedKey, key } antes de transportar
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

// La progresión va en la dirección (#Am%20F%20C%20G) para poder compartirla.
function saveToUrl(text) {
  const hash = text ? '#' + encodeURIComponent(text) : '';
  history.replaceState(null, '', location.pathname + location.search + hash);
}

function loadFromUrl() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}

// --- Análisis ---

function run() {
  stopPlayback();
  const text = els.input.value.trim();
  state.selected = null;
  if (!text) {
    saveToUrl('');
    state.result = null;
    render();
    return;
  }
  state.result = analyze(text, { forcedKey: state.forcedKey });
  saveToUrl(text);
  render();
}

function render() {
  const r = state.result;
  els.errors.innerHTML = r ? renderErrors(r.errors) : '';
  const hasKey = Boolean(r && r.key);
  els.result.hidden = !hasKey;
  // Sin análisis, solo se ve la casilla, centrada (ver body.empty en el CSS).
  document.body.classList.toggle('empty', !hasKey);
  els.play.disabled = !hasKey;
  if (!hasKey) return;
  keepOpen(els.keyCard, renderKey(r, { transposedFrom: originalKeyName() }));
  renderGrid();
  renderSelected();
}

// Repinta una tarjeta sin cerrar los desplegables que el usuario tenía abiertos
// (al transportar o cambiar de cifrado).
function keepOpen(container, html) {
  const open = [...container.querySelectorAll('details[open][data-keep]')].map((d) => d.dataset.keep);
  container.innerHTML = html;
  for (const id of open) container.querySelector(`details[data-keep="${id}"]`)?.setAttribute('open', '');
}

// Se calcula al pintar, para que siga el cifrado elegido.
const originalKeyName = () => (state.original ? keyName(state.original.key) : null);

function renderGrid() {
  const r = state.result;
  els.grid.innerHTML = renderChords(r.items, { selected: state.selected, marked: progressionRanges(r) });
  const progression = renderProgressionCard(r);
  els.progressionCard.hidden = !progression;
  els.progressionCard.innerHTML = progression;
  keepOpen(els.transposeCard, renderTranspose(state.result, { original: state.original && { keyName: originalKeyName() } }));
  const modes = renderModes(state.result);
  els.modesCard.hidden = !modes;
  keepOpen(els.modesCard, modes);
}

// En móvil, el detalle sale en una hoja inferior; en pantallas grandes va
// debajo de los acordes y la vista baja hasta él.
const narrow = matchMedia('(max-width: 599px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Repinta el detalle donde se esté viendo (al cambiar de instrumento, etc.).
function renderSelected() {
  const item = state.result.items[state.selected];
  const html = item ? renderDetail(item, state.result.key, { instrument: state.instrument, position: state.position }) : '';
  if (els.detailSheet.open) {
    if (item) els.detailBody.innerHTML = html;
    else els.detailSheet.close();
    return;
  }
  els.detail.hidden = !item;
  els.detail.innerHTML = html;
}

// Al tocar un acorde: que se note que se ha abierto su explicación.
function showSelected() {
  if (narrow.matches) {
    els.detail.hidden = true;
    if (!els.detailSheet.open) els.detailSheet.showModal();
    renderSelected();
    els.detailSheet.scrollTop = 0;
    return;
  }
  renderSelected();
  els.detail.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
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

// Escala hacia arriba desde la tónica (entre Do4 y Si4), con la octava.
function scaleMidis(scale, pc) {
  const start = 60 + pc;
  return [...scale.map((n) => start + Interval.semitones(Interval.distance(scale[0], n))), start + 12];
}

// --- Transportar ---

function transposeTo(pc) {
  const r = state.result;
  if (!state.original) {
    state.original = { text: els.input.value, forcedKey: state.forcedKey, key: r.key, pc: r.key.pc };
  }
  // Volver a la tonalidad original recupera el texto tal cual se escribió.
  if (pc === state.original.pc) return restoreOriginal();
  const to = { pc, mode: r.key.mode, tonic: defaultTonic(pc, r.key.mode) };
  els.input.value = transposeText(els.input.value, r.key, to);
  state.forcedKey = to;
  const selected = state.selected;
  run();
  // Se mantiene el acorde elegido para ver cómo cambia.
  if (selected !== null && state.result.items[selected]) {
    state.selected = selected;
    renderGrid();
    renderSelected();
  }
}

function restoreOriginal() {
  const { text, forcedKey } = state.original;
  els.input.value = text;
  state.forcedKey = forcedKey;
  state.original = null;
  run();
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
  state.original = null;
  run();
});

els.examples.innerHTML = EXAMPLES.map(
  (ex) =>
    `<button type="button" class="chip" data-chords="${ex.chords}"${ex.keepNotation ? ' data-keep-notation' : ''}>${ex.label}</button>`,
).join('');

els.examples.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-chords]');
  if (!btn) return;
  const { chords } = btn.dataset;
  els.input.value = 'keepNotation' in btn.dataset ? chords : convertNotation(chords, notation());
  els.examplesMenu.open = false;
  state.forcedKey = null;
  state.original = null;
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
  showSelected();
});

els.play.addEventListener('click', playProgression);

// Teclas del piano: cada una suena al tocarla.
for (const box of [els.detail, els.detailBody]) {
  box.addEventListener('click', (e) => {
    const key = e.target.closest('.key');
    if (key) playNotes([Number(key.dataset.midi)], { hold: 1.2 });
  });
}

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
    case 'transpose':
      transposeTo(Number(btn.dataset.pc));
      break;
    case 'transpose-step':
      transposeTo((r.key.pc + Number(btn.dataset.delta) + 12) % 12);
      break;
    case 'transpose-reset':
      restoreOriginal();
      break;
    case 'mode-scale': {
      const m = btn.dataset.which === 'main' ? r.modes.main : r.modes.others[Number(btn.dataset.which)];
      playNotes(scaleMidis(m.scale, m.pc), { step: 0.35 });
      break;
    }
    case 'mode-compare': {
      // La escala mayor o menor de siempre, un silencio y la del modo.
      const m = r.modes.main;
      const plain = modeScale(m.id === 'lydian' || m.id === 'mixolydian' ? 'ionian' : 'aeolian', m.tonic);
      playNotes([...scaleMidis(plain, m.pc), null, null, ...scaleMidis(m.scale, m.pc)], { step: 0.32 });
      break;
    }
    case 'mode-typical':
      playList(typicalProgression(r.modes.main.id, r.modes.main.tonic));
      break;
    case 'demo':
      stopPlayback();
      playDemo(btn.dataset.fn);
      break;
  }
});

// Cifrado de toda la página: americano (C) o latino (Do). El botón muestra
// a cuál se cambia al tocarlo.
function setNotation(latin) {
  setLatin(latin);
  // Lo escrito en la casilla también cambia de cifrado (lo que no es un acorde se deja igual).
  els.input.value = convertNotation(els.input.value, notation());
  if (state.original) state.original.text = convertNotation(state.original.text, notation());
  if (state.result) saveToUrl(els.input.value);
  els.notation.textContent = latin ? 'Do → C' : 'C → Do';
  els.notation.setAttribute('aria-label', latin ? 'Cambiar a cifrado americano (C, D, E…)' : 'Cambiar a cifrado latino (Do, Re, Mi…)');
  els.input.placeholder = latin ? 'Lam Fa Do Sol' : 'Am F C G';
  save('cadencia-notation', latin ? 'latin' : 'american');
  render();
}

els.notation.addEventListener('click', () => setNotation(!isLatin()));

const notation = () => (isLatin() ? 'latin' : 'american');

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
  return entry.example(key, (c) => chordLabel(c));
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

els.termDialog.addEventListener('close', () => stop());

// Cerrar la hoja del detalle deja de elegir el acorde.
els.detailSheet.addEventListener('close', () => {
  stopPlayback();
  state.selected = null;
  if (state.result) renderGrid();
});

for (const dialog of [els.termDialog, els.detailSheet]) {
  dialog.addEventListener('click', (e) => {
    // Un toque fuera de la ventana (en el fondo) o en la X la cierra.
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  swipeToClose(dialog);
}

// Las hojas inferiores se cierran deslizándolas hacia abajo, si su contenido
// está arriba del todo (si no, el gesto solo desplaza el contenido).
function swipeToClose(dialog) {
  let startY = null;
  let dy = 0;
  dialog.addEventListener('touchstart', (e) => {
    if (!narrow.matches || dialog.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  dialog.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    dialog.classList.add('dragging');
    dialog.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const end = () => {
    if (startY === null) return;
    startY = null;
    dialog.classList.remove('dragging');
    dialog.style.transform = '';
    if (dy > 80) dialog.close();
  };
  dialog.addEventListener('touchend', end);
  dialog.addEventListener('touchcancel', end);
}

els.glossaryList.innerHTML = renderGlossaryList();

const savedTheme = load('cadencia-theme');
if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
setNotation(load('cadencia-notation') === 'latin');
if (load('cadencia-instrument') === 'guitar') state.instrument = 'guitar';
// --- Sin conexión ---

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let updating = false;
  const offer = (worker) => {
    els.updateToast.hidden = false;
    els.updateBtn.onclick = () => {
      updating = true;
      worker.postMessage('skip-waiting');
    };
  };
  // Solo se recarga cuando el usuario ha pedido actualizar (no en la primera visita).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
  });
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
        });
      });
    })
    .catch(() => {
      /* sin service worker la app funciona igual, pero no sin conexión */
    });
}

// Lo primero, para que el aviso de versión nueva funcione aunque algo falle después.
registerServiceWorker();
els.legend.innerHTML = renderLegend();
const shared = loadFromUrl();
// Un enlace compartido se abre en el cifrado de quien lo abre.
if (shared) els.input.value = convertNotation(shared, notation());
run();
