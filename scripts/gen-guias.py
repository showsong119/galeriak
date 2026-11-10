#!/usr/bin/env python3
"""Genera las guías estáticas: content/guias/*.html -> site/guias/<slug>/index.html,
la página índice site/guias/index.html, la lista STATIC_GUIDES en site/index.html y sitemap.xml.
Uso: python3 scripts/gen-guias.py"""
import json, re, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'content/guias', ROOT / 'site/guias'
DATE_ISO, DATE_TXT = '2026-11-08', '8 de noviembre de 2026'
SITE = 'https://galeriakmx.com'

CSS = """:root{--bg:#f4f4f6;--card:#fff;--ink:#17171c;--muted:#6b6b76;--line:#e6e6ec;--brand:#cc1f68;--brand-soft:#fde8f1;--blue:#2f5bd8}
*{box-sizing:border-box}html,body{margin:0}
body{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink);line-height:1.7;font-size:17px}
a{color:var(--blue)}
.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.top-in{max-width:820px;margin:0 auto;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.logo{font-weight:800;font-size:20px;letter-spacing:-.5px;text-decoration:none;color:var(--ink)}.logo b{color:var(--brand)}
.top nav{display:flex;gap:14px;font-size:14px;font-weight:600}.top nav a{color:var(--ink);text-decoration:none}
.wrap{max-width:820px;margin:0 auto;padding:16px}
article,.box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px 26px}
@media (max-width:600px){article,.box{padding:22px 18px}body{font-size:16px}}
.crumb{font-size:13px;color:var(--muted);margin:4px 0 12px}.crumb a{color:var(--muted)}
.cat{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);background:var(--brand-soft);border-radius:999px;padding:3px 10px}
h1{font-size:clamp(26px,5vw,34px);line-height:1.2;letter-spacing:-.5px;margin:10px 0 6px;text-wrap:balance}
h2{font-size:22px;line-height:1.3;margin:30px 0 8px;text-wrap:balance}
h3{font-size:18px;margin:20px 0 6px}
p,li{max-width:70ch}
li{margin:4px 0}
.meta{color:var(--muted);font-size:14px;margin:0 0 18px}
.ko{font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif}
.big{font-size:19px;line-height:1.9}
.note{font-size:14px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px;margin-top:24px}
.ad{background:repeating-linear-gradient(45deg,#fafafa,#fafafa 8px,#f1f1f4 8px,#f1f1f4 16px);border:1px dashed #cfcfd8;border-radius:10px;display:grid;place-items:center;color:#9a9aa6;font-size:11px;letter-spacing:.1em;text-transform:uppercase;min-height:100px;margin:22px 0}
.more{margin-top:16px}.more h2{margin-top:0;font-size:19px}
.list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (max-width:600px){.list{grid-template-columns:minmax(0,1fr)}}
.list a{display:block;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--ink);background:#fff;height:100%}
.list a b{display:block;font-size:15px;line-height:1.35}.list a span{display:block;font-size:13px;color:var(--muted);margin-top:4px;line-height:1.45}
.hero{margin:6px 0 18px}.hero img{display:block;width:100%;height:auto;border-radius:16px;aspect-ratio:1200/630;background:#fde8f1}
.list a img{display:block;width:100%;height:auto;aspect-ratio:1200/630;border-radius:8px;margin-bottom:8px;background:#f4f4f6}
.top nav a.exam{background:#2f5bd8;color:#fff;border-radius:999px;padding:3px 12px;font-weight:800}.top nav a.exam em{font-style:normal;background:#ffd400;color:#17171c;border-radius:999px;padding:0 6px;margin-left:4px;font-size:11px}
.exam-banner{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:center;background:#e8efff;border:2px solid #2f5bd8;border-radius:16px;padding:16px;margin:18px 0;text-decoration:none;color:#17171c}
.exam-banner img{width:100%;height:auto;border-radius:12px}.exam-banner b{display:block;font-size:22px;line-height:1.25;color:#2f5bd8}.exam-banner span{display:block;font-size:15px;margin:6px 0 10px;color:#33333d}.exam-banner i{display:inline-block;font-style:normal;background:#c2410c;color:#fff;font-weight:800;border-radius:999px;padding:8px 16px}
@media (max-width:600px){.exam-banner{grid-template-columns:1fr}}
.cta{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:11px 18px;margin-top:6px}
.faq details{border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:8px 0;background:#fff}.faq summary{font-weight:700;cursor:pointer}.faq p{margin:8px 0 0}
footer{max-width:820px;margin:8px auto 32px;padding:0 16px;font-size:13px;color:var(--muted);text-align:center}footer a{color:var(--muted)}
"""

