import { categoryCounts, communityLabel, type Gap, type Summary } from './stats'
import { fmtDateTime } from './time'
import { CATEGORY_NAME } from './colors'
import type { DashboardData } from './types'

export type ExportKind = 'pdf' | 'geojson' | 'csv' | 'resumen'

export interface ExportCtx {
  view: DashboardData
  summary: Summary
  gaps: Map<string, Gap[]>
  scope: string
  period: string
}

export const EXPORT_LABEL: Record<ExportKind, string> = {
  pdf: 'Informe técnico (PDF)',
  geojson: 'Trazas GPS (GeoJSON)',
  csv: 'Telemetría (CSV)',
  resumen: 'Resumen comunal (PDF)',
}

function download(name: string, mime: string, content: BlobPart) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)
const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

type RGB = [number, number, number]
const GREEN: RGB = [16, 60, 38]
const GOLD: RGB = [249, 205, 59]
const INK: RGB = [31, 42, 34]
const MUTED: RGB = [95, 103, 87]

async function logoDataUrl(): Promise<string | undefined> {
  try {
    const blob = await (await fetch('/chuca-logo.jpg')).blob()
    return await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = rej
      r.readAsDataURL(blob)
    })
  } catch {
    return undefined // sin logo: el membrete sale solo con texto
  }
}

