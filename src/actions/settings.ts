'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function factoryReset() {
  const session = await auth()
  
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return { error: 'Unauthorized. Only super admins can perform a factory reset.' }
  }

  try {
    // Delete in reverse order of relationships to prevent foreign key constraints
    await prisma.warranty.deleteMany({})
    await prisma.purchaseOrderItem.deleteMany({})
    await prisma.stockMovement.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.purchaseOrder.deleteMany({})
    await prisma.salarySettlement.deleteMany({})
    await prisma.settlement.deleteMany({})
    await prisma.inventoryItem.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.agent.deleteMany({})
    await prisma.staff.deleteMany({})
    
    // We intentionally do NOT delete users, so the admin can log back in.
    
    revalidatePath('/')
    revalidatePath('/staff')
    revalidatePath('/sales')
    revalidatePath('/agents')
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('Factory reset failed:', error)
    return { error: 'Failed to complete factory reset.' }
  }
}
