-- Diagnóstico: intenta publicar asistencia como la cuenta más nueva y lo deshace (no queda nada)
create or replace function pg_temp.probar() returns text language plpgsql as $$
declare uid uuid; r text;
begin
  select u.id into uid from auth.users u order by u.created_at desc limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  begin
    insert into public.posts (gallery_id, author_id, title, body) values ('asistencia', uid, '¡Presente! ✋', 'prueba');
    r := 'OK: se pudo insertar';
    raise exception 'deshacer';
  exception when others then
    if sqlerrm = 'deshacer' then r := coalesce(r, 'OK'); else r := 'ERROR ' || sqlstate || ': ' || sqlerrm; end if;
  end;
  reset role;
  return r;
end $$;
select pg_temp.probar() as resultado
union all
select string_agg(tgname || ' → ' || p.proname, ', ') from pg_trigger t join pg_proc p on p.oid = t.tgfoid
 where t.tgrelid = 'public.posts'::regclass and not t.tgisinternal;
