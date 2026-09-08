import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Usuario } from '../../lib/types'
import { api } from '../../lib/api'

interface AuthState {
  usuario: Usuario | null
  login: (pin: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function usuarioGuardado(): Usuario | null {
  try {
    const raw = localStorage.getItem('lajuvepos_usuario')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioGuardado())

  async function login(pin: string) {
    const res = await api.auth.login(pin)
    if (res.ok && res.usuario && res.token) {
      localStorage.setItem('lajuvepos_token', res.token)
      localStorage.setItem('lajuvepos_usuario', JSON.stringify(res.usuario))
      setUsuario(res.usuario)
      return { ok: true }
    }
    return { ok: false, error: res.error ?? 'Error al iniciar sesión' }
  }

  function logout() {
    localStorage.removeItem('lajuvepos_token')
    localStorage.removeItem('lajuvepos_usuario')
    setUsuario(null)
  }

  return <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
