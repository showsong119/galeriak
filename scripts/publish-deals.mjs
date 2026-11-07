// GaleríaK · bot de ofertas
// Corre en GitHub Actions (diario y cada vez que llega un archivo a deals/inbox/).
//  1. Lee candidatos curados en deals/inbox/*.json
//  2. Si hay llaves de Amazon PA-API: verifica precio de cada candidato y busca ofertas nuevas
//     de marcas coreanas con descuento real.
//  3. Valida, quita duplicados y publica en la galería "ofertas" de Supabase.
//  4. Mueve los archivos procesados a deals/processed/ y escribe deals/last-run.json.
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AMAZON_TAG (obligatorias salvo DRY_RUN=1)
//   PAAPI_ACCESS_KEY, PAAPI_SECRET_KEY (opcionales: activan verificación automática de precios)
//   MAX_PER_RUN (default 6), MIN_SAVING (default 15), DRY_RUN=1 (no escribe nada)

import { readFile, readdir, mkdir, rename, writeFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(ROOT, 'deals', 'inbox');
const DONE = path.join(ROOT, 'deals', 'processed');
const env = process.env;
const DRY = env.DRY_RUN === '1';
const MAX = Number(env.MAX_PER_RUN || 6);
const MIN_SAVING = Number(env.MIN_SAVING || 15);
const PRICE_TTL_H = 24; // Amazon: un precio mostrado no debe tener más de 24 h
const DEDUPE_DAYS = 7;

// Marcas coreanas que el bot busca en Amazon México (solo con PA-API)
export const BRANDS = ['COSRX', 'Beauty of Joseon', 'ANUA', 'Round Lab', 'SKIN1004', 'Torriden', 'Medicube',
  'Laneige', 'Innisfree', 'Some By Mi', 'Isntree', 'Klairs', 'Missha', 'Etude', 'TONYMOLY', 'Mixsoon', 'Numbuzin', 'Dr.Jart+'];

export const ASIN_RE = /^[A-Z0-9]{10}$/;

// ---------------- Validación ----------------
export function validateCandidate(c) {
  const errs = [];
  if (!c || typeof c !== 'object') return ['no es un objeto'];
  if (!ASIN_RE.test(String(c.asin || ''))) errs.push('ASIN inválido');
  const t = String(c.title || '').trim();
  if (t.length < 4 || t.length > 120) errs.push('título de 4 a 120 caracteres');
  if (c.price != null && !(Number(c.price) > 0 && Number(c.price) < 100000)) errs.push('precio inválido');
  if (c.list_price != null && !(Number(c.list_price) > 0)) errs.push('precio de lista inválido');
  if (c.note && String(c.note).length > 600) errs.push('nota demasiado larga');
  if (/https?:\/\//i.test(t)) errs.push('el título no lleva enlaces');
  return errs;
}

export function affiliateUrl(asin, tag) {
  return `https://www.amazon.com.mx/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

const fmtMXN = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' MXN';

export function buildPost(c, tag, now = new Date()) {
  const price = c.price != null ? Number(c.price) : null;
  const list = c.list_price != null ? Number(c.list_price) : null;
  const saving = price && list && list > price ? Math.round((1 - price / list) * 100) : null;
  const lines = [];
  if (c.note) lines.push(String(c.note).trim());
  if (price) {
    const when = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
    lines.push(`Precio ${fmtMXN(price)}${saving ? ` (antes ${fmtMXN(list)}, -${saving}%)` : ''} visto el ${when} (hora CDMX). Los precios y la disponibilidad pueden cambiar.`);
  } else {
    lines.push('Revisa el precio actual en Amazon antes de comprar.');
  }
  lines.push('Publicado automáticamente por el bot de ofertas de GaleríaK. Si la oferta ya no está, márcala como agotada.');
  lines.push('Como Afiliado de Amazon, GaleríaK obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.');
  const title = (saving ? `[-${saving}%] ` : '') + String(c.title).trim();
  return {
    gallery: 'ofertas',
    title: title.slice(0, 120),
    body: lines.join('\n\n'),
    author_label: 'Bot de ofertas',
    is_auto: true,
    deal_price: price,
    deal_list_price: list,
    deal_store: 'Amazon México',
    deal_url: affiliateUrl(c.asin, tag),
    deal_asin: c.asin,
    deal_price_at: price ? now.toISOString() : null,
    deal_expires_at: new Date(now.getTime() + PRICE_TTL_H * 3600e3).toISOString(),
    deal_source: c.verified ? 'amazon-pa-api' : 'curaduria'
  };
}

// ---------------- Amazon PA-API 5 (firma SigV4) ----------------
const PA = { host: 'webservices.amazon.com.mx', region: 'us-east-1', service: 'ProductAdvertisingAPI', marketplace: 'www.amazon.com.mx' };
const OFFER_RESOURCES = ['OffersV2.Listings.Price', 'OffersV2.Listings.Availability', 'OffersV2.Listings.MerchantInfo'];

const sha256 = s => createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (k, s) => createHmac('sha256', k).update(s, 'utf8').digest();

export function signPaapi(op, payload, access, secret, now = new Date()) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const pathName = '/paapi5/' + op.toLowerCase();
  const target = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.' + op;
  const body = JSON.stringify(payload);
  const headers = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    host: PA.host,
    'x-amz-date': amzDate,
    'x-amz-target': target
  };
  const signed = Object.keys(headers).sort();
  const canonical = ['POST', pathName, '', signed.map(h => `${h}:${headers[h]}\n`).join(''), signed.join(';'), sha256(body)].join('\n');
  const scope = `${day}/${PA.region}/${PA.service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  let k = hmac('AWS4' + secret, day); k = hmac(k, PA.region); k = hmac(k, PA.service); k = hmac(k, 'aws4_request');
  const sig = createHmac('sha256', k).update(toSign, 'utf8').digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signed.join(';')}, Signature=${sig}`;
  return { url: `https://${PA.host}${pathName}`, headers, body };
}

async function paapi(op, payload) {
  const req = signPaapi(op, { PartnerTag: env.AMAZON_TAG, PartnerType: 'Associates', Marketplace: PA.marketplace, ...payload },
    env.PAAPI_ACCESS_KEY, env.PAAPI_SECRET_KEY);
  const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PA-API ${op} ${res.status}: ${JSON.stringify(json.Errors || json).slice(0, 300)}`);
  return json;
}

// Lee precio actual y precio de referencia de un item (OffersV2, con respaldo a Offers v1)
export function readOffer(item) {
  const l2 = item?.OffersV2?.Listings?.[0];
  const l1 = item?.Offers?.Listings?.[0];
  const price = l2?.Price?.Money?.Amount ?? l1?.Price?.Amount ?? null;
  const list = l2?.Price?.SavingBasis?.Money?.Amount ?? l1?.SavingBasis?.Amount ?? null;
  const avail = l2?.Availability?.Type ?? l1?.Availability?.Type ?? null;
  return { price, list, available: !avail || /IN_STOCK|NOW/i.test(avail) };
}

const itemTitle = it => it?.ItemInfo?.Title?.DisplayValue;

async function verifyWithPaapi(cands) {
  const out = [];
  for (let i = 0; i < cands.length; i += 10) {
    const chunk = cands.slice(i, i + 10);
    const res = await paapi('GetItems', { ItemIds: chunk.map(c => c.asin), Resources: ['ItemInfo.Title', ...OFFER_RESOURCES] });
    const byAsin = Object.fromEntries((res.ItemsResult?.Items || []).map(it => [it.ASIN, it]));
    for (const c of chunk) {
      const it = byAsin[c.asin];
      if (!it) { out.push({ ...c, _skip: 'no encontrado en Amazon' }); continue; }
      const o = readOffer(it);
      if (!o.price || !o.available) { out.push({ ...c, _skip: 'sin precio o sin stock' }); continue; }
      out.push({ ...c, price: o.price, list_price: o.list && o.list > o.price ? o.list : null, verified: true });
    }
  }
  return out;
}

async function discoverWithPaapi() {
  const found = [];
  for (const brand of BRANDS) {
    try {
      const res = await paapi('SearchItems', {
        Keywords: brand, Brand: brand, SearchIndex: 'Beauty', MinSavingPercent: MIN_SAVING, ItemCount: 5,
        Resources: ['ItemInfo.Title', ...OFFER_RESOURCES]
      });
      for (const it of res.SearchResult?.Items || []) {
        const o = readOffer(it);
        const title = itemTitle(it);
        if (!o.price || !o.list || o.list <= o.price || !o.available || !title) continue;
        const saving = Math.round((1 - o.price / o.list) * 100);
        if (saving < MIN_SAVING) continue;
        found.push({ asin: it.ASIN, title: title.slice(0, 110), price: o.price, list_price: o.list, verified: true, saving, brand });
      }
    } catch (e) {
      console.warn(`Búsqueda ${brand}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1100)); // PA-API: ~1 petición por segundo
  }
  return found.sort((a, b) => b.saving - a.saving);
}

