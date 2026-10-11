-- Límite geográfico (polígono [lat, lng]) de cada comunidad: permite medir qué porcentaje del territorio se vigila.
alter table communities add column if not exists boundary jsonb;
-- Los polígonos de las comunidades A, B y C se calcularon a partir de las rutas de demostración (envolvente ampliada).
