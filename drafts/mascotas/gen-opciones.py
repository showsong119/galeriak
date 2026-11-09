#!/usr/bin/env python3
"""GaleríaK · 마스코트 후보 5종 (시안). 결과: drafts/mascotas/opciones.svg
모두 오리지널 디자인. 사진·아이돌·기존 캐릭터 사용 안 함."""
from pathlib import Path

INK = '#3b2f3f'
FONT = "'Noto Sans KR','Apple SD Gothic Neo',Inter,Arial,sans-serif"
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


def mandu():
    D = '#fff4e2'
    pleats = ''.join(f'<path d="M{x} -96q{6 if x < 0 else -6} 22 {2 if x < 0 else -2} 44" fill="none" stroke="#e3c9a3" stroke-width="6" stroke-linecap="round"/>' for x in (-60, -30, 0, 30, 60))
    return f'''
<ellipse cx="0" cy="150" rx="120" ry="16" fill="#000" opacity=".08"/>
<path d="M-26-150q-10-20 6-34M0-152q-12-22 4-38M26-150q-10-20 6-34" fill="none" stroke="#adb5bd" stroke-width="6" stroke-linecap="round" opacity=".7"/>
<path d="M-150 90c-20-110 50-200 150-200s170 90 150 200c-10 50-70 60-150 60s-140-10-150-60z" fill="{D}" stroke="{INK}" stroke-width="7"/>
<path d="M-70-100q70-40 140 0" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
{pleats}
{eyes(52, 10, 24)}{cheeks(92, 46, '#ff8fab', 24)}{smile(48, 10)}
<ellipse cx="-150" cy="70" rx="22" ry="16" fill="{D}" stroke="{INK}" stroke-width="6" transform="rotate(-30 -150 70)"/>
<ellipse cx="150" cy="70" rx="22" ry="16" fill="{D}" stroke="{INK}" stroke-width="6" transform="rotate(30 150 70)"/>
<g transform="translate(-74 -84) rotate(-24)"><path d="M0 0l-26-16v32zM0 0l26-16v32z" fill="#f06595" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><circle r="8" fill="#fcc419" stroke="{INK}" stroke-width="4"/></g>'''


def urraca():
    K, B = '#2b2d42', '#4dabf7'
    return f'''
<ellipse cx="0" cy="150" rx="100" ry="14" fill="#000" opacity=".08"/>
<path d="M80 70l120 20-6 26-120-10z" fill="{K}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M90 80l100 18" stroke="{B}" stroke-width="7" stroke-linecap="round"/>
<ellipse cx="0" cy="10" rx="130" ry="132" fill="{K}" stroke="{INK}" stroke-width="6"/>
<path d="M-104 50c10 70 60 96 104 96s94-26 104-96c-40 22-70 30-104 30s-64-8-104-30z" fill="#fff" stroke="{INK}" stroke-width="5"/>
<ellipse cx="0" cy="-8" rx="92" ry="78" fill="#fff"/>
<path d="M-18-118q8-30 22-34q4 20-6 36" fill="{K}" stroke="{INK}" stroke-width="5"/>
{eyes(40, -14, 22)}{cheeks(70, 18, '#ff8fab', 18)}
<path d="M-14 8l14 14 14-14z" fill="#fcc419" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M-124 20q-30 20-18 60q34-6 38-44z" fill="{K}" stroke="{INK}" stroke-width="5"/><path d="M-130 46q-6 14 0 26" stroke="{B}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M124 20q30 20 18 60q-34-6-38-44z" fill="{K}" stroke="{INK}" stroke-width="5"/><path d="M130 46q6 14 0 26" stroke="{B}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M-30 142v12M-40 154h20M30 142v12M20 154h20" stroke="#f59f00" stroke-width="6" stroke-linecap="round"/>
<g transform="translate(0 70)">{saek_band(110, 18, 9, 'c4')}</g>'''


