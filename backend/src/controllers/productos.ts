import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listar(_req: Request, res: Response) {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })
  res.json(productos)
}

function numeroValido(n: unknown) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

export async function crear(req: Request, res: Response) {
  const { nombre, categoria, precioVenta, costo, unidad, stockInicial, stockMinimo } = req.body
  if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' })
  if (![precioVenta, costo, stockInicial, stockMinimo].every(numeroValido)) {
    return res.status(400).json({ ok: false, error: 'Los valores numéricos deben ser mayores o iguales a 0' })
  }

  const producto = await prisma.producto.create({
    data: {
      nombre,
      categoria,
      precioVenta,
      costo,
      unidad,
      stockActual: stockInicial,
      stockMinimo
    }
  })
  res.json({ ok: true, id: producto.id })
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { nombre, categoria, precioVenta, costo, unidad, stockMinimo, activo } = req.body
  if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' })
  if (![precioVenta, costo, stockMinimo].every(numeroValido)) {
    return res.status(400).json({ ok: false, error: 'Los valores numéricos deben ser mayores o iguales a 0' })
  }

  await prisma.producto.update({
    where: { id },
    data: { nombre, categoria, precioVenta, costo, unidad, stockMinimo, activo }
  })
  res.json({ ok: true })
}

export async function ajustarStock(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { cantidad, tipo, motivo, usuarioId } = req.body as {
    cantidad: number
    tipo: 'entrada' | 'salida' | 'ajuste'
    motivo: string
    usuarioId: number
  }

  await prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUniqueOrThrow({ where: { id } })
    let cantidadMovimiento: number

    if (tipo === 'entrada') {
      cantidadMovimiento = cantidad
      await tx.producto.update({ where: { id }, data: { stockActual: { increment: cantidad } } })
    } else if (tipo === 'salida') {
      cantidadMovimiento = cantidad
      await tx.producto.update({ where: { id }, data: { stockActual: { decrement: cantidad } } })
    } else {
      // 'ajuste': `cantidad` llega como el nuevo stock absoluto (lo que carga el admin en
      // Stock). Guardamos en el movimiento la diferencia real, no el valor absoluto, para
      // que la tabla de movimientos siempre represente "cuánto se movió", no "en qué quedó".
      cantidadMovimiento = cantidad - Number(producto.stockActual)
      await tx.producto.update({ where: { id }, data: { stockActual: cantidad } })
    }

    await tx.movimientoStock.create({
      data: { productoId: id, tipo, cantidad: cantidadMovimiento, usuarioId, motivo }
    })
  })

  res.json({ ok: true })
}
