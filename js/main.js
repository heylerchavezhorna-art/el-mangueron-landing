/* ============================================================
   EL MANGUERÓN — Lógica del sitio
   - Inserta los datos de config.js en la página
   - Genera los enlaces de WhatsApp
   - Renderiza el catálogo (filtros, búsqueda, detalle)
   - Maneja el menú móvil y el formulario de contacto
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.CONFIG || {};
  var CLAVE_PREVIEW = "elmangueron_catalogo_borrador";

  /* ---------- Utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function enlaceWhatsapp(mensaje) {
    var numero = String(CONFIG.whatsapp || "").replace(/\D/g, "");
    var texto = encodeURIComponent(mensaje || CONFIG.whatsappMensaje || "Hola");
    return "https://wa.me/" + numero + "?text=" + texto;
  }

  /* Imagen de respaldo cuando un producto no tiene foto: una placa gris con el nombre de la categoría */
  function imagenRespaldo(etiqueta) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
      '<rect width="400" height="300" fill="#e1e6ec"/>' +
      '<rect x="80" y="128" width="240" height="34" rx="17" fill="#aab3bd"/>' +
      '<rect x="48" y="118" width="44" height="54" rx="5" fill="#6b7480"/>' +
      '<rect x="308" y="118" width="44" height="54" rx="5" fill="#6b7480"/>' +
      '<path d="M60 130h20M60 145h20M60 160h20M320 130h20M320 145h20M320 160h20" stroke="#e1e6ec" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="200" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#5b6470">' +
      escapar(etiqueta) + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- Datos de la empresa en la página ---------- */
  function aplicarConfig() {
    $$("[data-config]").forEach(function (el) {
      var clave = el.getAttribute("data-config");
      var valor = CONFIG[clave];
      if (valor == null) return;
      el.textContent = valor;
      var tipo = el.getAttribute("data-href");
      if (tipo === "tel") el.setAttribute("href", "tel:" + String(valor).replace(/[^\d+]/g, ""));
      if (tipo === "mailto") el.setAttribute("href", "mailto:" + valor);
    });

    $$("[data-whatsapp]").forEach(function (el) {
      el.setAttribute("href", enlaceWhatsapp(el.getAttribute("data-mensaje")));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });

    var mapa = $("#mapa");
    if (mapa && CONFIG.mapaConsulta) {
      mapa.src = "https://www.google.com/maps?q=" + encodeURIComponent(CONFIG.mapaConsulta) + "&output=embed";
    }

    var anio = $("#anio");
    if (anio) anio.textContent = new Date().getFullYear();
  }

  /* ---------- Menú móvil y navegación activa ---------- */
  function iniciarMenu() {
    var btn = $(".menu-btn");
    var nav = $("#nav-movil");
    if (!btn || !nav) return;

    btn.addEventListener("click", function () {
      var abierto = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!abierto));
      btn.setAttribute("aria-label", abierto ? "Abrir menú" : "Cerrar menú");
      nav.classList.toggle("abierto", !abierto);
    });

    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        btn.setAttribute("aria-expanded", "false");
        nav.classList.remove("abierto");
      });
    });

    var enlaces = $$(".nav a");
    var secciones = enlaces.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if (!("IntersectionObserver" in window) || !secciones.length) return;

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.classList.toggle("activo", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    secciones.forEach(function (s) { observador.observe(s); });
  }

  /* ---------- Catálogo ---------- */
  function cargarCatalogo() {
    var base = window.CATALOGO || { categorias: [], productos: [] };
    var params = new URLSearchParams(location.search);
    if (params.get("preview") === "1") {
      try {
        var borrador = JSON.parse(localStorage.getItem(CLAVE_PREVIEW) || "null");
        if (borrador && borrador.productos) return borrador;
      } catch (e) { /* si el borrador está dañado, usamos el catálogo publicado */ }
    }
    return base;
  }

  function iniciarCatalogo() {
    var grid = $("#productos-grid");
    if (!grid) return;

    var catalogo = cargarCatalogo();
    var categorias = catalogo.categorias || [];
    var productos = (catalogo.productos || []).filter(function (p) { return p.activo !== false; });
    var porId = {};
    categorias.forEach(function (c) { porId[c.id] = c; });

    var filtroActivo = "todos";
    var busqueda = "";
    var LOTE = 9;            // productos visibles por defecto
    var limite = LOTE;
    var masBtn = $("#catalogo-mas");

    var filtros = $("#filtros");
    var resumen = $("#catalogo-resumen");
    var buscador = $("#buscador");

    function nombreCategoria(id) { return porId[id] ? porId[id].nombre : "Sin categoría"; }

    function imagenDe(p) {
      if (p.imagen) return p.imagen;
      var cat = porId[p.categoria];
      return imagenRespaldo(cat ? cat.nombre : "Producto");
    }

    function renderFiltros() {
      var html = '<button class="filtro" type="button" data-cat="todos" aria-pressed="true">Todos</button>';
      categorias.forEach(function (c) {
        var n = productos.filter(function (p) { return p.categoria === c.id; }).length;
        if (!n) return;
        html += '<button class="filtro" type="button" data-cat="' + escapar(c.id) + '" aria-pressed="false">' +
          escapar(c.nombre) + "</button>";
      });
      filtros.innerHTML = html;
    }

    function specsHtml(p, limite) {
      var lista = (p.especificaciones || []).slice(0, limite || 99);
      if (!lista.length) return "";
      return '<dl class="specs">' + lista.map(function (s) {
        return "<div><dt>" + escapar(s.nombre) + "</dt><dd>" + escapar(s.valor) + "</dd></div>";
      }).join("") + "</dl>";
    }

    function filtrar() {
      var q = normalizar(busqueda.trim());
      return productos.filter(function (p) {
        if (filtroActivo !== "todos" && p.categoria !== filtroActivo) return false;
        if (!q) return true;
        var texto = normalizar([
          p.nombre, p.descripcion, p.marca, nombreCategoria(p.categoria),
          (p.especificaciones || []).map(function (s) { return s.nombre + " " + s.valor; }).join(" ")
        ].join(" "));
        return texto.indexOf(q) !== -1;
      }).sort(function (a, b) {
        // Primero destacados; dentro de cada grupo, los que tienen foto propia
        var d = (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
        return d || ((b.imagen ? 1 : 0) - (a.imagen ? 1 : 0));
      });
    }

    function renderGrid() {
      var lista = filtrar();
      if (resumen) {
        resumen.textContent = lista.length === 1 ? "1 producto" : lista.length + " productos" +
          (filtroActivo !== "todos" ? " en " + nombreCategoria(filtroActivo) : "") +
          (busqueda ? ' para "' + busqueda + '"' : "");
      }
      if (!lista.length) {
        grid.innerHTML = '<div class="catalogo__vacio" style="grid-column:1/-1">' +
          "<p>No hay productos que coincidan con la búsqueda.</p>" +
          '<p><a href="' + enlaceWhatsapp("Hola EL MANGUERÓN, busco: " + busqueda) + '" target="_blank" rel="noopener">Consúltenos por WhatsApp</a>, trabajamos referencias bajo pedido.</p></div>';
        if (masBtn) masBtn.hidden = true;
        return;
      }
      var visibles = lista.slice(0, limite);
      if (masBtn) {
        var restantes = lista.length - visibles.length;
        masBtn.hidden = restantes <= 0;
        masBtn.textContent = "Ver " + Math.min(restantes, LOTE) + " productos más";
      }
      grid.innerHTML = visibles.map(function (p) {
        var msg = "Hola EL MANGUERÓN, quisiera cotizar: " + p.nombre;
        return '<article class="producto" data-id="' + escapar(p.id) + '">' +
          '<div class="producto__img"><img src="' + escapar(imagenDe(p)) + '" alt="' + escapar(p.nombre) + '" loading="lazy" width="400" height="300"></div>' +
          '<div class="producto__cuerpo">' +
            '<span class="producto__cat">' + escapar(nombreCategoria(p.categoria)) + "</span>" +
            '<h3 class="producto__nombre">' + escapar(p.nombre) + "</h3>" +
            '<p class="producto__desc">' + escapar(p.descripcion) + "</p>" +
          "</div>" +
          specsHtml(p, 3) +
          '<div class="producto__pie">' +
            '<button class="btn btn--borde btn--peq" type="button" data-detalle="' + escapar(p.id) + '">Ver ficha</button>' +
            '<a class="btn btn--primario btn--peq" href="' + enlaceWhatsapp(msg) + '" target="_blank" rel="noopener">Cotizar</a>' +
          "</div>" +
        "</article>";
      }).join("");
    }

    /* Diálogo de detalle */
    var dialogo = $("#dialogo-producto");
    var cuerpo = $("#dialogo-cuerpo");

    function abrirDetalle(id) {
      var p = productos.filter(function (x) { return x.id === id; })[0];
      if (!p || !dialogo) return;
      var msg = "Hola EL MANGUERÓN, quisiera cotizar: " + p.nombre;
      cuerpo.innerHTML =
        '<div class="dialogo__img"><img src="' + escapar(imagenDe(p)) + '" alt="' + escapar(p.nombre) + '"></div>' +
        '<div class="dialogo__info">' +
          '<span class="producto__cat">' + escapar(nombreCategoria(p.categoria)) + (p.marca ? " · " + escapar(p.marca) : "") + "</span>" +
          '<h3 id="dialogo-titulo">' + escapar(p.nombre) + "</h3>" +
          "<p>" + escapar(p.descripcion) + "</p>" +
          specsHtml(p) +
          '<div class="dialogo__acciones">' +
            '<a class="btn btn--primario" href="' + enlaceWhatsapp(msg) + '" target="_blank" rel="noopener">Cotizar por WhatsApp</a>' +
            '<a class="btn btn--borde" href="mailto:' + escapar(CONFIG.email || "") + "?subject=" + encodeURIComponent("Cotización: " + p.nombre) + '">Cotizar por correo</a>' +
          "</div>" +
        "</div>";
      if (typeof dialogo.showModal === "function") dialogo.showModal();
      else dialogo.setAttribute("open", "");
    }

    function cerrarDetalle() {
      if (!dialogo) return;
      if (typeof dialogo.close === "function" && dialogo.open) dialogo.close();
      else dialogo.removeAttribute("open");
    }

    /* Eventos */
    filtros.addEventListener("click", function (e) {
      var btn = e.target.closest(".filtro");
      if (!btn) return;
      filtroActivo = btn.getAttribute("data-cat");
      limite = LOTE;
      $$(".filtro", filtros).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      renderGrid();
    });

    if (buscador) {
      buscador.addEventListener("input", function () {
        busqueda = buscador.value;
        limite = LOTE;
        renderGrid();
      });
    }

    if (masBtn) {
      masBtn.addEventListener("click", function () {
        var antes = grid.children.length;
        limite += LOTE;
        renderGrid();
        var primero = grid.children[antes];
        if (primero) primero.querySelector("[data-detalle]").focus({ preventScroll: true });
      });
    }

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-detalle]");
      if (btn) abrirDetalle(btn.getAttribute("data-detalle"));
    });

    if (dialogo) {
      $("[data-cerrar]", dialogo).addEventListener("click", cerrarDetalle);
      dialogo.addEventListener("click", function (e) {
        if (e.target === dialogo) cerrarDetalle();
      });
    }

    /* Enlaces del pie con las categorías */
    var pieCats = $("#pie-categorias");
    if (pieCats) {
      pieCats.innerHTML = categorias.map(function (c) {
        return '<li><a href="#productos" data-cat-link="' + escapar(c.id) + '">' + escapar(c.nombre) + "</a></li>";
      }).join("");
      pieCats.addEventListener("click", function (e) {
        var a = e.target.closest("[data-cat-link]");
        if (!a) return;
        var b = $('.filtro[data-cat="' + a.getAttribute("data-cat-link") + '"]', filtros);
        if (b) b.click();
      });
    }

    renderFiltros();
    renderGrid();
  }

  /* ---------- Formulario de contacto ---------- */
  function iniciarFormulario() {
    var form = $("#formulario");
    var estado = $("#formulario-estado");
    if (!form) return;

    function mostrar(msg, tipo) {
      estado.textContent = msg;
      estado.className = "formulario__estado" + (tipo ? " " + tipo : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      mostrar("", "");

      if (!form.checkValidity()) {
        mostrar("Complete nombre, teléfono y el detalle de lo que necesita.", "error");
        var invalido = $(":invalid", form);
        if (invalido) invalido.focus();
        return;
      }

      var d = {};
      $$("input, select, textarea", form).forEach(function (c) { d[c.name] = c.value.trim(); });

      var mensaje =
        "Solicitud de cotización\n" +
        "Nombre/empresa: " + d.nombre + "\n" +
        "Teléfono: " + d.telefono + "\n" +
        (d.email ? "Correo: " + d.email + "\n" : "") +
        (d.sector ? "Sector: " + d.sector + "\n" : "") +
        "Necesito: " + d.mensaje;

      if (CONFIG.formEndpoint) {
        var btn = $("button[type=submit]", form);
        btn.disabled = true;
        fetch(CONFIG.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(d)
        }).then(function (r) {
          if (!r.ok) throw new Error("respuesta " + r.status);
          form.reset();
          mostrar("Solicitud enviada. Le respondemos en horario de oficina.", "ok");
        }).catch(function () {
          mostrar("No se pudo enviar. Escríbanos por WhatsApp o inténtelo de nuevo.", "error");
        }).finally(function () { btn.disabled = false; });
        return;
      }

      window.open(enlaceWhatsapp(mensaje), "_blank", "noopener");
      mostrar("Se abrió WhatsApp con su solicitud. Si no se abrió, revise el bloqueador de ventanas emergentes.", "ok");
    });
  }

  /* ---------- Arranque ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    aplicarConfig();
    iniciarMenu();
    iniciarCatalogo();
    iniciarFormulario();
  });
})();
