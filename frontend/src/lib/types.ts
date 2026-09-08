export interface Usuario {
  id: number
  nombre: string
  rol: 'admin' | 'vendedor'
  activo: number
}

export interface Producto {
  id: number
  nombre: string
  categoria: string | null
  precio_venta: number
  costo: number
  unidad: string
  stock_actual: number
  stock_minimo: number
  activo: number
}

export interface Caja {
  id: number
  fecha_apertura: string
  fecha_cierre: string | null
  monto_inicial: number
  monto_final_declarado: number | null
  usuario_id: number
  usuario_nombre: string
  usuario_cierre_id: number | null
  usuario_cierre_nombre: string | null
  comentario: string | null
  estado: 'abierta' | 'cerrada'
}

export interface MotivoCaja {
  id: number
  nombre: string
  tipo: 'ingreso' | 'egreso'
  activo: number
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  saldo_cuenta_corriente: number
  activo: number
}

export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'qr' | 'cuenta_corriente' | 'otro'
export type Canal = 'mostrador' | 'pedidos_ya' | 'rappi'

export interface CarritoItem {
  producto: Producto
  cantidad: number
}
