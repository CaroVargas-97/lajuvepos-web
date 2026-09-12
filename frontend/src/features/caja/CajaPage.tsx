import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Caja, MotivoCaja } from '../../lib/types'
import { formatDateTime, formatMoney } from '../../lib/format'
import { api } from '../../lib/api'

interface MovimientoCaja {
  id: number
  tipo: 'ingreso' | 'egreso'
  categoria: string
  motivo_nombre: string | null
  concepto: string
  monto: number
  fecha: string
}

interface VentaDeCaja {
  id: number
  fecha: string
  total: number
  medio_pago: string
  canal: string
  anulada: number
  items: number
}

interface DetalleVenta {
  venta: { id: number; fecha: string; total: number; medio_pago: string; canal: string }
  items: { producto_nombre: string; cantidad: number; precio_unitario: number; subtotal: number; nota: string | null }[]
  pagos: { medio_pago: string; tarjeta: string | null; monto: number }[]
}

export function CajaPage() {
  const { usuario } = useAuth()
  const [caja, setCaja] = useState<Caja | null>(null)
  const [historial, setHistorial] = useState<Caja[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [cajaVentasId, setCajaVentasId] = useState<number | null>(null)
  const [ventas, setVentas] = useState<VentaDeCaja[]>([])
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null)
  const [detalleVenta, setDetalleVenta] = useState<DetalleVenta | null>(null)
  const [resumen, setResumen] = useState<{
    totales: { medio_pago: string; total: number }[]
    totalVentas: number
    totalDescuentos: number
    cantidadVentas: number
    totalIngresos: number
    totalEgresos: number
    efectivoEsperado: number
  } | null>(null)
  const [montoInicial, setMontoInicial] = useState('')
  const [montoFinal, setMontoFinal] = useState('')
  const [comentarioCierre, setComentarioCierre] = useState('')
  const [horaEsperada, setHoraEsperada] = useState<string | null>(null)
  const [motivos, setMotivos] = useState<MotivoCaja[]>([])
  const [movForm, setMovForm] = useState({ motivoId: '', concepto: '', monto: '' })
  const [resultadoCierre, setResultadoCierre] = useState<{
    totales: { medio_pago: string; total: number }[]
    totalVentas: number
    totalDescuentos: number
    cantidadVentas: number
    totalIngresos: number
    totalEgresos: number
    efectivoEsperado: number
    diferencia: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'resumen' | 'movimientos' | 'ventas' | 'historial'>('resumen')

  async function cargar() {
    const [actual, hist, hora, motivosActivos] = await Promise.all([
      api.caja.actual(),
      api.caja.historial(),
      api.configuracion.obtener('hora_apertura_esperada'),
      api.motivosCaja.listar(true)
    ])
    setCaja(actual)
    setHoraEsperada(hora)
    setHistorial(hist)
    setMotivos(motivosActivos)
    if (actual) {
      setMovimientos((await api.movimientosCaja.listarPorCaja(actual.id)) as MovimientoCaja[])
      setCajaVentasId(actual.id)
      setVentas((await api.ventas.listarPorCaja(actual.id)) as VentaDeCaja[])
      const res = await api.caja.resumen(actual.id)
      setResumen(
        res.ok
          ? {
              totales: res.totales ?? [],
              totalVentas: res.total_ventas ?? 0,
              totalDescuentos: res.total_descuentos ?? 0,
              cantidadVentas: res.cantidad_ventas ?? 0,
              totalIngresos: res.total_ingresos ?? 0,
              totalEgresos: res.total_egresos ?? 0,
              efectivoEsperado: res.efectivo_esperado ?? 0
            }
          : null
      )
    } else {
      setMovimientos([])
      setResumen(null)
    }
  }

  async function borrarCaja(c: Caja) {
    const confirmado = window.confirm(
      `¿Borrar el cierre de caja del ${formatDateTime(c.fecha_apertura)}?\n\n` +
        'Esto elimina permanentemente esa caja y todas sus ventas, pagos y notas de crédito asociadas.\n' +
        'OJO: no revierte el stock descontado ni los saldos de cuenta corriente usados en esas ventas.\n' +
        'Usalo solo para limpiar pruebas, no para deshacer una venta real.'
    )
    if (!confirmado) return

    const res = await api.caja.eliminar(c.id)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo borrar la caja')
      return
    }
    if (cajaVentasId === c.id) {
      setCajaVentasId(null)
      setVentas([])
      setVentaExpandida(null)
      setDetalleVenta(null)
    }
    cargar()
  }

  async function verVentasDeCaja(cajaId: number) {
    if (cajaVentasId === cajaId) return
    setCajaVentasId(cajaId)
    setVentaExpandida(null)
    setDetalleVenta(null)
    setVentas((await api.ventas.listarPorCaja(cajaId)) as VentaDeCaja[])
  }

  useEffect(() => {
    cargar()
  }, [])

  async function abrirCaja() {
    setError(null)
    const monto = Number(montoInicial)
    if (Number.isNaN(monto) || monto < 0) {
      setError('Ingresá un monto inicial válido')
      return
    }
    const res = await api.caja.abrir(monto, usuario!.id)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo abrir la caja')
      return
    }
    setMontoInicial('')
    cargar()
  }

  async function cerrarCaja() {
    if (!caja || !usuario) return
    setError(null)
    const monto = Number(montoFinal)
    if (Number.isNaN(monto) || monto < 0) {
      setError('Ingresá el monto contado válido')
      return
    }
    const confirmado = window.confirm(`¿Confirmás que ${usuario.nombre} está cerrando la caja?`)
    if (!confirmado) return
    const res = await api.caja.cerrar(caja.id, monto, usuario!.id, comentarioCierre)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo cerrar la caja')
      return
    }
    setResultadoCierre({
      totales: res.totales ?? [],
      totalVentas: res.total_ventas ?? 0,
      totalDescuentos: res.total_descuentos ?? 0,
      cantidadVentas: res.cantidad_ventas ?? 0,
      totalIngresos: res.total_ingresos ?? 0,
      totalEgresos: res.total_egresos ?? 0,
      efectivoEsperado: res.efectivo_esperado ?? 0,
      diferencia: res.diferencia ?? 0
    })
    setMontoFinal('')
    setComentarioCierre('')
    cargar()
  }

  async function agregarMovimiento(e: FormEvent) {
    e.preventDefault()
    if (!caja || !usuario) return
    const monto = Number(movForm.monto)
    if (Number.isNaN(monto) || monto <= 0 || !movForm.motivoId) {
      setError('Elegí un motivo y un monto válido')
      return
    }
    const res = await api.movimientosCaja.crear({
      cajaId: caja.id,
      motivoId: Number(movForm.motivoId),
      concepto: movForm.concepto,
      monto,
      usuarioId: usuario.id
    })
    if (!res.ok) {
      setError(res.error ?? 'No se pudo registrar el movimiento')
      return
    }
    setMovForm({ motivoId: '', concepto: '', monto: '' })
    setError(null)
    cargar()
  }

  async function toggleDetalle(ventaId: number) {
    if (ventaExpandida === ventaId) {
      setVentaExpandida(null)
      setDetalleVenta(null)
      return
    }
    setVentaExpandida(ventaId)
    setDetalleVenta(await api.ventas.detalle(ventaId))
  }

  function abrioATiempo(c: Caja): boolean | null {
    if (!horaEsperada) return null
    // fecha_apertura viene en UTC: hay que pasarla a hora local antes de comparar,
    // si no todas las aperturas se corren 3hs y el indicador queda mal.
    const horaApertura = new Date(c.fecha_apertura).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return horaApertura <= horaEsperada
  }

  const cajaSeleccionadaInfo = caja && caja.id === cajaVentasId ? caja : historial.find((c) => c.id === cajaVentasId) ?? null

  return (
    <div className="panel">
      <h2>Caja</h2>

      {!caja && (
        <div className="caja-box">
          <p>No hay una caja abierta.</p>
          <label>
            Monto inicial
            <input type="number" min={0} value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" onClick={abrirCaja}>
            Abrir caja
          </button>
        </div>
      )}

      {caja && (
        <div className="caja-box">
          <p>
            Caja abierta por <strong>{caja.usuario_nombre}</strong> desde {formatDateTime(caja.fecha_apertura)} — Monto
            inicial {formatMoney(caja.monto_inicial)}
          </p>
          {resumen && (
            <p className="mensaje">
              Efectivo esperado en este momento: <strong>{formatMoney(resumen.efectivoEsperado)}</strong>
            </p>
          )}
          <label>
            Monto contado al cierre
            <input type="number" min={0} value={montoFinal} onChange={(e) => setMontoFinal(e.target.value)} />
          </label>
          <label>
            Comentario (opcional)
            <textarea
              rows={2}
              placeholder="Ej: faltaron $500, se usaron para..."
              value={comentarioCierre}
              onChange={(e) => setComentarioCierre(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" onClick={cerrarCaja}>
            Cerrar caja
          </button>
        </div>
      )}

      {resultadoCierre && (
        <div className="cierre-resultado">
          <h3>Resumen del cierre</h3>
          <p>
            Total vendido ({resultadoCierre.cantidadVentas} ventas): <strong>{formatMoney(resultadoCierre.totalVentas)}</strong>
          </p>
          {resultadoCierre.totalDescuentos > 0 && <p>Descuentos otorgados: {formatMoney(resultadoCierre.totalDescuentos)}</p>}
          <ul>
            {resultadoCierre.totales.map((t) => (
              <li key={t.medio_pago}>
                {t.medio_pago}: {formatMoney(t.total)}
              </li>
            ))}
          </ul>
          <p>Ingresos extra: {formatMoney(resultadoCierre.totalIngresos)}</p>
          <p>Egresos (gastos/retiros): {formatMoney(resultadoCierre.totalEgresos)}</p>
          <p>Efectivo esperado: {formatMoney(resultadoCierre.efectivoEsperado)}</p>
          <p className={resultadoCierre.diferencia === 0 ? 'ok' : 'error'}>
            Diferencia: {formatMoney(resultadoCierre.diferencia)}
          </p>
          <p className="ayuda">El comprobante completo con el análisis lo podés ver en la sección Cierres.</p>
        </div>
      )}

      <div className="caja-tabs">
        <button className={tab === 'resumen' ? 'primary' : ''} onClick={() => setTab('resumen')}>
          Resumen
        </button>
        <button className={tab === 'movimientos' ? 'primary' : ''} onClick={() => setTab('movimientos')}>
          Gastos y movimientos
        </button>
        <button className={tab === 'ventas' ? 'primary' : ''} onClick={() => setTab('ventas')}>
          Ventas
        </button>
        <button className={tab === 'historial' ? 'primary' : ''} onClick={() => setTab('historial')}>
          Historial de cajas
        </button>
      </div>

      {tab === 'resumen' && (
        <div className="caja-tab-panel">
          {resumen ? (
            <div className="resumen-vivo">
              <h3>Resumen en vivo</h3>
              <div className="totales-row">
                <div>
                  <span>Ventas ({resumen.cantidadVentas})</span>
                  <strong>{formatMoney(resumen.totalVentas)}</strong>
                </div>
                {resumen.totalDescuentos > 0 && (
                  <div>
                    <span>Descuentos otorgados</span>
                    <strong>{formatMoney(resumen.totalDescuentos)}</strong>
                  </div>
                )}
                <div>
                  <span>Ingresos extra</span>
                  <strong>{formatMoney(resumen.totalIngresos)}</strong>
                </div>
                <div>
                  <span>Gastos / retiros</span>
                  <strong>{formatMoney(resumen.totalEgresos)}</strong>
                </div>
                <div>
                  <span>Efectivo esperado ahora</span>
                  <strong>{formatMoney(resumen.efectivoEsperado)}</strong>
                </div>
              </div>
              {resumen.totales.length > 0 && (
                <ul className="resumen-por-medio">
                  {resumen.totales.map((t) => (
                    <li key={t.medio_pago}>
                      {t.medio_pago}: {formatMoney(t.total)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p>No hay una caja abierta.</p>
          )}
        </div>
      )}

      {tab === 'movimientos' && (
        <div className="caja-tab-panel">
          {caja ? (
            <>
              <form className="form-inline" onSubmit={agregarMovimiento}>
                <select value={movForm.motivoId} onChange={(e) => setMovForm({ ...movForm, motivoId: e.target.value })}>
                  <option value="">Motivo...</option>
                  <optgroup label="Ingresos">
                    {motivos
                      .filter((m) => m.tipo === 'ingreso')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Egresos">
                    {motivos
                      .filter((m) => m.tipo === 'egreso')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <input
                  placeholder="Detalle (opcional)"
                  value={movForm.concepto}
                  onChange={(e) => setMovForm({ ...movForm, concepto: e.target.value })}
                />
                <input
                  placeholder="Monto"
                  type="number"
                  value={movForm.monto}
                  onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                />
                <button className="primary" type="submit">
                  Registrar
                </button>
              </form>

              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Detalle</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDateTime(m.fecha)}</td>
                      <td>{m.tipo}</td>
                      <td>{m.motivo_nombre ?? '-'}</td>
                      <td>{m.concepto}</td>
                      <td>{formatMoney(m.monto)}</td>
                    </tr>
                  ))}
                  {movimientos.length === 0 && (
                    <tr>
                      <td colSpan={5}>Sin movimientos registrados en esta caja.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <p>No hay una caja abierta.</p>
          )}
        </div>
      )}

      {tab === 'ventas' && (
        <div className="caja-tab-panel">
          <h3>
            Ventas de la caja del {cajaSeleccionadaInfo ? formatDateTime(cajaSeleccionadaInfo.fecha_apertura) : ''}
            {cajaSeleccionadaInfo?.estado === 'abierta' ? ' (abierta)' : cajaSeleccionadaInfo ? ' (cerrada)' : ''}
          </h3>
          {!cajaSeleccionadaInfo && <p className="ayuda">Elegí una caja desde "Historial de cajas" para ver sus ventas.</p>}
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Canal</th>
                <th>Medio de pago</th>
                <th>Productos</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <Fragment key={v.id}>
                  <tr className="fila-clickeable" onClick={() => toggleDetalle(v.id)}>
                    <td>{formatDateTime(v.fecha)}</td>
                    <td>{v.canal}</td>
                    <td>{v.medio_pago}</td>
                    <td>{v.items}</td>
                    <td>{formatMoney(v.total)}</td>
                  </tr>
                  {ventaExpandida === v.id && (
                    <tr>
                      <td colSpan={5}>
                        {!detalleVenta && <p>Cargando detalle...</p>}
                        {detalleVenta && (
                          <table className="detalle-venta">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>P. unitario</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalleVenta.items.map((it, idx) => (
                                <tr key={idx}>
                                  <td>
                                    {it.producto_nombre}
                                    {it.nota && <small> — {it.nota}</small>}
                                  </td>
                                  <td>{it.cantidad}</td>
                                  <td>{formatMoney(it.precio_unitario)}</td>
                                  <td>{formatMoney(it.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {detalleVenta && (detalleVenta.pagos.length > 1 || detalleVenta.pagos.some((p) => p.tarjeta)) && (
                          <p className="pagos-detalle">
                            {detalleVenta.pagos.length > 1 ? 'Pago dividido: ' : 'Pago: '}
                            {detalleVenta.pagos.map((p, i) => (
                              <span key={i}>
                                {p.medio_pago}
                                {p.tarjeta ? ` (${p.tarjeta})` : ''} {formatMoney(p.monto)}
                                {i < detalleVenta.pagos.length - 1 ? ' + ' : ''}
                              </span>
                            ))}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={5}>Todavía no se registraron ventas en esta caja.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'historial' && (
        <div className="caja-tab-panel">
          <p className="ayuda">Hacé clic en una fila para ver sus ventas en la pestaña "Ventas".</p>
          <table>
            <thead>
              <tr>
                <th>Abrió</th>
                <th>Apertura</th>
                <th>Cerró</th>
                <th>Cierre</th>
                <th>Inicial</th>
                <th>Declarado</th>
                <th>Estado</th>
                <th>Horario</th>
                {usuario?.rol === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {historial.map((c) => {
                const puntual = abrioATiempo(c)
                return (
                  <tr
                    key={c.id}
                    className={`fila-clickeable ${cajaVentasId === c.id ? 'fila-seleccionada' : ''}`}
                    onClick={() => {
                      verVentasDeCaja(c.id)
                      setTab('ventas')
                    }}
                  >
                    <td>{c.usuario_nombre}</td>
                    <td>{formatDateTime(c.fecha_apertura)}</td>
                    <td>{c.usuario_cierre_nombre ?? '-'}</td>
                    <td>{c.fecha_cierre ? formatDateTime(c.fecha_cierre) : '-'}</td>
                    <td>{formatMoney(c.monto_inicial)}</td>
                    <td>{c.monto_final_declarado != null ? formatMoney(c.monto_final_declarado) : '-'}</td>
                    <td>{c.estado}</td>
                    <td className={puntual === false ? 'error' : puntual === true ? 'ok' : ''}>
                      {puntual === null ? '-' : puntual ? 'A horario' : 'Tarde'}
                    </td>
                    {usuario?.rol === 'admin' && (
                      <td>
                        {c.estado === 'cerrada' && (
                          <button
                            className="link"
                            onClick={(e) => {
                              e.stopPropagation()
                              borrarCaja(c)
                            }}
                          >
                            borrar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
