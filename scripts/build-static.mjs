// GaleríaK · Páginas estáticas para buscadores (Google): /g/<galería>/ y /p/<id>/ + sitemap.xml
// Se ejecuta en GitHub Actions antes de publicar en GitHub Pages (no se suben al repositorio).
// Lee las publicaciones públicas con la clave publicable de Supabase (la misma que usa el sitio).
// Uso: node scripts/build-static.mjs [carpeta=site]
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = 'https://galeriakmx.com';
const MAX_POSTS = 1500;

// ---------- utilidades ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FOTO_RE = /^\[foto:([0-9a-f-]{36})\/([A-Za-z0-9_-]{6,40})\.(webp|jpg|png)\]$/;
export const plainBody = b => String(b || '').split('\n').filter(l => !FOTO_RE.test(l.trim())).join('\n').trim();
export const snippet = (s, n = 155) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const day = d => new Date(d).toISOString().slice(0, 10);
const fecha = d => new Date(d).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });

// Lee GALS, CATS y la conexión de Supabase desde site/index.html (una sola fuente de verdad)
export function readSiteConfig(indexHtml) {
  const grab = name => { const m = indexHtml.match(new RegExp('const ' + name + '=(\\[[\\s\\S]*?\\n\\]);')); if (!m) throw new Error('No encontré ' + name); return new Function('return ' + m[1])(); };
  const url = (indexHtml.match(/const SUPABASE_URL='([^']+)'/) || [])[1];
  const key = (indexHtml.match(/const SUPABASE_KEY='([^']+)'/) || [])[1];
  const adsense = (indexHtml.match(/<script async src="https:\/\/pagead2\.googlesyndication\.com[^>]*><\/script>/) || [''])[0];
  return { GALS: grab('GALS'), CATS: grab('CATS'), url, key, adsense };
}

export function bodyHTML(p, supaUrl) {
  return String(p.body || '').split('\n').map(line => {
    const m = line.trim().match(FOTO_RE);
    if (m && m[1] === p.author_id) return `<img class="pimg" loading="lazy" src="${supaUrl}/storage/v1/object/public/post-images/${m[1]}/${m[2]}.${m[3]}" alt="Foto de la publicación">`;
    return esc(line);
  }).join('\n');
}

// Página delgada (casi sin texto y sin comentarios): no se indexa ni va al sitemap
export const isThin = (p, nComments) => plainBody(p.body).length < 60 && !nComments;

// ---------- plantilla ----------
function page({ title, desc, canonical, robots, jsonld, body, css, adsense }) {
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<meta property="og:type" content="article"><meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${BASE}/icons/icon-512.png">
<link rel="icon" href="/icons/icon-192.png" type="image/png"><meta name="theme-color" content="#e5317d">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>\n` : ''}${adsense}
<style>${css}
.list{list-style:none;margin:0;padding:0}.list li{border-bottom:1px solid var(--line);padding:10px 0}.list li a{font-weight:600;text-decoration:none;color:var(--ink)}.list small{display:block;color:var(--muted);font-size:13px}
.pbody{white-space:pre-wrap;word-wrap:break-word;line-height:1.75}.pimg{display:block;max-width:100%;border-radius:12px;margin:10px 0}
.cmt{border-top:1px solid var(--line);padding:10px 0;font-size:15px}.cmt b{font-size:13px}.cmt p{margin:4px 0 0;white-space:pre-wrap}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 4px}.btnp{display:inline-block;background:var(--brand);color:#fff!important;text-decoration:none;font-weight:700;border-radius:999px;padding:10px 18px}.btns a.sec{background:#fff;color:var(--ink)!important;border:1px solid var(--line)}
.galgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding:0;list-style:none}.galgrid a{display:block;border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-decoration:none;color:var(--ink);background:#fff}.galgrid small{display:block;color:var(--muted);font-size:12px}
</style>
</head>
<body>
<header class="top"><div class="top-in"><a class="logo" href="/">Galería<b>K</b></a><nav><a href="/g/">Galerías</a><a href="/guias/">Guías</a><a href="/examen-coreano/">Examen</a></nav></div></header>
<div class="wrap">
${body}
</div>
<footer>GaleríaK es una comunidad de fans no oficial. No está afiliada a ninguna agencia, artista ni marca. Las publicaciones son de sus autores.<br>
<a href="/">Inicio</a> · <a href="/g/">Galerías</a> · <a href="/guias/">Guías</a> · <a href="/privacidad/">Política de Privacidad</a> · <a href="/terminos/">Términos y Condiciones</a> · <a href="mailto:galeriakmx@gmail.com">galeriakmx@gmail.com</a></footer>
</body>
</html>
`;
}

export function renderPost(p, g, comments, ctx) {
  const url = `${BASE}/p/${p.id}/`, nick = p.profiles?.nickname || p.anon_name || 'usuario';
  const desc = snippet(plainBody(p.body) || p.title);
  const thin = isThin(p, comments.length);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'DiscussionForumPosting', headline: String(p.title).slice(0, 110), text: snippet(plainBody(p.body), 500),
    url, datePublished: p.created_at, inLanguage: 'es-MX', author: { '@type': 'Person', name: nick },
    isPartOf: { '@type': 'WebPage', name: g.name, url: `${BASE}/g/${g.id}/` }, commentCount: comments.length,
    interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: p.up_count || 0 },
    comment: comments.slice(0, 20).map(c => ({ '@type': 'Comment', text: snippet(c.body, 300), datePublished: c.created_at, author: { '@type': 'Person', name: c.profiles?.nickname || c.anon_name || 'usuario' } })),
  };
  const body = `<article>
<div class="crumb"><a href="/">Inicio</a> › <a href="/g/">Galerías</a> › <a href="/g/${g.id}/">${esc(g.name)}</a></div>
<span class="cat">${esc(g.name)}</span>
<h1>${esc(p.title)}</h1>
<p class="meta">${esc(nick)} · ${fecha(p.created_at)} · ♥ ${p.up_count || 0} · 💬 ${comments.length}</p>
<div class="pbody">${bodyHTML(p, ctx.url)}</div>
${p.deal_price ? `<p><b>Tienda:</b> ${esc(p.deal_store || '')} · revisa el precio actual en la tienda.</p>` : ''}
<div class="btns"><a class="btnp" href="/#p-${p.id}">💬 Comentar o dar ♥</a><a class="btnp sec" href="/#g-${g.id}">Más de ${esc(g.name)}</a></div>
</article>
${comments.length ? `<section class="box" style="margin-top:14px"><h2 style="margin-top:0">Comentarios (${comments.length})</h2>${comments.slice(0, 50).map(c => `<div class="cmt"><b>${esc(c.profiles?.nickname || c.anon_name || 'usuario')}</b> <small style="color:var(--muted)">${fecha(c.created_at)}</small><p>${esc(c.body)}</p></div>`).join('')}</section>` : ''}`;
  return page({ title: `${p.title} – ${g.name} | GaleríaK`, desc, canonical: url, robots: thin ? 'noindex,follow' : '', jsonld, body, css: ctx.css, adsense: ctx.adsense });
}

