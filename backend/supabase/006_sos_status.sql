-- Estados de las alertas SOS (nuevo → en atención → resuelto) y retiro del historial de exportaciones.
alter table evidences
  add column if not exists sos_status text not null default 'nuevo' check (sos_status in ('nuevo','en_atencion','resuelto')),
  add column if not exists sos_note text,
  add column if not exists sos_updated_at timestamptz;
update evidences set sos_status = 'resuelto' where type = 'sos' and reviewed;
drop table if exists export_log;
