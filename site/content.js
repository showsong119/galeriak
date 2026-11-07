// Contenido fijo del sitio: galerías, ranking y guías.
export const CATS = [
  { id: 'beauty', name: 'K-Beauty' },
  { id: 'deals', name: 'Ofertas' },
  { id: 'kpop', name: 'K-Pop' },
  { id: 'kdrama', name: 'K-Drama' },
  { id: 'vida', name: 'Corea y más' }
];

export const GALS = [
  { id: 'skincare', cat: 'beauty', name: 'Skincare coreano', desc: 'Rutinas, ingredientes y dudas de cuidado de la piel', c: '#c2185b' },
  { id: 'maquillaje', cat: 'beauty', name: 'Maquillaje coreano', desc: 'Cushions, tints, tonos para piel latina', c: '#ad1457' },
  { id: 'resenas', cat: 'beauty', name: 'Reseñas', desc: 'Reseñas honestas después de usar el producto', c: '#8e244d' },
  { id: 'idol-picks', cat: 'beauty', name: 'Productos de idols', desc: 'Lo que usan los idols — siempre con fuente', c: '#7b3fa0', needSource: true },
  { id: 'ofertas', cat: 'deals', name: 'Ofertas K-Beauty', desc: 'Precios bajos en México, con enlace y tienda', c: '#c73a1f', deal: true },
  { id: 'bts', cat: 'kpop', name: 'BTS', desc: 'Galería de fans de BTS', c: '#5b3cc4' },
  { id: 'blackpink', cat: 'kpop', name: 'BLACKPINK', desc: 'Galería de fans de BLACKPINK', c: '#b8325f' },
  { id: 'stray-kids', cat: 'kpop', name: 'Stray Kids', desc: 'Galería de fans de Stray Kids', c: '#a93226' },
  { id: 'twice', cat: 'kpop', name: 'TWICE', desc: 'Galería de fans de TWICE', c: '#c0502e' },
  { id: 'seventeen', cat: 'kpop', name: 'SEVENTEEN', desc: 'Galería de fans de SEVENTEEN', c: '#3f5bd1' },
  { id: 'ateez', cat: 'kpop', name: 'ATEEZ', desc: 'Galería de fans de ATEEZ', c: '#a84300' },
  { id: 'enhypen', cat: 'kpop', name: 'ENHYPEN', desc: 'Galería de fans de ENHYPEN', c: '#34495e' },
  { id: 'txt', cat: 'kpop', name: 'TXT', desc: 'Galería de fans de TOMORROW X TOGETHER', c: '#1f6fa8' },
  { id: 'aespa', cat: 'kpop', name: 'aespa', desc: 'Galería de fans de aespa', c: '#117a65' },
  { id: 'ive', cat: 'kpop', name: 'IVE', desc: 'Galería de fans de IVE', c: '#b0306f' },
  { id: 'le-sserafim', cat: 'kpop', name: 'LE SSERAFIM', desc: 'Galería de fans de LE SSERAFIM', c: '#2d3436' },
  { id: 'kdramas', cat: 'kdrama', name: 'K-Dramas', desc: 'Recomendaciones y comentarios (sin spoilers en el título)', c: '#00796b' },
  { id: 'viajes', cat: 'vida', name: 'Viaje a Corea', desc: 'Compras, tax free y consejos para tu viaje', c: '#1565c0' },
  { id: 'coreano', cat: 'vida', name: 'Aprender coreano', desc: 'Frases útiles, hangul y recursos', c: '#6d4c41' },
  { id: 'libre', cat: 'vida', name: 'Charla libre', desc: 'De todo un poco', c: '#546e7a' },
  { id: 'solicitudes', cat: 'vida', name: 'Solicitar galería', desc: 'Pide nuevas galerías de grupos, actores o marcas', c: '#2f5bd8' }
];
export const G = Object.fromEntries(GALS.map(g => [g.id, g]));

export const RANK = [
  ['Round Lab 1025 Dokdo Toner', 'Mejor tóner / bruma — 1.er lugar'],
  ['Aestura Atobarrier 365 Cream', 'Hidratante votada #1 varios años'],
  ['Illiyoon Ceramide Ato Lotion', 'Ganadora en cuidado corporal'],
  ['Labo-H Scalp Strengthening Shampoo', 'Mejor champú — 1.er lugar'],
  ['Fillimilli Heating Eyelash Curler', 'Mejor herramienta — 1.er lugar']
];
export const RANK_SRC = 'https://themonodist.com/olive-young-awards-2025/';

