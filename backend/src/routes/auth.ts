import { Router } from 'express'
import * as auth from '../controllers/auth.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.post('/login', auth.login)
router.get('/usuarios', authMiddleware, requireAdmin, auth.listarUsuarios)
router.post('/usuarios', authMiddleware, requireAdmin, auth.crearUsuario)
router.put('/usuarios/:id/pin', authMiddleware, requireAdmin, auth.cambiarPin)
router.put('/usuarios/:id/activo', authMiddleware, requireAdmin, auth.setActivo)
