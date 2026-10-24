// Generación del HTML de los resultados. Sin estado: recibe datos, devuelve HTML.

import { chordLabel, chordName, isLatin, keyName, noteName } from '../core/names.js';
import { parseChord } from '../core/parser.js';
import { defaultTonic } from '../core/key.js';
import { convertNotation, transposeChord } from '../core/transpose.js';
import {
  FUNCTIONS, KEY_TEXT, MODE_TEXT, DEGREE_TEXT, CONFIDENCE_TEXT, TRANSPOSE_TEXT, alternativeText, kindText,
  MODE_INFO, MODES_TEXT, modeName, modeIntroText, parallelKeyName, modeCharText, modeForeignText, modeVsKeyText,
} from './texts.js';
import { GLOSSARY, linkTerms, termText } from './glossary.js';
import { normalVersion } from '../core/build.js';
import { guitarVoicings } from '../core/fretboard.js';
import { renderPiano } from './piano.js';
import { renderGuitar } from './guitar.js';

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const fnKey = (fn) => fn ?? 'X';

// parsed: todos los trozos escritos. Si alguno no es un acorde, se explica y
// se sugiere el más parecido, en el cifrado de la página; un toque lo cambia
// (data-index: qué trozo). Sin nada parecido, se ofrece quitarlo.
export function renderErrors(parsed) {
  const bad = parsed.map((c, index) => ({ ...c, index })).filter((c) => !c.ok);
  if (bad.length === 0) return '';
  const notation = isLatin() ? 'latin' : 'american';
  const fix = (index, to, label) =>
    `<button type="button" class="chip suggestion" data-index="${index}" data-to="${escapeHtml(to)}">${escapeHtml(label)}</button>`;
  const items = bad.map((e) => {
    const [best] = e.suggestions;
    const tip = best
      ? `¿Querías decir ${fix(e.index, convertNotation(best, notation), convertNotation(best, notation))}?`
      : `No se parece a ningún acorde que conozca. ${fix(e.index, '', 'Quitarlo')} o escribe algo como ${isLatin() ? '«Lam» o «Sol7»' : '«Am» o «G7»'}.`;
    return `<p class="error"><strong>«${escapeHtml(e.input)}»</strong> no lo reconozco como acorde. ${tip}</p>`;
  });
  const what = bad.length === 1 ? 'el acorde marcado' : 'los acordes marcados';
  return `${items.join('')}<p class="hint">Corrige ${what} y analizo la progresión.</p>`;
}

const CONFIDENCE_LEVEL = { alta: 3, media: 2, baja: 1 };

// transposedFrom: el nombre de la tonalidad original si se ha transportado.
export function renderKey(result, { transposedFrom = null } = {}) {
  const { key, confidence, alternative, alternativeIsRelative, forced } = result;
  const level = CONFIDENCE_LEVEL[confidence];
  const meter = [1, 2, 3].map((i) => `<span class="${i <= level ? 'on' : ''}"></span>`).join('');
  let confidenceLine;
  if (transposedFrom) {
    confidenceLine = `<p class="muted">Transportada desde ${transposedFrom}.</p>`;
  } else if (forced) {
    confidenceLine = `<p class="muted">La has elegido tú. <button type="button" class="link" data-action="auto-key">Volver a la detectada</button></p>`;
  } else {
    confidenceLine = `<p class="confidence"><span class="meter meter-${confidence}" aria-hidden="true">${meter}</span> Confianza ${confidence}. ${CONFIDENCE_TEXT[confidence]}</p>`;
  }

  const altText = alternative && linkTerms(alternativeText(key, alternative, alternativeIsRelative, result.chords));
  const altButtons = alternative
    ? `
      <div class="button-row">
        <button type="button" class="btn secondary small" data-action="end-on" data-which="key">▶ Terminar en ${noteName(key.tonic)}</button>
        <button type="button" class="btn secondary small" data-action="end-on" data-which="alt">▶ Terminar en ${noteName(alternative.tonic)}</button>
      </div>
      <button type="button" class="link" data-action="use-alt">Analizar en ${keyName(alternative)}</button>`
    : '';
  const more = `
    <details class="more" data-keep="key">
      <summary>Más sobre la tonalidad</summary>
      ${key.blues ? '<p class="tag">Blues</p>' : ''}
      ${confidenceLine}
      <p>${linkTerms(KEY_TEXT)}</p>
      <p>${linkTerms(MODE_TEXT[key.mode])}</p>
      <button type="button" class="btn secondary small" data-action="play-tonic">▶ Escuchar la tónica</button>
      ${forced && alternative ? `<div class="alternative"><p><strong>¿O ${keyName(alternative)}?</strong> ${altText}</p>${altButtons}</div>` : ''}
    </details>`;

  // Duda razonable en la tonalidad detectada: las dos opciones, a la vista.
  if (alternative && !forced && !transposedFrom) {
    return `
      <p class="eyebrow">Tonalidad: hay dos opciones</p>
      <div class="key-options">
        <div class="key-option">
          <span class="tag">Más probable</span>
          <h2 class="key-name">${keyName(key)}</h2>
        </div>
        <div class="key-option">
          <span class="tag">También posible</span>
          <p class="key-name">${keyName(alternative)}</p>
        </div>
      </div>
      <p>${altText}</p>
      ${altButtons}
      ${more}`;
  }

  return `
    <p class="eyebrow">Tonalidad</p>
    <h2 class="key-name">${keyName(key)}</h2>
    ${more}`;
}

