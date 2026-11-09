-- GaleríaK · TODO lo pendiente del 9 de noviembre, en orden (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Incluye: visitas → gestión de miembros → apodo Administrador → revisión IA (queda en pausa hasta 100 visitantes/día) → galería Memes → galería Anónimo y comentarios solo para miembros.
-- Después ejecuta supabase/verificar.sql: deben salir 16 ✅.

-- ================================================================
-- ===== 2026-11-09-visitas.sql
-- ================================================================
-- GaleríaK · Contador de visitas anónimo (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Requiere gk_is_admin() (ya existe).
--
-- Cómo funciona: cada navegador guarda un identificador aleatorio (no es tu cuenta ni tu correo).
-- Al abrir el sitio se registra 1 visita por día y se suman las páginas vistas.
-- Solo el equipo (admin) puede ver las estadísticas. Nadie puede leer la tabla directamente.

create table if not exists public.gk_visitas (
  dia date not null,
  visitante uuid not null,
  vistas integer not null default 1,
  primera timestamptz not null default now(),
  primary key (dia, visitante)
);
alter table public.gk_visitas enable row level security;
-- sin políticas: nadie la lee ni la escribe directamente; solo con las funciones de abajo
revoke all on public.gk_visitas from anon, authenticated;

-- Registrar una visita (cualquiera, con o sin cuenta). Día según la Ciudad de México.
create or replace function public.gk_registrar_visita(p_visitante uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'America/Mexico_City')::date;
begin
  if p_visitante is null then return; end if;
  insert into public.gk_visitas (dia, visitante) values (v_dia, p_visitante)
  on conflict (dia, visitante) do update set vistas = least(public.gk_visitas.vistas + 1, 500);
end $$;
grant execute on function public.gk_registrar_visita(uuid) to anon, authenticated;

-- Estadísticas (solo admin): hoy, ayer, últimos 30 días y totales
create or replace function public.gk_estadisticas_visitas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date; r jsonb;
begin
  if not public.gk_is_admin() then raise exception 'Solo el equipo de GaleríaK'; end if;
  select jsonb_build_object(
    'hoy_visitantes',   (select count(*) from gk_visitas where dia = v_hoy),
    'hoy_vistas',       (select coalesce(sum(vistas), 0) from gk_visitas where dia = v_hoy),
    'ayer_visitantes',  (select count(*) from gk_visitas where dia = v_hoy - 1),
    'semana_visitantes',(select count(distinct visitante) from gk_visitas where dia > v_hoy - 7),
    'mes_visitantes',   (select count(distinct visitante) from gk_visitas where dia > v_hoy - 30),
    'total_visitantes', (select count(distinct visitante) from gk_visitas),
    'total_visitas',    (select count(*) from gk_visitas),
    'total_vistas',     (select coalesce(sum(vistas), 0) from gk_visitas),
    'desde',            (select min(dia) from gk_visitas),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'visitantes', n, 'vistas', v) order by d)
                        from (select g.d::date as d,
                                     (select count(*) from gk_visitas x where x.dia = g.d::date) as n,
                                     (select coalesce(sum(vistas), 0) from gk_visitas x where x.dia = g.d::date) as v
                                from generate_series(v_hoy - 29, v_hoy, interval '1 day') g(d)) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.gk_estadisticas_visitas() from public, anon;
grant execute on function public.gk_estadisticas_visitas() to authenticated;

-- Comprueba (como admin desde el sitio): 관리자 → 📊 방문자

-- ================================================================
-- ===== 2026-11-09-miembros.sql
-- ================================================================
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

-- ================================================================
-- ===== 2026-11-09-apodo-admin.sql
-- ================================================================
-- GaleríaK · Cambiar el apodo visible de la cuenta administradora (2026-11-09)
-- showsong117 → Administrador (운영자). Solo cambia el apodo; la cuenta, el correo y el rol admin siguen igual.
update public.profiles
   set nickname = 'Administrador'
 where nickname = 'showsong117' and role = 'admin'
   and not exists (select 1 from public.profiles where nickname = 'Administrador');

-- Comprueba: debe aparecer «Administrador | admin»
select nickname, role from public.profiles where role = 'admin';

-- ================================================================
-- ===== 2026-11-09-moderacion-ia.sql
-- ================================================================
-- GaleríaK · Revisión automática con IA (OpenAI Moderation, gratis) (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Solo agrega cosas nuevas; no cambia posts, comments ni otras tablas existentes.
-- Requiere: 2026-11-08-mensajes-niveles.sql (gk_is_admin, mensajes).
--
--  · gk_moderacion: una fila por cada publicación/comentario revisado por el bot (scripts/moderar.mjs)
--      nivel  'ok'      → sin problemas (estado 'auto')
--             'revisar' → se ve, pero queda en la cola 🤖 AI 검수 del panel
--             'ocultar' → el bot lo ocultó; el equipo decide (restaurar / mantener oculto / eliminar)
--  · El bot escribe con la llave de servicio (GitHub Actions). El administrador lee y resuelve desde el sitio.
--  · Cuando el bot oculta algo, el autor recibe un mensaje automático en su bandeja ✉️.

create table if not exists public.gk_moderacion (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('post', 'comment')),
  item_id bigint not null,
  post_id bigint,
  autor uuid,
  nivel text not null check (nivel in ('ok', 'revisar', 'ocultar')),
  motivos text[] not null default '{}',
  puntajes jsonb,
  extracto text check (extracto is null or char_length(extracto) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'auto', 'restaurado', 'confirmado', 'eliminado')),
  created_at timestamptz not null default now(),
  resuelto_por uuid,
  resuelto_at timestamptz,
  unique (tipo, item_id)
);
create index if not exists gk_moderacion_cola_idx on public.gk_moderacion (estado, created_at desc) where nivel <> 'ok';
create index if not exists gk_moderacion_fecha_idx on public.gk_moderacion (created_at desc);

