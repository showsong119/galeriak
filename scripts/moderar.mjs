// GaleríaK · revisión automática de publicaciones y comentarios (OpenAI Moderation, gratis)
// Corre en GitHub Actions cada 10 minutos (.github/workflows/moderar.yml).
//  1. Busca publicaciones y comentarios de las últimas LOOKBACK_H horas que aún no se revisaron.
//  2. Envía el texto (y las fotos [foto:…] del autor) a https://api.openai.com/v1/moderations
//     con el modelo omni-moderation-latest (gratuito).
//  3. Decide: ok / revisar / ocultar (ver decidir()).
//       ocultar → posts.is_hidden=true + needs_review=true · comments.is_hidden=true
//       revisar → posts.needs_review=true (sigue visible) · comentarios: solo cola del panel
//  4. Guarda el resultado en gk_moderacion (el panel 🤖 AI 검수 lo muestra; el autor recibe aviso si se ocultó).
// Nunca sanciona cuentas: las advertencias y suspensiones las decide el administrador.
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
// Opcionales: LOOKBACK_H (48), MAX_ITEMS (150), DRY_RUN=1 (no escribe en la base de datos)
//
// PAUSA (decisión del dueño, 2026-11-09): la revisión solo se activa cuando el sitio tiene tráfico real.
// Cada corrida mira cuántos visitantes hubo AYER (gk_visitas, hora CDMX). Si son menos de MIN_VISITANTES (100)
// o la tabla de visitas no existe, no se revisa nada. Cuando se llega a 100, vuelve a funcionar sola.
// MODERAR_FORZAR=1 (ejecución manual) se salta la pausa.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const env = process.env;
const DRY = env.DRY_RUN === '1';
const LOOKBACK_H = Number(env.LOOKBACK_H || 48);
const MAX_ITEMS = Number(env.MAX_ITEMS || 150);
export const MODEL = 'omni-moderation-latest';
export const BUCKET = 'post-images';
const BOT_NAMES = new Set(['Bot de ofertas']);

// Categorías de OpenAI → qué hacemos
export const OCULTAR = ['sexual/minors', 'sexual', 'violence/graphic', 'self-harm/instructions',
  'illicit/violent', 'hate/threatening', 'harassment/threatening'];
export const REVISAR = ['harassment', 'hate', 'violence', 'self-harm', 'self-harm/intent', 'illicit'];
export const MINORS_MIN = 0.2; // con cualquier señal de menores, se oculta aunque OpenAI no lo marque

export function decidir(result) {
  if (!result) return { nivel: 'ok', motivos: [] };
  const cats = result.categories || {};
  const sc = result.category_scores || {};
  const ocultar = OCULTAR.filter(c => cats[c]);
  if ((sc['sexual/minors'] || 0) >= MINORS_MIN && !ocultar.includes('sexual/minors')) ocultar.unshift('sexual/minors');
  if (ocultar.length) return { nivel: 'ocultar', motivos: ocultar };
  const revisar = REVISAR.filter(c => cats[c]);
  if (revisar.length) return { nivel: 'revisar', motivos: revisar };
  if (result.flagged) return { nivel: 'revisar', motivos: Object.keys(cats).filter(c => cats[c]) };
  return { nivel: 'ok', motivos: [] };
}

// Solo las fotos que están en la carpeta del autor (igual que bodyHTML() en el sitio)
export const FOTO_RE = /^\[foto:([0-9a-f-]{36}\/[\w.-]+\.(?:webp|jpe?g|png))\]$/i;
export function fotosDe(body, authorId) {
  const out = [];
  for (const line of String(body || '').split('\n')) {
    const m = line.trim().match(FOTO_RE);
    if (m && authorId && m[1].startsWith(authorId + '/')) out.push(m[1]);
  }
  return out.slice(0, 4);
}
export const sinFotos = body => String(body || '').split('\n').filter(l => !FOTO_RE.test(l.trim())).join('\n').trim();

