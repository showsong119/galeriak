#!/usr/bin/env python3
"""GaleríaK · Kit diario para redes (Instagram / TikTok / Facebook / WhatsApp).
Genera site/sns/index.html (noindex, fuera del sitemap) a partir de content/diario/:
  - «Para hoy»: la última lección publicada (content/diario/ultima.json)
  - «Próximas»: las 3 siguientes en la cola (para dejarlas listas)
  - «Anteriores»: las últimas publicadas
Cada tarjeta: imagen 1080x1350 hecha en el navegador (la ilustración de Bomi y Dali + textos),
botones «Compartir / Descargar imagen» y «Copiar texto» con el texto y hashtags en español de México.
Se ejecuta en cada despliegue (pages.yml) y en el trabajo diario de lecciones.
Uso: python3 scripts/gen-sns.py
"""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'content/diario'
TAGS = '#coreano #aprendecoreano #coreanoparaprincipiantes #kpop #kdrama #kpopmexico #hangul #한국어 #mexico'


def leer(carpeta):
    out = []
    for f in sorted((D / carpeta).glob('*.json')):
        l = json.loads(f.read_text(encoding='utf-8'))
        l['_slug'] = f.stem
        l['_n'] = int(f.stem.split('-')[0])
        out.append(l)
    return out


def frase(il):
    if il.get('dialogo'):
        return '\n'.join(f"{'🐯 Bomi' if x['quien'] == 'bomi' else '🐰 Dali'}: {x['ko']}" + (f" ({x['rom']})" if x.get('rom') else '') + f" — {x['es']}" for x in il['dialogo'])
    return f"{il['ko']}" + (f" ({il['rom']})" if il.get('rom') else '') + f" = {il['es']}"


def texto(l):
    t = l['title'].split(':', 1)[-1].strip()
    return (f"📚 Coreano del día #{l['_n']}: {t}\n\n{frase(l.get('ilus', {}))}\n\n"
            "La lección completa, con ejemplos y mini reto, está gratis en GaleríaK 👉 galeriakmx.com (link en la bio)\n\n"
            "¿Ya sabes tu nivel de coreano? Haz el examen gratis en la web 🐯🐰\n\n" + TAGS)


def tarjeta(l, etiqueta):
    return {'n': l['_n'], 'slug': l['_slug'], 'titulo': l['title'], 'etiqueta': etiqueta,
            'img': f"/img/diario/{l['_slug']}.svg", 'texto': texto(l)}


def main():
    pub, cola = leer('publicadas'), leer('cola')
    try:
        ult = json.loads((D / 'ultima.json').read_text(encoding='utf-8')).get('archivo', '').replace('.json', '')
    except Exception:
        ult = pub[-1]['_slug'] if pub else ''
    hoy = [l for l in pub if l['_slug'] == ult] or pub[-1:]
    items = [tarjeta(l, 'Para hoy') for l in hoy]
    items += [tarjeta(l, 'Próxima') for l in cola[:3]]
    items += [tarjeta(l, 'Anterior') for l in reversed(pub) if l['_slug'] != (hoy[0]['_slug'] if hoy else '')][:6]
    items.append({'n': 0, 'slug': 'examen', 'titulo': 'Examen de coreano gratis (publicación fija)', 'etiqueta': 'Siempre',
                  'img': '/img/mascotas/bomi-dali.svg', 'examen': True,
                  'texto': "¿Qué tanto coreano sabes? 🇰🇷\n\nHaz gratis el examen estilo TOPIK de GaleríaK: 30 preguntas de vocabulario, lectura y audio, con tu nivel del 1 al 6 y explicaciones en español. Sin cuenta.\n\n👉 galeriakmx.com/examen-coreano (link en la bio)\n\nComparte tu resultado y reta a tus amigas y amigos 🐯🐰\n\n" + TAGS})
    datos = json.dumps(items, ensure_ascii=False).replace('</', '<\\/')
    html = PAGE.replace('/*DATOS*/[]', datos)
    out = ROOT / 'site/sns'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'index.html').write_text(html, encoding='utf-8')
    print(f'✅ site/sns/index.html · {len(items)} tarjetas (hoy: {ult or "—"})')


