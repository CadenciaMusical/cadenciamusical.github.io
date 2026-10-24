// Catálogo de progresiones y cadencias conocidas. Solo datos.
//
// Cada paso es un grado en números romanos, relativo a la tónica, así que el
// patrón vale en cualquier tonalidad. Varias opciones se separan con «|».
//   - Mayúsculas: acorde mayor; minúsculas: menor; ° disminuido; ø semidisminuido.
//   - «7» exige séptima; sin ella, el patrón acepta el acorde con o sin séptima
//     (V encaja con G y con G7).
//   - En menor los grados se cuentan desde la menor natural (i – VII – VI – V).
//
// mode: 'major' | 'minor'.
// cyclic: se repite en bucle, así que vale empezando en cualquier acorde
//   (vi–IV–I–V es la del pop empezando en otro punto).
// bars: un acorde por compás; no se juntan los acordes repetidos (blues).
// endOnly: solo cuenta si la progresión acaba así (semicadencia).
// label: cómo se muestra, si no basta con unir los pasos.

export const PROGRESSIONS = [
  {
    id: 'pop',
    name: 'La del pop',
    steps: ['I', 'V', 'vi', 'IV'],
    mode: 'major',
    cyclic: true,
    text: 'La progresión más usada del pop de las últimas décadas: cientos de canciones comparten estos cuatro acordes, a menudo empezando por otro de ellos (vi–IV–I–V).',
    songs: ['Let It Be (The Beatles)', 'No Woman, No Cry (Bob Marley)', 'With or Without You (U2)'],
  },
  {
    id: 'doowop',
    name: 'Doo-wop (la de los 50)',
    steps: ['I', 'vi', 'IV', 'V'],
    mode: 'major',
    cyclic: true,
    text: 'El sonido de las baladas de los años 50: casa, un toque melancólico, salida y tensión para volver a empezar.',
    songs: ['Stand by Me (Ben E. King)', 'Every Breath You Take (The Police)'],
  },
  {
    id: 'turnaround',
    name: 'Vuelta (I–vi–ii–V)',
    steps: ['I', 'vi', 'ii', 'V'],
    mode: 'major',
    cyclic: true,
    text: 'Una vuelta que te devuelve al principio. Es pariente del doo-wop, pero con ii en lugar de IV; muy usada en el jazz.',
    songs: ['I Got Rhythm (George Gershwin)', 'Heart and Soul (Hoagy Carmichael)'],
  },
  {
    id: 'three-chords',
    name: 'Tres acordes (I–IV–V–IV)',
    steps: ['I', 'IV', 'V', 'IV'],
    mode: 'major',
    cyclic: true,
    text: 'Con solo tres acordes, la base de mucho rock and roll: casa, salida, tensión, y vuelta a empezar.',
    songs: ['La Bamba (Ritchie Valens)', 'Twist and Shout (The Beatles)', 'Louie Louie (The Kingsmen)'],
  },
  {
    id: 'ii-v-i',
    name: 'ii–V–I',
    steps: ['ii', 'V', 'I'],
    mode: 'major',
    text: 'El corazón del jazz: preparación (ii), tensión (V) y llegada (I). Cada acorde empuja al siguiente.',
    songs: ['Autumn Leaves', 'Fly Me to the Moon', 'Honeysuckle Rose'],
  },
  {
    id: 'ii-v-i-minor',
    name: 'ii–V–i en menor',
    steps: ['ii°|iiø7', 'V', 'i'],
    mode: 'minor',
    text: 'La versión en menor del ii–V–I del jazz: el mismo camino de vuelta a casa, con un color más oscuro.',
    songs: ['Autumn Leaves', 'Blue Bossa'],
  },
  {
    id: 'andalusian',
    name: 'Cadencia andaluza',
    steps: ['i', 'VII', 'VI', 'V'],
    mode: 'minor',
    text: 'Bajando escalón a escalón desde la tónica hasta la dominante: el sonido del flamenco, aunque también está en el pop y el rock.',
    songs: ['Hit the Road Jack (Ray Charles)', 'Runaway (Del Shannon)', 'Soleares y bulerías flamencas'],
  },
  {
    id: 'pachelbel',
    name: 'Canon de Pachelbel',
    steps: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    mode: 'major',
    text: 'Del Canon en Re de Johann Pachelbel (siglo XVII). El bajo va bajando paso a paso; se ha reutilizado en muchísimas canciones.',
    songs: ['Canon en Re (Pachelbel)', 'Basket Case (Green Day)', 'Go West (Pet Shop Boys)'],
  },
  {
    id: 'mixolydian',
    name: 'Rock con ♭VII (I–♭VII–IV)',
    steps: ['I', '♭VII', 'IV'],
    mode: 'major',
    text: 'El ♭VII se toma prestado de la tonalidad menor y da un aire rockero, de himno.',
    songs: ['Sweet Child O’ Mine (Guns N’ Roses)', 'Hey Jude, el final (The Beatles)'],
  },
  {
    id: 'blues',
    name: 'Blues de 12 compases',
    steps: ['I', 'I|IV', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'V|IV', 'I', 'I|V'],
    mode: 'major',
    bars: true,
    label: 'I – IV – I – V – IV – I',
    text: 'La forma del blues: 12 compases repartidos entre I, IV y V, normalmente todos con séptima. Escrito con un acorde por compás.',
    songs: ['Johnny B. Goode (Chuck Berry)', 'Hound Dog (Elvis Presley)', 'Sweet Home Chicago'],
  },
];

export const CADENCES = [
  {
    id: 'perfect',
    name: 'Cadencia perfecta',
    steps: ['V', 'I'],
    mode: 'major',
    text: 'De la dominante a la tónica (V → I). Es el final más rotundo: la tensión se resuelve del todo, como un punto final.',
  },
  {
    id: 'perfect',
    name: 'Cadencia perfecta',
    steps: ['V', 'i'],
    mode: 'minor',
    text: 'De la dominante a la tónica (V → i). Es el final más rotundo: la tensión se resuelve del todo, como un punto final.',
  },
  {
    id: 'plagal',
    name: 'Cadencia plagal',
    steps: ['IV|iv', 'I'],
    mode: 'major',
    text: 'De la subdominante a la tónica (IV → I). Un final más suave que la perfecta: es el «amén» de los himnos.',
  },
  {
    id: 'plagal',
    name: 'Cadencia plagal',
    steps: ['iv', 'i'],
    mode: 'minor',
    text: 'De la subdominante a la tónica (iv → i). Un final más suave que la perfecta: es el «amén» de los himnos.',
  },
  {
    id: 'deceptive',
    name: 'Cadencia rota',
    steps: ['V', 'vi'],
    mode: 'major',
    text: 'La dominante promete volver a casa (I), pero llega el vi. Es un final engañoso: sorprende y deja la historia abierta.',
  },
  {
    id: 'deceptive',
    name: 'Cadencia rota',
    steps: ['V', 'VI'],
    mode: 'minor',
    text: 'La dominante promete volver a casa (i), pero llega el VI. Es un final engañoso: sorprende y deja la historia abierta.',
  },
  {
    id: 'half',
    name: 'Semicadencia',
    steps: ['V'],
    mode: 'major',
    endOnly: true,
    text: 'Acabar en la dominante (V) suena a pregunta, a coma: la frase pide continuar.',
  },
  {
    id: 'half',
    name: 'Semicadencia',
    steps: ['V'],
    mode: 'minor',
    endOnly: true,
    text: 'Acabar en la dominante (V) suena a pregunta, a coma: la frase pide continuar.',
  },
];
