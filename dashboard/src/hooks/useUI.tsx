import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type DrawerState = { kind: 'report'; id: string } | { kind: 'sos'; id: string } | { kind: 'custodian'; id: string } | null

interface UI {
  drawer: DrawerState
  openReport: (patrolId: string) => void
  openSos: (eventId: string) => void
  openCustodian: (memberId: string) => void
  closeDrawer: () => void
}

const Ctx = createContext<UI | null>(null)

/** Qué panel lateral está abierto (reporte, SOS o custodio); lo puede abrir cualquier pantalla. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const value = useMemo<UI>(
    () => ({
      drawer,
      openReport: (id) => setDrawer({ kind: 'report', id }),
      openSos: (id) => setDrawer({ kind: 'sos', id }),
      openCustodian: (id) => setDrawer({ kind: 'custodian', id }),
      closeDrawer: () => setDrawer(null),
    }),
    [drawer],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useUI debe usarse dentro de UIProvider')
  return v
}

/** Para componentes que pueden vivir fuera del Layout (ruta pública): no falla si no hay panel. */
export function useUIOptional() {
  return useContext(Ctx)
}
