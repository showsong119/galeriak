-- GaleríaK · Asistencia diaria y niveles v2 (2026-11-08)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- No cambia ninguna tabla: solo reemplaza la función de puntos gk_niveles.
--
-- Puntos nuevos (ya no se dan puntos solo por los días desde el registro → toda cuenta nueva empieza en Lv.0):
--   pasar lista en la galería 'asistencia' +5 (máximo 1 vez al día, hora de la Ciudad de México)
--   publicación en cualquier otra galería +10 · comentario +3 · cada ♥ recibido +2
--   Las publicaciones y comentarios ocultos o eliminados no cuentan.
-- La función ahora también devuelve 'asistencias' (días distintos con lista), que el sitio usa para el requisito de Lv.2.

drop function if exists public.gk_niveles(uuid[]);

create function public.gk_niveles(p_ids uuid[])
returns table (id uuid, puntos integer, admin boolean, asistencias integer)
language sql stable security definer set search_path = public as $$
  with u as (select distinct unnest(p_ids[1:200]) as id),
  vis as (select author_id, gallery_id, up_count, created_at
            from public.posts
           where author_id in (select id from u) and coalesce(is_deleted, false) = false and coalesce(is_hidden, false) = false),
  p as (select author_id as id,
               count(*) filter (where gallery_id <> 'asistencia') as n,
               coalesce(sum(greatest(up_count, 0)), 0) as likes
          from vis group by author_id),
  a as (select author_id as id, count(distinct (created_at at time zone 'America/Mexico_City')::date) as n
          from vis where gallery_id = 'asistencia' group by author_id),
  c as (select author_id as id, count(*) as n
          from public.comments
         where author_id in (select id from u) and coalesce(is_deleted, false) = false and coalesce(is_hidden, false) = false
         group by author_id)
  select u.id,
         (coalesce(p.n, 0) * 10 + coalesce(c.n, 0) * 3 + coalesce(p.likes, 0) * 2 + coalesce(a.n, 0) * 5)::integer,
         coalesce(pr.role = 'admin', false),
         coalesce(a.n, 0)::integer
    from u
    left join p on p.id = u.id
    left join a on a.id = u.id
    left join c on c.id = u.id
    left join public.profiles pr on pr.id = u.id;
$$;
grant execute on function public.gk_niveles(uuid[]) to anon, authenticated;

-- Listo. Comprueba: select * from public.gk_niveles(array[(select id from public.profiles where role='admin' limit 1)]);

-- =====================================================================
-- Managers por galería (2026-11-08)
-- Tabla nueva gk_managers: el equipo (admin) nombra managers en cada galería (sobre todo K-Pop).
-- Un manager tiene su propio ícono 🛡️ junto al apodo en su galería y puede ocultar/mostrar
-- publicaciones y comentarios de SU galería (no los del equipo). Nada más cambia en las tablas existentes.
-- Requiere gk_is_admin() (de 2026-11-08-mensajes-niveles.sql, ya ejecutado).
-- =====================================================================
create table if not exists public.gk_managers (
  gallery_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  primary key (gallery_id, user_id)
);
alter table public.gk_managers enable row level security;
drop policy if exists gk_managers_leer on public.gk_managers;
create policy gk_managers_leer on public.gk_managers for select using (true);
drop policy if exists gk_managers_alta on public.gk_managers;
create policy gk_managers_alta on public.gk_managers for insert to authenticated with check (public.gk_is_admin());
drop policy if exists gk_managers_baja on public.gk_managers;
create policy gk_managers_baja on public.gk_managers for delete to authenticated using (public.gk_is_admin());
grant select on public.gk_managers to anon, authenticated;
grant insert, delete on public.gk_managers to authenticated;

create or replace function public.gk_es_manager(p_gallery text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gk_managers where gallery_id = p_gallery and user_id = auth.uid());
$$;
grant execute on function public.gk_es_manager(text) to authenticated;

-- p_tipo: 'post' o 'comment'. Solo admin o manager de la galería de esa publicación.
create or replace function public.gk_manager_ocultar(p_tipo text, p_id bigint, p_oculto boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_gal text; v_autor uuid;
begin
  if p_tipo = 'post' then
    select gallery_id, author_id into v_gal, v_autor from public.posts where id = p_id;
  elsif p_tipo = 'comment' then
    select p.gallery_id, c.author_id into v_gal, v_autor from public.comments c join public.posts p on p.id = c.post_id where c.id = p_id;
  else
    raise exception 'Tipo no válido';
  end if;
  if v_gal is null then raise exception 'No existe'; end if;
  if not (public.gk_is_admin() or public.gk_es_manager(v_gal)) then
    raise exception 'Solo el equipo o los managers de esta galería pueden hacer esto';
  end if;
  if not public.gk_is_admin() and exists (select 1 from public.profiles where id = v_autor and role = 'admin') then
    raise exception 'No puedes ocultar contenido del equipo de GaleríaK';
  end if;
  if p_tipo = 'post' then
    update public.posts set is_hidden = p_oculto where id = p_id;
  else
    update public.comments set is_hidden = p_oculto where id = p_id;
  end if;
end $$;
grant execute on function public.gk_manager_ocultar(text, bigint, boolean) to authenticated;

-- Listo. Para nombrar un manager usa el panel 관리자 → 매니저 del sitio, o:
-- insert into public.gk_managers (gallery_id, user_id) values ('bts', (select id from public.profiles where nickname = 'APODO'));