alter table public.gk_moderacion enable row level security;
revoke all on public.gk_moderacion from anon;
grant select, update on public.gk_moderacion to authenticated;
drop policy if exists gk_moderacion_leer on public.gk_moderacion;
create policy gk_moderacion_leer on public.gk_moderacion for select to authenticated using (public.gk_is_admin());
drop policy if exists gk_moderacion_resolver on public.gk_moderacion;
create policy gk_moderacion_resolver on public.gk_moderacion for update to authenticated
  using (public.gk_is_admin()) with check (public.gk_is_admin());
-- sin política de insert: solo el bot (llave de servicio) agrega filas

-- Aviso automático al autor cuando el bot oculta su publicación o comentario.
create or replace function public.gk_moderacion_avisar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin uuid; v_que text; v_txt text;
begin
  if new.nivel <> 'ocultar' or new.autor is null then return new; end if;
  select id into v_admin from public.profiles where role = 'admin' order by id limit 1;
  if v_admin is null then return new; end if;
  v_que := case new.tipo when 'post' then 'publicación' else 'comentario' end;
  v_txt := 'Hola. Nuestro sistema de revisión automática ocultó temporalmente tu ' || v_que
        || ' porque podría no cumplir las reglas de la comunidad.' || chr(10) || chr(10)
        || 'Un administrador lo revisará pronto. Si todo está bien, volverá a ser visible.' || chr(10)
        || case when new.extracto is not null then chr(10) || 'Extracto: "' || left(new.extracto, 150) || '"' || chr(10) else '' end
        || chr(10) || 'Reglas: https://galeriakmx.com/terminos/ . Si crees que es un error, responde a este mensaje.';
  begin
    insert into public.mensajes (hilo, usuario, autor, de_admin, asunto, cuerpo, leido_usuario, leido_admin)
    values (null, new.autor, v_admin, true,
            case new.tipo when 'post' then 'Tu publicación está en revisión' else 'Tu comentario está en revisión' end,
            left(v_txt, 2000), false, true);
  exception when others then null;  -- el aviso nunca debe impedir que se guarde la revisión
  end;
  return new;
end $$;
drop trigger if exists gk_moderacion_avisar on public.gk_moderacion;
create trigger gk_moderacion_avisar after insert on public.gk_moderacion
  for each row execute function public.gk_moderacion_avisar();

-- Listo. Comprueba: supabase/verificar.sql (fila 15) o en el sitio: 관리자 › 🩺 점검.

