import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { router as authRouter } from './routes/auth.js'
import { router as productosRouter } from './routes/productos.js'
import { router as cajaRouter } from './routes/caja.js'
import { router as ventasRouter } from './routes/ventas.js'
import { router as reportesRouter } from './routes/reportes.js'
import { router as clientesRouter } from './routes/clientes.js'
import { router as movimientosCajaRouter } from './routes/movimientosCaja.js'
import { router as motivosCajaRouter } from './routes/motivosCaja.js'
import { router as configuracionRouter } from './routes/configuracion.js'
import { router as sistemaRouter } from './routes/sistema.js'

function convertirDecimales(valor: any): any {
  if (valor === null || valor === undefined) return valor
  if (typeof valor === 'object') {
    if (valor instanceof Date) return valor
    if (typeof valor.toNumber === 'function' && valor.constructor?.name === 'Decimal') return valor.toNumber()
    if (Array.isArray(valor)) return valor.map(convertirDecimales)
    const resultado: Record<string, unknown> = {}
    for (const clave of Object.keys(valor)) resultado[clave] = convertirDecimales(valor[clave])
    return resultado
  }
  return valor
}

const app = express()

app.use(cors())
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }))
app.use((_req, res, next) => {
  const jsonOriginal = res.json.bind(res)
  res.json = (body: unknown) => jsonOriginal(convertirDecimales(body))
  next()
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/productos', productosRouter)
app.use('/api/caja', cajaRouter)
app.use('/api/ventas', ventasRouter)
app.use('/api/reportes', reportesRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/movimientos-caja', movimientosCajaRouter)
app.use('/api/motivos-caja', motivosCajaRouter)
app.use('/api/configuracion', configuracionRouter)
app.use('/api/sistema', sistemaRouter)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`LaJuvePOS backend escuchando en puerto ${PORT}`))
