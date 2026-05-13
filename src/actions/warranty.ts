'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { addMonths, addDays, isPast } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeEndDate(saleDate: Date, duration: number, unit: string): Date {
  if (unit === 'days') return addDays(saleDate, duration)
  return addMonths(saleDate, duration)
}

// ── Auto-create warranties after sale ─────────────────────────────────────────

export async function createWarrantyRecordsForSale(data: {
  invoiceNumber: string
  saleDate: Date
  items: { itemId: number; quantity: number }[]
  customerId?: number
  customerName?: string
  customerPhone?: string
}) {
  const itemIds = data.items.map((i) => i.itemId)
  const invItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds }, hasWarranty: true },
    select: { id: true, hasWarranty: true, warrantyDuration: true, warrantyUnit: true },
  })

  if (invItems.length === 0) return []

  const warranties = []
  for (const inv of invItems) {
    if (!inv.hasWarranty || !inv.warrantyDuration || !inv.warrantyUnit) continue
    const warrantyEndDate = computeEndDate(data.saleDate, inv.warrantyDuration, inv.warrantyUnit)
    warranties.push({
      invoiceNumber: data.invoiceNumber,
      itemId: inv.id,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      saleDate: data.saleDate,
      warrantyEndDate,
      status: 'ACTIVE' as const,
    })
  }

  if (warranties.length === 0) return []

  await prisma.warranty.createMany({ data: warranties })

  return prisma.warranty.findMany({
    where: { invoiceNumber: data.invoiceNumber },
    include: { item: { select: { name: true, warrantyDuration: true, warrantyUnit: true } } },
  })
}

// ── Public: Check warranty status ─────────────────────────────────────────────

