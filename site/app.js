import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { CATS, GALS, G, RANK, RANK_SRC, GUIDES, RULES_HTML, PRIVACY_HTML } from './content.js';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const H = 3600e3, D = 24 * H;
const HOT_DEAL = 5, BEST = 10, PAGE = 20;
const POST_COLS = 'id,gallery,title,author_id,author_label,pinned,hidden,is_auto,deal_price,deal_store,deal_sold,deal_expires_at,up,views,comment_count,created_at,profiles(nickname)';

const cfg = window.GALERIAK_CONFIG || {};
const ready = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
const sb = ready ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
let user = null, profile = null, admin = false;

if (!ready) { const b = $('#banner'); b.hidden = false; b.textContent = 'Sitio en configuración: pronto podrás iniciar sesión y publicar.'; }

/* ---------------- Utilidades ---------------- */
function ago(t) { const d = Date.now() - new Date(t).getTime(); if (d < 60e3) return 'ahora'; if (d < H) return Math.floor(d / 60e3) + ' min'; if (d < D) return Math.floor(d / H) + ' h'; if (d < 7 * D) return Math.floor(d / D) + ' d'; const x = new Date(t); return x.getDate() + '/' + (x.getMonth() + 1); }
const who = p => p.author_label ? esc(p.author_label) : p.profiles?.nickname ? esc(p.profiles.nickname) : 'usuario';
const ad = k => `<div class="ad ad-${k}">Publicidad</div>`;
const fmtPrice = n => n == null ? '' : '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ' MXN';
const priceLive = p => p.deal_price != null && (!p.deal_expires_at || new Date(p.deal_expires_at) > new Date());
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
function av(g) { return `<span class="av" style="background:${g.c}" aria-hidden="true">${esc(g.name.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2).toUpperCase())}</span>`; }
function tags(p, showGal) {
  let h = '';
  if (p.hidden) h += '<span class="pill p-hid">Oculta</span>';
  if (p.pinned) h += '<span class="pill p-pin">Aviso</span>';
  if (p.gallery === 'ofertas') {
    if (p.deal_sold) h += '<span class="pill p-sold">Agotado</span>';
    else if (p.up >= HOT_DEAL) h += '<span class="pill p-hot">Caliente</span>';
    if (p.is_auto) h += '<span class="pill p-bot">Bot</span>';
  } else if (p.up >= BEST && !p.pinned) h += '<span class="pill p-best">Destacado</span>';
  if (showGal && G[p.gallery]) h += `<span class="pill p-gal">${esc(G[p.gallery].name)}</span>`;
  return h;
}
function row(p, i, showGal) {
  const price = p.gallery === 'ofertas' && priceLive(p) && !p.deal_sold ? ` <span class="price">${esc(fmtPrice(p.deal_price))}</span>` : '';
  return `<li class="row"><span class="num">${p.pinned ? 'Aviso' : (i == null ? p.id : i)}</span><div class="t">${tags(p, showGal)}<a href="#p-${p.id}">${esc(p.title)}</a>${p.comment_count ? `<span class="cc">[${p.comment_count}]</span>` : ''}${price}
  <div class="meta"><span>${who(p)}</span><span>${ago(p.created_at)}</span><span>${p.views} vistas</span></div></div><span class="up" aria-label="${p.up} me gusta">♥ ${p.up}</span></li>`;
}
function listWithAds(arr, start, showGal) {
  let h = '<ul class="list">';
  arr.forEach((p, k) => { h += row(p, start == null ? null : start + k, showGal); if (k === 4 && arr.length > 6) h += '</ul>' + ad('feed') + '<ul class="list">'; });
  return h + '</ul>';
}
const emptyBox = m => `<div class="empty">${m}</div>`;

async function q(builder) {
  if (!sb) return [];
  const { data, error } = await builder;
  if (error) { console.error(error); return []; }
  return data || [];
}
const posts = () => sb.from('posts').select(POST_COLS);

