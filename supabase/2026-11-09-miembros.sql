-- GaleríaK · Gestión de miembros (2026-11-09)
-- Solo agrega cosas nuevas; no cambia tablas existentes. Se puede ejecutar varias veces.
-- Requiere que ya se hayan ejecutado: mensajes-niveles, asistencia-niveles-managers y lideres-advertencias.
--
--  · gk_sanciones: historial de cada miembro (🟡 precaución, 🟠 advertencia, 🔴 suspensión, 📝 nota interna)
--  · gk_sancionar / gk_retirar_sancion: solo administradores (las suspensiones cambian profiles.banned_until)
--  · gk_admin_miembros: lista completa para la página de administración (fecha de registro, actividad, reportes…)
--  · gk_admin_resumen: números del panel de administración en la portada

create table if not exists public.gk_sanciones (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('nota', 'precaucion', 'advertencia', 'suspension')),
  motivo text not null check (char_length(motivo) between 2 and 300),
  dias integer check (dias is null or dias between 1 and 36500),
  por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  activa boolean not null default true,
  retirada_por uuid,
  retirada_at timestamptz
);
create index if not exists gk_sanciones_usuario_idx on public.gk_sanciones (usuario, created_at desc);
alter table public.gk_sanciones enable row level security;
revoke all on public.gk_sanciones from anon;
grant select on public.gk_sanciones to authenticated;
drop policy if exists gk_sanciones_leer on public.gk_sanciones;
-- El administrador ve todo; cada miembro ve solo sus precauciones/advertencias/suspensiones (las notas internas no).
create policy gk_sanciones_leer on public.gk_sanciones for select to authenticated
  using (public.gk_is_admin() or (usuario = auth.uid() and tipo <> 'nota'));

-- Dar una sanción (o nota). p_avisar = enviar un mensaje al miembro (bandeja ✉️).
create or replace function public.gk_sancionar(p_usuario uuid, p_tipo text, p_motivo text, p_dias integer default null, p_avisar boolean default true)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_dias integer; v_titulo text; v_txt text;
begin
  if not public.gk_is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
  if p_tipo not in ('nota', 'precaucion', 'advertencia', 'suspension') then raise exception 'Tipo no válido'; end if;
  if exists (select 1 from public.profiles where id = p_usuario and role = 'admin') then raise exception 'No se puede sancionar a un administrador'; end if;
  v_dias := case when p_tipo = 'suspension' then coalesce(p_dias, 36500) else null end;
  insert into public.gk_sanciones (usuario, tipo, motivo, dias, por)
  values (p_usuario, p_tipo, btrim(p_motivo), v_dias, auth.uid()) returning id into v_id;
  if p_tipo = 'suspension' then
    update public.profiles set banned_until = now() + make_interval(days => v_dias) where id = p_usuario;
  end if;
  if p_avisar and p_tipo <> 'nota' then
    v_titulo := case p_tipo when 'precaucion' then 'Aviso de precaución'
                            when 'advertencia' then 'Advertencia del equipo'
                            else 'Tu cuenta fue suspendida' end;
    v_txt := 'Hola. El equipo de GaleríaK te envía este mensaje: ' || v_titulo || '.' || chr(10) || chr(10)
          || 'Motivo: ' || btrim(p_motivo) || chr(10)
          || case when p_tipo = 'suspension' then
               case when v_dias >= 36500 then 'Duración: indefinida.' else 'Duración: ' || v_dias || ' día(s).' end || chr(10)
             else '' end
          || chr(10) || 'Revisa las reglas de la comunidad en https://galeriakmx.com/terminos/ . '
          || 'Si crees que es un error, responde a este mensaje.';
    insert into public.mensajes (hilo, usuario, autor, de_admin, asunto, cuerpo, leido_usuario, leido_admin)
    values (null, p_usuario, auth.uid(), true, v_titulo, left(v_txt, 2000), false, true);
  end if;
  return v_id;