export function armarEntrada(item, supabaseUrl) {
  const texto = [item.title, sinFotos(item.body)].filter(Boolean).join('\n\n').slice(0, 10000);
  const fotos = item.tipo === 'post' ? fotosDe(item.body, item.author_id) : [];
  const input = [];
  if (texto) input.push({ type: 'text', text: texto });
  for (const f of fotos) input.push({ type: 'image_url', image_url: { url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${f}` } });
  return { input, texto, fotos };
}

export const extracto = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;

// Solo guardamos puntajes altos (para que el panel muestre por qué)
export function puntajesAltos(result, min = 0.1) {
  const out = {};
  for (const [k, v] of Object.entries(result?.category_scores || {})) if (v >= min) out[k] = Math.round(v * 1000) / 1000;
  return Object.keys(out).length ? out : null;
}

// ---------------- Supabase (REST) ----------------
export function sbHeaders(key) {
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}
async function sb(pathAndQuery, opts = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...opts,
    headers: { ...sbHeaders(env.SUPABASE_SERVICE_ROLE_KEY), 'content-type': 'application/json', prefer: 'return=minimal', ...(opts.headers || {}) }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ---------------- OpenAI ----------------
async function moderar(input) {
  const res = await fetch((env.OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/moderations', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(`OpenAI ${res.status}: ${json?.error?.message || ''}`.slice(0, 300)); e.status = res.status; throw e; }
  return json.results?.[0];
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const MIN_VISITANTES = Number(env.MIN_VISITANTES || 100);

// Fecha de ayer en la Ciudad de México (YYYY-MM-DD)
export function ayerCDMX(now = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date(now.getTime() - 864e5));
}
export const activa = visitantes => visitantes != null && visitantes >= MIN_VISITANTES;

async function visitantesAyer() {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/gk_visitas?select=visitante&dia=eq.${ayerCDMX()}`, {
    headers: { ...sbHeaders(env.SUPABASE_SERVICE_ROLE_KEY), prefer: 'count=exact', range: '0-0' }
  });
  if (!res.ok) return null;
  const m = (res.headers.get('content-range') || '').match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function moderarConReintento(entrada) {
  for (let i = 0; i < 3; i++) {
    try { return await moderar(entrada.input); } catch (e) {
      if (e.status === 429 && i < 2) { await sleep(5000 * (i + 1)); continue; }
      // Si una foto no se pudo leer, revisamos al menos el texto
      if (e.status === 400 && entrada.fotos.length && entrada.texto) {
        const r = await moderar([{ type: 'text', text: entrada.texto }]);
        return r && { ...r, _fotos_sin_revisar: true };
      }
      throw e;
    }
  }
}

async function summary(lines) {
  const s = lines.join('\n');
  console.log(s);
  if (env.GITHUB_STEP_SUMMARY) await writeFile(env.GITHUB_STEP_SUMMARY, s + '\n', { flag: 'a' });
}

export async function main() {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'].filter(k => !env[k]);
  if (missing.length) {
    // Sin llaves no es un error: salimos en verde para no mandar correos cada 10 minutos.
    console.log(`::warning::Revisión IA apagada: faltan los secretos ${missing.join(', ')} (GitHub › Settings › Secrets › Actions)`);
    return summary([`## Revisión IA`, `Apagada: faltan ${missing.join(', ')}`]);
  }
  if (env.MODERAR_FORZAR !== '1') {
    const v = await visitantesAyer().catch(() => null);
    if (!activa(v)) {
      return summary(['## Revisión IA', `En pausa: ${v == null ? 'todavía no hay estadísticas de visitas' : `ayer hubo ${v} visitantes`}; se activa sola desde ${MIN_VISITANTES} visitantes al día.`]);
    }
  }
  const since = new Date(Date.now() - LOOKBACK_H * 3600e3).toISOString();

  try { await sb('gk_moderacion?select=id&limit=1'); } catch (e) {
    console.log('::warning::Falta la tabla gk_moderacion: ejecuta supabase/2026-11-09-moderacion-ia.sql en Supabase');
    return summary(['## Revisión IA', 'Falta ejecutar supabase/2026-11-09-moderacion-ia.sql', String(e.message)]);
  }

  const q = encodeURIComponent(since);
  const [posts, comments, admins, hechos] = await Promise.all([
    sb(`posts?select=id,author_id,anon_name,title,body&created_at=gte.${q}&is_deleted=is.false&order=created_at.asc&limit=500`, { headers: { prefer: '' } }),
    sb(`comments?select=id,post_id,author_id,anon_name,body&created_at=gte.${q}&is_deleted=is.false&order=created_at.asc&limit=1000`, { headers: { prefer: '' } }),
    sb(`profiles?select=id&role=eq.admin`, { headers: { prefer: '' } }),
    sb(`gk_moderacion?select=tipo,item_id&created_at=gte.${encodeURIComponent(new Date(Date.now() - (LOOKBACK_H + 24) * 3600e3).toISOString())}&limit=5000`, { headers: { prefer: '' } })
  ]);
  const adminIds = new Set((admins || []).map(a => a.id));
  const visto = new Set((hechos || []).map(h => h.tipo + ':' + h.item_id));
  const omitir = it => !it.author_id ? BOT_NAMES.has(it.anon_name) : adminIds.has(it.author_id);

  const cola = [
    ...(posts || []).map(p => ({ ...p, tipo: 'post', post_id: p.id })),
    ...(comments || []).map(c => ({ ...c, tipo: 'comment', title: '' }))
  ].filter(it => !visto.has(it.tipo + ':' + it.id) && !omitir(it)).slice(0, MAX_ITEMS);

  const res = { ok: 0, revisar: [], ocultar: [], errores: [] };
  for (const it of cola) {
    const entrada = armarEntrada(it, env.SUPABASE_URL);
    let r = null, d = { nivel: 'ok', motivos: [] };
    if (entrada.input.length) {
      try { r = await moderarConReintento(entrada); d = decidir(r); } catch (e) {
        res.errores.push(`${it.tipo} #${it.id}: ${e.message}`);
        if (e.status === 401 || e.status === 403) break; // llave inválida: no seguir
        continue; // se vuelve a intentar en la próxima corrida
      }
    }
    // Foto que la IA no pudo leer: que la vea una persona
    if (r?._fotos_sin_revisar) d = { nivel: d.nivel === 'ok' ? 'revisar' : d.nivel, motivos: [...d.motivos, 'fotos-sin-revisar'] };
    const fila = {
      tipo: it.tipo, item_id: it.id, post_id: it.post_id, autor: it.author_id || null, nivel: d.nivel, motivos: d.motivos,
      puntajes: d.nivel === 'ok' ? null : puntajesAltos(r), extracto: d.nivel === 'ok' ? null : extracto(entrada.texto),
      estado: d.nivel === 'ok' ? 'auto' : 'pendiente'
    };
    if (!DRY) {
      const tabla = it.tipo === 'post' ? 'posts' : 'comments';
      if (d.nivel === 'ocultar') await sb(`${tabla}?id=eq.${it.id}`, { method: 'PATCH', body: JSON.stringify(it.tipo === 'post' ? { is_hidden: true, needs_review: true } : { is_hidden: true }) });
      else if (d.nivel === 'revisar' && it.tipo === 'post') await sb(`posts?id=eq.${it.id}`, { method: 'PATCH', body: JSON.stringify({ needs_review: true }) });
      await sb('gk_moderacion?on_conflict=tipo,item_id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(fila) });
    }
    if (d.nivel === 'ok') res.ok++; else res[d.nivel].push(`${it.tipo} #${it.id} (${d.motivos.join(', ')})`);
    await sleep(150);
  }

  await summary([
    `## Revisión IA${DRY ? ' (prueba, sin cambios)' : ''}`,
    `Revisados: ${cola.length - res.errores.length} · ✅ ok ${res.ok} · 🟡 revisar ${res.revisar.length} · 🔴 ocultados ${res.ocultar.length}`,
    ...res.ocultar.map(x => `- 🔴 ${x}`), ...res.revisar.map(x => `- 🟡 ${x}`),
    ...(res.errores.length ? ['Errores (se reintenta en la próxima corrida):', ...res.errores.slice(0, 10).map(x => `- ${x}`)] : [])
  ]);
  if (res.errores.length && res.errores.length === cola.length && cola.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
