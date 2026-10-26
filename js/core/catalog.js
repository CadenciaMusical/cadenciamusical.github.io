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
// noDominant7: los pasos sin «7» no aceptan la séptima de dominante (el ♭II7
//   que va a la tónica es un sustituto tritonal, no la cadencia frigia).

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
    id: 'basic-major',
    name: 'La de toda la vida (I–IV–V–I)',
    steps: ['I', 'IV', 'V', 'I'],
    mode: 'major',
    text: 'El camino más básico de la música: sales de casa (IV), llega la tensión (V) y vuelves a casa (I). Con estos tres acordes se acompañan miles de canciones, y es lo primero que se aprende en la guitarra o el piano.',
    songs: ['Himnos, villancicos y canciones infantiles', 'El final de muchísimas obras clásicas'],
  },
  {
    id: 'basic-minor',
    name: 'La de toda la vida, en menor (i–iv–V–i)',
    steps: ['i', 'iv', 'V', 'i'],
    mode: 'minor',
    text: 'El mismo camino en menor: casa (i), salida (iv), tensión (V) y vuelta (i). Fíjate en que el V es mayor aunque la tonalidad sea menor: así empuja con más fuerza hacia casa.',
    songs: ['Canciones populares y tangos en menor', 'El final de muchas obras clásicas en menor'],
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
    id: 'ii-subv-i',
    name: 'ii–V–I con sustituto tritonal',
    steps: ['ii', '♭II7', 'I'],
    label: 'ii–subV7–I',
    mode: 'major',
    text: 'El ii–V–I del jazz con un truco: en lugar de la dominante (V7) suena su sustituto tritonal, un acorde con séptima medio tono por encima de la tónica. Tiene la misma tensión, pero el bajo baja de medio tono en medio tono hasta casa, más suave y con más color. Es un recurso muy del jazz.',
  },
  {
    id: 'backdoor',
    name: 'Dominante por la puerta de atrás',
    steps: ['iv', '♭VII7', 'I'],
    label: 'iv7–♭VII7–I',
    mode: 'major',
    text: 'En lugar de llegar a casa desde la dominante (V7), se llega desde el ♭VII7, un acorde prestado de la tonalidad menor, preparado por el iv, también prestado. Suena más suave y nostálgico; muy del jazz y del soul.',
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
    id: 'major-two',
    name: 'El II mayor del pop (I–II–IV–I)',
    steps: ['I', 'II', 'IV', 'I'],
    mode: 'major',
    text: 'El segundo acorde, que en la tonalidad sería menor, se vuelve mayor y no va a la dominante, sino a la subdominante: suena luminoso, con un punto de sorpresa. Es un clásico del pop de los 60.',
    songs: ['Eight Days a Week (The Beatles)'],
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
  // El de jazz: el IV7 en el compás 2, el VI7 que lleva al ii en el 8, el
  // ii–V en el 9 y el 10, y una vuelta al final: I–V7 en los compases 11 y
  // 12, o I–VI7–ii–V (dos acordes por compás, así que son 14).
  {
    id: 'jazz-blues',
    name: 'Blues de 12 compases (de jazz)',
    steps: ['I', 'I|IV', 'I', 'I', 'IV', 'IV', 'I', 'I|VI7', 'ii', 'V', 'I', 'I|V'],
    mode: 'major',
    bars: true,
    label: 'I – IV – I – VI7 – ii – V – I',
    text: 'La forma del blues tal como la tocan los músicos de jazz: los mismos 12 compases, pero con acordes de paso que empujan hacia el final. En lugar de V–IV, llega un ii–V (el corazón del jazz), a menudo preparado por una dominante secundaria (VI7) y con una vuelta al final para empezar otra vez.',
    songs: ['Now\'s the Time (Charlie Parker)', 'Billie\'s Bounce (Charlie Parker)', 'Blue Monk (Thelonious Monk)'],
  },
  {
    id: 'jazz-blues',
    name: 'Blues de 12 compases (de jazz)',
    steps: ['I', 'I|IV', 'I', 'I', 'IV', 'IV', 'I', 'I|VI7', 'ii', 'V', 'I', 'VI7', 'ii', 'V'],
    mode: 'major',
    bars: true,
    label: 'I – IV – I – VI7 – ii – V – I – VI7 – ii – V',
    text: 'La forma del blues tal como la tocan los músicos de jazz: los mismos 12 compases, pero con acordes de paso que empujan hacia el final. En lugar de V–IV, llega un ii–V (el corazón del jazz), a menudo preparado por una dominante secundaria (VI7) y con una vuelta al final (I–VI7–ii–V, dos acordes por compás) para empezar otra vez.',
    songs: ['Now\'s the Time (Charlie Parker)', 'Billie\'s Bounce (Charlie Parker)', 'Blue Monk (Thelonious Monk)'],
  },
  {
    id: 'creep',
    name: 'I–III–IV–iv',
    steps: ['I', 'III', 'IV', 'iv'],
    mode: 'major',
    text: 'Una progresión agridulce: el III mayor (una mediante cromática, que no es de la tonalidad) da un salto luminoso e inesperado, y el IV se oscurece en el iv, prestado de la tonalidad menor, antes de volver a casa. Mucha emoción con solo cuatro acordes.',
    songs: ['Creep (Radiohead)'],
  },
  {
    id: 'minor-blues',
    name: 'Blues menor de 12 compases',
    // En los compases 9 y 10, el V puede ser menor, o llegar desde el ♭VI (The Thrill Is Gone).
    steps: ['i', 'i|iv', 'i', 'i', 'iv', 'iv', 'i', 'i', 'V|v|VI', 'iv|V|v', 'i', 'i|V|v'],
    mode: 'minor',
    bars: true,
    label: 'i – iv – i – V – iv – i',
    text: 'La misma forma de 12 compases del blues, pero en menor: la tónica y la subdominante son acordes menores, y suena más oscuro y melancólico. Escrito con un acorde por compás, con o sin séptimas.',
    songs: ['The Thrill Is Gone (B.B. King)', 'Mr. P.C. (John Coltrane)', 'Equinox (John Coltrane)'],
  },
];

