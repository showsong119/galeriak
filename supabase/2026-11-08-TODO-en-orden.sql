-- GaleríaK · TODO EN ORDEN (2026-11-08): pega TODO este archivo en Supabase → SQL Editor → Run, una sola vez.
-- Incluye, en orden: galerías faltantes → asistencia/niveles/managers → fotos → líderes/advertencias → primeras publicaciones.
-- Se puede ejecutar varias veces sin problema (no duplica nada). Después ejecuta verificar.sql para ver ✅/❌.
-- (Requiere 2026-11-08-mensajes-niveles.sql, que ya se ejecutó antes.)

-- ==================================================================
-- ▶ 2026-11-08-galerias-faltantes.sql
-- ==================================================================
-- GaleríaK · Registrar galerías que faltan en la tabla galleries (2026-11-08)
-- posts.gallery_id debe existir en public.galleries (llave foránea posts_gallery_id_fkey).
-- Este bloque agrega SOLO las galerías del sitio que todavía no están (por ejemplo 'kpop-general' y 'asistencia').
-- Copia una galería existente como plantilla y cambia su clave, nombre y descripción, así funciona
-- aunque la tabla tenga otras columnas. No modifica ni borra galerías existentes. Se puede ejecutar varias veces.
do $gk$
declare
  r record; tpl jsonb; existe boolean; keycol text; cols text; agregadas text := '';
