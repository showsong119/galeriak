// GaleríaK · Configura el correo de confirmación de punta a punta, sin pasos manuales:
//  1) Resend: crea/obtiene el dominio y sus registros DNS
//  2) Netlify DNS: agrega los registros que falten (+ DMARC)
//  3) Resend: pide verificación y espera
//  4) Supabase: SMTP de Resend (con una clave solo de envío), plantillas en español y confirmación de correo activada
// Secrets: RESEND_API_KEY (Full access), NETLIFY_AUTH_TOKEN, SUPABASE_ACCESS_TOKEN
import { readFileSync, appendFileSync } from 'node:fs';
const DOMAIN = process.env.DOMINIO || 'galeriakmx.com';
const REF = process.env.SUPABASE_REF || 'pimuwxsazuzmgwhbrzbx';
const FROM = `no-reply@${DOMAIN}`;
const { RESEND_API_KEY: RK, NETLIFY_AUTH_TOKEN: NK, SUPABASE_ACCESS_TOKEN: SK } = process.env;
const log = [], say = m => { console.log(m); log.push(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(base, token, path, opt = {}) {
  const r = await fetch(base + path, { ...opt, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const t = await r.text(); let j; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) throw new Error(`${opt.method || 'GET'} ${path} → ${r.status} ${t.slice(0, 200)}`);
  return j;
}
const resend = (p, o) => api('https://api.resend.com', RK, p, o);
const netlify = (p, o) => api('https://api.netlify.com/api/v1', NK, p, o);
const supa = (p, o) => api('https://api.supabase.com/v1', SK, p, o);
const fqdn = n => (!n || n === '@' || n === DOMAIN) ? DOMAIN : (n.endsWith('.' + DOMAIN) ? n : `${n}.${DOMAIN}`);
const norm = v => String(v || '').replace(/^"|"$/g, '').replace(/\.$/, '').trim();

async function main() {
  const falta = [['RESEND_API_KEY', RK], ['NETLIFY_AUTH_TOKEN', NK], ['SUPABASE_ACCESS_TOKEN', SK]].filter(x => !x[1]).map(x => x[0]);
  if (falta.length) { say(`⚠️ Faltan secrets: ${falta.join(', ')}`); return fin(); }

  // 1) Resend
  const lista = await resend('/domains');
  let dom = (lista.data || []).find(d => d.name === DOMAIN);
  if (!dom) { dom = await resend('/domains', { method: 'POST', body: JSON.stringify({ name: DOMAIN, region: 'us-east-1' }) }); say('Resend: dominio creado'); }
  dom = await resend(`/domains/${dom.id}`);
  say(`Resend: ${DOMAIN} — estado ${dom.status}, región ${dom.region}`);
  const regs = (dom.records || []).map(r => ({ type: r.type, hostname: fqdn(r.name), value: norm(r.value), priority: r.priority }));
  regs.push({ type: 'TXT', hostname: `_dmarc.${DOMAIN}`, value: 'v=DMARC1; p=none;', opcional: true });

  // 2) Netlify DNS
  const zonas = await netlify('/dns_zones');
  const zona = zonas.find(z => z.name === DOMAIN);
  if (!zona) throw new Error(`Netlify: no encontré la zona DNS ${DOMAIN}`);
  const actuales = await netlify(`/dns_zones/${zona.id}/dns_records`);
  for (const r of regs) {
    const mismo = actuales.find(a => a.type === r.type && a.hostname === r.hostname && norm(a.value) === r.value);
    if (mismo) { say(`DNS ✓ ya existe ${r.type} ${r.hostname}`); continue; }
    if (r.opcional && actuales.some(a => a.type === 'TXT' && a.hostname === r.hostname)) { say(`DNS ✓ ya hay DMARC en ${r.hostname}`); continue; }
    const body = { type: r.type, hostname: r.hostname, value: r.value, ttl: 3600 };
    if (r.type === 'MX') body.priority = r.priority ?? 10;
    await netlify(`/dns_zones/${zona.id}/dns_records`, { method: 'POST', body: JSON.stringify(body) });
    say(`DNS + agregado ${r.type} ${r.hostname}`);
  }

  // 3) Verificar
  await resend(`/domains/${dom.id}/verify`, { method: 'POST' }).catch(e => say('Resend verify: ' + e.message));
  for (let i = 0; i < 20; i++) {
    dom = await resend(`/domains/${dom.id}`);
    if (dom.status === 'verified') break;
    await sleep(15000);
  }
  say(`Resend: estado final ${dom.status}${dom.status === 'verified' ? ' ✅' : ' (puede tardar; vuelve a ejecutar más tarde)'}`);

  // 4) Supabase Auth
  const cfg = await supa(`/projects/${REF}/config/auth`);
  const patch = {
    mailer_autoconfirm: false,
    smtp_admin_email: FROM, smtp_sender_name: 'GaleríaK', smtp_host: 'smtp.resend.com', smtp_port: '465', smtp_user: 'resend',
    mailer_subjects_confirmation: 'Confirma tu cuenta de GaleríaK 💌',
    mailer_templates_confirmation_content: readFileSync('supabase/correos/confirmar-cuenta.html', 'utf8').replace(/^<!--[\s\S]*?-->\s*/, ''),
    mailer_subjects_recovery: 'Crea una contraseña nueva para GaleríaK',
    mailer_templates_recovery_content: readFileSync('supabase/correos/restablecer-contrasena.html', 'utf8').replace(/^<!--[\s\S]*?-->\s*/, ''),
  };
  const nuevaClave = cfg.smtp_host !== 'smtp.resend.com' || process.env.NUEVA_CLAVE === '1';
  if (nuevaClave) {
    const k = await resend('/api-keys', { method: 'POST', body: JSON.stringify({ name: 'supabase-smtp-galeriak', permission: 'sending_access', domain_id: dom.id }) });
    patch.smtp_pass = k.token; say('Resend: clave nueva solo de envío para Supabase (no se muestra)');
  }
  await supa(`/projects/${REF}/config/auth`, { method: 'PATCH', body: JSON.stringify(patch) });
  say('Supabase: SMTP de Resend, plantillas en español y confirmación de correo ✅');
  fin(dom.status === 'verified');
}
function fin(ok) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Correo de GaleríaK\n\n${log.map(l => '- ' + l).join('\n')}\n`);
  if (ok === false) process.exitCode = 0;
}
main().catch(e => { say('❌ ' + e.message); fin(); process.exit(1); });
