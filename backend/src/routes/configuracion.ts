import { Router } from 'express'
import * as configuracion from '../controllers/configuracion.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.get('/:clave', authMiddleware, configuracion.obtener)
router.put('/:clave', authMiddleware, requireAdmin, configuracion.guardar)
