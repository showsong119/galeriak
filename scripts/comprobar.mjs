// GaleríaK · Comprobación del estado real de Supabase (solo lectura, sin efectos).
// Uso en GitHub Actions: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
const URL_ = process.env.SUPABASE_URL || 'https://pimuwxsazuzmgwhbrzbx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_njWRhiyl0oZOeJh6m-Zdyw_5yPgHiNn';
const H = k => ({ apikey: k, ...(k.startsWith('ey') ? { Authorization: 'Bearer ' + k } : {}), 'Content-Type': 'application/json' });
const res = [];
const ok = (n, b, info = '') => { res.push([b ? '✅' : '❌', n, info]); };
async function tabla(n, t, q = 'select=*&limit=1') {
  const r = await fetch(`${URL_}/rest/v1/${t}?${q}`, { headers: { ...H(KEY), Prefer: 'count=exact' } });
  const cr = r.headers.get('content-range') || '';
  ok(n, r.ok, r.ok ? `filas: ${cr.split('/')[1] ?? '?'}` : (await r.text()).slice(0, 90));
}
// La función existe si NO responde "no encontrada" (PGRST202 / 404). Un error de permisos también cuenta como "existe".
async function rpc(n, f, body = {}, key = KEY) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${f}`, { method: 'POST', headers: H(key), body: JSON.stringify(body) });
  const t = await r.text();
  const falta = r.status === 404 || /PGRST202|Could not find the function/.test(t);
  ok(n, !falta, falta ? 'no instalada' : (r.ok ? 'responde: ' + t.slice(0, 40) : 'instalada (solo admin)'));
}
async function main() {
  if (!KEY) { console.log('::warning::Falta SUPABASE_SERVICE_ROLE_KEY'); return; }
  // Autenticación (endpoint público)
  const s = await (await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: ANON } })).json().catch(() => ({}));
  ok('Confirmación de correo activada', s.mailer_autoconfirm === false, s.mailer_autoconfirm ? 'APAGADA: entran sin confirmar' : '');
  ok('Registro abierto', s.disable_signup === false);
  ok('Login con Google', !!(s.external && s.external.google));
  // 11-08
  await tabla('Mensajes (11-08)', 'mensajes', 'select=id&limit=1');
  await rpc('Niveles gk_niveles (11-08)', 'gk_niveles', { p_ids: [] });
  await tabla('Managers (11-08)', 'gk_managers', 'select=gallery_id&limit=1');
  await tabla('Advertencias (11-08)', 'gk_advertencias', 'select=post_id&limit=1');
  const b = await fetch(`${URL_}/storage/v1/bucket/post-images`, { headers: H(KEY) });
  ok('Fotos: bucket post-images (11-08)', b.ok);
  // 11-09
  await tabla('Visitas (11-09)', 'gk_visitas', 'select=dia&limit=1');
  await tabla('Sanciones/miembros (11-09)', 'gk_sanciones', 'select=id&limit=1');
  await tabla('Moderación IA (11-09)', 'gk_moderacion', 'select=id&limit=1');
  await tabla('Galería Memes (11-09)', 'galleries', 'select=id&id=eq.memes');
  await tabla('Galería Anónimo (11-09)', 'galleries', 'select=id&id=eq.anonimo');
  await tabla('Reglas de Anónimo publicadas', 'posts', 'select=id&gallery_id=eq.anonimo&is_pinned=eq.true');
  await tabla('Apodo Administrador', 'profiles', 'select=id&nickname=eq.Administrador&role=eq.admin');
  // 11-10
  await tabla('Visitas del examen (11-10)', 'gk_visitas_pagina', 'select=dia&limit=1');
  await rpc('Estadísticas del examen (11-10)', 'gk_estadisticas_examen');
  await tabla('Usuarios (11-10)', 'gk_usuarios', 'select=id&limit=1');
  await rpc('Usuario disponible (11-10)', 'gk_usuario_disponible', { p_usuario: 'zzzz_prueba' }, ANON);
  // Las tablas que deben marcar ✅ por "filas" se validan también con el conteo
  const fila = n => res.find(r => r[1] === n);
  for (const n of ['Galería Memes (11-09)', 'Galería Anónimo (11-09)', 'Reglas de Anónimo publicadas', 'Apodo Administrador']) {
    const r = fila(n); if (r && r[0] === '✅' && /filas: 0/.test(r[2])) r[0] = '❌';
  }
  const lines = res.map(([e, n, i]) => `${e} ${n}${i ? ' — ' + i : ''}`);
  console.log(lines.join('\n'));
  const md = `### Estado de Supabase\n\n${lines.map(l => '- ' + l).join('\n')}\n\n**${res.filter(r => r[0] === '✅').length} / ${res.length} ✅**\n`;
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
main().catch(e => { console.log('::error::' + e.message); process.exit(1); });
