// Generación del HTML de los resultados. Sin estado: recibe datos, devuelve HTML.

import { chordLabel, chordName, keyName, latinNote } from '../core/names.js';
import {
  FUNCTIONS, KEY_TEXT, MODE_TEXT, DEGREE_TEXT, CONFIDENCE_TEXT, CADENCE_TEXT, NO_PROGRESSION_TEXT, alternativeText, kindText,
} from './texts.js';
import { GLOSSARY, linkTerms } from './glossary.js';
import { normalVersion } from '../core/build.js';
import { guitarVoicings } from '../core/fretboard.js';
import { renderPiano } from './piano.js';
import { renderGuitar } from './guitar.js';

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const fnKey = (fn) => fn ?? 'X';

export function renderErrors(errors) {
  if (errors.length === 0) return '';
  return errors
    .map((e) => {
      const tips = e.suggestions.length
        ? `¿Querías decir ${e.suggestions
            .map((s) => `<button type="button" class="chip suggestion" data-from="${escapeHtml(e.input)}" data-to="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
            .join(' ')}?`
        : 'Prueba con algo como «Am», «G7» o «Sol».';
      return `<p class="error"><strong>«${escapeHtml(e.input)}»</strong> no lo reconozco como acorde. ${tips}</p>`;
    })
    .join('');
}

const CONFIDENCE_LEVEL = { alta: 3, media: 2, baja: 1 };

export function renderKey(result) {
  const { key, confidence, alternative, alternativeIsRelative, forced } = result;
  const level = CONFIDENCE_LEVEL[confidence];
  const meter = [1, 2, 3].map((i) => `<span class="${i <= level ? 'on' : ''}"></span>`).join('');
  const confidenceLine = forced
    ? `<p class="muted">La has elegido tú. <button type="button" class="link" data-action="auto-key">Volver a la detectada</button></p>`
    : `<p class="confidence"><span class="meter meter-${confidence}" aria-hidden="true">${meter}</span> Confianza ${confidence}. ${CONFIDENCE_TEXT[confidence]}</p>`;

  let alt = '';
  if (alternative) {
    alt = `
      <div class="alternative">
        <p><strong>¿O ${keyName(alternative)}?</strong> ${linkTerms(alternativeText(key, alternative, alternativeIsRelative))}</p>
        <div class="button-row">
          <button type="button" class="btn secondary" data-action="end-on" data-which="key">▶ Terminar en ${latinNote(key.tonic)}</button>
          <button type="button" class="btn secondary" data-action="end-on" data-which="alt">▶ Terminar en ${latinNote(alternative.tonic)}</button>
        </div>
        <button type="button" class="link" data-action="use-alt">Analizar en ${keyName(alternative)}</button>
      </div>`;
  }

  return `
    <p class="eyebrow">Tonalidad</p>
    <h2 class="key-name">${keyName(key)}</h2>
    ${key.blues ? '<p class="tag">Blues</p>' : ''}
    ${confidenceLine}
    <details class="explain">
      <summary>¿Qué es la tonalidad?</summary>
      <p>${linkTerms(KEY_TEXT)}</p>
      <p>${linkTerms(MODE_TEXT[key.mode])}</p>
      <button type="button" class="btn secondary small" data-action="play-tonic">▶ Escuchar la tónica</button>
    </details>
    ${alt}`;
}

export function renderChords(items, { selected = null, latin = false } = {}) {
  return items
    .map((item, i) => {
      const f = fnKey(item.fn);
      const special = item.kind !== 'diatonic' && item.kind !== 'blues';
      return `
        <button type="button" class="chord fn-${f} ${i === selected ? 'selected' : ''}" data-index="${i}" aria-pressed="${i === selected}">
          <span class="roman">${item.roman}</span>
          <span class="symbol">${chordLabel(item.chord, latin)}</span>
          <span class="alt-symbol">${chordLabel(item.chord, !latin)}</span>
          <span class="badge">${FUNCTIONS[f].name}${special ? ' ✦' : ''}</span>
        </button>`;
    })
    .join('');
}

// instrument: 'piano' | 'guitar'. position: qué posición de guitarra mostrar.
function renderDiagram(chord, instrument, position) {
  const tabs = ['piano', 'guitar']
    .map((id) => `<button type="button" class="seg${id === instrument ? ' on' : ''}" data-action="instrument" data-instrument="${id}" aria-pressed="${id === instrument}">${id === 'piano' ? 'Piano' : 'Guitarra'}</button>`)
    .join('');
  let body;
  if (instrument === 'piano') {
    const bass = chord.bass ? ' En azul, el bajo: la nota más grave, que se toca con la mano izquierda.' : '';
    body = `${renderPiano(chord)}<p class="hint">Toca una tecla para oírla.${bass}</p>`;
  } else {
    const voicings = guitarVoicings(chord);
    const v = voicings[position % voicings.length];
    const notes = [];
    if (chord.bass) notes.push('Sin el bajo: es la forma básica del acorde.');
    else if (v.simplified) notes.push('Simplificado: sin alguna de las notas añadidas.');
    if (v.barre) notes.push(`Con cejilla en el traste ${v.barre}: un dedo pisa varias cuerdas a la vez.`);
    body = `
      ${renderGuitar(chord, v)}
      ${notes.length ? `<p class="hint">${notes.join(' ')}</p>` : ''}
      <div class="button-row">
        <button type="button" class="btn secondary small" data-action="strum">▶ Rasgueo</button>
        ${voicings.length > 1 ? `<button type="button" class="btn secondary small" data-action="next-position">Otra posición (${(position % voicings.length) + 1}/${voicings.length})</button>` : ''}
      </div>`;
  }
  return `
    <div class="diagram">
      <div class="segmented" role="group" aria-label="Instrumento">${tabs}</div>
      ${body}
    </div>`;
}

export function renderDetail(item, key, { latin = false, instrument = 'piano', position = 0 } = {}) {
  const f = fnKey(item.fn);
  const fn = FUNCTIONS[f];
  const notes = item.chord.notes.map(latinNote).join(' · ');
  const extra = kindText(item, key, { latin });
  const normal = normalVersion(item, key);
  // Para los acordes especiales: oírlo en su contexto y con el acorde «normal».
  const compare = extra
    ? `<div class="button-row">
        <button type="button" class="btn secondary small" data-action="context">▶ Así suena</button>
        ${normal ? `<button type="button" class="btn secondary small" data-action="context-normal">▶ Con ${chordLabel(normal, latin)} en su lugar</button>` : ''}
      </div>`
    : '';
  return `
    <div class="detail-head fn-${f}">
      <div>
        <h3>${chordLabel(item.chord)} <span class="muted">· ${chordLabel(item.chord, true)}</span></h3>
        <p class="muted">${chordName(item.chord)} · notas ${notes}</p>
      </div>
      <span class="roman big">${item.roman}</span>
    </div>
    <p><span class="badge fn-${f}">${fn.name} · ${fn.short}</span></p>
    <p>${linkTerms(fn.text)}</p>
    ${extra ? `<div class="special"><p><strong>✦ Algo especial.</strong> ${linkTerms(extra)}</p>${compare}</div>` : ''}
    ${renderDiagram(item.chord, instrument, position)}
    <details class="explain">
      <summary>¿Qué significa «${item.roman}»?</summary>
      <p>${linkTerms(DEGREE_TEXT)}</p>
    </details>
    <div class="button-row">
      <button type="button" class="btn secondary" data-action="play-selected">▶ Acorde</button>
      <button type="button" class="btn secondary" data-action="arpeggio-selected">▶ Nota a nota</button>
    </div>`;
}

export function renderLegend() {
  return ['T', 'S', 'D']
    .map(
      (f) => `
      <div class="legend-item fn-${f}">
        <span class="badge fn-${f}">${FUNCTIONS[f].name} · ${FUNCTIONS[f].short}</span>
        <p>${linkTerms(FUNCTIONS[f].text)}</p>
        <button type="button" class="btn secondary small" data-action="demo" data-fn="${f}">▶ Escuchar ejemplo</button>
      </div>`,
    )
    .join('');
}

// unique: junta los repetidos seguidos («F7 → C7 → C7» → «F7 → C7»).
function chordsIn(result, m, latin, sep, { unique = false } = {}) {
  const labels = result.chords.slice(m.start, m.end + 1).map((c) => chordLabel(c, latin));
  return (unique ? labels.filter((l, i) => l !== labels[i - 1]) : labels).join(sep);
}

function playButton(m, label) {
  return `<button type="button" class="btn secondary small" data-action="play-range" data-start="${m.start}" data-end="${m.end}">▶ ${label}</button>`;
}

function whereText(result, m, latin) {
  const parts = [];
  if (m.whole) parts.push('Es tu progresión entera.');
  else parts.push(`Aparece en los acordes ${m.start + 1} a ${m.end + 1}: ${chordsIn(result, m, latin, ' ')}.`);
  if (m.key.mode !== result.key.mode) parts.push(`Se ve desde ${keyName(m.key)}, su tonalidad relativa.`);
  return parts.join(' ');
}

function renderProgression(result, m, latin) {
  const songs = m.songs.length ? `<p class="muted">La oirás en: ${m.songs.join(' · ')}</p>` : '';
  return `
    <div class="match">
      <div class="match-head">
        <h3>${m.name}</h3>
        ${m.label !== m.name ? `<span class="steps">${m.label}</span>` : ''}
      </div>
      <p class="where">${whereText(result, m, latin)}</p>
      <p>${linkTerms(m.text)}</p>
      ${songs}
      ${playButton(m, 'Escuchar')}
    </div>`;
}

// Las cadencias se agrupan por tipo: «Cadencia plagal», con cada aparición.
function renderCadences(result, latin) {
  const groups = new Map();
  for (const c of result.cadences) {
    if (!groups.has(c.id)) groups.set(c.id, []);
    groups.get(c.id).push(c);
  }
  return [...groups.values()]
    .map((list) => {
      const [first] = list;
      const final = list.some((c) => c.atEnd) ? '<span class="tag">Al final</span>' : '';
      const buttons = list.map((c) => playButton(c, chordsIn(result, c, latin, ' → ', { unique: true }))).join('');
      return `
        <div class="match">
          <div class="match-head"><h3>${first.name}</h3>${final}</div>
          <p>${linkTerms(first.text)}</p>
          <div class="button-row">${buttons}</div>
        </div>`;
    })
    .join('');
}

export function renderMatches(result, { latin = false } = {}) {
  const progressions = result.progressions.length
    ? result.progressions.map((m) => renderProgression(result, m, latin)).join('')
    : `<p class="muted">${linkTerms(NO_PROGRESSION_TEXT)}</p>`;
  const cadences = result.cadences.length
    ? `
      <h3 class="subhead">Cadencias</h3>
      <details class="explain">
        <summary>¿Qué es una cadencia?</summary>
        <p>${linkTerms(CADENCE_TEXT, { exclude: 'cadencia' })}</p>
      </details>
      ${renderCadences(result, latin)}`
    : '';
  return `
    <h3 class="subhead first">Progresiones conocidas</h3>
    ${progressions}
    ${cadences}`;
}

export function renderGlossaryList() {
  return GLOSSARY.map((e) => `<button type="button" class="chip" data-term="${e.id}">${e.term}</button>`).join('');
}

// Contenido de la ventana de un término. example: lo que devuelve entry.example().
export function renderTerm(entry, example) {
  return `
    <p>${linkTerms(entry.text, { exclude: entry.id })}</p>
    <p class="muted">${example.caption}</p>`;
}
