#!/usr/bin/env python3
"""GaleríaK · Ilustraciones originales (SVG) para guías y el examen.
Genera site/img/guias/<slug>.svg (1200x630) y site/img/examen.svg.
No usa fotos de terceros ni de artistas: todo se dibuja con formas simples.
Uso: python3 scripts/gen-illustrations.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'site/img/guias'
FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',Inter,Arial,sans-serif"

PAL = {
    'beauty': ('#ffe3ec', '#ffd0bf', '#e5317d', '#ff7a59', '#fff6f9'),
    'kpop':   ('#ece3ff', '#ffd6f0', '#6c4bd8', '#e5317d', '#f7f3ff'),
    'coreano':('#dff3ff', '#e6fff4', '#2f5bd8', '#1d8a5a', '#f2f9ff'),
    'examen': ('#e8efff', '#fff1d6', '#2f5bd8', '#ff7a00', '#f5f8ff'),
}

def frame(cat, inner, tag=''):
    a, b, c1, c2, light = PAL[cat]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="{tag}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".12"/></filter></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="1080" cy="90" r="160" fill="{light}" opacity=".55"/><circle cx="120" cy="560" r="200" fill="{light}" opacity=".5"/>
<circle cx="980" cy="520" r="60" fill="{c2}" opacity=".12"/><circle cx="210" cy="120" r="40" fill="{c1}" opacity=".12"/>
<g transform="translate(-190 0)">{inner}</g>
<text x="1168" y="606" text-anchor="end" font-family="{FONT}" font-size="22" font-weight="800" fill="{c1}" opacity=".55">Galería<tspan fill="{c2}">K</tspan></text>
</svg>
'''

def sparkle(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-20C2-6 6-2 20 0 6 2 2 6 0 20-2 6-6 2-20 0-6-2-2-6 0-20z" fill="{col}" opacity="{op}"/>'

def bottle(x, y, s, body, cap, label='#fff', ko=''):
    t = f'<text x="0" y="40" text-anchor="middle" font-family="{FONT}" font-size="26" font-weight="800" fill="{body}">{ko}</text>' if ko else ''
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)">
<rect x="-24" y="-190" width="48" height="60" rx="10" fill="{cap}"/><rect x="-14" y="-230" width="28" height="44" rx="12" fill="{cap}" opacity=".85"/>
<rect x="-70" y="-135" width="140" height="250" rx="34" fill="{body}"/><rect x="-50" y="-30" width="100" height="110" rx="14" fill="{label}"/>{t}
<rect x="-52" y="-118" width="18" height="90" rx="9" fill="#fff" opacity=".35"/></g>'''

def jar(x, y, s, body, lid, ko=''):
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)">
<rect x="-95" y="-70" width="190" height="40" rx="14" fill="{lid}"/><rect x="-85" y="-34" width="170" height="104" rx="28" fill="{body}"/>
<rect x="-55" y="-8" width="110" height="52" rx="10" fill="#fff"/><text x="0" y="28" text-anchor="middle" font-family="{FONT}" font-size="26" font-weight="800" fill="{lid}">{ko}</text></g>'''

def tube(x, y, s, body, cap, ko='', rot=-12):
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})" filter="url(#sh)">
<path d="M-60-150h120l-12 250h-96z" fill="{body}"/><rect x="-62" y="-170" width="124" height="26" rx="6" fill="{body}" opacity=".8"/>
<rect x="-28" y="100" width="56" height="48" rx="8" fill="{cap}"/>
<rect x="-40" y="-60" width="80" height="90" rx="10" fill="#fff"/><text x="0" y="0" text-anchor="middle" font-family="{FONT}" font-size="24" font-weight="800" fill="{cap}">{ko}</text></g>'''

def drop(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-60C22-28 40-6 40 16a40 40 0 0 1-80 0c0-22 18-44 40-76z" fill="{col}" opacity="{op}"/>'

def bubble_dots(x, y, col):
    return ''.join(f'<circle cx="{x+dx}" cy="{y+dy}" r="{r}" fill="#fff" stroke="{col}" stroke-width="4" opacity=".9"/>' for dx, dy, r in [(0,0,34),(52,-30,22),(70,26,16),(-40,40,18),(20,-70,12)])

def tile(x, y, ch, bg, fg, w=150, fs=88, rot=0):
    return f'''<g transform="translate({x} {y}) rotate({rot})" filter="url(#sh)"><rect x="{-w/2}" y="{-w/2}" width="{w}" height="{w}" rx="26" fill="{bg}"/>
<text x="0" y="{fs*0.35}" text-anchor="middle" font-family="{FONT}" font-size="{fs}" font-weight="900" fill="{fg}">{ch}</text></g>'''

def speech(x, y, w, h, txt, bg, fg, fs=54, tail='left'):
    tx = x + 40 if tail == 'left' else x + w - 40
    return f'''<g filter="url(#sh)"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="34" fill="{bg}"/>
<path d="M{tx-18} {y+h-2}l-6 46 44-46z" fill="{bg}"/>
<text x="{x+w/2}" y="{y+h/2+fs*0.36}" text-anchor="middle" font-family="{FONT}" font-size="{fs}" font-weight="900" fill="{fg}">{txt}</text></g>'''

def sun(x, y, r, col):
    rays = ''.join(f'<rect x="-8" y="{-r-46}" width="16" height="34" rx="8" fill="{col}" transform="rotate({a})"/>' for a in range(0, 360, 30))
    return f'<g transform="translate({x} {y})">{rays}<circle r="{r}" fill="{col}"/><circle r="{r*0.62}" fill="#fff" opacity=".35"/></g>'

def note(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})" fill="{col}"><ellipse cx="0" cy="60" rx="30" ry="22" transform="rotate(-20 0 60)"/><rect x="22" y="-60" width="10" height="122"/><path d="M32-60c30 10 46 28 40 60-6-20-20-28-40-30z"/></g>'

def heart(x, y, s, col, op=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 30C-40 0-60-20-60-42c0-18 14-32 32-32 12 0 22 6 28 16 6-10 16-16 28-16 18 0 32 14 32 32 0 22-20 42-60 72z" fill="{col}" opacity="{op}"/>'

def phone(x, y, s, col):
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)"><rect x="-110" y="-200" width="220" height="400" rx="38" fill="#17171c"/>
<rect x="-94" y="-170" width="188" height="330" rx="20" fill="#fff"/><circle cx="0" cy="-20" r="62" fill="{col}"/><path d="M-18-50v60l50-30z" fill="#fff"/>
<rect x="-70" y="70" width="140" height="14" rx="7" fill="{col}" opacity=".35"/><rect x="-70" y="70" width="80" height="14" rx="7" fill="{col}"/>
<rect x="-70" y="104" width="100" height="12" rx="6" fill="#ddd"/></g>'''

def calendar(x, y, s, c1, c2):
    cells = ''
    for r in range(4):
        for c in range(5):
            cx, cy = -150 + c*75, -40 + r*62
            done = (r*5 + c) < 12
            cells += f'<rect x="{cx}" y="{cy}" width="58" height="46" rx="10" fill="{c2 if done else "#eef1f6"}" opacity="{0.9 if done else 1}"/>'
            if done: cells += f'<path d="M{cx+16} {cy+24}l9 9 17-18" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>'
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)"><rect x="-180" y="-150" width="390" height="370" rx="30" fill="#fff"/>
<rect x="-180" y="-150" width="390" height="80" rx="30" fill="{c1}"/><rect x="-180" y="-100" width="390" height="30" fill="{c1}"/>
<text x="15" y="-96" text-anchor="middle" font-family="{FONT}" font-size="40" font-weight="900" fill="#fff">TOPIK · 12주</text>{cells}</g>'''

def magnifier(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})"><circle r="70" fill="#fff" fill-opacity=".55" stroke="{col}" stroke-width="18"/><rect x="48" y="40" width="26" height="110" rx="13" fill="{col}" transform="rotate(-45 48 40)"/></g>'

def face(x, y, s, c1, c2):
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)"><ellipse rx="170" ry="210" fill="#ffe9dc"/>
<path d="M-110-80h220v50h-80v170h-60v-170h-80z" fill="{c2}" opacity=".13"/>
<circle cx="-110" cy="60" r="40" fill="{c1}" opacity=".18"/><circle cx="110" cy="60" r="40" fill="{c1}" opacity=".18"/>
<ellipse cx="-60" cy="-20" rx="16" ry="20" fill="#3b2a28"/><ellipse cx="60" cy="-20" rx="16" ry="20" fill="#3b2a28"/>
<path d="M-40 90q40 30 80 0" stroke="#c45a63" stroke-width="10" fill="none" stroke-linecap="round"/>
<text x="0" y="-120" text-anchor="middle" font-family="{FONT}" font-size="30" font-weight="900" fill="{c2}">T존</text></g>'''

def compact(x, y, s, c1, c2):
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)"><circle r="170" fill="{c1}"/><circle r="150" fill="#fff"/>
<circle r="128" fill="#f6dcc8"/><circle r="128" fill="url(#bg)" opacity=".25"/><ellipse cx="-40" cy="-46" rx="46" ry="24" fill="#fff" opacity=".7" transform="rotate(-30 -40 -46)"/>
<rect x="-210" y="150" width="190" height="56" rx="28" fill="{c2}" transform="rotate(-18)"/></g>'''

def leaf(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 80C-70 30-60-60 0-90 60-60 70 30 0 80z" fill="{col}"/><path d="M0 70V-70" stroke="#fff" stroke-width="6" opacity=".7"/></g>'

def snail(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M-90 50h170q20 0 20-20" stroke="{col}" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="-10" cy="-10" r="62" fill="#fff" stroke="{col}" stroke-width="14"/><path d="M-10-10m0 0a20 20 0 1 1 20 20a38 38 0 1 1-38-38" stroke="{col}" stroke-width="10" fill="none"/></g>'

def fan(x, y, s, col):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0L-110-120A160 160 0 0 1 110-120Z" fill="{col}"/><path d="M0 0l-70-130M0 0l0-158M0 0l70-130" stroke="#fff" stroke-width="5" opacity=".6"/><rect x="-8" y="0" width="16" height="120" rx="8" fill="#5b4636"/></g>'

def box_label(x, y, s, c1, c2):
    lines = ''.join(f'<rect x="-120" y="{-40+i*36}" width="{240 if i%2==0 else 170}" height="16" rx="8" fill="{c2}" opacity=".35"/>' for i in range(5))
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#sh)"><rect x="-160" y="-170" width="320" height="380" rx="24" fill="#fff"/>
<rect x="-160" y="-170" width="320" height="90" rx="24" fill="{c1}"/><rect x="-160" y="-110" width="320" height="30" fill="{c1}"/>
<text x="0" y="-110" text-anchor="middle" font-family="{FONT}" font-size="40" font-weight="900" fill="#fff">전성분</text>{lines}
<text x="-120" y="170" font-family="{FONT}" font-size="26" font-weight="800" fill="{c1}">사용기한 · 제조번호</text></g>'''

def lightstick(x, y, s, c1, c2):
    return f'''<g transform="translate({x} {y}) rotate(18) scale({s})" filter="url(#sh)"><circle cx="0" cy="-130" r="92" fill="#fff"/><circle cx="0" cy="-130" r="92" fill="{c1}" opacity=".25"/>
{sparkle(0, -130, 3.2, c1)}<rect x="-26" y="-40" width="52" height="230" rx="22" fill="#2b2b33"/><rect x="-14" y="10" width="28" height="12" rx="6" fill="{c2}"/></g>'''

C = PAL
B, K, CO = C['beauty'], C['kpop'], C['coreano']

ART = {
 'rutina-skincare-coreana': ('beauty', bottle(760, 400, 1, B[2], '#ffb3cc', ko='토너') + jar(960, 470, 1, '#ffc7a8', B[3], '크림') + tube(560, 430, .95, '#fff', B[2], 'SPF') + sparkle(1040, 230, 1.6, B[3]) + sparkle(640, 170, 1.1, B[2], .7), 'Productos de una rutina de skincare'),
 'doble-limpieza': ('beauty', drop(560, 360, 2.4, '#ffd36b') + drop(560, 360, 1.3, '#fff', .45) + bubble_dots(860, 330, B[2]) + bubble_dots(980, 430, B[3]) + bottle(760, 430, .9, '#ffe08a', '#e8a300', ko='오일'), 'Aceite limpiador y espuma'),
 'protector-solar-coreano': ('beauty', sun(980, 200, 90, '#ffb020') + tube(720, 420, 1.15, '#fff', '#ff7a00', 'SPF50+') + drop(900, 470, .9, '#ffd36b') + sparkle(560, 220, 1.3, '#ff7a00'), 'Sol y protector solar'),
 'ingredientes-k-beauty': ('beauty', leaf(620, 300, 1.4, '#3aa76d') + snail(880, 420, 1.2, B[2]) + drop(1030, 250, 1.3, '#5ab0ff') + f'<g transform="translate(700 470)" fill="#fff" stroke="#e0c9a6" stroke-width="5">' + ''.join(f'<ellipse cx="{i*44}" cy="{(i%2)*16}" rx="14" ry="26" transform="rotate({20*i} {i*44} {(i%2)*16})"/>' for i in range(4)) + '</g>', 'Ingredientes: centella, baba de caracol, ácido hialurónico, arroz'),
 'etiquetas-coreanas': ('beauty', box_label(780, 330, 1, B[2], '#7a5c66') + magnifier(990, 360, 1.15, B[3]), 'Etiqueta coreana con lupa'),
 'tipo-de-piel': ('beauty', face(820, 330, 1.05, B[2], B[3]) + drop(1060, 200, .9, '#5ab0ff', .9) + sparkle(560, 200, 1.4, B[3]), 'Rostro con zona T'),
 'skincare-clima-calido': ('beauty', sun(1020, 170, 80, '#ffb020') + fan(640, 380, 1.2, '#ff9bb8') + drop(820, 300, 1, '#5ab0ff', .9) + drop(880, 380, .7, '#5ab0ff', .7) + bottle(960, 450, .85, '#bfe8ff', '#2f8fd8', ko='젤'), 'Calor y humedad con gel ligero'),
 'glass-skin': ('beauty', compact(820, 320, 1, B[2], B[3]) + sparkle(1040, 180, 2.2, '#fff') + sparkle(600, 220, 1.4, '#fff', .9) + sparkle(1060, 470, 1.1, B[3]), 'Cushion con brillo tipo glass skin'),
 'aprender-hangul': ('coreano', tile(600, 250, 'ㄱ', '#fff', CO[2]) + tile(780, 250, 'ㅏ', CO[2], '#fff') + tile(960, 250, '가', '#fff', CO[3]) + tile(690, 430, '한', CO[3], '#fff', rot=-6) + tile(870, 430, '글', '#fff', CO[2], rot=5), 'Letras del hangul'),
 'frases-coreanas-kpop': ('kpop', speech(540, 150, 330, 140, '안녕!', '#fff', K[2]) + speech(800, 320, 360, 140, '사랑해 💜', K[2], '#fff', tail='right') + heart(640, 470, .9, K[3], .8), 'Burbujas con frases en coreano'),
 'glosario-kpop': ('kpop', lightstick(860, 360, 1.05, K[2], K[3]) + note(620, 260, 1.3, K[3]) + note(1040, 220, 1, K[2]) + sparkle(700, 470, 1.4, K[2]), 'Notas musicales y lightstick genérico'),
 'plan-estudio-topik': ('coreano', calendar(820, 320, 1, CO[2], CO[3]) + sparkle(1060, 170, 1.4, CO[3]), 'Calendario de estudio de 12 semanas'),
 'apoyar-kpop-oficial': ('kpop', phone(820, 330, 1, K[2]) + heart(1040, 200, 1, K[3]) + heart(600, 420, .8, K[2], .8) + note(1050, 430, .9, K[3]), 'Celular con reproducción y corazones'),
 'particulas-coreanas': ('coreano', tile(600, 230, '은/는', '#fff', CO[2], w=190, fs=60) + tile(840, 230, '이/가', CO[2], '#fff', w=190, fs=60) + tile(720, 440, '을/를', CO[3], '#fff', w=190, fs=60) + tile(980, 440, '에서', '#fff', CO[3], w=170, fs=56), 'Partículas coreanas'),
 'numeros-coreanos': ('coreano', tile(600, 240, '하나', '#fff', CO[2], w=170, fs=56) + tile(800, 240, '둘', CO[2], '#fff', w=170, fs=66) + tile(1000, 240, '셋', '#fff', CO[2], w=170, fs=66) + tile(600, 440, '일', CO[3], '#fff', w=170, fs=66) + tile(800, 440, '이', '#fff', CO[3], w=170, fs=66) + tile(1000, 440, '삼', CO[3], '#fff', w=170, fs=66), 'Números nativos y sino-coreanos'),
 'niacinamida': ('beauty', bottle(780, 400, 1.05, '#ffb3cc', B[2], ko='세럼') + drop(980, 260, 1.4, '#ffd0e0') + drop(1040, 420, .9, B[3], .9) + sparkle(600, 200, 1.5, B[2]) + sparkle(1080, 170, 1, B[3], .8), 'Sérum con niacinamida'),
 'boletos-kpop-mexico': ('kpop', phone(760, 330, 1, K[2]) + lightstick(1010, 360, .95, K[2], K[3]) + note(600, 230, 1.1, K[3]) + sparkle(1080, 170, 1.3, K[3]), 'Celular con boleto y lightstick genérico'),
 'formal-informal-coreano': ('coreano', speech(520, 150, 420, 140, '안녕하세요', '#fff', CO[2], fs=50) + speech(760, 330, 300, 130, '안녕~', CO[3], '#fff', tail='right') + f'<text x="560" y="520" font-family="{FONT}" font-size="40" font-weight="900" fill="{CO[2]}">존댓말 · 반말</text>', 'Habla formal e informal'),
}

def examen_svg():
    E = PAL['examen']
    sheet = '<g transform="translate(830 330) rotate(-5)" filter="url(#sh)"><rect x="-190" y="-230" width="380" height="460" rx="26" fill="#fff"/>'
    sheet += f'<rect x="-190" y="-230" width="380" height="84" rx="26" fill="{E[2]}"/><rect x="-190" y="-176" width="380" height="30" fill="{E[2]}"/>'
    sheet += f'<text x="0" y="-172" text-anchor="middle" font-family="{FONT}" font-size="38" font-weight="900" fill="#fff">한국어 시험</text>'
    for i in range(5):
        y = -110 + i*64
        sheet += f'<text x="-160" y="{y+12}" font-family="{FONT}" font-size="26" font-weight="800" fill="#444">{i+1}.</text>'
        for j in range(4):
            on = (i + j) % 4 == 0
            sheet += f'<circle cx="{-90 + j*62}" cy="{y}" r="20" fill="{E[2] if on else "#fff"}" stroke="{E[2]}" stroke-width="4"/>'
    sheet += '</g>'
    badge = f'<g transform="translate(1040 160) rotate(12)" filter="url(#sh)"><circle r="92" fill="{E[3]}"/><text y="-6" text-anchor="middle" font-family="{FONT}" font-size="40" font-weight="900" fill="#fff">GRATIS</text><text y="32" text-anchor="middle" font-family="{FONT}" font-size="19" font-weight="800" fill="#fff">180 preguntas</text></g>'
    return frame('examen', tile(520, 240, '가', '#fff', E[2]) + tile(560, 440, '한', E[2], '#fff', rot=-8) + sheet + badge + sparkle(1100, 470, 1.4, E[3]), 'Examen de coreano gratis')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (cat, inner, tag) in ART.items():
        (OUT / f'{slug}.svg').write_text(frame(cat, inner, tag))
    (ROOT / 'site/img').mkdir(exist_ok=True)
    (ROOT / 'site/img/examen.svg').write_text(examen_svg())
    print(f'{len(ART)} ilustraciones + examen.svg')

if __name__ == '__main__':
    main()