/* ---------------- Sesión (Google) ---------------- */
async function loadSession() {
  if (!sb) return renderAuth();
  const { data } = await sb.auth.getSession();
  user = data.session?.user || null;
  profile = null; admin = false;
  if (user) {
    const p = await q(sb.from('profiles').select('id,nickname,avatar_url').eq('id', user.id).limit(1));
    profile = p[0] || null;
    const { data: isA } = await sb.rpc('is_admin');
    admin = isA === true;
  }
  renderAuth();
}
function renderAuth() {
  const box = $('#authBox');
  if (!user) {
    box.innerHTML = `<button class="login" id="loginBtn" ${ready ? '' : 'disabled'}><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-2.8-.4-4H24v7.6h11.9c-.2 2-1.6 5-4.6 7l7.1 5.5C42.6 36.6 45 31.1 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-1.9 1.3-4.4 2.2-7.5 2.2-5.8 0-10.7-3.8-12.4-9.1l-7.3 5.7C7.9 41.2 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.6 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2l-7.3-5.7C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 10.7c4.1 0 6.9 1.8 8.5 3.3l6.3-6.1C35 4.3 30 2 24 2 15.4 2 7.9 6.8 4.3 14.1l7.3 5.7c1.7-5.3 6.6-9.1 12.4-9.1z"/></svg>Entrar con Google</button>`;
    $('#loginBtn').onclick = login;
  } else {
    box.innerHTML = `${admin ? '<a class="btn btn-sm" href="#admin">Revisión</a> ' : ''}<a class="me" href="#perfil">${esc(profile?.nickname || 'Mi perfil')}</a> <button class="login" id="logoutBtn">Salir</button>`;
    $('#logoutBtn').onclick = async () => { await sb.auth.signOut(); toast('Sesión cerrada'); };
  }
}
async function login() {
  if (!sb) return;
  const redirectTo = location.origin + location.pathname + (location.hash || '#home');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) toast('No se pudo iniciar sesión');
}
function needLogin() {
  return `<div class="card empty"><p>Para publicar, comentar o votar inicia sesión con tu cuenta de Google.</p><button class="btn btn-brand" id="loginInline" ${ready ? '' : 'disabled'}>Entrar con Google</button></div>`;
}

/* ---------------- Barra lateral ---------------- */
async function side() {
  const since = new Date(Date.now() - 7 * D).toISOString();
  const hot = sb ? await q(sb.from('posts').select('id,title').eq('pinned', false).gte('created_at', since).order('up', { ascending: false }).limit(5)) : [];
  $('#side').innerHTML = `
  <div class="card"><h2>Ranking Corea <a class="more" href="#guia-rebajas">Guía</a></h2>
   <ol class="list rank">${RANK.map((r, i) => `<li><span class="n">${i + 1}</span><div>${esc(r[0])}<small>${esc(r[1])}</small></div></li>`).join('')}</ol>
   <div class="hint">Selección de ganadores Olive Young Awards 2025. <a href="${RANK_SRC}" target="_blank" rel="noopener" style="color:var(--blue)">Fuente</a> · Los de 2026 salen a finales de noviembre.</div></div>
  ${ad('rect')}
  <div class="card"><h2>Lo más votado</h2>${hot.length ? `<ul class="list">${hot.map((p, i) => `<li class="row"><span class="num">${i + 1}</span><div class="t"><a href="#p-${p.id}">${esc(p.title)}</a></div></li>`).join('')}</ul>` : emptyBox('Aún no hay votos esta semana.')}</div>
  <div class="card"><h2>Guías</h2>${Object.entries(GUIDES).map(([k, g]) => `<div class="row"><div class="t"><a href="#${k}">${esc(g.t)}</a></div></div>`).join('')}</div>`;
}

/* ---------------- Vistas ---------------- */
function nav(cur) {
  const items = [['home', 'Inicio'], ['c-beauty', 'K-Beauty'], ['g-ofertas', 'Ofertas'], ['c-kpop', 'K-Pop'], ['g-kdramas', 'K-Drama'], ['c-vida', 'Corea y más'], ['guias', 'Guías'], ['galerias', 'Galerías']];
  $('#nav').innerHTML = items.map(([h, n]) => `<a href="#${h}" class="${cur === h ? 'on' : ''}">${n}</a>`).join('');
}
const galCard = g => `<a class="gal" href="#g-${g.id}">${av(g)}<div><b>${esc(g.name)}</b><small>${esc(g.desc.slice(0, 34))}${g.desc.length > 34 ? '…' : ''}</small></div></a>`;