export const GUIDES = {
  'guia-original': { t: 'Cómo saber si tu cosmético coreano es original', d: '7 señales para no comprar imitaciones en México', html: `
<p>Con el boom del K-Beauty en México también aparecieron más imitaciones. Antes de comprar, revisa estos puntos.</p>
<h2>1. Compra en tiendas oficiales o distribuidores autorizados</h2>
<p>En marketplaces como Amazon México o Mercado Libre, busca la etiqueta de <b>tienda oficial</b> de la marca o de un distribuidor reconocido. Desconfía de vendedores nuevos sin reseñas.</p>
<h2>2. Revisa la etiqueta en español</h2>
<p>Los cosméticos que se venden formalmente en México deben llevar etiqueta en español con los datos del importador. Si el producto solo trae coreano y no tiene ningún dato de importación, pregunta al vendedor de dónde viene.</p>
<h2>3. Lote y fecha de caducidad</h2>
<p>Los productos originales traen número de lote y fecha impresos con claridad. Impresión borrosa, fechas pegadas con etiqueta encima o lotes que no coinciden entre caja y envase son focos rojos.</p>
<h2>4. Un precio demasiado bajo</h2>
<p>Si cuesta mucho menos que en todas las demás tiendas, algo pasa: imitación, producto caducado o mal almacenado.</p>
<h2>5. Compara el empaque con fotos oficiales</h2>
<p>Tipografía, colores, posición del código de barras y textos deben coincidir con las fotos de la página oficial de la marca.</p>
<h2>6. Textura y olor</h2>
<p>Si el producto huele raro, cambió de color o la textura es muy distinta a las reseñas, deja de usarlo.</p>
<h2>7. Pregunta a la comunidad</h2>
<p>¿Dudas? Publica fotos de la caja (sin datos personales) en la galería <a href="#g-resenas">Reseñas</a>.</p>
<p class="note">Guía informativa. Ante cualquier reacción en la piel, suspende el uso y consulta a un profesional de la salud.</p>` },
  'guia-donde-comprar': { t: 'Dónde comprar cosmética coreana en México', d: 'Tiendas físicas y en línea con marcas coreanas', html: `
<p>Hoy es más fácil que nunca encontrar K-Beauty en México. Estos son los canales más comunes:</p>
<h2>Tiendas departamentales y de belleza</h2>
<p><b>Sephora México</b> y <b>Sally Beauty México</b> manejan marcas como COSRX, Tocobo y Skin1004 (<a href="https://playersoflife.com/nacional/k-beauty-crece-135-en-mexico-asi-se-volvio-negocio-el-skincare-coreano/" target="_blank" rel="noopener">fuente</a>). <b>Ulta Beauty México</b> sumó una selección de K-Beauty World (<a href="https://www.cosmeticsdesign.com/Article/2025/09/24/k-beauty-world-expands-to-latin-america-via-ulta-mexico" target="_blank" rel="noopener">fuente</a>), y <b>Sanborns</b> vende TONYMOLY en algunas tiendas (<a href="https://www.modaes.com/empresas/tonymoly-se-une-a-sanborns-para-extender-su-presencia-en-mexico" target="_blank" rel="noopener">fuente</a>).</p>
<h2>Marketplaces</h2>
<p>Amazon México y Mercado Libre tienen mucha variedad. Prefiere tiendas oficiales y revisa la <a href="#guia-original">guía para detectar originales</a>.</p>
<h2>Tiendas especializadas en línea</h2>
<p>Hay tiendas mexicanas dedicadas solo a cosmética coreana. Revisa reseñas, política de devoluciones y si muestran fotos reales de su inventario.</p>
<h2>Comprar en Corea</h2>
<p>Si viajas, Olive Young es la cadena más popular. Mira el <a href="#guia-rebajas">calendario de rebajas</a> para planear tu compra.</p>
<p class="note">Esta lista no es pagada. GaleríaK usa enlaces de afiliado de Amazon en la galería de ofertas; si una tienda se convierte en patrocinador, lo indicaremos claramente.</p>` },
  'guia-rebajas': { t: 'Calendario de rebajas de Olive Young', d: 'Cuándo comprar más barato en Corea u Olive Young Global', html: `
<p>Olive Young hace sus <b>grandes rebajas cuatro veces al año: a inicios de marzo, junio, septiembre y diciembre</b>, y cada una dura alrededor de una semana (<a href="https://www.pressreader.com/china/south-china-morning-post-6150/20240513/282157886343442" target="_blank" rel="noopener">fuente</a>). La tienda en línea internacional, Olive Young Global, también participa.</p>
<h2>Próxima rebaja: inicios de diciembre de 2026</h2>
<p>Por el patrón de años anteriores se espera que empiece a finales de noviembre o el primer fin de semana de diciembre. La fecha exacta se confirma pocos días antes en las redes oficiales de Olive Young.</p>
<h2>Olive Young Awards: finales de noviembre</h2>
<p>Cada año, a finales de noviembre, Olive Young anuncia los productos más vendidos del año (<a href="${RANK_SRC}" target="_blank" rel="noopener">fuente</a>). Es la mejor lista para saber qué comprar en la rebaja de diciembre. Actualizaremos el ranking de GaleríaK en cuanto salga.</p>
<h2>Consejos</h2>
<p>• Lleva tu pasaporte: en muchas tiendas puedes pedir el tax free inmediato.<br>• Descarga la app de Olive Young Global para cupones.<br>• Haz tu lista antes: las tiendas grandes de Myeongdong se llenan en temporada de rebajas.</p>` }
};

