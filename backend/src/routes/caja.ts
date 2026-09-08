import { Router } from 'express'
import * as caja from '../controllers/caja.js'
import { authMiddleware } from '../middleware/auth.js'

export const router = Router()

router.get('/actual', authMiddleware, caja.actual)
router.post('/abrir', authMiddleware, caja.abrir)
router.get('/:id/resumen', authMiddleware, caja.resumen)
router.post('/:id/cerrar', authMiddleware, caja.cerrar)
router.get('/:id/comprobante', authMiddleware, caja.comprobante)
router.get('/historial', authMiddleware, caja.historial)
router.get('/cierres-por-dia', authMiddleware, caja.cierresPorDia)
router.get('/cierres-por-mes', authMiddleware, caja.cierresPorMes)
