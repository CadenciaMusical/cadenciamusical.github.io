# Cadencia: logo «Calderón»

Iconos de la PWA Cadencia (analizador didáctico de progresiones de acordes).
El logo es un calderón (fermata) blanco sobre un fondo coral.

## Colores

- Coral (fondo y `theme_color`): `#E2603A`
- Blanco (símbolo): `#FFFFFF`

## Archivos

| Archivo | Uso |
|---|---|
| `icon.svg` | Logo principal (esquinas redondeadas); úsalo en la cabecera de la app y como favicon SVG |
| `icon-192.png`, `icon-512.png` | Iconos `purpose: "any"` del manifest |
| `icon-maskable-192.png`, `icon-maskable-512.png` | Iconos `purpose: "maskable"` (fondo a sangre, símbolo dentro de la zona segura) |
| `icon-maskable.svg`, `icon-square.svg` | Fuentes vectoriales de las versiones cuadradas |
| `apple-touch-icon.png` | Icono de pantalla de inicio en iOS (180×180, cuadrado; iOS redondea solo) |
| `favicon.ico`, `favicon-32.png` | Favicon para navegadores |
| `glyph-mono.svg` | Solo el símbolo, en `currentColor`, para usarlo dentro de la interfaz con cualquier color |

## Instrucciones para Claude Code

Copia todos estos archivos a una carpeta `icons/` en la raíz del repositorio y:

1. En `manifest.webmanifest`:

```json
{
  "name": "Cadencia",
  "short_name": "Cadencia",
  "theme_color": "#E2603A",
  "background_color": "#E2603A",
  "display": "standalone",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

2. En el `<head>` de `index.html`:

```html
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="icon" href="icons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#E2603A">
```

3. Añade los iconos a la lista de archivos que cachea el service worker.

Usa rutas relativas (sin `/` inicial) para que funcione en GitHub Pages dentro de un subdirectorio.
