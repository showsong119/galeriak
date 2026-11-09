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
