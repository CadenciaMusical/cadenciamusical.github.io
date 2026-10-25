// Generación del HTML de los resultados. Sin estado: recibe datos, devuelve HTML.

import { chordLabel, chordName, isLatin, keyName, noteName } from '../core/names.js';
import { parseChord } from '../core/parser.js';
import { defaultTonic, isTonicChord } from '../core/key.js';
import { convertNotation, transposeChord } from '../core/transpose.js';
import {
  FUNCTIONS, KEY_TEXT, loopText, unclearKeyText, bassLineTitle, bassLineText, pedalText, inversionText, MODE_TEXT, DEGREE_TEXT, CONFIDENCE_TEXT, TRANSPOSE_TEXT, alternativeText, kindText,
  MODE_INFO, VARIANT_INFO, MODES_TEXT, modeName, modeIntroText, parallelKeyName, modeCharText, modeForeignText, modeVsKeyText, modalKeyText, modeListenTitle,
} from './texts.js';
import { GLOSSARY, linkTerms, termText } from './glossary.js';
import { normalVersion } from '../core/build.js';
import { guitarVoicings } from '../core/fretboard.js';
import { renderPiano } from './piano.js';
import { renderGuitar } from './guitar.js';
import { modeScale } from '../core/modes.js';
import { Note } from '../../vendor/tonal.mjs';

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const fnKey = (fn) => fn ?? 'X';

