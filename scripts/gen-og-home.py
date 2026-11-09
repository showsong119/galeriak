#!/usr/bin/env python3
"""GaleríaK · Imagen para compartir la portada (og:image) con Bomi y Dali.
Genera site/img/og/home.svg; luego se convierte a JPG con scripts/render-og-home.cjs.
Uso: python3 scripts/gen-og-home.py"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ilus', ROOT / 'scripts/gen-diario-ilus.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3ec"/><stop offset="1" stop-color="#fff3d9"/></linearGradient>
<pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="#fff" opacity=".6"/></pattern></defs>
<rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#dots)"/>
{m.sparkle(80, 90, 1.2, '#cc1f68', .7)}{m.sparkle(1120, 80, 1.1, '#f59f00', .8)}{m.heart(1110, 560, 1.4, '#f06595', .8)}
<g transform="translate(860 410) scale(.95)">{m.tigre()}</g>
<g transform="translate(1065 420) scale(.86) scale(-1 1)">{m.conejo()}</g>
<text x="70" y="210" font-family="{m.FONT}" font-size="104" font-weight="900" fill="{m.INK}">Galería<tspan fill="#cc1f68">K</tspan></text>
<text x="74" y="290" font-family="{m.FONT}" font-size="40" font-weight="800" fill="{m.INK}">K-Beauty · K-Pop · K-Dramas</text>
<text x="74" y="345" font-family="{m.FONT}" font-size="34" font-weight="700" fill="#cc1f68">Tu comunidad de cultura coreana en México</text>
<g font-family="{m.FONT}" font-size="26" font-weight="700" fill="{m.INK}">
<rect x="70" y="400" width="430" height="54" rx="27" fill="#fff" stroke="{m.INK}" stroke-width="4"/><text x="96" y="436">📝 Examen de coreano gratis</text>
<rect x="70" y="470" width="430" height="54" rx="27" fill="#fff" stroke="{m.INK}" stroke-width="4"/><text x="96" y="506">📚 Coreano del día</text>
</g>
</svg>
'''
(ROOT / 'site/img/og/home.svg').write_text(svg, encoding='utf-8')
print('✅ site/img/og/home.svg')
