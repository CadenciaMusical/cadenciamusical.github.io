// Generación del HTML de los resultados. Sin estado: recibe datos, devuelve HTML.

import { chordLabel, chordName, keyName, latinNote } from '../core/names.js';
import { FUNCTIONS, KEY_TEXT, MODE_TEXT, DEGREE_TEXT, CONFIDENCE_TEXT, alternativeText, kindText } from './texts.js';

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
        <p><strong>¿O ${keyName(alternative)}?</strong> ${alternativeText(key, alternative, alternativeIsRelative)}</p>
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
      <p>${KEY_TEXT}</p>
      <p>${MODE_TEXT[key.mode]}</p>
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

export function renderDetail(item, key) {
  const f = fnKey(item.fn);
  const fn = FUNCTIONS[f];
  const notes = item.chord.notes.map(latinNote).join(' · ');
  const extra = kindText(item, key);
  return `
    <div class="detail-head fn-${f}">
      <div>
        <h3>${chordLabel(item.chord)} <span class="muted">· ${chordLabel(item.chord, true)}</span></h3>
        <p class="muted">${chordName(item.chord)} · notas ${notes}</p>
      </div>
      <span class="roman big">${item.roman}</span>
    </div>
    <p><span class="badge fn-${f}">${fn.name} · ${fn.short}</span></p>
    <p>${fn.text}</p>
    ${extra ? `<p class="special"><strong>✦ Algo especial.</strong> ${extra}</p>` : ''}
    <details class="explain">
      <summary>¿Qué significa «${item.roman}»?</summary>
      <p>${DEGREE_TEXT}</p>
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
        <p>${FUNCTIONS[f].text}</p>
        <button type="button" class="btn secondary small" data-action="demo" data-fn="${f}">▶ Escuchar ejemplo</button>
      </div>`,
    )
    .join('');
}
