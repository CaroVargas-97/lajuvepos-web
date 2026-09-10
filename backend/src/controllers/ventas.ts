import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

const EPSILON = 0.01

export async function crear(req: Request, res: Response) {
  const { cajaId, usuarioId, canal, clienteId, items, pagos, descuento } = req.body as {
    cajaId: number
    usuarioId: number
    canal: 'mostrador' | 'pedidos_ya' | 'rappi'
    clienteId: number | null
    items: { productoId: number; cantidad: number; precioUnitario: number }[]
    pagos: { medioPago: string; tarjeta: string | null; monto: number }[]
    descuento: number
  }

  const caja = await prisma.caja.findFirst({ where: { id: cajaId, estado: 'abierta' } })
  if (!caja) return res.json({ ok: false, error: 'La caja no está abierta' })
  if (!items.length) return res.json({ ok: false, error: 'La venta no tiene productos' })
  if (!pagos.length) return res.json({ ok: false, error: 'Falta indicar el medio de pago' })
  if (pagos.some((p) => p.monto <= 0)) return res.json({ ok: false, error: 'Los montos de pago deben ser mayores a 0' })

  const productos = await prisma.producto.findMany({ where: { id: { in: items.map((i) => i.productoId) } } })
  for (const item of items) {
    const prod = productos.find((p) => p.id === item.productoId)
    if (!prod) return res.json({ ok: false, error: `Producto ${item.productoId} no encontrado` })
    if (!(item.cantidad > 0)) return res.json({ ok: false, error: 'Cantidad inválida' })
    if (Number(prod.stockActual) < item.cantidad) {
      return res.json({ ok: false, error: 'Stock insuficiente para completar la venta' })
    }
  }

  // El precio se toma siempre del producto en la base, nunca de lo que mande el cliente,
  // para que no se pueda manipular el precio de venta llamando directo a la API.
  const precioReal = (productoId: number) => Number(productos.find((p) => p.id === productoId)!.precioVenta)
  const subtotalBruto = items.reduce((acc, i) => acc + i.cantidad * precioReal(i.productoId), 0)
  const desc = descuento > 0 ? Math.min(descuento, subtotalBruto) : 0
  const total = subtotalBruto - desc
  const totalPagos = pagos.reduce((acc, p) => acc + p.monto, 0)
  if (Math.abs(totalPagos - total) > EPSILON) {
    return res.json({ ok: false, error: `Los pagos (${totalPagos}) no coinciden con el total de la venta (${total})` })
  }

  const pagoCtaCte = pagos.find((p) => p.medioPago === 'cuenta_corriente')
  if (pagoCtaCte) {
    if (!clienteId) return res.json({ ok: false, error: 'Elegí un cliente para pagar con cuenta corriente' })
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente || Number(cliente.saldoCuentaCorriente) < pagoCtaCte.monto) {
      return res.json({ ok: false, error: 'El cliente no tiene saldo a favor suficiente' })
    }
  }

  const medioPagoVenta = pagos.length === 1 ? pagos[0].medioPago : 'mixto'

  const ventaId = await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: { cajaId, usuarioId, clienteId, canal, descuento: desc, total, medioPago: medioPagoVenta as any }
    })

    for (const item of items) {
      const prod = productos.find((p) => p.id === item.productoId)!
      const precioUnitario = precioReal(item.productoId)
      const subtotal = item.cantidad * precioUnitario

      await tx.ventaItem.create({
        data: {
          ventaId: venta.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario,
          costoUnitario: prod.costo,
          subtotal
        }
      })

      await tx.producto.update({ where: { id: item.productoId }, data: { stockActual: { decrement: item.cantidad } } })

      await tx.movimientoStock.create({
        data: {
          productoId: item.productoId,
          tipo: 'venta',
          cantidad: item.cantidad,
          usuarioId,
          motivo: `Venta #${venta.id}`
        }
      })
    }

    for (const pago of pagos) {
      await tx.ventaPago.create({
        data: { ventaId: venta.id, medioPago: pago.medioPago as any, tarjeta: pago.tarjeta, monto: pago.monto }
      })
    }

    if (pagoCtaCte && clienteId) {
      await tx.cliente.update({ where: { id: clienteId }, data: { saldoCuentaCorriente: { decrement: pagoCtaCte.monto } } })
      await tx.cuentaCorrienteMovimiento.create({
        data: {
          clienteId,
          tipo: 'uso_en_venta',
          monto: -pagoCtaCte.monto,
          referencia: `Venta #${venta.id}`,
          usuarioId
        }
      })
    }

    return venta.id
  })

  res.json({ ok: true, ventaId, total })
}

export async function listarPorCaja(req: Request, res: Response) {
  const cajaId = Number(req.params.cajaId)
  const ventas = await prisma.venta.findMany({
    where: { cajaId },
    include: { _count: { select: { items: true } } },
    orderBy: { id: 'desc' }
  })
  res.json(ventas.map((v) => ({ ...v, items: v._count.items })))
}

export async function buscar(req: Request, res: Response) {
  const { desde, hasta } = req.query as { desde: string; hasta: string }
  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: new Date(desde + 'T00:00:00'), lte: new Date(hasta + 'T23:59:59') } },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { id: 'desc' }
  })
  res.json(ventas.map((v) => ({ ...v, usuario_nombre: v.usuario.nombre })))
}

export async function detalle(req: Request, res: Response) {
  const id = Number(req.params.id)
  const venta = await prisma.venta.findUnique({ where: { id } })
  if (!venta) return res.json(null)

  const items = await prisma.ventaItem.findMany({
    where: { ventaId: id },
    include: { producto: { select: { nombre: true } } }
  })
  const pagos = await prisma.ventaPago.findMany({ where: { ventaId: id } })

  res.json({
    venta,
    items: items.map((it) => ({ ...it, producto_nombre: it.producto.nombre })),
    pagos
  })
}
