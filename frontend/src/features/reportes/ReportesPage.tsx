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

const TAB_LABEL: Record<Tab, string> = {
  rentabilidad: 'Rentabilidad',
  canal: 'Por canal',
  medioPago: 'Por medio de pago',
  tarjeta: 'Por tarjeta o billetera',
  categoria: 'Por categoría'
}

function porcentaje(parte: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((parte / total) * 100)}%`
}

function descargarCSV(nombreArchivo: string, filas: (string | number)[][]) {
  const contenido = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Calcula el período inmediatamente anterior, de la misma duración, para poder
// comparar "esta semana vs. la anterior" sin que el usuario tenga que elegirlo a mano.
function periodoAnterior(desde: string, hasta: string) {
  const inicio = new Date(desde + 'T00:00:00')
  const fin = new Date(hasta + 'T00:00:00')
  const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1
  const finAnterior = new Date(inicio.getTime() - 86400000)
  const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * 86400000)
  return { desde: inicioAnterior.toISOString().slice(0, 10), hasta: finAnterior.toISOString().slice(0, 10) }
}

function Variacion({ actual, anterior }: { actual: number; anterior: number }) {
  if (!anterior) return null
  const cambio = ((actual - anterior) / anterior) * 100
  const subio = cambio >= 0
  return (
    <span className={`variacion ${subio ? 'variacion-up' : 'variacion-down'}`}>
      {subio ? '▲' : '▼'} {Math.abs(cambio).toFixed(0)}% vs. período anterior
    </span>
  )
}

function BarrasComparativas({ filas }: { filas: { etiqueta: string; valor: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor))
  return (
    <div className="barras-chart no-imprimir">
      {filas.map((f) => (
        <div className="barra-fila" key={f.etiqueta}>
          <span className="barra-label">{f.etiqueta}</span>
          <div className="barra-track">
            <div className="barra-fill" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
          <span className="barra-valor">{formatMoney(f.valor)}</span>
        </div>
      ))}
      {filas.length === 0 && <p className="ayuda">Sin datos para graficar en este período.</p>}
    </div>
  )
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
  const [anterior, setAnterior] = useState({ total_vendido: 0, ganancia: 0, cantidad_ventas: 0, ticket_promedio: 0 })
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setError(null)
    try {
      const prev = periodoAnterior(desde, hasta)
      const [rent, canal, medioPago, tarjeta, categoria, rentAnt, canalAnt] = await Promise.all([
        api.reportes.rentabilidad(desde, hasta),
        api.reportes.ventasPorCanal(desde, hasta),
        api.reportes.ventasPorMedioPago(desde, hasta),
        api.reportes.ventasPorTarjeta(desde, hasta),
        api.reportes.ventasPorCategoria(desde, hasta),
        api.reportes.rentabilidad(prev.desde, prev.hasta),
        api.reportes.ventasPorCanal(prev.desde, prev.hasta)
      ])
      // Si el backend devuelve algo inesperado (ej. un reinicio del servidor a mitad de
      // pedido), usamos valores por defecto en vez de romper toda la pantalla.
      setFilas((rent?.por_producto as FilaProducto[]) ?? [])
      setTotales(rent?.totales ?? { total_vendido: 0, costo_total: 0, ganancia: 0 })
      setPorCanal(canal ?? [])
      setPorMedioPago(medioPago ?? [])
      setPorTarjeta(tarjeta ?? [])
      setPorCategoria(categoria ?? [])

      const cantidadAnt = (canalAnt ?? []).reduce((acc: number, c: { cantidad_ventas: number }) => acc + c.cantidad_ventas, 0)
      const totalAnt = rentAnt?.totales?.total_vendido ?? 0
      setAnterior({
        total_vendido: totalAnt,
        ganancia: rentAnt?.totales?.ganancia ?? 0,
        cantidad_ventas: cantidadAnt,
        ticket_promedio: cantidadAnt > 0 ? totalAnt / cantidadAnt : 0
      })
    } catch {
      setError('No se pudieron cargar los reportes. Probá de nuevo en unos segundos.')
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const cantidadVentas = useMemo(() => porCanal.reduce((acc, c) => acc + c.cantidad_ventas, 0), [porCanal])
  const ticketPromedio = cantidadVentas > 0 ? totales.total_vendido / cantidadVentas : 0
  const margen = totales.total_vendido > 0 ? (totales.ganancia / totales.total_vendido) * 100 : 0
  const productoTop = useMemo(() => filas.slice().sort((a, b) => b.total_vendido - a.total_vendido)[0], [filas])

  const barrasCanal = useMemo(
    () => porCanal.map((c) => ({ etiqueta: CANAL_LABEL[c.canal] ?? c.canal, valor: c.total_vendido })),
    [porCanal]
  )
  const barrasMedioPago = useMemo(() => porMedioPago.map((m) => ({ etiqueta: m.medio_pago, valor: m.total_vendido })), [porMedioPago])
  const barrasCategoria = useMemo(
    () =>
      porCategoria
        .slice()
        .sort((a, b) => b.total_vendido - a.total_vendido)
        .slice(0, 8)
        .map((c) => ({ etiqueta: c.categoria, valor: c.total_vendido })),
    [porCategoria]
  )

  function imprimir() {
    window.print()
  }

  function exportarCSV() {
    let encabezados: string[]
    let filasDatos: (string | number)[][]

    if (tab === 'rentabilidad') {
      encabezados = ['Producto', 'Cantidad', 'Total vendido', '% del total', 'Costo', 'Ganancia', 'Margen']
      filasDatos = filas.map((f) => [
        f.nombre,
        f.cantidad_vendida,
        f.total_vendido,
        porcentaje(f.total_vendido, totales.total_vendido),
        f.costo_total,
        f.ganancia,
        f.total_vendido ? `${((f.ganancia / f.total_vendido) * 100).toFixed(0)}%` : '-'
      ])
    } else if (tab === 'canal') {
      encabezados = ['Canal', 'Cantidad de ventas', 'Total vendido', '% del total']
      filasDatos = porCanal.map((c) => [
        CANAL_LABEL[c.canal] ?? c.canal,
        c.cantidad_ventas,
        c.total_vendido,
        porcentaje(c.total_vendido, totales.total_vendido)
      ])
    } else if (tab === 'medioPago') {
      encabezados = ['Medio de pago', 'Cantidad de pagos', 'Total vendido', '% del total']
      filasDatos = porMedioPago.map((m) => [
        m.medio_pago,
        m.cantidad_pagos,
        m.total_vendido,
        porcentaje(m.total_vendido, totales.total_vendido)
      ])
    } else if (tab === 'tarjeta') {
      encabezados = ['Medio de pago', 'Tarjeta / billetera', 'Cantidad de pagos', 'Total vendido']
      filasDatos = porTarjeta.map((t) => [t.medio_pago, t.tarjeta, t.cantidad_pagos, t.total_vendido])
    } else {
      encabezados = ['Categoría', 'Cantidad vendida', 'Total vendido', '% del total']
      filasDatos = porCategoria.map((c) => [
        c.categoria,
        c.cantidad_vendida,
        c.total_vendido,
        porcentaje(c.total_vendido, totales.total_vendido)
      ])
    }

    descargarCSV(`reporte-${tab}-${desde}-a-${hasta}.csv`, [encabezados, ...filasDatos])
  }

  return (
    <div className="panel">
      <h2 className="no-imprimir">Informes</h2>

      <div className="form-inline no-imprimir">
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
        <button onClick={imprimir}>Imprimir</button>
        <button onClick={exportarCSV}>Exportar CSV</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="imprimible">
        <div className="comprobante-header solo-imprimir">
          <h2>LaJuvePOS — Informe de {TAB_LABEL[tab]}</h2>
          <p>
            Período: {desde} a {hasta}
          </p>
        </div>

        <section className="comprobante-kpis">
        <div className="kpi">
          <span>Total vendido</span>
          <strong>{formatMoney(totales.total_vendido)}</strong>
          <Variacion actual={totales.total_vendido} anterior={anterior.total_vendido} />
        </div>
        <div className="kpi">
          <span>Ganancia</span>
          <strong>{formatMoney(totales.ganancia)}</strong>
          <Variacion actual={totales.ganancia} anterior={anterior.ganancia} />
        </div>
        <div className="kpi">
          <span>Margen</span>
          <strong>{margen.toFixed(1)}%</strong>
        </div>
        <div className="kpi">
          <span>Cantidad de ventas</span>
          <strong>{cantidadVentas}</strong>
          <Variacion actual={cantidadVentas} anterior={anterior.cantidad_ventas} />
        </div>
        <div className="kpi">
          <span>Ticket promedio</span>
          <strong>{formatMoney(ticketPromedio)}</strong>
          <Variacion actual={ticketPromedio} anterior={anterior.ticket_promedio} />
        </div>
      </section>
      {productoTop && (
        <p className="ayuda">
          Producto más vendido del período: <strong>{productoTop.nombre}</strong> ({formatMoney(productoTop.total_vendido)})
        </p>
      )}

      <div className="caja-tabs no-imprimir">
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
          <BarrasComparativas filas={barrasCanal} />
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
          <BarrasComparativas filas={barrasMedioPago} />
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
          <BarrasComparativas filas={barrasCategoria} />
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
    </div>
  )
}
