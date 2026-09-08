import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cantidadUsuarios = await prisma.usuario.count()
  if (cantidadUsuarios === 0) {
    await prisma.usuario.create({
      data: { nombre: 'Administrador', pin: '0000', rol: 'admin' }
    })
    console.log('Usuario admin creado (PIN 0000)')
  }

  await prisma.configuracion.upsert({
    where: { clave: 'hora_apertura_esperada' },
    update: {},
    create: { clave: 'hora_apertura_esperada', valor: '08:00' }
  })

  const cantidadMotivos = await prisma.motivoCaja.count()
  if (cantidadMotivos === 0) {
    const motivos: { nombre: string; tipo: 'ingreso' | 'egreso' }[] = [
      { nombre: 'Ingreso de dinero', tipo: 'ingreso' },
      { nombre: 'Depósito de sobre', tipo: 'ingreso' },
      { nombre: 'Mercado Pago', tipo: 'ingreso' },
      { nombre: 'Rappi', tipo: 'ingreso' },
      { nombre: 'Retiro de efectivo', tipo: 'egreso' },
      { nombre: 'Pago a proveedor', tipo: 'egreso' },
      { nombre: 'Pago a cuenta', tipo: 'egreso' },
      { nombre: 'Adelanto de sueldo', tipo: 'egreso' },
      { nombre: 'A cuenta sueldo', tipo: 'egreso' },
      { nombre: 'Pago por día personal', tipo: 'egreso' },
      { nombre: 'Otro gasto', tipo: 'egreso' }
    ]
    await prisma.motivoCaja.createMany({ data: motivos })
    console.log('Motivos de caja sembrados')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
