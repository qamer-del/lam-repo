'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { addMonths, addDays, isPast } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeEndDate(saleDate: Date, duration: number, unit: string): Date {
  if (unit === 'days') return addDays(saleDate, duration)
  return addMonths(saleDate, duration) // default: months
}

// ── Auto-create warranties after sale ─────────────────────────────────────────

/**
 * Called internally from recordDailySales.
 * For each consumed item that has hasWarranty = true,
 * creates a Warranty record.
 */
export async function createWarrantyRecordsForSale(data: {
  invoiceNumber: string
  saleDate: Date
  items: { itemId: number; quantity: number }[]
  customerId?: number
  customerName?: string
  customerPhone?: string
}) {
  // Fetch warranty config for each item
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

  // Return created warranties with item info for the notification
  return prisma.warranty.findMany({
    where: { invoiceNumber: data.invoiceNumber },
    include: { item: { select: { name: true, warrantyDuration: true, warrantyUnit: true } } },
  })
}

// ── Public: Check warranty status ─────────────────────────────────────────────

/**
 * Public lookup — no auth required.
 * Accepts invoice number or item SKU.
 * Auto-updates status to EXPIRED if warrantyEndDate has passed.
 */
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
      : { id: -1 }, // impossible match if neither provided
    include: {
      item: {
        select: { name: true, sku: true, warrantyDuration: true, warrantyUnit: true },
      },
      customer: { select: { name: true, phone: true } },
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
    // Reflect in-memory
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

  const now = new Date()
  const warranties = await prisma.warranty.findMany({
    where: { invoiceNumber },
    include: {
      item: { select: { id: true, name: true, sku: true, currentStock: true, unit: true, warrantyDuration: true, warrantyUnit: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Auto-expire
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

// ── Process a warranty claim (replacement) ────────────────────────────────────

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
  if (warranty.status === 'CLAIMED') throw new Error('This warranty has already been claimed.')
  if (warranty.status === 'EXPIRED' || isPast(new Date(warranty.warrantyEndDate))) {
    // Mark expired if not already
    await prisma.warranty.update({ where: { id: warranty.id }, data: { status: 'EXPIRED' } })
    throw new Error('This warranty has expired and cannot be claimed.')
  }
  if ((warranty.item.currentStock ?? 0) < 1) {
    throw new Error('Insufficient stock to process this replacement.')
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Decrement stock
    await tx.inventoryItem.update({
      where: { id: warranty.itemId },
      data: { currentStock: { decrement: 1 } },
    })

    // 2. Create stock movement
    await tx.stockMovement.create({
      data: {
        itemId: warranty.itemId,
        type: 'SALE_OUT',
        quantity: -1,
        unitCost: warranty.item.unitCost,
        sellingPrice: 0, // replacement — no revenue
        note: `Warranty replacement — Invoice ${warranty.invoiceNumber}. ${data.claimNotes || ''}`.trim(),
        invoiceNumber: warranty.invoiceNumber,
        recordedById: session.user.id,
      },
    })

    // 3. Create WARRANTY_REPLACEMENT transaction (zero-amount — no cash flow)
    const claimTx = await tx.transaction.create({
      data: {
        type: 'WARRANTY_REPLACEMENT',
        amount: 0,
        method: 'CASH',
        description: `[WARRANTY_REPLACEMENT] Item: ${warranty.item.name} — Invoice ${warranty.invoiceNumber}. ${data.claimNotes || ''}`.trim(),
        invoiceNumber: warranty.invoiceNumber,
        customerId: warranty.customerId || undefined,
        customerName: warranty.customerName || undefined,
        customerPhone: warranty.customerPhone || undefined,
        recordedById: session.user.id,
        isSettled: true, // no cash flow impact — skip drawer
      },
    })

    // 4. Mark warranty as CLAIMED
    const updated = await tx.warranty.update({
      where: { id: warranty.id },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
        claimNotes: data.claimNotes,
        replacementTransactionId: claimTx.id,
      },
    })

    return { warranty: updated, transaction: claimTx }
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

  const now = new Date()

  // Auto-expire any that have passed
  await prisma.warranty.updateMany({
    where: { status: 'ACTIVE', warrantyEndDate: { lt: now } },
    data: { status: 'EXPIRED' },
  })

  return prisma.warranty.findMany({
    where: { status: 'ACTIVE' },
    include: {
      item: { select: { name: true, sku: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { warrantyEndDate: 'asc' },
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

  const [active, expiringSoon, claimed, expired] = await Promise.all([
    prisma.warranty.count({ where: { status: 'ACTIVE' } }),
    prisma.warranty.count({ where: { status: 'ACTIVE', warrantyEndDate: { lte: in30 } } }),
    prisma.warranty.count({ where: { status: 'CLAIMED' } }),
    prisma.warranty.count({ where: { status: 'EXPIRED' } }),
  ])

  return { active, expiringSoon, claimed, expired }
}
