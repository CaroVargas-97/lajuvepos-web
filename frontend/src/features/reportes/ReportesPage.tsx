import { useEffect, useMemo, useState } from 'react'
import { formatMoney, todayISO } from '../../lib/format'
import { api } from '../../lib/api'

interface FilaProducto {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  total_vendido: number
  costo_total: number
  ganancia: number
}

type Tab = 'rentabilidad' | 'canal' | 'medioPago' | 'tarjeta' | 'categoria'

const CANAL_LABEL: Record<string, string> = {
  mostrador: 'Mostrador',
  pedidos_ya: 'PedidosYa',
  rappi: 'Rappi'
}

function porcentaje(parte: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((parte / total) * 100)}%`
}

export function ReportesPage() {
  const [tab, setTab] = useState<Tab>('rentabilidad')
  const [desde, setDesde] = useState(todayISO())
  const [hasta, setHasta] = useState(todayISO())
  const [filas, setFilas] = useState<FilaProducto[]>([])
  const [totales, setTotales] = useState({ total_vendido: 0, costo_total: 0, ganancia: 0 })
  const [porCanal, setPorCanal] = useState<{ canal: string; cantidad_ventas: number; total_vendido: number }[]>([])
  const [porMedioPago, setPorMedioPago] = useState<{ medio_pago: string; cantidad_pagos: number; total_vendido: number }[]>([])
  const [porCategoria, setPorCategoria] = useState<{ categoria: string; cantidad_vendida: number; total_vendido: number }[]>([])
  const [porTarjeta, setPorTarjeta] = useState<
    { medio_pago: string; tarjeta: string; cantidad_pagos: number; total_vendido: number }[]
  >([])

  async function cargar() {
    const [rent, canal, medioPago, tarjeta, categoria] = await Promise.all([
      api.reportes.rentabilidad(desde, hasta),
      api.reportes.ventasPorCanal(desde, hasta),
      api.reportes.ventasPorMedioPago(desde, hasta),
      api.reportes.ventasPorTarjeta(desde, hasta),
      api.reportes.ventasPorCategoria(desde, hasta)
    ])
    setFilas(rent.porProducto as FilaProducto[])
    setTotales(rent.totales)
    setPorCanal(canal)
    setPorMedioPago(medioPago)
    setPorTarjeta(tarjeta)
    setPorCategoria(categoria)
  }

  useEffect(() => {
    cargar()
  }, [])

  const cantidadVentas = useMemo(() => porCanal.reduce((acc, c) => acc + c.cantidad_ventas, 0), [porCanal])
  const ticketPromedio = cantidadVentas > 0 ? totales.total_vendido / cantidadVentas : 0
  const margen = totales.total_vendido > 0 ? (totales.ganancia / totales.total_vendido) * 100 : 0
  const productoTop = useMemo(() => filas.slice().sort((a, b) => b.total_vendido - a.total_vendido)[0], [filas])

  return (
    <div className="panel">
      <h2>Informes</h2>

      <div className="form-inline">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button className="primary" onClick={cargar}>
          Filtrar
        </button>
      </div>

      <section className="comprobante-kpis">
        <div className="kpi">
          <span>Total vendido</span>
          <strong>{formatMoney(totales.total_vendido)}</strong>
        </div>
        <div className="kpi">
          <span>Ganancia</span>
          <strong>{formatMoney(totales.ganancia)}</strong>
        </div>
        <div className="kpi">
          <span>Margen</span>
          <strong>{margen.toFixed(1)}%</strong>
        </div>
        <div className="kpi">
          <span>Cantidad de ventas</span>
          <strong>{cantidadVentas}</strong>
        </div>
        <div className="kpi">
          <span>Ticket promedio</span>
          <strong>{formatMoney(ticketPromedio)}</strong>
        </div>
      </section>
      {productoTop && (
        <p className="ayuda">
          Producto más vendido del período: <strong>{productoTop.nombre}</strong> ({formatMoney(productoTop.total_vendido)})
        </p>
      )}

      <div className="caja-tabs">
        <button className={tab === 'rentabilidad' ? 'primary' : ''} onClick={() => setTab('rentabilidad')}>
          Rentabilidad
        </button>
        <button className={tab === 'canal' ? 'primary' : ''} onClick={() => setTab('canal')}>
          Por canal
        </button>
        <button className={tab === 'medioPago' ? 'primary' : ''} onClick={() => setTab('medioPago')}>
          Por medio de pago
        </button>
        <button className={tab === 'tarjeta' ? 'primary' : ''} onClick={() => setTab('tarjeta')}>
          Por tarjeta / billetera
        </button>
        <button className={tab === 'categoria' ? 'primary' : ''} onClick={() => setTab('categoria')}>
          Por categoría
        </button>
      </div>

      {tab === 'rentabilidad' && (
        <div className="caja-tab-panel">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Total vendido</th>
                <th>% del total</th>
                <th>Costo</th>
                <th>Ganancia</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.producto_id}>
                  <td>{f.nombre}</td>
                  <td>{f.cantidad_vendida}</td>
                  <td>{formatMoney(f.total_vendido)}</td>
                  <td>{porcentaje(f.total_vendido, totales.total_vendido)}</td>
                  <td>{formatMoney(f.costo_total)}</td>
                  <td>{formatMoney(f.ganancia)}</td>
                  <td>{f.total_vendido ? `${((f.ganancia / f.total_vendido) * 100).toFixed(0)}%` : '-'}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7}>No hay ventas en el período seleccionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'canal' && (
        <div className="caja-tab-panel">
          <table>
            <thead>
              <tr>
                <th>Canal</th>
                <th>Cantidad de ventas</th>
                <th>Total vendido</th>
                <th>% del total</th>
              </tr>
            </thead>
            <tbody>
              {porCanal.map((c) => (
                <tr key={c.canal}>
                  <td>{CANAL_LABEL[c.canal] ?? c.canal}</td>
                  <td>{c.cantidad_ventas}</td>
                  <td>{formatMoney(c.total_vendido)}</td>
                  <td>{porcentaje(c.total_vendido, totales.total_vendido)}</td>
                </tr>
              ))}
              {porCanal.length === 0 && (
                <tr>
                  <td colSpan={4}>Sin ventas en el período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'medioPago' && (
        <div className="caja-tab-panel">
          <table>
            <thead>
              <tr>
                <th>Medio de pago</th>
                <th>Cantidad de pagos</th>
                <th>Total vendido</th>
                <th>% del total</th>
              </tr>
            </thead>
            <tbody>
              {porMedioPago.map((m) => (
                <tr key={m.medio_pago}>
                  <td>{m.medio_pago}</td>
                  <td>{m.cantidad_pagos}</td>
                  <td>{formatMoney(m.total_vendido)}</td>
                  <td>{porcentaje(m.total_vendido, totales.total_vendido)}</td>
                </tr>
              ))}
              {porMedioPago.length === 0 && (
                <tr>
                  <td colSpan={4}>Sin ventas en el período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tarjeta' && (
        <div className="caja-tab-panel">
          <table>
            <thead>
              <tr>
                <th>Medio de pago</th>
                <th>Tarjeta / billetera</th>
                <th>Cantidad de pagos</th>
                <th>Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {porTarjeta.map((t, idx) => (
                <tr key={idx}>
                  <td>{t.medio_pago}</td>
                  <td>{t.tarjeta}</td>
                  <td>{t.cantidad_pagos}</td>
                  <td>{formatMoney(t.total_vendido)}</td>
                </tr>
              ))}
              {porTarjeta.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay pagos con tarjeta en el período seleccionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'categoria' && (
        <div className="caja-tab-panel">
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Cantidad vendida</th>
                <th>Total vendido</th>
                <th>% del total</th>
              </tr>
            </thead>
            <tbody>
              {porCategoria.map((c) => (
                <tr key={c.categoria}>
                  <td>{c.categoria}</td>
                  <td>{c.cantidad_vendida}</td>
                  <td>{formatMoney(c.total_vendido)}</td>
                  <td>{porcentaje(c.total_vendido, totales.total_vendido)}</td>
                </tr>
              ))}
              {porCategoria.length === 0 && (
                <tr>
                  <td colSpan={4}>Sin ventas en el período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
