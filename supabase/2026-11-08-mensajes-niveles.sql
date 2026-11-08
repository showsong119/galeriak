-- GaleríaK · Mensajes al equipo, niveles de usuario y avisos fijos solo para administradores
-- Cómo usar: Supabase › SQL Editor › New query › pega TODO este archivo › Run.
-- Solo AGREGA cosas nuevas: una tabla (mensajes), funciones y dos reglas de seguridad extra en posts.
-- No borra ni modifica columnas ni datos existentes. Se puede ejecutar más de una vez sin problema.

-- 0) ¿La persona que hace la petición es administradora?
create or replace function public.gk_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.gk_is_admin() to anon, authenticated;

-- 1) Avisos fijos (is_pinned): solo administradores pueden crearlos o fijar publicaciones.
--    Son reglas "restrictive": se suman a las reglas que ya existen, no las reemplazan.
drop policy if exists gk_pin_solo_admin_insert on public.posts;
create policy gk_pin_solo_admin_insert on public.posts as restrictive for insert to public
  with check (coalesce(is_pinned, false) = false or public.gk_is_admin());
drop policy if exists gk_pin_solo_admin_update on public.posts;
create policy gk_pin_solo_admin_update on public.posts as restrictive for update to public
  using (true)
  with check (coalesce(is_pinned, false) = false or public.gk_is_admin());

-- 2) Mensajes (consultas al equipo, estilo "쪽지")
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  hilo bigint references public.mensajes(id) on delete cascade,      -- null = consulta nueva; si no, respuesta dentro de esa consulta
  usuario uuid not null references auth.users(id) on delete cascade, -- persona que hizo la consulta (dueña de la conversación)
  autor uuid not null default auth.uid() references auth.users(id) on delete cascade,
  de_admin boolean not null default false,                           -- true = respuesta del equipo
  asunto text check (asunto is null or char_length(asunto) between 2 and 120),
  cuerpo text not null check (char_length(cuerpo) between 2 and 2000),
  leido_usuario boolean not null default false,
  leido_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mensajes_usuario_idx on public.mensajes (usuario, created_at desc);
create index if not exists mensajes_hilo_idx on public.mensajes (hilo, created_at);
alter table public.mensajes enable row level security;

-- Leer: cada quien sus conversaciones; el equipo, todas.
drop policy if exists gk_mensajes_leer on public.mensajes;
create policy gk_mensajes_leer on public.mensajes for select to authenticated
  using (usuario = auth.uid() or public.gk_is_admin());

-- Escribir:
--  · un usuario escribe en SUS conversaciones como usuario (no puede hacerse pasar por el equipo)
--  · el equipo responde en cualquier conversación con de_admin = true
--  · las respuestas deben pertenecer a la misma conversación
--  · cuentas suspendidas no pueden escribir; máximo 20 mensajes al día por persona
drop policy if exists gk_mensajes_escribir on public.mensajes;
create policy gk_mensajes_escribir on public.mensajes for insert to authenticated
  with check (
    autor = auth.uid()
    and ((usuario = auth.uid() and de_admin = false) or (public.gk_is_admin() and de_admin = true))
    and (
      (hilo is null and asunto is not null)
      or exists (select 1 from public.mensajes r where r.id = mensajes.hilo and r.hilo is null and r.usuario = mensajes.usuario)
    )
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.banned_until > now())
    and (public.gk_is_admin() or (select count(*) from public.mensajes m where m.autor = auth.uid() and m.created_at > now() - interval '1 day') < 20)
  );
-- No hay reglas de update ni delete: los mensajes no se editan. Marcar como leído se hace con esta función:
create or replace function public.gk_mensajes_leidos(p_hilo bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.gk_is_admin() then
    update public.mensajes set leido_admin = true where (id = p_hilo or hilo = p_hilo) and de_admin = false and leido_admin = false;
  end if;
  update public.mensajes set leido_usuario = true
   where (id = p_hilo or hilo = p_hilo) and de_admin = true and usuario = auth.uid() and leido_usuario = false;
end $$;
grant execute on function public.gk_mensajes_leidos(bigint) to authenticated;
grant select, insert on public.mensajes to authenticated;

-- 3) Niveles: puntos de actividad de cada cuenta (estilo DC Inside / Ppomppu)
--    publicación +10 · comentario +3 · cada ♥ recibido en tus publicaciones +2 · cada día desde el registro +1 (máx. 365)
--    Las publicaciones y comentarios ocultos o eliminados no cuentan. El nivel se calcula en el sitio a partir de los puntos.
create or replace function public.gk_niveles(p_ids uuid[])
returns table (id uuid, puntos integer, admin boolean)
language sql stable security definer set search_path = public as $$
  with u as (select distinct unnest(p_ids[1:200]) as id),
  p as (select author_id as id, count(*) as n, coalesce(sum(greatest(up_count, 0)), 0) as likes
          from public.posts
         where author_id in (select id from u) and coalesce(is_deleted, false) = false and coalesce(is_hidden, false) = false
         group by author_id),
  c as (select author_id as id, count(*) as n
          from public.comments
         where author_id in (select id from u) and coalesce(is_deleted, false) = false and coalesce(is_hidden, false) = false
         group by author_id),
  d as (select au.id, greatest(0, current_date - au.created_at::date) as dias from auth.users au where au.id in (select id from u))
  select u.id,
         (coalesce(p.n, 0) * 10 + coalesce(c.n, 0) * 3 + coalesce(p.likes, 0) * 2 + least(coalesce(d.dias, 0), 365))::integer,
         coalesce(pr.role = 'admin', false)
    from u
    left join p on p.id = u.id
    left join c on c.id = u.id
    left join d on d.id = u.id
    left join public.profiles pr on pr.id = u.id;
$$;
grant execute on function public.gk_niveles(uuid[]) to anon, authenticated;

-- Listo. Comprueba: select * from public.gk_niveles(array[(select id from public.profiles where role='admin' limit 1)]);
