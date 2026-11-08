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