// marked: posiciones que forman una progresión conocida (ver progressionRanges).
export function renderChords(items, { selected = null, marked = new Set() } = {}) {
  return items
    .map((item, i) => {
      const f = fnKey(item.fn);
      const special = item.kind !== 'diatonic' && item.kind !== 'blues';
      const cls = `${i === selected ? ' selected' : ''}${marked.has(i) ? ' marked' : ''}`;
      return `
        <button type="button" class="chord fn-${f}${cls}" data-index="${i}" aria-pressed="${i === selected}">
          <span class="roman">${item.roman}</span>
          <span class="symbol">${chordLabel(item.chord)}</span>
          <span class="badge">${FUNCTIONS[f].name}${special ? ' ✦' : ''}</span>
        </button>`;
    })
    .join('');
}

// --- Progresión conocida y cadencia final ---

// Como mucho dos progresiones: las más largas (findMatches ya las ordena).
const shownProgressions = (result) => result.progressions.slice(0, 2);
const finalCadence = (result) => result.cadences.find((c) => c.atEnd) ?? null;

// Las posiciones que se marcan en las tarjetas de los acordes: solo si la
// progresión conocida es un trozo de otra más larga.
export function progressionRanges(result) {
  const marked = new Set();
  for (const m of shownProgressions(result)) {
    if (m.whole) continue;
    for (let i = m.start; i <= m.end; i++) marked.add(i);
  }
  return marked;
}

// unique: junta los repetidos seguidos («F7 → C7 → C7» → «F7 → C7»).
function chordsIn(result, m, sep, { unique = false } = {}) {
  const labels = result.chords.slice(m.start, m.end + 1).map((c) => chordLabel(c));
  return (unique ? labels.filter((l, i) => l !== labels[i - 1]) : labels).join(sep);
}

function playRange(m, label) {
  return `<button type="button" class="btn secondary small" data-action="play-range" data-start="${m.start}" data-end="${m.end}">▶ ${label}</button>`;
}

function whereText(result, m) {
  const parts = [];
  if (m.whole) parts.push('Es tu progresión entera.');
  else parts.push(`Son los acordes ${m.start + 1} a ${m.end + 1} (${chordsIn(result, m, ' ')}), marcados abajo.`);
  if (m.key.mode !== result.key.mode) parts.push(`Los grados se cuentan desde ${keyName(m.key)}, su tonalidad relativa.`);
  return parts.join(' ');
}

