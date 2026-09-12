import { Router } from 'express'
import { wrapRouter } from '../lib/wrapRouter.js'
import * as caja from '../controllers/caja.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = wrapRouter(Router())

router.get('/actual', authMiddleware, caja.actual)
router.post('/abrir', authMiddleware, caja.abrir)
router.get('/:id/resumen', authMiddleware, caja.resumen)
router.post('/:id/cerrar', authMiddleware, caja.cerrar)
router.get('/:id/comprobante', authMiddleware, caja.comprobante)
router.delete('/:id', authMiddleware, requireAdmin, caja.eliminar)
router.get('/historial', authMiddleware, caja.historial)
router.get('/cierres-por-dia', authMiddleware, caja.cierresPorDia)
router.get('/cierres-por-mes', authMiddleware, caja.cierresPorMes)