export async function checkWarrantyStatus(params: {
  invoiceNumber?: string
  sku?: string
}) {
  const now = new Date()

  let warranties = await prisma.warranty.findMany({
    where: params.invoiceNumber
      ? { invoiceNumber: params.invoiceNumber }
      : params.sku
      ? { item: { sku: params.sku } }
      : { id: -1 },
    include: {
      item: {
        select: { name: true, sku: true, warrantyDuration: true, warrantyUnit: true },
      },
      customer: { select: { name: true, phone: true } },
      replacements: {
        orderBy: { createdAt: 'desc' },
        include: {
          recordedBy: { select: { name: true } },
          replacementItem: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (warranties.length === 0) return []

  // Auto-expire overdue active warranties
  const expiredIds = warranties
    .filter((w) => w.status === 'ACTIVE' && isPast(new Date(w.warrantyEndDate)))
    .map((w) => w.id)

  if (expiredIds.length > 0) {
    await prisma.warranty.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'EXPIRED' },
    })
    warranties = warranties.map((w) =>
      expiredIds.includes(w.id) ? { ...w, status: 'EXPIRED' as const } : w
    )
  }

  return warranties
}

// ── Get warranties for an invoice (claim modal) ───────────────────────────────

export async function getWarrantiesByInvoice(invoiceNumber: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const warranties = await prisma.warranty.findMany({
    where: { invoiceNumber },
    include: {
      item: { select: { id: true, name: true, sku: true, currentStock: true, unit: true, warrantyDuration: true, warrantyUnit: true } },
      customer: { select: { name: true, phone: true } },
      replacements: {
        orderBy: { createdAt: 'desc' },
        include: {
          recordedBy: { select: { name: true } },
          replacementItem: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const expiredIds = warranties
    .filter((w) => w.status === 'ACTIVE' && isPast(new Date(w.warrantyEndDate)))
    .map((w) => w.id)

  if (expiredIds.length > 0) {
    await prisma.warranty.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'EXPIRED' },
    })
  }

  return warranties.map((w) => ({
    ...w,
    status: expiredIds.includes(w.id) ? ('EXPIRED' as const) : w.status,
  }))
}

// ── Process a warranty replacement ────────────────────────────────────────────
// WARRANTY STAYS ACTIVE. Unlimited replacements until warrantyEndDate.

export async function processWarrantyClaim(data: {
  warrantyId: number
  claimNotes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const warranty = await prisma.warranty.findUnique({
    where: { id: data.warrantyId },
    include: {
      item: { select: { id: true, name: true, currentStock: true, unit: true, unitCost: true, sellingPrice: true } },
    },
  })

  if (!warranty) throw new Error('Warranty record not found')

  // Block only if expired — NOT if already replaced
  if (warranty.status === 'EXPIRED' || isPast(new Date(warranty.warrantyEndDate))) {
    await prisma.warranty.update({ where: { id: warranty.id }, data: { status: 'EXPIRED' } })
    throw new Error('This warranty has expired and cannot be claimed.')
  }

  if ((warranty.item.currentStock ?? 0) < 1) {
    throw new Error('Insufficient stock to process this replacement.')
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Decrement available stock (replacement item going out)
    await tx.inventoryItem.update({
      where: { id: warranty.itemId },
      data: {
        currentStock: { decrement: 1 },
        warrantyReturnStock: { increment: 1 }, // defective item coming in
      },
    })

    // 2. Stock movement: replacement item out
    await tx.stockMovement.create({
      data: {
        itemId: warranty.itemId,
        type: 'WARRANTY_OUT',
        quantity: -1,
        unitCost: warranty.item.unitCost,
        sellingPrice: 0,
        note: `Warranty replacement #${warranty.replacementCount + 1} — Invoice ${warranty.invoiceNumber}. ${data.claimNotes || ''}`.trim(),
        invoiceNumber: warranty.invoiceNumber,
        recordedById: session.user.id,
      },
    })

    // 3. Stock movement: defective item in (warranty return pool)
    await tx.stockMovement.create({
      data: {
        itemId: warranty.itemId,
        type: 'WARRANTY_RETURN_IN',
        quantity: 1,
        unitCost: warranty.item.unitCost,
        note: `Defective return — Warranty #${warranty.id}, Invoice ${warranty.invoiceNumber}`,
        invoiceNumber: warranty.invoiceNumber,
        recordedById: session.user.id,
        isRestocked: false,
      },
    })

    // 4. Zero-amount WARRANTY_REPLACEMENT transaction
    const claimTx = await tx.transaction.create({
      data: {
        type: 'WARRANTY_REPLACEMENT',
        amount: 0,
        method: 'CASH',
        description: `[WARRANTY_REPLACEMENT #${warranty.replacementCount + 1}] ${warranty.item.name} — Invoice ${warranty.invoiceNumber}. ${data.claimNotes || ''}`.trim(),
        invoiceNumber: warranty.invoiceNumber,
        customerId: warranty.customerId || undefined,
        customerName: warranty.customerName || undefined,
        customerPhone: warranty.customerPhone || undefined,
        recordedById: session.user.id,
        isSettled: true,
      },
    })

    // 5. Create WarrantyReplacement audit record
    const replacementRecord = await tx.warrantyReplacement.create({
      data: {
        warrantyId: warranty.id,
        replacementItemId: warranty.itemId, // same item given back
        defectiveItemId: warranty.itemId,   // same item returned defective
        quantity: 1,
        notes: data.claimNotes || null,
        recordedById: session.user.id,
        transactionId: claimTx.id,
      },
    })

    // 6. Update warranty: stay ACTIVE, increment replacementCount
    const updated = await tx.warranty.update({
      where: { id: warranty.id },
      data: {
        replacementCount: { increment: 1 },
        claimedAt: new Date(), // last claim date (compat)
        claimNotes: data.claimNotes || null,
        replacementTransactionId: claimTx.id,
        // status stays ACTIVE — no change unless expired
      },
    })

    return { warranty: updated, transaction: claimTx, replacement: replacementRecord }
  })

  revalidatePath('/warranty')
  revalidatePath('/inventory')
  return result
}

// ── Admin queries ─────────────────────────────────────────────────────────────

export async function getActiveWarranties() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  await prisma.warranty.updateMany({
    where: { status: 'ACTIVE', warrantyEndDate: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  })

  return prisma.warranty.findMany({
    where: { status: 'ACTIVE' },
    include: {
      item: { select: { name: true, sku: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { warrantyEndDate: 'asc' },
    take: 500,
  })
}

export async function getExpiringSoonWarranties(days = 30) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  const cutoff = addDays(new Date(), days)

  return prisma.warranty.findMany({
    where: {
      status: 'ACTIVE',
      warrantyEndDate: { lte: cutoff, gte: new Date() },
    },
    include: {
      item: { select: { name: true, sku: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { warrantyEndDate: 'asc' },
    take: 200,
  })
}

export async function getWarrantyStats() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    return null
  }

  const now = new Date()
  const in30 = addDays(now, 30)

  const [active, expiringSoon, replaced, expired, pendingSupplierCases, totalReplacements] = await Promise.all([
    prisma.warranty.count({ where: { status: 'ACTIVE' } }),
    prisma.warranty.count({ where: { status: 'ACTIVE', warrantyEndDate: { lte: in30 } } }),
    prisma.warranty.count({ where: { replacementCount: { gt: 0 } } }),
    prisma.warranty.count({ where: { status: 'EXPIRED' } }),
    prisma.supplierWarrantyCase.count({ where: { status: { in: ['PENDING', 'SENT_TO_SUPPLIER'] } } }),
    prisma.warrantyReplacement.count(),
  ])

  // Warranty return stock summary across all items
  const returnStockAgg = await prisma.inventoryItem.aggregate({
    _sum: { warrantyReturnStock: true, damagedStock: true },
    where: { OR: [{ warrantyReturnStock: { gt: 0 } }, { damagedStock: { gt: 0 } }] },
  })

  return {
    active,
    expiringSoon,
    replaced,
    expired,
    pendingSupplierCases,
    totalReplacements,
    warrantyReturnItems: returnStockAgg._sum.warrantyReturnStock || 0,
    damagedItems: returnStockAgg._sum.damagedStock || 0,
  }
}

// ── Replacement history ───────────────────────────────────────────────────────

export async function getReplacementHistory(limit = 100) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.warrantyReplacement.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      warranty: {
        select: { invoiceNumber: true, customerName: true, warrantyEndDate: true },
      },
      replacementItem: { select: { name: true, sku: true } },
      recordedBy: { select: { name: true } },
    },
  })
}

// ── Warranty return stock inventory ──────────────────────────────────────────

export async function getWarrantyReturnStock() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.inventoryItem.findMany({
    where: { OR: [{ warrantyReturnStock: { gt: 0 } }, { damagedStock: { gt: 0 } }] },
    select: {
      id: true, name: true, sku: true, unit: true,
      warrantyReturnStock: true, damagedStock: true, unitCost: true,
    },
    orderBy: { warrantyReturnStock: 'desc' },
  })
}

// ── Supplier Warranty Cases ───────────────────────────────────────────────────

export async function getSupplierWarrantyCases() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.supplierWarrantyCase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      agent: { select: { name: true, companyName: true } },
      createdBy: { select: { name: true } },
      items: {
        include: { item: { select: { name: true, sku: true, unit: true } } },
      },
    },
  })
}

