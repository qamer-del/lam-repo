import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ConsumptionClient } from '@/components/inventory/consumption-client'

export const dynamic = 'force-dynamic'

export default async function InternalConsumptionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userRole = session.user.role

  try {
    const [inventoryItems, staffMembers, requests] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, unit: true, currentStock: true, unitCost: true }
      }),
      prisma.staff.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.internalConsumptionRequest.findMany({
        where: userRole === 'CASHIER' ? { createdById: session.user.id } : {},
        include: {
          item: { select: { id: true, name: true, unit: true, unitCost: true } },
          staff: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          rejectedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    return (
      <ConsumptionClient
        requests={requests as any}
        inventoryItems={inventoryItems}
        staffMembers={staffMembers}
        userRole={userRole}
      />
    )
  } catch (error: any) {
    return (
      <div className="p-8 mt-20">
        <h1 className="text-red-500 font-bold text-xl">Error loading page</h1>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm text-gray-800">{error.message}</pre>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-xs text-gray-600">{error.stack}</pre>
      </div>
    )
  }
}