export function renderGallery(g, cat, posts, ctx) {
  const url = `${BASE}/g/${g.id}/`;
  const body = `<article>
<div class="crumb"><a href="/">Inicio</a> › <a href="/g/">Galerías</a> › ${esc(cat?.name || '')}</div>
<span class="cat">${esc(cat?.name || 'Galería')}</span>
<h1>${esc(g.name)}</h1>
<p class="big">${esc(g.desc)}. Comunidad en español para fans en México.</p>
<div class="btns"><a class="btnp" href="/#g-${g.id}">Abrir la galería</a><a class="btnp sec" href="/#w-${g.id}">Escribir</a></div>
<h2>Publicaciones recientes</h2>
${posts.length ? `<ul class="list">${posts.slice(0, 50).map(p => `<li><a href="/p/${p.id}/">${esc(p.title)}</a><small>${esc(p.profiles?.nickname || p.anon_name || 'usuario')} · ${fecha(p.created_at)} · ♥ ${p.up_count || 0} · 💬 ${p.comment_count || 0}</small></li>`).join('')}</ul>` : '<p>Todavía no hay publicaciones. ¡Sé la primera persona en escribir!</p>'}
</article>`;
  return page({ title: `${g.name} – Galería de fans en español | GaleríaK`, desc: snippet(`${g.desc}. Comunidad de fans en español en México: publicaciones, reseñas y conversaciones sobre ${g.name}.`), canonical: url, robots: posts.length ? '' : 'noindex,follow', jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: g.name, description: g.desc, url, inLanguage: 'es-MX' }, body, css: ctx.css, adsense: ctx.adsense });
}

export function renderIndex(CATS, GALS, counts, ctx) {
  const body = `<article><h1>Todas las galerías de GaleríaK</h1><p class="big">Comunidad en español para fans del K-Beauty, el K-Pop, los K-Dramas y la cultura coreana en México.</p>
${CATS.map(c => `<h2>${esc(c.icon || '')} ${esc(c.name)}</h2><p>${esc(c.desc || '')}</p><ul class="galgrid">${GALS.filter(g => g.cat === c.id).map(g => `<li><a href="${g.attend ? '/#g-' + g.id : '/g/' + g.id + '/'}"><b>${esc(g.name)}</b><small>${esc(g.desc)}${counts[g.id] ? ` · ${counts[g.id]} publicaciones` : ''}</small></a></li>`).join('')}</ul>`).join('\n')}
</article>`;
  return page({ title: 'Galerías de K-Beauty, K-Pop y K-Dramas en español | GaleríaK', desc: 'Todas las galerías de GaleríaK: skincare y maquillaje coreano, ofertas, grupos de K-Pop, K-Dramas y aprender coreano. Comunidad de fans en México.', canonical: `${BASE}/g/`, jsonld: null, body, css: ctx.css, adsense: ctx.adsense });
}

