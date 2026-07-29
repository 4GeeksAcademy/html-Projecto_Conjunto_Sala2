# Documentación de `component.js` — SPA Router

> **Archivo**: `component.js`  
> **Propósito**: Gestionar la navegación dinámica entre páginas sin recargar el navegador, convirtiendo el sitio en una **Single Page Application (SPA)**.

---

## Estructura general del archivo

| Sección | Líneas | Descripción |
|---------|--------|-------------|
| Estado global | 6–10 | Objeto `STATE` que almacena la página actual |
| Utilidades | 13–67 | Funciones auxiliares (`loadHTML`, `extractPageContent`, `extractInlineScripts`, `extractTitle`) |
| Navegación | 70–157 | Función principal `loadPage` y helpers (`cleanupPage`, `updateActiveNav`) |
| Event Listeners | 160–224 | Captura de clics y navegación del historial |
| Inicialización | 227–270 | Función `init()` que arranca la aplicación |
| Arranque | 273–275 | Ejecuta `init()` cuando el DOM está listo |

---

## 1. Estado global — Líneas 6–10

```js
const STATE = {
  currentPage: 'home',
  currentSection: null,
  currentProductoHash: null,
};
```

**`const STATE`** sirve para almacenar el estado actual de la navegación en un solo lugar accesible globalmente. Luego se usará en la función `loadPage()` (línea 139), donde se actualizan sus propiedades cada vez que se carga una página nueva:

```js
STATE.currentPage = page;
STATE.currentSection = section;
STATE.currentProductoHash = productoHash;
```

| Propiedad | Valor inicial | ¿Qué guarda? |
|-----------|---------------|--------------|
| `currentPage` | `'home'` | Nombre de la página actual (`home`, `catalogo`, `producto`, etc.) |
| `currentSection` | `null` | Identificador de sección dentro de la página (ej: `hombre-calzado`) |
| `currentProductoHash` | `null` | Hash del producto en la página de detalle (ej: `producto-101`) |

---

## 2. Utilidades — Líneas 13–67

### `async function loadHTML(url)` — Líneas 13–16

Sirve para hacer una petición HTTP (`fetch`) a un archivo HTML y devolver su contenido como texto. Luego se usará en `loadPage()` (línea 79) y en `init()` (línea 233) para obtener el HTML de los fragmentos y páginas.

### `function extractPageContent(html)` — Líneas 22–48

Sirve para extraer únicamente el contenido relevante de una página HTML completa, eliminando el envoltorio (`<html>`, `<head>`, `<body>`, etc.). Luego se usará en `loadPage()` para inyectar solo el contenido necesario en `#main-content`.

**Lógica**:
1. Busca un elemento con `id="main-content"` — si existe, lo toma junto con sus hermanos hasta el `<footer>` (necesario para `catalogo.html` que tiene `brand-philosophy` después de `</main>`).
2. Si no existe, extrae todo el `<body>` y elimina `<header>`, `<footer>` y `<script>` (fallback para `producto.html`).

### `function extractInlineScripts(html)` — Líneas 54–63

Sirve para extraer todos los scripts inline (`<script>...</script>`) de un HTML mediante una expresión regular. Luego se usará en `loadPage()` (línea 84) para ejecutar los scripts de filtros de catálogo y renderizado de producto.

### `function extractTitle(html)` — Líneas 68–71

Sirve para extraer el contenido de la etiqueta `<title>` de un HTML. Luego se usará en `loadPage()` (línea 117) para actualizar el título de la pestaña del navegador.

---

## 3. Navegación — Líneas 74–157

### `async function loadPage(page, section, productoHash, skipPushState)` — Líneas 74–148

Es el **corazón del router**. Sirve para cargar una página completa dentro del contenedor `#main-content` sin recargar el navegador. Luego se usará desde los Event Listeners y desde `init()`.

**Parámetros**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | `string` | Nombre de la página (`home`, `catalogo`, `producto`, `legal`) |
| `section` | `string\|null` | Sección interna a la que desplazar (ej: `hombre-calzado`) |
| `productoHash` | `string\|null` | Hash del producto (ej: `producto-101`) |
| `skipPushState` | `boolean` | Si es `true`, usa `replaceState` en vez de `pushState` (carga inicial) |

**Flujo interno**:
1. **Limpia** scripts anteriores (`cleanupPage()`)
2. **Determina el archivo**: `producto.html` si `page === 'producto'`, sino `{page}.html`
3. **Fetch + extracción**: Obtiene el HTML, extrae contenido y scripts inline
4. **Inyecta contenido** en `#main-content`
5. **Ejecuta scripts**: si hay scripts inline, los agrupa en un `<script>` con `id="spa-page-script"`. Para `producto.html`, establece `window.location.hash` antes de ejecutar
6. **Actualiza nav**: marca el enlace activo en el navbar
7. **Actualiza URL**: `pushState` (navegación) o `replaceState` (carga inicial)
8. **Actualiza título** de la pestaña
9. **Desplaza** a la sección si se especificó (con `setTimeout` de 150ms)
10. **Guarda estado** en `STATE`
11. **Dispare evento** `page-loaded` para que otros componentes reaccionen

