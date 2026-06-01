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
      data: { id: 1, enableDenominationCounting: true, payrollMode: 'ATTENDANCE' }
    })
  }

  return settings
}

export async function updateSystemSettings(data: {
  enableDenominationCounting?: boolean
  payrollMode?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'OWNER') {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, enableDenominationCounting: true, payrollMode: 'ATTENDANCE', ...data }
  })

  revalidatePath('/admin/settings')
  revalidatePath('/staff')
  return settings
}

export async function factoryReset() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error("Only Super Admins can perform a factory reset")
  }

  const currentUserId = session.user.id

  try {
    await prisma.$transaction([
      // 1. Deepest children first: warranty replacements reference warranty AND inventoryItem
      prisma.warrantyReplacement.deleteMany(),

      // 2. Supplier case items reference SupplierWarrantyCase AND inventoryItem
      prisma.supplierWarrantyCaseItem.deleteMany(),

      // 3. Supplier warranty cases (parent of items above)
      prisma.supplierWarrantyCase.deleteMany(),

      // 4. Warranties reference inventoryItem and customer
      prisma.warranty.deleteMany(),

      // 5. Internal consumption requests reference inventoryItem AND staff
      prisma.internalConsumptionRequest.deleteMany(),

      // 6. Inventory children: stock movements and purchase order items reference inventoryItem
      prisma.purchaseOrderItem.deleteMany(),
      prisma.stockMovement.deleteMany(),

      // 7. Purchase orders (parent of items above)
      prisma.purchaseOrder.deleteMany(),

      // 8. Inventory items (parent of everything above)
      prisma.inventoryItem.deleteMany(),

      // 9. BNPL sessions reference customer and shift
      prisma.bnplSession.deleteMany(),

      // 10. Transactions (self-referential — PostgreSQL handles in one pass)
      prisma.transaction.deleteMany(),

      // 11. Salary settlements reference staff (transactions already cleared)
      prisma.salarySettlement.deleteMany(),

      // 12. Attendance and absence records reference staff
      prisma.attendanceRecord.deleteMany(),
      prisma.absenceRecord.deleteMany(),

      // 13. Staff profiles (now safe — no more child records)
      prisma.staff.deleteMany(),

      // 14. Settlements reference performedBy (User) — transactions already cleared
      prisma.settlement.deleteMany(),

      // 15. Shifts reference settlement (now gone) and users
      prisma.shift.deleteMany(),

      // 16. Top-level registries
      prisma.agent.deleteMany(),
      prisma.customer.deleteMany(),

      // 17. Delete ALL users except the Super Admin performing the reset
      prisma.user.deleteMany({
        where: { id: { not: currentUserId } },
      }),
    ])

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Factory Reset Error:', error)
    return { error: error.message }
  }
}

