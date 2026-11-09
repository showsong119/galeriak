#!/usr/bin/env python3
"""GaleríaK · Ilustraciones tiernas para «Coreano del día».
Lee content/diario/{cola,publicadas}/*.json con el campo opcional
  "ilus": {"ko": "대박!", "rom": "daebak", "es": "¡Increíble!", "motivo": "kdrama"}
y genera site/img/diario/<nombre-del-archivo>.svg (1200x630).
La mascota Tteoki (un tteok redondito) es un personaje original de GaleríaK:
no se usan fotos, idols ni personajes de terceros.
Uso: python3 scripts/gen-diario-ilus.py
"""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'site/img/diario'
FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',Inter,Arial,sans-serif"

# fondo A, fondo B, color principal, acento
PAL = {
    'kdrama':      ('#ffe8f0', '#e9e4ff', '#d6336c', '#7048e8'),
    'kpop':        ('#efe6ff', '#ffe3f3', '#7048e8', '#e64980'),
    'cultura':     ('#e3f4ff', '#fff3d9', '#1c7ed6', '#f08c00'),
    'comida':      ('#fff1dc', '#ffe3e3', '#e8590c', '#e03131'),
    'expresiones': ('#ffe3ec', '#fff5d6', '#e64980', '#f59f00'),
    'hangul':      ('#e6fcf5', '#e7f5ff', '#0c8599', '#1c7ed6'),
}
INK = '#3b2f3f'


def tteoki(x, y, s=1.0, mood='feliz'):
    """Mascota: tteok blanco con mejillas rosas y un brote en la cabeza."""
    mouth = ('<path d="M-22 22q11 14 22 0q11 14 22 0" fill="none" stroke="#3b2f3f" stroke-width="6" stroke-linecap="round"/>'
             if mood == 'feliz' else
             '<ellipse cx="0" cy="26" rx="16" ry="14" fill="#3b2f3f"/><ellipse cx="0" cy="32" rx="9" ry="6" fill="#ff8fab"/>')
    return f'''<g transform="translate({x} {y}) scale({s})">
<ellipse cx="0" cy="150" rx="150" ry="22" fill="#000" opacity=".08"/>
<path d="M-48-130q-30-40 6-62q22 22-6 62z" fill="#69db7c" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M-40-132q10-48 52-44q-6 38-52 44z" fill="#8ce99a" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M-158 40c0-110 70-172 158-172s158 62 158 172c0 70-62 104-158 104s-158-34-158-104z" fill="#fffaf2" stroke="{INK}" stroke-width="7"/>
<path d="M-120 70c40 30 200 30 240 0" fill="none" stroke="#f3e3d3" stroke-width="10" stroke-linecap="round"/>
<ellipse cx="-58" cy="-6" rx="17" ry="22" fill="{INK}"/><ellipse cx="58" cy="-6" rx="17" ry="22" fill="{INK}"/>
<circle cx="-52" cy="-14" r="6" fill="#fff"/><circle cx="64" cy="-14" r="6" fill="#fff"/>
<ellipse cx="-100" cy="30" rx="26" ry="15" fill="#ffa8c5" opacity=".85"/><ellipse cx="100" cy="30" rx="26" ry="15" fill="#ffa8c5" opacity=".85"/>
<g transform="translate(0 0)">{mouth}</g>
<ellipse cx="-160" cy="40" rx="26" ry="20" fill="#fffaf2" stroke="{INK}" stroke-width="6" transform="rotate(-30 -160 40)"/>
<ellipse cx="164" cy="-10" rx="26" ry="20" fill="#fffaf2" stroke="{INK}" stroke-width="6" transform="rotate(-60 164 -10)"/>
</g>'''