def head(title, desc, url, extra='', og='/icons/icon-512.png', seo=None):
    return f"""<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(seo or title)} | GaleríaK</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:locale" content="es_MX">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}{og}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon-192.png" type="image/png">
<meta name="theme-color" content="#cc1f68">
<!-- AdSense: pega aquí el script de tu cuenta cuando sea aprobada -->
{extra}<style>{CSS}</style>
</head>
<body>
<header class="top"><div class="top-in"><a class="logo" href="/">Galería<b>K</b></a><nav><a href="/guias/">Guías</a><a class="exam" href="/examen-coreano/">📝 Examen gratis<em>GRATIS</em></a></nav></div></header>
"""

VISIT_JS = "<script>/* contador de visitas anónimo (sin robots ni equipo) */(function(){try{if(navigator.webdriver||/bot|crawl|spider|slurp|lighthouse|headless|inspectiontool|pagespeed|preview|facebookexternalhit|whatsapp|telegram/i.test(navigator.userAgent||'')||localStorage.getItem('gk_no_contar')==='1')return;var k='gk_vid',v=localStorage.getItem(k);if(!v){v=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c=='x'?r:(r&3|8)).toString(16)}));localStorage.setItem(k,v)}fetch('https://pimuwxsazuzmgwhbrzbx.supabase.co/rest/v1/rpc/gk_registrar_visita',{method:'POST',headers:{'apikey':'sb_publishable_njWRhiyl0oZOeJh6m-Zdyw_5yPgHiNn','Content-Type':'application/json'},body:JSON.stringify({p_visitante:v}),keepalive:true}).catch(function(){})}catch(e){}})();</script>"
FOOT = """<footer>GaleríaK es una comunidad de fans no oficial. No está afiliada a ninguna agencia, artista ni marca.<br>
<a href="/">Inicio</a> · <a href="/guias/">Guías</a> · <a href="/acerca/">Acerca de</a> · <a href="/contacto/">Contacto</a> · <a href="/privacidad/">Política de Privacidad</a> · <a href="/terminos/">Términos y Condiciones</a> · <a href="/#reglas">Reglas</a> · <a href="mailto:galeriakmx@gmail.com">galeriakmx@gmail.com</a></footer>
""" + VISIT_JS + """
</body>
</html>
"""

IMG = ROOT / 'site/img'
def img_of(slug): return f'/img/guias/{slug}.svg' if (IMG / 'guias' / f'{slug}.svg').exists() else ''
def og_of(slug): return f'/img/og/{slug}.jpg' if (IMG / 'og' / f'{slug}.jpg').exists() else '/icons/icon-512.png'
def card(g):
    im = img_of(g['slug'])
    pic = f'<img src="{im}" alt="" loading="lazy" width="1200" height="630">' if im else ''
    return f'<li><a href="/guias/{g["slug"]}/">{pic}<b>{html.escape(g["short"])}</b><span>{html.escape(g["desc"])}</span></a></li>'
EXAM_BANNER = ('<a class="exam-banner" href="/examen-coreano/"><div><b>Examen de coreano GRATIS</b>'
               '<span>30 preguntas estilo TOPIK, nivel del 1 al 6 y explicación de cada respuesta en español. Sin crear cuenta.</span>'
               '<i>Hacer el examen →</i></div><img src="/img/examen.svg" alt="Examen de coreano gratis" loading="lazy" width="1200" height="630"></a>')

MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
def fecha_txt(iso):
    y, m, d = iso.split('-'); return f'{int(d)} de {MESES[int(m)-1]} de {y}'

guides = []
for f in sorted(SRC.glob('*.html')):
    raw = f.read_text()
    m = re.match(r'<!--\s*(\{.*?\})\s*-->\n', raw, re.S)
    meta = json.loads(m.group(1)); meta['slug'] = f.stem; meta['body'] = raw[m.end():].strip()
    guides.append(meta)
guides.sort(key=lambda g: g['order'])

