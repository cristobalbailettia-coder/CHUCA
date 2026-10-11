// Genera datos de ejemplo del año en curso (enero → mes actual) para las 3 comunidades del bosque seco.
// Entra como cada vigilante y sube por las mismas vías (y bajo las mismas políticas RLS) que la app real.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { mulberry32, scene, wav } from './art.mjs'

const env = Object.fromEntries(
  readFileSync(new URL('../../dashboard/.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const rng = mulberry32(20261010)
const rand = (a, b) => a + rng() * (b - a)
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const R_EARTH = 6371000
const haversine = (a, b) => {
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2
  return 2 * R_EARTH * Math.asin(Math.sqrt(h))
}
const offset = ([lat, lng], dxM, dyM) => [lat + dyM / 111320, lng + dxM / (111320 * Math.cos((lat * Math.PI) / 180))]

const SECTORS = [[-3000, 1500], [2500, 2500], [500, -3000], [-1500, -1000], [3200, -800], [-300, 1800]]

const users = (prefix, demo, n) => [[prefix, demo], ...Array.from({ length: n - 1 }, (_, i) => [`${prefix}${i + 2}`, `seed-${prefix}${i + 2}`])]

// Reportes (= recorridos) por mes, enero → octubre. Máximo 10 por comunidad y mes.
const AREAS = {
  amotape: {
    center: [-4.04, -80.52],
    users: users('amotape', 'amotape123', 9),
    monthly: [6, 5, 7, 8, 6, 9, 7, 10, 8, 2],
    sos: [[2, true], [6, true], [8, false], [9, false]], // [mes (0=ene), revisado]
    cats: { tala: 0.35, incendio: 0.15, pastoreo: 0.15, fauna: 0.35 },
    extra: {
      tala: ['Guayacán y hualtaco talados en la ladera, abrieron una trocha nueva.', 'Troncos de hualtaco listos para bajar por la quebrada.'],
      fauna: ['Loro cabeciazul en grupo, unos 12 individuos en el algarrobal.', 'Zorro costeño merodeando al atardecer cerca del puesto.', 'Oso hormiguero cruzando la trocha al amanecer.'],
      pastoreo: ['Vacas dentro del parque, entraron por el sector sur sin cerco.'],
      incendio: ['Quema de rastrojo en chacra vecina, el fuego se acerca al límite.'],
    },
  },
  tumbes: {
    center: [-3.92, -80.29],
    users: users('tumbes', 'tumbes123', 7),
    monthly: [3, 4, 5, 4, 6, 5, 7, 6, 8, 4],
    sos: [[1, true], [4, true], [7, false], [9, false]],
    cats: { tala: 0.3, incendio: 0.1, pastoreo: 0.15, fauna: 0.45 },
    extra: {
      tala: ['Ceibo derribado, la madera ya fue extraída por la trocha.', 'Extracción de leña de zapote, bultos escondidos entre el monte.'],
      fauna: ['Se oyó al mono coto aullando temprano, grupo de unos 6.', 'Tigrillo captado por la cámara trampa del sector norte.', 'Iguana grande en un ceibo, varias lagartijas en el sendero.', 'Pecaríes cruzando la quebrada seca, manada de 8.'],
      pastoreo: ['Ganado vacuno cerca de la poza, se rompió el alambre del límite.'],
      incendio: ['Humo cerca de la frontera, parece quema agrícola al otro lado del río.'],
    },
  },
  angolo: {
    center: [-4.3, -80.8],
    users: users('angolo', 'angolo123', 5),
    monthly: [2, 3, 2, 4, 3, 5, 4, 3, 6, 1],
    sos: [[3, true], [8, false]],
    cats: { tala: 0.25, incendio: 0.2, pastoreo: 0.3, fauna: 0.25 },
    extra: {
      tala: ['Carbón de algarrobo en sacos, listo para sacarlo del coto.', 'Hornos de carbón recién apagados en la quebrada, aún tibios.'],
      fauna: ['Tres venados machos en la loma, buen estado.', 'Disparo escuchado de madrugada, posible caza furtiva en el sector oeste.', 'Cóndor de la costa dando vueltas sobre el cerro.'],
      pastoreo: ['Rebaño de más de 60 chivos dentro del coto, el pastor se retiró al vernos.', 'Chivos ramoneando brotes de algarrobo joven, daño visible.'],
      incendio: ['Pasto muy seco y viento fuerte, riesgo alto de incendio en la loma.', 'Fogata mal apagada junto al camino, la apagamos con tierra.'],
    },
  },
}

const NOTES = {
  tala: [
    'Encontré tocones de hualtaco con corte reciente, unos 6 árboles.',
    'Troncos de algarrobo cortados y apilados al borde de la trocha.',
    'Se escuchó motosierra al fondo de la quebrada, no pude acercarme.',
    'Huellas de arrastre de madera hacia la carretera.',
    'Corte selectivo de palo santo, ramas y aserrín todavía frescos.',
  ],
  incendio: [
    'Humo en la ladera, parece quema para sembrar maíz.',
    'Foco de fuego pequeño junto al camino, lo apagamos entre dos.',
    'Rastrojo quemado, unas 2 hectáreas, el fuego ya se apagó.',
    'Columna de humo al otro lado de la quebrada, aviso a la jefatura.',
  ],
  pastoreo: [
    'Rebaño de unas 40 cabras dentro del área, sin pastor a la vista.',
    'Ganado vacuno bebiendo en la poza, entró por el cerco roto.',
    'Pastor con chivos cerca del límite, se le conversó y se retiró.',
    'Burros y cabras ramoneando brotes de algarrobo joven.',
  ],
  fauna: [
    'Avistamiento de venado cola blanca, una hembra con su cría.',
    'Huellas frescas de puma junto a la quebrada.',
    'Escuché a la pava aliblanca cerca del algarrobal, muy esquiva.',
    'Grupo de 5 sajinos cruzando el sendero.',
  ],
}
const PHOTO_CAPTION = {
  tala: ['Tocones recién cortados', 'Troncos apilados junto a la trocha', 'Madera de hualtaco lista para sacar'],
  incendio: ['Humo visto desde la loma', 'Zona quemada junto al camino'],
  pastoreo: ['Cabras dentro del área', 'Ganado en la poza'],
  fauna: ['Venado cola blanca', 'Ave en el algarrobo', 'Fauna en el sendero'],
  huellas: ['Huellas de felino en la quebrada', 'Huellas frescas junto a la poza'],
  paisaje: ['Algarrobal en buen estado', 'Quebrada seca, sin novedad'],
}
const AUDIO_CAPTION = ['Canto de ave cerca del algarrobal', 'Sonido ambiente y cigarras', 'Se oye algo moviéndose en el monte', null, null]
const ACTION = {
  tala: 'Se recomienda coordinar una inspección del sector con la jefatura del área.',
  incendio: 'Se recomienda reforzar la vigilancia y avisar a defensa civil por el riesgo de fuego.',
  pastoreo: 'Se recomienda reunirse con los pastores y reparar el cerco del sector.',
  fauna: 'Sin amenazas; se sugiere continuar el monitoreo de la fauna observada.',
}

const pickWeighted = (w) => {
  let r = rng()
  for (const [k, p] of Object.entries(w)) if ((r -= p) <= 0) return k
  return Object.keys(w)[0]
}

function buildTrack(base, startMs) {
  const R = rand(1500, 3500)
  const nWp = 4 + Math.floor(rng() * 4)
  const th0 = rand(0, Math.PI * 2)
  const wps = [base]
  for (let i = 0; i < nWp; i++) {
    const th = th0 + (i * 2 * Math.PI) / nWp + rand(-0.35, 0.35)
    wps.push(offset(base, Math.cos(th) * R * rand(0.4, 1), Math.sin(th) * R * rand(0.4, 1)))
  }
  wps.push(base)

  const M = (a, b) => [(b[1] - a[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180), (b[0] - a[0]) * 111320]
  const pts = []
  let t = startMs
  let pos = base
  let wx = 0
  let wy = 0
  let seg = 1
  let travelled = 0
  const amp = rand(30, 90)
  const lambda = rand(260, 520)
  const phase = rand(0, 6.28)
  const speed = rand(0.85, 1.2)
  pts.push({ pos, t, acc: rand(5, 14) })
  while (seg < wps.length) {
    const dt = rand(30, 55)
    const step = speed * dt
    const target = wps[seg]
    const d = haversine(pos, target)
    const [dx, dy] = M(pos, target)
    const len = Math.hypot(dx, dy) || 1
    if (d <= step + 5) {
      pos = target
      seg++
    } else {
      const f = step / d
      pos = [pos[0] + (target[0] - pos[0]) * f, pos[1] + (target[1] - pos[1]) * f]
    }
    travelled += step
    wx = wx * 0.9 + rand(-7, 7)
    wy = wy * 0.9 + rand(-7, 7)
    const lat = amp * Math.sin((2 * Math.PI * travelled) / lambda + phase)
    const shown = offset(pos, (-dy / len) * lat + wx + rand(-1.5, 1.5), (dx / len) * lat + wy + rand(-1.5, 1.5))
    t += dt * 1000
    pts.push({ pos: shown, t, acc: rand(4, 18) })
    if (pts.length > 900) break
  }
  let dist = 0
  for (let i = 1; i < pts.length; i++) dist += haversine(pts[i - 1].pos, pts[i].pos)
  return { pts, dist }
}

function startTime(year, month, day) {
  const morning = rng() < 0.7
  const localH = morning ? rand(5.5, 8.5) : rand(14.5, 16)
  return Date.UTC(year, month, day) + (localH + 5) * 3600_000 // Perú = UTC-5
}

function summarize(distM, startMs, endMs, rows) {
  const min = Math.round((endMs - startMs) / 60000)
  const notes = rows.filter((r) => r.type === 'note')
  const photos = rows.filter((r) => r.type === 'photo').length
  const audios = rows.filter((r) => r.type === 'audio').length
  const sos = rows.some((r) => r.type === 'sos')
  const cats = {}
  for (const n of notes) cats[n.category] = (cats[n.category] ?? 0) + 1
  const main = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fauna'
  const parts = [`Recorrido de ${Math.floor(min / 60)} h ${min % 60} min y ${(distM / 1000).toFixed(1)} km.`]
  parts.push(`Se registraron ${notes.length} nota${notes.length === 1 ? '' : 's'}, ${photos} foto${photos === 1 ? '' : 's'} y ${audios} audio${audios === 1 ? '' : 's'}.`)
  if (notes[0]) parts.push(`Lo más relevante: ${notes[0].text.charAt(0).toLowerCase()}${notes[0].text.slice(1)}`)
  if (sos) parts.push('Durante el recorrido se emitió una alerta SOS que requiere seguimiento.')
  parts.push(ACTION[main])
  return parts.join(' ')
}

async function must(p, what) {
  const { error } = await p
  if (error) throw new Error(`${what}: ${error.message}`)
}

async function removeAllFiles(sb, uid) {
  const { data: dirs } = await sb.storage.from('evidences').list(uid, { limit: 1000 })
  for (const d of dirs ?? []) {
    const { data: files } = await sb.storage.from('evidences').list(`${uid}/${d.name}`, { limit: 1000 })
    if (files?.length) await sb.storage.from('evidences').remove(files.map((f) => `${uid}/${d.name}/${f.name}`))
  }
}

async function main() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const cur = now.getUTCMonth()
  const lastDay = Math.max(1, now.getUTCDate() - 1)
  let nPatrols = 0
  let nEv = 0

  for (const [areaId, area] of Object.entries(AREAS)) {
    if (area.monthly.length !== cur + 1) throw new Error(`Los conteos mensuales de ${areaId} no coinciden con el mes actual`)

    // sesiones de todos los vigilantes del área
    const sessions = []
    for (const [username, password] of area.users) {
      const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY, { auth: { persistSession: false } })
      const { data, error } = await sb.auth.signInWithPassword({ email: `${username}@aider.example`, password })
      if (error) throw new Error(`login ${username}: ${error.message}`)
      await removeAllFiles(sb, data.user.id)
      sessions.push({ sb, uid: data.user.id, username })
    }

    for (let m = 0; m <= cur; m++) {
      const sosHere = area.sos.find(([sm]) => sm === m)
      for (let k = 0; k < area.monthly[m]; k++) {
        const s = pick(sessions)
        const day = m === cur ? 1 + Math.floor(rng() * lastDay) : 1 + Math.floor(rng() * 27)
        const start = startTime(year, m, day)
        const sector = offset(area.center, ...pick(SECTORS).map((v) => v + rand(-400, 400)))
        const { pts, dist } = buildTrack(sector, start)
        const patrolId = randomUUID()
        const end = pts.at(-1).t + rand(60, 240) * 1000

        // Evidencias: siempre una nota y una foto; después al azar; SOS al final si corresponde
        const n = 3 + Math.floor(rng() * 4)
        const idx = [...new Set(Array.from({ length: n }, () => 4 + Math.floor(rng() * Math.max(1, pts.length - 8))))].sort((a, b) => a - b)
        const rows = []
        const uploads = []
        for (const [e, i] of idx.entries()) {
          const q = pts[Math.min(i, pts.length - 1)]
          const loc = offset(q.pos, rand(-3, 3), rand(-3, 3))
          const id = randomUUID()
          const base = { id, patrol_id: patrolId, user_id: s.uid, lat: loc[0], lng: loc[1], ts: new Date(q.t + rand(0, 15000)).toISOString(), reviewed: false }
          if (sosHere && k === 0 && e === idx.length - 1) {
            rows.push({ ...base, type: 'sos', text: 'Alerta SOS', reviewed: sosHere[1] })
            continue
          }
          const cat = pickWeighted(area.cats)
          const kind = e === 0 ? 'note' : e === 1 ? 'photo' : rng() < 0.4 ? 'note' : rng() < 0.7 ? 'photo' : 'audio'
          if (kind === 'note') {
            rows.push({ ...base, type: 'note', category: cat, text: pick([...NOTES[cat], ...(area.extra[cat] ?? [])]) })
          } else if (kind === 'photo') {
            const theme = rng() < 0.15 ? 'paisaje' : cat === 'fauna' && rng() < 0.3 ? 'huellas' : cat
            const path = `${s.uid}/${patrolId}/${id}.png`
            const bytes = scene(theme, Math.floor(rng() * 1e9))
            uploads.push(() => must(s.sb.storage.from('evidences').upload(path, bytes, { contentType: 'image/png', upsert: true }), 'foto'))
            rows.push({ ...base, type: 'photo', text: pick(PHOTO_CAPTION[theme]), media_path: path, mime_type: 'image/png' })
          } else {
            const path = `${s.uid}/${patrolId}/${id}.wav`
            const bytes = wav(rng() < 0.55 ? 'ave' : 'cigarras', Math.floor(rng() * 1e9))
            uploads.push(() => must(s.sb.storage.from('evidences').upload(path, bytes, { contentType: 'audio/wav', upsert: true }), 'audio'))
            rows.push({ ...base, type: 'audio', text: pick(AUDIO_CAPTION) ?? null, media_path: path, mime_type: 'audio/wav' })
          }
        }

        await must(
          s.sb.from('patrols').insert({
            id: patrolId,
            user_id: s.uid,
            community_id: areaId,
            started_at: new Date(start).toISOString(),
            ended_at: new Date(end).toISOString(),
            distance_m: dist,
            summary: summarize(dist, start, end, rows),
          }),
          'patrol',
        )
        for (let i = 0; i < pts.length; i += 500)
          await must(
            s.sb.from('track_points').insert(
              pts.slice(i, i + 500).map((q) => ({ patrol_id: patrolId, lat: q.pos[0], lng: q.pos[1], accuracy: q.acc, ts: new Date(q.t).toISOString() })),
            ),
            'points',
          )
        await Promise.all(uploads.map((u) => u()))
        await must(s.sb.from('evidences').insert(rows), 'evidencias')
        nPatrols++
        nEv += rows.length
      }
      console.log(`${areaId} · mes ${m + 1}: ${area.monthly[m]} reportes (acumulado ${nPatrols} recorridos, ${nEv} evidencias)`)
    }
  }
  console.log(`LISTO: ${nPatrols} recorridos, ${nEv} evidencias`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
