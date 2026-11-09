-- Diagnóstico (solo lectura, sin correos): cuentas recientes y si pueden publicar en asistencia
select json_agg(x) from (
  select to_char(u.created_at at time zone 'America/Mexico_City','MM-DD HH24:MI') creada,
         u.email_confirmed_at is not null confirmada,
         p.id is not null tiene_perfil, p.nickname, p.role, p.banned_until is not null baneada,
         g.usuario,
         (select count(*) from posts x where x.author_id = u.id and x.gallery_id = 'asistencia') asistencias
    from auth.users u left join profiles p on p.id = u.id left join gk_usuarios g on g.id = u.id
   order by u.created_at desc limit 6) x
union all
select json_agg(json_build_object('politica', policyname, 'tipo', permissive, 'cmd', cmd, 'check', left(coalesce(with_check, qual), 160)))
  from pg_policies where tablename = 'posts' and cmd in ('INSERT','ALL');