// ---------------- Supabase (REST) ----------------
async function sb(pathAndQuery, opts = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...opts,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function recentAsins() {
  const since = new Date(Date.now() - DEDUPE_DAYS * 864e5).toISOString();
  const rows = await sb(`posts?select=deal_asin&gallery=eq.ofertas&deal_asin=not.is.null&created_at=gte.${since}`);
  return new Set(rows.map(r => r.deal_asin));
}

// ---------------- Principal ----------------
async function readInbox() {
  await mkdir(INBOX, { recursive: true });
  const files = (await readdir(INBOX)).filter(f => f.endsWith('.json')).sort();
  const cands = [];
  const rejected = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await readFile(path.join(INBOX, f), 'utf8'));
      for (const c of data.deals || []) {
        const errs = validateCandidate(c);
        if (errs.length) rejected.push({ file: f, asin: c?.asin, reason: errs.join(', ') });
        else cands.push({ ...c, asin: String(c.asin), _file: f });
      }
    } catch (e) {
      rejected.push({ file: f, reason: 'JSON inválido: ' + e.message });
    }
  }
  return { files, cands, rejected };
}

export async function main() {
  const required = DRY ? ['AMAZON_TAG'] : ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'AMAZON_TAG'];
  const missing = required.filter(k => !env[k]);
  if (missing.length) {
    console.log(`Faltan secretos (${missing.join(', ')}). No se publica nada todavía.`);
    await writeFile(path.join(ROOT, 'deals', 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), status: 'sin-configurar', missing }, null, 2) + '\n');
    return;
  }
  const usePa = Boolean(env.PAAPI_ACCESS_KEY && env.PAAPI_SECRET_KEY);
  const { files, cands, rejected } = await readInbox();

  let pool = cands;
  if (usePa && pool.length) pool = await verifyWithPaapi(pool);
  for (const c of pool.filter(c => c._skip)) rejected.push({ file: c._file, asin: c.asin, reason: c._skip });
  pool = pool.filter(c => !c._skip);
  if (usePa) pool = pool.concat(await discoverWithPaapi());

  const seen = DRY ? new Set() : await recentAsins();
  const published = [];
  const skipped = [];
  for (const c of pool) {
    if (published.length >= MAX) break;
    if (seen.has(c.asin)) { skipped.push({ asin: c.asin, reason: `ya publicado en los últimos ${DEDUPE_DAYS} días` }); continue; }
    seen.add(c.asin);
    const post = buildPost(c, env.AMAZON_TAG);
    if (DRY) { published.push({ asin: c.asin, title: post.title, dry: true }); continue; }
    const [row] = await sb('posts', { method: 'POST', body: JSON.stringify(post) });
    published.push({ id: row.id, asin: c.asin, title: row.title, price: row.deal_price, source: row.deal_source });
  }

  if (!DRY && files.length) {
    await mkdir(DONE, { recursive: true });
    for (const f of files) await rename(path.join(INBOX, f), path.join(DONE, f));
  }
  const report = { at: new Date().toISOString(), status: 'ok', paapi: usePa, published, skipped, rejected };
  if (!DRY) await writeFile(path.join(ROOT, 'deals', 'last-run.json'), JSON.stringify(report, null, 2) + '\n');
  const summary = [`## Bot de ofertas`, `PA-API: ${usePa ? 'activa' : 'sin llaves (solo curaduría)'}`, `Publicadas: ${published.length}`,
    ...published.map(p => `- ${p.title}${p.id ? ` (#${p.id})` : ''}`), `Omitidas: ${skipped.length} · Rechazadas: ${rejected.length}`,
    ...rejected.map(r => `- ${r.asin || r.file}: ${r.reason}`)].join('\n');
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) await writeFile(env.GITHUB_STEP_SUMMARY, summary + '\n', { flag: 'a' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
