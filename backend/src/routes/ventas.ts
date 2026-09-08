import { Router } from 'express'
import * as ventas from '../controllers/ventas.js'
import { authMiddleware } from '../middleware/auth.js'

export const router = Router()

router.post('/', authMiddleware, ventas.crear)
router.get('/por-caja/:cajaId', authMiddleware, ventas.listarPorCaja)
router.get('/buscar', authMiddleware, ventas.buscar)
router.get('/:id', authMiddleware, ventas.detalle)