def sparkle(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-20C2-6 6-2 20 0 6 2 2 6 0 20-2 6-6 2-20 0-6-2-2-6 0-20z" fill="{col}" opacity="{op}"/>'


def heart(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 18C-30-4-30-30-12-32C-4-33 0-26 0-22C0-26 4-33 12-32C30-30 30-4 0 18z" fill="{col}" opacity="{op}"/>'


def note(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})" fill="{col}"><rect x="10" y="-60" width="7" height="62" rx="3"/><path d="M17-60l34 10v14l-34-10z"/><ellipse cx="2" cy="4" rx="16" ry="12" transform="rotate(-20 2 4)"/></g>'


def prop(motivo, c1, c2):
    if motivo == 'kpop':   # barra de luz genérica + notas
        return (f'<g transform="translate(470 470) rotate(18)"><rect x="-9" y="0" width="18" height="110" rx="9" fill="{INK}"/>'
                f'<circle cx="0" cy="-26" r="40" fill="#fff" stroke="{INK}" stroke-width="6"/><circle cx="0" cy="-26" r="24" fill="{c2}" opacity=".7"/></g>'
                + note(110, 170, 1.1, c1) + note(80, 470, .8, c2))
    if motivo == 'kdrama':  # claqueta
        return (f'<g transform="translate(455 470) rotate(-10)"><rect x="-60" y="-20" width="120" height="80" rx="10" fill="{INK}"/>'
                f'<rect x="-60" y="-46" width="120" height="24" rx="6" fill="#fff" stroke="{INK}" stroke-width="5"/>'
                f'<path d="M-40-46l-14 24M-10-46l-14 24M20-46l-14 24M50-46l-14 24" stroke="{INK}" stroke-width="6"/></g>'
                + heart(110, 170, 1.4, c1, .8) + heart(80, 470, 1, c2, .7))
    if motivo == 'comida':  # tazón de arroz con palillos
        return (f'<g transform="translate(470 500)"><path d="M-30-70l90-50M-20-60l96-36" stroke="#c97b3d" stroke-width="9" stroke-linecap="round"/>'
                f'<ellipse cx="0" cy="-30" rx="78" ry="34" fill="#fff" stroke="{INK}" stroke-width="6"/>'
                f'<path d="M-78-30c0 50 34 80 78 80s78-30 78-80" fill="{c1}" stroke="{INK}" stroke-width="6"/>'
                f'<path d="M-40-6c20 10 60 10 80 0" stroke="#fff" stroke-width="7" fill="none" opacity=".7" stroke-linecap="round"/></g>'
                f'<path d="M100 180c-10-20 10-30 0-50M130 180c-10-20 10-30 0-50" stroke="{c2}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>')
    if motivo == 'hangul':  # bloques de letras
        out = ''
        for i, (ch, col) in enumerate([('ㄱ', c1), ('ㅏ', c2), ('ㄴ', c1)]):
            out += (f'<g transform="translate({400 + i * 58} {505 - (i % 2) * 24}) rotate({-8 + i * 8})"><rect x="-26" y="-26" width="52" height="52" rx="10" fill="#fff" stroke="{INK}" stroke-width="5"/>'
                    f'<text y="14" text-anchor="middle" font-family="{FONT}" font-size="36" font-weight="900" fill="{col}">{ch}</text></g>')
        return out + sparkle(110, 170, 1.3, c2, .8)
    if motivo == 'expresiones':
        return heart(470, 470, 2.2, c1, .9) + heart(410, 520, 1.2, c2, .8) + sparkle(110, 170, 1.3, c2, .8)
    # cultura: abanico sencillo
    return (f'<g transform="translate(470 520)"><path d="M0 0L-80-90A120 120 0 0 1 80-90Z" fill="{c2}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M0 0L-40-112M0 0L0-120M0 0L40-112" stroke="{INK}" stroke-width="4" opacity=".5"/><circle r="9" fill="{INK}"/></g>'
            + sparkle(110, 170, 1.3, c1, .8))


def fit(text, width, base, minimum, per_char):
    """Tamaño de letra para que el texto quepa en el ancho dado."""
    size = base
    while size > minimum and len(text) * size * per_char > width:
        size -= 2
    return size


def svg(ilus, numero=''):
    motivo = ilus.get('motivo', 'cultura')
    a, b, c1, c2 = PAL.get(motivo, PAL['cultura'])
    ko, rom, es = ilus['ko'], ilus.get('rom', ''), ilus.get('es', '')
    ko_size = fit(ko, 520, 110, 52, .98)
    lab = f'Coreano del día #{numero}' if numero else 'Coreano del día'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="{escape(lab)}: {escape(ko)} ({escape(rom)}) — {escape(es)}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".10"/></filter>
<pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="#fff" opacity=".55"/></pattern></defs>
<rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#dots)"/>
{sparkle(1110, 80, 1.2, c2, .7)}{sparkle(560, 570, .9, c1, .5)}{sparkle(60, 300, .8, c2, .6)}
{prop(motivo, c1, c2)}
{tteoki(270, 370, 1.0, 'wow' if ko.endswith('!') else 'feliz')}
<g filter="url(#sh)"><path d="M560 96h560a40 40 0 0 1 40 40v300a40 40 0 0 1-40 40H600a40 40 0 0 1-40-40V330l-62-20 62-40V136a40 40 0 0 1 40-40z" fill="#fff" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/></g>
<rect x="600" y="122" width="{len(lab) * 15 + 36}" height="44" rx="22" fill="{c1}"/>
<text x="618" y="152" font-family="{FONT}" font-size="24" font-weight="800" fill="#fff">{escape(lab)}</text>
<text x="860" y="{290 if rom else 320}" text-anchor="middle" font-family="{FONT}" font-size="{ko_size}" font-weight="900" fill="{INK}">{escape(ko)}</text>
{f'<text x="860" y="350" text-anchor="middle" font-family="{FONT}" font-size="36" font-weight="600" fill="#868e96">{escape(rom)}</text>' if rom else ''}
<text x="860" y="418" text-anchor="middle" font-family="{FONT}" font-size="{fit(es, 500, 42, 26, .55)}" font-weight="800" fill="{c1}">{escape(es)}</text>
<text x="1168" y="606" text-anchor="end" font-family="{FONT}" font-size="24" font-weight="900" fill="{INK}" opacity=".55">Galería<tspan fill="{c1}">K</tspan></text>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for d in ('cola', 'publicadas'):
        for f in sorted((ROOT / 'content/diario' / d).glob('*.json')):
            l = json.loads(f.read_text(encoding='utf-8'))
            if not l.get('ilus'):
                continue
            num = f.stem.split('-')[0].lstrip('0')
            (OUT / f'{f.stem}.svg').write_text(svg(l['ilus'], num), encoding='utf-8')
            n += 1
    print(f'✅ {n} ilustraciones en site/img/diario/')


if __name__ == '__main__':
    main()
