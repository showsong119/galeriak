-- GaleríaK · TODO 2026-11-10 en orden: visitas del examen → usuarios
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces.
-- Antes debe estar ejecutado 2026-11-09-TODO-en-orden.sql. Después: verificar.sql (18 ✅).

-- ================================================================
-- ===== 2026-11-10-visitas-examen.sql
-- ================================================================
-- GaleríaK · Visitas del examen de coreano contadas aparte (2026-11-10)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces.
-- Requiere 2026-11-09-visitas.sql (gk_is_admin y el contador general).
-- 'examen'     = abrió /examen-coreano/ (1 por navegador y día; también sigue contando en el total del sitio)
-- 'examen-fin' = terminó un examen y vio su resultado

create table if not exists public.gk_visitas_pagina (
  dia date not null,
  pagina text not null check (pagina in ('examen', 'examen-fin')),
  visitante uuid not null,
  vistas integer not null default 1,
  primera timestamptz not null default now(),
  primary key (dia, pagina, visitante)
);
alter table public.gk_visitas_pagina enable row level security;
revoke all on public.gk_visitas_pagina from anon, authenticated;

create or replace function public.gk_registrar_pagina(p_visitante uuid, p_pagina text)
returns void language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'America/Mexico_City')::date;
begin
  if p_visitante is null or p_pagina not in ('examen', 'examen-fin') then return; end if;
  insert into public.gk_visitas_pagina (dia, pagina, visitante) values (v_dia, p_pagina, p_visitante)
  on conflict (dia, pagina, visitante) do update set vistas = least(public.gk_visitas_pagina.vistas + 1, 200);
end $$;
grant execute on function public.gk_registrar_pagina(uuid, text) to anon, authenticated;

create or replace function public.gk_estadisticas_examen()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date; r jsonb;
begin
  if not public.gk_is_admin() then raise exception 'Solo el equipo de GaleríaK'; end if;
  with e as (select * from gk_visitas_pagina where pagina = 'examen'),
       f as (select * from gk_visitas_pagina where pagina = 'examen-fin')
  select jsonb_build_object(
    'hoy_visitantes',    (select count(*) from e where dia = v_hoy),
    'hoy_vistas',        (select coalesce(sum(vistas), 0) from e where dia = v_hoy),
    'ayer_visitantes',   (select count(*) from e where dia = v_hoy - 1),
    'semana_visitantes', (select count(distinct visitante) from e where dia > v_hoy - 7),
    'mes_visitantes',    (select count(distinct visitante) from e where dia > v_hoy - 30),
    'total_visitantes',  (select count(distinct visitante) from e),
    'total_vistas',      (select coalesce(sum(vistas), 0) from e),
    'hoy_terminados',    (select coalesce(sum(vistas), 0) from f where dia = v_hoy),
    'semana_terminados', (select coalesce(sum(vistas), 0) from f where dia > v_hoy - 7),
    'total_terminados',  (select coalesce(sum(vistas), 0) from f),
    'total_personas_terminaron', (select count(distinct visitante) from f),
    'desde',             (select min(dia) from e),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'visitantes', n, 'terminados', t) order by d)
                        from (select g.d::date as d,
                                     (select count(*) from e x where x.dia = g.d::date) as n,
                                     (select coalesce(sum(vistas), 0) from f x where x.dia = g.d::date) as t
                                from generate_series(v_hoy - 29, v_hoy, interval '1 day') g(d)) s), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.gk_estadisticas_examen() from public, anon;
grant execute on function public.gk_estadisticas_examen() to authenticated;

-- Comprueba: select public.gk_estadisticas_examen();  (como admin desde el sitio; en SQL Editor da error de admin, es normal)

-- ================================================================
-- ===== 2026-11-10-usuarios.sql
-- ================================================================
-- GaleríaK · Usuario (ID para entrar) único (2026-11-10)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Requiere las SQL anteriores (gk_is_admin).
--
-- Qué hace
--  1) Tabla gk_usuarios: cada cuenta tiene UN usuario (4–20: minúsculas, números y _; empieza con letra).
--     Único sin importar mayúsculas. No se puede cambiar (solo el equipo podría hacerlo en la tabla).
--  2) Al registrarse con correo, el usuario elegido se guarda automáticamente (trigger en auth.users).
--     Cuentas de Google o anteriores: eligen su usuario en el sitio la próxima vez que entren.
--  3) Entrar con usuario: gk_correo_para_entrar(usuario, contraseña) devuelve el correo SOLO si la
--     contraseña es correcta; máximo 5 intentos fallidos cada 15 minutos por usuario.
--  4) El usuario no puede ser igual al apodo de otra persona. En cuentas nuevas el apodo = usuario.
--  5) Un usuario reservado por una cuenta que nunca confirmó su correo se libera a los 3 días.

