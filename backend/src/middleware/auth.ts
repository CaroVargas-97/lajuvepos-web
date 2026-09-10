import { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import { prisma } from '../prisma.js'

const SECRET = process.env.AUTH_SECRET || 'lajuvepos-dev-secret'
const DURACION_TOKEN_MS = 24 * 60 * 60 * 1000

export function firmarToken(usuarioId: number) {
  const expira = Date.now() + DURACION_TOKEN_MS
  const payload = `${usuarioId}.${expira}`
  const firma = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${firma}`
}

export function verificarToken(token: string): number | null {
  const [idStr, expiraStr, firma] = token.split('.')
  if (!idStr || !expiraStr || !firma) return null
  const payload = `${idStr}.${expiraStr}`
  const esperada = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  if (firma.length !== esperada.length) return null
  const iguales = crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))
  if (!iguales) return null
  if (Date.now() > Number(expiraStr)) return null
  return Number(idStr)
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
