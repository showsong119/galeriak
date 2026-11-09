// GaleríaK · "Coreano del día": publica 1 lección por día en la galería "coreano"
// Corre en GitHub Actions (.github/workflows/diario.yml) todos los días.
//  1. Toma el primer archivo (orden alfabético) de content/diario/cola/*.json
//  2. Lo valida y lo publica en posts (gallery_id 'coreano', firmado por la cuenta administradora)
//  3. Lo mueve a content/diario/publicadas/ y escribe content/diario/ultima.json
// Claude (tarea programada diaria) mantiene la cola con lecciones nuevas.
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY · DRY_RUN=1 (no escribe nada)

import { readFile, readdir, mkdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COLA = path.join(ROOT, 'content', 'diario', 'cola');
export const HECHAS = path.join(ROOT, 'content', 'diario', 'publicadas');
const env = process.env;
const DRY = env.DRY_RUN === '1';
export const GALERIA = 'coreano';
export const ILUS_DIR = path.join(ROOT, 'site', 'img', 'diario');
export const MOTIVOS = ['kpop', 'kdrama', 'cultura', 'comida', 'expresiones', 'hangul'];
export const TEMAS = ['kpop', 'kdrama', 'cultura', 'comida', 'expresiones', 'gramatica'];

export function validar(l, nombre) {
  const e = [];
  if (!l || typeof l !== 'object') return ['no es un objeto'];
  const t = String(l.title || '').trim(), b = String(l.body || '').trim();
  if (t.length < 8 || t.length > 120) e.push('título de 8 a 120 caracteres');
  if (b.length < 300 || b.length > 6000) e.push('cuerpo de 300 a 6000 caracteres');
  if (!/[가-힣]/.test(b)) e.push('el cuerpo no tiene hangul');
  if (l.tema && !TEMAS.includes(l.tema)) e.push('tema no válido');
  if (/\[(foto|ilus):/i.test(b)) e.push('sin marcas [foto:] ni [ilus:] en el cuerpo');
  if (l.ilus) {
    const i = l.ilus;
    if (i.dialogo) {
      // conversación: 2 líneas, una de Bomi y otra de Dali
      const d = i.dialogo;
      if (!Array.isArray(d) || d.length !== 2) e.push('ilus.dialogo: exactamente 2 líneas');
      else {
        if (new Set(d.map(x => x.quien)).size !== 2 || d.some(x => !['bomi', 'dali'].includes(x.quien))) e.push('ilus.dialogo: una línea de bomi y otra de dali');
        d.forEach((x, k) => {
          if (!x.ko || !/[가-힣]/.test(x.ko) || String(x.ko).length > 12) e.push(`ilus.dialogo[${k}].ko: coreano corto (máx. 12)`);
          if (!x.es || String(x.es).length > 30) e.push(`ilus.dialogo[${k}].es: español corto (máx. 30)`);
          if (x.rom && String(x.rom).length > 26) e.push(`ilus.dialogo[${k}].rom: máx. 26`);
        });
      }
    } else {
      if (!i.ko || !/[가-힣]/.test(i.ko) || String(i.ko).length > 14) e.push('ilus.ko: coreano corto (máx. 14)');
      if (!i.es || String(i.es).length > 34) e.push('ilus.es: español corto (máx. 34)');
      if (i.rom && String(i.rom).length > 28) e.push('ilus.rom: máx. 28');
      if (i.quien && !['bomi', 'dali'].includes(i.quien)) e.push('ilus.quien: bomi o dali');
    }
    if (i.motivo && !MOTIVOS.includes(i.motivo)) e.push('ilus.motivo no válido');
    if (nombre && !existsSync(path.join(ILUS_DIR, nombre.replace(/\.json$/, '') + '.svg'))) e.push('falta la ilustración (python3 scripts/gen-diario-ilus.py)');
  }
  return e;
}

export function armarPost(l, adminId, nombre) {
  const ilus = l.ilus && nombre ? `[ilus:${nombre.replace(/\.json$/, '')}]\n\n` : '';
  const body = ilus + String(l.body).trim() + '\n\n— 📚 Coreano del día · ¿Quieres saber tu nivel? Haz el examen gratis: /examen-coreano/';
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

// Agrega la ilustración a lecciones ya publicadas que todavía no la tienen (p. ej. #1)
async function ilustrarPublicadas() {
  const fs = (await readdir(HECHAS)).filter(f => f.endsWith('.json')).sort().slice(-10);
  for (const f of fs) {
    const l = JSON.parse(await readFile(path.join(HECHAS, f), 'utf8'));
    if (!l.ilus || validar(l, f).length) continue;
    const [p] = await sb(`posts?select=id,body&gallery_id=eq.${GALERIA}&title=eq.${encodeURIComponent(String(l.title).trim())}&limit=1`, { headers: { prefer: '' } }) || [];
    if (!p || /^\[ilus:/.test(p.body || '')) continue;
    await sb(`posts?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ body: `[ilus:${f.replace(/\.json$/, '')}]\n\n` + p.body }) });
    console.log(`Ilustración agregada a #${p.id}`);
  }
}

export async function main() {
  await mkdir(COLA, { recursive: true }); await mkdir(HECHAS, { recursive: true });
  const archivos = (await readdir(COLA)).filter(f => f.endsWith('.json')).sort();
  if (!archivos.length) { console.log('::warning::La cola de "Coreano del día" está vacía'); return resumen(['## Coreano del día', 'Cola vacía: no se publicó nada hoy.']); }
  if (!DRY && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) { console.log('::warning::Falta SUPABASE_SERVICE_ROLE_KEY'); return resumen(['## Coreano del día', 'Falta SUPABASE_SERVICE_ROLE_KEY']); }

  for (const f of archivos) {
    let l; try { l = JSON.parse(await readFile(path.join(COLA, f), 'utf8')); } catch { l = null; }
    const errs = validar(l, f);
    if (errs.length) { console.log(`::warning::${f} no válido: ${errs.join(', ')} (se deja en la cola)`); continue; }
    if (DRY) return resumen(['## Coreano del día (prueba)', `Se publicaría: ${l.title}`]);
    const [admin] = await sb('profiles?select=id&role=eq.admin&order=id&limit=1', { headers: { prefer: '' } });
    if (!admin) throw new Error('No hay cuenta con role = admin');
    const ya = await sb(`posts?select=id&gallery_id=eq.${GALERIA}&title=eq.${encodeURIComponent(String(l.title).trim())}&limit=1`, { headers: { prefer: '' } });
    let id = ya?.[0]?.id, nuevo = false;
    if (!id) { const [row] = await sb('posts', { method: 'POST', body: JSON.stringify(armarPost(l, admin.id, f)) }); id = row.id; nuevo = true; }
    await rename(path.join(COLA, f), path.join(HECHAS, f));
    await ilustrarPublicadas().catch(e => console.log('::warning::No se pudieron agregar ilustraciones: ' + e.message));
    await writeFile(path.join(ROOT, 'content', 'diario', 'ultima.json'), JSON.stringify({ at: new Date().toISOString(), archivo: f, id, title: l.title, nuevo, quedan: archivos.length - 1 }, null, 2) + '\n');
    return resumen(['## Coreano del día', `${nuevo ? 'Publicada' : 'Ya existía'}: ${l.title} (#${id})`, `Quedan en la cola: ${archivos.length - 1}`]);
  }
  return resumen(['## Coreano del día', 'Ningún archivo válido en la cola.']);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
