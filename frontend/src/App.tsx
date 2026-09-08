import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { Layout } from './components/Layout'
import { AdminRoute } from './components/AdminRoute'
import { VentasPage } from './features/ventas/VentasPage'
import { CajaPage } from './features/caja/CajaPage'
import { CierresPage } from './features/caja/CierresPage'
import { StockPage } from './features/stock/StockPage'
import { ConfiguracionPage } from './features/configuracion/ConfiguracionPage'
import { ReportesPage } from './features/reportes/ReportesPage'
import { ClientesPage } from './features/clientes/ClientesPage'
import { TicketsPage } from './features/tickets/TicketsPage'

function AppRoutes() {
  const { usuario } = useAuth()

  if (!usuario) return <LoginPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/caja" element={<CajaPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/cierres" element={<CierresPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/stock" element={<StockPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/ventas" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
