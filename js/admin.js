/* ============================================================
   EL MANGUERÓN — Panel de administración del catálogo
   El borrador se guarda en localStorage; "Descargar catalogo.js"
   genera el archivo que debe subirse al hosting para publicar.
   ============================================================ */
(function () {
  "use strict";

  var CLAVE = "elmangueron_catalogo_borrador";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function escapar(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function slug(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function hoy() { return new Date().toISOString().slice(0, 10); }

  function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ---------- Estado ---------- */
  var publicado = window.CATALOGO || { version: 1, categorias: [], productos: [] };
  var catalogo = cargarBorrador() || clonar(publicado);
  var pendiente = !!cargarBorrador();

  function cargarBorrador() {
    try {
      var b = JSON.parse(localStorage.getItem(CLAVE) || "null");
      return b && b.productos ? b : null;
    } catch (e) { return null; }
  }

  function guardar() {
    catalogo.actualizado = hoy();
    localStorage.setItem(CLAVE, JSON.stringify(catalogo));
    pendiente = true;
    pintarEstado();
  }

  function pintarEstado() {
    var el = $("#estado");
    el.textContent = pendiente ? "Borrador con cambios sin publicar" : "Sin cambios pendientes";
    el.classList.toggle("pendiente", pendiente);
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("visible"); }, 2600);
  }

  function categoriaPorId(id) {
    return catalogo.categorias.filter(function (c) { return c.id === id; })[0];
  }

  /* ---------- Pestañas ---------- */
  $$(".pestana").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".pestana").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      $$(".panel").forEach(function (p) { p.classList.toggle("activo", p.id === "panel-" + b.getAttribute("data-panel")); });
    });
  });

  /* ---------- Productos: lista ---------- */
  var busqueda = "";
  var filtroCat = "";

  function pintarSelectCategorias() {
    var opciones = catalogo.categorias.map(function (c) {
      return '<option value="' + escapar(c.id) + '">' + escapar(c.nombre) + "</option>";
    }).join("");
    $("#p-categoria").innerHTML = opciones || '<option value="">Cree una categoría primero</option>';
    var f = $("#filtro-categoria");
    var actual = f.value;
    f.innerHTML = '<option value="">Todas las categorías</option>' + opciones;
    f.value = actual;
  }

  function pintarProductos() {
    var q = slug(busqueda);
    var lista = catalogo.productos.filter(function (p) {
      if (filtroCat && p.categoria !== filtroCat) return false;
      if (!q) return true;
      var cat = categoriaPorId(p.categoria);
      return slug(p.nombre + " " + p.marca + " " + (cat ? cat.nombre : "")).indexOf(q) !== -1;
    });

    $("#conteo-productos").textContent = catalogo.productos.length;
    $("#productos-vacio").hidden = catalogo.productos.length > 0;

    $("#tabla-productos").innerHTML = lista.map(function (p) {
      var cat = categoriaPorId(p.categoria);
      return '<tr data-id="' + escapar(p.id) + '"' + (productoEditando === p.id ? ' class="seleccionado"' : "") + ">" +
        "<td>" + (p.imagen ? '<img class="mini" src="' + escapar(p.imagen) + '" alt="">' : '<span class="mini" style="display:inline-block"></span>') + "</td>" +
        '<td><span class="nombre">' + escapar(p.nombre) + "</span>" + (p.destacado ? ' <span class="etiqueta etiqueta--azul">Destacado</span>' : "") + "</td>" +
        "<td>" + escapar(cat ? cat.nombre : "—") + "</td>" +
        "<td>" + (p.activo === false ? '<span class="etiqueta">Oculto</span>' : '<span class="etiqueta etiqueta--azul">Visible</span>') + "</td>" +
        '<td class="acciones"><button type="button" data-editar>Editar</button><button type="button" data-duplicar>Duplicar</button><button type="button" class="peligro" data-eliminar>Eliminar</button></td>' +
      "</tr>";
    }).join("");
  }

  $("#buscar-productos").addEventListener("input", function (e) { busqueda = e.target.value; pintarProductos(); });
  $("#filtro-categoria").addEventListener("change", function (e) { filtroCat = e.target.value; pintarProductos(); });

  $("#tabla-productos").addEventListener("click", function (e) {
    var fila = e.target.closest("tr[data-id]");
    if (!fila) return;
    var id = fila.getAttribute("data-id");
    if (e.target.hasAttribute("data-eliminar")) return eliminarProducto(id);
    if (e.target.hasAttribute("data-duplicar")) return duplicarProducto(id);
    cargarProducto(id);
  });

  /* ---------- Productos: formulario ---------- */
  var formP = $("#form-producto");
  var productoEditando = null;
  var idManual = false;

  function filaSpec(nombre, valor) {
    var div = document.createElement("div");
    div.className = "specs-editor__fila";
    div.innerHTML =
      '<input type="text" placeholder="Nombre (p. ej. Presión de trabajo)" value="' + escapar(nombre || "") + '">' +
      '<input type="text" placeholder="Valor (p. ej. hasta 5,800 PSI)" value="' + escapar(valor || "") + '">' +
      '<button type="button" class="specs-editor__quitar" aria-label="Quitar">×</button>';
    div.querySelector(".specs-editor__quitar").addEventListener("click", function () { div.remove(); });
    return div;
  }

  function pintarSpecs(lista) {
    var ed = $("#specs-editor");
    ed.innerHTML = "";
    (lista && lista.length ? lista : [{}, {}, {}]).forEach(function (s) {
      ed.appendChild(filaSpec(s.nombre, s.valor));
    });
  }

  function leerSpecs() {
    return $$(".specs-editor__fila").map(function (f) {
      var ins = f.querySelectorAll("input");
      return { nombre: ins[0].value.trim(), valor: ins[1].value.trim() };
    }).filter(function (s) { return s.nombre && s.valor; });
  }

  function vistaImagen(inputSel, vistaSel) {
    var url = $(inputSel).value.trim();
    $(vistaSel).innerHTML = url ? '<img src="' + escapar(url) + '" alt="">' : "";
  }

  function nuevoProducto() {
    productoEditando = null;
    idManual = false;
    formP.reset();
    $("#p-activo").checked = true;
    $("#form-producto-titulo").textContent = "Nuevo producto";
    $("#btn-eliminar-producto").hidden = true;
    pintarSpecs([]);
    vistaImagen("#p-imagen", "#p-vista");
    pintarProductos();
    $("#p-nombre").focus();
  }

  function cargarProducto(id) {
    var p = catalogo.productos.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    productoEditando = id;
    idManual = true;
    $("#p-nombre").value = p.nombre || "";
    $("#p-id").value = p.id || "";
    $("#p-categoria").value = p.categoria || "";
    $("#p-marca").value = p.marca || "";
    $("#p-imagen").value = p.imagen || "";
    $("#p-descripcion").value = p.descripcion || "";
    $("#p-destacado").checked = !!p.destacado;
    $("#p-activo").checked = p.activo !== false;
    $("#form-producto-titulo").textContent = "Editar producto";
    $("#btn-eliminar-producto").hidden = false;
    pintarSpecs(p.especificaciones);
    vistaImagen("#p-imagen", "#p-vista");
    pintarProductos();
    formP.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function eliminarProducto(id) {
    var p = catalogo.productos.filter(function (x) { return x.id === id; })[0];
    if (!p || !confirm("¿Eliminar “" + p.nombre + "”? Esta acción no se puede deshacer.")) return;
    catalogo.productos = catalogo.productos.filter(function (x) { return x.id !== id; });
    guardar();
    if (productoEditando === id) nuevoProducto(); else pintarProductos();
    toast("Producto eliminado");
  }

  function duplicarProducto(id) {
    var p = catalogo.productos.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var copia = clonar(p);
    copia.id = idUnico(p.id + "-copia", catalogo.productos);
    copia.nombre = p.nombre + " (copia)";
    catalogo.productos.splice(catalogo.productos.indexOf(p) + 1, 0, copia);
    guardar();
    cargarProducto(copia.id);
    toast("Producto duplicado");
  }

  function idUnico(base, lista, excepto) {
    var id = base, n = 2;
    while (lista.some(function (x) { return x.id === id && x.id !== excepto; })) id = base + "-" + n++;
    return id;
  }

  $("#p-nombre").addEventListener("input", function () {
    if (!idManual) $("#p-id").value = slug(this.value);
  });
  $("#p-id").addEventListener("input", function () { idManual = true; });
  $("#p-imagen").addEventListener("input", function () { vistaImagen("#p-imagen", "#p-vista"); });
  $("#btn-agregar-spec").addEventListener("click", function () {
    var f = filaSpec();
    $("#specs-editor").appendChild(f);
    f.querySelector("input").focus();
  });
  $("#btn-nuevo-producto").addEventListener("click", nuevoProducto);
  $("#btn-cancelar-producto").addEventListener("click", nuevoProducto);
  $("#btn-eliminar-producto").addEventListener("click", function () { if (productoEditando) eliminarProducto(productoEditando); });

  formP.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("#p-nombre").value.trim();
    var id = slug($("#p-id").value) || slug(nombre);
    var categoria = $("#p-categoria").value;
    if (!nombre) { toast("Escriba el nombre del producto"); $("#p-nombre").focus(); return; }
    if (!categoria) { toast("Seleccione una categoría"); $("#p-categoria").focus(); return; }
    id = idUnico(id, catalogo.productos, productoEditando);

    var datos = {
      id: id,
      nombre: nombre,
      categoria: categoria,
      marca: $("#p-marca").value.trim(),
      descripcion: $("#p-descripcion").value.trim(),
      imagen: $("#p-imagen").value.trim(),
      especificaciones: leerSpecs(),
      destacado: $("#p-destacado").checked,
      activo: $("#p-activo").checked
    };

    if (productoEditando) {
      var i = catalogo.productos.findIndex(function (x) { return x.id === productoEditando; });
      catalogo.productos[i] = datos;
    } else {
      catalogo.productos.push(datos);
    }
    guardar();
    toast("Producto guardado en el borrador");
    nuevoProducto();
  });

  /* ---------- Categorías ---------- */
  var formC = $("#form-categoria");
  var categoriaEditando = null;
  var idManualC = false;

  function pintarCategorias() {
    $("#conteo-categorias").textContent = catalogo.categorias.length;
    $("#tabla-categorias").innerHTML = catalogo.categorias.map(function (c) {
      var n = catalogo.productos.filter(function (p) { return p.categoria === c.id; }).length;
      return '<tr data-id="' + escapar(c.id) + '"' + (categoriaEditando === c.id ? ' class="seleccionado"' : "") + ">" +
        "<td>" + (c.imagen ? '<img class="mini" src="' + escapar(c.imagen) + '" alt="">' : '<span class="mini" style="display:inline-block"></span>') + "</td>" +
        '<td><span class="nombre">' + escapar(c.nombre) + '</span><br><span class="apagado">' + escapar(c.id) + "</span></td>" +
        "<td>" + n + "</td>" +
        '<td class="acciones"><button type="button" data-editar>Editar</button><button type="button" class="peligro" data-eliminar>Eliminar</button></td>' +
      "</tr>";
    }).join("") || '<tr><td colspan="4" class="vacio">No hay categorías.</td></tr>';
    pintarSelectCategorias();
  }

  function nuevaCategoria() {
    categoriaEditando = null;
    idManualC = false;
    formC.reset();
    $("#form-categoria-titulo").textContent = "Nueva categoría";
    $("#btn-eliminar-categoria").hidden = true;
    vistaImagen("#c-imagen", "#c-vista");
    pintarCategorias();
  }

  function cargarCategoria(id) {
    var c = categoriaPorId(id);
    if (!c) return;
    categoriaEditando = id;
    idManualC = true;
    $("#c-nombre").value = c.nombre || "";
    $("#c-id").value = c.id || "";
    $("#c-descripcion").value = c.descripcion || "";
    $("#c-imagen").value = c.imagen || "";
    $("#form-categoria-titulo").textContent = "Editar categoría";
    $("#btn-eliminar-categoria").hidden = false;
    vistaImagen("#c-imagen", "#c-vista");
    pintarCategorias();
  }

  function eliminarCategoria(id) {
    var c = categoriaPorId(id);
    if (!c) return;
    var n = catalogo.productos.filter(function (p) { return p.categoria === id; }).length;
    if (n) { toast("Primero mueva o elimine los " + n + " productos de esta categoría"); return; }
    if (!confirm("¿Eliminar la categoría “" + c.nombre + "”?")) return;
    catalogo.categorias = catalogo.categorias.filter(function (x) { return x.id !== id; });
    guardar();
    nuevaCategoria();
    toast("Categoría eliminada");
  }

  $("#tabla-categorias").addEventListener("click", function (e) {
    var fila = e.target.closest("tr[data-id]");
    if (!fila) return;
    var id = fila.getAttribute("data-id");
    if (e.target.hasAttribute("data-eliminar")) return eliminarCategoria(id);
    cargarCategoria(id);
  });

  $("#c-nombre").addEventListener("input", function () { if (!idManualC) $("#c-id").value = slug(this.value); });
  $("#c-id").addEventListener("input", function () { idManualC = true; });
  $("#c-imagen").addEventListener("input", function () { vistaImagen("#c-imagen", "#c-vista"); });
  $("#btn-nueva-categoria").addEventListener("click", nuevaCategoria);
  $("#btn-cancelar-categoria").addEventListener("click", nuevaCategoria);
  $("#btn-eliminar-categoria").addEventListener("click", function () { if (categoriaEditando) eliminarCategoria(categoriaEditando); });

  formC.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("#c-nombre").value.trim();
    var id = slug($("#c-id").value) || slug(nombre);
    if (!nombre) { toast("Escriba el nombre de la categoría"); return; }
    id = idUnico(id, catalogo.categorias, categoriaEditando);

    var datos = { id: id, nombre: nombre, descripcion: $("#c-descripcion").value.trim(), imagen: $("#c-imagen").value.trim() };

    if (categoriaEditando) {
      var i = catalogo.categorias.findIndex(function (x) { return x.id === categoriaEditando; });
      catalogo.categorias[i] = datos;
      if (id !== categoriaEditando) {
        catalogo.productos.forEach(function (p) { if (p.categoria === categoriaEditando) p.categoria = id; });
      }
    } else {
      catalogo.categorias.push(datos);
    }
    guardar();
    toast("Categoría guardada en el borrador");
    nuevaCategoria();
    pintarProductos();
  });

  /* ---------- Exportar / importar / restablecer ---------- */
  function generarArchivo() {
    var cabecera =
      "/* ============================================================\n" +
      "   EL MANGUERÓN — Catálogo de productos\n" +
      "   Generado desde admin.html el " + hoy() + ".\n" +
      "   Para publicar, reemplace js/catalogo.js en el hosting.\n" +
      "   ============================================================ */\n";
    var datos = clonar(catalogo);
    datos.version = (publicado.version || 0) + 1;
    datos.actualizado = hoy();
    return cabecera + "window.CATALOGO = " + JSON.stringify(datos, null, 2) + ";\n";
  }

  $("#btn-descargar").addEventListener("click", function () {
    var blob = new Blob([generarArchivo()], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalogo.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Archivo descargado. Súbalo a la carpeta js/ del hosting.");
  });

  $("#btn-importar").addEventListener("click", function () { $("#archivo-importar").click(); });
  $("#archivo-importar").addEventListener("change", function () {
    var archivo = this.files[0];
    if (!archivo) return;
    var lector = new FileReader();
    lector.onload = function () {
      var texto = String(lector.result).trim();
      // Acepta catalogo.js (window.CATALOGO = {...};) o un .json puro
      var m = texto.match(/window\.CATALOGO\s*=\s*([\s\S]*?);?\s*$/);
      var json = m ? m[1] : texto;
      try {
        var datos = JSON.parse(json);
        if (!datos || !Array.isArray(datos.productos) || !Array.isArray(datos.categorias)) throw new Error("estructura");
        if (!confirm("Se reemplazará el borrador actual con " + datos.productos.length + " productos y " + datos.categorias.length + " categorías. ¿Continuar?")) return;
        catalogo = datos;
        guardar();
        nuevoProducto();
        nuevaCategoria();
        toast("Catálogo importado");
      } catch (err) {
        toast("El archivo no tiene el formato esperado (catalogo.js o JSON con categorias y productos).");
      }
    };
    lector.readAsText(archivo, "utf-8");
    this.value = "";
  });

  $("#btn-restablecer").addEventListener("click", function () {
    if (!confirm("Se descartarán todos los cambios del borrador y se volverá al catálogo publicado. ¿Continuar?")) return;
    localStorage.removeItem(CLAVE);
    catalogo = clonar(publicado);
    pendiente = false;
    pintarEstado();
    nuevoProducto();
    nuevaCategoria();
    toast("Borrador descartado");
  });

  /* ---------- Arranque ---------- */
  pintarEstado();
  pintarCategorias();
  nuevoProducto();
})();