def ajolote():
    P, PD = '#ffc2d4', '#f783ac'
    gills = ''
    for sx in (-1, 1):
        for i, (dy, ang) in enumerate([(-60, -40), (-30, -15), (0, 10)]):
            gills += (f'<g transform="translate({sx * 118} {dy}) rotate({sx * ang})"><ellipse cx="{sx * 34}" cy="0" rx="36" ry="14" fill="{PD}" stroke="{INK}" stroke-width="5"/>'
                      f'<path d="M{sx * 12} 0h{sx * 40}" stroke="#ffdeeb" stroke-width="4" stroke-linecap="round"/></g>')
    return f'''
<ellipse cx="0" cy="150" rx="110" ry="14" fill="#000" opacity=".08"/>
<path d="M60 110c70 10 110-20 100-60c-20 30-60 40-100 30z" fill="{P}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<ellipse cx="0" cy="104" rx="84" ry="56" fill="{P}" stroke="{INK}" stroke-width="6"/>
<ellipse cx="-44" cy="150" rx="24" ry="13" fill="{P}" stroke="{INK}" stroke-width="5"/><ellipse cx="44" cy="150" rx="24" ry="13" fill="{P}" stroke="{INK}" stroke-width="5"/>
{gills}
<ellipse cx="0" cy="-14" rx="130" ry="100" fill="{P}" stroke="{INK}" stroke-width="6"/>
{eyes(66, -24, 20)}{cheeks(94, 16, '#f06595', 18)}
<path d="M-40 20q40 30 80 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<g transform="translate(0 62)"><path d="M0 0l-34-20v40zM0 0l34-20v40z" fill="#fcc419" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<g transform="translate(-34 0)"><clipPath id="c5"><path d="M34 0l-34-20v40z"/></clipPath><g clip-path="url(#c5)">{''.join(f'<rect x="0" y="{-20 + i * 8}" width="34" height="8" fill="{SAEK[i % 6]}"/>' for i in range(6))}</g></g>
<g transform="translate(0 0)"><clipPath id="c5b"><path d="M0 0l34-20v40z"/></clipPath><g clip-path="url(#c5b)">{''.join(f'<rect x="0" y="{-20 + i * 8}" width="34" height="8" fill="{SAEK[(i + 3) % 6]}"/>' for i in range(6))}</g></g>
<path d="M0 0l-34-20v40zM0 0l34-20v40z" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><circle r="9" fill="#e03131" stroke="{INK}" stroke-width="4"/></g>'''


OPC = [
    ('Bomi', '봄이', 'Cachorro de tigre', '아기 호랑이 + 색동 목도리', '#fff4e6', tigre),
    ('Dali', '달이', 'Conejito de la luna', '달토끼 + 색동 복주머니', '#fff9db', conejo),
    ('Mandu', '만두', 'Dumpling sonriente', '만두 + 작은 매듭 리본', '#fff0f6', mandu),
    ('Kachi', '까치', 'Pajarito urraca', '까치(행운의 새) + 색동 목도리', '#e7f5ff', urraca),
    ('Ari', '아리', 'Ajolote', '멕시코 아홀로틀 + 색동 리본', '#f3f0ff', ajolote),
]
NOTES = ['한국 민화 호랑이 · 사라페 같은 줄무늬', '한국·멕시코 둘 다 "달 속 토끼" 전설이 있음', '한국 음식 · 타말·엠파나다처럼 친근', '한국에서 반가운 소식을 전하는 새', '멕시코 국민 동물 + 한국 리본 포인트']


def sheet():
    W, H, cw = 1800, 640, 360
    cells = ''
    for i, (name, ko, es, desc, bg, fn) in enumerate(OPC):
        x = i * cw
        cells += f'''<g transform="translate({x} 0)">
<rect x="12" y="12" width="{cw - 24}" height="{H - 24}" rx="28" fill="{bg}"/>
<text x="34" y="58" font-family="{FONT}" font-size="26" font-weight="900" fill="{INK}">{i + 1}</text>
<g transform="translate({cw / 2} 270) scale(.82)">{fn()}</g>
<text x="{cw / 2}" y="478" text-anchor="middle" font-family="{FONT}" font-size="40" font-weight="900" fill="{INK}">{name} <tspan font-size="28" fill="#868e96">{ko}</tspan></text>
<text x="{cw / 2}" y="516" text-anchor="middle" font-family="{FONT}" font-size="22" font-weight="700" fill="#cc1f68">{es}</text>
<text x="{cw / 2}" y="556" text-anchor="middle" font-family="{FONT}" font-size="20" font-weight="700" fill="{INK}">{desc}</text>
<text x="{cw / 2}" y="590" text-anchor="middle" font-family="{FONT}" font-size="17" fill="#868e96">{NOTES[i]}</text></g>'''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/>{cells}</svg>'


if __name__ == '__main__':
    out = Path(__file__).with_name('opciones.svg')
    out.write_text(sheet(), encoding='utf-8')
    print('✅', out)