async function vHome() {
  nav('home');
  const [best, deals, recent] = sb ? await Promise.all([
    q(posts().eq('pinned', false).neq('gallery', 'ofertas').gte('created_at', new Date(Date.now() - 30 * D).toISOString()).order('up', { ascending: false }).order('created_at', { ascending: false }).limit(8)),
    q(posts().eq('gallery', 'ofertas').eq('deal_sold', false).order('created_at', { ascending: false }).limit(6)),
    q(posts().eq('pinned', false).order('created_at', { ascending: false }).limit(8))
  ]) : [[], [], []];
  const popular = ['skincare', 'ofertas', 'resenas', 'bts', 'maquillaje', 'kdramas', 'viajes', 'stray-kids'].map(id => G[id]);
  return ad('leader') + `
  <div class="card"><h2>Destacados <a class="more" href="#mejores">Ver más</a></h2>${best.length ? listWithAds(best, 1, true) : emptyBox('Sé la primera persona en publicar.')}</div>
  <div class="card"><h2>Ofertas K-Beauty <a class="more" href="#g-ofertas">Ver todas</a></h2>${deals.length ? `<ul class="list">${deals.map((p, i) => row(p, i + 1, false)).join('')}</ul>` : emptyBox('Las ofertas del día aparecen aquí.')}</div>
  <div class="card"><h2>Lo más nuevo</h2>${recent.length ? `<ul class="list">${recent.map((p, i) => row(p, i + 1, true)).join('')}</ul>` : emptyBox('Todavía no hay publicaciones.')}</div>
  <div class="card"><h2>Galerías populares <a class="more" href="#galerias">Todas</a></h2><div class="galgrid">${popular.map(galCard).join('')}</div></div>
  <div class="card"><h2>Guías para comprar K-Beauty en México</h2><div class="guides">${Object.entries(GUIDES).map(([k, g]) => `<a class="guide" href="#${k}"><b>${esc(g.t)}</b><span>${esc(g.d)}</span></a>`).join('')}</div></div>`;
}

async function vCat(cid) {
  nav('c-' + cid); const c = CATS.find(x => x.id === cid); const gs = GALS.filter(g => g.cat === cid);
  const list = sb ? await q(posts().in('gallery', gs.map(g => g.id)).eq('pinned', false).order('created_at', { ascending: false }).limit(20)) : [];
  return ad('leader') + `<div class="card"><h2>${esc(c.name)}: galerías</h2><div class="galgrid">${gs.map(galCard).join('')}</div></div>
  <div class="card"><h2>Publicaciones recientes</h2>${list.length ? listWithAds(list, 1, true) : emptyBox('Aún no hay publicaciones.')}</div>`;
}

let galTab = 'all', galPage = 1, lastGal = null;
async function vGal(gid) {
  const g = G[gid]; if (!g) return vNotFound();
  nav(g.deal ? 'g-ofertas' : g.id === 'kdramas' ? 'g-kdramas' : 'c-' + g.cat);
  let pins = [], list = [], more = false;
  if (sb) {
    pins = await q(posts().eq('gallery', gid).eq('pinned', true).order('created_at', { ascending: false }));
    let b = posts().eq('gallery', gid).eq('pinned', false);
    if (galTab === 'best') b = b.gte('up', g.deal ? HOT_DEAL : BEST);
    list = await q(b.order('created_at', { ascending: false }).range((galPage - 1) * PAGE, galPage * PAGE));
    more = list.length > PAGE; list = list.slice(0, PAGE);
  }
  return ad('leader') + `<div class="card"><div class="gh">${av(g)}<div><h1>${esc(g.name)}</h1><p>${esc(g.desc)}</p></div><a class="btn btn-brand write" href="#w-${g.id}">Escribir</a></div>
  ${g.deal ? '<p class="hint">Algunas ofertas las publica nuestro bot y el equipo las revisa. Enlaces de afiliado de Amazon: GaleríaK puede ganar una comisión sin costo extra para ti.</p>' : ''}
  <div class="tabs"><button data-tab="all" class="${galTab === 'all' ? 'on' : ''}">Todo</button><button data-tab="best" class="${galTab === 'best' ? 'on' : ''}">${g.deal ? 'Calientes' : 'Destacados'}</button></div>
  ${pins.length ? '<ul class="list">' + pins.map(p => row(p, 0, false)).join('') + '</ul>' : ''}
  ${list.length ? listWithAds(list, null, false) : emptyBox('Todavía no hay publicaciones aquí. ¡Sé la primera persona en escribir!')}
  <div class="pager">${galPage > 1 ? '<button class="btn" data-page="-1">← Anterior</button>' : ''}${more ? '<button class="btn" data-page="1">Siguiente →</button>' : ''}</div>
  </div>`;
}

