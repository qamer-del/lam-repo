'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { InventoryCategory, MovementType, PayMethod } from '@prisma/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdminOrAbove() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session!
}

async function requireSuperAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  return session!
}

// ── Inventory Items ───────────────────────────────────────────────────────────

export async function getInventoryItems() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getAllInventoryItemsForSelect() {
  // Lightweight list for dropdowns (used in sales modal)
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, unit: true, currentStock: true,
      category: true, sellingPrice: true, sku: true,
      hasWarranty: true, warrantyDuration: true, warrantyUnit: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function createInventoryItem(data: {
  name: string
  sku?: string
  category: InventoryCategory
  unit: string
  reorderLevel: number
  unitCost: number
  costIncludesVat?: boolean
  sellingPrice?: number
  initialStock?: number
  hasWarranty?: boolean
  warrantyDuration?: number
  warrantyUnit?: string
}) {
  console.log('[createInventoryItem] Starting...', data.name)
  const session = await requireAdminOrAbove()
  console.log('[createInventoryItem] Auth session obtained')

  console.log('[createInventoryItem] Creating item in DB...')
  const item = await prisma.inventoryItem.create({
    data: {
      name: data.name,
      sku: data.sku || null,
      category: data.category,
      unit: data.unit,
      reorderLevel: data.reorderLevel,
      unitCost: data.unitCost,
      costIncludesVat: data.costIncludesVat ?? false,
      sellingPrice: data.sellingPrice ?? 0,
      currentStock: data.initialStock ?? 0,
      hasWarranty: data.hasWarranty ?? false,
      warrantyDuration: data.hasWarranty ? (data.warrantyDuration ?? null) : null,
      warrantyUnit: data.hasWarranty ? (data.warrantyUnit ?? null) : null,
    },
  })

  // Record initial stock movement if stock > 0
  if ((data.initialStock ?? 0) > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'ADJUSTMENT',
        quantity: data.initialStock!,
        unitCost: data.unitCost,
        note: 'Initial stock entry',
        recordedById: session.user.id,
      },
    })
  }

  revalidatePath('/inventory')
  return item
}

export async function bulkCreateInventoryItems(items: {
  name: string
  sku?: string
  category: InventoryCategory
  unit: string
  reorderLevel: number
  unitCost: number
  basePrice: number      // Pre-VAT selling price from Excel
  initialStock: number
}[]) {
  const session = await requireAdminOrAbove()

  const VAT_RATE = 0.15

  // Prepare all rows with VAT computed upfront
  const rows = items.map((data) => {
    const vatAmount = data.basePrice * VAT_RATE
    const finalPrice = parseFloat((data.basePrice + vatAmount).toFixed(2))
    return {
      name: data.name,
      sku: data.sku || null,
      category: data.category,
      unit: data.unit,
      reorderLevel: data.reorderLevel,
      unitCost: data.unitCost,
      costIncludesVat: false,
      basePrice: data.basePrice,
      vatRate: VAT_RATE,
      sellingPrice: finalPrice,
      currentStock: data.initialStock,
      hasWarranty: false,
    }
  })

  // Single SQL INSERT — no transaction timeout, works for any number of rows
  const created = await prisma.inventoryItem.createManyAndReturn({ data: rows })

  // Record initial stock movements for items that have stock > 0
  const withStock = created
    .map((item, i) => ({ item, initialStock: items[i].initialStock, unitCost: items[i].unitCost }))
    .filter(({ initialStock }) => initialStock > 0)

  if (withStock.length > 0) {
    await prisma.stockMovement.createMany({
      data: withStock.map(({ item, initialStock, unitCost }) => ({
        itemId: item.id,
        type: 'ADJUSTMENT' as const,
        quantity: initialStock,
        unitCost,
        note: 'Initial stock — imported from Excel',
        recordedById: session.user.id,
      })),
    })
  }

  revalidatePath('/inventory')
  return created
}

