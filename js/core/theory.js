// Datos básicos de teoría compartidos por el resto del núcleo.
// Todo se expresa en semitonos respecto a la tónica (0–11).

// Funciones tonales: T = tónica, S = subdominante, D = dominante.
// Esquema clásico: I, III, VI tónica; II, IV subdominante; V, VII dominante.

// sev: séptimas que pertenecen a la tonalidad sobre ese grado.
export const DEGREES = {
  major: [
    { st: 0, triad: 'M', sev: ['maj7'], fn: 'T' },
    { st: 2, triad: 'm', sev: ['m7'], fn: 'S' },
    { st: 4, triad: 'm', sev: ['m7'], fn: 'T' },
    { st: 5, triad: 'M', sev: ['maj7'], fn: 'S' },
    { st: 7, triad: 'M', sev: ['7'], fn: 'D' },
    { st: 9, triad: 'm', sev: ['m7'], fn: 'T' },
    { st: 11, triad: 'dim', sev: ['m7b5'], fn: 'D' },
  ],
  // Menor natural más el V y el vii° de la menor armónica.
  minor: [
    { st: 0, triad: 'm', sev: ['m7', 'mMaj7'], fn: 'T' },
    { st: 2, triad: 'dim', sev: ['m7b5'], fn: 'S' },
    { st: 3, triad: 'M', sev: ['maj7'], fn: 'T' },
    { st: 5, triad: 'm', sev: ['m7'], fn: 'S' },
    { st: 7, triad: 'M', sev: ['7'], fn: 'D' },
    { st: 7, triad: 'm', sev: ['m7'], fn: 'D' },
    { st: 8, triad: 'M', sev: ['maj7'], fn: 'T' },
    { st: 10, triad: 'M', sev: ['7'], fn: 'D' },
    { st: 11, triad: 'dim', sev: ['dim7', 'm7b5'], fn: 'D' },
  ],
};

export const PARALLEL = { major: 'minor', minor: 'major' };

// Grado (con alteración) de cada distancia en semitonos. En menor se cuenta
// desde la escala menor natural: i – VII – VI – V, no i – ♭VII – ♭VI – V.
const STEP_NAMES = {
  major: ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'],
  minor: ['I', '♭II', 'II', 'III', '♯III', 'IV', '♯IV', 'V', 'VI', '♯VI', 'VII', '♯VII'],
};

export function stepName(st, mode) {
  return STEP_NAMES[mode][((st % 12) + 12) % 12];
}

// Número romano completo: mayúsculas para mayor, minúsculas para menor y
// disminuido, ° disminuido, ø semidisminuido, + aumentado, 7 si lleva séptima.
export function romanFor(st, triad, seventh, mode) {
  let base = stepName(st, mode);
  // El vii° de la menor armónica se escribe sin alteración.
  if (mode === 'minor' && st === 11 && triad === 'dim') base = 'VII';
  const lower = triad === 'm' || triad === 'dim';
  const numeral = lower ? base.toLowerCase() : base;
  if (seventh === 'm7b5') return numeral + 'ø7';
  if (seventh === 'dim7') return numeral + '°7';
  let out = numeral;
  if (triad === 'dim') out += '°';
  if (triad === 'aug') out += '+';
  if (seventh === 'maj7') out += 'maj7';
  else if (seventh === 'mMaj7') out += '(maj7)';
  else if (seventh) out += '7';
  if (triad === 'sus') out += 'sus';
  return out;
}

// Distancia con signo si dos notas van por grado conjunto (±1 o ±2 semitonos); si no, 0.
export function stepBetween(from, to) {
  const d = (((to - from) % 12) + 12) % 12;
  if (d === 1 || d === 2) return d;
  if (d === 10 || d === 11) return d - 12;
  return 0;
}
