-- Dashboard v2: ficha de comunidad, DNI de vigilantes, SOS revisados y resumen por reporte.

alter table public.profiles    add column dni text;
alter table public.communities add column code text, add column nearby_reserve text, add column reports_since int, add column population int;
alter table public.evidences   add column reviewed boolean not null default false; -- relevante para SOS
alter table public.patrols     add column summary text;                            -- resumen (IA) del reporte

update public.communities set name = 'Santitos',  code = 'A', nearby_reserve = 'Parque Nacional Cerros de Amotape', reports_since = 2022, population = 1250 where id = 'amotape';
update public.communities set name = 'Algarrobo', code = 'B', nearby_reserve = 'Reserva Nacional de Tumbes',        reports_since = 2023, population = 640  where id = 'tumbes';
update public.communities set name = 'El Bosque', code = 'C', nearby_reserve = 'Coto de Caza El Angolo',             reports_since = 2025, population = 380  where id = 'angolo';
update public.communities set name = 'Pruebas en vivo', code = '–' where id = 'comunidad-demo';

-- El equipo AIDER puede marcar SOS como revisados.
create policy evidences_admin_update on public.evidences for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Un vigilante puede borrar sus propios archivos (limpieza / reenvíos).
create policy evidences_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidences' and (storage.foldername(name))[1] = (select auth.uid())::text);
