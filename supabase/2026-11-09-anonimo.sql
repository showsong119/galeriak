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
