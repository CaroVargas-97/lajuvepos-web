import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Cliente } from '../../lib/types'
import { formatDateTime, formatMoney } from '../../lib/format'
import { api } from '../../lib/api'

interface NotaCredito {
  id: number
  cliente_nombre: string
  monto: number
  motivo: string
  fecha: string
  venta_id: number | null
}

export function ClientesPage() {
  const { usuario } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [notas, setNotas] = useState<NotaCredito[]>([])
  const [form, setForm] = useState({ nombre: '', telefono: '' })
  const [notaForm, setNotaForm] = useState({ clienteId: '', monto: '', motivo: '' })
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const [cli, nc] = await Promise.all([api.clientes.listar(), api.notasCredito.listar()])
    setClientes(cli)
    setNotas(nc)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearCliente(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    const res = await api.clientes.crear(form)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear el cliente')
      return
    }
    setForm({ nombre: '', telefono: '' })
    cargar()
  }

  async function emitirNota(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!usuario) return
    const monto = Number(notaForm.monto)
    if (!notaForm.clienteId || Number.isNaN(monto) || monto <= 0) {
      setError('Elegí un cliente y un monto válido')
      return
    }
    const res = await api.notasCredito.crear({
      clienteId: Number(notaForm.clienteId),
      ventaId: null,
      monto,
      motivo: notaForm.motivo,
      usuarioId: usuario.id
    })
    if (!res.ok) {
      setError(res.error ?? 'No se pudo emitir la nota de crédito')
      return
    }
    setNotaForm({ clienteId: '', monto: '', motivo: '' })
    cargar()
  }

  return (
    <div className="panel">
      <h2>Clientes y cuenta corriente</h2>

      <form className="form-inline" onSubmit={crearCliente}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        <button className="primary" type="submit">
          Agregar cliente
        </button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Saldo a favor</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.telefono}</td>
              <td>{formatMoney(c.saldo_cuenta_corriente)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Emitir nota de crédito</h3>
      <form className="form-inline" onSubmit={emitirNota}>
        <select value={notaForm.clienteId} onChange={(e) => setNotaForm({ ...notaForm, clienteId: e.target.value })}>
          <option value="">Elegir cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input placeholder="Monto" type="number" value={notaForm.monto} onChange={(e) => setNotaForm({ ...notaForm, monto: e.target.value })} />
        <input placeholder="Motivo (devolución, etc.)" value={notaForm.motivo} onChange={(e) => setNotaForm({ ...notaForm, motivo: e.target.value })} />
        <button className="primary" type="submit">
          Emitir
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <h3>Notas de crédito emitidas</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Monto</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {notas.map((n) => (
            <tr key={n.id}>
              <td>{formatDateTime(n.fecha)}</td>
              <td>{n.cliente_nombre}</td>
              <td>{formatMoney(n.monto)}</td>
              <td>{n.motivo}</td>
            </tr>
          ))}
          {notas.length === 0 && (
            <tr>
              <td colSpan={4}>No hay notas de crédito emitidas.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
