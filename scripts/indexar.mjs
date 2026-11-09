// GaleríaK · avisar a los buscadores cuando hay páginas nuevas o actualizadas
// Corre en GitHub Actions (.github/workflows/indexar.yml) después de cada despliegue y una vez al día.
//
//  1. IndexNow (Bing, Yandex, Naver, Seznam…): lee el sitemap publicado y envía SOLO las URLs nuevas o con
//     <lastmod> distinto al último envío (estado en seo/indexnow-estado.json). No necesita configuración.
//  2. Google (opcional, con el secreto GSC_SERVICE_ACCOUNT = JSON de una cuenta de servicio agregada como
//     propietaria en Search Console):
//       · vuelve a enviar el sitemap cuando hay URLs nuevas (máx. 1 vez al día)
//       · cada 7 días revisa con la API de inspección de URLs si las páginas principales están indexadas
//         y guarda el resultado en seo/google-estado.json
//     Google no permite automatizar el botón «Solicitar indexación» para páginas normales:
//     su Indexing API es solo para ofertas de empleo y transmisiones en vivo.
//
// Variables: SITE (https://galeriakmx.com), GSC_SERVICE_ACCOUNT (opcional), DRY_RUN=1

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const DRY = env.DRY_RUN === '1';
export const SITE = (env.SITE || 'https://galeriakmx.com').replace(/\/$/, '');
export const INDEXNOW_KEY = '0158a4d97848eee6339bb20951c82231'; // público: también está en site/<clave>.txt
const ESTADO = path.join(ROOT, 'seo', 'indexnow-estado.json');
const GESTADO = path.join(ROOT, 'seo', 'google-estado.json');
const DAY = 864e5;

// ---------- sitemap ----------
export function leerSitemap(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/) || [])[1];
    const lastmod = (m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/) || [])[1] || '';
    if (loc) out.push({ loc, lastmod });
  }
  return out;
}

// URLs para enviar: nuevas o con otra fecha; solo de nuestro dominio
export function pendientes(urls, estado) {
  const host = new URL(SITE).host;
  return urls.filter(u => { try { return new URL(u.loc).host === host; } catch { return false; } })
    .filter(u => estado[u.loc] !== (u.lastmod || '-'));
}

// ---------- IndexNow ----------
async function indexNow(lista) {
  const host = new URL(SITE).host;
  let enviados = 0;
  for (let i = 0; i < lista.length; i += 1000) {
    const urlList = lista.slice(i, i + 1000).map(u => u.loc);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList })
    });
    if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow ${res.status}: ${(await res.text()).slice(0, 200)}`);
    enviados += urlList.length;
  }
  return enviados;
}

// ---------- Google (cuenta de servicio, firma JWT sin dependencias) ----------
export function jwt(sa, scope, now = Math.floor(Date.now() / 1000)) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  return unsigned + '.' + sig;
}
async function googleToken(sa) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt(sa, 'https://www.googleapis.com/auth/webmasters') })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google token ${res.status}: ${j.error_description || j.error || ''}`);
  return j.access_token;
}
const PROP = () => SITE + '/';
async function enviarSitemap(token) {
  const u = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROP())}/sitemaps/${encodeURIComponent(SITE + '/sitemap.xml')}`;
  const res = await fetch(u, { method: 'PUT', headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Search Console sitemap ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
async function inspeccionar(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: PROP(), languageCode: 'es-MX' })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Inspección ${res.status}: ${j.error?.message || ''}`);
  const r = j.inspectionResult?.indexStatusResult || {};
  return { verdict: r.verdict || '', estado: r.coverageState || '', rastreo: r.lastCrawlTime || '' };
}
// Páginas que más importan: portada, examen, guías y las 20 publicaciones más recientes
export function prioritarias(urls) {
  const fijas = urls.filter(u => !/\/p\/\d+\/$/.test(u.loc) && !/\/g\/([^/]+\/)?$/.test(u.loc));
  const posts = urls.filter(u => /\/p\/\d+\/$/.test(u.loc)).sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || '')).slice(0, 20);
  return [...fijas, ...posts].slice(0, 80);
}

