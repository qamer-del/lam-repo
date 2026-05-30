'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ConsumptionStatus, MovementType } from '@prisma/client'

export async function createConsumptionRequest(data: {
  itemId: number
  quantity: number
  staffId?: number | null
  employeeName?: string | null
  reason: string
  notes?: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  if (!data.staffId && !data.employeeName) {
    throw new Error('Either Staff or Employee Name must be provided')
  }

  return prisma.internalConsumptionRequest.create({
    data: {
      itemId: data.itemId,
      quantity: data.quantity,
      staffId: data.staffId,
      employeeName: data.employeeName,
      reason: data.reason,
      notes: data.notes,
      createdById: session.user.id,
      status: ConsumptionStatus.PENDING
    }
  })
}

export async function getConsumptionRequests(params?: {
  status?: ConsumptionStatus
  limit?: number
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  return prisma.internalConsumptionRequest.findMany({
    where: {
      ...(params?.status ? { status: params.status } : {}),
      // If Cashier, maybe they can only view their own? Or view all?
      // "Cashier: View own requests"
      ...(session.user.role === 'CASHIER' ? { createdById: session.user.id } : {})
    },
    include: {
      item: true,
      staff: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: params?.limit
  })
}

export async function approveConsumptionRequest(id: number) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER')) {
    throw new Error('Unauthorized')
  }

  // 1. Fetch request
  const request = await prisma.internalConsumptionRequest.findUnique({
    where: { id },
    include: { item: true }
  })
  if (!request) throw new Error('Request not found')
  if (request.status !== ConsumptionStatus.PENDING) throw new Error('Request is not pending')

  // 2. Perform transaction: Update stock, record movement, update request
  return prisma.$transaction(async (tx) => {
    // Check stock
    const item = await tx.inventoryItem.findUnique({ where: { id: request.itemId } })
    if (!item) throw new Error('Item not found')
    // Not enforcing strictly positive stock, as system currently allows negative? Let's just decrease.

    // Deduct stock
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: { decrement: request.quantity } }
    })

    // Record stock movement
    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        type: MovementType.INTERNAL_CONSUMPTION,
        quantity: -request.quantity, // Negative for consumption
        unitCost: item.unitCost, // Snapshot cost
        sellingPrice: item.sellingPrice,
        note: `Internal Consumption Request #${request.id}: ${request.reason}`,
        recordedById: session.user.id
      }
    })

    // Mark as approved
    return tx.internalConsumptionRequest.update({
      where: { id },
      data: {
        status: ConsumptionStatus.APPROVED,
        approvedById: session.user.id,
        approvedAt: new Date()
      }
    })
  })
}

export async function rejectConsumptionRequest(id: number, reason: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER')) {
    throw new Error('Unauthorized')
  }

  const request = await prisma.internalConsumptionRequest.findUnique({ where: { id } })
  if (!request) throw new Error('Request not found')
  if (request.status !== ConsumptionStatus.PENDING) throw new Error('Request is not pending')

  return prisma.internalConsumptionRequest.update({
    where: { id },
    data: {
      status: ConsumptionStatus.REJECTED,
      rejectedById: session.user.id,
      rejectedAt: new Date(),
      rejectionReason: reason
    }
  })
}

export async function reverseConsumptionRequest(id: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized. Only Super Admins can reverse requests.')
  }

  const request = await prisma.internalConsumptionRequest.findUnique({ where: { id } })
  if (!request) throw new Error('Request not found')
  if (request.status !== ConsumptionStatus.APPROVED) throw new Error('Request is not approved. Cannot reverse.')

  return prisma.$transaction(async (tx) => {
    // Restore stock
    await tx.inventoryItem.update({
      where: { id: request.itemId },
      data: { currentStock: { increment: request.quantity } }
    })

    // Record a reverse stock movement
    await tx.stockMovement.create({
      data: {
        itemId: request.itemId,
        type: MovementType.INTERNAL_CONSUMPTION,
        quantity: request.quantity, // Positive = returning stock
        note: `Reversal of Internal Consumption Request #${request.id}`,
        recordedById: session.user.id
      }
    })

    // Mark as pending or reversed? System asked to "Reverse transactions if needed".
    // We can mark it back to PENDING, or maybe add a "REVERSED" status? We only have PENDING/APPROVED/REJECTED.
    // Let's mark it as REJECTED and add note.
    return tx.internalConsumptionRequest.update({
      where: { id },
      data: {
        status: ConsumptionStatus.REJECTED,
        rejectionReason: 'Reversed by Super Admin',
        rejectedById: session.user.id,
        rejectedAt: new Date(),
        modifiedById: session.user.id
      }
    })
  })
}

export async function editConsumptionRequest(id: number, newQuantity: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized. Only Super Admins can edit approved requests.')
  }

  const request = await prisma.internalConsumptionRequest.findUnique({ where: { id } })
  if (!request) throw new Error('Request not found')
  if (request.status !== ConsumptionStatus.APPROVED) throw new Error('Can only edit approved requests')

  if (newQuantity <= 0) throw new Error('Quantity must be greater than zero')
  
  const diff = newQuantity - request.quantity
  if (diff === 0) return request // no change

  return prisma.$transaction(async (tx) => {
    // Update stock: if newQty > oldQty, diff is positive, so we deduct more.
    // If we deduct more, increment by -diff (decrement by diff).
    await tx.inventoryItem.update({
      where: { id: request.itemId },
      data: { currentStock: { decrement: diff } }
    })

    // Record adjustment stock movement
    await tx.stockMovement.create({
      data: {
        itemId: request.itemId,
        type: MovementType.INTERNAL_CONSUMPTION,
        quantity: -diff, // Negative if deducting more, positive if returning some
        note: `Correction of Internal Consumption Request #${request.id} from ${request.quantity} to ${newQuantity}`,
        recordedById: session.user.id
      }
    })

    return tx.internalConsumptionRequest.update({
      where: { id },
      data: {
        quantity: newQuantity,
        modifiedById: session.user.id
      }
    })
  })
}
