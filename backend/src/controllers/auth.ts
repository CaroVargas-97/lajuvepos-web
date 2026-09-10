import { Request, Response } from 'express'
import { firmarToken, hashPin } from '../middleware/auth.js'
import { prisma } from '../prisma.js'

export async function login(req: Request, res: Response) {
  const { pin } = req.body
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(401).json({ error: 'PIN incorrecto' })
  }

  const usuario = await prisma.usuario.findUnique({ where: { pin: hashPin(pin) } })
  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'PIN incorrecto' })

  res.json({
    ok: true,
    token: firmarToken(usuario.id),
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo }
  })
}

export async function listarUsuarios(_req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, rol: true, activo: true },
    orderBy: { nombre: 'asc' }
  })
  res.json(usuarios)
}

export async function crearUsuario(req: Request, res: Response) {
  const { nombre, pin, rol } = req.body
  if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' })
  if (!/^\d{4}$/.test(pin ?? '')) return res.status(400).json({ ok: false, error: 'El PIN debe tener 4 dígitos' })

  try {
    const usuario = await prisma.usuario.create({ data: { nombre, pin: hashPin(pin), rol } })
    res.json({ ok: true, id: usuario.id })
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Ya existe un usuario con ese PIN' })
  }
}

export async function cambiarPin(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { pin } = req.body
  if (!/^\d{4}$/.test(pin ?? '')) return res.status(400).json({ ok: false, error: 'El PIN debe tener 4 dígitos' })

  try {
    await prisma.usuario.update({ where: { id }, data: { pin: hashPin(pin) } })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Ya existe un usuario con ese PIN' })
  }
}

export async function setActivo(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { activo } = req.body
  await prisma.usuario.update({ where: { id }, data: { activo: !!activo } })
  res.json({ ok: true })
}
