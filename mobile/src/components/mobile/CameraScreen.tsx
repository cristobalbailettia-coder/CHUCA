import { useEffect, useRef, useState } from 'react'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { fmtHour } from '../../lib/format'
import { Icon } from './ui'

const MAX_SIDE = 1280

async function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
}

/** Pantalla 2.1: captura de cámara. El disparador congela la foto y luego se elige VOLVER o GUARDAR. */
export default function CameraScreen({ photoNo, community, onSave, onCancel }: { photoNo: number; community: string; onSave: (b: Blob) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [shot, setShot] = useState<Blob | null>(null)
  const [torch, setTorch] = useState<'none' | 'off' | 'on'>('none')
  const [clock, setClock] = useState(Date.now())
  const [flash, setFlash] = useState(false)
  const preview = useBlobUrl(shot)

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Cámara no disponible en este teléfono.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as { torch?: boolean }
        if (caps.torch) setTorch('off')
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().then(() => setReady(true))
        }
      })
      .catch(() => setError('No se pudo abrir la cámara. Revise el permiso o elija una foto de la galería.'))
    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0]
    if (!track) return
    const next = torch !== 'on'
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorch(next ? 'on' : 'off')
    } catch {
      /* el teléfono no permite linterna */
    }
  }

  const shutter = async () => {
    if (shot) return setShot(null) // volver a tomar
    const v = video.current
    if (!v || !ready) return
    setFlash(true)
    setTimeout(() => setFlash(false), 150)
    const blob = await toJpeg(v, v.videoWidth, v.videoHeight)
    if (blob) setShot(blob)
  }

  const fromFile = async (file?: File) => {
    if (!file) return
    const bmp = await createImageBitmap(file)
    const blob = await toJpeg(bmp, bmp.width, bmp.height)
    if (blob) setShot(blob)
  }

  return (
    <div className="relative flex h-full select-none flex-col justify-between overflow-hidden bg-black text-white">
      <header className="z-30 flex w-full items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <h1 className="text-lg font-extrabold tracking-wide text-white">Fotografía</h1>
        </div>
        <div className="flex items-center gap-3">
          {torch !== 'none' ? (
            <button type="button" onClick={toggleTorch} title="Flash" className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md active:bg-white/20 ${torch === 'on' ? 'text-amber-300' : 'text-white'}`}>
              <Icon name={torch === 'on' ? 'flash_on' : 'flash_off'} size={22} />
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-3 py-1 text-emerald-300 shadow-inner">
            <Icon name="shield" size={18} className="text-emerald-400" />
            <span className="font-mono text-xs font-black uppercase tracking-wider">CHUCA</span>
          </div>
        </div>
      </header>

      <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 h-full w-full bg-[#0b1d16]">
          {preview ? <img src={preview} alt="Foto tomada" className="h-full w-full object-cover" /> : <video ref={video} playsInline muted className="h-full w-full object-cover" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        </div>

        {error && !shot && (
          <div className="absolute inset-x-6 top-1/3 z-20 flex flex-col items-center gap-4 rounded-2xl bg-black/70 p-5 text-center backdrop-blur">
            <Icon name="no_photography" size={48} className="text-amber-300" />
            <p className="text-body-sm font-bold">{error}</p>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-body-md font-extrabold text-white">
              <Icon name="photo_library" /> Elegir de la galería
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => void fromFile(e.target.files?.[0])} />
            </label>
          </div>
        )}

        <div className="pointer-events-none absolute inset-6 flex flex-col justify-between rounded-2xl border border-white/20 p-4">
          <div className="flex items-start justify-between font-mono text-[10px] text-white/70">
            <span className="rounded bg-black/40 px-2 py-0.5 backdrop-blur">
              HORA: <span className="tnum">{fmtHour(clock)}</span>
            </span>
            <span className="rounded bg-black/40 px-2 py-0.5 backdrop-blur">CUSTODIO ACTIVO</span>
          </div>
          <div className="relative flex h-20 w-20 items-center justify-center self-center rounded-xl border-2 border-emerald-400/70">
            <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 border-l-2 border-t-2 border-white" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 border-r-2 border-t-2 border-white" />
            <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-white" />
            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-white" />
          </div>
          <div className="flex items-end justify-between font-mono text-[10px] text-white/70">
            <span className="max-w-[60%] truncate rounded border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 text-emerald-300 backdrop-blur">PATRULLA {community.toUpperCase()}</span>
            <span className="rounded bg-black/40 px-2 py-0.5 backdrop-blur">FOTO #{String(photoNo).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-40 bg-white transition-opacity duration-150" style={{ opacity: flash ? 0.9 : 0 }} />
      </main>

      <footer className="z-30 flex w-full flex-col gap-3 border-t-2 border-emerald-600/40 bg-[#0F382C] p-4 pb-6 shadow-2xl">
        <div className="flex w-full items-center justify-center py-1">
          <button type="button" onClick={shutter} title={shot ? 'Tomar otra' : 'Tomar foto'} className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 shadow-2xl transition-all active:scale-90">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-900 shadow-inner">
              <Icon name={shot ? 'refresh' : 'photo_camera'} size={32} />
            </div>
          </button>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white shadow-lg transition-transform active:scale-95">
            <Icon name="arrow_back" size={24} />
            <span className="text-sm font-extrabold uppercase tracking-wider">VOLVER</span>
          </button>
          <button
            type="button"
            disabled={!shot}
            onClick={() => shot && onSave(shot)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40 ${shot ? 'ring-4 ring-emerald-400' : ''}`}
          >
            <Icon name="check_circle" size={24} />
            <span className="text-sm font-extrabold uppercase tracking-wider">GUARDAR</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
