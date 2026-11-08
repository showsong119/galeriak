-- GaleríaK · Líder de galería (방장) y advertencias en publicaciones (2026-11-08)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- IMPORTANTE: ejecuta antes 2026-11-08-asistencia-niveles-managers.sql (crea gk_managers).
--
-- 1) gk_managers.rol: 'manager' (🛡️) o 'lider' (👑, uno por galería). El líder también tiene las herramientas de manager.
-- 2) El líder (o el equipo) puede dar una ADVERTENCIA a una publicación de su galería:
--    · los comentarios de esa publicación se pausan (regla en la base de datos)
--    · la publicación pasa a revisión del equipo (needs_review = true)
--    · el equipo decide: eliminar la publicación o levantar la advertencia (los comentarios vuelven)
-- No se cambian columnas de posts ni comments; se agrega una tabla nueva (gk_advertencias) y una regla extra para comentar.

-- ---------- 1. rol en gk_managers ----------
alter table public.gk_managers add column if not exists rol text not null default 'manager';
do $$ begin
  alter table public.gk_managers add constraint gk_managers_rol_chk check (rol in ('manager', 'lider'));
exception when duplicate_object then null; end $$;
create unique index if not exists gk_managers_un_lider on public.gk_managers (gallery_id) where rol = 'lider';
drop policy if exists gk_managers_cambio on public.gk_managers;
create policy gk_managers_cambio on public.gk_managers for update to authenticated
  using (public.gk_is_admin()) with check (public.gk_is_admin());
grant update on public.gk_managers to authenticated;

create or replace function public.gk_es_lider(p_gallery text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gk_managers where gallery_id = p_gallery and user_id = auth.uid() and rol = 'lider');
$$;
grant execute on function public.gk_es_lider(text) to authenticated;

-- ---------- 2. advertencias ----------
create table if not exists public.gk_advertencias (
  id bigserial primary key,
  post_id bigint not null,
  gallery_id text not null,
  motivo text not null check (char_length(motivo) between 2 and 200),
  por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  estado text not null default 'activa' check (estado in ('activa', 'levantada', 'eliminada')),
  resuelto_por uuid,
  resuelto_at timestamptz
);
create unique index if not exists gk_advertencias_un_activa on public.gk_advertencias (post_id) where estado = 'activa';
alter table public.gk_advertencias enable row level security;
drop policy if exists gk_advertencias_leer on public.gk_advertencias;
create policy gk_advertencias_leer on public.gk_advertencias for select using (true);
grant select on public.gk_advertencias to anon, authenticated;
-- sin políticas de insert/update: solo se escribe con las funciones de abajo

create or replace function public.gk_post_advertido(p_post bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gk_advertencias where post_id = p_post and estado = 'activa');
$$;
grant execute on function public.gk_post_advertido(bigint) to anon, authenticated;

-- El líder de la galería (o el equipo) da la advertencia
create or replace function public.gk_advertir(p_post bigint, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_gal text; v_autor uuid; v_borrado boolean;
begin
  select gallery_id, author_id, coalesce(is_deleted, false) into v_gal, v_autor, v_borrado from public.posts where id = p_post;
  if v_gal is null or v_borrado then raise exception 'La publicación no existe'; end if;
  if not (public.gk_is_admin() or public.gk_es_lider(v_gal)) then
    raise exception 'Solo el líder de esta galería o el equipo pueden dar advertencias';
  end if;
  if exists (select 1 from public.profiles where id = v_autor and role = 'admin') then
    raise exception 'No se puede advertir una publicación del equipo de GaleríaK';
  end if;
  if public.gk_post_advertido(p_post) then raise exception 'Esta publicación ya tiene una advertencia'; end if;
  insert into public.gk_advertencias (post_id, gallery_id, motivo, por) values (p_post, v_gal, left(trim(p_motivo), 200), auth.uid());
  update public.posts set needs_review = true where id = p_post;
end $$;
grant execute on function public.gk_advertir(bigint, text) to authenticated;

-- El equipo decide: 'eliminar' la publicación o 'levantar' la advertencia
create or replace function public.gk_resolver_advertencia(p_post bigint, p_accion text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gk_is_admin() then raise exception 'Solo el equipo de GaleríaK puede decidir'; end if;
  if not public.gk_post_advertido(p_post) then raise exception 'Esta publicación no tiene una advertencia activa'; end if;
  if p_accion = 'eliminar' then
    update public.posts set is_deleted = true, needs_review = false where id = p_post;
    update public.gk_advertencias set estado = 'eliminada', resuelto_por = auth.uid(), resuelto_at = now() where post_id = p_post and estado = 'activa';
  elsif p_accion = 'levantar' then
    update public.posts set needs_review = false where id = p_post;
    update public.gk_advertencias set estado = 'levantada', resuelto_por = auth.uid(), resuelto_at = now() where post_id = p_post and estado = 'activa';
  else
    raise exception 'Acción no válida';
  end if;
end $$;
grant execute on function public.gk_resolver_advertencia(bigint, text) to authenticated;

-- Comentarios pausados en publicaciones con advertencia (el equipo sí puede comentar)
drop policy if exists gk_cmt_no_advertidos on public.comments;
create policy gk_cmt_no_advertidos on public.comments as restrictive for insert to authenticated
  with check (not public.gk_post_advertido(post_id) or public.gk_is_admin());

-- Listo. Para nombrar un líder usa 관리자 → 🛡️ 매니저 (rol 방장), o:
-- insert into public.gk_managers (gallery_id, user_id, rol) values ('bts', (select id from public.profiles where nickname = 'APODO'), 'lider');