### `function cleanupPage()` — Líneas 150–154

Sirve para eliminar el script de la página anterior (`#spa-page-script`) y resetear la bandera `__spaProductoActive`. Luego se usará al inicio de cada `loadPage()`.

### `function updateActiveNav(page)` — Líneas 156–162

Sirve para actualizar visualmente qué enlace del navbar está activo, añadiendo las clases `text-rouge font-medium` al elemento `[data-page]` correspondiente. Luego se usará en `loadPage()` después de inyectar contenido.

---

## 4. Event Listeners — Líneas 165–224

### 1. Clic en `[data-page]` — Líneas 167–176

Sirve para capturar clics en enlaces del navbar, footer y cualquier elemento con `data-page`. Luego se usará para navegar sin recargar, llamando a `loadPage()` con los datos del atributo.

### 2. Clic en `a[href*="producto.html#"]` — Líneas 179–187

Sirve para capturar enlaces del tipo `producto.html#producto-XXX` (presentes en home y catálogo). Luego se usará para extraer el hash del producto y navegar a la página de detalle.

### 3. Clic en `a[href*=".html"]` — Líneas 190–210

Sirve como captura general de cualquier enlace a archivos `.html`. Ignora los que ya fueron capturados por los listeners anteriores. Luego se usará para interceptar enlaces internos y convertirlos en navegación SPA, evitando recargas.

### 4. Evento `popstate` — Líneas 213–218

Sirve para detectar cuando el usuario presiona los botones **atrás/adelante** del navegador. Luego se usará para restaurar el estado de la página correspondiente desde el historial, o cargar `home` si no hay estado guardado.

---

## 5. Inicialización — Líneas 227–270

### `async function init()` — Líneas 227–268

Sirve para **arrancar la aplicación SPA**. Luego se usará automáticamente al cargar la página (líneas 273–275).

**Flujo**:
1. **Carga header y footer** en paralelo con `Promise.all` y los inyecta en `#navbar` y `#footer`
2. **Lee la ruta actual** del navegador (`window.location.pathname`) para determinar qué página cargar:
   - `/` → carga `home`
   - `/catalogo` → carga catálogo
   - `/producto/producto-101` → carga producto con hash
   - `/legal` → carga legal
3. Usa `skipPushState = true` para no duplicar entradas en el historial
4. Si todo falla, muestra un mensaje de error de conexión

---

## 6. Arranque — Líneas 273–275

```js
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

Sirve para ejecutar `init()` en el momento adecuado. Si el DOM aún se está cargando, espera al evento `DOMContentLoaded`; si ya está listo, ejecuta `init()` inmediatamente. Luego se usará para que la aplicación comience a funcionar tan pronto como sea posible.

---

## Diagrama de flujo

```
[Carga de la página]
        │
        ▼
    init()
        │
        ├── Carga header.html ──→ #navbar
        ├── Carga footer.html ──→ #footer
        └── Lee la URL actual
                │
                ▼
          loadPage(page, section, hash, skipPushState=true)
                │
                ├── Carga {page}.html
                ├── Extrae contenido
                ├── Inyecta en #main-content
                ├── Ejecuta scripts inline
                ├── pushState/replaceState
                └── Actualiza navbar y título
                        │
                        ▼
            [Usuario navega]
                │
                ├── Clic en navbar ──→ loadPage()
                ├── Clic en producto ──→ loadPage('producto', null, hash)
                ├── Clic en .html ──→ loadPage()
                └── Botón atrás ──→ popstate → loadPage()
```

---

## Resumen de funciones

| Función | Líneas | ¿Qué hace? | ¿Dónde se usa? |
|---------|--------|------------|----------------|
| `STATE` | 6–10 | Almacena página/sección/hash actual | `loadPage()` |
| `loadHTML()` | 13–16 | Fetch de un archivo HTML | `loadPage()`, `init()` |
| `extractPageContent()` | 22–48 | Extrae solo el contenido útil de una página | `loadPage()` |
| `extractInlineScripts()` | 54–63 | Extrae scripts inline de un HTML | `loadPage()` |
| `extractTitle()` | 68–71 | Extrae el `<title>` de un HTML | `loadPage()` |
| `loadPage()` | 74–148 | Carga una página en el SPA (función principal) | Event Listeners, `init()` |
| `cleanupPage()` | 150–154 | Elimina scripts de la página anterior | `loadPage()` |
| `updateActiveNav()` | 156–162 | Marca el enlace activo en el navbar | `loadPage()` |
| Event Listeners | 165–224 | Capturan clics y navegación del historial | — |
| `init()` | 227–268 | Inicializa la aplicación SPA | Arranque (líneas 273–275) |