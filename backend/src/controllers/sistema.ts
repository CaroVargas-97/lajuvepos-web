import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function exportarBackup(_req: Request, res: Response) {
  const [
    usuarios,
    productos,
    clientes,
    caja,
    ventas,
    ventaItems,
    ventaPagos,
    notasCredito,
    cuentaCorrienteMovimientos,
    motivosCaja,
    movimientosCaja,
    movimientosStock,
    configuracion
  ] = await Promise.all([
    prisma.usuario.findMany(),
    prisma.producto.findMany(),
    prisma.cliente.findMany(),
    prisma.caja.findMany(),
    prisma.venta.findMany(),
    prisma.ventaItem.findMany(),
    prisma.ventaPago.findMany(),
    prisma.notaCredito.findMany(),
    prisma.cuentaCorrienteMovimiento.findMany(),
    prisma.motivoCaja.findMany(),
    prisma.movimientoCaja.findMany(),
    prisma.movimientoStock.findMany(),
    prisma.configuracion.findMany()
  ])

  const fecha = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Disposition', `attachment; filename="lajuvepos-backup-${fecha}.json"`)
  res.json({
    exportadoEn: new Date().toISOString(),
    usuarios,
    productos,
    clientes,
    caja,
    ventas,
    ventaItems,
    ventaPagos,
    notasCredito,
    cuentaCorrienteMovimientos,
    motivosCaja,
    movimientosCaja,
    movimientosStock,
    configuracion
  })
}
