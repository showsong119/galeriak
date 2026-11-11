// GaleríaK · Tarjetas tipo «card news» (carrusel de fotos) para TikTok, 3 a 9 por lección.
//   site/img/sns/<slug>/01.jpg, 02.jpg, …   (1080x1350, JPG)
//   - portada (ilustración de Bomi/Dali + título) → frase clave → contenido (listas o párrafos)
//     → 💡 tip → ✏️ mini reto → respuesta + invitación a galeriakmx.com
//   - «examen»: 3 tarjetas de la promo del examen gratis
// TikTok las jala por URL (PULL_FROM_URL) desde https://galeriakmx.com/img/sns/<slug>/NN.jpg.
// Uso: PLAYWRIGHT=/opt/npm-tools/node_modules/playwright CHROME=/usr/bin/google-chrome node scripts/render-sns.cjs [--todo] [slug…]
// Después: python3 scripts/gen-sns.py (enlaza las fotos en /sns/ y en el panel).
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, 'site'), OUT = path.join(SITE, 'img/sns');
const DIARIO = path.join(ROOT, 'content/diario');
const TODO = process.argv.includes('--todo');
const SOLO = process.argv.slice(2).filter(a => !a.startsWith('--'));
const MAX = 9;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ko = s => esc(s).replace(/([ㄱ-ㆎ가-힣][ㄱ-ㆎ가-힣\s?!.~,]*[ㄱ-ㆎ가-힣?!.~]?)/g, '<span class="ko">$1</span>');
const bold = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const limpio = s => s.replace(/\/examen-coreano\//g, 'galeriakmx.com/examen-coreano').replace(/\[(?:foto|ilus):[^\]]*\]/g, '').trim();

// Corta un texto largo en el último punto antes de n caracteres.
function corto(t, n = 300) {
  if (t.length <= n) return t;
  const c = t.slice(0, n), p = Math.max(c.lastIndexOf('. '), c.lastIndexOf('? '), c.lastIndexOf('! '));
  return (p > n * 0.5 ? c.slice(0, p + 1) : c.replace(/\s+\S*$/, '') + '…');
}

// «안녕하세요 (annyeonghaseyo) — Hola…» → { a: '안녕하세요 (annyeonghaseyo)', b: 'Hola…' }
function partir(l) {
  const m = l.match(/^(.+?)\s+[—–-]\s+(.+)$/) || l.match(/^(.+?):\s+(.+)$/);
  return m && m[1].length <= 60 ? { a: m[1], b: m[2] } : { a: '', b: l };
}

function diapositivas(l, n) {
  const titulo = l.title.split(':').slice(1).join(':').trim() || l.title;
  const S = [{ t: 'portada', titulo, img: `/img/diario/${l._slug}.svg` }];
  const il = l.ilus || {};
  if (il.dialogo) S.push({ t: 'dialogo', lineas: il.dialogo });
  else if (il.ko) S.push({ t: 'frase', ko: il.ko, rom: il.rom, es: il.es });

  const paras = l.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const grupos = [], textos = [], tips = [];
  let reto = '', resp = '', cab = '';
  for (const p of paras) {
    const lines = p.split('\n').map(x => x.trim()).filter(Boolean);
    if (/^💡/.test(p)) { tips.push(p.replace(/^💡\s*/, '')); continue; }
    if (/^[✏✍]/.test(p)) { reto = p.replace(/^[✏✍]️?\s*(Mini reto:)?\s*/i, ''); continue; }
    if (/^(Respuesta|Solución)\s*:/i.test(p)) { resp = p.replace(/^(Respuesta|Solución)\s*:\s*/i, ''); continue; }
    if (/examen-coreano|comentarios|👇\s*$/.test(p) && p.length < 220) continue;
    if (lines.every(x => /^([•\-*]|\d+\.)\s/.test(x))) {
      const items = lines.map(x => x.replace(/^([•\-*]|\d+\.)\s+/, ''));
      for (let i = 0; i < items.length; i += 4) grupos.push({ cab: i ? (cab ? cab + ' (sigue)' : '') : cab, items: items.slice(i, i + 4) });
      cab = ''; continue;
    }
    if (/:$/.test(p) && p.length < 90) { cab = p.replace(/:$/, ''); continue; }
    textos.push(p);
  }
  const cont = grupos.length ? grupos.map(g => ({ t: 'lista', cab: g.cab, items: g.items }))
    : textos.slice(0, 3).map(x => ({ t: 'texto', txt: corto(x, 460) }));
  const huecos = MAX - S.length - (tips.length ? 1 : 0) - (reto ? 2 : 1);
  S.push(...cont.slice(0, Math.max(1, huecos)));
  if (tips.length) S.push({ t: 'tip', txt: corto(tips.slice(0, 2).join('\n\n'), 360) });
  if (reto) S.push({ t: 'reto', txt: corto(reto, 260) });
  S.push({ t: 'fin', resp: resp ? corto(resp, 200) : '' });
  return S.map(s => ({ ...s, n, total: S.length }));
}

function examen() {
  const S = [
    { t: 'ex1', examen: 1 },
    { t: 'lista', cab: '¿Cómo es el examen?', items: ['30 preguntas — vocabulario, lectura y audio', 'Tu nivel del 1 al 6 — estilo TOPIK', 'Explicaciones en español — al terminar', 'Gratis y sin cuenta — en tu celular'], examen: 1 },
    { t: 'fin', examen: 1 },
  ];
  return S.map(s => ({ ...s, total: S.length }));
}

const CSS = `*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans KR','Noto Sans CJK KR',sans-serif;color:#3b2f3f;background:linear-gradient(160deg,#ffe3ec 0%,#fff3d9 100%);position:relative;overflow:hidden}
body:before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.6) 4px,transparent 5px);background-size:48px 48px;z-index:0}
.w{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;padding:70px 80px 60px}
.top{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:34px;color:#cc1f68}.top .pg{background:#fff;border-radius:999px;padding:8px 22px;font-size:28px;color:#5c5c66}
.box{flex:1;display:flex;flex-direction:column;justify-content:center;gap:28px;overflow:hidden}
.card{background:#fff;border-radius:40px;padding:56px 56px;box-shadow:0 10px 30px rgba(204,31,104,.12)}
h1{font-size:72px;line-height:1.2;font-weight:900;text-align:center}h2{font-size:52px;font-weight:900;color:#cc1f68;margin-bottom:10px}
.ko{color:#2f5bd8;font-weight:900}.big{font-size:120px;font-weight:900;text-align:center;color:#2f5bd8;line-height:1.15}.rom{font-size:46px;text-align:center;color:#5c5c66}.es{font-size:54px;text-align:center;font-weight:800}
ul{list-style:none;display:flex;flex-direction:column;gap:30px;padding:0}li .a{font-size:52px;font-weight:900;color:#2f5bd8;line-height:1.2}li .b{font-size:40px;line-height:1.35;margin-top:6px}li.solo .b{font-size:46px}
p.t{font-size:50px;line-height:1.45;white-space:pre-line}.tag{display:inline-block;font-size:40px;font-weight:900;border-radius:999px;padding:10px 30px;margin-bottom:24px}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:34px;font-weight:800;color:#5c5c66}.foot b{color:#2f5bd8;font-size:42px}
.ilus{width:100%;border-radius:36px;box-shadow:0 10px 30px rgba(0,0,0,.08)}.mas{width:560px;align-self:center}
.bub{display:flex;gap:24px;align-items:flex-start}.bub .q{font-size:80px}.bub .x{background:#fff;border-radius:36px;padding:34px 40px;flex:1}.bub.r{flex-direction:row-reverse}.bub .x .k{font-size:64px;font-weight:900;color:#2f5bd8}.bub .x .r2{font-size:36px;color:#5c5c66}.bub .x .e{font-size:42px;font-weight:700;margin-top:6px}`;

function html(s) {
  const top = s.examen ? 'Examen de coreano gratis' : 'Coreano del día #' + s.n;
  const pg = `<span class="pg">${s.i}/${s.total}</span>`;
  const foot = '<div class="foot"><span>' + (s.i < s.total ? 'Desliza 👉' : '') + '</span><b>galeriakmx.com</b></div>';
  let c = '';
  if (s.t === 'portada') c = `<img class="ilus" src="${s.img}"><h1>${ko(s.titulo)}</h1>`;
  else if (s.t === 'frase') c = `<div class="card"><span class="tag" style="background:#fde8f0;color:#cc1f68">Frase clave</span><div class="big">${esc(s.ko)}</div>${s.rom ? `<div class="rom">${esc(s.rom)}</div>` : ''}<div class="es" style="margin-top:24px">${esc(s.es)}</div></div>`;
  else if (s.t === 'dialogo') c = `<span class="tag" style="background:#fde8f0;color:#cc1f68;align-self:flex-start">Diálogo</span>` + s.lineas.map((x, i) => `<div class="bub ${i % 2 ? 'r' : ''}"><div class="q">${x.quien === 'bomi' ? '🐯' : '🐰'}</div><div class="x"><div class="k">${esc(x.ko)}</div>${x.rom ? `<div class="r2">${esc(x.rom)}</div>` : ''}<div class="e">${esc(x.es)}</div></div></div>`).join('');
  else if (s.t === 'lista') c = `<div class="card">${s.cab ? `<h2>${ko(s.cab)}</h2>` : ''}<ul>${s.items.map(x => { const p = partir(x); return `<li class="${p.a ? '' : 'solo'}">${p.a ? `<div class="a">${esc(p.a)}</div>` : ''}<div class="b">${bold(ko(p.b))}</div></li>`; }).join('')}</ul></div>`;
  else if (s.t === 'texto') c = `<div class="card"><p class="t">${bold(ko(limpio(s.txt)))}</p></div>`;
  else if (s.t === 'tip') c = `<div class="card" style="border:6px solid #f5c542"><span class="tag" style="background:#fff4cc;color:#8a5a00">💡 Tip</span><p class="t">${bold(ko(limpio(s.txt)))}</p></div>`;
  else if (s.t === 'reto') c = `<div class="card" style="border:6px solid #2f5bd8"><span class="tag" style="background:#e8eeff;color:#2f5bd8">✏️ Mini reto</span><p class="t">${bold(ko(limpio(s.txt)))}</p><p class="t" style="font-size:38px;color:#5c5c66;margin-top:20px">Escribe tu respuesta en los comentarios 👇</p></div>`;
  else if (s.t === 'ex1') c = `<img class="mas" src="/img/mascotas/bomi-dali.svg"><h1>¿Qué tanto coreano sabes?</h1><div class="es" style="color:#cc1f68">Haz el examen gratis y descubre tu nivel</div>`;
  else if (s.t === 'fin') c = (s.resp ? `<div class="card" style="padding:44px 56px"><span class="tag" style="background:#e7f6ee;color:#16784d">✅ Respuesta</span><p class="t" style="font-size:44px">${bold(ko(limpio(s.resp)))}</p></div>` : '')
    + `<img class="mas" src="/img/mascotas/bomi-dali.svg" style="width:${s.resp ? 420 : 560}px"><h1 style="font-size:60px">${s.examen ? 'Haz el examen gratis 👇' : 'Lección completa gratis 👇'}</h1><div class="es" style="color:#2f5bd8;font-size:${s.examen ? 50 : 64}px;font-weight:900;white-space:nowrap">${s.examen ? 'galeriakmx.com/examen-coreano' : 'galeriakmx.com'}</div><div class="rom">Link en la bio 🐯🐰</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="w"><div class="top"><span>${esc(top)}</span>${pg}</div><div class="box" id="box">${c}</div>${foot}</div>
<script>/* achica la letra hasta que quepa */(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));const b=document.getElementById('box');let k=1,g=0;while(b.scrollHeight>b.clientHeight+2&&k>0.5&&g++<40){k-=0.04;b.querySelectorAll('h1,h2,p,li .a,li .b,.big,.es,.rom,.bub .k,.bub .e').forEach(e=>{const f=parseFloat(getComputedStyle(e).fontSize);e.style.fontSize=(f*0.96)+'px'});b.querySelectorAll('img').forEach(e=>{e.style.maxHeight=(b.clientHeight*0.45*k)+'px';e.style.objectFit='contain'})}document.body.dataset.ok=1})()</script></body></html>`;
}

function lecciones() {
  const out = [];
  for (const dir of ['publicadas', 'cola']) {
    const d = path.join(DIARIO, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json')).sort()) {
      const l = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); l._slug = f.replace(/\.json$/, ''); out.push(l);
    }
  }
  return out;
}

