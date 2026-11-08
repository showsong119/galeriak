-- GaleríaK · Contador de visitas anónimo (2026-11-09)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces sin problema.
-- Requiere gk_is_admin() (ya existe).
--
-- Cómo funciona: cada navegador guarda un identificador aleatorio (no es tu cuenta ni tu correo).
-- Al abrir el sitio se registra 1 visita por día y se suman las páginas vistas.
-- Solo el equipo (admin) puede ver las estadísticas. Nadie puede leer la tabla directamente.

create table if not exists public.gk_visitas (
  dia date not null,
  visitante uuid not null,
  vistas integer not null default 1,
  primera timestamptz not null default now(),
  primary key (dia, visitante)
);
alter table public.gk_visitas enable row level security;
-- sin políticas: nadie la lee ni la escribe directamente; solo con las funciones de abajo
revoke all on public.gk_visitas from anon, authenticated;

-- Registrar una visita (cualquiera, con o sin cuenta). Día según la Ciudad de México.
create or replace function public.gk_registrar_visita(p_visitante uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'America/Mexico_City')::date;
begin
  if p_visitante is null then return; end if;
  insert into public.gk_visitas (dia, visitante) values (v_dia, p_visitante)
  on conflict (dia, visitante) do update set vistas = least(public.gk_visitas.vistas + 1, 500);
end $$;
grant execute on function public.gk_registrar_visita(uuid) to anon, authenticated;

-- Estadísticas (solo admin): hoy, ayer, últimos 30 días y totales
create or replace function public.gk_estadisticas_visitas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date; r jsonb;
begin
  if not public.gk_is_admin() then raise exception 'Solo el equipo de GaleríaK'; end if;
  select jsonb_build_object(
    'hoy_visitantes',   (select count(*) from gk_visitas where dia = v_hoy),
    'hoy_vistas',       (select coalesce(sum(vistas), 0) from gk_visitas where dia = v_hoy),
    'ayer_visitantes',  (select count(*) from gk_visitas where dia = v_hoy - 1),
    'semana_visitantes',(select count(distinct visitante) from gk_visitas where dia > v_hoy - 7),
    'mes_visitantes',   (select count(distinct visitante) from gk_visitas where dia > v_hoy - 30),
    'total_visitantes', (select count(distinct visitante) from gk_visitas),
    'total_visitas',    (select count(*) from gk_visitas),
    'total_vistas',     (select coalesce(sum(vistas), 0) from gk_visitas),
    'desde',            (select min(dia) from gk_visitas),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'visitantes', n, 'vistas', v) order by d)
                        from (select g.d::date as d,
                                     (select count(*) from gk_visitas x where x.dia = g.d::date) as n,
                                     (select coalesce(sum(vistas), 0) from gk_visitas x where x.dia = g.d::date) as v
                                from generate_series(v_hoy - 29, v_hoy, interval '1 day') g(d)) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.gk_estadisticas_visitas() from public, anon;
grant execute on function public.gk_estadisticas_visitas() to authenticated;

-- Comprueba (como admin desde el sitio): 관리자 → 📊 방문자
