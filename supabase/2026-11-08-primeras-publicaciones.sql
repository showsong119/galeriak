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
