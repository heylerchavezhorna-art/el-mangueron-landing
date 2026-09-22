# EL MANGUERÓN — Sitio web

Sitio corporativo de una página para EL MANGUERÓN: fabricación, distribución y comercialización de mangueras, conexiones y accesorios industriales.

Es un sitio **estático** (HTML, CSS y JavaScript sin dependencias ni proceso de compilación). Se puede subir tal cual a cualquier hosting: cPanel, Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.

## Estructura

```
index.html          Página principal (Inicio, Nosotros, Productos, Servicios, Marcas, Sectores, Contacto, Pie)
admin.html          Panel para administrar el catálogo (solo local, excluido del repositorio)
css/styles.css      Estilos del sitio
css/admin.css       Estilos del panel
js/config.js        Datos de la empresa: WhatsApp, teléfonos, correo, dirección, horario
js/catalogo.js      Catálogo de productos y categorías (se genera desde admin.html)
js/main.js          Lógica del sitio: catálogo, filtros, WhatsApp, formulario, menú
js/admin.js         Lógica del panel
assets/img/         Logo (logo.png, logo-sm.png), imagen para redes (og.jpg), favicons y fotos de productos
FOTOS/              Originales entregados por la empresa (no es necesario subirlos al hosting)
robots.txt          Indicaciones para buscadores
sitemap.xml         Mapa del sitio
```

## Cómo editar los datos de contacto

Abra `js/config.js` y cambie los valores. Todo el sitio (encabezado, contacto, pie y botón de WhatsApp) se actualiza solo.

- `whatsapp`: número en formato internacional, sin espacios ni símbolos (`51940875831`).
- `formEndpoint`: opcional. Si pega aquí la URL de un servicio de formularios (Formspree, Basin, Netlify Forms, etc.), el formulario de contacto envía los datos allí. Si queda vacío, el formulario abre WhatsApp con el mensaje ya redactado.
- `mapaConsulta`: dirección que se muestra en el mapa de Google.

Los mismos datos deben actualizarse una vez en `index.html` dentro del bloque `application/ld+json` (datos estructurados para Google) y en las etiquetas `<meta>` y `canonical` con el dominio definitivo.

## Cómo administrar el catálogo

1. Abra `admin.html` en el navegador (está solo en la carpeta local del proyecto; no se sube a GitHub ni al sitio publicado).
2. Cree, edite, duplique u oculte productos y categorías. Cada producto tiene nombre, categoría, marca, descripción, imagen y una lista de especificaciones técnicas (nombre/valor) que se muestran como ficha en el sitio.
3. Pulse **Vista previa** para ver el borrador en el sitio (`index.html?preview=1`).
4. Pulse **Descargar catalogo.js** y suba el archivo a la carpeta `js/` del hosting reemplazando el actual. Desde ese momento todos los visitantes ven el catálogo nuevo.

El borrador se guarda en el navegador donde se editó (localStorage). **Importar archivo** permite cargar un `catalogo.js` o un `.json` para continuar la edición en otro equipo.

### Imágenes de productos

- Suba las fotos a `assets/img/productos/` y escriba la ruta en el campo *URL de la imagen* (`assets/img/productos/r2at.webp`), o use una URL completa.
- Tamaño recomendado: 800 × 600 px (proporción 4:3), JPG optimizado, menos de 200 KB.
- Si un producto no tiene imagen, el sitio muestra una placa gris con el nombre de la categoría.

### Protección del panel

`admin.html`, `css/admin.css` y `js/admin.js` están excluidos del repositorio mediante `.gitignore`: viven solo en la computadora de la empresa. Guarde una copia de respaldo de esos tres archivos; si se pierden, no se pueden recuperar desde GitHub.

## Marcas, fotos y textos

- **Marcas**: en `index.html`, sección `#marcas`, reemplace cada `<span class="marca__nombre">` por `<img src="assets/marcas/nombre.svg" alt="Nombre">` cuando disponga de los logotipos autorizados por cada fabricante. Las marcas incluidas son de ejemplo.
- **Fotografías**: las fotos actuales provienen de Unsplash (licencia libre) y son de referencia. Reemplácelas por fotos propias del almacén, taller y productos para reforzar la credibilidad. Están en `index.html` (hero, nosotros, sectores) y en `js/catalogo.js` (categorías).
- **Textos**: todos los textos están en `index.html`. Las cifras del hero (presión máxima, diámetros, tiempos de ensamble) deben ajustarse a la realidad de la empresa.

## SEO incluido

- Título y descripción optimizados, `canonical`, Open Graph y Twitter Card.
- Datos estructurados `LocalBusiness` (schema.org).
- HTML semántico con un solo `h1`, secciones con `h2`, imágenes con `alt` y carga diferida.
- `robots.txt` y `sitemap.xml`. Actualice el dominio en ambos y en `index.html` antes de publicar.
- Tipografías con `display=swap` y `preconnect` para no bloquear el renderizado.

## Ver el sitio localmente

Basta con abrir `index.html` en el navegador. Para que el mapa y las fuentes carguen igual que en producción, sírvalo con un servidor local:

```bash
python -m http.server 8080
```

y visite `http://localhost:8080`.

## Publicar

Suba todos los archivos y carpetas a la raíz del hosting. No hay pasos de compilación. Después de publicar:

1. El sitio está publicado en GitHub Pages: https://heylerchavezhorna-art.github.io/el-mangueron-landing/ (se actualiza solo con cada `git push` a `main`). Si se compra un dominio propio, configúrelo en *Settings → Pages → Custom domain* y reemplace esa URL por el dominio en `index.html`, `robots.txt` y `sitemap.xml`.
2. Registre el sitio en Google Search Console y envíe `sitemap.xml`.
3. Cree el perfil de Google Business con la misma dirección y teléfono.
