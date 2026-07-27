async function cargarComponente(selector, archivo) {
  const elemento = document.querySelector(selector);
  const respuesta = await fetch(archivo);

  if (!respuesta.ok) {
    throw new Error('No se pudo cargar ' + archivo);
  }

  elemento.innerHTML = await respuesta.text();
}

Promise.all([
  cargarComponente("#navbar", "/components/navbar.html"),
  cargarComponente("#footer", "/components/footer.html"),
]).catch(error => console.error(error));
<body>
  <div id="navbar"></div>

  <main>
    <h1>Contenido de la página</h1>
  </main>

  <div id="footer"></div>

  <script src="/js/components.js"></script>
</body>