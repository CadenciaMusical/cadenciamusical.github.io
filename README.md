# Cadencia

Teoría musical para principiantes: escribe unos acordes y Cadencia te dice en qué tonalidad están, qué grado y qué función tiene cada uno, y te deja escucharlos.

PWA en HTML, CSS y JavaScript sin compilación, publicada en GitHub Pages: <https://emiliocasanovabiscarri.github.io/Cadencia/>

## Probarla en local

Los módulos de JavaScript necesitan un servidor (no basta con abrir el archivo):

```sh
python3 -m http.server 8000
```

y abre <http://localhost:8000>.

## Pruebas

```sh
npm test
```

No hay dependencias que instalar: las pruebas usan el ejecutor integrado de Node (18 o superior).

## Estructura

- `js/core/`: lógica de análisis, sin DOM (parser, tonalidad, grados y funciones, búsqueda de progresiones).
- `js/core/catalog.js`: catálogo de progresiones y cadencias. Para añadir una, basta con una entrada nueva en grados romanos; las pruebas comprueban que se reconoce en las 12 tonalidades.
- `js/ui/`: textos didácticos y generación del HTML.
- `js/audio.js`: sintetizador con la Web Audio API.
- `vendor/tonal.mjs`: [Tonal](https://github.com/tonaljs/tonal) 6.4.2 empaquetado como un solo módulo, para que funcione sin conexión.
- `icons/`: logo e iconos de la PWA.
