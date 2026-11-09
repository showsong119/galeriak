// GaleríaK · "Coreano del día": publica 1 lección por día en la galería "coreano"
// Corre en GitHub Actions (.github/workflows/diario.yml) todos los días.
//  1. Toma el primer archivo (orden alfabético) de content/diario/cola/*.json
//  2. Lo valida y lo publica en posts (gallery_id 'coreano', firmado por la cuenta administradora)
//  3. Lo mueve a content/diario/publicadas/ y escribe content/diario/ultima.json
// Claude (tarea programada diaria) mantiene la cola con lecciones nuevas.
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY · DRY_RUN=1 (no escribe nada)

import { readFile, readdir, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COLA = path.join(ROOT, 'content', 'diario', 'cola');
export const HECHAS = path.join(ROOT, 'content', 'diario', 'publicadas');
const env = process.env;
const DRY = env.DRY_RUN === '1';
export const GALERIA = 'coreano';
export const TEMAS = ['kpop', 'kdrama', 'cultura', 'comida', 'expresiones', 'gramatica'];

export function validar(l) {
  const e = [];
  if (!l || typeof l !== 'object') return ['no es un objeto'];
  const t = String(l.title || '').trim(), b = String(l.body || '').trim();
  if (t.length < 8 || t.length > 120) e.push('título de 8 a 120 caracteres');
  if (b.length < 300 || b.length > 6000) e.push('cuerpo de 300 a 6000 caracteres');
  if (!/[가-힣]/.test(b)) e.push('el cuerpo no tiene hangul');
  if (l.tema && !TEMAS.includes(l.tema)) e.push('tema no válido');
  if (/\[foto:/i.test(b)) e.push('sin fotos');
  return e;
}

export function armarPost(l, adminId) {
  const body = String(l.body).trim() + '\n\n— 📚 Coreano del día · ¿Quieres saber tu nivel? Haz el examen gratis: /examen-coreano/';
  return { gallery_id: GALERIA, author_id: adminId, title: String(l.title).trim().slice(0, 120), body };
}

function sbHeaders(key) {
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}
async function sb(q, opts = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, {
    ...opts, headers: { ...sbHeaders(env.SUPABASE_SERVICE_ROLE_KEY), 'content-type': 'application/json', prefer: 'return=representation', ...(opts.headers || {}) }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function resumen(lines) {
  const s = lines.join('\n'); console.log(s);
  if (env.GITHUB_STEP_SUMMARY) await writeFile(env.GITHUB_STEP_SUMMARY, s + '\n', { flag: 'a' });
}

export async function main() {
  await mkdir(COLA, { recursive: true }); await mkdir(HECHAS, { recursive: true });
  const archivos = (await readdir(COLA)).filter(f => f.endsWith('.json')).sort();
  if (!archivos.length) { console.log('::warning::La cola de "Coreano del día" está vacía'); return resumen(['## Coreano del día', 'Cola vacía: no se publicó nada hoy.']); }
  if (!DRY && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) { console.log('::warning::Falta SUPABASE_SERVICE_ROLE_KEY'); return resumen(['## Coreano del día', 'Falta SUPABASE_SERVICE_ROLE_KEY']); }

  for (const f of archivos) {
    let l; try { l = JSON.parse(await readFile(path.join(COLA, f), 'utf8')); } catch { l = null; }
    const errs = validar(l);
    if (errs.length) { console.log(`::warning::${f} no válido: ${errs.join(', ')} (se deja en la cola)`); continue; }
    if (DRY) return resumen(['## Coreano del día (prueba)', `Se publicaría: ${l.title}`]);
    const [admin] = await sb('profiles?select=id&role=eq.admin&order=id&limit=1', { headers: { prefer: '' } });
    if (!admin) throw new Error('No hay cuenta con role = admin');
    const ya = await sb(`posts?select=id&gallery_id=eq.${GALERIA}&title=eq.${encodeURIComponent(String(l.title).trim())}&limit=1`, { headers: { prefer: '' } });
    let id = ya?.[0]?.id, nuevo = false;
    if (!id) { const [row] = await sb('posts', { method: 'POST', body: JSON.stringify(armarPost(l, admin.id)) }); id = row.id; nuevo = true; }
    await rename(path.join(COLA, f), path.join(HECHAS, f));
    await writeFile(path.join(ROOT, 'content', 'diario', 'ultima.json'), JSON.stringify({ at: new Date().toISOString(), archivo: f, id, title: l.title, nuevo, quedan: archivos.length - 1 }, null, 2) + '\n');
    return resumen(['## Coreano del día', `${nuevo ? 'Publicada' : 'Ya existía'}: ${l.title} (#${id})`, `Quedan en la cola: ${archivos.length - 1}`]);
  }
  return resumen(['## Coreano del día', 'Ningún archivo válido en la cola.']);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
