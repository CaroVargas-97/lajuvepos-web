import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function rentabilidad(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }

  const porProducto = await prisma.$queryRaw<
    { producto_id: number; nombre: string; cantidad_vendida: number; total_vendido: number; costo_total: number; ganancia: number }[]
  >`
    SELECT p.id as producto_id, p.nombre,
           SUM(vi.cantidad)::float as cantidad_vendida,
           SUM(vi.subtotal)::float as total_vendido,
           SUM(vi.costo_unitario * vi.cantidad)::float as costo_total,
           SUM(vi.subtotal - vi.costo_unitario * vi.cantidad)::float as ganancia
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    JOIN productos p ON p.id = vi.producto_id
    WHERE v.fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND v.anulada = false
    GROUP BY p.id ORDER BY ganancia DESC
  `

  const [totales] = await prisma.$queryRaw<{ total_vendido: number; costo_total: number; ganancia: number }[]>`
    SELECT COALESCE(SUM(vi.subtotal), 0)::float as total_vendido,
           COALESCE(SUM(vi.costo_unitario * vi.cantidad), 0)::float as costo_total,
           COALESCE(SUM(vi.subtotal - vi.costo_unitario * vi.cantidad), 0)::float as ganancia
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    WHERE v.fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND v.anulada = false
  `

  res.json({ porProducto, totales: totales ?? { total_vendido: 0, costo_total: 0, ganancia: 0 } })
}

export async function ventasPorCanal(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const rows = await prisma.$queryRaw<{ canal: string; cantidad_ventas: number; total_vendido: number }[]>`
    SELECT canal, COUNT(*)::int as cantidad_ventas, COALESCE(SUM(total), 0)::float as total_vendido
    FROM ventas WHERE fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND anulada = false
    GROUP BY canal
  `
  res.json(rows)
}

export async function ventasPorMedioPago(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const rows = await prisma.$queryRaw<{ medio_pago: string; cantidad_pagos: number; total_vendido: number }[]>`
    SELECT vp.medio_pago, COUNT(*)::int as cantidad_pagos, COALESCE(SUM(vp.monto), 0)::float as total_vendido
    FROM venta_pagos vp JOIN ventas v ON v.id = vp.venta_id
    WHERE v.fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND v.anulada = false
    GROUP BY vp.medio_pago
  `
  res.json(rows)
}

export async function ventasPorTarjeta(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const rows = await prisma.$queryRaw<
    { medio_pago: string; tarjeta: string; cantidad_pagos: number; total_vendido: number }[]
  >`
    SELECT vp.medio_pago, COALESCE(vp.tarjeta, 'Sin especificar') as tarjeta,
           COUNT(*)::int as cantidad_pagos, COALESCE(SUM(vp.monto), 0)::float as total_vendido
    FROM venta_pagos vp JOIN ventas v ON v.id = vp.venta_id
    WHERE vp.medio_pago IN ('debito', 'credito', 'qr')
      AND v.fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND v.anulada = false
    GROUP BY vp.medio_pago, tarjeta ORDER BY vp.medio_pago, total_vendido DESC
  `
  res.json(rows)
}

export async function ventasPorCategoria(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const rows = await prisma.$queryRaw<{ categoria: string; cantidad_vendida: number; total_vendido: number }[]>`
    SELECT COALESCE(p.categoria, 'Sin categoría') as categoria,
           SUM(vi.cantidad)::float as cantidad_vendida,
           COALESCE(SUM(vi.subtotal), 0)::float as total_vendido
    FROM venta_items vi
    JOIN ventas v ON v.id = vi.venta_id
    JOIN productos p ON p.id = vi.producto_id
    WHERE v.fecha::date BETWEEN ${desde}::date AND ${hasta}::date AND v.anulada = false
    GROUP BY categoria ORDER BY total_vendido DESC
  `
  res.json(rows)
}
