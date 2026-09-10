import { Router } from 'express'
import * as clientes from '../controllers/clientes.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

// El listado queda accesible para cualquier usuario logueado porque Ventas lo necesita
// para el selector de cliente al cobrar con cuenta corriente. El resto (alta, movimientos,
// notas de crédito) es admin-only en la interfaz y ahora también en el backend.
router.get('/', authMiddleware, clientes.listar)
router.post('/', authMiddleware, requireAdmin, clientes.crear)
router.get('/:id/movimientos', authMiddleware, requireAdmin, clientes.movimientos)
router.post('/notas-credito', authMiddleware, requireAdmin, clientes.crearNotaCredito)
router.get('/notas-credito/listar', authMiddleware, requireAdmin, clientes.listarNotasCredito)
