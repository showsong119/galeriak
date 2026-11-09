// GaleríaK · Diagnóstico del correo: configuración SMTP (sin contraseña) + últimos errores de Auth + estado en Resend
const REF = 'pimuwxsazuzmgwhbrzbx', SK = process.env.SUPABASE_ACCESS_TOKEN, RK = process.env.RESEND_API_KEY;
const H = t => ({ Authorization: `Bearer ${t}` });
const cfg = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, { headers: H(SK) })).json();
console.log('CONFIG', JSON.stringify({ host: cfg.smtp_host, port: cfg.smtp_port, user: cfg.smtp_user, admin: cfg.smtp_admin_email, sender: cfg.smtp_sender_name, pass_set: !!cfg.smtp_pass, autoconfirm: cfg.mailer_autoconfirm, rate_email: cfg.rate_limit_email_sent, site_url: cfg.site_url }));
const end = new Date(), start = new Date(Date.now() - 3 * 3600e3);
const sql = "select timestamp, event_message from auth_logs order by timestamp desc limit 40";
const u = `https://api.supabase.com/v1/projects/${REF}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}&iso_timestamp_start=${start.toISOString()}&iso_timestamp_end=${end.toISOString()}`;
const lr = await fetch(u, { headers: H(SK) }); const lj = await lr.json().catch(() => ({}));
for (const r of (lj.result || [])) { const m = String(r.event_message || ''); if (/mail|smtp|error|signup|535|550|auth/i.test(m)) console.log('LOG', m.slice(0, 400)); }
if (!lr.ok) console.log('LOGS ERR', lr.status, JSON.stringify(lj).slice(0, 300));
const d = await (await fetch('https://api.resend.com/domains', { headers: H(RK) })).json();
console.log('RESEND', JSON.stringify((d.data || []).map(x => ({ name: x.name, status: x.status, region: x.region }))));
const k = await (await fetch('https://api.resend.com/api-keys', { headers: H(RK) })).json();
console.log('KEYS', JSON.stringify((k.data || []).map(x => x.name)));