for g in guides:
    url = f'{SITE}/guias/{g["slug"]}/'
    body = g['body']
    # anuncio después del segundo bloque <h2> (mitad del artículo)
    parts = body.split('<h2>')
    if len(parts) > 3:
        body = '<h2>'.join(parts[:3]) + '\n<h2>' + '<h2>'.join(parts[3:])
    upd = g.get('updated', DATE_ISO); pub = g.get('published', DATE_ISO)
    upd_txt = fecha_txt(upd)
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": g['title'], "description": g['desc'],
                     "inLanguage": "es-MX", "datePublished": pub, "dateModified": upd, "mainEntityOfPage": url,
                     "author": {"@type": "Organization", "name": "Equipo GaleríaK"}, "publisher": {"@type": "Organization", "name": "GaleríaK"}}, ensure_ascii=False)
    faq = g.get('faq') or []
    faq_html = ''
    if faq:
        ld += '</script>\n<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}, ensure_ascii=False)
        faq_html = '<h2>Preguntas frecuentes</h2>\n<div class="faq">' + ''.join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in faq) + '</div>\n'
    others = [o for o in guides if o['slug'] != g['slug']]
    same = [o for o in others if o['cat'] == g['cat']] + [o for o in others if o['cat'] != g['cat']]
    im = img_of(g['slug'])
    hero = f'<figure class="hero"><img src="{im}" alt="{html.escape(g["short"])}" width="1200" height="630"></figure>' if im else ''
    page = head(g['title'], g['desc'], url, f'<script type="application/ld+json">{ld}</script>\n', og_of(g['slug']), g.get('seo')) + f"""<div class="wrap">
<article>
<div class="crumb"><a href="/">Inicio</a> › <a href="/guias/">Guías</a> › {html.escape(g['cat'])}</div>
<span class="cat">{html.escape(g['cat'])}</span>
<h1>{html.escape(g['title'])}</h1>
<p class="meta">Por el equipo de GaleríaK · Actualizado el {upd_txt}</p>
{hero}
{body}
{faq_html}{EXAM_BANNER}
</article>
<section class="box more"><h2>Más guías</h2><ul class="list">{''.join(card(o) for o in same[:4])}</ul>
<p><a class="cta" href="/examen-coreano/">Haz el examen de coreano gratis</a></p></section>
</div>
""" + FOOT
    d = OUT / g['slug']; d.mkdir(parents=True, exist_ok=True); (d / 'index.html').write_text(page)

# Índice de guías
cats = []
for g in guides:
    if g['cat'] not in cats: cats.append(g['cat'])
idx = head('Guías de K-Beauty, K-Pop y coreano', 'Guías en español para cuidar tu piel con K-Beauty, entender el K-pop y aprender coreano: rutinas, ingredientes, hangul, frases y preparación para el TOPIK.', f'{SITE}/guias/') + '<div class="wrap"><article>\n<div class="crumb"><a href="/">Inicio</a> › Guías</div>\n<h1>Guías de K-Beauty, K-Pop y coreano</h1>\n<p class="meta">Guías prácticas en español escritas por el equipo de GaleríaK.</p>\n' + EXAM_BANNER + '\n'
for i, c in enumerate(cats):
    idx += f'<h2>{html.escape(c)}</h2><ul class="list">' + ''.join(card(g) for g in guides if g['cat'] == c) + '</ul>\n'
idx += '<h2>Para comprar en México</h2><ul class="list">' \
       '<li><a href="/#guia-original"><b>Cómo saber si tu cosmético coreano es original</b><span>7 señales para no comprar imitaciones en México</span></a></li>' \
       '<li><a href="/#guia-donde-comprar"><b>Dónde comprar cosmética coreana en México</b><span>Tiendas físicas y en línea con marcas coreanas</span></a></li>' \
       '<li><a href="/#guia-rebajas"><b>Calendario de rebajas de Olive Young</b><span>Cuándo comprar más barato en Corea u Olive Young Global</span></a></li></ul>\n' \
       '</article></div>\n' + FOOT
(OUT / 'index.html').write_text(idx)

# Lista para el sitio principal (entre marcadores)
idxf = ROOT / 'site/index.html'; s = idxf.read_text()
arr = 'const STATIC_GUIDES=' + json.dumps([{"u": f'/guias/{g["slug"]}/', "t": g['short'], "d": g['desc'], "i": img_of(g['slug'])} for g in guides], ensure_ascii=False) + ';'
s = re.sub(r'/\* STATIC_GUIDES:start \*/.*?/\* STATIC_GUIDES:end \*/', lambda m: '/* STATIC_GUIDES:start */' + arr + '/* STATIC_GUIDES:end */', s, flags=re.S)
idxf.write_text(s)