/** Genera y descarga el archivo; devuelve la cantidad de filas exportadas. */
export async function runExport(kind: ExportKind, ctx: ExportCtx): Promise<number> {
  const { view, summary } = ctx
  const com = new Map(view.communities.map((c) => [c.id, c]))
  const member = new Map(view.members.map((m) => [m.id, m]))
  const evBy = new Map<string, DashboardData['events']>()
  view.events.forEach((e) => evBy.set(e.patrolId, [...(evBy.get(e.patrolId) ?? []), e]))
  const patrols = [...view.patrols].sort((a, b) => b.startedAt - a.startedAt)

  if (kind === 'csv') {
    const head = ['codigo', 'custodio', 'dni', 'comunidad', 'inicio', 'fin', 'km', 'fotos', 'audios', 'textos', 'sos']
    const rows = patrols.map((p) => {
      const evs = evBy.get(p.id) ?? []
      return [
        p.code,
        p.userName,
        member.get(p.userId)?.dni ?? '',
        com.get(p.communityId)?.name ?? p.communityId,
        new Date(p.startedAt).toISOString(),
        p.endedAt ? new Date(p.endedAt).toISOString() : '',
        (p.distanceM / 1000).toFixed(2),
        evs.filter((e) => e.type === 'photo').length,
        evs.filter((e) => e.type === 'audio').length,
        evs.filter((e) => e.type === 'note').length,
        evs.filter((e) => e.type === 'sos').length,
      ]
    })
    download(`chuca-telemetria-${stamp()}.csv`, 'text/csv;charset=utf-8', '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'))
    return rows.length
  }

  if (kind === 'geojson') {
    const byPatrol = new Map<string, DashboardData['points']>()
    view.points.forEach((p) => byPatrol.set(p.patrolId, [...(byPatrol.get(p.patrolId) ?? []), p]))
    const lines = patrols.map((p) => ({
      type: 'Feature' as const,
      properties: { kind: 'ruta', codigo: p.code, custodio: p.userName, comunidad: com.get(p.communityId)?.name, inicio: new Date(p.startedAt).toISOString(), km: +(p.distanceM / 1000).toFixed(3) },
      geometry: { type: 'LineString' as const, coordinates: (byPatrol.get(p.id) ?? []).sort((a, b) => a.timestamp - b.timestamp).map((q) => [q.lng, q.lat]) },
    }))
    const pts = view.events
      .filter((e) => e.lat != null)
      .map((e) => ({
        type: 'Feature' as const,
        properties: { kind: 'registro', tipo: e.type, categoria: e.category ?? null, texto: e.text ?? null, custodio: e.userName, hora: new Date(e.timestamp).toISOString(), tieneArchivo: e.hasMedia },
        geometry: { type: 'Point' as const, coordinates: [e.lng!, e.lat!] },
      }))
    download(`chuca-trazas-${stamp()}.geojson`, 'application/geo+json', JSON.stringify({ type: 'FeatureCollection', features: [...lines, ...pts] }))
    return lines.length
  }

  // ───────── PDF con membrete de CHUCA · AIDER ─────────
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 14
  const logo = await logoDataUrl()
  const title = kind === 'pdf' ? 'Informe técnico de vigilancia' : 'Resumen comunal'
  let page = 1

  const header = () => {
    doc.setFillColor(...GREEN)
    doc.rect(0, 0, W, 30, 'F')
    doc.setFillColor(...GOLD)
    doc.rect(0, 30, W, 1.6, 'F')
    if (logo) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(M - 1, 2.5, 25, 25, 3, 3, 'F')
      doc.addImage(logo, 'JPEG', M, 3.5, 23, 23)
    }
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Panel AIDER', M + 29, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text('Conservación del Hábitat mediante la Unidad Comunitaria Ambiental', M + 29, 19.5)
    doc.text('Cada paso protege el bosque.', M + 29, 24.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, W - M, 13, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`${ctx.scope} · ${ctx.period}`, W - M, 19, { align: 'right' })
    doc.text(new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }), W - M, 24, { align: 'right' })
    doc.setTextColor(...INK)
  }
  const footer = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('CHUCA · AIDER — Vigilancia comunal del bosque seco, Tumbes–Piura', M, 290)
    doc.text(`Página ${page}`, W - M, 290, { align: 'right' })
    doc.setTextColor(...INK)
  }
  header()
  let y = 40
  const ensure = (h: number) => {
    if (y + h > 282) {
      footer()
      doc.addPage()
      page++
      header()
      y = 40
    }
  }
  const h2 = (text: string) => {
    ensure(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...GREEN)
    doc.text(text, M, y)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.7)
    doc.line(M, y + 1.6, M + 22, y + 1.6)
    doc.setTextColor(...INK)
    y += 8
  }
  const para = (text: string, size = 9.5, gap = 5) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    for (const l of doc.splitTextToSize(text, W - 2 * M) as string[]) {
      ensure(gap)
      doc.text(l, M, y)
      y += gap
    }
  }
  const kpis = (items: [string, string][]) => {
    ensure(26)
    const w = (W - 2 * M - (items.length - 1) * 3) / items.length
    items.forEach(([label, value], i) => {
      const x = M + i * (w + 3)
      doc.setFillColor(245, 228, 182)
      doc.roundedRect(x, y, w, 20, 2.5, 2.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...GREEN)
      doc.text(value, x + 4, y + 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...MUTED)
      doc.text(label.toUpperCase(), x + 4, y + 16)
    })
    doc.setTextColor(...INK)
    y += 26
  }
  const table = (cols: { h: string; w: number; align?: 'right' }[], rows: string[][]) => {
    const row = (cells: string[], head = false) => {
      doc.setFont('helvetica', head ? 'bold' : 'normal')
      doc.setFontSize(8.5)
      const lines = cells.map((c, i) => doc.splitTextToSize(c, cols[i].w - 3) as string[])
      const h = Math.max(...lines.map((l) => l.length)) * 4.2 + 3
      ensure(h)
      if (head) {
        doc.setFillColor(...GREEN)
        doc.rect(M, y - 4, W - 2 * M, h, 'F')
        doc.setTextColor(255, 255, 255)
      } else doc.setTextColor(...INK)
      let x = M
      lines.forEach((l, i) => {
        l.forEach((t, k) => doc.text(t, cols[i].align === 'right' ? x + cols[i].w - 2 : x + 1.5, y + k * 4.2, cols[i].align ? { align: cols[i].align } : undefined))
        x += cols[i].w
      })
      if (!head) {
        doc.setDrawColor(232, 223, 196)
        doc.setLineWidth(0.2)
        doc.line(M, y + h - 4.8, W - M, y + h - 4.8)
      }
      y += h
      doc.setTextColor(...INK)
    }
    row(cols.map((c) => c.h), true)
    rows.forEach((r) => row(r))
    y += 4
  }

  const sosAll = view.events.filter((e) => e.type === 'sos')
  kpis([
    ['Patrullajes', String(summary.reports)],
    ['Km recorridos', summary.km.toFixed(1)],
    ['Hectáreas', summary.ha.toLocaleString('es-PE')],
    ['Custodios', String(summary.guards)],
    ['Alertas SOS', String(sosAll.length)],
  ])

  if (kind === 'resumen') {
    h2('Resumen por comunidad')
    for (const c of view.communities) {
      const ps = patrols.filter((p) => p.communityId === c.id)
      if (!ps.length) continue
      const ids = new Set(ps.map((p) => p.id))
      const evs = view.events.filter((e) => ids.has(e.patrolId))
      ensure(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(communityLabel(c), M, y)
      y += 5.5
      para(`Reserva cercana: ${c.nearbyReserve ?? '—'} · Recibe reportes desde: ${c.reportsSince ?? '—'} · Habitantes (est.): ${c.population ?? '—'}`, 9, 4.6)
      para(
        `Patrullajes: ${ps.length} · Km: ${(ps.reduce((s, p) => s + p.distanceM, 0) / 1000).toFixed(1)} · Custodios activos: ${new Set(ps.map((p) => p.userId)).size} · Registros: ${evs.length} · SOS: ${evs.filter((e) => e.type === 'sos').length} (pendientes: ${evs.filter((e) => e.type === 'sos' && e.sosStatus !== 'resuelto').length})`,
        9,
        4.6,
      )
      y += 4
    }
    footer()
    doc.save(`chuca-resumen-comunal-${stamp()}.pdf`)
    return view.communities.length
  }

  const cats = categoryCounts(view.events)
  h2('Registros por tipo de situación')
  para(cats.rows.map((r) => `${CATEGORY_NAME[r.category]}: ${r.count}`).join('   ·   '), 10, 5.5)
  y += 3
  if (sosAll.length) {
    h2('Alertas SOS')
    const stat = { nuevo: 'Nuevo', en_atencion: 'En atención', resuelto: 'Resuelto' }
    table(
      [
        { h: 'Fecha y hora', w: 40 },
        { h: 'Custodio', w: 50 },
        { h: 'Ubicación', w: 50 },
        { h: 'Estado', w: 42 },
      ],
      [...sosAll].sort((a, b) => b.timestamp - a.timestamp).map((e) => [fmtDateTime(e.timestamp), e.userName, e.lat != null ? `${e.lat.toFixed(5)}, ${e.lng!.toFixed(5)}` : 'sin ubicación', stat[e.sosStatus]]),
    )
  }
  h2('Recorridos')
  table(
    [
      { h: 'Código', w: 24 },
      { h: 'Fecha', w: 34 },
      { h: 'Custodio', w: 50 },
      { h: 'Comunidad', w: 50 },
      { h: 'Km', w: 24, align: 'right' },
    ],
    patrols.map((p) => [p.code, fmtDateTime(p.startedAt), p.userName, com.get(p.communityId)?.name ?? '', (p.distanceM / 1000).toFixed(1)]),
  )
  footer()
  doc.save(`chuca-informe-tecnico-${stamp()}.pdf`)
  return patrols.length
}
