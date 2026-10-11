// Resume un recorrido con Gemini a partir de sus textos y audios (las fotos NO se analizan).
// Secretos requeridos (Supabase → Edge Functions → Secrets): GEMINI_API_KEY  (opcional: GEMINI_MODEL).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MAX_AUDIOS = 5
const MAX_AUDIO_BYTES = 12 * 1024 * 1024
const AUDIO_MIME = new Set(['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/webm'])

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    resumen: { type: 'STRING', description: 'Resumen de 2 a 4 oraciones en español, claro y objetivo.' },
    urgencia: { type: 'STRING', enum: ['baja', 'media', 'alta'] },
    incidentes: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Amenazas detectadas: tala, incendio, pastoreo, caza furtiva, etc.' },
    fauna: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Especies de fauna o flora mencionadas.' },
    acciones: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Acciones sugeridas para la jefatura.' },
  },
  required: ['resumen', 'urgencia', 'incidentes', 'fauna', 'acciones'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { patrol_id, force } = await req.json()
    if (!patrol_id) return json({ error: 'Falta patrol_id' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    // RLS: el vigilante solo ve sus recorridos; el admin ve todos.
    const { data: patrol } = await asUser
      .from('patrols')
      .select('id, community_id, started_at, ended_at, distance_m, summary_at')
      .eq('id', patrol_id)
      .maybeSingle()
    if (!patrol) return json({ error: 'Recorrido no encontrado' }, 404)
    if (!patrol.ended_at) return json({ status: 'not_finished' })

    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (force && !isAdmin) return json({ error: 'Solo el equipo AIDER puede regenerar' }, 403)
    if (patrol.summary_at && !force) return json({ status: 'exists' })

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return json({ status: 'pending_config' })
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: evs } = await admin
      .from('evidences')
      .select('id, type, category, text, ts, media_path, mime_type')
      .eq('patrol_id', patrol_id)
      .order('ts')
    const { data: com } = await admin.from('communities').select('name, nearby_reserve').eq('id', patrol.community_id).maybeSingle()

    const texts = (evs ?? []).filter((e) => e.text && e.type !== 'sos')
    const hasSos = (evs ?? []).some((e) => e.type === 'sos')
    const audioEvs = (evs ?? []).filter((e) => e.type === 'audio' && e.media_path).slice(0, MAX_AUDIOS)

    const save = async (summary: string, key_data: unknown) => {
      await admin.from('patrols').update({ summary, key_data, summary_at: new Date().toISOString() }).eq('id', patrol_id)
    }
    if (!texts.length && !audioEvs.length) {
      const s = 'Este recorrido no tiene audios ni textos para analizar.'
      await save(s, null)
      return json({ status: 'no_content', summary: s })
    }

    const audios: { mime: string; data: string }[] = []
    let bytes = 0
    for (const a of audioEvs) {
      const { data: blob } = await admin.storage.from('evidences').download(a.media_path!)
      if (!blob || bytes + blob.size > MAX_AUDIO_BYTES) continue
      const mime = (a.mime_type ?? blob.type ?? '').split(';')[0]
      if (!AUDIO_MIME.has(mime)) continue
      bytes += blob.size
      audios.push({ mime, data: encodeBase64(new Uint8Array(await blob.arrayBuffer())) })
    }

    const min = Math.round((Date.parse(patrol.ended_at) - Date.parse(patrol.started_at)) / 60000)
    const prompt = [
      'Eres analista de la jefatura de un área natural protegida del bosque seco del noroeste del Perú (Tumbes y Piura).',
      'Analiza el recorrido de un vigilante comunal usando SOLO la información adjunta: las notas escritas y los audios. No analices fotos ni inventes datos.',
      `Comunidad: ${com?.name ?? patrol.community_id}${com?.nearby_reserve ? ` (cerca de ${com.nearby_reserve})` : ''}. Duración: ${Math.floor(min / 60)} h ${min % 60} min. Distancia: ${(patrol.distance_m / 1000).toFixed(1)} km.`,
      hasSos ? 'Durante el recorrido el vigilante emitió una alerta SOS: considera la urgencia al menos media.' : '',
      texts.length ? `Notas escritas:\n${texts.map((t) => `- [${new Date(t.ts).toISOString().slice(11, 16)}]${t.category ? ` (${t.category})` : ''} ${t.text}`).join('\n')}` : 'No hay notas escritas.',
      audios.length ? `Se adjuntan ${audios.length} audio(s) del vigilante: escúchalos e incorpora lo que dicen.` : 'No hay audios analizables.',
      'Responde en español con el formato JSON indicado: un resumen breve y objetivo, la urgencia, los incidentes, la fauna mencionada y las acciones sugeridas.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const call = (withAudio: boolean) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...(withAudio ? audios.map((a) => ({ inline_data: { mime_type: a.mime, data: a.data } })) : [])] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(55_000),
      })

    let usedAudio = audios.length
    let res = await call(true)
    if (!res.ok && audios.length) {
      // Formato de audio no soportado u otro error: se reintenta solo con los textos.
      usedAudio = 0
      res = await call(false)
    }
    if (!res.ok) return json({ error: `Gemini respondió ${res.status}`, detail: (await res.text()).slice(0, 300) }, 502)

    const body = await res.json()
    const out = JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}')
    if (!out.resumen) return json({ error: 'Respuesta vacía de Gemini' }, 502)

    await save(out.resumen, {
      urgencia: out.urgencia,
      incidentes: out.incidentes ?? [],
      fauna: out.fauna ?? [],
      acciones: out.acciones ?? [],
      modelo: model,
      audios_analizados: usedAudio,
      textos_analizados: texts.length,
    })
    return json({ status: 'ok', summary: out.resumen })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
