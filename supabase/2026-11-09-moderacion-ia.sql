-- GaleríaK · Revisión automática con IA (OpenAI Moderation, gratis) (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Solo agrega cosas nuevas; no cambia posts, comments ni otras tablas existentes.
-- Requiere: 2026-11-08-mensajes-niveles.sql (gk_is_admin, mensajes).
--
--  · gk_moderacion: una fila por cada publicación/comentario revisado por el bot (scripts/moderar.mjs)
--      nivel  'ok'      → sin problemas (estado 'auto')
--             'revisar' → se ve, pero queda en la cola 🤖 AI 검수 del panel
--             'ocultar' → el bot lo ocultó; el equipo decide (restaurar / mantener oculto / eliminar)
--  · El bot escribe con la llave de servicio (GitHub Actions). El administrador lee y resuelve desde el sitio.
--  · Cuando el bot oculta algo, el autor recibe un mensaje automático en su bandeja ✉️.

create table if not exists public.gk_moderacion (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('post', 'comment')),
  item_id bigint not null,
  post_id bigint,
  autor uuid,
  nivel text not null check (nivel in ('ok', 'revisar', 'ocultar')),
  motivos text[] not null default '{}',
  puntajes jsonb,
  extracto text check (extracto is null or char_length(extracto) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'auto', 'restaurado', 'confirmado', 'eliminado')),
  created_at timestamptz not null default now(),
  resuelto_por uuid,
  resuelto_at timestamptz,
  unique (tipo, item_id)
);
create index if not exists gk_moderacion_cola_idx on public.gk_moderacion (estado, created_at desc) where nivel <> 'ok';
create index if not exists gk_moderacion_fecha_idx on public.gk_moderacion (created_at desc);

alter table public.gk_moderacion enable row level security;
revoke all on public.gk_moderacion from anon;
grant select, update on public.gk_moderacion to authenticated;
drop policy if exists gk_moderacion_leer on public.gk_moderacion;
create policy gk_moderacion_leer on public.gk_moderacion for select to authenticated using (public.gk_is_admin());
drop policy if exists gk_moderacion_resolver on public.gk_moderacion;
create policy gk_moderacion_resolver on public.gk_moderacion for update to authenticated
  using (public.gk_is_admin()) with check (public.gk_is_admin());
-- sin política de insert: solo el bot (llave de servicio) agrega filas

-- Aviso automático al autor cuando el bot oculta su publicación o comentario.
create or replace function public.gk_moderacion_avisar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin uuid; v_que text; v_txt text;
begin
  if new.nivel <> 'ocultar' or new.autor is null then return new; end if;
  select id into v_admin from public.profiles where role = 'admin' order by id limit 1;
  if v_admin is null then return new; end if;
  v_que := case new.tipo when 'post' then 'publicación' else 'comentario' end;
  v_txt := 'Hola. Nuestro sistema de revisión automática ocultó temporalmente tu ' || v_que
        || ' porque podría no cumplir las reglas de la comunidad.' || chr(10) || chr(10)
        || 'Un administrador lo revisará pronto. Si todo está bien, volverá a ser visible.' || chr(10)
        || case when new.extracto is not null then chr(10) || 'Extracto: "' || left(new.extracto, 150) || '"' || chr(10) else '' end
        || chr(10) || 'Reglas: https://galeriakmx.com/terminos/ . Si crees que es un error, responde a este mensaje.';
  begin
    insert into public.mensajes (hilo, usuario, autor, de_admin, asunto, cuerpo, leido_usuario, leido_admin)
    values (null, new.autor, v_admin, true,
            case new.tipo when 'post' then 'Tu publicación está en revisión' else 'Tu comentario está en revisión' end,
            left(v_txt, 2000), false, true);
  exception when others then null;  -- el aviso nunca debe impedir que se guarde la revisión
  end;
  return new;
end $$;
drop trigger if exists gk_moderacion_avisar on public.gk_moderacion;
create trigger gk_moderacion_avisar after insert on public.gk_moderacion
  for each row execute function public.gk_moderacion_avisar();

-- Listo. Comprueba: supabase/verificar.sql (fila 15) o en el sitio: 관리자 › 🩺 점검.
