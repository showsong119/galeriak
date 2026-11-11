// TikTok: envía cada día el carrusel (card news) de la lección publicada a la bandeja de entrada (borradores) de TikTok.
// El usuario abre la notificación en la app, pega el texto y publica (un toque). No usa contraseñas:
// solo OAuth (Login Kit) + Content Posting API, fotos PULL_FROM_URL en modo MEDIA_UPLOAD (scope video.upload).
//
//   node scripts/tiktok.mjs conectar   (TIKTOK_CODIGO = code que devuelve /tiktok/ tras autorizar)
//   node scripts/tiktok.mjs enviar     (cron diario)
//   node scripts/tiktok.mjs elegir     (solo muestra qué enviaría, sin red — para pruebas)
//
// Secrets: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET. El refresh token se guarda CIFRADO
// (AES-256-GCM con TIKTOK_CLIENT_SECRET) en content/tiktok/token.enc — el repo es público.
// Nada personal ni secreto se imprime en los logs (también son públicos).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/tiktok');
const TOKEN = join(DIR, 'token.enc');
const ESTADO = join(DIR, 'estado.json');
const HOY = join(ROOT, 'site/sns/hoy.json');
const API = process.env.TIKTOK_API || 'https://open.tiktokapis.com';
const SITIO = process.env.SITIO_URL || 'https://galeriakmx.com';
const listarFotos = slug => { try { return readdirSync(join(ROOT, 'site/img/sns', slug)).filter(f => /^\d\d\.jpg$/.test(f)).sort(); } catch { return []; } };
// TikTok: título ≤ 90 y descripción ≤ 4000 (UTF-16)
export const recortar = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/[\uD800-\uDBFF]$/, '') + '…');
export const REDIRECT = 'https://galeriakmx.com/tiktok/';

const key = (s, salt) => scryptSync(s, salt, 32);
export function cifrar(obj, secreto) {
  const salt = randomBytes(16), iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key(secreto, salt), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([salt, iv, c.getAuthTag(), data]).toString('base64');
}
export function descifrar(b64, secreto) {
  const b = Buffer.from(b64.trim(), 'base64'), d = createDecipheriv('aes-256-gcm', key(secreto, b.subarray(0, 16)), b.subarray(16, 28));
  d.setAuthTag(b.subarray(28, 44));
  return JSON.parse(Buffer.concat([d.update(b.subarray(44)), d.final()]).toString('utf8'));
}

const leer = (p, def) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return def; } };
const hoyMx = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(d);
const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// Qué carrusel (card news, 3+ fotos en site/img/sns/<slug>/NN.jpg) toca hoy: la lección publicada hoy (content/diario/ultima.json). Si ya se envió,
// la promo del examen (máx. 1 vez cada 7 días). Si no, nada. Nunca repite un video en 30 días.
export function elegir({ ultima, enviados = [], items = [], listar = () => ['01.jpg', '02.jpg', '03.jpg'], hoy = hoyMx() }) {
  const reciente = (slug, n) => enviados.some(e => e.slug === slug && dias(e.dia, hoy) < n);
  if (enviados.some(e => e.dia === hoy)) return { motivo: 'ya-enviado-hoy' };
  const cands = [];
  if (ultima?.archivo) cands.push([ultima.archivo.replace(/\.json$/, ''), 30]);
  cands.push(['examen', 7]);
  for (const [slug, n] of cands) {
    if (reciente(slug, n)) continue;
    const fotos = listar(slug);
    if (fotos.length < 3) continue;
    const it = items.find(i => i.slug === slug);
    return { slug, fotos, texto: it?.texto || '', titulo: it?.titulo || slug };
  }
  return { motivo: 'nada-nuevo' };
}

async function api(path, { token, json, form } = {}) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=UTF-8',
    },
    body: form ? new URLSearchParams(form) : JSON.stringify(json || {}),
  });
  const j = await r.json().catch(() => ({}));
  const err = j.error && j.error.code && j.error.code !== 'ok' ? j.error : (j.error && typeof j.error === 'string' ? { code: j.error, message: j.error_description } : null);
  if (!r.ok || err) throw new Error(`${path} → HTTP ${r.status} ${err?.code || ''} ${err?.message || ''}`.trim());
  return j;
}

function guardarToken(t, secreto) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(TOKEN, cifrar({ refresh_token: t.refresh_token, refresh_expira: Date.now() + (t.refresh_expires_in || 0) * 1000, open_id: t.open_id, scope: t.scope }, secreto) + '\n');
}

function estado(cambios) {
  const e = { ...leer(ESTADO, { enviados: [] }), ...cambios, at: new Date().toISOString() };
  e.enviados = (e.enviados || []).slice(-60);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(ESTADO, JSON.stringify(e, null, 2) + '\n');
  return e;
}

