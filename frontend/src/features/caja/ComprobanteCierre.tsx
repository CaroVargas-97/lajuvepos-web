import { useEffect, useState } from 'react'
import type { Caja } from '../../lib/types'
import { formatDateTime, formatMoney } from '../../lib/format'
import { api } from '../../lib/api'

interface ResumenCaja {
  totales: { medio_pago: string; total: number }[]
  total_ventas: number
  total_descuentos: number
  cantidad_ventas: number
  total_ingresos: number
  total_egresos: number
  efectivo_esperado: number
}

interface Comprobante {
  caja: Caja
  resumen: ResumenCaja
  porCanal: { canal: string; cantidad_ventas: number; total_vendido: number }[]
  porCategoria: { categoria: string; cantidad_vendida: number; total_vendido: number }[]
  topProductos: { nombre: string; cantidad_vendida: number; total_vendido: number }[]
  movimientos: { tipo: string; motivo_nombre: string | null; concepto: string; monto: number; fecha: string }[]
  ticketPromedio: number
}

const MEDIO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  qr: 'QR',
  cuenta_corriente: 'Cuenta corriente',
  otro: 'Otro'
}

const CANAL_LABEL: Record<string, string> = {
  mostrador: 'Mostrador',
  pedidos_ya: 'PedidosYa',
  rappi: 'Rappi'
}

function porcentaje(parte: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((parte / total) * 100)}%`
}

export function ComprobanteCierre({ cajaId, onClose }: { cajaId: number; onClose: () => void }) {
  const [data, setData] = useState<Comprobante | null>(null)

  useEffect(() => {
    api.caja.comprobante(cajaId).then((res) => {
      if (res.ok && res.caja && res.resumen) {
        setData({
          caja: res.caja,
          resumen: res.resumen,
          porCanal: res.por_canal ?? [],
          porCategoria: res.por_categoria ?? [],
          topProductos: res.top_productos ?? [],
          movimientos: res.movimientos ?? [],
          ticketPromedio: res.ticket_promedio ?? 0
        })
      }
    })
  }, [cajaId])

  return (
    <div className="modal">
      <div className="modal-content comprobante-modal">
        <div className="comprobante-acciones">
          <button onClick={onClose}>Cerrar</button>
          <button className="primary" onClick={() => window.print()} disabled={!data}>
            Imprimir / Exportar PDF
          </button>
        </div>

        {!data && <p>Cargando comprobante...</p>}

        {data && (
          <div className="comprobante imprimible">
            <header className="comprobante-header">
              <h2>LaJuvePOS</h2>
              <h3>Comprobante de cierre de caja #{data.caja.id}</h3>
              <p>
                Abrió <strong>{data.caja.usuario_nombre}</strong> el {formatDateTime(data.caja.fecha_apertura)}
                {data.caja.fecha_cierre && (
                  <>
                    {' '}
                    — Cerró <strong>{data.caja.usuario_cierre_nombre ?? '-'}</strong> el {formatDateTime(data.caja.fecha_cierre)}
                  </>
                )}
              </p>
            </header>

            <section className="comprobante-kpis">
              <div className="kpi">
                <span>Total vendido</span>
                <strong>{formatMoney(data.resumen.total_ventas)}</strong>
              </div>
              <div className="kpi">
                <span>Cantidad de ventas</span>
                <strong>{data.resumen.cantidad_ventas}</strong>
              </div>
              <div className="kpi">
                <span>Ticket promedio</span>
                <strong>{formatMoney(data.ticketPromedio)}</strong>
              </div>
              <div className="kpi">
                <span>Descuentos otorgados</span>
                <strong>{formatMoney(data.resumen.total_descuentos)}</strong>
              </div>
            </section>

            <section>
              <h4>Efectivo</h4>
              <table className="detalle-venta">
                <tbody>
                  <tr>
                    <td>Monto inicial</td>
                    <td>{formatMoney(data.caja.monto_inicial)}</td>
                  </tr>
                  <tr>
                    <td>Efectivo esperado al cierre</td>
                    <td>{formatMoney(data.resumen.efectivo_esperado)}</td>
                  </tr>
                  {data.caja.monto_final_declarado != null && (
                    <>
                      <tr>
                        <td>Monto contado (declarado)</td>
                        <td>{formatMoney(data.caja.monto_final_declarado)}</td>
                      </tr>
                      <tr>
                        <td>Diferencia</td>
                        <td className={data.caja.monto_final_declarado === data.resumen.efectivo_esperado ? 'ok' : 'error'}>
                          {formatMoney(data.caja.monto_final_declarado - data.resumen.efectivo_esperado)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </section>

            <section>
              <h4>Ventas por medio de pago</h4>
              <table className="detalle-venta">
                <thead>
                  <tr>
                    <th>Medio</th>
                    <th>Total</th>
                    <th>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resumen.totales.map((t) => (
                    <tr key={t.medio_pago}>
                      <td>{MEDIO_PAGO_LABEL[t.medio_pago] ?? t.medio_pago}</td>
                      <td>{formatMoney(t.total)}</td>
                      <td>{porcentaje(t.total, data.resumen.total_ventas)}</td>
                    </tr>
                  ))}
                  {data.resumen.totales.length === 0 && (
                    <tr>
                      <td colSpan={3}>Sin ventas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section>
              <h4>Ventas por canal</h4>
              <table className="detalle-venta">
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porCanal.map((c) => (
                    <tr key={c.canal}>
                      <td>{CANAL_LABEL[c.canal] ?? c.canal}</td>
                      <td>{c.cantidad_ventas}</td>
                      <td>{formatMoney(c.total_vendido)}</td>
                      <td>{porcentaje(c.total_vendido, data.resumen.total_ventas)}</td>
                    </tr>
                  ))}
                  {data.porCanal.length === 0 && (
                    <tr>
                      <td colSpan={4}>Sin ventas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section>
              <h4>Ventas por categoría</h4>
              <table className="detalle-venta">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porCategoria.map((c) => (
                    <tr key={c.categoria}>
                      <td>{c.categoria}</td>
                      <td>{c.cantidad_vendida}</td>
                      <td>{formatMoney(c.total_vendido)}</td>
                      <td>{porcentaje(c.total_vendido, data.resumen.total_ventas)}</td>
                    </tr>
                  ))}
                  {data.porCategoria.length === 0 && (
                    <tr>
                      <td colSpan={4}>Sin ventas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section>
              <h4>Productos más vendidos</h4>
              <table className="detalle-venta">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProductos.map((p) => (
                    <tr key={p.nombre}>
                      <td>{p.nombre}</td>
                      <td>{p.cantidad_vendida}</td>
                      <td>{formatMoney(p.total_vendido)}</td>
                    </tr>
                  ))}
                  {data.topProductos.length === 0 && (
                    <tr>
                      <td colSpan={3}>Sin ventas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {data.movimientos.length > 0 && (
              <section>
                <h4>Movimientos de caja</h4>
                <table className="detalle-venta">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Motivo</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movimientos.map((m, idx) => (
                      <tr key={idx}>
                        <td>{formatDateTime(m.fecha)}</td>
                        <td>{m.motivo_nombre ?? '-'}</td>
                        <td>{m.concepto}</td>
                        <td>{m.tipo === 'egreso' ? '-' : '+'}{formatMoney(m.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.caja.comentario && (
              <section>
                <h4>Comentario</h4>
                <p>{data.caja.comentario}</p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
