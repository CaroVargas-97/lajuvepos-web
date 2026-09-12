import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Canal, Caja, CarritoItem, Cliente, MedioPago, Producto } from '../../lib/types'
import { formatMoney } from '../../lib/format'
import { api } from '../../lib/api'

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'qr', label: 'QR' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' }
]

const CANALES: { value: Canal; label: string }[] = [
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'pedidos_ya', label: 'PedidosYa' },
  { value: 'rappi', label: 'Rappi' }
]

const TARJETAS = ['Visa', 'Mastercard', 'Maestro', 'American Express', 'Cabal', 'Naranja X', 'Otra']
const BILLETERAS_QR = ['Mercado Pago', 'MODO', 'Cuenta DNI', 'Otra']

interface PagoForm {
  medioPago: MedioPago
  tarjeta: string
  monto: string
}

function esConTarjeta(medioPago: MedioPago) {
  return medioPago === 'debito' || medioPago === 'credito'
}

function esConBilletera(medioPago: MedioPago) {
  return medioPago === 'qr'
}

function esConProveedor(medioPago: MedioPago) {
  return esConTarjeta(medioPago) || esConBilletera(medioPago)
}

export function VentasPage() {
  const { usuario } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [pagos, setPagos] = useState<PagoForm[]>([{ medioPago: 'efectivo', tarjeta: '', monto: '0' }])
  const [canal, setCanal] = useState<Canal>('mostrador')
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [caja, setCaja] = useState<Caja | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<string>('todas')
  const [descuento, setDescuento] = useState('0')
  const [pesoTexto, setPesoTexto] = useState<Record<number, string>>({})
  const [unidadPeso, setUnidadPeso] = useState<Record<number, 'kg' | 'g'>>({})
  const [precioTexto, setPrecioTexto] = useState<Record<number, string>>({})
  const [notaTexto, setNotaTexto] = useState<Record<number, string>>({})

  async function cargar() {
    const [prods, cajaActual, cli] = await Promise.all([
      api.productos.listar(),
      api.caja.actual(),
      api.clientes.listar()
    ])
    setProductos(prods.filter((p) => p.activo))
    setCaja(cajaActual)
    setClientes(cli)
  }

  useEffect(() => {
    cargar()
  }, [])

  const subtotalBruto = useMemo(() => carrito.reduce((acc, i) => acc + i.cantidad * precioEfectivo(i), 0), [carrito, precioTexto])
  const descuentoNum = Math.min(Number(descuento) || 0, subtotalBruto)
  const total = Math.max(subtotalBruto - descuentoNum, 0)

  const totalPagos = useMemo(() => pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0), [pagos])
  const restante = Math.round((total - totalPagos) * 100) / 100

  useEffect(() => {
    if (pagos.length === 1) {
      setPagos([{ ...pagos[0], monto: total ? String(total) : '0' }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  function actualizarPago(index: number, cambios: Partial<PagoForm>) {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, ...cambios } : p)))
  }

  function agregarPago() {
    setPagos((prev) => [...prev, { medioPago: 'efectivo', tarjeta: '', monto: restante > 0 ? String(restante) : '0' }])
  }

  function quitarPago(index: number) {
    setPagos((prev) => prev.filter((_, i) => i !== index))
  }

  const usaCuentaCorriente = pagos.some((p) => p.medioPago === 'cuenta_corriente')

  const categorias = useMemo(
    () => ['todas', ...Array.from(new Set(productos.map((p) => p.categoria || 'Sin categoría')))],
    [productos]
  )

  const productosFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoria === 'todas' || (p.categoria || 'Sin categoría') === categoria
    return coincideNombre && coincideCategoria
  })

  const productosAgrupados = useMemo(() => {
    const grupos = new Map<string, Producto[]>()
    for (const p of productosFiltrados) {
      const cat = p.categoria || 'Sin categoría'
      if (!grupos.has(cat)) grupos.set(cat, [])
      grupos.get(cat)!.push(p)
    }
    return Array.from(grupos.entries())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosFiltrados])

  function esPorKilo(producto: Producto) {
    return producto.unidad.toLowerCase() === 'kg'
  }

  // "Pasta del día" cambia de sabor y de precio según lo que se cocine o pida el
  // cliente, así que es el único producto donde se puede escribir qué es y ajustar
  // el precio al momento de vender.
  function esPastaDelDia(producto: Producto) {
    return producto.nombre.trim().toLowerCase() === 'pasta del dia'
  }

  function precioEfectivo(item: CarritoItem) {
    if (!esPastaDelDia(item.producto)) return item.producto.precio_venta
    const texto = precioTexto[item.producto.id]
    const valor = Number(texto)
    return texto && Number.isFinite(valor) && valor >= 0 ? valor : 0
  }

  function agregarProducto(producto: Producto) {
    setMensaje(null)
    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        if (esPorKilo(producto)) return prev
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      if (esPorKilo(producto)) {
        setPesoTexto((g) => ({ ...g, [producto.id]: '' }))
        setUnidadPeso((u) => ({ ...u, [producto.id]: 'kg' }))
        return [...prev, { producto, cantidad: 0 }]
      }
      if (esPastaDelDia(producto)) {
        setPrecioTexto((p) => ({ ...p, [producto.id]: String(producto.precio_venta) }))
        setNotaTexto((n) => ({ ...n, [producto.id]: '' }))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function cambiarCantidad(productoId: number, cantidad: number) {
    setCarrito((prev) => prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad: Math.max(1, cantidad) } : i)))
  }

  // Para productos por kilo el campo queda en blanco hasta que el cajero escribe el peso
  // (a elección, en kilos o en gramos): si borrase el rectángulo o forzáramos un mínimo
  // automático, el ítem desaparecería del carrito o saltaría solo mientras está escribiendo.
  function cambiarPeso(productoId: number, texto: string, unidad: 'kg' | 'g') {
    setPesoTexto((prev) => ({ ...prev, [productoId]: texto }))
    const valor = Number(texto)
    const invalido = texto.trim() === '' || Number.isNaN(valor) || valor < 0
    const cantidad = invalido ? 0 : unidad === 'kg' ? valor : valor / 1000
    setCarrito((prev) => prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i)))
  }

  function cambiarUnidadPeso(productoId: number, unidad: 'kg' | 'g') {
    setUnidadPeso((prev) => ({ ...prev, [productoId]: unidad }))
    cambiarPeso(productoId, pesoTexto[productoId] ?? '', unidad)
  }

  function quitarItem(productoId: number) {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId))
    setPesoTexto((prev) => {
      const { [productoId]: _quitado, ...resto } = prev
      return resto
    })
    setUnidadPeso((prev) => {
      const { [productoId]: _quitado, ...resto } = prev
      return resto
    })
    setPrecioTexto((prev) => {
      const { [productoId]: _quitado, ...resto } = prev
      return resto
    })
    setNotaTexto((prev) => {
      const { [productoId]: _quitado, ...resto } = prev
      return resto
    })
  }

  async function confirmarVenta() {
    if (!caja) {
      setMensaje('Primero tenés que abrir la caja.')
      return
    }
    if (!carrito.length) return
    if (carrito.some((i) => i.cantidad <= 0)) {
      setMensaje('Completá el peso de todos los productos del carrito.')
      return
    }
    if (carrito.some((i) => esPastaDelDia(i.producto) && precioEfectivo(i) <= 0)) {
      setMensaje('Ingresá un precio válido para Pasta del día.')
      return
    }
    if (Math.abs(restante) > 0.01) {
      setMensaje(
        restante > 0
          ? `Falta asignar ${formatMoney(restante)} entre los medios de pago.`
          : `Asignaste ${formatMoney(-restante)} de más entre los medios de pago.`
      )
      return
    }
    if (usaCuentaCorriente && !clienteId) {
      setMensaje('Elegí un cliente para pagar con cuenta corriente.')
      return
    }

    const res = await api.ventas.crear({
      cajaId: caja.id,
      usuarioId: usuario!.id,
      canal,
      clienteId: clienteId === '' ? null : clienteId,
      items: carrito.map((i) => ({
        productoId: i.producto.id,
        cantidad: i.cantidad,
        precioUnitario: precioEfectivo(i),
        nota: esPastaDelDia(i.producto) ? notaTexto[i.producto.id] || undefined : undefined
      })),
      pagos: pagos.map((p) => ({
        medioPago: p.medioPago,
        tarjeta: esConProveedor(p.medioPago) && p.tarjeta ? p.tarjeta : null,
        monto: Number(p.monto) || 0
      })),
      descuento: descuentoNum
    })

    if (!res.ok) {
      setMensaje(res.error ?? 'No se pudo registrar la venta')
      return
    }

    setMensaje(`Venta registrada. Total: ${formatMoney(res.total ?? 0)}`)
    setCarrito([])
    setPesoTexto({})
    setUnidadPeso({})
    setPrecioTexto({})
    setNotaTexto({})
    setPagos([{ medioPago: 'efectivo', tarjeta: '', monto: '0' }])
    setDescuento('0')
    cargar()
  }

  if (!caja) {
    return (
      <div className="panel">
        <h2>Ventas</h2>
        <p>No hay una caja abierta. Andá a la sección Caja para abrirla antes de vender.</p>
      </div>
    )
  }

  return (
    <div className="ventas-layout">
      <div className="panel productos-panel">
        <h2>Productos</h2>
        <input className="busqueda" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="categorias-chips">
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${categoria === c ? ' chip-activo' : ''}`}
              onClick={() => setCategoria(c)}
            >
              {c === 'todas' ? 'Todas' : c}
            </button>
          ))}
        </div>
        {productosAgrupados.map(([cat, items]) => (
          <div className="grupo-categoria" key={cat}>
            {categoria === 'todas' && <h3 className="grupo-titulo">{cat}</h3>}
            <div className="grid-productos">
              {items.map((p) => (
                <button key={p.id} className="card-producto" onClick={() => agregarProducto(p)} disabled={p.stock_actual <= 0}>
                  <strong>{p.nombre}</strong>
                  <span>
                    {formatMoney(p.precio_venta)}
                    {esPorKilo(p) && ' / kg'}
                  </span>
                  <small>
                    Stock: {p.stock_actual} {p.unidad}
                  </small>
                </button>
              ))}
            </div>
          </div>
        ))}
        {productosFiltrados.length === 0 && <p>No hay productos que coincidan.</p>}
      </div>

      <div className="panel carrito-panel">
        <h2>Venta actual</h2>
        {carrito.length === 0 && <p>Agregá productos desde la izquierda.</p>}
        <ul className="carrito-lista">
          {carrito.map((item) => (
            <li key={item.producto.id} className={esPastaDelDia(item.producto) ? 'item-pasta-del-dia' : ''}>
              <span className="nombre">{item.producto.nombre}</span>
              {esPastaDelDia(item.producto) ? (
                <input
                  className="cantidad-gramos"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="precio"
                  value={precioTexto[item.producto.id] ?? ''}
                  onChange={(e) => setPrecioTexto((p) => ({ ...p, [item.producto.id]: e.target.value }))}
                />
              ) : esPorKilo(item.producto) ? (
                <div className="peso-input">
                  <input
                    className="cantidad-gramos"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="peso"
                    value={pesoTexto[item.producto.id] ?? ''}
                    onChange={(e) => cambiarPeso(item.producto.id, e.target.value, unidadPeso[item.producto.id] ?? 'kg')}
                  />
                  <div className="peso-unidad-toggle">
                    <button
                      type="button"
                      className={(unidadPeso[item.producto.id] ?? 'kg') === 'kg' ? 'primary' : ''}
                      onClick={() => cambiarUnidadPeso(item.producto.id, 'kg')}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={unidadPeso[item.producto.id] === 'g' ? 'primary' : ''}
                      onClick={() => cambiarUnidadPeso(item.producto.id, 'g')}
                    >
                      g
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  step={1}
                  max={item.producto.stock_actual}
                  value={item.cantidad}
                  onChange={(e) => cambiarCantidad(item.producto.id, Number(e.target.value))}
                />
              )}
              <span className="subtotal">{formatMoney(item.cantidad * precioEfectivo(item))}</span>
              <button className="link" onClick={() => quitarItem(item.producto.id)}>
                quitar
              </button>
              {esPastaDelDia(item.producto) && (
                <input
                  className="nota-item"
                  placeholder="¿Qué es hoy? (ej: Ravioles de ricotta)"
                  value={notaTexto[item.producto.id] ?? ''}
                  onChange={(e) => setNotaTexto((n) => ({ ...n, [item.producto.id]: e.target.value }))}
                />
              )}
            </li>
          ))}
        </ul>

        <label>
          Descuento
          <input type="number" min={0} max={subtotalBruto} value={descuento} onChange={(e) => setDescuento(e.target.value)} />
        </label>

        {descuentoNum > 0 && (
          <div className="total-row subtotal-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotalBruto)}</span>
          </div>
        )}

        <div className="total-row">
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>

        <label>
          Canal de venta
          <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
            {CANALES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="pagos-box">
          <div className="pagos-header">
            <span>Medios de pago</span>
            <button className="link" type="button" onClick={agregarPago}>
              + dividir pago
            </button>
          </div>
          {pagos.map((pago, idx) => (
            <div className="pago-linea" key={idx}>
              <select value={pago.medioPago} onChange={(e) => actualizarPago(idx, { medioPago: e.target.value as MedioPago })}>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {esConProveedor(pago.medioPago) && (
                <select value={pago.tarjeta} onChange={(e) => actualizarPago(idx, { tarjeta: e.target.value })}>
                  <option value="">{esConBilletera(pago.medioPago) ? 'Billetera...' : 'Tarjeta...'}</option>
                  {(esConBilletera(pago.medioPago) ? BILLETERAS_QR : TARJETAS).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                min={0}
                value={pago.monto}
                onChange={(e) => actualizarPago(idx, { monto: e.target.value })}
              />
              {pagos.length > 1 && (
                <button className="link" type="button" onClick={() => quitarPago(idx)}>
                  quitar
                </button>
              )}
            </div>
          ))}
          <p className={Math.abs(restante) > 0.01 ? 'error' : 'ok'}>
            {Math.abs(restante) > 0.01
              ? restante > 0
                ? `Falta asignar ${formatMoney(restante)}`
                : `Sobra ${formatMoney(-restante)}`
              : 'Pagos completos'}
          </p>
        </div>

        {usaCuentaCorriente && (
          <label>
            Cliente
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Elegir cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} (saldo: {formatMoney(c.saldo_cuenta_corriente)})
                </option>
              ))}
            </select>
          </label>
        )}

        {mensaje && <p className="mensaje">{mensaje}</p>}

        <button className="primary" disabled={!carrito.length} onClick={confirmarVenta}>
          Confirmar venta
        </button>
      </div>
    </div>
  )
}
