-- Dashboard v3 (diseño Stitch): edad y rol de brigada, historial de exportaciones.
alter table public.profiles add column age int, add column brigade_role text;

update public.profiles set
  age = 24 + abs(hashtext(username)) % 43,
  brigade_role = case
    when 24 + abs(hashtext(username)) % 43 < 35 then 'Brigadista Juvenil'
    when 24 + abs(hashtext(username)) % 43 > 50 then 'Guardabosque Mayor'
    when abs(hashtext(username)) % 2 = 0 then 'Monitora de Biodiversidad'
    else 'Custodio Comunal'
  end
where role = 'vigilante' and community_id <> 'comunidad-demo';
update public.profiles set brigade_role = 'Vigilante en pruebas' where community_id = 'comunidad-demo';

create table public.export_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references public.profiles(id),
  kind       text not null,
  scope      text,
  period     text,
  rows       int
);
alter table public.export_log enable row level security;
create policy export_log_read on public.export_log for select to authenticated using (public.is_admin());
create policy export_log_insert on public.export_log for insert to authenticated
  with check (public.is_admin() and user_id = (select auth.uid()));
