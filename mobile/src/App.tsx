import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import MobileApp from './pages/MobileApp'

/** Marco de teléfono: pantalla completa en el celular; centrado en una computadora. */
export default function App() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-dvh justify-center bg-slate-300">
      <div className="relative h-dvh w-full max-w-md overflow-hidden bg-surface shadow-2xl">{user ? <MobileApp /> : <Login />}</div>
    </div>
  )
}
