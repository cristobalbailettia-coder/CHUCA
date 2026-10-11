import { createClient } from '@supabase/supabase-js'

// La clave "publishable" es pública por diseño: la seguridad la dan las políticas RLS de la base.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
