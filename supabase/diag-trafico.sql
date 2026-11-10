-- Solo lectura, cifras agregadas (sin datos personales)
select json_build_object(
 'visitantes_por_dia', (select json_agg(json_build_object('dia', dia, 'v', n) order by dia) from (select dia, count(*) n from gk_visitas group by dia) d),
 'vistas_por_dia', (select json_agg(json_build_object('dia', dia, 'p', s) order by dia) from (select dia, sum(vistas) s from gk_visitas group by dia) d),
 'visitantes_unicos_total', (select count(distinct visitante) from gk_visitas),
 'cuentas', (select count(*) from auth.users),
 'publicaciones_no_admin', (select count(*) from posts p join profiles r on r.id = p.author_id where coalesce(r.role,'') <> 'admin' and not p.is_deleted),
 'publicaciones_total', (select count(*) from posts where not is_deleted),
 'comentarios_total', (select count(*) from comments where not is_deleted),
 'examen_visitantes', (select count(distinct visitante) from gk_visitas_pagina where pagina='examen')
) as datos;
