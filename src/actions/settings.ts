'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function getSystemSettings() {
  let settings = await prisma.systemSettings.findFirst({
    where: { id: 1 }
  })

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: 1, enableDenominationCounting: true }
    })
  }

  return settings
}

export async function updateSystemSettings(data: { enableDenominationCounting: boolean }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'OWNER') {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data }
  })

  revalidatePath('/admin/settings')
  return settings
}

export async function factoryReset() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error("Only Super Admins can perform a factory reset")
  }

  try {
    await prisma.$transaction([
      prisma.warranty.deleteMany(),
      prisma.purchaseOrderItem.deleteMany(),
      prisma.stockMovement.deleteMany(),
      prisma.purchaseOrder.deleteMany(),
      prisma.inventoryItem.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.salarySettlement.deleteMany(),
      prisma.shift.deleteMany(),
      prisma.settlement.deleteMany(),
      prisma.agent.deleteMany(),
      prisma.customer.deleteMany(),
    ])

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Factory Reset Error:', error)
    return { error: error.message }
  }
}
