// GaleríaK · Ejecuta un archivo SQL en Supabase con la Management API (para no pegar SQL a mano).
// Uso: ARCHIVO=supabase/xxx.sql node scripts/ejecutar-sql.mjs   · Secret: SUPABASE_ACCESS_TOKEN
import { readFileSync, appendFileSync } from 'node:fs';
const REF = process.env.SUPABASE_REF || 'pimuwxsazuzmgwhbrzbx', SK = process.env.SUPABASE_ACCESS_TOKEN, F = process.env.ARCHIVO || '';
const out = m => { console.log(m); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, m + '\n\n'); };
if (!SK) { out('⚠️ Falta el secret SUPABASE_ACCESS_TOKEN'); process.exit(0); }
if (!/^supabase\/[\w.\-]+\.sql$/.test(F)) { out('❌ ARCHIVO debe ser supabase/<nombre>.sql'); process.exit(1); }
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: readFileSync(F, 'utf8') })
});
const t = await r.text();
if (!r.ok) { out(`❌ ${F}: ${r.status} ${t.slice(0, 600)}`); process.exit(1); }
out(`✅ ${F} ejecutado\n\n\`\`\`\n${t.slice(0, 3000)}\n\`\`\``);