// Tarjeta bajo la tonalidad. Si no hay nada conocido, cadena vacía: no se muestra.
export function renderProgressionCard(result) {
  const progressions = shownProgressions(result);
  const cadence = finalCadence(result);
  if (!progressions.length && !cadence) return '';

  const blocks = progressions.map(
    (m, i) => `
      <div class="match">
        ${i === 0 ? '<p class="eyebrow">Progresión conocida</p>' : ''}
        <h2 class="match-name">${m.name}</h2>
        ${m.label !== m.name ? `<p class="steps">${m.label}</p>` : ''}
        <p>${linkTerms(m.text)}</p>
        <p class="muted">${whereText(result, m)}</p>
        ${m.songs.length ? `<p class="muted">La oirás en: ${m.songs.join(' · ')}</p>` : ''}
        ${playRange(m, 'Escuchar')}
      </div>`,
  );
  if (cadence) {
    blocks.push(`
      <div class="match">
        <p class="eyebrow">Cómo acaba</p>
        <h2 class="match-name">${cadence.name}</h2>
        <p>${linkTerms(cadence.text)}</p>
        ${playRange(cadence, `Escuchar el final (${chordsIn(result, cadence, ' → ', { unique: true })})`)}
      </div>`);
  }
  return blocks.join('');
}

