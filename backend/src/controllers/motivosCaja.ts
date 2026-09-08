import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listar(req: Request, res: Response) {
  const soloActivos = req.query.soloActivos === 'true'
  const motivos = await prisma.motivoCaja.findMany({
    where: soloActivos ? { activo: true } : undefined,
    orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }]
  })
  res.json(motivos)
}

export async function crear(req: Request, res: Response) {
  const { nombre, tipo } = req.body
  if (!nombre?.trim()) return res.json({ ok: false, error: 'El nombre es obligatorio' })
  try {
    const motivo = await prisma.motivoCaja.create({ data: { nombre, tipo } })
    res.json({ ok: true, id: motivo.id })
  } catch (e) {
    res.json({ ok: false, error: 'Ya existe un motivo con ese nombre' })
  }
}

export async function setActivo(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { activo } = req.body
  await prisma.motivoCaja.update({ where: { id }, data: { activo: !!activo } })
  res.json({ ok: true })
}
