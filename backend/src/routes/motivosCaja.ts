import { Router } from 'express'
import * as motivosCaja from '../controllers/motivosCaja.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.get('/', authMiddleware, motivosCaja.listar)
router.post('/', authMiddleware, requireAdmin, motivosCaja.crear)
router.put('/:id/activo', authMiddleware, requireAdmin, motivosCaja.setActivo)
