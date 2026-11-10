#!/usr/bin/env python3
"""GaleríaK · Archivos sueltos de las mascotas (fondo transparente) para la portada y las tarjetas para compartir.
Genera site/img/mascotas/{bomi-dali,bomi,dali}.svg con las mismas funciones de scripts/gen-diario-ilus.py."""
import importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ilus', ROOT / 'scripts/gen-diario-ilus.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
OUT = ROOT / 'site/img/mascotas'; OUT.mkdir(parents=True, exist_ok=True)
def svg(w, h, body, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{label}">{body}</svg>\n'
(OUT / 'bomi-dali.svg').write_text(svg(620, 440, f'<g transform="translate(410 250) scale(.92) scale(-1 1)">{m.conejo()}</g><g transform="translate(190 262) scale(.98)">{m.tigre()}</g>', 'Bomi y Dali, mascotas de GaleríaK'), encoding='utf-8')
(OUT / 'bomi.svg').write_text(svg(360, 400, f'<g transform="translate(180 222)">{m.tigre()}</g>', 'Bomi'), encoding='utf-8')
(OUT / 'dali.svg').write_text(svg(340, 440, f'<g transform="translate(170 250)">{m.conejo()}</g>', 'Dali'), encoding='utf-8')
print('✅ site/img/mascotas/')
