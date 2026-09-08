import { Router } from 'express'
import * as sistema from '../controllers/sistema.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

export const router = Router()

router.get('/backup', authMiddleware, requireAdmin, sistema.exportarBackup)
