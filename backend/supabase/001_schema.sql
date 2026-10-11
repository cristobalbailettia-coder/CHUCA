-- AIDER · esquema compartido entre la app móvil y el dashboard.

create table public.communities (
  id   text primary key,
  name text not null,
  lat  double precision,
  lng  double precision
);

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  name         text not null,
  role         text not null check (role in ('vigilante', 'admin')),
  community_id text references public.communities(id)
);

create table public.patrols (
  id           uuid primary key,
  user_id      uuid not null references public.profiles(id),
  community_id text not null references public.communities(id),
  started_at   timestamptz not null,
  ended_at     timestamptz,
  distance_m   double precision not null default 0,
  created_at   timestamptz not null default now()
);

create table public.track_points (
  id        bigint generated always as identity primary key,
  patrol_id uuid not null references public.patrols(id) on delete cascade,
  lat       double precision not null,
  lng       double precision not null,
  accuracy  double precision,
  ts        timestamptz not null,
  unique (patrol_id, ts)
);

create table public.evidences (
  id         uuid primary key,
  patrol_id  uuid not null references public.patrols(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  type       text not null check (type in ('photo', 'audio', 'note', 'sos')),
  category   text,
  text       text,
  lat        double precision,
  lng        double precision,
  ts         timestamptz not null,
  media_path text,
  mime_type  text,
  created_at timestamptz not null default now()
);

create index on public.patrols (user_id);
create index on public.patrols (community_id);
create index on public.evidences (patrol_id);
create index on public.evidences (user_id);
create index on public.track_points (patrol_id);

-- Rol del usuario actual (security definer para evitar recursión en las políticas).
create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.communities  enable row level security;
alter table public.profiles     enable row level security;
alter table public.patrols      enable row level security;
alter table public.track_points enable row level security;
alter table public.evidences    enable row level security;

create policy communities_read on public.communities for select to authenticated using (true);

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy patrols_read on public.patrols for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy patrols_insert on public.patrols for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy patrols_update on public.patrols for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy points_read on public.track_points for select to authenticated
  using (public.is_admin() or exists (select 1 from public.patrols p where p.id = patrol_id and p.user_id = (select auth.uid())));
create policy points_insert on public.track_points for insert to authenticated
  with check (exists (select 1 from public.patrols p where p.id = patrol_id and p.user_id = (select auth.uid())));

create policy evidences_read on public.evidences for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy evidences_insert on public.evidences for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.patrols p where p.id = patrol_id and p.user_id = (select auth.uid())));
create policy evidences_update on public.evidences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy evidences_delete on public.evidences for delete to authenticated
  using (user_id = (select auth.uid()));

-- Fotos y audios: bucket privado, cada vigilante escribe en la carpeta con su id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidences', 'evidences', false, 15728640, array['image/jpeg', 'image/png', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'video/webm'])
on conflict (id) do nothing;

create policy evidences_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidences' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidences_files_update on storage.objects for update to authenticated
  using (bucket_id = 'evidences' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidences_files_read on storage.objects for select to authenticated
  using (bucket_id = 'evidences' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

insert into public.communities (id, name, lat, lng) values
  ('yanta', 'Yanta', -4.68, -79.62),
  ('segunda-y-cajas', 'Segunda y Cajas', -5.2, -79.5),
  ('samanga', 'Samanga', -4.9, -79.75),
  ('comunidad-demo', 'Comunidad Demo (app móvil)', -4.65, -79.7);
