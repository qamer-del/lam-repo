'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { PayMethod } from '@prisma/client'
import { getBranchFilter, getCurrentBranchId } from '@/actions/branch-helpers'

// Helper to enforce admin
async function requireAdminOrAbove() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session!
}

export async function getPurchaseReturns() {
  await requireAdminOrAbove()
  const branchFilter = await getBranchFilter()
  
  return prisma.purchaseReturn.findMany({
    where: { ...branchFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { name: true } },
      purchaseOrder: { select: { id: true, method: true, createdAt: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      items: {
        include: { item: { select: { name: true, unit: true } } }
      }
    }
  })
}

export async function createPurchaseReturn(data: {
  purchaseOrderId: number
  agentId?: number
  reason: string
  notes?: string
  items: {
    itemId: number
    quantity: number
    unitCost: number
  }[]
}) {
  const session = await requireAdminOrAbove()

  if (!data.items || data.items.length === 0) {
    throw new Error('Return must have at least one item')
  }

  const branchId = await getCurrentBranchId()
  const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
  const returnNumber = `PR-${Date.now().toString().slice(-6)}`

  const returnRecord = await prisma.purchaseReturn.create({
    data: {
      returnNumber,
      purchaseOrderId: data.purchaseOrderId,
      agentId: data.agentId || null,
      reason: data.reason,
      notes: data.notes,
      totalAmount,
      createdById: session.user.id,
      branchId,
      items: {
        create: data.items.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitCost: i.unitCost,
          total: i.quantity * i.unitCost
        }))
      }
    }
  })

  revalidatePath('/inventory')
  return returnRecord
}

export async function approvePurchaseReturn(returnId: number) {
  const session = await requireAdminOrAbove()

  const pr = await prisma.purchaseReturn.findUnique({
    where: { id: returnId },
    include: { items: true, purchaseOrder: true }
  })

  if (!pr) throw new Error('Return not found')
  if (pr.status !== 'PENDING') throw new Error('Return is not pending')

  // Execute approval in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Verify and reduce stock
    for (const item of pr.items) {
      const inventory = await tx.inventoryItem.findUnique({ where: { id: item.itemId } })
      if (!inventory) throw new Error(`Item ${item.itemId} not found`)
      
      if (inventory.currentStock < item.quantity) {
        throw new Error(`Cannot approve return: insufficient stock for item ${inventory.name}. Required: ${item.quantity}, Available: ${inventory.currentStock}`)
      }

      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { currentStock: { decrement: item.quantity } }
      })

      // Create stock movement (PURCHASE_RETURN_OUT)
      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: 'PURCHASE_RETURN_OUT',
          quantity: -item.quantity,
          unitCost: item.unitCost,
          purchaseOrderId: pr.purchaseOrderId,
          note: `Purchase Return ${pr.returnNumber}`,
          recordedById: session.user.id
        }
      })
    }

    let transactionId: number | null = null

    // 2. Financial Impact
    // Whether it was paid or unpaid, the value returned decreases what we owe the supplier.
    if (pr.agentId) {
      const originalMethod = pr.purchaseOrder.method

      let transType: any = 'PURCHASE_RETURN'
      let description = `Purchase Return ${pr.returnNumber}`

      if (originalMethod === 'CASH' || originalMethod === 'NETWORK') {
        // If it was already paid for, returning it generates a Supplier Credit Note
        transType = 'SUPPLIER_CREDIT_NOTE'
        description = `Supplier Credit Note for Return ${pr.returnNumber}`
      }

      const txRecord = await tx.transaction.create({
        data: {
          type: transType,
          amount: pr.totalAmount, // Mathematically, we will treat this as an 'AGENT_PAYMENT' equivalent later in summaries
          method: 'CREDIT', // It's internal credit, no actual cash moved
          description,
          agentId: pr.agentId,
          recordedById: session.user.id
        }
      })
      transactionId = txRecord.id
    }

    // 3. Mark as approved
    await tx.purchaseReturn.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        approvedById: session.user.id,
        transactionId
      }
    })
  })

  revalidatePath('/inventory')
}

export async function rejectPurchaseReturn(returnId: number) {
  const session = await requireAdminOrAbove()
  
  await prisma.purchaseReturn.update({
    where: { id: returnId },
    data: { status: 'REJECTED' }
  })

  revalidatePath('/inventory')
}