module.exports = { diapositivas, examen, html, partir };

if (require.main === module) (async () => {
  const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
  const TIPOS = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const PAG = new Map();
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (PAG.has(u)) { r.writeHead(200, { 'Content-Type': TIPOS['.html'] }); return r.end(PAG.get(u)); }
    const f = path.join(SITE, u);
    if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const trabajos = lecciones().map(l => [l._slug, diapositivas(l, parseInt(l._slug))]);
  trabajos.push(['examen', examen()]);
  let n = 0;
  for (const [slug, S] of trabajos) {
    if (SOLO.length && !SOLO.includes(slug)) continue;
    const dir = path.join(OUT, slug);
    if (!TODO && !SOLO.length && fs.existsSync(path.join(dir, '01.jpg'))) continue;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < S.length; i++) {
      const u = `/__c/${slug}/${i}.html`; PAG.set(u, html({ ...S[i], i: i + 1 }));
      await p.goto(`http://127.0.0.1:${port}${u}`); await p.waitForSelector('body[data-ok]', { timeout: 15000 });
      await p.screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    }
    // quita los archivos del formato anterior (video / tarjeta única)
    for (const ext of ['mp4', 'jpg']) fs.rmSync(path.join(OUT, `${slug}.${ext}`), { force: true });
    n++; console.log(`✓ ${slug}: ${S.length} tarjetas`);
  }
  await b.close(); srv.close();
  console.log(`✅ ${n} carruseles en site/img/sns/`);
})().catch(e => { console.error(e); process.exit(1); });