// Solo se muestran las que cierran la progresión (atEnd en matcher.js).
export const CADENCES = [
  {
    id: 'perfect',
    name: 'Cadencia perfecta',
    steps: ['V', 'I'],
    mode: 'major',
    text: 'La que suena a final rotundo: de la dominante a la tónica (V → I). La tensión se resuelve del todo, como un punto final.',
  },
  {
    id: 'perfect',
    name: 'Cadencia perfecta',
    // Con el I mayor, la tercera de picardía.
    steps: ['V', 'i|I'],
    mode: 'minor',
    text: 'La que suena a final rotundo: de la dominante a la tónica (V → i). La tensión se resuelve del todo, como un punto final.',
  },
  {
    id: 'plagal',
    name: 'Cadencia plagal',
    steps: ['IV', 'I'],
    mode: 'major',
    text: 'La del «amén» que se canta al acabar los himnos: de la subdominante a la tónica (IV → I). Es un final suave y sereno, sin la tensión de la perfecta.',
  },
  {
    id: 'minor-plagal',
    name: 'Cadencia plagal menor',
    steps: ['iv', 'I'],
    mode: 'major',
    text: 'Como la del «amén», pero el IV se vuelve menor (iv → I) justo antes de llegar a casa. Es un final tierno y algo nostálgico, muy de baladas y bandas sonoras.',
  },
  {
    id: 'plagal',
    name: 'Cadencia plagal',
    steps: ['iv', 'i'],
    mode: 'minor',
    text: 'La del «amén» que se canta al acabar los himnos: de la subdominante a la tónica (iv → i). Es un final suave y sereno, sin la tensión de la perfecta.',
  },
  {
    id: 'deceptive',
    name: 'Cadencia rota',
    steps: ['V', 'vi'],
    mode: 'major',
    text: 'La del final con sorpresa: la dominante promete volver a casa (I), pero llega el vi. Engaña al oído y deja la historia abierta.',
  },
  {
    id: 'deceptive',
    name: 'Cadencia rota',
    steps: ['V', 'VI'],
    mode: 'minor',
    text: 'La del final con sorpresa: la dominante promete volver a casa (i), pero llega el VI. Engaña al oído y deja la historia abierta.',
  },
  {
    id: 'phrygian',
    name: 'Cadencia frigia',
    steps: ['♭II', 'i|I'],
    mode: 'minor',
    noDominant7: true,
    text: 'El final flamenco: el acorde que está medio tono por encima de la tónica (el ♭II) baja hasta ella, y el bajo se desliza solo medio tono. Suena a final, como la cadencia perfecta, pero oscuro y con aire español en lugar de rotundo.',
  },
  {
    id: 'phrygian',
    name: 'Cadencia frigia',
    steps: ['♭II', 'I'],
    mode: 'major',
    noDominant7: true,
    text: 'El final flamenco: el acorde que está medio tono por encima de la tónica (el ♭II) baja hasta ella, y el bajo se desliza solo medio tono. Suena a final, como la cadencia perfecta, pero oscuro y con aire español en lugar de rotundo.',
  },
  {
    id: 'backdoor',
    name: 'Dominante por la puerta de atrás',
    steps: ['♭VII7', 'I'],
    mode: 'major',
    text: 'En lugar de llegar a casa desde la dominante (V7), se llega desde el ♭VII7, un acorde prestado de la tonalidad menor. Suena más suave y nostálgico; muy del jazz y del soul.',
  },
  {
    id: 'epic',
    name: 'Final épico',
    steps: ['♭VI', '♭VII', 'I'],
    mode: 'major',
    text: 'El final de bandas sonoras y videojuegos: dos acordes prestados de la tonalidad menor (♭VI y ♭VII) suben por tonos hasta la tónica. Suena a victoria, a héroe que llega a casa.',
  },
  {
    id: 'aeolian',
    name: 'Cadencia eólica',
    steps: ['VI', 'VII', 'i'],
    mode: 'minor',
    text: 'Muy del rock: en lugar de llegar a casa desde la dominante (V), se sube por tonos desde el VI y el VII. Es un final firme pero sin la tensión de la sensible, con un aire más épico y menos clásico.',
  },
  {
    id: 'half',
    name: 'Semicadencia',
    steps: ['V'],
    mode: 'major',
    endOnly: true,
    text: 'La que suena a pregunta: acabar en la dominante (V) es como poner una coma. La frase se queda en el aire y pide continuar.',
  },
  {
    id: 'half',
    name: 'Semicadencia',
    steps: ['V'],
    mode: 'minor',
    endOnly: true,
    text: 'La que suena a pregunta: acabar en la dominante (V) es como poner una coma. La frase se queda en el aire y pide continuar.',
  },
];

// La secuencia de quintas no tiene grados fijos: se busca por cómo se mueven
// las fundamentales (ver fifthsRuns en matcher.js). Aquí, sus datos.
export const FIFTHS = {
  id: 'fifths',
  name: 'Secuencia de quintas',
  steps: [],
  text: 'Cada acorde empuja al siguiente, como fichas de dominó: la fundamental baja una quinta cada vez (o sube una cuarta, que acaba en la misma nota) y recorre la escala hasta volver a casa.',
  songs: ['I Will Survive (Gloria Gaynor)', 'Autumn Leaves'],
};
