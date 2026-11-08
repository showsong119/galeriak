#!/usr/bin/env python3
"""Genera las guías estáticas: content/guias/*.html -> site/guias/<slug>/index.html,
la página índice site/guias/index.html, la lista STATIC_GUIDES en site/index.html y sitemap.xml.
Uso: python3 scripts/gen-guias.py"""
import json, re, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'content/guias', ROOT / 'site/guias'
DATE_ISO, DATE_TXT = '2026-11-08', '8 de noviembre de 2026'
SITE = 'https://galeriakmx.com'

CSS = """:root{--bg:#f4f4f6;--card:#fff;--ink:#17171c;--muted:#6b6b76;--line:#e6e6ec;--brand:#e5317d;--brand-soft:#fde8f1;--blue:#2f5bd8}
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
.cta{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:11px 18px;margin-top:6px}
footer{max-width:820px;margin:8px auto 32px;padding:0 16px;font-size:13px;color:var(--muted);text-align:center}footer a{color:var(--muted)}
"""

def head(title, desc, url, extra=''):
    return f"""<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} | GaleríaK</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:locale" content="es_MX">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/icons/icon-512.png">
<link rel="icon" href="/icons/icon-192.png" type="image/png">
<meta name="theme-color" content="#e5317d">
<!-- AdSense: pega aquí el script de tu cuenta cuando sea aprobada -->
{extra}<style>{CSS}</style>
</head>
<body>
<header class="top"><div class="top-in"><a class="logo" href="/">Galería<b>K</b></a><nav><a href="/guias/">Guías</a><a href="/examen-coreano/">Examen de coreano</a></nav></div></header>
"""

FOOT = """<footer>GaleríaK es una comunidad de fans no oficial. No está afiliada a ninguna agencia, artista ni marca.<br>
<a href="/">Inicio</a> · <a href="/guias/">Guías</a> · <a href="/privacidad/">Política de Privacidad</a> · <a href="/terminos/">Términos y Condiciones</a> · <a href="/#reglas">Reglas</a> · <a href="mailto:galeriakmx@gmail.com">galeriakmx@gmail.com</a></footer>
</body>
</html>
"""

def card(g): return f'<li><a href="/guias/{g["slug"]}/"><b>{html.escape(g["short"])}</b><span>{html.escape(g["desc"])}</span></a></li>'

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
        body = '<h2>'.join(parts[:3]) + '<div class="ad">Publicidad</div>\n\n<h2>' + '<h2>'.join(parts[3:])
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": g['title'], "description": g['desc'],
                     "inLanguage": "es-MX", "datePublished": DATE_ISO, "dateModified": DATE_ISO, "mainEntityOfPage": url,
                     "author": {"@type": "Organization", "name": "Equipo GaleríaK"}, "publisher": {"@type": "Organization", "name": "GaleríaK"}}, ensure_ascii=False)
    others = [o for o in guides if o['slug'] != g['slug']]
    same = [o for o in others if o['cat'] == g['cat']] + [o for o in others if o['cat'] != g['cat']]
    page = head(g['title'], g['desc'], url, f'<script type="application/ld+json">{ld}</script>\n') + f"""<div class="wrap">
<article>
<div class="crumb"><a href="/">Inicio</a> › <a href="/guias/">Guías</a> › {html.escape(g['cat'])}</div>
<span class="cat">{html.escape(g['cat'])}</span>
<h1>{html.escape(g['title'])}</h1>
<p class="meta">Por el equipo de GaleríaK · Actualizado el {DATE_TXT}</p>
<div class="ad">Publicidad</div>
{body}
<div class="ad">Publicidad</div>
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
idx = head('Guías de K-Beauty, K-Pop y coreano', 'Guías en español para cuidar tu piel con K-Beauty, entender el K-pop y aprender coreano: rutinas, ingredientes, hangul, frases y preparación para el TOPIK.', f'{SITE}/guias/') + '<div class="wrap"><article>\n<div class="crumb"><a href="/">Inicio</a> › Guías</div>\n<h1>Guías de K-Beauty, K-Pop y coreano</h1>\n<p class="meta">Guías prácticas en español escritas por el equipo de GaleríaK.</p>\n'
for i, c in enumerate(cats):
    idx += f'<h2>{html.escape(c)}</h2><ul class="list">' + ''.join(card(g) for g in guides if g['cat'] == c) + '</ul>\n'
    if i == 0: idx += '<div class="ad">Publicidad</div>\n'
idx += '<h2>Para comprar en México</h2><ul class="list">' \
       '<li><a href="/#guia-original"><b>Cómo saber si tu cosmético coreano es original</b><span>7 señales para no comprar imitaciones en México</span></a></li>' \
       '<li><a href="/#guia-donde-comprar"><b>Dónde comprar cosmética coreana en México</b><span>Tiendas físicas y en línea con marcas coreanas</span></a></li>' \
       '<li><a href="/#guia-rebajas"><b>Calendario de rebajas de Olive Young</b><span>Cuándo comprar más barato en Corea u Olive Young Global</span></a></li></ul>\n' \
       '<div class="ad">Publicidad</div>\n</article></div>\n' + FOOT
(OUT / 'index.html').write_text(idx)

# Lista para el sitio principal (entre marcadores)
idxf = ROOT / 'site/index.html'; s = idxf.read_text()
arr = 'const STATIC_GUIDES=' + json.dumps([{"u": f'/guias/{g["slug"]}/', "t": g['short'], "d": g['desc']} for g in guides], ensure_ascii=False) + ';'
s = re.sub(r'/\* STATIC_GUIDES:start \*/.*?/\* STATIC_GUIDES:end \*/', lambda m: '/* STATIC_GUIDES:start */' + arr + '/* STATIC_GUIDES:end */', s, flags=re.S)
idxf.write_text(s)

# sitemap
urls = ['/', '/examen-coreano/', '/guias/'] + [f'/guias/{g["slug"]}/' for g in guides] + ['/privacidad/', '/terminos/']
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{DATE_ISO}</lastmod></url>\n' for u in urls) + '</urlset>\n'
(ROOT / 'site/sitemap.xml').write_text(sm)
print(f'{len(guides)} guías generadas')