# Acerca de y Contacto (páginas de confianza: quién está detrás del sitio y cómo contactarlo)
PAGES = {
 'acerca': ('Acerca de GaleríaK', 'Quiénes somos, qué encontrarás en GaleríaK, cómo moderamos la comunidad y cómo se financia el sitio.', '''<p class="big">GaleríaK es una comunidad independiente en español para fans de la cosmética coreana (K-Beauty), el K-Pop, los K-Dramas y la cultura coreana en México y Latinoamérica.</p>
<h2>Qué encontrarás</h2>
<ul>
<li><strong>Galerías por tema:</strong> skincare, maquillaje, reseñas, ofertas, grupos de K-Pop, K-Dramas, aprender coreano y viajes. Cualquier persona puede leer; para publicar y comentar se necesita una cuenta gratuita.</li>
<li><strong>Guías prácticas</strong> escritas por el equipo: rutinas de skincare, protector solar, ingredientes, hangul, partículas, números y más. <a href="/guias/">Ver todas las guías</a>.</li>
<li><strong>Examen de coreano gratis</strong> estilo TOPIK, con 30 preguntas de un banco de 180 y explicaciones en español. <a href="/examen-coreano/">Hacer el examen</a>.</li>
</ul>
<h2>Cómo cuidamos la comunidad</h2>
<p>Tenemos <a href="/#reglas">reglas</a> claras: respeto entre fandoms, nada de datos personales, nada de contenido sexual o violento y respeto a los derechos de autor. El equipo de GaleríaK revisa los reportes, y en algunas galerías hay líderes y managers voluntarios que ayudan a moderar. Las decisiones finales sobre eliminar contenido o suspender cuentas las toma el equipo.</p>
<h2>Cómo escribimos las guías</h2>
<p>Las guías se basan en información general y fuentes públicas confiables, se revisan antes de publicarse y se actualizan cuando algo cambia. No sustituyen la opinión de un dermatólogo, médico o profesional: si tienes un problema de salud o de la piel, consulta a un especialista.</p>
<h2>Cómo se financia GaleríaK</h2>
<p>GaleríaK es gratis. Para mantener el sitio mostramos anuncios (Google AdSense) y algunas ofertas pueden incluir enlaces de afiliado; cuando una publicación es patrocinada se indica claramente. Los anuncios no influyen en lo que publican los usuarios ni en el contenido de las guías.</p>
<h2>Aviso importante</h2>
<p>GaleríaK es una comunidad de fans <strong>no oficial</strong>. No está afiliada a ninguna agencia, artista, marca ni tienda. Los nombres de grupos y marcas se usan solo para identificar el tema de cada galería.</p>
<p>¿Dudas o sugerencias? Visita la página de <a href="/contacto/">contacto</a>.</p>'''),
 'contacto': ('Contacto', 'Cómo comunicarte con el equipo de GaleríaK: correo, mensajes dentro del sitio y solicitudes de retiro de contenido.', '''<p class="big">¿Tienes una duda, una sugerencia o encontraste un problema? Escríbenos.</p>
<h2>Correo</h2>
<p><a href="mailto:galeriakmx@gmail.com"><strong>galeriakmx@gmail.com</strong></a> — intentamos responder en un máximo de 3 días hábiles.</p>
<h2>Mensajes dentro del sitio</h2>
<p>Si tienes cuenta, puedes escribirnos desde <a href="/#mensajes">Mensajes</a>. Solo tú y el equipo de GaleríaK pueden leer esa conversación.</p>
<h2>¿Sobre qué nos puedes escribir?</h2>
<ul>
<li><strong>Retiro de contenido</strong> por derechos de autor, derechos de imagen o datos personales: indica el enlace exacto y por qué tienes derecho a pedirlo. Ver el procedimiento en los <a href="/terminos/#derechos">Términos y Condiciones</a>.</li>
<li><strong>Tus datos personales</strong> (acceso, rectificación, cancelación u oposición): ver la <a href="/privacidad/">Política de Privacidad</a>.</li>
<li><strong>Errores en una guía o en el examen</strong>: dinos la página y qué está mal.</li>
<li><strong>Nuevas galerías</strong>: también puedes pedirlas en la galería <a href="/#g-solicitudes">Solicitar galería</a>.</li>
<li><strong>Publicidad o colaboraciones</strong> con marcas o tiendas.</li>
</ul>
<p>Para reportar una publicación o comentario, lo más rápido es usar el botón <strong>🚩 Reportar</strong> que aparece en cada uno.</p>'''),
}
for slug, (title, desc, body) in PAGES.items():
    d = ROOT / 'site' / slug; d.mkdir(parents=True, exist_ok=True)
    (d / 'index.html').write_text(head(title, desc, f'{SITE}/{slug}/') + f'<div class="wrap"><article>\n<div class="crumb"><a href="/">Inicio</a> › {html.escape(title)}</div>\n<h1>{html.escape(title)}</h1>\n<p class="meta">Actualizado el {DATE_TXT}</p>\n{body}\n</article></div>\n' + FOOT)

# sitemap
LAST = max([DATE_ISO] + [g.get('updated', DATE_ISO) for g in guides])
urls = [('/', LAST), ('/examen-coreano/', LAST), ('/guias/', LAST)] + [(f'/guias/{g["slug"]}/', g.get('updated', DATE_ISO)) for g in guides] + [(u, DATE_ISO) for u in ['/acerca/', '/contacto/', '/privacidad/', '/terminos/']]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{d}</lastmod></url>\n' for u, d in urls) + '</urlset>\n'
(ROOT / 'site/sitemap.xml').write_text(sm)
print(f'{len(guides)} guías generadas')
