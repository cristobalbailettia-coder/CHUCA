# AIDER · Vigilancia Comunal

Dos aplicaciones independientes que comparten una base de datos en la nube (Supabase).

```
AIDER/
├─ mobile/      App del vigilante (PWA offline-first)   → http://localhost:5173
├─ dashboard/   Panel web del equipo AIDER              → http://localhost:5174
└─ backend/     Esquema SQL de la base compartida (Supabase)
```

## Cómo funciona
- La **app móvil** guarda todo en el teléfono (IndexedDB) y, cuando hay internet, lo sube a Supabase
  (recorrido, puntos GPS, notas, SOS, fotos y audios).
- El **dashboard** lee de Supabase y se actualiza solo cada 10 s.
- Ninguna de las dos depende de la otra ni de la PC de desarrollo.

## Desarrollo
```bash
cd mobile && npm install && npm run dev        # puerto 5173
cd dashboard && npm install && npm run dev     # puerto 5174
```
Cada proyecto lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` de su archivo `.env` (ver `.env.example`).

## Publicar (dos links)
```bash
cd mobile && npm run build        # genera mobile/dist
cd dashboard && npm run build     # genera dashboard/dist
```
Sube cada carpeta `dist` a un hosting estático (p. ej. https://app.netlify.com/drop). Cada una queda con su propio
link HTTPS. Las variables `VITE_*` se incrustan al compilar, así que compila con el `.env` correcto.

## App del custodio: acceso por PIN
Un teléfono por comunidad. Se entra con el PIN de 4 dígitos de la comunidad (como el de un celular) y luego se elige el nombre en la lista (padrón).

| PIN | Comunidad |
|---|---|
| 0601 | A · Santitos |
| 0602 | B · Algarrobo |
| 0603 | C · El Bosque |
| 1234 | Pruebas en vivo (jurado) |

El PIN se traduce a la cuenta de la comunidad en Supabase (`mobile/src/lib/auth.ts`, tabla `PIN_TO_ACCOUNT`) y se valida contra el servidor: sirve para demostración, no es seguridad fuerte.

## Cuentas del dashboard
| Usuario | Contraseña | Entra a |
|---|---|---|
| vigilante | vigilante123 | app móvil (Comunidad Demo, pruebas en vivo) |
| amotape | amotape123 | app móvil (Comunidad A · Cerros de Amotape) |
| tumbes | tumbes123 | app móvil (Comunidad B · Reserva Nacional de Tumbes) |
| angolo | angolo123 | app móvil (Comunidad C · Coto de Caza El Angolo) |
| admin | admin123 | dashboard |

Son cuentas de demostración. Antes de un uso real: cambiar las contraseñas y poner `SHOW_DEMO_HINT = false`
en `src/lib/auth.ts` de cada proyecto.
