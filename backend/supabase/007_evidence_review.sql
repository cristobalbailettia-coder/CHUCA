-- Revisión de evidencias por el equipo AIDER: aprobar, descartar o comentar cada foto, audio o nota.
alter table evidences
  add column if not exists review_status text not null default 'pendiente' check (review_status in ('pendiente','aprobada','descartada')),
  add column if not exists review_note text;
update evidences set review_status = 'aprobada' where reviewed and type <> 'sos';
