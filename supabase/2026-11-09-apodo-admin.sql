-- GaleríaK · Cambiar el apodo visible de la cuenta administradora (2026-11-09)
-- showsong117 → Administrador (운영자). Solo cambia el apodo; la cuenta, el correo y el rol admin siguen igual.
update public.profiles
   set nickname = 'Administrador'
 where nickname = 'showsong117' and role = 'admin'
   and not exists (select 1 from public.profiles where nickname = 'Administrador');

-- Comprueba: debe aparecer «Administrador | admin»
select nickname, role from public.profiles where role = 'admin';
