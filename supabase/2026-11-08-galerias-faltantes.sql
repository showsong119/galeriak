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
    ('memes', 'Memes K-Pop y K-Drama', 'Humor de fandom: memes originales o con su fuente', 'comunidad'),
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
