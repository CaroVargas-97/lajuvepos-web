import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

// Las fechas se guardan en UTC pero el negocio opera en hora Argentina: convertir antes
// de agrupar por día/mes, si no una venta de la noche cae en el día calendario siguiente.
const fechaLocal = (col: string) =>
  Prisma.raw(`(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')`)

async function calcularResumen(cajaId: number, montoInicial: number) {
  const totales = await prisma.$queryRaw<{ medio_pago: string; total: number }[]>`
    SELECT vp.medio_pago, COALESCE(SUM(vp.monto), 0)::float as total
    FROM venta_pagos vp
    JOIN ventas v ON v.id = vp.venta_id
    WHERE v.caja_id = ${cajaId} AND v.anulada = false
    GROUP BY vp.medio_pago
  `

  const movimientos = await prisma.$queryRaw<{ tipo: string; total: number }[]>`
    SELECT tipo, COALESCE(SUM(monto), 0)::float as total
    FROM movimientos_caja WHERE caja_id = ${cajaId} GROUP BY tipo
  `

  const [totalVentasRow] = await prisma.$queryRaw<{ total: number; descuentos: number; cantidad: number }[]>`
    SELECT COALESCE(SUM(total), 0)::float as total, COALESCE(SUM(descuento), 0)::float as descuentos, COUNT(*)::int as cantidad
    FROM ventas WHERE caja_id = ${cajaId} AND anulada = false
  `

  const totalEfectivo = totales.find((t) => t.medio_pago === 'efectivo')?.total ?? 0
  const totalIngresos = movimientos.find((m) => m.tipo === 'ingreso')?.total ?? 0
  const totalEgresos = movimientos.find((m) => m.tipo === 'egreso')?.total ?? 0
  const efectivoEsperado = montoInicial + totalEfectivo + totalIngresos - totalEgresos

  return {
    totales,
    totalVentas: totalVentasRow?.total ?? 0,
    totalDescuentos: totalVentasRow?.descuentos ?? 0,
    cantidadVentas: totalVentasRow?.cantidad ?? 0,
    totalIngresos,
    totalEgresos,
    efectivoEsperado
  }
}

const USUARIO_PUBLICO = { select: { id: true, nombre: true } }

function serializeCaja(c: any) {
  const { usuario, usuarioCierre, ...resto } = c
  return {
    ...resto,
    usuario_nombre: usuario?.nombre,
    usuario_cierre_nombre: usuarioCierre?.nombre ?? null,
    usuario_cierre_id: c.usuarioCierreId,
    monto_inicial: Number(c.montoInicial),
    monto_final_declarado: c.montoFinalDeclarado != null ? Number(c.montoFinalDeclarado) : null,
    fecha_apertura: c.fechaApertura,
    fecha_cierre: c.fechaCierre
  }
}

export async function actual(_req: Request, res: Response) {
  const caja = await prisma.caja.findFirst({
    where: { estado: 'abierta' },
    orderBy: { id: 'desc' },
    include: { usuario: USUARIO_PUBLICO, usuarioCierre: USUARIO_PUBLICO }
  })
  res.json(caja ? serializeCaja(caja) : null)
}

export async function abrir(req: Request, res: Response) {
  const { montoInicial, usuarioId } = req.body

  try {
    const id = await prisma.$transaction(async (tx) => {
      // Lock para que dos aperturas simultáneas (dos pestañas, doble click) no puedan
      // pasar ambas el chequeo antes de que la primera termine de crear la caja.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('lajuvepos_abrir_caja'))`
      const abierta = await tx.caja.findFirst({ where: { estado: 'abierta' } })
      if (abierta) throw new Error('YA_ABIERTA')

      const caja = await tx.caja.create({ data: { montoInicial, usuarioId } })
      return caja.id
    })
    res.json({ ok: true, id })
  } catch (e: any) {
    if (e.message === 'YA_ABIERTA') return res.json({ ok: false, error: 'Ya hay una caja abierta' })
    throw e
  }
}

export async function resumen(req: Request, res: Response) {
  const id = Number(req.params.id)
  const caja = await prisma.caja.findUnique({ where: { id } })
  if (!caja) return res.json({ ok: false, error: 'La caja no existe' })

  const r = await calcularResumen(id, Number(caja.montoInicial))
  res.json({ ok: true, ...r })
}

export async function cerrar(req: Request, res: Response) {
  const id = Number(req.params.id)
  const { montoFinalDeclarado, usuarioId, comentario } = req.body

  const caja = await prisma.caja.findUnique({ where: { id } })
  if (!caja || caja.estado === 'cerrada') return res.json({ ok: false, error: 'La caja no está abierta' })

  const r = await calcularResumen(id, Number(caja.montoInicial))
  const diferencia = montoFinalDeclarado - r.efectivoEsperado

  await prisma.caja.update({
    where: { id },
    data: {
      fechaCierre: new Date(),
      montoFinalDeclarado,
      usuarioCierreId: usuarioId,
      comentario: comentario || null,
      estado: 'cerrada'
    }
  })

  res.json({ ok: true, ...r, diferencia })
}

