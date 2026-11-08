#!/usr/bin/env python3
"""Pone el código de AdSense en el <head> de TODAS las páginas del sitio y crea ads.txt.
Uso: python3 scripts/set-adsense.py ca-pub-1234567890123456
- Reemplaza el comentario '<!-- AdSense: ... -->' o, si no existe, lo inserta antes de </head>.
- En el examen de coreano también llena ADS.client para activar sus espacios.
- Repetirlo con el mismo ID no duplica nada."""
import re, sys, pathlib
pub = (sys.argv[1] if len(sys.argv) > 1 else '').strip()
if not re.fullmatch(r'ca-pub-\d{10,20}', pub): sys.exit('Uso: set-adsense.py ca-pub-XXXXXXXXXXXXXXXX')
ROOT = pathlib.Path(__file__).resolve().parent.parent
tag = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={pub}" crossorigin="anonymous"></script>'
n = 0
for f in sorted((ROOT / 'site').rglob('*.html')):
    s = f.read_text(); o = s
    s = re.sub(r'<script async src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=[^"]+" crossorigin="anonymous"></script>\n?', '', s)
    s = re.sub(r'<!-- AdSense:[^>]*-->\n?(<!-- <script async src="https://pagead2[^>]*></script> -->\n?)?', '', s)
    if 'examen-coreano' in str(f):
        s = re.sub(r'const ADS=\{client:"[^"]*"', f'const ADS={{client:"{pub}"', s)
    else:
        s = s.replace('</head>', tag + '\n</head>', 1)
    if s != o: f.write_text(s); n += 1
(ROOT / 'site/ads.txt').write_text(f'google.com, {pub.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n')
print(f'AdSense {pub}: {n} páginas actualizadas + site/ads.txt')
