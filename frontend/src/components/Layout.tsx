import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function Layout() {
  const { usuario, logout } = useAuth()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.jpeg" alt="LaJuvePOS" />
          <h1>LaJuvePOS</h1>
        </div>
        <nav>
          <NavLink to="/ventas">Ventas</NavLink>
          <NavLink to="/caja">Caja</NavLink>
          <NavLink to="/tickets">Tickets</NavLink>
          <NavLink to="/cierres">Cierres</NavLink>
          {usuario?.rol === 'admin' && <NavLink to="/stock">Stock</NavLink>}
          {usuario?.rol === 'admin' && <NavLink to="/clientes">Clientes</NavLink>}
          {usuario?.rol === 'admin' && <NavLink to="/motivos-caja">Motivos de caja</NavLink>}
          {usuario?.rol === 'admin' && <NavLink to="/usuarios">Usuarios</NavLink>}
          {usuario?.rol === 'admin' && <NavLink to="/reportes">Reportes</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <p>{usuario?.nombre}</p>
          <small>{usuario?.rol}</small>
          <button className="link" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
