import { useEffect, useState } from 'react'
import type { Caja } from '../../lib/types'
import { formatDateTime, formatMoney, todayISO } from '../../lib/format'
import { ComprobanteCierre } from './ComprobanteCierre'
import { api } from '../../lib/api'

export function CierresPage() {
  const [desde, setDesde] = useState(() => todayISO().slice(0, 8) + '01')
  const [hasta, setHasta] = useState(todayISO())
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [porDia, setPorDia] = useState<{ dia: string; total_vendido: number; cantidad_ventas: number }[]>([])
  const [porMes, setPorMes] = useState<{ mes: string; total_vendido: number; cantidad_ventas: number }[]>([])
  const [historialCajas, setHistorialCajas] = useState<Caja[]>([])
  const [comprobanteCajaId, setComprobanteCajaId] = useState<number | null>(null)

  async function cargarPorDia() {
    setPorDia(await api.caja.cierresPorDia(desde, hasta))
  }

  async function cargarPorMes() {
    setPorMes(await api.caja.cierresPorMes(anio))
  }

  async function cargarHistorial() {
    setHistorialCajas(await api.caja.historial())
  }

  useEffect(() => {
    cargarPorDia()
    cargarPorMes()
    cargarHistorial()
  }, [])

  return (
    <div className="panel">
      <h2>Cierres por día y por mes</h2>

      <h3>Cierres por caja</h3>
      <p className="ayuda">El comprobante detallado (por medio de pago, canal, categoría y productos) de cada turno.</p>
      <table>
        <thead>
          <tr>
            <th>Abrió</th>
            <th>Apertura</th>
            <th>Cerró</th>
            <th>Cierre</th>
            <th>Declarado</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {historialCajas.map((c) => (
            <tr key={c.id}>
              <td>{c.usuario_nombre}</td>
              <td>{formatDateTime(c.fecha_apertura)}</td>
              <td>{c.usuario_cierre_nombre ?? '-'}</td>
              <td>{c.fecha_cierre ? formatDateTime(c.fecha_cierre) : '-'}</td>
              <td>{c.monto_final_declarado != null ? formatMoney(c.monto_final_declarado) : '-'}</td>
              <td>{c.estado}</td>
              <td>
                <button className="link" onClick={() => setComprobanteCajaId(c.id)}>
                  ver comprobante
                </button>
              </td>
            </tr>
          ))}
          {historialCajas.length === 0 && (
            <tr>
              <td colSpan={7}>Todavía no hay cajas registradas.</td>
            </tr>
          )}
        </tbody>
      </table>

      {comprobanteCajaId && <ComprobanteCierre cajaId={comprobanteCajaId} onClose={() => setComprobanteCajaId(null)} />}

      <h3>Por día</h3>
      <div className="form-inline">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button className="primary" onClick={cargarPorDia}>
          Filtrar
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Día</th>
            <th>Cantidad de ventas</th>
            <th>Total vendido</th>
          </tr>
        </thead>
        <tbody>
          {porDia.map((d) => (
            <tr key={d.dia}>
              <td>{d.dia}</td>
              <td>{d.cantidad_ventas}</td>
              <td>{formatMoney(d.total_vendido)}</td>
            </tr>
          ))}
          {porDia.length === 0 && (
            <tr>
              <td colSpan={3}>Sin datos en el período.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Por mes</h3>
      <div className="form-inline">
        <label>
          Año
          <input value={anio} onChange={(e) => setAnio(e.target.value)} />
        </label>
        <button className="primary" onClick={cargarPorMes}>
          Filtrar
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Cantidad de ventas</th>
            <th>Total vendido</th>
          </tr>
        </thead>
        <tbody>
          {porMes.map((m) => (
            <tr key={m.mes}>
              <td>{m.mes}</td>
              <td>{m.cantidad_ventas}</td>
              <td>{formatMoney(m.total_vendido)}</td>
            </tr>
          ))}
          {porMes.length === 0 && (
            <tr>
              <td colSpan={3}>Sin datos en el año seleccionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
