#!/usr/bin/env python3
"""GaleríaK · Ilustraciones tiernas para «Coreano del día».
Lee content/diario/{cola,publicadas}/*.json con el campo opcional
  "ilus": {"ko": "대박!", "rom": "daebak", "es": "¡Increíble!", "motivo": "kdrama"}
y genera site/img/diario/<nombre-del-archivo>.svg (1200x630).
Las mascotas Bomi (봄이, cachorro de tigre) y Dali (달이, conejita de la luna) son personajes originales de GaleríaK:
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


SAEK = ['#f06595', '#fcc419', '#339af0', '#e03131', '#40c057', '#fff']


def eyes(dx, y, r=22, ink=INK):
    """반짝이는 큰 눈 두 개 (하이라이트 2개)."""
    out = ''
    for x in (-dx, dx):
        out += (f'<ellipse cx="{x}" cy="{y}" rx="{r * .82}" ry="{r}" fill="{ink}"/>'
                f'<circle cx="{x + r * .28}" cy="{y - r * .38}" r="{r * .36}" fill="#fff"/>'
                f'<circle cx="{x - r * .3}" cy="{y + r * .35}" r="{r * .16}" fill="#fff"/>')
    return out


def cheeks(dx, y, col='#ff8fab', rx=20):
    return f'<ellipse cx="{-dx}" cy="{y}" rx="{rx}" ry="{rx * .55}" fill="{col}" opacity=".75"/><ellipse cx="{dx}" cy="{y}" rx="{rx}" ry="{rx * .55}" fill="{col}" opacity=".75"/>'


def smile(y, w=10):
    return f'<path d="M{-w} {y}q{w / 2} {w * .8} {w} 0q{w / 2} {w * .8} {w} 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'


def saek_band(w, h, rx, cid):
    n = int(w / 18) + 2
    stripes = ''.join(f'<rect x="{-w / 2 + i * 18}" y="{-h / 2}" width="18" height="{h}" fill="{SAEK[i % 6]}"/>' for i in range(n))
    return (f'<clipPath id="{cid}"><rect x="{-w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{rx}"/></clipPath>'
            f'<g clip-path="url(#{cid})">{stripes}</g><rect x="{-w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{rx}" fill="none" stroke="{INK}" stroke-width="5"/>')


def tigre():
    O, W = '#ffa94d', '#fff8ec'
    return f'''
<ellipse cx="0" cy="150" rx="95" ry="14" fill="#000" opacity=".08"/>
<ellipse cx="0" cy="105" rx="78" ry="58" fill="{O}" stroke="{INK}" stroke-width="6"/>
<ellipse cx="-40" cy="150" rx="26" ry="15" fill="{W}" stroke="{INK}" stroke-width="5"/><ellipse cx="40" cy="150" rx="26" ry="15" fill="{W}" stroke="{INK}" stroke-width="5"/>
<path d="M70 120c40 0 50-34 30-50" fill="none" stroke="{INK}" stroke-width="20" stroke-linecap="round"/><path d="M70 120c40 0 50-34 30-50" fill="none" stroke="{O}" stroke-width="10" stroke-linecap="round"/>
<circle cx="-92" cy="-92" r="30" fill="{O}" stroke="{INK}" stroke-width="6"/><circle cx="92" cy="-92" r="30" fill="{O}" stroke="{INK}" stroke-width="6"/>
<circle cx="-90" cy="-89" r="15" fill="#ffc9d6"/><circle cx="90" cy="-89" r="15" fill="#ffc9d6"/>
<ellipse cx="0" cy="-12" rx="135" ry="112" fill="{O}" stroke="{INK}" stroke-width="6"/>
<path d="M-16-120q6 16 0 30M0-122v34M16-120q-6 16 0 30" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M-134-14q24 2 34 14M134-14q-24 2-34 14" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
<ellipse cx="0" cy="38" rx="50" ry="36" fill="{W}"/>
{eyes(52, -10, 25)}{cheeks(88, 26)}
<path d="M-9 22h18l-9 9z" fill="#e8590c"/>{smile(38, 9)}
<g transform="translate(52 116) rotate(-10)">{saek_band(26, 52, 6, 'c1b')}</g>
<g transform="translate(0 96)">{saek_band(160, 26, 13, 'c1')}</g>'''


def conejo():
    W = '#fffdf8'
    pouch = ''.join(f'<rect x="{-30 + i * 12}" y="0" width="12" height="40" fill="{SAEK[i % 6]}"/>' for i in range(5))
    return f'''
<path d="M120-70a80 80 0 1 1-40-110a64 64 0 1 0 40 110z" fill="#ffe066" opacity=".55"/>
<ellipse cx="0" cy="150" rx="95" ry="14" fill="#000" opacity=".08"/>
<ellipse cx="-38" cy="-150" rx="26" ry="70" fill="{W}" stroke="{INK}" stroke-width="6" transform="rotate(-10 -38 -150)"/>
<ellipse cx="38" cy="-150" rx="26" ry="70" fill="{W}" stroke="{INK}" stroke-width="6" transform="rotate(14 38 -150)"/>
<ellipse cx="-38" cy="-146" rx="12" ry="48" fill="#ffc9d6" transform="rotate(-10 -38 -146)"/>
<path d="M30-110c10-30 40-40 50-70" fill="none" stroke="{INK}" stroke-width="0"/>
<ellipse cx="44" cy="-146" rx="12" ry="40" fill="#ffc9d6" transform="rotate(14 44 -146)"/>
<ellipse cx="0" cy="100" rx="80" ry="62" fill="{W}" stroke="{INK}" stroke-width="6"/>
<ellipse cx="-40" cy="150" rx="26" ry="14" fill="{W}" stroke="{INK}" stroke-width="5"/><ellipse cx="40" cy="150" rx="26" ry="14" fill="{W}" stroke="{INK}" stroke-width="5"/>
<ellipse cx="0" cy="-10" rx="125" ry="105" fill="{W}" stroke="{INK}" stroke-width="6"/>
{eyes(48, -8, 24)}{cheeks(82, 28, '#ffa8c5', 22)}
<ellipse cx="0" cy="22" rx="8" ry="6" fill="#ff8fab"/>{smile(32, 8)}
<g transform="translate(0 88)"><clipPath id="c2"><path d="M-30 0h60c8 30 0 48-30 48s-38-18-30-48z"/></clipPath>
<g clip-path="url(#c2)">{pouch}</g><path d="M-30 0h60c8 30 0 48-30 48s-38-18-30-48z" fill="none" stroke="{INK}" stroke-width="5"/>
<path d="M-34-4q34 12 68 0" stroke="{INK}" stroke-width="5" fill="none"/><circle cx="0" cy="-6" r="7" fill="#fcc419" stroke="{INK}" stroke-width="4"/></g>
<ellipse cx="-58" cy="98" rx="20" ry="16" fill="{W}" stroke="{INK}" stroke-width="5"/><ellipse cx="58" cy="98" rx="20" ry="16" fill="{W}" stroke="{INK}" stroke-width="5"/>'''



def sparkle(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-20C2-6 6-2 20 0 6 2 2 6 0 20-2 6-6 2-20 0-6-2-2-6 0-20z" fill="{col}" opacity="{op}"/>'


def heart(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 18C-30-4-30-30-12-32C-4-33 0-26 0-22C0-26 4-33 12-32C30-30 30-4 0 18z" fill="{col}" opacity="{op}"/>'


def note(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})" fill="{col}"><rect x="10" y="-60" width="7" height="62" rx="3"/><path d="M17-60l34 10v14l-34-10z"/><ellipse cx="2" cy="4" rx="16" ry="12" transform="rotate(-20 2 4)"/></g>'


def prop(motivo, c1, c2):
    """Objeto del tema, dibujado alrededor de (0,0)."""
    if motivo == 'kpop':
        return (f'<rect x="-9" y="0" width="18" height="110" rx="9" fill="{INK}"/>'
                f'<circle cx="0" cy="-26" r="40" fill="#fff" stroke="{INK}" stroke-width="6"/><circle cx="0" cy="-26" r="24" fill="{c2}" opacity=".7"/>')
    if motivo == 'kdrama':
        return (f'<rect x="-60" y="-20" width="120" height="80" rx="10" fill="{INK}"/>'
                f'<rect x="-60" y="-46" width="120" height="24" rx="6" fill="#fff" stroke="{INK}" stroke-width="5"/>'
                f'<path d="M-40-46l-14 24M-10-46l-14 24M20-46l-14 24M50-46l-14 24" stroke="{INK}" stroke-width="6"/>')
    if motivo == 'comida':
        return (f'<path d="M-30-70l90-50M-20-60l96-36" stroke="#c97b3d" stroke-width="9" stroke-linecap="round"/>'
                f'<ellipse cx="0" cy="-30" rx="78" ry="34" fill="#fff" stroke="{INK}" stroke-width="6"/>'
                f'<path d="M-78-30c0 50 34 80 78 80s78-30 78-80" fill="{c1}" stroke="{INK}" stroke-width="6"/>')
    if motivo == 'hangul':
        out = ''
        for i, (ch, col) in enumerate([('ㄱ', c1), ('ㅏ', c2), ('ㄴ', c1)]):
            out += (f'<g transform="translate({-58 + i * 58} {(i % 2) * -24}) rotate({-8 + i * 8})"><rect x="-26" y="-26" width="52" height="52" rx="10" fill="#fff" stroke="{INK}" stroke-width="5"/>'
                    f'<text y="14" text-anchor="middle" font-family="{FONT}" font-size="36" font-weight="900" fill="{col}">{ch}</text></g>')
        return out
    if motivo == 'expresiones':
        return heart(0, 0, 2.2, c1, .95) + heart(-56, 40, 1.2, c2, .9)
    return (f'<path d="M0 0L-80-90A120 120 0 0 1 80-90Z" fill="{c2}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M0 0L-40-112M0 0L0-120M0 0L40-112" stroke="{INK}" stroke-width="4" opacity=".5"/><circle r="9" fill="{INK}"/>')


def deco(motivo, c1, c2):
    if motivo == 'kpop':
        return note(50, 120, .9, c1) + note(520, 120, .7, c2)
    if motivo == 'kdrama':
        return heart(55, 110, 1.2, c1, .8) + heart(520, 110, .9, c2, .7)
    return sparkle(55, 110, 1.2, c2, .8) + sparkle(520, 110, .9, c1, .7)


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
{deco(motivo, c1, c2)}
<g transform="translate(392 408) scale(.9)">{conejo()}</g>
<g transform="translate(168 418) scale(.98)">{tigre()}</g>
<g transform="translate(515 585) scale(.42) rotate(-6)">{prop(motivo, c1, c2)}</g>
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
