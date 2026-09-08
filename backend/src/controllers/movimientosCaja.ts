import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function crear(req: Request, res: Response) {
  const { cajaId, motivoId, concepto, monto, usuarioId } = req.body
  if (monto <= 0) return res.json({ ok: false, error: 'El monto debe ser mayor a 0' })

  const motivo = await prisma.motivoCaja.findUnique({ where: { id: motivoId } })
  if (!motivo) return res.json({ ok: false, error: 'Elegí un motivo válido' })

  const mov = await prisma.movimientoCaja.create({
    data: {
      cajaId,
      tipo: motivo.tipo,
      motivoId: motivo.id,
      concepto: concepto?.trim() || motivo.nombre,
      monto,
      usuarioId
    }
  })
  res.json({ ok: true, id: mov.id })
}

export async function listarPorCaja(req: Request, res: Response) {
  const cajaId = Number(req.params.cajaId)
  const movimientos = await prisma.movimientoCaja.findMany({
    where: { cajaId },
    include: { motivo: true },
    orderBy: { id: 'desc' }
  })
  res.json(movimientos.map((m) => ({ ...m, motivo_nombre: m.motivo?.nombre ?? null })))
}