const leerJSON = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };
async function resumen(lines) { const s = lines.join('\n'); console.log(s); if (env.GITHUB_STEP_SUMMARY) await writeFile(env.GITHUB_STEP_SUMMARY, s + '\n', { flag: 'a' }); }

export async function main() {
  await mkdir(path.join(ROOT, 'seo'), { recursive: true });
  const out = ['## Avisos a buscadores'];
  const sm = await fetch(`${SITE}/sitemap.xml`, { cache: 'no-store' });
  if (!sm.ok) { out.push(`No se pudo leer el sitemap (${sm.status}).`); return resumen(out); }
  const urls = leerSitemap(await sm.text());
  const estado = await leerJSON(ESTADO, {});
  const nuevas = pendientes(urls, estado);
  out.push(`Sitemap: ${urls.length} URLs · nuevas o actualizadas: ${nuevas.length}`);

  // 1) IndexNow
  if (nuevas.length) {
    const k = await fetch(`${SITE}/${INDEXNOW_KEY}.txt`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '');
    if (k.trim() !== INDEXNOW_KEY) out.push('IndexNow: la clave todavía no está publicada en el sitio; se reintenta en la próxima corrida.');
    else if (DRY) out.push(`IndexNow (prueba): se enviarían ${nuevas.length}`);
    else {
      try {
        const n = await indexNow(nuevas);
        for (const u of nuevas) estado[u.loc] = u.lastmod || '-';
        await writeFile(ESTADO, JSON.stringify(estado, null, 1) + '\n');
        out.push(`IndexNow: ${n} URLs enviadas a Bing, Naver, Yandex y Seznam ✅`, ...nuevas.slice(0, 15).map(u => `- ${u.loc}`));
      } catch (e) { out.push(`IndexNow: error (${e.message}); se reintenta después.`); }
    }
  }

  // 2) Google (opcional)
  let sa = null;
  try { sa = env.GSC_SERVICE_ACCOUNT ? JSON.parse(env.GSC_SERVICE_ACCOUNT) : null; } catch { out.push('Google: GSC_SERVICE_ACCOUNT no es un JSON válido.'); }
  if (!sa) { out.push('Google: sin cuenta de servicio (opcional). El sitemap ya está en Search Console y Google lo vuelve a leer solo.'); return resumen(out); }
  if (DRY) { out.push('Google (prueba): se omitió.'); return resumen(out); }
  const g = await leerJSON(GESTADO, { sitemap_enviado: 0, revisado: 0, urls: {} });
  try {
    const token = await googleToken(sa);
    if (nuevas.length && Date.now() - (g.sitemap_enviado || 0) > DAY - 36e5) {
      await enviarSitemap(token); g.sitemap_enviado = Date.now(); out.push('Google: sitemap reenviado a Search Console ✅');
    }
    if (Date.now() - (g.revisado || 0) > 7 * DAY - 36e5) {
      const lista = prioritarias(urls); let ok = 0;
      for (const u of lista) {
        try { g.urls[u.loc] = await inspeccionar(token, u.loc); if (g.urls[u.loc].verdict === 'PASS') ok++; } catch (e) { g.urls[u.loc] = { error: e.message }; }
        await new Promise(r => setTimeout(r, 300));
      }
      g.revisado = Date.now();
      out.push(`Google: revisadas ${lista.length} páginas · indexadas ${ok} · sin indexar ${lista.length - ok}`);
      const no = lista.filter(u => g.urls[u.loc]?.verdict !== 'PASS').slice(0, 15);
      out.push(...no.map(u => `- ❌ ${u.loc} — ${g.urls[u.loc]?.estado || g.urls[u.loc]?.error || ''}`));
    }
    await writeFile(GESTADO, JSON.stringify(g, null, 1) + '\n');
  } catch (e) { out.push(`Google: ${e.message}`); }
  return resumen(out);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