begin
  if to_regclass('public.galleries') is null then
    raise notice 'No existe public.galleries: nada que hacer.'; return;
  end if;
  -- columna a la que apunta posts.gallery_id
  select a.attname into keycol
    from pg_constraint c join pg_attribute a on a.attrelid = c.confrelid and a.attnum = c.confkey[1]
   where c.conrelid = 'public.posts'::regclass and c.contype = 'f'
     and c.conkey[1] = (select attnum from pg_attribute where attrelid = 'public.posts'::regclass and attname = 'gallery_id')
   limit 1;
  keycol := coalesce(keycol, 'id');
  for r in select * from (values
    ('asistencia', 'Asistencia diaria', 'Pasa lista cada día y gana +5 puntos', 'comunidad'),
    ('libre', 'Foro libre', 'Habla de lo que quieras: K-Beauty, K-Pop, tu día…', 'comunidad'),
    ('solicitudes', 'Solicitar galería', 'Pide nuevas galerías de grupos, actores o marcas', 'comunidad'),
    ('skincare', 'Skincare coreano', 'Rutinas, ingredientes y dudas de cuidado de la piel', 'beauty'),
    ('maquillaje', 'Maquillaje coreano', 'Cushions, tints, tonos para piel latina', 'beauty'),
    ('resenas', 'Reseñas', 'Reseñas honestas después de usar el producto', 'beauty'),
    ('idol-picks', 'Productos de idols', 'Lo que usan los idols — siempre con fuente', 'beauty'),
    ('ofertas', 'Ofertas K-Beauty', 'Precios bajos en México, con enlace y tienda', 'beauty'),
    ('kpop-general', 'K-Pop general', 'Comebacks, conciertos en México y charla de todos los grupos', 'kpop'),
    ('aespa', 'aespa', 'Galería de fans de aespa', 'kpop'),
    ('ateez', 'ATEEZ', 'Galería de fans de ATEEZ', 'kpop'),
    ('blackpink', 'BLACKPINK', 'Galería de fans de BLACKPINK', 'kpop'),
    ('bts', 'BTS', 'Galería de fans de BTS', 'kpop'),
    ('enhypen', 'ENHYPEN', 'Galería de fans de ENHYPEN', 'kpop'),
    ('ive', 'IVE', 'Galería de fans de IVE', 'kpop'),
    ('le-sserafim', 'LE SSERAFIM', 'Galería de fans de LE SSERAFIM', 'kpop'),
    ('seventeen', 'SEVENTEEN', 'Galería de fans de SEVENTEEN', 'kpop'),
    ('stray-kids', 'Stray Kids', 'Galería de fans de Stray Kids', 'kpop'),
    ('twice', 'TWICE', 'Galería de fans de TWICE', 'kpop'),
    ('txt', 'TXT', 'Galería de fans de TOMORROW X TOGETHER', 'kpop'),
    ('kdramas', 'K-Dramas', 'Recomendaciones y comentarios (sin spoilers en el título)', 'kdrama'),
    ('coreano', 'Aprender coreano', 'Frases útiles, hangul y recursos', 'vida'),
    ('viajes', 'Viaje a Corea', 'Compras, tax free y consejos para tu viaje', 'vida')
  ) as v(gid, nombre, descr, cat) loop
    execute format('select exists (select 1 from public.galleries where %I::text = $1)', keycol) into existe using r.gid;
    if existe then continue; end if;
    select to_jsonb(g) into tpl from public.galleries g limit 1;
    if tpl is null then raise exception 'La tabla galleries está vacía; no hay plantilla.'; end if;
    tpl := tpl - 'created_at' - 'updated_at' - 'inserted_at';
    if keycol <> 'id' and tpl ? 'id' then tpl := tpl - 'id'; end if;   -- deja que la id se genere sola
    tpl := tpl || jsonb_build_object(keycol, r.gid);
    if tpl ? 'slug' then tpl := tpl || jsonb_build_object('slug', r.gid); end if;
    if tpl ? 'name' then tpl := tpl || jsonb_build_object('name', r.nombre); end if;
    if tpl ? 'title' then tpl := tpl || jsonb_build_object('title', r.nombre); end if;
    if tpl ? 'nombre' then tpl := tpl || jsonb_build_object('nombre', r.nombre); end if;
    if tpl ? 'description' then tpl := tpl || jsonb_build_object('description', r.descr); end if;
    if tpl ? 'descripcion' then tpl := tpl || jsonb_build_object('descripcion', r.descr); end if;
    if tpl ? 'desc' then tpl := tpl || jsonb_build_object('desc', r.descr); end if;
    if tpl ? 'category' then tpl := tpl || jsonb_build_object('category', r.cat); end if;
    if tpl ? 'cat' then tpl := tpl || jsonb_build_object('cat', r.cat); end if;
    select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(tpl) k
     where exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'galleries' and column_name = k and is_generated = 'NEVER');
    execute format('insert into public.galleries (%s) select %s from jsonb_populate_record(null::public.galleries, $1)', cols, cols) using tpl;
    agregadas := agregadas || r.gid || ' ';
  end loop;
  raise notice 'Galerías agregadas: %', coalesce(nullif(agregadas, ''), 'ninguna (ya estaban todas)');
end
$gk$;

-- ==================================================================
-- ▶ 2026-11-08-asistencia-niveles-managers.sql
-- ==================================================================
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

-- ==================================================================
-- ▶ 2026-11-08-fotos.sql
-- ==================================================================
-- GaleríaK · Fotos en publicaciones (2026-11-08)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- IMPORTANTE: ejecuta antes 2026-11-08-asistencia-niveles-managers.sql (usa gk_niveles con asistencias).
--
-- Crea el bucket público 'post-images' (máx. 2 MB por foto, solo webp/jpeg/png) y una regla:
-- solo pueden subir fotos las cuentas Lv.2 o más (150 puntos y 7 días de asistencia) y el equipo (admin),
-- cada quien en su propia carpeta (<id de usuario>/archivo), máximo 40 fotos al día.
-- Las publicaciones no cambian: la foto se guarda en el texto como [foto:<id>/<archivo>] y el sitio la muestra.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ¿La cuenta actual puede subir fotos? (Lv.2+: 150 puntos y 7 días de asistencia, o admin; máx. 40 al día)
create or replace function public.gk_puede_fotos()
returns boolean language plpgsql stable security definer set search_path = public, storage as $$
declare v record; v_hoy integer;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and banned_until is not null and banned_until > now()) then
    return false;
  end if;
  select count(*) into v_hoy from storage.objects
   where bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text
     and created_at > now() - interval '1 day';
  if v_hoy >= 40 then return false; end if;
  select * into v from public.gk_niveles(array[auth.uid()]);
  return coalesce(v.admin, false) or (coalesce(v.puntos, 0) >= 150 and coalesce(v.asistencias, 0) >= 7);
