import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Producto } from '../../lib/types'
import { formatMoney } from '../../lib/format'
import { api } from '../../lib/api'

const NUEVA_CATEGORIA = '__nueva__'

// Desplegable con las categorías que ya existen en Stock + opción de crear una nueva,
// para que no se terminen creando duplicados por typeo (ej. "Varios" vs "varios").
function SelectorCategoria({
  categorias,
  value,
  onChange
}: {
  categorias: string[]
  value: string
  onChange: (valor: string) => void
}) {
  const esCategoriaNueva = value !== '' && !categorias.includes(value)
  const [creandoNueva, setCreandoNueva] = useState(esCategoriaNueva)

  if (creandoNueva || esCategoriaNueva) {
    return (
      <input
        placeholder="Nombre de la nueva categoría"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setCreandoNueva(false)
        }}
      />
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === NUEVA_CATEGORIA) {
          setCreandoNueva(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value="">Sin categoría</option>
      {categorias.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={NUEVA_CATEGORIA}>+ Crear nueva categoría...</option>
    </select>
  )
}

const initialForm = {
  nombre: '',
  categoria: '',
  precioVenta: '',
  costo: '',
  unidad: 'unidad',
  stockInicial: '0',
  stockMinimo: '0'
}

interface EdicionProducto {
  id: number
  nombre: string
  categoria: string
  precioVenta: string
  costo: string
  unidad: string
  stockActual: string
  stockMinimo: string
}

export function StockPage() {
  const { usuario } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<EdicionProducto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  async function cargar() {
    setProductos(await api.productos.listar())
  }

  useEffect(() => {
    cargar()
  }, [])

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b)),
    [productos]
  )

  const productosFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = !filtroCategoria || p.categoria === filtroCategoria
    return coincideNombre && coincideCategoria
  })

  async function crearProducto(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const precioVenta = Number(form.precioVenta)
    const costo = Number(form.costo)
    const stockInicial = Number(form.stockInicial)
    const stockMinimo = Number(form.stockMinimo)

    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if ([precioVenta, costo, stockInicial, stockMinimo].some((n) => Number.isNaN(n) || n < 0)) {
      return setError('Revisá los valores numéricos')
    }

    const res = await api.productos.crear({
      nombre: form.nombre,
      categoria: form.categoria,
      precioVenta,
      costo,
      unidad: form.unidad,
      stockInicial,
      stockMinimo
    })

    if (!res.ok) return setError(res.error ?? 'No se pudo crear el producto')

    setForm(initialForm)
    cargar()
  }

  function abrirEdicion(p: Producto) {
    setEdicion({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria ?? '',
      precioVenta: String(p.precio_venta),
      costo: String(p.costo),
      unidad: p.unidad,
      stockActual: String(p.stock_actual),
      stockMinimo: String(p.stock_minimo)
    })
    setError(null)
  }

  async function guardarEdicion() {
    if (!edicion || !usuario) return

    const precioVenta = Number(edicion.precioVenta)
    const costo = Number(edicion.costo)
    const stockActual = Number(edicion.stockActual)
    const stockMinimo = Number(edicion.stockMinimo)

    if (!edicion.nombre.trim()) return setError('El nombre es obligatorio')
    if ([precioVenta, costo, stockActual, stockMinimo].some((n) => Number.isNaN(n) || n < 0)) {
      return setError('Revisá los valores numéricos')
    }

    const producto = productos.find((p) => p.id === edicion.id)
    if (!producto) return

    await api.productos.actualizar(edicion.id, {
      nombre: edicion.nombre,
      categoria: edicion.categoria,
      precioVenta,
      costo,
      unidad: edicion.unidad,
      stockMinimo,
      activo: !!producto.activo
    })

    if (stockActual !== producto.stock_actual) {
      await api.productos.ajustarStock(edicion.id, stockActual, 'ajuste', 'Ajuste manual de stock', usuario.id)
    }

    setEdicion(null)
    setError(null)
    cargar()
  }

  return (
    <div className="panel">
      <h2>Stock y productos</h2>

      <form className="form-inline" onSubmit={crearProducto}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <SelectorCategoria
          categorias={categoriasExistentes}
          value={form.categoria}
          onChange={(categoria) => setForm({ ...form, categoria })}
        />
        <input
          placeholder="Precio venta"
          type="number"
          value={form.precioVenta}
          onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
        />
        <input placeholder="Costo" type="number" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
        <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
          <option value="unidad">Por unidad</option>
          <option value="kg">Por kilo</option>
          <option value="porción">Por porción</option>
        </select>
        <input
          placeholder="Stock inicial"
          type="number"
          value={form.stockInicial}
          onChange={(e) => setForm({ ...form, stockInicial: e.target.value })}
        />
        <input
          placeholder="Stock mínimo"
          type="number"
          value={form.stockMinimo}
          onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
        />
        <button className="primary" type="submit">
          Agregar producto
        </button>
      </form>
      {error && !edicion && <p className="error">{error}</p>}

      <div className="form-inline">
        <input
          className="busqueda"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoriasExistentes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Costo</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.map((p) => (
            <tr key={p.id} className={p.stock_actual <= p.stock_minimo ? 'stock-bajo' : ''}>
              <td>{p.nombre}</td>
              <td>{p.categoria}</td>
              <td>{formatMoney(p.precio_venta)}</td>
              <td>{formatMoney(p.costo)}</td>
              <td>
                {p.stock_actual} {p.unidad}
              </td>
              <td>{p.stock_minimo}</td>
              <td>
                <button className="link" onClick={() => abrirEdicion(p)}>
                  editar
                </button>
              </td>
            </tr>
          ))}
          {productosFiltrados.length === 0 && (
            <tr>
              <td colSpan={7}>No hay productos que coincidan.</td>
            </tr>
          )}
        </tbody>
      </table>

      {edicion && (
        <div className="modal">
          <div className="modal-content">
            <h3>Editar producto</h3>
            <label>
              Nombre
              <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
            </label>
            <label>
              Categoría
              <SelectorCategoria
                categorias={categoriasExistentes}
                value={edicion.categoria}
                onChange={(categoria) => setEdicion({ ...edicion, categoria })}
              />
            </label>
            <label>
              Precio de venta
              <input
                type="number"
                value={edicion.precioVenta}
                onChange={(e) => setEdicion({ ...edicion, precioVenta: e.target.value })}
              />
            </label>
            <label>
              Costo
              <input type="number" value={edicion.costo} onChange={(e) => setEdicion({ ...edicion, costo: e.target.value })} />
            </label>
            <label>
              Unidad
              <select value={edicion.unidad} onChange={(e) => setEdicion({ ...edicion, unidad: e.target.value })}>
                <option value="unidad">Por unidad</option>
                <option value="kg">Por kilo</option>
                <option value="porción">Por porción</option>
              </select>
            </label>
            <label>
              Stock actual
              <input
                type="number"
                step="0.001"
                value={edicion.stockActual}
                onChange={(e) => setEdicion({ ...edicion, stockActual: e.target.value })}
              />
            </label>
            <label>
              Stock mínimo (para la alerta de stock bajo)
              <input
                type="number"
                step="0.001"
                value={edicion.stockMinimo}
                onChange={(e) => setEdicion({ ...edicion, stockMinimo: e.target.value })}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button onClick={() => setEdicion(null)}>Cancelar</button>
              <button className="primary" onClick={guardarEdicion}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
