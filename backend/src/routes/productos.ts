import { Router } from 'express'
import * as productos from '../controllers/productos.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.get('/', authMiddleware, productos.listar)
router.post('/', authMiddleware, requireAdmin, productos.crear)
router.put('/:id', authMiddleware, requireAdmin, productos.actualizar)
router.post('/:id/ajustar-stock', authMiddleware, requireAdmin, productos.ajustarStock)
