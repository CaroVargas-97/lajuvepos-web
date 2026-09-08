import { useEffect, useState, type FormEvent } from 'react'
import type { MotivoCaja } from '../../lib/types'
import { api } from '../../lib/api'

export function MotivosCajaPage() {
  const [motivos, setMotivos] = useState<MotivoCaja[]>([])
  const [form, setForm] = useState({ nombre: '', tipo: 'egreso' as 'ingreso' | 'egreso' })
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setMotivos(await api.motivosCaja.listar(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearMotivo(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    const res = await api.motivosCaja.crear(form)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear el motivo')
      return
    }
    setForm({ nombre: '', tipo: 'egreso' })
    cargar()
  }

  async function toggleActivo(m: MotivoCaja) {
    await api.motivosCaja.setActivo(m.id, !m.activo)
    cargar()
  }

  const ingresos = motivos.filter((m) => m.tipo === 'ingreso')
  const egresos = motivos.filter((m) => m.tipo === 'egreso')

  return (
    <div className="panel">
      <h2>Motivos de caja</h2>
      <p className="ayuda">
        Son las opciones que aparecen al registrar un ingreso o egreso en Caja (ej. "Pago a proveedor", "Retiro de efectivo").
      </p>

      <form className="form-inline" onSubmit={crearMotivo}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'ingreso' | 'egreso' })}>
          <option value="egreso">Egreso</option>
          <option value="ingreso">Ingreso</option>
        </select>
        <button className="primary" type="submit">
          Agregar motivo
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="ventas-layout">
        <div className="panel">
          <h3>Ingresos</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td>{m.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <button className="link" onClick={() => toggleActivo(m)}>
                      {m.activo ? 'desactivar' : 'activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Egresos</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {egresos.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td>{m.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <button className="link" onClick={() => toggleActivo(m)}>
                      {m.activo ? 'desactivar' : 'activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
