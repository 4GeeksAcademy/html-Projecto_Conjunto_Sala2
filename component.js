/* ========================================================
   SPA Router — component.js
   Gestiona la navegación dinámica entre páginas sin recargar.
   ======================================================== */

const STATE = {
  currentPage: 'home',
  currentSection: null,
  currentProductoHash: null,
};

/* ─── Utilidades ─── */

async function loadHTML(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Error al cargar ${url}`);
  return await respuesta.text();
}

/**
 * Extrae el contenido de una página HTML.
 * - Si existe #main-content, usa su contenido.
 * - Si no, extrae todo entre <body> y <footer> (sin header/footer).
 */
function extractPageContent(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Intentar con #main-content (home.html, catalogo.html)
  const mainContent = doc.getElementById('main-content');
  if (mainContent) {
    // También recoger contenido después de </main> pero antes de <footer>
    // (catalogo.html tiene brand-philosophy después de </main>)
    let content = mainContent.outerHTML;
    let node = mainContent.nextElementSibling;
    while (node && node.tagName !== 'FOOTER') {
      content += node.outerHTML;
      node = node.nextElementSibling;
    }
    return content;
  }

  // 2. Fallback: extraer <body> y eliminar header/footer (producto.html)
  const body = doc.body.cloneNode(true);
  body.querySelectorAll('header, footer, script').forEach(el => el.remove());
  const skipLink = body.querySelector('.sr-only');
  if (skipLink) skipLink.remove();
  return body.innerHTML;
}

/**
 * Extrae los scripts inline de un HTML (sin src).
 * Busca tanto dentro como fuera de #main-content.
 */
function extractInlineScripts(html) {
  const scripts = [];
  const regex = /<script>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const code = match[1].trim();
    if (code) scripts.push(code);
  }
  return scripts;
}

/**
 * Extrae el <title> de un HTML.
 */
function extractTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/);
  return match ? match[1].trim() : null;
}

/* ─── Navegación ─── */

async function loadPage(page, section = null, productoHash = null, skipPushState = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  try {
    // Limpiar scripts anteriores
    cleanupPage();

    // Determinar archivo a cargar
    const pageFile = page === 'producto' ? 'producto.html' : `${page}.html`;
    const html = await loadHTML(pageFile);

    // Extraer e inyectar contenido
    const content = extractPageContent(html);
    mainContent.innerHTML = content;

    // Ejecutar scripts inline de la página (catálogo, producto, etc.)
    const scripts = extractInlineScripts(html);
    if (scripts.length > 0) {
      // Limpiar scripts anteriores
      const oldScript = document.getElementById('spa-page-script');
      if (oldScript) oldScript.remove();

      const combinedCode = scripts.join('\n');

      // Para producto.html, inyectamos el hash ANTES de ejecutar el script
      if (page === 'producto') {
        window.location.hash = productoHash || '';
      }

      const scriptWrapper = document.createElement('script');
      scriptWrapper.id = 'spa-page-script';
      scriptWrapper.textContent = combinedCode;
      mainContent.appendChild(scriptWrapper);
    }

    // Actualizar navegación activa
    updateActiveNav(page);

    // Actualizar URL (replaceState en carga inicial, pushState en navegación)
    const path = productoHash
      ? `/${page}/${productoHash}`
      : section
        ? `/${page}/${section}`
        : `/${page}`;
    if (skipPushState) {
      window.history.replaceState({ page, section, productoHash }, '', path);
    } else {
      window.history.pushState({ page, section, productoHash }, '', path);
    }

    // Actualizar título
    const title = extractTitle(html);
    if (title) document.title = title;

    // Desplazar a sección si corresponde
    if (section) {
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }

    // Guardar estado
    STATE.currentPage = page;
    STATE.currentSection = section;
    STATE.currentProductoHash = productoHash;

    // Disparar evento personalizado para que otros componentes reaccionen
    window.dispatchEvent(new CustomEvent('page-loaded', {
      detail: { page, section, productoHash }
    }));

  } catch (error) {
    console.error('Error al cargar la página:', error);
    mainContent.innerHTML = `
      <div class="flex flex-col items-center justify-center py-32 text-center">
        <p class="font-serif text-2xl text-rouge">Error al cargar la página</p>
        <p class="mt-2 text-sm text-noir/60">${error.message}</p>
        <a href="#" data-page="home" class="mt-6 border border-noir px-6 py-2 text-xs uppercase tracking-widest transition-colors hover:border-rouge hover:text-rouge">Volver al inicio</a>
      </div>`;
  }
}

function cleanupPage() {
  const oldScript = document.getElementById('spa-page-script');
  if (oldScript) oldScript.remove();
  window.__spaProductoActive = false;
}

function updateActiveNav(page) {
  document.querySelectorAll('[data-page]').forEach(link => {
    link.classList.remove('text-rouge', 'font-medium');
    if (link.dataset.page === page) {
      link.classList.add('text-rouge', 'font-medium');
    }
  });
}

/* ─── Event Listeners ─── */

// 1. Clic en enlaces con data-page (header, footer, enlaces internos)
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (!link) return;
  e.preventDefault();

  const page = link.dataset.page;
  const section = link.dataset.section || null;
  const productoHash = link.dataset.producto || null;

  loadPage(page, section, productoHash);
});

// 2. Clic en enlaces a producto.html#producto-XXX (home, catálogo)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href*="producto.html#"]');
  if (!link) return;
  e.preventDefault();

  const match = link.href.match(/producto\.html#(producto-\d+)/);
  if (match) {
    loadPage('producto', null, match[1]);
  }
});

// 3. Clic en enlaces a catálogo (home.html#contacto, etc.)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href*=".html"]');
  if (!link) return;

  // Ignorar los que ya fueron capturados por data-page o producto.html
  if (link.hasAttribute('data-page')) return;
  if (link.href.includes('producto.html#')) return;

  const match = link.href.match(/(home|catalogo|producto)\.html(?:#(.+))?/);
  if (!match) return;

  // Solo interceptar si es navegación interna
  if (link.hostname === window.location.hostname || !link.hostname) {
    e.preventDefault();
    const page = match[1];
    const section = match[2] || null;
    loadPage(page, section);
  }
});

// 4. Botón atrás/adelante del navegador
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    loadPage(e.state.page, e.state.section || null, e.state.productoHash || null);
  } else {
    loadPage('home');
  }
});

/* ─── Inicialización ─── */

async function init() {
  try {
    // Cargar navbar y footer una sola vez
    const [navbarHTML, footerHTML] = await Promise.all([
      loadHTML('header.html'),
      loadHTML('footer.html'),
    ]);

    document.getElementById('navbar').innerHTML = navbarHTML;
    document.getElementById('footer').innerHTML = footerHTML;

    // Leer la ruta actual y cargar la página correspondiente
    const path = window.location.pathname.replace(/\/$/, '') || '';
    const parts = path.split('/').filter(Boolean); // ['catalogo'] o ['producto', 'producto-101']

    if (parts.length >= 1) {
      const page = parts[0];
      if (page === 'home' || page === 'catalogo' || page === 'producto' || page === 'legal') {
        const productoHash = parts.length >= 2 && page === 'producto' ? parts[1] : null;
        const section = parts.length >= 2 && page !== 'producto' ? parts[1] : null;
        await loadPage(page, section, productoHash, true);
        return;
      }
    }

    // Si no hay ruta, cargar home
    await loadPage('home', null, null, true);

  } catch (error) {
    console.error('Error en la inicialización:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-32 text-center">
        <p class="font-serif text-2xl text-rouge">Error de conexión</p>
        <p class="mt-2 text-sm text-noir/60">No se pudieron cargar los componentes de la página.</p>
      </div>`;
  }
}

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}