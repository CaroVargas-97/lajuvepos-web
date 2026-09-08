import axios from 'axios'
import type { Usuario, Producto, Caja, Cliente, MotivoCaja } from './types'

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('lajuvepos_token')
  if (token) config.headers['x-auth-token'] = token
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('lajuvepos_token')
      localStorage.removeItem('lajuvepos_usuario')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await client.get(url, { params })
  return res.data
}

async function withResult(promise: Promise<{ data: any }>): Promise<any> {
  try {
    const res = await promise
    return res.data
  } catch (e: any) {
    return { ok: false, error: e?.response?.data?.error ?? 'Error de conexión con el servidor' }
  }
}

export const api = {
  auth: {
    login: async (pin: string): Promise<{ ok: boolean; error?: string; usuario?: Usuario; token?: string }> => {
      const res = await withResult(client.post('/auth/login', { pin }))
      return res
    },
    listarUsuarios: () => get<Usuario[]>('/auth/usuarios'),
    crearUsuario: (data: { nombre: string; pin: string; rol: 'admin' | 'vendedor' }) =>
      withResult(client.post('/auth/usuarios', data)),
    cambiarPin: (id: number, pin: string) => withResult(client.put(`/auth/usuarios/${id}/pin`, { pin })),
    setActivo: (id: number, activo: boolean) => withResult(client.put(`/auth/usuarios/${id}/activo`, { activo }))
  },
  productos: {
    listar: () => get<Producto[]>('/productos'),
    crear: (data: unknown) => withResult(client.post('/productos', data)),
    actualizar: (id: number, data: unknown) => withResult(client.put(`/productos/${id}`, data)),
    ajustarStock: (id: number, cantidad: number, tipo: 'entrada' | 'ajuste', motivo: string, usuarioId: number) =>
      withResult(client.post(`/productos/${id}/ajustar-stock`, { cantidad, tipo, motivo, usuarioId }))
  },
  caja: {
    actual: () => get<Caja | null>('/caja/actual'),
    abrir: (montoInicial: number, usuarioId: number) => withResult(client.post('/caja/abrir', { montoInicial, usuarioId })),
    cerrar: (cajaId: number, montoFinalDeclarado: number, usuarioId: number, comentario: string) =>
      withResult(client.post(`/caja/${cajaId}/cerrar`, { montoFinalDeclarado, usuarioId, comentario })),
    resumen: (cajaId: number) => withResult(client.get(`/caja/${cajaId}/resumen`)),
    comprobante: (cajaId: number) => withResult(client.get(`/caja/${cajaId}/comprobante`)),
    historial: () => get<Caja[]>('/caja/historial'),
    cierresPorDia: (desde: string, hasta: string) =>
      get<{ dia: string; total_vendido: number; cantidad_ventas: number }[]>('/caja/cierres-por-dia', { desde, hasta }),
    cierresPorMes: (anio: string) =>
      get<{ mes: string; total_vendido: number; cantidad_ventas: number }[]>('/caja/cierres-por-mes', { anio })
  },
  ventas: {
    crear: (data: unknown) => withResult(client.post('/ventas', data)),
    listarPorCaja: (cajaId: number) => get<any[]>(`/ventas/por-caja/${cajaId}`),
    buscar: (desde: string, hasta: string) => get<any[]>('/ventas/buscar', { desde, hasta }),
    detalle: (ventaId: number) => get<any>(`/ventas/${ventaId}`)
  },
  reportes: {
    rentabilidad: (desde: string, hasta: string) => get<any>('/reportes/rentabilidad', { desde, hasta }),
    ventasPorCanal: (desde: string, hasta: string) => get<any[]>('/reportes/ventas-por-canal', { desde, hasta }),
    ventasPorMedioPago: (desde: string, hasta: string) => get<any[]>('/reportes/ventas-por-medio-pago', { desde, hasta }),
    ventasPorTarjeta: (desde: string, hasta: string) => get<any[]>('/reportes/ventas-por-tarjeta', { desde, hasta }),
    ventasPorCategoria: (desde: string, hasta: string) => get<any[]>('/reportes/ventas-por-categoria', { desde, hasta })
  },
  clientes: {
    listar: () => get<Cliente[]>('/clientes'),
    crear: (data: { nombre: string; telefono: string }) => withResult(client.post('/clientes', data)),
    movimientos: (clienteId: number) => get<any[]>(`/clientes/${clienteId}/movimientos`)
  },
  notasCredito: {
    crear: (data: unknown) => withResult(client.post('/clientes/notas-credito', data)),
    listar: () => get<any[]>('/clientes/notas-credito/listar')
  },
  movimientosCaja: {
    crear: (data: unknown) => withResult(client.post('/movimientos-caja', data)),
    listarPorCaja: (cajaId: number) => get<any[]>(`/movimientos-caja/por-caja/${cajaId}`)
  },
  motivosCaja: {
    listar: (soloActivos: boolean) => get<MotivoCaja[]>('/motivos-caja', { soloActivos }),
    crear: (data: { nombre: string; tipo: 'ingreso' | 'egreso' }) => withResult(client.post('/motivos-caja', data)),
    setActivo: (id: number, activo: boolean) => withResult(client.put(`/motivos-caja/${id}/activo`, { activo }))
  },
  configuracion: {
    obtener: (clave: string) => get<string | null>(`/configuracion/${clave}`),
    guardar: (clave: string, valor: string) => withResult(client.put(`/configuracion/${clave}`, { valor }))
  },
  sistema: {
    exportarBackup: async (): Promise<{ ok: boolean; error?: string; path?: string }> => {
      const token = localStorage.getItem('lajuvepos_token')
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
      const res = await fetch(`${baseURL}/sistema/backup`, { headers: { 'x-auth-token': token ?? '' } })
      if (!res.ok) return { ok: false, error: 'No se pudo generar la copia de seguridad' }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lajuvepos-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return { ok: true }
    }
  }
}
