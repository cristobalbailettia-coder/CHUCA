# Backend AIDER (Supabase)

Proyecto Supabase `aider-vigilancia` (región sa-east-1). El esquema completo está en
`supabase/001_schema.sql`: tablas `communities`, `profiles`, `patrols`, `track_points`, `evidences`,
bucket privado `evidences` para fotos y audios, y políticas RLS:

- Un vigilante solo crea y ve lo suyo.
- El rol `admin` (equipo AIDER) ve todo.

Los usuarios viven en Supabase Auth con el correo `<usuario>@aider.example` (la app pide solo "usuario").
Para crear otro vigilante: crear el usuario en Auth y una fila en `profiles` con su rol y `community_id`.
