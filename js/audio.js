// Sonido con la Web Audio API: un sintetizador suave tipo piano eléctrico.

import { Note } from '../vendor/tonal.mjs';

let ctx = null;
let master = null;
let bus = null; // cada reproducción va a su propio bus para poder pararla

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
  }
  // Los navegadores móviles solo dejan sonar tras un toque del usuario.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function newBus() {
  if (bus) {
    const old = bus;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => old.disconnect(), 300);
  }
  bus = ctx.createGain();
  bus.connect(master);
  return bus;
}

function midiToFreq(m) {
  return 440 * 2 ** ((m - 69) / 12);
}

function playNote(dest, midi, time, dur, level) {
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, time);
  filter.frequency.exponentialRampToValueAtTime(900, time + dur);

  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + 0.015);
  env.gain.exponentialRampToValueAtTime(level * 0.45, time + 0.4);
  env.gain.setValueAtTime(level * 0.45, time + dur);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.5);

  const freq = midiToFreq(midi);
  for (const [type, detune, gain] of [['triangle', 0, 1], ['sine', 5, 0.6]]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.value = gain;
    osc.connect(g).connect(filter);
    osc.start(time);
    osc.stop(time + dur + 0.6);
  }
  filter.connect(env).connect(dest);
}

// --- Disposición de las voces ---

// Bajo entre Mi1 y Re#2 (MIDI 40–51) y acorde por encima, eligiendo la
// inversión más cercana a la anterior para que los cambios suenen suaves.
function voice(chord, previous) {
  const bassNote = chord.bass ?? chord.root;
  let bass = Note.chroma(bassNote) + 36;
  if (bass < 40) bass += 12;

  const pcs = chord.notes.map((n) => Note.chroma(n));
  const options = [];
  for (let r = 0; r < pcs.length; r++) {
    const rotated = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (const start of [52, 55, 58]) {
      let last = start - 1;
      const notes = rotated.map((pc) => {
        let m = last + 1 + ((pc - (last + 1)) % 12 + 12) % 12;
        last = m;
        return m;
      });
      options.push(notes);
    }
  }
  const center = (notes) => notes.reduce((a, b) => a + b, 0) / notes.length;
  const cost = (notes) => {
    if (!previous) return Math.abs(center(notes) - 63);
    return Math.abs(center(notes) - center(previous.upper)) + Math.abs(notes[0] - previous.upper[0]) * 0.5;
  };
  // Evita que las voces suban demasiado (más allá de Sol5).
  const valid = options.filter((n) => n[n.length - 1] <= 79);
  const upper = (valid.length ? valid : options).sort((a, b) => cost(a) - cost(b))[0];
  return { bass, upper };
}

export function voiceProgression(chords) {
  const out = [];
  for (const c of chords) out.push(voice(c, out[out.length - 1]));
  return out;
}

function scheduleChord(dest, voicing, time, dur, { arpeggio = false } = {}) {
  const level = 0.5 / Math.sqrt(voicing.upper.length + 1);
  playNote(dest, voicing.bass, time, dur, level * 1.2);
  voicing.upper.forEach((m, i) => {
    // Un rasgueo muy leve (o un arpegio lento) da vida al acorde.
    const offset = arpeggio ? i * 0.35 : i * 0.018;
    playNote(dest, m, time + offset + (arpeggio ? 0.35 : 0), dur, level);
  });
}

let timers = [];

export function stop() {
  timers.forEach(clearTimeout);
  timers = [];
  if (ctx && bus) newBus();
}

// Reproduce una lista de acordes. onChord(i) se llama cuando empieza cada uno;
// onEnd() al terminar. Devuelve la duración total en segundos.
export function playChords(chords, { secondsPerChord = 1.3, onChord, onEnd } = {}) {
  ensureContext();
  stop();
  const dest = newBus();
  const voicings = voiceProgression(chords);
  const start = ctx.currentTime + 0.08;
  voicings.forEach((v, i) => {
    const t = start + i * secondsPerChord;
    const last = i === voicings.length - 1;
    scheduleChord(dest, v, t, last ? secondsPerChord * 1.6 : secondsPerChord * 0.95);
    if (onChord) timers.push(setTimeout(() => onChord(i), (t - ctx.currentTime) * 1000));
  });
  const total = voicings.length * secondsPerChord + 0.6 * secondsPerChord;
  if (onEnd) timers.push(setTimeout(onEnd, (start - ctx.currentTime + total) * 1000));
  return total;
}

// Un acorde suelto; con arpeggio, nota a nota dejando que sigan sonando.
export function playChord(chord, { arpeggio = false } = {}) {
  ensureContext();
  stop();
  const dest = newBus();
  const [v] = voiceProgression([chord]);
  const t = ctx.currentTime + 0.05;
  if (arpeggio) {
    scheduleChord(dest, v, t, 0.5 * v.upper.length + 1.4, { arpeggio: true });
  } else {
    scheduleChord(dest, v, t, 1.4);
  }
}

// Notas sueltas (en MIDI), una tras otra; con together, al final suenan juntas.
// Con un step corto y hold largo suena como un rasgueo de guitarra.
export function playNotes(midis, { together = false, step = 0.6, hold = step * 0.9, onEnd } = {}) {
  ensureContext();
  stop();
  const dest = newBus();
  const t = ctx.currentTime + 0.05;
  const level = 0.3 / Math.sqrt(Math.max(1, midis.length * (hold / step) / 4));
  midis.forEach((m, i) => playNote(dest, m, t + i * step, hold, level));
  let total = midis.length * step;
  if (together) {
    midis.forEach((m) => playNote(dest, m, t + total, 1.4, 0.22));
    total += 1.4;
  }
  if (onEnd) timers.push(setTimeout(onEnd, (total + 0.5) * 1000));
}