export async function updateInventoryItem(
  id: number,
  data: {
    name?: string
    sku?: string
    category?: InventoryCategory
    unit?: string
    reorderLevel?: number
    unitCost?: number
    costIncludesVat?: boolean
    sellingPrice?: number
    hasWarranty?: boolean
    warrantyDuration?: number | null
    warrantyUnit?: string | null
  }
) {
  await requireAdminOrAbove()

  // If warranty is being turned off, clear duration/unit
  const updateData = {
    ...data,
    warrantyDuration: data.hasWarranty === false ? null : data.warrantyDuration,
    warrantyUnit: data.hasWarranty === false ? null : data.warrantyUnit,
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/inventory')
  return item
}

export async function deactivateInventoryItem(id: number) {
  await requireAdminOrAbove()

  await prisma.inventoryItem.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/inventory')
}

// ── Stock Adjustments ─────────────────────────────────────────────────────────

export async function adjustStock(data: {
  itemId: number
  quantity: number // positive = add, negative = remove
  note?: string
}) {
  const session = await requireSuperAdmin()

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: data.itemId },
      data: { currentStock: { increment: data.quantity } },
    })

    await tx.stockMovement.create({
      data: {
        itemId: data.itemId,
        type: 'ADJUSTMENT',
        quantity: data.quantity,
        note: data.note,
        recordedById: session.user.id,
      },
    })
  })

  revalidatePath('/inventory')
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { name: true, companyName: true } },
      items: {
        include: { item: { select: { name: true, unit: true } } },
      },
      recordedBy: { select: { name: true } },
    },
  })
}

export async function createPurchaseOrder(data: {
  agentId?: number
  method: 'CASH' | 'NETWORK' | 'CREDIT'
  note?: string
  items: {
    itemId: number
    quantity: number
    unitCost: number
  }[]
}) {
  const session = await requireAdminOrAbove()

  if (!data.items || data.items.length === 0) {
    throw new Error('Purchase order must have at least one item')
  }

  if (data.method === 'CREDIT' && !data.agentId) {
    throw new Error('Agent must be selected for CREDIT purchases')
  }

  const totalCost = data.items.reduce(
    (sum, i) => sum + i.quantity * i.unitCost,
    0
  )

  const txRecord = await prisma.$transaction(async (tx) => {
    // 1. Create PO
    const po = await tx.purchaseOrder.create({
      data: {
        agentId: data.agentId || null,
        status: 'RECEIVED',
        totalCost,
        method: data.method as PayMethod,
        note: data.note,
        receivedAt: new Date(),
        recordedById: session.user.id,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.quantity * i.unitCost,
          })),
        },
      },
    })

    // 2. Update stock for each item + create stock movement
    for (const lineItem of data.items) {
      await tx.inventoryItem.update({
        where: { id: lineItem.itemId },
        data: {
          currentStock: { increment: lineItem.quantity },
          unitCost: lineItem.unitCost, // update to latest cost
        },
      })

      await tx.stockMovement.create({
        data: {
          itemId: lineItem.itemId,
          type: 'PURCHASE_IN',
          quantity: lineItem.quantity,
          unitCost: lineItem.unitCost,
          purchaseOrderId: po.id,
          note: `Purchase Order #${po.id}`,
          recordedById: session.user.id,
        },
      })
    }

    // 3. Create financial transaction (AGENT_PURCHASE) for cash flow tracking
    const txRecord = await tx.transaction.create({
      data: {
        type: 'AGENT_PURCHASE',
        amount: totalCost,
        method: data.method as PayMethod,
        description: data.agentId
          ? `Inventory purchase (PO #${po.id})`
          : `Inventory purchase — no supplier (PO #${po.id})`,
        agentId: data.agentId || null,
        recordedById: session.user.id,
      },
    })

    // 4. Link transaction back to PO
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { transactionId: txRecord.id },
    })

    return txRecord
  })

  revalidatePath('/inventory')
  revalidatePath('/')

  return await prisma.transaction.findUnique({
    where: { id: txRecord.id },
    include: { recordedBy: { select: { name: true } } }
  })
}

// ── Stock Movements ───────────────────────────────────────────────────────────

export async function getStockMovements(itemId?: number) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.stockMovement.findMany({
    where: itemId ? { itemId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      type: true,
      quantity: true,
      unitCost: true,
      isRestocked: true,
      invoiceNumber: true,
      note: true,
      createdAt: true,
      item: { select: { name: true, unit: true } },
      recordedBy: { select: { name: true } },
    },
  })
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export async function getInventorySummary() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    return null
  }

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { currentStock: true, reorderLevel: true, unitCost: true },
  })

  const totalValue = items.reduce(
    (sum, i) => sum + i.currentStock * i.unitCost,
    0
  )
  const lowStockCount = items.filter(
    (i) => i.currentStock <= i.reorderLevel
  ).length
  const outOfStockCount = items.filter((i) => i.currentStock <= 0).length

  return { totalValue, lowStockCount, outOfStockCount, totalItems: items.length }
}

// Note: consumeInventoryItems was removed — stock is consumed atomically
// inside recordDailySales (transactions.ts) to keep the operations atomic.