PAGE = r'''<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Kit para redes · GaleríaK</title>
<style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f6f8;color:#17171c}
header{background:#cc1f68;color:#fff;padding:14px 16px}header h1{margin:0;font-size:19px}header p{margin:4px 0 0;font-size:13px;opacity:.9}
main{max-width:560px;margin:0 auto;padding:12px}.c{background:#fff;border-radius:16px;padding:12px;margin:0 0 14px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.tag{display:inline-block;font-size:12px;font-weight:800;padding:3px 10px;border-radius:99px;background:#eee;margin-bottom:6px}.tag.hoy{background:#16784d;color:#fff}.tag.prox{background:#2f5bd8;color:#fff}
h2{font-size:16px;margin:2px 0 8px}img.p{width:100%;border-radius:12px;background:#fafafa;display:block}
textarea{width:100%;box-sizing:border-box;min-height:150px;border:1px solid #ddd;border-radius:10px;padding:8px;font:14px/1.45 system-ui;margin:8px 0}
.row{display:flex;gap:8px;flex-wrap:wrap}button{flex:1;min-width:140px;border:0;border-radius:12px;padding:12px;font-weight:800;font-size:15px;cursor:pointer}
.b1{background:#cc1f68;color:#fff}.b2{background:#17171c;color:#fff}.ok{color:#16784d;font-size:13px;min-height:18px;margin-top:6px}
.how{font-size:14px;line-height:1.5}.how li{margin:3px 0}</style></head><body>
<header><h1>📲 Kit para redes de GaleríaK</h1><p>Imagen + texto listos. Toca «Compartir» y elige Instagram, TikTok, Facebook o WhatsApp.</p></header>
<main><div class="c how"><b>Cómo publicar (1 minuto)</b><ol><li>Toca <b>Compartir imagen</b> (o Descargar).</li><li>Toca <b>Copiar texto</b> y pégalo como descripción.</li><li>Publica. Mejor hora en México: 7–9 pm.</li></ol></div><div id="lista"></div></main>
<script>
const ITEMS=/*DATOS*/[];
const F="system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans KR',sans-serif";
function lienzo(it){return new Promise(res=>{const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#ffe3ec');g.addColorStop(1,'#fff3d9');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='rgba(255,255,255,.55)';for(let i=18;i<W;i+=48)for(let j=18;j<H;j+=48){x.beginPath();x.arc(i,j,4,0,7);x.fill()}
 const t=(s,y,sz,col,w=960)=>{x.font=`900 ${sz}px ${F}`;while(x.measureText(s).width>w&&sz>22){sz-=2;x.font=`900 ${sz}px ${F}`}x.fillStyle=col;x.textAlign='center';x.fillText(s,W/2,y)};
 const im=new Image();im.onload=()=>{
  if(it.examen){x.drawImage(im,140,110,800,568);t('¿Qué tanto coreano sabes?',800,70,'#3b2f3f');t('Examen gratis estilo TOPIK · nivel 1 a 6',880,42,'#cc1f68');t('30 preguntas · sin cuenta · en español',940,38,'#5c5c66')}
  else{t('Coreano del día #'+it.n,150,64,'#cc1f68');x.save();x.beginPath();x.roundRect?x.roundRect(40,220,1000,525,36):x.rect(40,220,1000,525);x.clip();x.drawImage(im,40,220,1000,525);x.restore();
   const ti=it.titulo.split(':').slice(1).join(':').trim();const pal=ti.split(' ');let l='',y=860;x.font=`800 46px ${F}`;
   for(const p of pal){const n=l?l+' '+p:p;if(x.measureText(n).width>940){t(l,y,46,'#3b2f3f');y+=64;l=p}else l=n}if(l)t(l,y,46,'#3b2f3f')}
  t('Lección completa gratis 👇',1210,44,'#3b2f3f');t('galeriakmx.com',1280,54,'#2f5bd8');
  c.toBlob(b=>res(b),'image/png')};
 im.onerror=()=>res(null);im.src=it.img;})}
const L=document.getElementById('lista');
ITEMS.forEach((it,k)=>{const d=document.createElement('div');d.className='c';
 d.innerHTML=`<span class="tag ${it.etiqueta==='Para hoy'?'hoy':it.etiqueta==='Próxima'?'prox':''}">${it.etiqueta}</span><h2></h2><img class="p" alt="Vista previa"><textarea readonly></textarea><div class="row"><button class="b1">📤 Compartir imagen</button><button class="b2">📋 Copiar texto</button></div><div class="ok"></div>`;
 d.querySelector('h2').textContent=it.titulo;d.querySelector('textarea').value=it.texto;L.appendChild(d);
 const ok=d.querySelector('.ok');let blob=null;
 lienzo(it).then(b=>{blob=b;if(b)d.querySelector('img').src=URL.createObjectURL(b)});
 d.querySelector('.b2').onclick=async()=>{try{await navigator.clipboard.writeText(it.texto);ok.textContent='✓ Texto copiado. Pégalo en la descripción.'}catch(e){const ta=d.querySelector('textarea');ta.select();document.execCommand('copy');ok.textContent='✓ Texto copiado'}};
 d.querySelector('.b1').onclick=async()=>{if(!blob)return ok.textContent='La imagen todavía se está creando…';const name='galeriak-'+(it.slug||k)+'.png',file=new File([blob],name,{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:it.texto});ok.textContent='✓ Listo';return}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();ok.textContent='✓ Imagen descargada. Súbela desde tu galería.'};
});
</script></body></html>
'''

if __name__ == '__main__':
    main()
