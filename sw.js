// Service worker de Cadencia: guarda la app para que funcione sin conexión.
//
// - Al instalarse, descarga todos los archivos de ASSETS.
// - La página se pide primero a la red (para ver cambios) y, sin conexión,
//   se sirve la guardada.
// - El resto se sirve desde la caché y se actualiza por detrás.
// Al publicar cambios, sube VERSION: la app avisará de que hay una versión nueva.
// Las pruebas (tests/sw.test.js) comprueban que ASSETS no se deja nada.

const VERSION = 'cadencia-v3';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/audio.js',
  'js/core/analysis.js',
  'js/core/build.js',
  'js/core/catalog.js',
  'js/core/classify.js',
  'js/core/fretboard.js',
  'js/core/key.js',
  'js/core/matcher.js',
  'js/core/modes.js',
  'js/core/names.js',
  'js/core/parser.js',
  'js/core/theory.js',
  'js/core/transpose.js',
  'js/ui/glossary.js',
  'js/ui/guitar.js',
  'js/ui/piano.js',
  'js/ui/render.js',
  'js/ui/texts.js',
  'vendor/tonal.mjs',
  'icons/icon.svg',
  'icons/favicon.ico',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cadencia-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// La app pide activar la versión nueva cuando el usuario acepta el aviso.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put('index.html', copy));
          return response;
        })
        .catch(() => caches.match('index.html', { ignoreSearch: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});
