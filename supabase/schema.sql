-- GaleríaK · esquema de base de datos (Supabase / Postgres)
-- Se aplica automáticamente con el workflow "db" (GitHub Actions) cada vez que cambia este archivo.
-- Es idempotente: se puede ejecutar varias veces sin romper nada.

-- ---------- Administradores ----------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- ---------- Perfiles (1 por cuenta de Google) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 20),
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
  nick text;
  n int := 0;
begin
  base := regexp_replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'fan'), '[^A-Za-z0-9_áéíóúñÁÉÍÓÚÑ]', '', 'g');
  base := left(nullif(base, ''), 14);
  if base is null or char_length(base) < 2 then base := 'fan'; end if;
  nick := base;
  while exists (select 1 from public.profiles where nickname = nick) loop
    n := n + 1;
    nick := base || n::text;
  end loop;
  insert into public.profiles (id, nickname, avatar_url)
  values (new.id, nick, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Publicaciones ----------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  gallery text not null check (gallery ~ '^[a-z0-9-]{2,40}$'),
  title text not null check (char_length(title) between 4 and 120),
  body text not null default '' check (char_length(body) <= 5000),
  author_id uuid references public.profiles(id) on delete set null,
  author_label text,                       -- p. ej. 'Bot de ofertas' para publicaciones automáticas
  src text,                                -- fuente (galería de productos de idols)
  pinned boolean not null default false,
  hidden boolean not null default false,
  is_auto boolean not null default false,  -- publicada por el bot de ofertas
  -- Campos de oferta (solo galería 'ofertas')
  deal_price numeric(10,2),
  deal_list_price numeric(10,2),
  deal_store text,
  deal_url text,
  deal_asin text,
  deal_price_at timestamptz,               -- cuándo se verificó el precio
  deal_expires_at timestamptz,             -- después de esto el precio ya no se muestra
  deal_sold boolean not null default false,
  deal_source text,                        -- de dónde salió la oferta (pa-api, curaduría)
  up int not null default 0,
  down int not null default 0,
  views int not null default 0,
  comment_count int not null default 0,
  reports int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_gallery_created on public.posts (gallery, created_at desc);
create index if not exists posts_created on public.posts (created_at desc);
create index if not exists posts_asin on public.posts (deal_asin) where deal_asin is not null;

-- ---------- Comentarios ----------
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 2 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post on public.comments (post_id, created_at);

-- ---------- Votos y reportes ----------
create table if not exists public.votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Contadores mantenidos por triggers
create or replace function public.tg_vote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.posts p set
    up = (select count(*) from public.votes v where v.post_id = p.id and v.value = 1),
    down = (select count(*) from public.votes v where v.post_id = p.id and v.value = -1)
  where p.id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists votes_count on public.votes;
create trigger votes_count after insert or update or delete on public.votes
  for each row execute function public.tg_vote_count();

create or replace function public.tg_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.posts p set comment_count =
    (select count(*) from public.comments c where c.post_id = p.id and not c.hidden)
  where p.id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or update or delete on public.comments
  for each row execute function public.tg_comment_count();

-- 3 reportes => se oculta hasta que un admin lo revise
create or replace function public.tg_report_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  select count(*) into c from public.reports where post_id = new.post_id;
  update public.posts set reports = c, hidden = (hidden or c >= 3) where id = new.post_id;
  return null;
end $$;
drop trigger if exists reports_count on public.reports;
create trigger reports_count after insert on public.reports
  for each row execute function public.tg_report_count();

-- Vistas: función pública que solo suma 1
create or replace function public.increment_views(pid bigint) returns void
language sql security definer set search_path = public as $$
  update public.posts set views = views + 1 where id = pid and not hidden;
$$;
grant execute on function public.increment_views(bigint) to anon, authenticated;

-- Cualquier usuario puede marcar una oferta como agotada
create or replace function public.mark_sold(pid bigint) returns void
language sql security definer set search_path = public as $$
  update public.posts set deal_sold = true where id = pid and gallery = 'ofertas' and auth.uid() is not null;
$$;
grant execute on function public.mark_sold(bigint) to authenticated;

-- Evitar que un usuario cambie contadores o banderas de moderación en su propia publicación
create or replace function public.tg_posts_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare claims text := nullif(current_setting('request.jwt.claims', true), '');
begin
  -- Cambios hechos por otros triggers (contadores), por SQL directo, por el bot o por un admin: se permiten
  if pg_trigger_depth() > 1 or claims is null or (claims::jsonb ->> 'role') = 'service_role' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.pinned := false; new.hidden := false; new.is_auto := false; new.author_label := null;
    new.up := 0; new.down := 0; new.views := 0; new.comment_count := 0; new.reports := 0;
    new.deal_source := 'usuario'; new.deal_price_at := now();
    new.deal_expires_at := now() + interval '7 days';
    new.created_at := now();
  else
    new.author_id := old.author_id; new.pinned := old.pinned; new.hidden := old.hidden;
    new.is_auto := old.is_auto; new.author_label := old.author_label;
    new.up := old.up; new.down := old.down; new.views := old.views;
    new.comment_count := old.comment_count; new.reports := old.reports;
    new.created_at := old.created_at; new.gallery := old.gallery;
  end if;
  return new;
end $$;
drop trigger if exists posts_guard on public.posts;
create trigger posts_guard before insert or update on public.posts
  for each row execute function public.tg_posts_guard();

-- ---------- Seguridad a nivel de fila (RLS) ----------
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (not hidden or author_id = auth.uid() or public.is_admin());
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update using (author_id = auth.uid() or public.is_admin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (not hidden or public.is_admin());
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (author_id = auth.uid() or public.is_admin());
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update using (public.is_admin());

drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select using (user_id = auth.uid());
drop policy if exists votes_insert on public.votes;
create policy votes_insert on public.votes for insert to authenticated with check (user_id = auth.uid());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (user_id = auth.uid());
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select using (user_id = auth.uid() or public.is_admin());
