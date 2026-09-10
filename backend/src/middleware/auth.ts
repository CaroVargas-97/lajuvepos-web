import { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import { prisma } from '../prisma.js'

const SECRET = process.env.AUTH_SECRET || 'lajuvepos-dev-secret'

export function firmarToken(usuarioId: number) {
  const firma = crypto.createHmac('sha256', SECRET).update(String(usuarioId)).digest('hex')
  return `${usuarioId}.${firma}`
}

export function verificarToken(token: string): number | null {
  const [idStr, firma] = token.split('.')
  if (!idStr || !firma) return null
  const esperada = crypto.createHmac('sha256', SECRET).update(idStr).digest('hex')
  if (firma.length !== esperada.length) return null
  const iguales = crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))
  return iguales ? Number(idStr) : null
}

export function hashPin(pin: string): string {
  return crypto.createHmac('sha256', SECRET).update(`pin:${pin}`).digest('hex')
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: { id: number; nombre: string; rol: 'admin' | 'vendedor' }
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-auth-token')
  const usuarioId = token ? verificarToken(token) : null
  if (!usuarioId) return res.status(401).json({ error: 'No autorizado' })

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'No autorizado' })

  req.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== 'admin') return res.status(403).json({ error: 'Acceso solo para administradores' })
  next()
}
