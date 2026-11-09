#!/usr/bin/env python3
"""GaleríaK · Ilustraciones tiernas para «Coreano del día».
Lee content/diario/{cola,publicadas}/*.json con el campo opcional
  "ilus": {"ko": "대박!", "rom": "daebak", "es": "¡Increíble!", "motivo": "kdrama"}
y genera site/img/diario/<nombre-del-archivo>.svg (1200x630).
La mascota Bomi (cachorro de tigre con bufanda de colores) es un personaje original de GaleríaK:
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


def bomi(x, y, s=1.0, mood='feliz'):
    """Mascota Bomi: cachorro de tigre redondito (guiño al tigre de la pintura popular coreana)
    con bufanda de franjas de colores (saekdong coreano, que en México recuerda al sarape)."""
    O, OD, W = '#ffa94d', '#f08c00', '#fff8ec'
    mouth = ('<path d="M-16 34q8 10 16 0q8 10 16 0" fill="none" stroke="#3b2f3f" stroke-width="5" stroke-linecap="round"/>'
             if mood == 'feliz' else
             '<ellipse cx="0" cy="38" rx="13" ry="12" fill="#3b2f3f"/><ellipse cx="0" cy="43" rx="8" ry="5" fill="#ff8fab"/>')
    # orden del saekdong (no arcoíris): rosa, amarillo, azul, rojo, verde, blanco
    stripes = ['#f06595', '#fcc419', '#339af0', '#e03131', '#40c057', '#fff']
    band = ''.join(f'<rect x="{-160 + i * 28}" y="-40" width="28" height="140" fill="{stripes[i % 6]}"/>' for i in range(12))
    end = ''.join(f'<rect x="-22" y="{i * 16}" width="44" height="16" fill="{stripes[i % 6]}"/>' for i in range(6))
    fringe = ''.join(f'<path d="M{-18 + i * 9} 96v14" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>' for i in range(5))
    return f'''<g transform="translate({x} {y}) scale({s})">
<ellipse cx="0" cy="168" rx="150" ry="20" fill="#000" opacity=".08"/>
<path d="M118 120c70 0 86-60 54-84" fill="none" stroke="{INK}" stroke-width="30" stroke-linecap="round"/>
<path d="M118 120c70 0 86-60 54-84" fill="none" stroke="{O}" stroke-width="18" stroke-linecap="round"/>
<path d="M160 80l22 4M152 104l22-6" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
<path d="M-120 160c-10-90 30-130 120-130s130 40 120 130z" fill="{O}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>
<ellipse cx="0" cy="120" rx="62" ry="40" fill="{W}"/>
<ellipse cx="-70" cy="158" rx="34" ry="20" fill="{W}" stroke="{INK}" stroke-width="6"/><ellipse cx="70" cy="158" rx="34" ry="20" fill="{W}" stroke="{INK}" stroke-width="6"/>
<circle cx="-118" cy="-118" r="40" fill="{O}" stroke="{INK}" stroke-width="7"/><circle cx="118" cy="-118" r="40" fill="{O}" stroke="{INK}" stroke-width="7"/>
<circle cx="-116" cy="-114" r="20" fill="#ffc9d6"/><circle cx="116" cy="-114" r="20" fill="#ffc9d6"/>
<ellipse cx="0" cy="-20" rx="170" ry="140" fill="{O}" stroke="{INK}" stroke-width="7"/>
<path d="M-22-158q8 22 0 40M0-160v46M22-158q-8 22 0 40" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>
<path d="M-168-30q34 4 46 20M-166 10q30-2 44 10M168-30q-34 4-46 20M166 10q-30-2-44 10" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>
<ellipse cx="0" cy="34" rx="78" ry="56" fill="{W}"/>
<ellipse cx="-62" cy="-28" rx="18" ry="23" fill="{INK}"/><ellipse cx="62" cy="-28" rx="18" ry="23" fill="{INK}"/>
<circle cx="-55" cy="-37" r="7" fill="#fff"/><circle cx="69" cy="-37" r="7" fill="#fff"/>
<ellipse cx="-108" cy="14" rx="24" ry="14" fill="#ff8fab" opacity=".8"/><ellipse cx="108" cy="14" rx="24" ry="14" fill="#ff8fab" opacity=".8"/>
<path d="M-12 10h24l-12 12z" fill="#e8590c" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<g>{mouth}</g>
<g transform="translate(0 92)">
<g transform="translate(70 18) rotate(-10)"><clipPath id="se"><rect x="-22" y="0" width="44" height="96" rx="8"/></clipPath><g clip-path="url(#se)">{end}</g><rect x="-22" y="0" width="44" height="96" rx="8" fill="none" stroke="{INK}" stroke-width="5"/>{fringe}</g>
<clipPath id="sc"><path d="M-150-16Q0 34 150-16L150 18Q0 68-150 18Z"/></clipPath>
<g clip-path="url(#sc)">{band}</g><path d="M-150-16Q0 34 150-16L150 18Q0 68-150 18Z" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
</g>
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
{bomi(270, 345, .95, 'wow' if ko.endswith('!') else 'feliz')}
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