export const RULES_HTML = `<h1>Reglas de GaleríaK</h1>
<h2>1. Respeto</h2><p>Nada de insultos, acoso ni “fan wars”. Se puede opinar distinto sin atacar a artistas ni a otros fans.</p>
<h2>2. Privacidad de los artistas</h2><p>Prohibido publicar horarios privados, direcciones, números de vuelo, teléfonos o cualquier contenido tipo sasaeng. Solo información pública y oficial.</p>
<h2>3. Datos personales</h2><p>No publiques datos personales tuyos ni de otras personas (teléfonos, direcciones, cuentas).</p>
<h2>4. Productos de idols con fuente</h2><p>Decir que un artista “usa” o “recomienda” un producto requiere un enlace a una fuente verificable. Sin fuente, se oculta.</p>
<h2>5. Nada de réplicas</h2><p>Prohibido vender o promover imitaciones o productos falsificados.</p>
<h2>6. Ofertas reales</h2><p>Las ofertas deben tener precio, tienda y enlace reales. Si se agota, márcala como agotada. Spam o autopromoción no declarada se elimina.</p>
<h2>7. Derechos de autor</h2><p>No subas fotos, videos ni textos de otras personas sin permiso. Comparte enlaces a fuentes oficiales.</p>
<h2>8. Contenido para todo público</h2><p>Sin contenido sexual, violento ni de odio. Muchos fans son menores de edad.</p>
<h2>Moderación</h2><p>Las publicaciones con 3 reportes se ocultan hasta que el equipo las revise.</p>
<h2>Bot de ofertas, publicidad y enlaces de afiliado</h2><p>Algunas ofertas las publica automáticamente nuestro bot y el equipo las revisa después. GaleríaK muestra anuncios y usa enlaces de afiliado de Amazon: como Afiliado de Amazon, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables. Si una publicación es patrocinada, se indica claramente.</p>`;

export const PRIVACY_HTML = `<h1>Aviso de privacidad</h1><p><b>Borrador para revisar con un profesional antes de lanzar.</b></p>
<p>GaleríaK usa tu cuenta de Google solo para iniciar sesión. Guardamos tu nombre visible (apodo), tu foto de perfil de Google, tu correo (para la sesión) y lo que publicas.</p>
<p>Usamos servicios de terceros: Supabase (base de datos e inicio de sesión), GitHub Pages (alojamiento), Google AdSense (anuncios, puede usar cookies) y enlaces de afiliado de Amazon.</p>
<p>Puedes pedir el acceso, corrección o eliminación de tus datos escribiendo al correo de contacto del sitio.</p>
<p>Para usar la comunidad debes tener 13 años o más.</p>`;