export async function createSupplierWarrantyCase(data: {
  agentId?: number
  referenceNumber?: string
  notes?: string
  items: { itemId: number; quantity: number; notes?: string }[]
}) {
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user?.id || (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER')) {
    throw new Error('Unauthorized')
  }

  // Validate sufficient warrantyReturnStock for each item
  for (const lineItem of data.items) {
    const inv = await prisma.inventoryItem.findUnique({
      where: { id: lineItem.itemId },
      select: { warrantyReturnStock: true, name: true },
    })
    if (!inv) throw new Error(`Item #${lineItem.itemId} not found`)
    if ((inv.warrantyReturnStock || 0) < lineItem.quantity) {
      throw new Error(`Insufficient warranty return stock for "${inv.name}". Available: ${inv.warrantyReturnStock}, Requested: ${lineItem.quantity}`)
    }
  }

  const supplierCase = await prisma.$transaction(async (tx) => {
    const newCase = await tx.supplierWarrantyCase.create({
      data: {
        agentId: data.agentId || null,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
        status: 'PENDING',
        createdById: session.user.id,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        },
      },
      include: {
        items: { include: { item: { select: { name: true } } } },
        agent: { select: { name: true } },
      },
    })
    return newCase
  })

  revalidatePath('/warranty')
  return supplierCase
}

