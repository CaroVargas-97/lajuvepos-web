import { useEffect, useState } from 'react'
import { formatDateTime, formatMoney, todayISO } from '../../lib/format'
import { api } from '../../lib/api'

interface VentaResumen {
  id: number
  fecha: string
  total: number
  medio_pago: string
  canal: string
  usuario_nombre: string
  anulada: number
}

interface DetalleVenta {
  venta: { id: number; fecha: string; total: number; medio_pago: string; canal: string }
  items: { producto_nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[]
  pagos: { medio_pago: string; tarjeta: string | null; monto: number }[]
}

export function TicketsPage() {
  const [desde, setDesde] = useState(todayISO())
  const [hasta, setHasta] = useState(todayISO())
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [detalle, setDetalle] = useState<DetalleVenta | null>(null)

  async function buscar() {
    setVentas(await api.ventas.buscar(desde, hasta))
  }

  useEffect(() => {
    buscar()
  }, [])

  async function verTicket(id: number) {
    setDetalle(await api.ventas.detalle(id))
  }

  return (
    <div className="ventas-layout">
      <div className="panel">
        <h2>Consulta de tickets</h2>
        <div className="form-inline">
          <label>
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <button className="primary" onClick={buscar}>
            Buscar
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Canal</th>
              <th>Medio de pago</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{formatDateTime(v.fecha)}</td>
                <td>{v.usuario_nombre}</td>
                <td>{v.canal}</td>
                <td>{v.medio_pago}</td>
                <td>{formatMoney(v.total)}</td>
                <td>
                  <button className="link" onClick={() => verTicket(v.id)}>
                    ver ticket
                  </button>
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td colSpan={7}>No hay ventas en el período seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Ticket</h2>
        {!detalle && <p>Elegí una venta de la lista para ver el detalle.</p>}
        {detalle && (
          <div>
            <p>Venta #{detalle.venta.id}</p>
            <p>{formatDateTime(detalle.venta.fecha)}</p>
            <p>
              Canal: {detalle.venta.canal} — Medio de pago: {detalle.venta.medio_pago}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>P. unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{it.producto_nombre}</td>
                    <td>{it.cantidad}</td>
                    <td>{formatMoney(it.precio_unitario)}</td>
                    <td>{formatMoney(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total-row">
              <span>Total</span>
              <strong>{formatMoney(detalle.venta.total)}</strong>
            </div>
            {(detalle.pagos.length > 1 || detalle.pagos.some((p) => p.tarjeta)) && (
              <p className="pagos-detalle">
                {detalle.pagos.length > 1 ? 'Pago dividido: ' : 'Pago: '}
                {detalle.pagos.map((p, i) => (
                  <span key={i}>
                    {p.medio_pago}
                    {p.tarjeta ? ` (${p.tarjeta})` : ''} {formatMoney(p.monto)}
                    {i < detalle.pagos.length - 1 ? ' + ' : ''}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