export function buildSitemap(existingXml, extra) {
  const keep = [...String(existingXml || '').matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]).filter(u => !/\/(g|p)\//.test(u));
  const add = extra.map(e => `<url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...keep, ...add].map(u => '  ' + u.trim()).join('\n')}\n</urlset>\n`;
}

// ---------- datos ----------
async function rest(cfg, path) {
  const r = await fetch(`${cfg.url}/rest/v1/${path}`, { headers: { apikey: cfg.key, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function fetchData(cfg) {
  const posts = await rest(cfg, `posts?select=id,gallery_id,author_id,anon_name,title,body,deal_price,deal_store,up_count,comment_count,created_at,profiles(nickname)&is_deleted=eq.false&is_hidden=eq.false&gallery_id=neq.asistencia&order=created_at.desc&limit=${MAX_POSTS}`);
  let warned = new Set();
  try { (await rest(cfg, 'gk_advertencias?select=post_id&estado=eq.activa&limit=2000')).forEach(r => warned.add(+r.post_id)); } catch { /* aún no existe */ }
  const visible = posts.filter(p => !warned.has(+p.id));
  const comments = [];
  const ids = visible.map(p => p.id);
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150).join(',');
    comments.push(...await rest(cfg, `comments?select=id,post_id,body,created_at,anon_name,profiles(nickname)&post_id=in.(${chunk})&is_deleted=eq.false&is_hidden=eq.false&order=created_at.asc&limit=10000`));
  }
  return { posts: visible, comments };
}

export async function build(outDir, data) {
  const indexHtml = readFileSync(join(outDir, 'index.html'), 'utf8');
  const cfg = readSiteConfig(indexHtml);
  const guide = readFileSync(join(outDir, 'guias/doble-limpieza/index.html'), 'utf8');
  const css = (guide.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  const ctx = { css, adsense: cfg.adsense, url: cfg.url };
  if (!data) {
    try { data = await fetchData(cfg); }
    catch (e) { console.warn('⚠️ No se pudieron leer las publicaciones (' + e.message + '). Se generan solo las galerías.'); data = { posts: [], comments: [] }; }
  }
  const G = Object.fromEntries(cfg.GALS.map(g => [g.id, g]));
  const byPost = {}; data.comments.forEach(c => (byPost[c.post_id] ||= []).push(c));
  for (const d of ['g', 'p']) { const dir = join(outDir, d); if (existsSync(dir)) rmSync(dir, { recursive: true }); }
  const sm = [{ loc: `${BASE}/g/`, lastmod: day(Date.now()) }];
  const counts = {};
  let nPosts = 0, nIndexed = 0;
  for (const p of data.posts) {
    const g = G[p.gallery_id]; if (!g) continue;
    counts[g.id] = (counts[g.id] || 0) + 1;
    const cm = byPost[p.id] || [];
    mkdirSync(join(outDir, 'p', String(p.id)), { recursive: true });
    writeFileSync(join(outDir, 'p', String(p.id), 'index.html'), renderPost(p, g, cm, ctx));
    nPosts++;
    if (!isThin(p, cm.length)) { nIndexed++; sm.push({ loc: `${BASE}/p/${p.id}/`, lastmod: day(cm.length ? cm[cm.length - 1].created_at : p.created_at) }); }
  }
  for (const g of cfg.GALS) {
    if (g.attend) continue;
    const ps = data.posts.filter(p => p.gallery_id === g.id);
    mkdirSync(join(outDir, 'g', g.id), { recursive: true });
    writeFileSync(join(outDir, 'g', g.id, 'index.html'), renderGallery(g, cfg.CATS.find(c => c.id === g.cat), ps, ctx));
    if (ps.length) sm.push({ loc: `${BASE}/g/${g.id}/`, lastmod: day(ps[0].created_at) });
  }
  writeFileSync(join(outDir, 'g', 'index.html'), renderIndex(cfg.CATS, cfg.GALS, counts, ctx));
  const smPath = join(outDir, 'sitemap.xml');
  writeFileSync(smPath, buildSitemap(existsSync(smPath) ? readFileSync(smPath, 'utf8') : '', sm));
  console.log(`✅ Páginas: ${nPosts} publicaciones (${nIndexed} en el sitemap), ${cfg.GALS.filter(g => !g.attend).length} galerías + /g/`);
  return { nPosts, nIndexed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build(process.argv[2] || 'site').catch(e => { console.error(e); process.exit(1); });
}