-- ================================================================
-- ===== 2026-11-09-memes.sql
-- ================================================================
-- GaleríaK · Galería de memes (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- 1) Registra la galería 'memes' en public.galleries (misma lógica que 2026-11-08-galerias-faltantes.sql).
-- 2) Si la galería ya existía con el nombre anterior (Memes K-Pop y K-Drama), actualiza nombre y descripción.
-- 3) Publica temas originales del equipo: humor general en 'memes' y los de fans en 'kpop-general', 'skincare' y 'kdramas'.

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
    ('memes', 'Memes', 'Humor del día a día: memes originales o con su fuente', 'comunidad')
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

-- Si la galería ya se registró con el nombre anterior, actualizar nombre/descripción (solo columnas que existan)
do $gk2$
declare keycol text := coalesce((select a.attname from pg_constraint c join pg_attribute a on a.attrelid = c.confrelid and a.attnum = c.confkey[1]
                                  where c.conname = 'posts_gallery_id_fkey' limit 1), 'id');
        col text;
begin
  if to_regclass('public.galleries') is null then return; end if;
  foreach col in array array['name','title','nombre'] loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='galleries' and column_name=col) then
      execute format('update public.galleries set %I = %L where %I::text = %L', col, 'Memes', keycol, 'memes');
    end if;
  end loop;
  foreach col in array array['description','descripcion','desc'] loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='galleries' and column_name=col) then
      execute format('update public.galleries set %I = %L where %I::text = %L', col, 'Humor del día a día: memes originales o con su fuente', keycol, 'memes');
    end if;
  end loop;
end
$gk2$;