export async function comprobante(req: Request, res: Response) {
  const id = Number(req.params.id)
  const caja = await prisma.caja.findUnique({
    where: { id },
    include: { usuario: USUARIO_PUBLICO, usuarioCierre: USUARIO_PUBLICO }
  })
  if (!caja) return res.json({ ok: false, error: 'La caja no existe' })

  const r = await calcularResumen(id, Number(caja.montoInicial))

  const porCanal = await prisma.$queryRaw<{ canal: string; cantidad_ventas: number; total_vendido: number }[]>`
    SELECT canal, COUNT(*)::int as cantidad_ventas, COALESCE(SUM(total), 0)::float as total_vendido
    FROM ventas WHERE caja_id = ${id} AND anulada = false GROUP BY canal
  `

  const porCategoria = await prisma.$queryRaw<{ categoria: string; cantidad_vendida: number; total_vendido: number }[]>`
    SELECT COALESCE(p.categoria, 'Sin categoría') as categoria,
           SUM(vi.cantidad)::float as cantidad_vendida,
           COALESCE(SUM(vi.subtotal), 0)::float as total_vendido
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    JOIN productos p ON p.id = vi.producto_id
    WHERE v.caja_id = ${id} AND v.anulada = false
    GROUP BY categoria ORDER BY total_vendido DESC
  `

  const topProductos = await prisma.$queryRaw<{ nombre: string; cantidad_vendida: number; total_vendido: number }[]>`
    SELECT p.nombre, SUM(vi.cantidad)::float as cantidad_vendida, COALESCE(SUM(vi.subtotal), 0)::float as total_vendido
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    JOIN productos p ON p.id = vi.producto_id
    WHERE v.caja_id = ${id} AND v.anulada = false
    GROUP BY p.id ORDER BY total_vendido DESC LIMIT 8
  `

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { cajaId: id },
    include: { motivo: true },
    orderBy: { id: 'asc' }
  })

  const ticketPromedio = r.cantidadVentas > 0 ? r.totalVentas / r.cantidadVentas : 0

  res.json({
    ok: true,
    caja: serializeCaja(caja),
    resumen: r,
    porCanal,
    porCategoria,
    topProductos,
    movimientos: movimientos.map((m) => ({ ...m, motivo_nombre: m.motivo?.nombre ?? null })),
    ticketPromedio
  })
}

// Borra un cierre de caja (solo si ya está cerrada, para no borrar una caja en uso) junto
// con sus ventas, pagos e ítems. OJO: esto NO revierte el stock que descontaron esas
// ventas ni los saldos de cuenta corriente que se usaron — es para limpiar datos de
// prueba, no para "deshacer" una venta real ya facturada.
export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id)
  const caja = await prisma.caja.findUnique({ where: { id } })
  if (!caja) return res.json({ ok: false, error: 'La caja no existe' })
  if (caja.estado !== 'cerrada') return res.json({ ok: false, error: 'Solo se pueden borrar cajas ya cerradas' })

  await prisma.$transaction(async (tx) => {
    const ventas = await tx.venta.findMany({ where: { cajaId: id }, select: { id: true } })
    const ventaIds = ventas.map((v) => v.id)

    if (ventaIds.length > 0) {
      await tx.notaCredito.deleteMany({ where: { ventaId: { in: ventaIds } } })
      await tx.ventaPago.deleteMany({ where: { ventaId: { in: ventaIds } } })
      await tx.ventaItem.deleteMany({ where: { ventaId: { in: ventaIds } } })
      await tx.venta.deleteMany({ where: { id: { in: ventaIds } } })
    }

    await tx.movimientoCaja.deleteMany({ where: { cajaId: id } })
    await tx.caja.delete({ where: { id } })
  })

  res.json({ ok: true })
}

export async function historial(_req: Request, res: Response) {
  const cajas = await prisma.caja.findMany({
    include: { usuario: USUARIO_PUBLICO, usuarioCierre: USUARIO_PUBLICO },
    orderBy: { id: 'desc' }
  })
  res.json(cajas.map(serializeCaja))
}

export async function cierresPorDia(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const rows = await prisma.$queryRaw<{ dia: string; total_vendido: number; cantidad_ventas: number }[]>`
    SELECT to_char(${fechaLocal('fecha')}, 'YYYY-MM-DD') as dia,
           COALESCE(SUM(total), 0)::float as total_vendido,
           COUNT(*)::int as cantidad_ventas
    FROM ventas
    WHERE ${fechaLocal('fecha')}::date BETWEEN ${desde}::date AND ${hasta}::date AND anulada = false
    GROUP BY dia ORDER BY dia DESC
  `
  res.json(rows)
}

export async function cierresPorMes(req: Request, res: Response) {
  const { anio } = req.query as { anio: string }
  const rows = await prisma.$queryRaw<{ mes: string; total_vendido: number; cantidad_ventas: number }[]>`
    SELECT to_char(${fechaLocal('fecha')}, 'YYYY-MM') as mes,
           COALESCE(SUM(total), 0)::float as total_vendido,
           COUNT(*)::int as cantidad_ventas
    FROM ventas
    WHERE to_char(${fechaLocal('fecha')}, 'YYYY') = ${anio} AND anulada = false
    GROUP BY mes ORDER BY mes DESC
  `
  res.json(rows)
}