async function vPost(id) {
  if (!sb) return vNotFound();
  const rows = await q(sb.from('posts').select('*,profiles(nickname)').eq('id', id).limit(1));
  const p = rows[0]; if (!p) return vNotFound('Esta publicación no existe o fue ocultada por moderación.');
  const g = G[p.gallery] || G.libre; nav(g.deal ? 'g-ofertas' : 'c-' + g.cat);
  try { if (!sessionStorage.getItem('v' + id)) { sessionStorage.setItem('v' + id, '1'); sb.rpc('increment_views', { pid: id }); } } catch (e) { /* sin storage */ }
  const comments = await q(sb.from('comments').select('id,body,created_at,author_id,profiles(nickname)').eq('post_id', id).order('created_at'));
  const mine = user && p.author_id === user.id;
  const live = priceLive(p);
  const dealBox = p.gallery === 'ofertas' && p.deal_url ? `<div class="dealbox">
    <div><div class="hint">Precio</div><div class="price" style="font-size:20px">${live ? esc(fmtPrice(p.deal_price)) : 'Revisa el precio actual'}</div>${live && p.deal_price_at ? `<div class="hint">visto ${ago(p.deal_price_at)} atrás · puede cambiar</div>` : ''}</div>
    <div><div class="hint">Tienda</div><b>${esc(p.deal_store || '')}</b></div>
    <div style="margin-left:auto">${p.deal_sold ? '<span class="pill p-sold">Agotado</span>' : `<a href="${esc(p.deal_url)}" target="_blank" rel="nofollow sponsored noopener">Ir a la oferta →</a>`}</div></div>` : '';
  return ad('leader') + `<div class="card post">
   <a href="#g-${g.id}" class="hint">← ${esc(g.name)}</a>
   <h1>${tags(p, false)}${esc(p.title)}</h1>
   <div class="pmeta"><span>${who(p)}</span><span>${ago(p.created_at)}</span><span>${p.views} vistas</span><span>♥ ${p.up}</span><span>${p.comment_count} comentarios</span></div>
   ${dealBox}
   <div class="body">${esc(p.body)}</div>
   ${p.src ? `<div class="srcbox"><b>Fuente:</b> <a href="${esc(p.src)}" target="_blank" rel="nofollow noopener">${esc(p.src)}</a></div>` : ''}
   ${ad('post')}
   <div class="votes"><button class="v-up" data-vote="1">♥ Me gusta ${p.up}</button><button data-vote="-1">No me gusta ${p.down}</button></div>
   <div class="post-actions">
     ${p.gallery === 'ofertas' && !p.deal_sold ? '<button data-sold="1">Marcar como agotada</button>' : ''}
     ${mine || admin ? '<button data-del="1">Borrar</button>' : ''}
     ${admin ? `<button data-hide="${p.hidden ? 0 : 1}">${p.hidden ? 'Mostrar' : 'Ocultar'}</button><button data-pin="${p.pinned ? 0 : 1}">${p.pinned ? 'Quitar aviso' : 'Fijar como aviso'}</button>` : ''}
     <button data-report="1">Reportar</button>
   </div>
  </div>
  <div class="card cmts"><h3>Comentarios (${comments.length})</h3>
   ${comments.map(c => `<div class="cmt"><div class="who">${esc(c.profiles?.nickname || 'usuario')}<span>${ago(c.created_at)}</span></div><p>${esc(c.body)}</p></div>`).join('') || '<div class="hint">Sé la primera persona en comentar.</div>'}
   ${user ? `<form id="cform" style="margin-top:12px"><div class="f"><label for="cbody">Tu comentario</label><textarea id="cbody" maxlength="1000" style="min-height:80px" placeholder="Escribe un comentario respetuoso"></textarea></div><div class="err" id="cerr"></div><button class="btn btn-dark">Comentar</button></form>`
      : `<p class="hint" style="margin-top:12px"><button class="btn btn-sm" id="loginInline">Entrar con Google</button> para comentar.</p>`}
  </div>`;
}