export async function markSupplierCaseSent(caseId: number, referenceNumber?: string) {
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user?.id || (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER')) {
    throw new Error('Unauthorized')
  }

  const updated = await prisma.supplierWarrantyCase.update({
    where: { id: caseId },
    data: {
      status: 'SENT_TO_SUPPLIER',
      sentAt: new Date(),
      ...(referenceNumber ? { referenceNumber } : {}),
    },
  })

  revalidatePath('/warranty')
  return updated
}

export async function resolveSupplierCase(data: {
  caseId: number
  resolution: 'REPLACED' | 'REPAIRED' | 'REFUNDED' | 'REJECTED'
  notes?: string
  refundAmount?: number // for REFUNDED resolution
}) {
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user?.id || (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER')) {
    throw new Error('Unauthorized')
  }

  const supplierCase = await prisma.supplierWarrantyCase.findUnique({
    where: { id: data.caseId },
    include: {
      items: { include: { item: true } },
      agent: { select: { id: true, name: true } },
    },
  })

  if (!supplierCase) throw new Error('Supplier case not found')
  if (supplierCase.status === 'CLOSED') throw new Error('This case is already closed')

  await prisma.$transaction(async (tx) => {
    const resolutionStatus = data.resolution === 'REPLACED' ? 'REPLACED'
      : data.resolution === 'REPAIRED' ? 'REPAIRED'
      : data.resolution === 'REFUNDED' ? 'REFUNDED'
      : 'REJECTED'

    for (const caseItem of supplierCase.items) {
      if (data.resolution === 'REPLACED' || data.resolution === 'REPAIRED') {
        // Items come back into available stock
        await tx.inventoryItem.update({
          where: { id: caseItem.itemId },
          data: {
            currentStock: { increment: caseItem.quantity },
            warrantyReturnStock: { decrement: caseItem.quantity },
          },
        })
        await tx.stockMovement.create({
          data: {
            itemId: caseItem.itemId,
            type: 'RETURN_IN',
            quantity: caseItem.quantity,
            unitCost: caseItem.item.unitCost,
            note: `Supplier warranty ${data.resolution.toLowerCase()} — Case #${data.caseId}`,
            recordedById: session.user.id,
          },
        })
      } else if (data.resolution === 'REJECTED') {
        // Items move to damaged stock
        await tx.inventoryItem.update({
          where: { id: caseItem.itemId },
          data: {
            damagedStock: { increment: caseItem.quantity },
            warrantyReturnStock: { decrement: caseItem.quantity },
          },
        })
      } else if (data.resolution === 'REFUNDED') {
        // Items removed from warranty return stock entirely
        await tx.inventoryItem.update({
          where: { id: caseItem.itemId },
          data: { warrantyReturnStock: { decrement: caseItem.quantity } },
        })
      }

      // Update each case item with resolution
      await tx.supplierWarrantyCaseItem.update({
        where: { id: caseItem.id },
        data: { resolutionType: data.resolution, resolvedAt: new Date() },
      })
    }

    // If refunded — create financial transaction
    if (data.resolution === 'REFUNDED' && data.refundAmount && data.refundAmount > 0) {
      await tx.transaction.create({
        data: {
          type: 'SUPPLIER_WARRANTY_REFUND',
          amount: data.refundAmount,
          method: 'CASH',
          description: `[SUPPLIER_WARRANTY_REFUND] Supplier case #${data.caseId}${supplierCase.referenceNumber ? ` Ref: ${supplierCase.referenceNumber}` : ''}. ${data.notes || ''}`.trim(),
          agentId: supplierCase.agentId || undefined,
          recordedById: session.user.id,
          isSettled: false,
          isInternal: false,
        },
      })
    }

    // Close the case
    await tx.supplierWarrantyCase.update({
      where: { id: data.caseId },
      data: {
        status: resolutionStatus as any,
        resolvedAt: new Date(),
        notes: data.notes ? (supplierCase.notes ? `${supplierCase.notes}\n${data.notes}` : data.notes) : supplierCase.notes,
      },
    })
  })

  revalidatePath('/warranty')
  revalidatePath('/inventory')
}
