import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function obtener(req: Request, res: Response) {
  const clave = req.params.clave
  const row = await prisma.configuracion.findUnique({ where: { clave } })
  res.json(row?.valor ?? null)
}

export async function guardar(req: Request, res: Response) {
  const clave = req.params.clave
  const { valor } = req.body
  await prisma.configuracion.upsert({ where: { clave }, update: { valor }, create: { clave, valor } })
  res.json({ ok: true })
}