end $$;
revoke all on function public.gk_sancionar(uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.gk_sancionar(uuid, text, text, integer, boolean) to authenticated;

-- Retirar una sanción. Si es una suspensión activa, se levanta el bloqueo de la cuenta.
create or replace function public.gk_retirar_sancion(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v public.gk_sanciones;
begin
  if not public.gk_is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
  update public.gk_sanciones set activa = false, retirada_por = auth.uid(), retirada_at = now()
   where id = p_id and activa returning * into v;
  if v.id is not null and v.tipo = 'suspension'
     and not exists (select 1 from public.gk_sanciones where usuario = v.usuario and tipo = 'suspension' and activa) then
    update public.profiles set banned_until = null where id = v.usuario;
  end if;
end $$;
revoke all on function public.gk_retirar_sancion(bigint) from public, anon;
grant execute on function public.gk_retirar_sancion(bigint) to authenticated;

-- Lista de miembros con todo lo necesario para administrarlos.
drop function if exists public.gk_admin_miembros();
create function public.gk_admin_miembros()
returns table (
  id uuid, nickname text, role text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  posts integer, comments integer, likes integer, asistencias integer, puntos integer,
  reportes integer, avisos_post integer, avisos_activos integer,
  precauciones integer, advertencias integer, suspensiones integer, notas integer, ultima_sancion timestamptz
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.gk_is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
  return query
  with vis as (select p.id as pid, p.author_id, p.gallery_id, p.up_count, p.created_at from public.posts p
                where coalesce(p.is_deleted, false) = false and coalesce(p.is_hidden, false) = false),
  pp as (select author_id as uid, count(*) filter (where gallery_id <> 'asistencia') as n, coalesce(sum(greatest(up_count, 0)), 0) as likes
           from vis group by author_id),
  aa as (select author_id as uid, count(distinct (created_at at time zone 'America/Mexico_City')::date) as n
           from vis where gallery_id = 'asistencia' group by author_id),
  cc as (select author_id as uid, count(*) as n from public.comments
          where coalesce(is_deleted, false) = false and coalesce(is_hidden, false) = false group by author_id),
  rr as (select coalesce(po.author_id, co.author_id) as uid, count(*) as n
           from public.reports r
           left join public.posts po on po.id = r.post_id and r.comment_id is null
           left join public.comments co on co.id = r.comment_id
          group by 1),
  av as (select po.author_id as uid, count(*) as n, count(*) filter (where a.estado = 'activa') as act
           from public.gk_advertencias a join public.posts po on po.id = a.post_id group by po.author_id),
  ss as (select usuario as uid,
                count(*) filter (where tipo = 'precaucion' and activa) as pre,
                count(*) filter (where tipo = 'advertencia' and activa) as adv,
                count(*) filter (where tipo = 'suspension') as sus,
                count(*) filter (where tipo = 'nota') as nota,
                max(created_at) filter (where tipo <> 'nota') as ult
           from public.gk_sanciones group by usuario)
  select pr.id, pr.nickname, pr.role, u.created_at, u.last_sign_in_at, pr.banned_until,
         coalesce(pp.n, 0)::int, coalesce(cc.n, 0)::int, coalesce(pp.likes, 0)::int, coalesce(aa.n, 0)::int,
         (coalesce(pp.n, 0) * 10 + coalesce(cc.n, 0) * 3 + coalesce(pp.likes, 0) * 2 + coalesce(aa.n, 0) * 5)::int,
         coalesce(rr.n, 0)::int, coalesce(av.n, 0)::int, coalesce(av.act, 0)::int,
         coalesce(ss.pre, 0)::int, coalesce(ss.adv, 0)::int, coalesce(ss.sus, 0)::int, coalesce(ss.nota, 0)::int, ss.ult
    from public.profiles pr
    join auth.users u on u.id = pr.id
    left join pp on pp.uid = pr.id left join aa on aa.uid = pr.id left join cc on cc.uid = pr.id
    left join rr on rr.uid = pr.id left join av on av.uid = pr.id left join ss on ss.uid = pr.id
   order by u.created_at desc
   limit 5000;
end $$;
revoke all on function public.gk_admin_miembros() from public, anon;
grant execute on function public.gk_admin_miembros() to authenticated;

-- Números del panel de administración en la portada.
create or replace function public.gk_admin_resumen()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  if not public.gk_is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
  return jsonb_build_object(
    'revisar', (select count(*) from public.posts where needs_review and coalesce(is_hidden, false) = false and coalesce(is_deleted, false) = false),
    'reportes_7d', (select count(*) from public.reports where created_at > now() - interval '7 days'),
    'avisos_activos', (select count(*) from public.gk_advertencias where estado = 'activa'),
    'mensajes', (select count(*) from public.mensajes where not de_admin and not leido_admin),
    'miembros', (select count(*) from public.profiles),
    'nuevos_hoy', (select count(*) from auth.users u join public.profiles p on p.id = u.id where (u.created_at at time zone 'America/Mexico_City')::date = v_hoy),
    'nuevos_7d', (select count(*) from auth.users u join public.profiles p on p.id = u.id where u.created_at > now() - interval '7 days'),
    'suspendidos', (select count(*) from public.profiles where banned_until > now()),
    'con_advertencia', (select count(distinct usuario) from public.gk_sanciones where activa and tipo in ('precaucion', 'advertencia'))
  );
end $$;
revoke all on function public.gk_admin_resumen() from public, anon;
grant execute on function public.gk_admin_resumen() to authenticated;

-- Listo. Comprueba (con tu sesión de administrador en el sitio): menú 관리자 › 👥 회원 관리.