async function main() {
  const cmd = process.argv[2];
  const CK = (process.env.TIKTOK_CLIENT_KEY || '').trim(), CS = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
  const items = leer(join(ROOT, 'site/sns/items.json'), []);
  const ultima = leer(join(ROOT, 'content/diario/ultima.json'), null);

  if (cmd === 'elegir') {
    console.log(JSON.stringify(elegir({ ultima, enviados: leer(ESTADO, {}).enviados || [], items, listar: listarFotos }), null, 2));
    return;
  }
  if (!CK || !CS) {
    console.log('::warning::Faltan los secrets TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET — no se hace nada.');
    estado({ status: 'sin-configurar', missing: [!CK && 'TIKTOK_CLIENT_KEY', !CS && 'TIKTOK_CLIENT_SECRET'].filter(Boolean) });
    return;
  }

  if (cmd === 'conectar') {
    const code = (process.env.TIKTOK_CODIGO || '').trim();
    if (!code) throw new Error('Falta el código (input "codigo").');
    const t = await api('/v2/oauth/token/', { form: { client_key: CK, client_secret: CS, code: decodeURIComponent(code), grant_type: 'authorization_code', redirect_uri: REDIRECT } });
    if (!/video\.upload/.test(t.scope || '')) console.log('::warning::El permiso video.upload no fue concedido. Revisa los productos/scopes de la app en TikTok for Developers.');
    guardarToken(t, CS);
    estado({ status: 'conectado', scope: t.scope });
    console.log('✅ TikTok conectado. Scopes:', t.scope);
    return;
  }

  if (cmd === 'enviar' || cmd === 'reenviar') {
    const forzar = cmd === 'reenviar'; // prueba: ignora «ya enviado hoy» y la regla de 30 días
    if (!existsSync(TOKEN)) {
      estado({ status: 'sin-conectar' });
      console.log('::warning::TikTok aún no está conectado (falta content/tiktok/token.enc). Abre https://galeriakmx.com/tiktok/');
      return;
    }
    const e0 = leer(ESTADO, { enviados: [] });
    const pick = elegir({ ultima, enviados: forzar ? [] : (e0.enviados || []), items, listar: listarFotos });
    if (!pick.slug) { estado({ status: 'sin-envio', motivo: pick.motivo }); console.log('Nada que enviar hoy:', pick.motivo); return; }

    // Token nuevo cada vez (el access token dura 24 h); TikTok puede rotar el refresh token → se guarda.
    const viejo = descifrar(readFileSync(TOKEN, 'utf8'), CS);
    const t = await api('/v2/oauth/token/', { form: { client_key: CK, client_secret: CS, grant_type: 'refresh_token', refresh_token: viejo.refresh_token } });
    if (t.refresh_token && t.refresh_token !== viejo.refresh_token) guardarToken(t, CS);

    // Carrusel de fotos: TikTok las descarga de galeriakmx.com (prefijo verificado en la app) → bandeja de borradores
    const urls = pick.fotos.map(f => `${SITIO}/img/sns/${pick.slug}/${f}`);
    if (!process.env.TIKTOK_API) {
      const h = await fetch(urls[0], { method: 'HEAD' });
      if (!h.ok) throw new Error(`Las fotos aún no están publicadas en el sitio (${h.status}): ${urls[0]}`);
    }
    const ini = await api('/v2/post/publish/content/init/', { token: t.access_token, json: {
      media_type: 'PHOTO', post_mode: 'MEDIA_UPLOAD',
      post_info: { title: recortar(pick.titulo.replace(/^Coreano del día #\d+:\s*/, ''), 90), description: recortar(pick.texto, 4000) },
      source_info: { source: 'PULL_FROM_URL', photo_images: urls, photo_cover_index: 0 },
    } });
    const { publish_id } = ini.data || {};
    let st = '';
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, i ? 10000 : 3000));
      const s = await api('/v2/post/publish/status/fetch/', { token: t.access_token, json: { publish_id } });
      st = s.data?.status || '';
      if (st === 'SEND_TO_USER_INBOX' || st === 'PUBLISH_COMPLETE' || st === 'FAILED') { if (st === 'FAILED') throw new Error('TikTok: FAILED ' + (s.data?.fail_reason || '')); break; }
    }
    const dia = hoyMx();
    estado({ status: 'enviado', ultimo: { dia, slug: pick.slug, publish_id, tiktok_status: st }, enviados: [...(e0.enviados || []), { dia, slug: pick.slug }] });
    writeFileSync(HOY, JSON.stringify({ dia, slug: pick.slug, titulo: pick.titulo, texto: pick.texto, img: `/img/sns/${pick.slug}/01.jpg`, fotos: pick.fotos.map(f => `/img/sns/${pick.slug}/${f}`), enviados: [...(e0.enviados || []), { dia, slug: pick.slug }].slice(-30) }, null, 2) + '\n');
    console.log(`✅ Carrusel enviado a la bandeja de TikTok: ${pick.slug}, ${pick.fotos.length} fotos (${st || 'procesando'})`);
    return;
  }
  throw new Error('Acción desconocida: usa conectar | enviar | reenviar | elegir');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    try { estado({ status: 'error', error: String(err.message).slice(0, 300) }); } catch {}
    console.log('::error::' + err.message);
    process.exit(1);
  });
}