// parsed: todos los trozos escritos. Si alguno no es un acorde, se explica y
// se sugiere el más parecido, en el cifrado de la página; un toque lo cambia
// (data-index: qué trozo). Sin nada parecido, se ofrece quitarlo.
export function renderErrors(parsed) {
  const bad = parsed.map((c, index) => ({ ...c, index })).filter((c) => !c.ok && !c.rest);
  if (bad.length === 0) return '';
  const notation = isLatin() ? 'latin' : 'american';
  const fix = (index, to, label) =>
    `<button type="button" class="chip suggestion" data-index="${index}" data-to="${escapeHtml(to)}">${escapeHtml(label)}</button>`;
  const items = bad.map((e) => {
    const [best] = e.suggestions;
    if (e.input === '%') return `<p class="error"><strong>«%»</strong> repite el acorde anterior, pero aquí no hay ninguno antes. ${fix(e.index, '', 'Quitarlo')}</p>`;
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
  if (result.unclear) {
    return `
      <p class="eyebrow">Tonalidad</p>
      <h2 class="key-name">No hay una tonalidad clara</h2>
      <p>${linkTerms(unclearKeyText(result.chords))}</p>`;
  }
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
  // Si ya acaba en la casa de una de las dos, terminar en ella sería repetir el último acorde.
  const last = result.chords[result.chords.length - 1];
  const endOn = (which, k) => isTonicChord(last, k)
    ? ''
    : `<button type="button" class="btn secondary small" data-action="end-on" data-which="${which}">▶ Terminar en ${noteName(k.tonic)}</button>`;
  const altButtons = alternative
    ? `
      <div class="button-row">
        ${endOn('key', key)}
        ${endOn('alt', alternative)}
      </div>
      <button type="button" class="link" data-action="use-alt">Analizar en ${keyName(alternative)}</button>`
    : '';
  const more = `
    <details class="more" data-keep="key">
      <summary>Más sobre la tonalidad</summary>
      ${key.blues ? '<p class="tag">Blues</p>' : ''}
      ${confidenceLine}
      <p>${linkTerms(KEY_TEXT)}</p>
      <p>${linkTerms(key.modal ? (VARIANT_INFO[key.modal.variant] ?? MODE_INFO[key.modal.id].text) : MODE_TEXT[key.mode])}</p>
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

  // Un modo: se explica a la vista cómo se relaciona con el mayor o el menor.
  const modal = key.modal && result.modes ? `<p>${linkTerms(modalKeyText(result.modes.main))}</p>` : '';
  return `
    <p class="eyebrow">Tonalidad</p>
    <h2 class="key-name">${keyName(key)}</h2>
    ${modal}
    ${more}`;
}

// El nombre en la tarjeta: más pequeño cuanto más largo, y si aun así no
// cabe, parte antes del paréntesis o de la barra (Sol♯ / (add13)).
function cardSymbol(label) {
  const size = label.length >= 8 ? ' long' : label.length >= 6 ? ' mid' : '';
  return `<span class="symbol${size}">${escapeHtml(label).replace(/[(/]/g, '<wbr>$&')}</span>`;
}

// marked: posiciones que forman una progresión conocida (ver progressionRanges).
// turns: dónde empieza cada vuelta de una progresión repetida (ver progressionTurns).
// rests: antes de qué acordes va un silencio (result.rests); se dibuja
// como una tarjeta que no se puede tocar.
const REST_CARD = `
        <div class="chord rest fn-X" aria-label="Silencio, sin acorde">
          <span class="symbol">N.C.</span>
          <span class="badge">Silencio</span>
        </div>`;

export function renderChords(items, { selected = null, marked = new Set(), turns = new Map(), rests = [] } = {}) {
  const restsAt = (i) => REST_CARD.repeat(rests.filter((r) => r === i).length);
  return items
    .map((item, i) => {
      const f = fnKey(item.fn);
      const special = item.kind !== 'diatonic' && item.kind !== 'blues';
      const cls = `${i === selected ? ' selected' : ''}${marked.has(i) ? ' marked' : ''}`;
      return `
        <button type="button" class="chord fn-${f}${cls}" data-index="${i}" aria-pressed="${i === selected}">
          ${turns.has(i) ? `<span class="turn">↻ ${turns.get(i)}.ª vuelta</span>` : ''}
          ${item.roman ? `<span class="roman">${item.roman}</span>` : ''}
          ${cardSymbol(chordLabel(item.chord))}
          ${special ? '<span class="star" title="Algo especial">✦</span>' : ''}
          <span class="badge">${FUNCTIONS[f].name}</span>
        </button>`;
    })
    .map((html, i) => restsAt(i) + html)
    .join('') + restsAt(items.length);
}

// --- Progresión conocida y cadencia final ---

// Como mucho dos progresiones: las más largas (findMatches ya las ordena).
// Si una sale varias veces (C F G C F G C), se muestra una sola vez.
const shownProgressions = (result) =>
  result.progressions.filter((m, i, all) => all.findIndex((o) => o.id === m.id) === i).slice(0, 2);
const finalCadence = (result) => result.cadences.find((c) => c.atEnd) ?? null;

// Las posiciones que se marcan en las tarjetas de los acordes: si la
// progresión conocida es un trozo de otra más larga, o si se repite (todas
// sus vueltas).
export function progressionRanges(result) {
  const marked = new Set();
  for (const m of shownProgressions(result)) {
    if (m.whole && m.times === 1) continue;
    for (let i = m.start; i <= m.end; i++) marked.add(i);
  }
  return marked;
}

// Primer acorde de cada vuelta, a partir de la segunda, de las progresiones
// que se repiten: Map(posición → número de vuelta).
export function progressionTurns(result) {
  const turns = new Map();
  for (const m of shownProgressions(result)) m.turns.slice(1).forEach((t, i) => turns.set(t, i + 2));
  return turns;
}

// unique: junta los repetidos seguidos («F7 → C7 → C7» → «F7 → C7»).
function chordsIn(result, m, sep, { unique = false } = {}) {
  const labels = result.chords.slice(m.start, m.end + 1).map((c) => chordLabel(c));
  return (unique ? labels.filter((l, i) => l !== labels[i - 1]) : labels).join(sep);
}

function playRange(m, label) {
  return `<button type="button" class="btn secondary small" data-action="play-range" data-start="${m.start}" data-end="${m.end}">▶ ${label}</button>`;
}

const TIMES = { 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis' };

function whereText(result, m) {
  const parts = [];
  if (m.times > 1) {
    const times = `${TIMES[m.times] ?? m.times} veces`;
    parts.push(m.whole ? `Se repite ${times}: es tu progresión entera, marcada abajo.` : `Se repite ${times}, en los acordes ${m.start + 1} a ${m.end + 1}, marcados abajo.`);
  } else if (m.whole) parts.push('Es tu progresión entera.');
  else parts.push(`Son los acordes ${m.start + 1} a ${m.end + 1} (${chordsIn(result, m, ' ')}), marcados abajo.`);
  if (m.key.mode !== result.key.mode) parts.push(`Los grados se cuentan desde ${keyName(m.key)}, su tonalidad relativa.`);
  return parts.join(' ');
}

// Tarjeta bajo la tonalidad. Si no hay nada conocido, cadena vacía: no se muestra.
export function renderProgressionCard(result) {
  const progressions = shownProgressions(result);
  const cadence = finalCadence(result);
  const { loop } = result;
  const bass = result.bassLines ?? [];
  const { pedal } = result;
  if (!progressions.length && !cadence && !loop && !bass.length && !pedal) return '';

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
  if (loop) {
    const cycle = { start: 0, end: loop.period - 1 };
    blocks.push(`
      <div class="match">
        <p class="eyebrow">Cómo acaba</p>
        <h2 class="match-name">Da vueltas</h2>
        <p>${linkTerms(loopText(result))}</p>
        ${playRange(cycle, `Escuchar una vuelta (${chordsIn(result, cycle, ' → ')})`)}
      </div>`);
  }
  bass.forEach((line, i) => {
    const where = line.start === 0 && line.end === result.chords.length - 1
      ? 'En toda la progresión.'
      : `En los acordes ${line.start + 1} a ${line.end + 1}.`;
    blocks.push(`
      <div class="match">
        <p class="eyebrow">El bajo</p>
        <h2 class="match-name">${bassLineTitle(line)}</h2>
        <p>${linkTerms(bassLineText(line))}</p>
        <p class="muted">${where}</p>
        <div class="button-row">
          <button type="button" class="btn secondary small" data-action="play-bass" data-which="${i}">▶ Solo el bajo</button>
          ${playRange(line, 'Con los acordes')}
        </div>
      </div>`);
  });
  if (pedal) {
    blocks.push(`
      <div class="match">
        <p class="eyebrow">El bajo</p>
        <h2 class="match-name">Nota pedal</h2>
        <p>${linkTerms(pedalText(pedal))}</p>
        <div class="button-row">
          <button type="button" class="btn secondary small" data-action="play-pedal">▶ Solo el bajo</button>
          ${playRange({ start: 0, end: result.chords.length - 1 }, 'Con los acordes')}
        </div>
      </div>`);
  }
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
      ${notes.length ? `<p class="hint">${notes.join(' ')}</p>` : ''}`;
  }
  return `
    <div class="diagram fn-${f}">
      <div class="segmented" role="group" aria-label="Instrumento">${tabs}</div>
      ${body}
    </div>`;
}

// Una sola fila para oír el acorde. Con la guitarra, «Acorde» suena rasgueado
// y «Nota a nota» sigue la posición dibujada; y se puede pasar a otra posición.
function listenButtons(chord, instrument, position) {
  const voicings = instrument === 'guitar' ? guitarVoicings(chord) : [];
  const next = voicings.length > 1
    ? `<button type="button" class="btn secondary" data-action="next-position" aria-label="Otra posición (${(position % voicings.length) + 1} de ${voicings.length})">↻ Posición ${(position % voicings.length) + 1}/${voicings.length}</button>`
    : '';
  return `
    <div class="button-row listen">
      <button type="button" class="btn secondary" data-action="play-selected">▶ Acorde</button>
      <button type="button" class="btn secondary" data-action="arpeggio-selected">▶ Nota a nota</button>
      ${next}
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
  // Lo más útil arriba, a la vista sin desplazarse: el nombre, el diagrama y
  // los botones para oírlo. La explicación, después.
  return `
    <div class="detail-head fn-${f}">
      <div class="detail-title">
        <h3>${chordLabel(item.chord)}</h3>
        ${item.roman ? `<span class="roman big">${item.roman}</span>` : ''}
      </div>
      <p class="muted">${chordName(item.chord)} · notas ${notes}</p>
    </div>
    ${renderDiagram(item.chord, f, instrument, position)}
    ${listenButtons(item.chord, instrument, position)}
    <p><span class="badge fn-${f}">${fn.name} · ${fn.short}</span></p>
    <p>${linkTerms(fn.text)}</p>
    ${item.inversion ? `<p>${linkTerms(inversionText(item))}</p>` : ''}
    ${extra ? `<div class="special"><p><strong>✦ Algo especial.</strong> ${linkTerms(extra)}</p>${compare}</div>` : ''}
    ${item.roman ? `<details class="explain">
      <summary>¿Qué significa «${item.roman}»?</summary>
      <p>${linkTerms(DEGREE_TEXT)}</p>
    </details>` : ''}`;
}

export function renderGlossaryList() {
  return GLOSSARY.map((e) => `<button type="button" class="chip" data-term="${e.id}">${e.term}</button>`).join('');
}

// Contenido de la ventana de un término. example: lo que devuelve entry.example().
// Los tres papeles de un acorde: cada uno nombra a los otros dos.
const ROLES = { T: 'tónica', S: 'subdominante', D: 'dominante' };

export function renderTerm(entry, example) {
  const exclude = { exclude: entry.id };
  if (!entry.fn) {
    return `
      <p>${linkTerms(termText(entry), exclude)}</p>
      <p class="muted">${example.caption}</p>`;
  }
  const fn = FUNCTIONS[entry.fn];
  const [a, b] = Object.keys(ROLES).filter((f) => f !== entry.fn).map((f) => ROLES[f]);
  return `
    <p><span class="badge fn-${entry.fn}">${fn.name} · ${fn.short}</span></p>
    <p>${linkTerms([termText(entry), fn.text, entry.after].filter(Boolean).join(' '), exclude)}</p>
    <p class="muted">${linkTerms(`Es uno de los tres papeles que puede tener un acorde, como los personajes de una historia. Los otros dos son la ${a} y la ${b}.`, exclude)}</p>
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

// La escala del modo, con marcadas las notas que cambian frente al mayor o
// el menor de siempre (dos en el frigio dominante).
function scaleNotes(m) {
  const plain = modeScale(m.id === 'lydian' || m.id === 'mixolydian' ? 'ionian' : 'aeolian', m.tonic);
  return `<p class="scale-notes">${m.scale.map((n, i) => `<span class="${Note.chroma(n) !== Note.chroma(plain[i]) ? 'char' : ''}">${noteName(n)}</span>`).join('')}</p>`;
}

// Solo cuando la progresión es claramente modal (ver isClearlyModal); si no,
// cadena vacía y la tarjeta no se muestra.
export function renderModes(result) {
  const { modes, key, modal } = result;
  if (!modal) return '';
  const m = modes.main;
  const parallel = parallelKeyName(m);
  const listen = `
    <div class="button-row">
      <button type="button" class="btn secondary small" data-action="mode-compare">▶ Oír la diferencia con ${parallel}</button>
      <button type="button" class="btn secondary small" data-action="mode-typical">▶ Ejemplo típico</button>
    </div>`;

  // Si la tonalidad ya es el modo (La dórico), la tarjeta de tonalidad lo
  // explica: aquí solo se escucha, con la escala y las notas que cambian.
  if (key.modal) {
    return `
      <p class="eyebrow">Modo</p>
      <h2 class="key-name">${modeListenTitle(m)}</h2>
      ${scaleNotes(m)}
      ${listen}
      <p class="hint">Suena primero la escala de ${parallel} y después la de ${modeName(m)}: ${m.variant === 'phrygian-dominant' ? 'las notas marcadas son las que cambian' : 'la nota marcada es la que cambia'}.</p>`;
  }

  const info = MODE_INFO[m.id];
  const char = modeCharText(m);
  const heard = m.charChords.length ? ` La oyes en ${m.charChords.map((c) => chordLabel(c)).join(', ')}.` : '';
  const foreign = modeForeignText(m);
  const songs = info.songs.length ? `<p class="muted">Lo oirás en: ${info.songs.join(' · ')}</p>` : '';

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
    ${scaleNotes(m)}
    ${char ? `<p><strong>${char}</strong>${heard}</p>` : ''}
    ${listen}
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
