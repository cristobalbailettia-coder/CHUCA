import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth } from './hooks/useAuth'
import Comunidades from './pages/Comunidades'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import Mapa from './pages/Mapa'
import Reportes from './pages/Reportes'
import ReportesSos from './pages/ReportesSos'
import RoutePage from './pages/RoutePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="sos" element={<ReportesSos />} />
        <Route path="comunidades" element={<Comunidades />} />
        <Route path="ruta/:code" element={<RoutePage />} />
        <Route path="*" element={<Inicio />} />
      </Route>
    </Routes>
  )
}
