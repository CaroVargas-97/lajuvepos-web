import { Router } from 'express'
import * as reportes from '../controllers/reportes.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.get('/rentabilidad', authMiddleware, requireAdmin, reportes.rentabilidad)
router.get('/ventas-por-canal', authMiddleware, requireAdmin, reportes.ventasPorCanal)
router.get('/ventas-por-medio-pago', authMiddleware, requireAdmin, reportes.ventasPorMedioPago)
router.get('/ventas-por-tarjeta', authMiddleware, requireAdmin, reportes.ventasPorTarjeta)
router.get('/ventas-por-categoria', authMiddleware, requireAdmin, reportes.ventasPorCategoria)
