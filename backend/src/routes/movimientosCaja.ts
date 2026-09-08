import { Router } from 'express'
import * as movimientosCaja from '../controllers/movimientosCaja.js'
import { authMiddleware } from '../middleware/auth.js'

export const router = Router()

router.post('/', authMiddleware, movimientosCaja.crear)
router.get('/por-caja/:cajaId', authMiddleware, movimientosCaja.listarPorCaja)
