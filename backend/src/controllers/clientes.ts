import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listar(_req: Request, res: Response) {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' } })
  res.json(clientes)
}

export async function crear(req: Request, res: Response) {
  const { nombre, telefono } = req.body
  if (!nombre?.trim()) return res.json({ ok: false, error: 'El nombre es obligatorio' })
  const cliente = await prisma.cliente.create({ data: { nombre, telefono } })
  res.json({ ok: true, id: cliente.id })
}

export async function movimientos(req: Request, res: Response) {
  const clienteId = Number(req.params.id)
  const rows = await prisma.cuentaCorrienteMovimiento.findMany({
    where: { clienteId },
    orderBy: { id: 'desc' }
  })
  res.json(rows)
}

export async function crearNotaCredito(req: Request, res: Response) {
  const { clienteId, ventaId, monto, motivo, usuarioId } = req.body
  if (!(Number.isFinite(monto) && monto > 0)) return res.json({ ok: false, error: 'El monto debe ser mayor a 0' })

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) return res.json({ ok: false, error: 'Cliente no encontrado' })

  const id = await prisma.$transaction(async (tx) => {
    const nota = await tx.notaCredito.create({ data: { ventaId, clienteId, monto, motivo, usuarioId } })
    await tx.cliente.update({ where: { id: clienteId }, data: { saldoCuentaCorriente: { increment: monto } } })
    await tx.cuentaCorrienteMovimiento.create({
      data: { clienteId, tipo: 'nota_credito', monto, referencia: `Nota de crédito #${nota.id}`, usuarioId }
    })
    return nota.id
  })

  res.json({ ok: true, id })
}

export async function listarNotasCredito(_req: Request, res: Response) {
  const notas = await prisma.notaCredito.findMany({
    include: { cliente: { select: { nombre: true } } },
    orderBy: { id: 'desc' }
  })
  res.json(notas.map((n) => ({ ...n, cliente_nombre: n.cliente.nombre })))
}