insert into public.posts (gallery_id, author_id, title, body)
select v.gallery_id, a.id, v.title, v.body
  from (values
  ('memes', 'Bienvenidos a Memes 😂 Lee esto antes de publicar', '¡Por fin un lugar para reírnos un rato!

Tres reglas cortas:
1. Lo mejor son los memes hechos por ti: plantillas en blanco, tus fotos o solo texto.
2. Si viste uno buenísimo en Reddit, TikTok o Instagram, comparte el enlace original y menciona a quien lo hizo. No lo descargues y lo vuelvas a subir.
3. Búrlate de las situaciones, no de las personas: nada de montajes sexuales, deepfakes ni burlas por físico u origen.

Los memes de K-Pop van en la galería de K-Pop y los de K-Dramas en K-Dramas. Los memes con más ♥ suben a Mejores de hoy.'),
  ('memes', 'Traductor oficial de frases mexicanas', '- "Ya voy" = todavía no me baño.
- "Ahorita" = entre 5 minutos y nunca.
- "Nomás voy a ver" = voy a comprar.
- "Llego en 10" = ni he salido.
- "Échale ganas" = no tengo idea de cómo ayudarte, pero te quiero.
- "Al ratito te marco" = te mando audio de 4 minutos mañana.

¿Cuál falta? Agrega tu traducción en los comentarios 👇'),
  ('memes', 'El lunes: expectativa vs. realidad', 'Expectativa: me levanto temprano, hago ejercicio, desayuno sano, empiezo la semana con todo.

Realidad: pospuse la alarma 6 veces, desayuné un pan parado en la cocina y a las 11 a.m. ya pregunté cuánto falta para el viernes.

Cuéntanos tu lunes en una frase.'),
  ('memes', 'Reto de la semana: haz tu propio meme', 'Tema de esta semana: "Cuando llega la quincena… y ya está gastada".

Cómo participar:
- Haz tu meme con una plantilla en blanco, una foto tuya o solo texto.
- Publícalo en esta galería con el título [Reto] y tu idea.
- El meme con más ♥ el domingo gana un lugar fijo en la portada durante una semana.

Recuerda: nada de fotos de otras personas sin permiso.'),
  ('kpop-general', 'Cosas que solo entiende una fan de K-Pop en México', '- Poner alarma a las 3:00 a.m. para el comeback y despertar a toda la casa con el grito.
- Calcular la diferencia de horario con Corea más rápido que cualquier examen de matemáticas.
- Ahorrar para el concierto comiendo "solo un taquito" durante tres meses.
- Que tu mamá ya se sepa el nombre de tu bias.
- Fila de 14 horas para el concierto y aun así decir "valió totalmente la pena".
- Tener más fotocards que dinero en la cuenta.

¿Cuál te faltó? Agrega la tuya en los comentarios 👇'),
  ('skincare', 'Rutina de skincare coreana: expectativa vs. realidad', 'Expectativa: 10 pasos, música relajante, piel de cristal, me siento protagonista de K-drama.

Realidad:
Paso 1: limpiador en aceite ✅
Paso 2: limpiador en espuma ✅
Paso 3: tónico… (me acuerdo de que mañana trabajo temprano)
Paso 4: me quedé dormida con la mascarilla de tela puesta.

Bonus: comprar el sérum nuevo antes de terminar los otros cuatro que tengo abiertos.

Cuéntanos tu versión real (y si quieres la rutina en serio: /guias/rutina-skincare-coreana/)'),
  ('kdramas', 'Bingo de K-Drama: ¿cuántas casillas marcó tu último drama?', 'Marca las que salieron en el último drama que viste:

🟨 Choque en la calle y se le caen todos los papeles
🟨 Agarrón de muñeca dramático
🟨 Camión que aparece de la nada
🟨 Ella borracha, él la carga en la espalda
🟨 Abuela millonaria que ofrece un sobre con dinero para que se aleje
🟨 Flashback de cuando eran niños y ya se conocían
🟨 Beso en cámara lenta con canción de OST
🟨 Enfermedad misteriosa en el episodio 14
🟨 Alguien escuchando detrás de la puerta

5 o más: BINGO. Di qué drama era en los comentarios (sin spoilers del final).'),
  ('kdramas', 'Describe mal tu K-Drama favorito en una sola frase', 'Ejemplo: "Señor muy guapo se pelea con una puerta durante 16 episodios".

Escribe tu descripción mal hecha en los comentarios y los demás tienen que adivinar qué drama es. Prohibido decir el nombre hasta que alguien adivine 🤫')
  ) as v(gallery_id, title, body)
  cross join lateral (select id from public.profiles where role = 'admin' order by id limit 1) a
 where not exists (select 1 from public.posts p where p.title = v.title and coalesce(p.is_deleted, false) = false);

-- Si ya habías ejecutado la versión anterior, los 4 temas de fans que estaban en 'memes' se mueven a su galería:
-- y la bienvenida y el reto anteriores (que hablaban de K-Pop) se retiran porque ya hay versiones nuevas de humor general.
update public.posts set is_deleted = true
 where gallery_id = 'memes' and coalesce(is_deleted, false) = false
   and title in ('Bienvenidos a Memes K-Pop y K-Drama 😂 Lee esto antes de publicar', 'Reto de la semana: haz tu propio meme de fan');
update public.posts set gallery_id = 'kpop-general' where gallery_id = 'memes' and title = 'Cosas que solo entiende una fan de K-Pop en México';
update public.posts set gallery_id = 'skincare' where gallery_id = 'memes' and title = 'Rutina de skincare coreana: expectativa vs. realidad';
update public.posts set gallery_id = 'kdramas' where gallery_id = 'memes' and title in ('Bingo de K-Drama: ¿cuántas casillas marcó tu último drama?', 'Describe mal tu K-Drama favorito en una sola frase');

-- Comprueba: select title from public.posts where gallery_id = 'memes' order by id;

-- ================================================================
-- ===== 2026-11-09-anonimo.sql
-- ================================================================
-- GaleríaK · Comentarios solo para miembros + galería Anónimo (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- 1) Comentarios: solo cuentas con sesión, a su propio nombre y sin suspensión (la lectura de publicaciones sigue abierta a todos).
-- 2) Registra la galería 'anonimo' en public.galleries.
-- 3) Anónimo: publicar desde Lv.1 (30 puntos), máximo 5 al día, sin fotos.
-- 4) Publica las reglas como aviso fijo del administrador.

-- 1) Comentarios solo para miembros (política restrictiva: se suma a las que ya existen)
drop policy if exists gk_cmt_solo_miembros on public.comments;
create policy gk_cmt_solo_miembros on public.comments as restrictive for insert to public
  with check (
    auth.uid() is not null
    and author_id = auth.uid()
    and not exists (select 1 from public.profiles where id = auth.uid() and banned_until is not null and banned_until > now())
  );

-- 2) Galería
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
    ('anonimo', 'Anónimo', 'Cuenta lo que quieras sin mostrar tu apodo (con reglas)', 'comunidad')
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

-- 3) Quién puede publicar en Anónimo
create or replace function public.gk_puede_anonimo()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v record; v_hoy integer;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and banned_until is not null and banned_until > now()) then
    return false;
  end if;
  if public.gk_is_admin() then return true; end if;
  select count(*) into v_hoy from public.posts
   where author_id = auth.uid() and gallery_id = 'anonimo' and created_at > now() - interval '1 day';
  if v_hoy >= 5 then return false; end if;
  select * into v from public.gk_niveles(array[auth.uid()]);
  return coalesce(v.puntos, 0) >= 30;
end $$;
grant execute on function public.gk_puede_anonimo() to authenticated;

drop policy if exists gk_anonimo_publicar on public.posts;
create policy gk_anonimo_publicar on public.posts as restrictive for insert to public
  with check (
    gallery_id is distinct from 'anonimo'
    or (public.gk_puede_anonimo() and position('[foto:' in coalesce(body, '')) = 0)
  );

-- 4) Reglas como aviso fijo (no se duplica si ya existe)
insert into public.posts (gallery_id, author_id, title, body, is_pinned)
select 'anonimo', a.id, v.title, v.body, true
  from (values ('📌 Reglas de la galería Anónimo', $txt$📌 Reglas de la galería Anónimo — léelas antes de publicar

Aquí puedes contar algo, pedir un consejo o desahogarte sin que se vea tu apodo. Anónimo no quiere decir sin reglas: todas las reglas de GaleríaK siguen aplicando.

¿Qué tan anónimo es?
- Los demás usuarios ven "Anónimo" en lugar de tu apodo y tu nivel, en tus publicaciones y en tus comentarios de esta galería.
- El equipo de moderación sí puede ver qué cuenta publicó cada cosa. Lo usamos solo para atender reportes y proteger a la comunidad.
- Para cuidar tu anonimato, esta galería es solo de texto: no se pueden subir fotos.

Quién puede participar
- Leer: todo el mundo.
- Publicar: cuentas desde Lv.1 (30 puntos), máximo 5 publicaciones al día.
- Comentar: cualquier persona con cuenta.

Está prohibido
1. Revelar datos personales tuyos o de otras personas: nombre real, escuela, trabajo, dirección, teléfono, cuentas de redes o fotos.
2. "Exponer", acusar o difundir chismes sobre personas reales que se puedan identificar, incluidos idols, actores y cuentas de fans (rumores de pareja, supuestos escándalos, etc.).
3. Insultos, acoso, amenazas, discurso de odio y burlas por físico, origen, religión u orientación.
4. Contenido sexual de cualquier tipo. GaleríaK es para mayores de 13 años.
5. Spam, ventas, enlaces de referidos o publicidad.
6. Usar el anonimato para hacerte pasar por otra persona o por el equipo de GaleríaK.

Si estás pasando por un momento difícil
Puedes escribir aquí, y también te pedimos que hables con alguien de confianza. En México, la Línea de la Vida atiende gratis las 24 horas: 800 911 2000. En una emergencia, llama al 911.

Qué pasa si se rompen las reglas
Reporta con 🚩 cualquier cosa que no siga estas reglas. Las publicaciones que las rompan se ocultan y la cuenta puede recibir una precaución, una advertencia o una suspensión, igual que en el resto del sitio. Quien abuse del anonimato pierde el acceso a esta galería.

Gracias por cuidar este espacio. 감사합니다.$txt$)) as v(title, body)
  cross join lateral (select id from public.profiles where role = 'admin' order by (nickname = 'Administrador') desc, id limit 1) a
 where not exists (select 1 from public.posts p where p.title = v.title and coalesce(p.is_deleted, false) = false);

-- Comprueba:
-- select policyname from pg_policies where policyname in ('gk_cmt_solo_miembros','gk_anonimo_publicar');
-- select id, title, is_pinned from public.posts where gallery_id = 'anonimo';