// instrument: 'piano' | 'guitar'. position: qué posición de guitarra mostrar.
// f: la función del acorde, que da color a sus notas.
function renderDiagram(chord, f, instrument, position) {
  const tabs = ['piano', 'guitar']
    .map((id) => `<button type="button" class="seg${id === instrument ? ' on' : ''}" data-action="instrument" data-instrument="${id}" aria-pressed="${id === instrument}">${id === 'piano' ? 'Piano' : 'Guitarra'}</button>`)
    .join('');
  let body;
  if (instrument === 'piano') {
    const bass = chord.bass ? ' La tecla con borde de color es el bajo: la nota más grave, que se toca con la mano izquierda.' : '';
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
    <div class="diagram fn-${f}">
      <div class="segmented" role="group" aria-label="Instrumento">${tabs}</div>
      ${body}
    </div>`;
}

export function renderDetail(item, key, { instrument = 'piano', position = 0 } = {}) {
  const f = fnKey(item.fn);
  const fn = FUNCTIONS[f];
  const notes = item.chord.notes.map((n) => noteName(n)).join(' · ');
  const extra = kindText(item, key);
  const normal = normalVersion(item, key);
  // Para los acordes especiales: oírlo en su contexto y con el acorde «normal».
  const compare = extra
    ? `<div class="button-row">
        <button type="button" class="btn secondary small" data-action="context">▶ Así suena</button>
        ${normal ? `<button type="button" class="btn secondary small" data-action="context-normal">▶ Con ${chordLabel(normal)} en su lugar</button>` : ''}
      </div>`
    : '';
  return `
    <div class="detail-head fn-${f}">
      <div>
        <h3>${chordLabel(item.chord)}</h3>
        <p class="muted">${chordName(item.chord)} · notas ${notes}</p>
      </div>
      <span class="roman big">${item.roman}</span>
    </div>
    <p><span class="badge fn-${f}">${fn.name} · ${fn.short}</span></p>
    <p>${linkTerms(fn.text)}</p>
    ${extra ? `<div class="special"><p><strong>✦ Algo especial.</strong> ${linkTerms(extra)}</p>${compare}</div>` : ''}
    ${renderDiagram(item.chord, f, instrument, position)}
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

export function renderGlossaryList() {
  return GLOSSARY.map((e) => `<button type="button" class="chip" data-term="${e.id}">${e.term}</button>`).join('');
}

// Contenido de la ventana de un término. example: lo que devuelve entry.example().
export function renderTerm(entry, example) {
  return `
    <p>${linkTerms(termText(entry), { exclude: entry.id })}</p>
    <p class="muted">${example.caption}</p>`;
}

// ¿Se tocan todos los acordes sin cejilla en la guitarra?
function easyOnGuitar(chords) {
  return chords.every((c) => c && guitarVoicings(c)[0].open);
}

// original: { keyName } si la progresión está transportada.
export function renderTranspose(result, { original = null } = {}) {
  const { key, chords } = result;
  const name = (pc) => noteName(defaultTonic(pc, key.mode));
  let anyEasy = false;
  const chips = Array.from({ length: 12 }, (_, pc) => {
    const to = { pc, mode: key.mode, tonic: defaultTonic(pc, key.mode) };
    const moved = chords.map((c) => parseChord(transposeChord(c, key, to)));
    const easy = easyOnGuitar(moved.map((c) => (c.ok ? c : null)));
    anyEasy ||= easy;
    const current = pc === key.pc;
    return `<button type="button" class="chip key-chip${current ? ' on' : ''}" data-action="transpose" data-pc="${pc}" aria-pressed="${current}">${name(pc)}${easy ? ' <span aria-label="fácil en guitarra">★</span>' : ''}</button>`;
  }).join('');
  const back = original
    ? `<p class="muted">La original estaba en ${original.keyName}. <button type="button" class="link" data-action="transpose-reset">Volver a la original</button></p>`
    : '';
  // El aviso de que está transportada queda a la vista; las opciones, plegadas.
  return `
    <h2 class="card-title">Transportar</h2>
    ${back}
    <details class="more" data-keep="transpose">
      <summary>Cambiar de tonalidad</summary>
      <p class="hint">${linkTerms(TRANSPOSE_TEXT)}</p>
      <div class="stepper">
        <button type="button" class="btn secondary" data-action="transpose-step" data-delta="-1" aria-label="Bajar medio tono">− ½ tono</button>
        <span class="stepper-key">${keyName(key)}</span>
        <button type="button" class="btn secondary" data-action="transpose-step" data-delta="1" aria-label="Subir medio tono">+ ½ tono</button>
      </div>
      <div class="chips key-chips">${chips}</div>
      ${anyEasy ? '<p class="hint">★ Todos los acordes se tocan sin cejilla en la guitarra.</p>' : ''}
    </details>`;
}

// El jónico y el eólico son la escala mayor y la menor de siempre: mejor
// llamarlos así que con un nombre que asusta.
function plainModeName(m) {
  if (m.id === 'ionian') return keyName({ tonic: m.tonic, mode: 'major' });
  if (m.id === 'aeolian' && !m.variant) return keyName({ tonic: m.tonic, mode: 'minor' });
  return modeName(m);
}

// Solo cuando la progresión es claramente modal (ver isClearlyModal); si no,
// cadena vacía y la tarjeta no se muestra.
export function renderModes(result) {
  const { modes, key, modal } = result;
  if (!modal) return '';
  const m = modes.main;
  const info = MODE_INFO[m.id];
  const char = modeCharText(m);
  const heard = m.charChords.length ? ` La oyes en ${m.charChords.map((c) => chordLabel(c)).join(', ')}.` : '';
  const foreign = modeForeignText(m);
  const songs = info.songs.length ? `<p class="muted">Lo oirás en: ${info.songs.join(' · ')}</p>` : '';
  const parallel = parallelKeyName(m);

  const others = modes.others.length
    ? `
      <h3 class="subhead">También encajan</h3>
      ${modes.others
        .map((o) => {
          const why = o.sameNotes
            ? `Con las mismas notas, si la casa fuera ${noteName(o.tonic)}.`
            : `Faltan notas para descartarlo.`;
          return `
            <div class="mode-other">
              <div><strong>${linkTerms(plainModeName(o))}</strong> <span class="muted">${why}</span></div>
              <button type="button" class="btn secondary small" data-action="mode-scale" data-which="${modes.others.indexOf(o)}">▶ Escala</button>
            </div>`;
        })
        .join('')}`
    : '';

  return `
    <p class="eyebrow">Modo</p>
    <h2 class="key-name">${modeName(m)}</h2>
    <p>${linkTerms(modeIntroText(m))}</p>
    <p class="scale-notes">${m.scale.map((n) => `<span class="${n === m.charNote ? 'char' : ''}">${noteName(n)}</span>`).join('')}</p>
    ${char ? `<p><strong>${char}</strong>${heard}</p>` : ''}
    <div class="button-row">
      <button type="button" class="btn secondary small" data-action="mode-compare">▶ Oír la diferencia con ${parallel}</button>
      <button type="button" class="btn secondary small" data-action="mode-typical">▶ Ejemplo típico</button>
    </div>
    <p class="hint">Suena primero la escala de ${parallel} y después la de ${modeName(m)}: la nota marcada es la que cambia.</p>
    <details class="more" data-keep="mode">
      <summary>Más sobre el modo</summary>
      <p>${linkTerms(MODES_TEXT)}</p>
      ${foreign ? `<p class="special">${linkTerms(foreign)}</p>` : ''}
      <p class="muted">${linkTerms(modeVsKeyText(m, key))}</p>
      ${songs}
      <button type="button" class="btn secondary small" data-action="mode-scale" data-which="main">▶ Escala de ${modeName(m)}</button>
      ${others}
    </details>`;
}
