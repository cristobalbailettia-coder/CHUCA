-- App del custodio (diseño Stitch): un teléfono por comunidad.
-- Se entra con un código de 6 dígitos de la comunidad (cuenta tipo "device") y se elige el custodio de la lista.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('vigilante', 'admin', 'device'));

-- Quién hizo el recorrido (la cuenta del teléfono es el "dueño" técnico; el custodio es la persona elegida).
alter table public.patrols add column custodian_id uuid references public.profiles(id);

create function public.my_community() returns text
language sql security definer stable set search_path = public as $$
  select community_id from public.profiles where id = auth.uid()
$$;
revoke execute on function public.my_community() from public, anon;
grant execute on function public.my_community() to authenticated;

-- El teléfono de una comunidad puede ver la lista de custodios y los registros de SU comunidad.
create policy profiles_community_read on public.profiles for select to authenticated
  using (community_id is not null and community_id = public.my_community());
create policy patrols_community_read on public.patrols for select to authenticated
  using (community_id = public.my_community());
create policy evidences_community_read on public.evidences for select to authenticated
  using (exists (select 1 from public.patrols p where p.id = patrol_id and p.community_id = public.my_community()));

-- Un teléfono solo registra recorridos de su propia comunidad.
drop policy patrols_insert on public.patrols;
create policy patrols_insert on public.patrols for insert to authenticated
  with check (user_id = (select auth.uid()) and community_id = public.my_community());