function vWrite(gid) {
  nav('');
  if (!user) return needLogin();
  const g = G[gid] || G.libre;
  return `<div class="card"><div class="gh">${av(g)}<div><h1>Escribir en ${esc(g.name)}</h1><p>Publicas como <b>${esc(profile?.nickname || '')}</b>. Lee las <a href="#reglas" style="color:var(--blue)">reglas</a> antes de publicar.</p></div></div>
  <form id="wform">
   <div class="f"><label for="wg">Galería</label><select id="wg">${GALS.map(x => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
   <div class="f"><label for="wtitle">Título</label><input id="wtitle" maxlength="120" required></div>
   <div id="dealFields" hidden><div class="two"><div class="f"><label for="wprice">Precio (MXN)</label><input id="wprice" inputmode="decimal" maxlength="10" placeholder="299"></div><div class="f"><label for="wstore">Tienda</label><input id="wstore" maxlength="40" placeholder="Amazon MX, Sephora…"></div></div><div class="f"><label for="wurl">Enlace de la oferta</label><input id="wurl" placeholder="https://"></div></div>
   <div id="srcField" hidden class="f"><label for="wsrc">Fuente (obligatoria)</label><input id="wsrc" placeholder="Enlace a entrevista, video oficial o publicación del artista/marca"></div>
   <div class="f"><label for="wbody">Contenido</label><textarea id="wbody" maxlength="5000" required></textarea><div class="hint">No compartas datos personales (tuyos ni de nadie). Máximo 3 enlaces.</div></div>
   <div class="err" id="werr"></div>
   <button class="btn btn-brand">Publicar</button> <a class="btn" href="#g-${g.id}">Cancelar</a>
  </form></div>`;
}
function syncWriteFields() { const g = G[$('#wg').value]; $('#dealFields').hidden = !g.deal; $('#srcField').hidden = !g.needSource; }