end $$;
grant execute on function public.gk_puede_fotos() to authenticated;

drop policy if exists gk_fotos_subir on storage.objects;
create policy gk_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.gk_puede_fotos());

-- lectura (el bucket es público; algunas versiones de Storage la piden al subir)
drop policy if exists gk_fotos_leer on storage.objects;
create policy gk_fotos_leer on storage.objects for select using (bucket_id = 'post-images');

drop policy if exists gk_fotos_borrar on storage.objects;
create policy gk_fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.gk_is_admin()));

-- Listo. Comprueba: select id, public, file_size_limit from storage.buckets where id = 'post-images';

-- ==================================================================
-- ▶ 2026-11-08-lideres-advertencias.sql
-- ==================================================================
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

-- ==================================================================
-- ▶ 2026-11-08-primeras-publicaciones.sql
-- ==================================================================
-- GaleríaK · Primeras publicaciones del equipo (2026-11-08)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces: no repite publicaciones.
-- Publica 26 temas para iniciar conversación, firmados por la cuenta administradora (aparecen con el ícono Admin).
-- Son preguntas e información general del equipo, no opiniones inventadas de usuarios.
-- Requiere que exista al menos una cuenta con role = 'admin'.
insert into public.posts (gallery_id, author_id, title, body)
select v.gallery_id, a.id, v.title, v.body
  from (values
  ('kpop-general', '¡Bienvenidas y bienvenidos al tablero de K-Pop! Preséntate aquí', 'Este es el tablero donde se juntan todos los grupos. Para empezar, cuéntanos: ¿quién es tu grupo favorito, quién es tu bias y desde qué canción te volviste fan?

Recuerda: elige el grupo correcto al publicar (es como el "말머리" de los foros coreanos) para que otros fans te encuentren. Nada de fan wars: aquí todos los fandoms son bienvenidos.'),
  ('kpop-general', '¿Qué conciertos de K-Pop en México has vivido o te gustaría vivir?', 'México es uno de los países con más fans de K-Pop en Latinoamérica. Comparte tu experiencia: ¿a qué concierto fuiste, cómo conseguiste boletos y qué consejo le darías a quien va por primera vez?

Si todavía no has ido a ninguno, cuéntanos qué grupo te encantaría ver en vivo y en qué ciudad.'),
  ('kpop-general', 'Recomiéndanos una canción de K-Pop que no sea muy conocida', 'Todos conocemos los éxitos más famosos, pero cada fan tiene una canción "escondida" que ama. Deja el nombre de la canción, el grupo y por qué te gusta.

Comparte enlaces oficiales (YouTube oficial del grupo o de la agencia, Spotify, Apple Music). Así apoyamos a los artistas.'),
  ('bts', 'ARMY de México: ¿cuál fue la primera canción de BTS que escuchaste?', 'Para abrir la galería de BTS queremos conocer a la comunidad ARMY. ¿Cuál fue la primera canción que escuchaste, en qué año y qué te hizo quedarte?

Reglas rápidas: sin datos privados de los integrantes, sin filtraciones y sin ataques a otros fandoms.'),
  ('blackpink', 'BLINKs: ¿cuál es su canción favorita de BLACKPINK y por qué?', 'Abrimos la galería de BLACKPINK con una pregunta sencilla: ¿qué canción del grupo pondrías para convencer a alguien de volverse BLINK?

También puedes contar tu era favorita y tus mejores momentos como fan.'),
  ('stray-kids', 'STAY: ¿cómo conociste a Stray Kids?', 'Bienvenidas y bienvenidos a la galería de Stray Kids. Cuéntanos cómo conociste al grupo, cuál fue la primera canción que te atrapó y quién es tu bias.

Si tienes tips para nuevos STAY (por dónde empezar a escuchar, contenido oficial recomendado), compártelos aquí.'),
  ('twice', 'ONCE: ¿qué canción de TWICE te pone de buen humor?', 'Para estrenar la galería de TWICE: ¿qué canción pones cuando necesitas ánimo? Cuéntanos también desde cuándo eres ONCE.

Comparte solo enlaces oficiales y respeta a todas las integrantes.'),
  ('seventeen', 'CARAT: recomienda una canción de SEVENTEEN para nuevos fans', 'SEVENTEEN tiene muchas canciones y subunidades, y a veces es difícil saber por dónde empezar. Si fueras a recomendar una sola canción a alguien nuevo, ¿cuál sería?

Explica por qué la elegiste: así la galería sirve de guía para quien apenas está conociendo al grupo.'),
  ('ateez', 'ATINY: preséntate en la galería de ATEEZ', 'Esta galería es para la comunidad ATINY en México. Cuéntanos tu canción favorita, tu bias y si has visto al grupo en vivo.

Recuerda elegir la galería de ATEEZ al publicar para que tus publicaciones aparezcan con su etiqueta en el tablero de K-Pop.'),
  ('enhypen', 'ENGENE: ¿cuál fue tu primera canción de ENHYPEN?', 'Abrimos la galería de ENHYPEN. ¿Con qué canción conociste al grupo y qué te hizo quedarte?

Comparte también contenido oficial que le recomendarías a un nuevo ENGENE.'),
  ('txt', 'MOA: ¿qué canción de TXT le recomendarías a alguien nuevo?', 'Bienvenidos a la galería de TOMORROW X TOGETHER. Recomienda una canción para quien apenas los está conociendo y cuéntanos por qué.

Sin filtraciones ni datos privados de los integrantes.'),
  ('aespa', 'MY: preséntate en la galería de aespa', 'Esta galería es para la comunidad MY. ¿Cuál es tu canción favorita de aespa y quién es tu bias?

Comparte enlaces oficiales y respeta a todos los fandoms.'),
  ('ive', 'DIVE: ¿cuál es tu canción favorita de IVE?', 'Abrimos la galería de IVE con una pregunta para la comunidad DIVE: ¿qué canción del grupo no puede faltar en tu playlist?

Cuéntanos también desde cuándo eres fan.'),
  ('le-sserafim', 'FEARNOT: recomienda una canción de LE SSERAFIM', 'Bienvenidas y bienvenidos a la galería de LE SSERAFIM. Si alguien nunca los ha escuchado, ¿con qué canción empezarías?

Comparte por qué la elegiste y deja el enlace oficial.'),
  ('skincare', '¿Cuál es tu rutina de skincare coreana? Compártela paso a paso', 'Para abrir la galería de skincare: cuéntanos tu rutina de mañana y de noche, tu tipo de piel y qué productos usas en cada paso.

Tip para empezar: si eres principiante, basta con limpiador, hidratante y protector solar. Si tienes una condición de la piel, consulta a un dermatólogo antes de cambiar tu rutina. Aquí tienes nuestra guía: /guias/rutina-skincare-coreana/'),
  ('skincare', 'Protector solar coreano en México: ¿cuál usas y cómo te funciona con el calor?', 'El clima de muchas ciudades de México es caluroso y con mucho sol, así que el protector es el paso más importante. ¿Qué protector coreano usas, cómo se siente en tu piel (grasa, seca, mixta) y dónde lo compraste?

Recuerda reaplicar cada 2 a 3 horas si estás al sol. Guía completa: /guias/protector-solar-coreano/'),
  ('maquillaje', 'Cushion para piel morena: comparte tu tono y marca', 'Encontrar el tono correcto de cushion o base coreana para piel morena puede ser difícil. Ayudemos a otras personas: comparte tu marca, el nombre del tono y cómo te queda (si oxida, si se ve gris, etc.).

Una foto con luz natural ayuda mucho (las fotos se desbloquean desde Lv.2).'),
  ('maquillaje', '¿Cuál es tu tint de labios coreano favorito?', 'Los tints de labios son de los productos coreanos más populares. ¿Cuál usas, qué acabado tiene (glossy, mate, de agua) y cuánto te dura?

Si lo compraste en México, cuéntanos dónde para ayudar a otros a encontrar productos originales.'),
  ('resenas', 'Cómo escribir una buena reseña en GaleríaK', 'Las reseñas honestas son lo más útil para la comunidad. Una buena reseña incluye: el producto exacto, tu tipo de piel, cuánto tiempo lo usaste (idealmente dos semanas o más), lo que te gustó, lo que no, y dónde lo compraste.

No se permiten reseñas pagadas sin avisarlo. Si te regalaron el producto, dilo al inicio.'),
  ('kdramas', '¿Qué K-Drama le recomendarías a alguien que nunca ha visto uno?', 'Abrimos la galería de K-Dramas: deja el nombre del drama, el género (romance, thriller, comedia…) y por qué es perfecto para empezar.

Por favor sin spoilers en el título. Si vas a contar algo importante de la trama, avisa con "spoiler" al inicio.'),
  ('kdramas', '¿Dónde ves K-Dramas en México de forma legal?', 'Queremos armar una lista de plataformas legales para ver K-Dramas en México. ¿Cuál usas y qué te parece su catálogo y subtítulos en español?

No compartas enlaces a sitios piratas: apoyar las plataformas oficiales ayuda a que lleguen más dramas a Latinoamérica.'),
  ('coreano', '¿Por qué estás aprendiendo coreano? Preséntate', 'Esta galería es para aprender juntos. Cuéntanos por qué empezaste a estudiar coreano, cuánto llevas y qué recursos usas.

¿No sabes tu nivel? Haz nuestro examen gratis de 30 preguntas: /examen-coreano/ y comparte tu resultado aquí.'),
  ('coreano', 'Frase coreana del día: 감사합니다 (gamsahamnida)', '감사합니다 significa "gracias" en un tono formal y amable. En situaciones más relajadas también escucharás 고마워요 (gomawoyo).

Reto: escribe en los comentarios una frase en coreano que hayas aprendido esta semana y su significado. Más frases: /guias/frases-coreanas-kpop/'),
  ('viajes', '¿Ya viajaste a Corea desde México? Comparte tus consejos', 'Si ya fuiste a Corea, tus consejos pueden ayudar mucho: ¿cómo fue tu vuelo, qué trámites hiciste, cuánto gastaste más o menos y qué lugares recomiendas para fans de K-Pop y K-Beauty?

Si estás planeando tu primer viaje, deja aquí tus dudas. Revisa siempre los requisitos de entrada en fuentes oficiales antes de viajar.'),
  ('libre', 'Preséntate en el Foro libre', 'Este es el lugar para hablar de lo que quieras. Preséntate: ¿de qué ciudad de México eres, qué te gusta del K-Beauty o del K-Pop y qué te gustaría encontrar en GaleríaK?

Tus ideas nos ayudan a mejorar la comunidad.'),
  ('solicitudes', '¿Qué galería te gustaría que abriéramos?', '¿Falta tu grupo, actor, actriz o marca favorita? Pídelo aquí con el nombre exacto y por qué crees que tendría actividad.

Las solicitudes con más ♥ y comentarios son las primeras que abrimos.')
  ) as v(gallery_id, title, body)
  cross join lateral (select id from public.profiles where role = 'admin' order by (nickname = 'showsong117') desc, id limit 1) a
 where not exists (select 1 from public.posts p where p.title = v.title and coalesce(p.is_deleted, false) = false);

-- Comprueba: select gallery_id, title from public.posts where author_id in (select id from public.profiles where role='admin') order by id desc limit 30;
