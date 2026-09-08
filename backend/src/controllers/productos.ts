import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listar(_req: Request, res: Response) {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })
  res.json(productos)
}

export async function crear(req: Request, res: Response) {
  const { nombre, categoria, precioVenta, costo, unidad, stockInicial, stockMinimo } = req.body
  if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' })

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

  await prisma.producto.update({
    where: { id },
    data: { nombre, categoria, precioVenta, costo, unidad, stockMinimo, activo }
  })
  res.json({ ok: true })
}

export async function ajustarStock(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { cantidad, tipo, motivo, usuarioId } = req.body

  await prisma.$transaction(async (tx) => {
    if (tipo === 'entrada') {
      await tx.producto.update({ where: { id }, data: { stockActual: { increment: cantidad } } })
    } else {
      await tx.producto.update({ where: { id }, data: { stockActual: cantidad } })
    }
    await tx.movimientoStock.create({
      data: { productoId: id, tipo, cantidad, usuarioId, motivo }
    })
  })

  res.json({ ok: true })
}