const BANNED = ['sasaeng', 'dirección de', 'teléfono de', 'réplica 1:1', 'fake 1:1'];
function validate(text) {
  const links = (text.match(/https?:\/\//g) || []).length; if (links > 3) return 'Máximo 3 enlaces por publicación (antispam).';
  const low = text.toLowerCase(); const b = BANNED.find(w => low.includes(w)); if (b) return 'Tu texto contiene algo no permitido por las reglas ("' + b + '").';
  if (/(\d[\s-]?){10,}/.test(text)) return 'Parece que incluiste un número de teléfono. No compartas datos personales.';
  return '';
}
const okUrl = u => /^https:\/\/[^\s/]+\.[^\s]+$/.test(u);

async function vSearch() {
  nav(''); const raw = $('#q').value.trim(); const k = raw.replace(/[%,()*\\]/g, ' ').trim();
  const r = k && sb ? await q(posts().or(`title.ilike.%${k}%,body.ilike.%${k}%`).order('created_at', { ascending: false }).limit(40)) : [];
  return `<div class="card"><h2>Resultados para “${esc(raw)}” (${r.length})</h2>${r.length ? listWithAds(r, 1, true) : emptyBox('No encontramos nada. Prueba otra palabra.')}</div>`;
}
async function vBest() {
  nav(''); const r = sb ? await q(posts().eq('pinned', false).neq('gallery', 'ofertas').gte('up', BEST).order('created_at', { ascending: false }).limit(40)) : [];
  return ad('leader') + `<div class="card"><h2>Destacados (${BEST}+ me gusta)</h2>${r.length ? listWithAds(r, 1, true) : emptyBox('Aún no hay destacados.')}</div>`;
}
function vAllGals() { nav('galerias'); return CATS.map(c => `<div class="card"><h2>${esc(c.name)}</h2><div class="galgrid">${GALS.filter(g => g.cat === c.id).map(galCard).join('')}</div></div>`).join('') + `<div class="card"><h2>¿Falta tu grupo?</h2><p>Pídelo en <a href="#g-solicitudes" style="color:var(--blue)">Solicitar galería</a>.</p></div>`; }
function vGuides() { nav('guias'); return `<div class="card"><h2>Guías</h2><div class="guides">${Object.entries(GUIDES).map(([k, g]) => `<a class="guide" href="#${k}"><b>${esc(g.t)}</b><span>${esc(g.d)}</span></a>`).join('')}</div></div>`; }
function vGuide(k) { nav('guias'); const g = GUIDES[k]; return ad('leader') + `<div class="card article"><a href="#guias" class="hint">← Guías</a><h1>${esc(g.t)}</h1>${g.html}${ad('post')}</div>`; }
function vRules() { nav(''); return `<div class="card article">${RULES_HTML}</div>`; }
function vPrivacy() { nav(''); return `<div class="card article">${PRIVACY_HTML}</div>`; }
function vNotFound(m) { nav(''); return `<div class="card empty">${esc(m || 'Página no encontrada.')} <a href="#home" style="color:var(--blue)">Ir al inicio</a></div>`; }

function vProfile() {
  nav('');
  if (!user) return needLogin();
  return `<div class="card"><h2>Mi perfil</h2><form id="pform"><div class="f"><label for="pnick">Apodo visible</label><input id="pnick" maxlength="20" value="${esc(profile?.nickname || '')}"><div class="hint">De 2 a 20 caracteres. Tu correo de Google nunca se muestra.</div></div><div class="err" id="perr"></div><button class="btn btn-dark">Guardar</button></form></div>`;
}

// Panel de revisión (solo administradores): ofertas automáticas y publicaciones reportadas u ocultas
async function vAdmin() {
  nav('');
  if (!user) return needLogin();
  if (!admin) return vNotFound('Esta página es solo para el equipo.');
  const since = new Date(Date.now() - 3 * D).toISOString();
  const dayAgo = new Date(Date.now() - D).toISOString(), weekAgo = new Date(Date.now() - 7 * D).toISOString();
  const count = async b => { const { count: c, error } = await b; return error ? '—' : c; };
  const head = { count: 'exact', head: true };
  const [members, membersWeek, postsAll, postsDay, dealsLive, comments] = await Promise.all([
    count(sb.from('profiles').select('id', head)),
    count(sb.from('profiles').select('id', head).gte('created_at', weekAgo)),
    count(sb.from('posts').select('id', head)),
    count(sb.from('posts').select('id', head).gte('created_at', dayAgo)),
    count(sb.from('posts').select('id', head).eq('gallery', 'ofertas').eq('deal_sold', false).gte('deal_expires_at', new Date().toISOString())),
    count(sb.from('comments').select('id', head).gte('created_at', dayAgo))
  ]);
  const stat = (k, v, d) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px"><div class="hint">${k}</div><div style="font-size:22px;font-weight:800">${v}</div>${d ? `<div class="hint">${d}</div>` : ''}</div>`;
  const stats = `<div class="card"><h2>Resumen</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
    ${stat('Miembros', members, `+${membersWeek} esta semana`)}${stat('Publicaciones', postsAll, `+${postsDay} en 24 h`)}
    ${stat('Ofertas vigentes', dealsLive, 'precio de menos de 24 h')}${stat('Comentarios', comments, 'en 24 h')}</div>
    <p class="hint" style="margin-top:8px">Para llevar estas cifras al panel de operación (GaleríaK 운영실), anótalas en la pestaña KPI una vez por semana.</p></div>`;
  const [auto, flagged] = await Promise.all([
    q(sb.from('posts').select(POST_COLS + ',deal_url,deal_asin,deal_source').eq('is_auto', true).gte('created_at', since).order('created_at', { ascending: false })),
    q(sb.from('posts').select(POST_COLS + ',reports').or('hidden.eq.true,reports.gt.0').order('created_at', { ascending: false }).limit(50))
  ]);
  let runInfo = '';
  try {
    const r = await fetch('https://raw.githubusercontent.com/showsong119/galeriak/main/deals/last-run.json', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); runInfo = `Última ejecución del bot: ${new Date(j.at).toLocaleString('es-MX')} · publicadas ${j.published?.length ?? 0} · rechazadas ${j.rejected?.length ?? 0} · PA-API ${j.paapi ? 'activa' : 'inactiva'}${j.status === 'sin-configurar' ? ' · faltan secretos: ' + esc((j.missing || []).join(', ')) : ''}`; }
  } catch (e) { /* sin registro */ }
  const adminRow = p => `<div class="adm-row"><div class="t">${tags(p, true)}<a href="#p-${p.id}">${esc(p.title)}</a><div class="hint">${ago(p.created_at)} · ${p.deal_price != null ? esc(fmtPrice(p.deal_price)) + ' · ' : ''}${p.deal_source ? esc(p.deal_source) + ' · ' : ''}${p.reports ? p.reports + ' reportes · ' : ''}♥ ${p.up}</div></div>
    ${p.deal_url ? `<a class="btn btn-sm" href="${esc(p.deal_url)}" target="_blank" rel="nofollow sponsored noopener">Abrir</a>` : ''}
    <button class="btn btn-sm" data-ahide="${p.id}" data-v="${p.hidden ? 0 : 1}">${p.hidden ? 'Mostrar' : 'Ocultar'}</button>
    <button class="btn btn-sm" data-adel="${p.id}">Borrar</button></div>`;
  return `<div class="card"><h2>Revisión</h2><p class="hint">${runInfo || 'Sin registro del bot todavía.'}</p></div>
  ${stats}
  <div class="card"><h2>Ofertas del bot (últimos 3 días) · ${auto.length}</h2>${auto.length ? auto.map(adminRow).join('') : emptyBox('El bot no ha publicado nada en los últimos 3 días.')}</div>
  <div class="card"><h2>Reportadas u ocultas · ${flagged.length}</h2>${flagged.length ? flagged.map(adminRow).join('') : emptyBox('Nada pendiente.')}</div>`;
}

/* ---------------- Router ---------------- */
async function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'home'; let html, m;
  try {
    if (h === 'home') html = await vHome();
    else if ((m = h.match(/^c-(\w+)$/))) html = CATS.some(c => c.id === m[1]) ? await vCat(m[1]) : vNotFound();
    else if ((m = h.match(/^g-([\w-]+)$/))) { if (lastGal !== m[1]) { galTab = 'all'; galPage = 1; } lastGal = m[1]; html = await vGal(m[1]); }
    else if ((m = h.match(/^p-(\d+)$/))) html = await vPost(+m[1]);
    else if ((m = h.match(/^w-([\w-]+)$/))) html = vWrite(m[1]);
    else if (h === 'buscar') html = await vSearch();
    else if (h === 'mejores') html = await vBest();
    else if (h === 'galerias') html = vAllGals();
    else if (h === 'guias') html = vGuides();
    else if (GUIDES[h]) html = vGuide(h);
    else if (h === 'reglas') html = vRules();
    else if (h === 'privacidad') html = vPrivacy();
    else if (h === 'perfil') html = vProfile();
    else if (h === 'admin') html = await vAdmin();
    else if (h.startsWith('access_token') || h.startsWith('error')) { history.replaceState(null, '', location.pathname + '#home'); html = await vHome(); }
    else html = vNotFound();
  } catch (e) { console.error(e); html = vNotFound('Algo salió mal. Intenta de nuevo.'); }
  $('#main').innerHTML = html; window.scrollTo(0, 0);
  side();
  const gm = h.match(/^g-([\w-]+)$/);
  document.title = gm && G[gm[1]] ? G[gm[1]].name + ' – GaleríaK' : GUIDES[h] ? GUIDES[h].t + ' – GaleríaK' : h.startsWith('p-') ? ($('.post h1')?.textContent || 'GaleríaK') + ' – GaleríaK' : 'GaleríaK – Comunidad de K-Beauty, K-Pop y ofertas en México';
  if ($('#wg')) { $('#wg').onchange = syncWriteFields; syncWriteFields(); }
  if ($('#loginInline')) $('#loginInline').onclick = login;
}
function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
const curPostId = () => { const m = location.hash.match(/^#p-(\d+)$/); return m ? +m[1] : null; };

/* ---------------- Eventos ---------------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a'); if (!t) return;
  if (t.dataset.tab) { galTab = t.dataset.tab; galPage = 1; return route(); }
  if (t.dataset.page) { galPage = Math.max(1, galPage + Number(t.dataset.page)); return route(); }
  if (t.dataset.ahide || t.dataset.adel) {
    const id = +(t.dataset.ahide || t.dataset.adel);
    if (t.dataset.adel) { if (!confirm('¿Borrar esta publicación?')) return; await sb.from('posts').delete().eq('id', id); toast('Borrada'); }
    else { await sb.from('posts').update({ hidden: t.dataset.v === '1' }).eq('id', id); toast(t.dataset.v === '1' ? 'Ocultada' : 'Visible otra vez'); }
    return route();
  }
  const pid = curPostId(); if (!pid) return;
  const act = ['vote', 'report', 'sold', 'del', 'hide', 'pin'].find(k => t.dataset[k] != null);
  if (!act) return;
  if (!user) return toast('Inicia sesión con Google para hacer esto');
  if (act === 'vote') {
    const { error } = await sb.from('votes').insert({ post_id: pid, user_id: user.id, value: +t.dataset.vote });
    toast(error ? (error.code === '23505' ? 'Ya votaste en esta publicación' : 'No se pudo votar') : '¡Gracias por votar!'); if (!error) route();
  } else if (act === 'report') {
    const { error } = await sb.from('reports').insert({ post_id: pid, user_id: user.id });
    toast(error ? (error.code === '23505' ? 'Ya reportaste esta publicación' : 'No se pudo reportar') : 'Reporte enviado. El equipo lo revisará.');
  } else if (act === 'sold') {
    await sb.rpc('mark_sold', { pid }); toast('Marcada como agotada'); route();
  } else if (act === 'del') {
    if (!confirm('¿Borrar esta publicación?')) return;
    const { error } = await sb.from('posts').delete().eq('id', pid); toast(error ? 'No se pudo borrar' : 'Publicación borrada'); if (!error) go('home');
  } else if (act === 'hide') {
    await sb.from('posts').update({ hidden: t.dataset.hide === '1' }).eq('id', pid); toast('Listo'); route();
  } else if (act === 'pin') {
    await sb.from('posts').update({ pinned: t.dataset.pin === '1' }).eq('id', pid); toast('Listo'); route();
  }
});
$('#writeTop').onclick = () => { const m = location.hash.match(/^#g-([\w-]+)$/); go('w-' + (m && G[m[1]] ? m[1] : 'libre')); };
$('#searchForm').onsubmit = e => { e.preventDefault(); if ($('#q').value.trim()) go('buscar'); };
document.addEventListener('submit', async e => {
  if (e.target.id === 'wform') {
    e.preventDefault(); const err = $('#werr'); const g = G[$('#wg').value];
    const title = $('#wtitle').value.trim(), body = $('#wbody').value.trim();
    if (title.length < 4) return err.textContent = 'El título es muy corto.';
    if (body.length < 10) return err.textContent = 'Escribe un poco más en el contenido.';
    const v = validate(title + ' ' + body); if (v) return err.textContent = v;
    const post = { gallery: g.id, title, body, author_id: user.id };
    if (g.deal) {
      const price = Number($('#wprice').value.replace(/[$,\s]/g, '')), store = $('#wstore').value.trim(), url = $('#wurl').value.trim();
      if (!(price > 0) || !store) return err.textContent = 'Las ofertas necesitan precio y tienda.';
      if (!okUrl(url)) return err.textContent = 'Agrega un enlace válido a la oferta (https://…).';
      Object.assign(post, { deal_price: price, deal_store: store, deal_url: url });
    }
    if (g.needSource) { const s = $('#wsrc').value.trim(); if (!okUrl(s)) return err.textContent = 'En esta galería la fuente es obligatoria (enlace https://…).'; post.src = s; }
    const { data, error } = await sb.from('posts').insert(post).select('id').single();
    if (error) return err.textContent = 'No se pudo publicar. Intenta de nuevo.';
    toast('¡Publicado!'); go('p-' + data.id);
  }
  if (e.target.id === 'cform') {
    e.preventDefault(); const pid = curPostId(); if (!pid) return;
    const b = $('#cbody').value.trim(); if (b.length < 2) return $('#cerr').textContent = 'El comentario está vacío.';
    const v = validate(b); if (v) return $('#cerr').textContent = v;
    const { error } = await sb.from('comments').insert({ post_id: pid, author_id: user.id, body: b });
    if (error) return $('#cerr').textContent = 'No se pudo comentar.';
    toast('Comentario publicado'); route();
  }
  if (e.target.id === 'pform') {
    e.preventDefault(); const n = $('#pnick').value.trim();
    if (n.length < 2 || n.length > 20) return $('#perr').textContent = 'De 2 a 20 caracteres.';
    const { error } = await sb.from('profiles').update({ nickname: n }).eq('id', user.id);
    if (error) return $('#perr').textContent = error.code === '23505' ? 'Ese apodo ya existe.' : 'No se pudo guardar.';
    profile.nickname = n; renderAuth(); toast('Guardado');
  }
});

window.addEventListener('hashchange', route);
if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') loadSession().then(route); });
loadSession().then(route);
