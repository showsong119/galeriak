// GaleríaK · respaldo semanal de la base de datos (cifrado)
// Corre en GitHub Actions (.github/workflows/respaldo.yml) cada domingo.
// Descarga las tablas con la llave de servicio, las guarda en un JSON comprimido y lo CIFRA con BACKUP_PASSWORD
// (AES-256, openssl). El repositorio es público: sin contraseña NO se genera nada, nunca se sube un respaldo sin cifrar.
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_PASSWORD
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const env = process.env;
// Tablas y columnas (sin correos ni contraseñas: esos datos viven en Supabase Auth y no se respaldan aquí)
export const TABLAS = {
  posts: '*', comments: '*', votes: '*', reports: '*', galleries: '*',
  profiles: 'id,nickname,role,age_confirmed_at,banned_until',
  mensajes: '*', gk_managers: '*', gk_advertencias: '*', gk_sanciones: '*', gk_moderacion: '*'
};
const headers = k => (k.startsWith('sb_') ? { apikey: k } : { apikey: k, authorization: `Bearer ${k}` });

async function tabla(nombre, cols) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${nombre}?select=${cols}`, {
      headers: { ...headers(env.SUPABASE_SERVICE_ROLE_KEY), range: `${desde}-${desde + 999}`, 'range-unit': 'items' }
    });
    if (res.status === 404) return null; // la tabla todavía no existe
    if (!res.ok) throw new Error(`${nombre}: ${res.status} ${(await res.text()).slice(0, 150)}`);
    const lote = await res.json();
    filas.push(...lote);
    if (lote.length < 1000) return filas;
  }
}

export async function main() {
  const faltan = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BACKUP_PASSWORD'].filter(k => !env[k]);
  if (faltan.length) { console.log(`::warning::Respaldo omitido: faltan los secretos ${faltan.join(', ')}`); return false; }
  const datos = { creado: new Date().toISOString(), tablas: {} };
  const resumen = [];
  for (const [t, cols] of Object.entries(TABLAS)) {
    const f = await tabla(t, cols);
    if (f) { datos.tablas[t] = f; resumen.push(`${t}: ${f.length}`); } else resumen.push(`${t}: (no existe)`);
  }
  await writeFile('respaldo.json.gz', gzipSync(JSON.stringify(datos)));
  const txt = ['## Respaldo semanal', ...resumen.map(r => `- ${r}`)].join('\n');
  console.log(txt);
  if (env.GITHUB_STEP_SUMMARY) await writeFile(env.GITHUB_STEP_SUMMARY, txt + '\n', { flag: 'a' });
  return true;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().then(ok => { if (!ok) process.exitCode = 0; }).catch(e => { console.error(e); process.exit(1); });
