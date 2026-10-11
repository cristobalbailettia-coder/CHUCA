-- Código de recorrido (para el enlace /ruta/CÓDIGO) y datos clave generados por Gemini.
alter table public.patrols add column code text, add column key_data jsonb, add column summary_at timestamptz;

update public.patrols set code = 'R-' || upper(substr(md5(id::text), 1, 6)) where code is null;
create unique index patrols_code_key on public.patrols (code);
