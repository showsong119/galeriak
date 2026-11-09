-- GaleríaK · Visitas del examen de coreano contadas aparte (2026-11-10)
-- Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar varias veces.
-- Requiere 2026-11-09-visitas.sql (gk_is_admin y el contador general).
-- 'examen'     = abrió /examen-coreano/ (1 por navegador y día; también sigue contando en el total del sitio)
-- 'examen-fin' = terminó un examen y vio su resultado

create table if not exists public.gk_visitas_pagina (
  dia date not null,
  pagina text not null check (pagina in ('examen', 'examen-fin')),
  visitante uuid not null,
  vistas integer not null default 1,
  primera timestamptz not null default now(),
  primary key (dia, pagina, visitante)
);
alter table public.gk_visitas_pagina enable row level security;
revoke all on public.gk_visitas_pagina from anon, authenticated;

create or replace function public.gk_registrar_pagina(p_visitante uuid, p_pagina text)
returns void language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'America/Mexico_City')::date;
begin
  if p_visitante is null or p_pagina not in ('examen', 'examen-fin') then return; end if;
  insert into public.gk_visitas_pagina (dia, pagina, visitante) values (v_dia, p_pagina, p_visitante)
  on conflict (dia, pagina, visitante) do update set vistas = least(public.gk_visitas_pagina.vistas + 1, 200);
end $$;
grant execute on function public.gk_registrar_pagina(uuid, text) to anon, authenticated;

create or replace function public.gk_estadisticas_examen()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date; r jsonb;
begin
  if not public.gk_is_admin() then raise exception 'Solo el equipo de GaleríaK'; end if;
  with e as (select * from gk_visitas_pagina where pagina = 'examen'),
       f as (select * from gk_visitas_pagina where pagina = 'examen-fin')
  select jsonb_build_object(
    'hoy_visitantes',    (select count(*) from e where dia = v_hoy),
    'hoy_vistas',        (select coalesce(sum(vistas), 0) from e where dia = v_hoy),
    'ayer_visitantes',   (select count(*) from e where dia = v_hoy - 1),
    'semana_visitantes', (select count(distinct visitante) from e where dia > v_hoy - 7),
    'mes_visitantes',    (select count(distinct visitante) from e where dia > v_hoy - 30),
    'total_visitantes',  (select count(distinct visitante) from e),
    'total_vistas',      (select coalesce(sum(vistas), 0) from e),
    'hoy_terminados',    (select coalesce(sum(vistas), 0) from f where dia = v_hoy),
    'semana_terminados', (select coalesce(sum(vistas), 0) from f where dia > v_hoy - 7),
    'total_terminados',  (select coalesce(sum(vistas), 0) from f),
    'total_personas_terminaron', (select count(distinct visitante) from f),
    'desde',             (select min(dia) from e),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'visitantes', n, 'terminados', t) order by d)
                        from (select g.d::date as d,
                                     (select count(*) from e x where x.dia = g.d::date) as n,
                                     (select coalesce(sum(vistas), 0) from f x where x.dia = g.d::date) as t
                                from generate_series(v_hoy - 29, v_hoy, interval '1 day') g(d)) s), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.gk_estadisticas_examen() from public, anon;
grant execute on function public.gk_estadisticas_examen() to authenticated;

-- Comprueba: select public.gk_estadisticas_examen();  (como admin desde el sitio; en SQL Editor da error de admin, es normal)
