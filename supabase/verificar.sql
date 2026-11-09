-- GaleríaK · Verificación: ¿qué funciones ya están activadas en la base de datos?
-- Supabase → SQL Editor → New query → pegar → Run. Solo lee; no cambia nada.
-- Cada fila dice ✅ (listo) o ❌ (falta) y qué archivo ejecutar.
with c(orden, revision, ok, archivo) as (values
  (1, 'Administrador (gk_is_admin)',           to_regprocedure('public.gk_is_admin()') is not null,                        '2026-11-08-mensajes-niveles.sql'),
  (2, 'Mensajes al equipo (tabla mensajes)',   to_regclass('public.mensajes') is not null,                                 '2026-11-08-mensajes-niveles.sql'),
  (3, 'Puntos con asistencia (gk_niveles v2)', coalesce((select pg_get_function_result(p.oid) like '%asistencias%'
                                                          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                                         where n.nspname = 'public' and p.proname = 'gk_niveles' limit 1), false),
                                                                                                                             '2026-11-08-asistencia-niveles-managers.sql'),
  (4, 'Managers (tabla gk_managers)',          to_regclass('public.gk_managers') is not null,                              '2026-11-08-asistencia-niveles-managers.sql'),
  (5, 'Ocultar como manager',                  to_regprocedure('public.gk_manager_ocultar(text,bigint,boolean)') is not null, '2026-11-08-asistencia-niveles-managers.sql'),
  (6, 'Fotos: bucket post-images',             exists (select 1 from storage.buckets where id = 'post-images'),            '2026-11-08-fotos.sql'),
  (7, 'Fotos: regla Lv.2 (gk_puede_fotos)',    to_regprocedure('public.gk_puede_fotos()') is not null,                     '2026-11-08-fotos.sql'),
  (8, 'Líder: columna gk_managers.rol',        exists (select 1 from information_schema.columns
                                                        where table_schema = 'public' and table_name = 'gk_managers' and column_name = 'rol'),
                                                                                                                             '2026-11-08-lideres-advertencias.sql'),
  (9, 'Advertencias (tabla gk_advertencias)',  to_regclass('public.gk_advertencias') is not null,                          '2026-11-08-lideres-advertencias.sql'),
  (10,'Comentarios pausados con advertencia',  exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'gk_cmt_no_advertidos'),
                                                                                                                             '2026-11-08-lideres-advertencias.sql'),
  (11,'Galerías nuevas registradas (kpop-general, asistencia)', to_regclass('public.galleries') is null or (select count(*) = 2 from public.galleries g where to_jsonb(g) ->> coalesce((select a.attname from pg_constraint c join pg_attribute a on a.attrelid = c.confrelid and a.attnum = c.confkey[1] where c.conname = 'posts_gallery_id_fkey' limit 1), 'id') in ('kpop-general', 'asistencia')),
                                                                                                                             '2026-11-08-galerias-faltantes.sql'),
  (12,'Al menos 1 administrador',              exists (select 1 from public.profiles where role = 'admin'),                '5장 SQL: 관리자 추가'),
  (13,'Contador de visitas (gk_visitas)',      to_regprocedure('public.gk_estadisticas_visitas()') is not null,            '2026-11-09-visitas.sql'),
  (14,'Gestión de miembros (gk_sanciones)',     to_regprocedure('public.gk_admin_miembros()') is not null,                    '2026-11-09-miembros.sql'),
  (15,'Revisión automática IA (gk_moderacion)', to_regclass('public.gk_moderacion') is not null,                             '2026-11-09-moderacion-ia.sql'),
  (16,'Anónimo + comentarios solo miembros',   to_regprocedure('public.gk_puede_anonimo()') is not null
                                                and exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'gk_cmt_solo_miembros'),
                                                                                                                             '2026-11-09-anonimo.sql'),
  (17,'Visitas del examen aparte',           to_regclass('public.gk_visitas_pagina') is not null and to_regprocedure('public.gk_estadisticas_examen()') is not null,
                                                                                                                             '2026-11-10-visitas-examen.sql')
)
select orden as "#", revision as "Revisión", case when ok then '✅ listo' else '❌ falta' end as "Estado",
       case when ok then '' else archivo end as "Ejecutar"
  from c order by orden;
