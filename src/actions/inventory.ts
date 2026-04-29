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
    select: { id: true, name: true, unit: true, currentStock: true, category: true, sellingPrice: true, sku: true },
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
  }
) {
  await requireAdminOrAbove()

  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
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
  method: 'CASH' | 'NETWORK'
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

  const totalCost = data.items.reduce(
    (sum, i) => sum + i.quantity * i.unitCost,
    0
  )

  await prisma.$transaction(async (tx) => {
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
  })

  revalidatePath('/inventory')
  revalidatePath('/')
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
    include: {
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

// ── Consume stock via sales (called alongside recordDailySales) ───────────────

export async function consumeInventoryItems(
  items: { itemId: number; quantity: number }[]
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  for (const item of items) {
    await prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.findUnique({
        where: { id: item.itemId },
      })
      if (!inv) return

      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { currentStock: { decrement: item.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: 'SALE_OUT',
          quantity: -item.quantity,
          note: 'Consumed during sale',
          recordedById: session.user.id,
        },
      })
    })
  }

  revalidatePath('/inventory')
}
