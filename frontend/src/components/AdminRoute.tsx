import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function AdminRoute() {
  const { usuario } = useAuth()
  if (usuario?.rol !== 'admin') return <Navigate to="/ventas" replace />
  return <Outlet />
}
