import { Router } from 'express'
import * as clientes from '../controllers/clientes.js'
import { authMiddleware } from '../middleware/auth.js'

export const router = Router()

router.get('/', authMiddleware, clientes.listar)
router.post('/', authMiddleware, clientes.crear)
router.get('/:id/movimientos', authMiddleware, clientes.movimientos)
router.post('/notas-credito', authMiddleware, clientes.crearNotaCredito)
router.get('/notas-credito/listar', authMiddleware, clientes.listarNotasCredito)