create table if not exists public.gk_usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null check (usuario ~ '^[a-z][a-z0-9_]{3,19}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists gk_usuarios_usuario_uq on public.gk_usuarios (lower(usuario));
alter table public.gk_usuarios enable row level security;
revoke all on public.gk_usuarios from anon, authenticated;
grant select on public.gk_usuarios to authenticated;
drop policy if exists gk_usuarios_leer on public.gk_usuarios;
create policy gk_usuarios_leer on public.gk_usuarios for select to authenticated
  using (id = auth.uid() or public.gk_is_admin());

create table if not exists public.gk_login_intentos (
  usuario text not null,
  at timestamptz not null default now()
);
create index if not exists gk_login_intentos_idx on public.gk_login_intentos (usuario, at);
alter table public.gk_login_intentos enable row level security;
revoke all on public.gk_login_intentos from anon, authenticated;

-- Palabras que nadie puede usar (para que nadie se haga pasar por el equipo)
create or replace function public.gk_usuario_prohibido(u text)
returns boolean language sql immutable as $$
  select u ~ '^(admin|administrador|administracion|galeriak|galeria_k|soporte|support|moderador|moderacion|mod|staff|equipo|oficial|official|root|sistema|system|bot|anonimo|null|undefined)'
$$;

-- Libera usuarios de cuentas que nunca confirmaron el correo en 3 días
create or replace function public.gk_usuario_liberar(u text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.gk_usuarios g using auth.users au
   where au.id = g.id and lower(g.usuario) = lower(u)
     and au.email_confirmed_at is null and au.last_sign_in_at is null
     and au.created_at < now() - interval '3 days';
end $$;

-- 'libre' | 'invalido' | 'reservado' | 'tomado'
create or replace function public.gk_usuario_disponible(p_usuario text)
returns text language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(coalesce(p_usuario, '')));
begin
  if u !~ '^[a-z][a-z0-9_]{3,19}$' then return 'invalido'; end if;
  if public.gk_usuario_prohibido(u) then return 'reservado'; end if;
  perform public.gk_usuario_liberar(u);
  if exists (select 1 from public.gk_usuarios where lower(usuario) = u) then return 'tomado'; end if;
  -- tampoco puede ser el apodo de OTRA persona (evita hacerse pasar por alguien)
  if exists (select 1 from public.profiles where lower(nickname) = u and id is distinct from auth.uid()) then return 'tomado'; end if;
  return 'libre';
end $$;
grant execute on function public.gk_usuario_disponible(text) to anon, authenticated;

-- Para cuentas sin usuario (Google o anteriores): 'ok' | 'invalido' | 'reservado' | 'tomado' | 'ya-tienes' | 'sin-sesion'
create or replace function public.gk_elegir_usuario(p_usuario text)
returns text language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(coalesce(p_usuario, ''))); s text;
begin
  if auth.uid() is null then return 'sin-sesion'; end if;
  if exists (select 1 from public.gk_usuarios where id = auth.uid()) then return 'ya-tienes'; end if;
  s := public.gk_usuario_disponible(u);
  if s <> 'libre' then return s; end if;
  begin
    insert into public.gk_usuarios (id, usuario) values (auth.uid(), u);
  exception when unique_violation then return 'tomado';
  end;
  -- cuentas nuevas (p. ej. Google, menos de 1 día): el apodo pasa a ser el usuario, como en Instagram/TikTok
  if exists (select 1 from auth.users where id = auth.uid() and created_at > now() - interval '1 day') then
    update public.profiles set nickname = u
     where id = auth.uid() and not exists (select 1 from public.profiles o where lower(o.nickname) = u and o.id <> auth.uid());
  end if;
  return 'ok';
end $$;
grant execute on function public.gk_elegir_usuario(text) to authenticated;

-- Al registrarse con correo: guarda el usuario que eligió (si está libre). Nunca bloquea el registro.
create or replace function public.gk_usuario_al_registrar()
returns trigger language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(coalesce(new.raw_user_meta_data ->> 'usuario', '')));
begin
  if u ~ '^[a-z][a-z0-9_]{3,19}$' and not public.gk_usuario_prohibido(u) then
    begin
      perform public.gk_usuario_liberar(u);
      insert into public.gk_usuarios (id, usuario) values (new.id, u);
    exception when others then null;   -- ocupado al mismo tiempo: lo elegirá al entrar
    end;
  end if;
  return new;
end $$;
drop trigger if exists gk_usuario_al_registrar on auth.users;
create trigger gk_usuario_al_registrar after insert on auth.users
  for each row execute function public.gk_usuario_al_registrar();

-- Entrar con usuario: devuelve el correo solo si la contraseña es correcta
create or replace function public.gk_correo_para_entrar(p_usuario text, p_clave text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(coalesce(p_usuario, ''))); v_mail text; v_hash text;
begin
  if u !~ '^[a-z][a-z0-9_]{3,19}$' or coalesce(p_clave, '') = '' then return null; end if;
  if (select count(*) from public.gk_login_intentos where usuario = u and at > now() - interval '15 minutes') >= 5 then
    raise exception 'demasiados-intentos';
  end if;
  select au.email, au.encrypted_password into v_mail, v_hash
    from public.gk_usuarios g join auth.users au on au.id = g.id
   where lower(g.usuario) = u;
  if v_hash is not null and v_hash <> '' and v_hash = crypt(p_clave, v_hash) then
    delete from public.gk_login_intentos where usuario = u;
    return v_mail;
  end if;
  insert into public.gk_login_intentos (usuario) values (u);
  delete from public.gk_login_intentos where at < now() - interval '1 day';
  return null;
end $$;
revoke all on function public.gk_correo_para_entrar(text, text) from public;
grant execute on function public.gk_correo_para_entrar(text, text) to anon, authenticated;

-- Comprueba:
-- select public.gk_usuario_disponible('minseok');   -- libre / tomado / ...
-- select count(*) from public.gk_usuarios;
