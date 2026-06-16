'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { InventoryCategory, MovementType, PayMethod } from '@prisma/client'
import { getBranchFilter, getCurrentBranchId } from '@/actions/branch-helpers'

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

  const branchFilter = await getBranchFilter()

  return prisma.inventoryItem.findMany({
    where: { isActive: true, ...branchFilter },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getAllInventoryItemsForSelect() {
  // Lightweight list for dropdowns (used in sales modal)
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const branchFilter = await getBranchFilter()

  return prisma.inventoryItem.findMany({
    where: { isActive: true, ...branchFilter },
    select: {
      id: true, name: true, unit: true, currentStock: true,
      category: true, sellingPrice: true, sku: true,
      barcode: true, barcodeType: true,
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
  barcode?: string
  barcodeType?: string
}) {
  console.log('[createInventoryItem] Starting...', data.name)
  const session = await requireAdminOrAbove()
  console.log('[createInventoryItem] Auth session obtained')

  console.log('[createInventoryItem] Creating item in DB...')
  const branchId = await getCurrentBranchId()
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
      barcode: data.barcode || null,
      barcodeType: data.barcode ? (data.barcodeType || 'CODE128') : null,
      branchId,
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
        branchId,
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
  basePrice: number      // Selling price from Excel (pre-VAT or VAT-inclusive depending on addVat)
  initialStock: number
  addVat: boolean        // true → apply 15% VAT on top of basePrice; false → basePrice is already the final price
}[]) {
  const session = await requireAdminOrAbove()

  const VAT_RATE = 0.15

  // Helper: round to 2 decimal places without floating-point drift
  const round2 = (n: number) => Math.round(n * 100) / 100

  const branchId = await getCurrentBranchId()

  // Prepare all rows with precise VAT / price computation
  const rows = items.map((data) => {
    let finalPrice: number
    let appliedVatRate: number

    if (data.addVat) {
      // Excel price is ex-VAT → add 15%
      finalPrice = round2(data.basePrice * (1 + VAT_RATE))
      appliedVatRate = VAT_RATE
    } else {
      // Excel price already includes VAT (or no VAT needed)
      finalPrice = round2(data.basePrice)
      appliedVatRate = 0
    }

    return {
      name: data.name,
      sku: data.sku || null,
      category: data.category,
      unit: data.unit,
      reorderLevel: Math.round(data.reorderLevel),
      unitCost: round2(data.unitCost),
      costIncludesVat: false,
      basePrice: round2(data.basePrice),
      vatRate: appliedVatRate,
      sellingPrice: finalPrice,
      currentStock: Math.round(data.initialStock),
      hasWarranty: false,
      branchId,
    }
  })

  // Single SQL INSERT — no transaction timeout, works for any number of rows
  const created = await prisma.inventoryItem.createManyAndReturn({ data: rows })

  // Record initial stock movements for items that have stock > 0
  const withStock = created
    .map((item, i) => ({ item, initialStock: Math.round(items[i].initialStock), unitCost: round2(items[i].unitCost) }))
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
        branchId,
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
    barcode?: string | null
    barcodeType?: string | null
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

export async function createStockAdjustment(data: {
  type: string
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
    throw new Error('Adjustment must have at least one item')
  }

  const isOut = data.type === 'OUT'
  const adjustmentNumber = `ADJ-${Date.now().toString().slice(-6)}`
  const totalCostImpact = data.items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0)

  const result = await prisma.$transaction(async (tx) => {
    // Check stock for OUT adjustments
    if (isOut) {
      for (const item of data.items) {
        const inventory = await tx.inventoryItem.findUnique({ where: { id: item.itemId } })
        if (!inventory) throw new Error(`Item not found`)
        if (inventory.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${inventory.name}`)
        }
      }
    }

    // 1. Create Adjustment Record
    const adj = await tx.stockAdjustment.create({
      data: {
        adjustmentNumber,
        type: data.type,
        reason: data.reason,
        notes: data.notes,
        totalCostImpact,
        createdById: session.user.id,
        items: {
          create: data.items.map(i => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unitCost: i.unitCost
          }))
        }
      }
    })

    // 2. Adjust Stock & Add Movements
    for (const item of data.items) {
      const qtyChange = isOut ? -item.quantity : item.quantity

      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { currentStock: { increment: qtyChange } }
      })

      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: isOut ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT',
          quantity: qtyChange,
          unitCost: item.unitCost,
          note: `Stock Adjustment [${data.reason}] ${adjustmentNumber}`,
          recordedById: session.user.id
        }
      })
    }
    
    // 3. Financial Log for OUT adjustments
    if (isOut) {
      await tx.transaction.create({
        data: {
          type: 'STOCK_ADJUSTMENT_LOSS',
          amount: totalCostImpact,
          method: 'CREDIT',
          description: `Stock Loss/Adjustment: ${data.reason} (${adjustmentNumber})`,
          recordedById: session.user.id,
          isInternal: true
        }
      })
    }
    
    return adj
  })

  revalidatePath('/inventory')
  return result
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  const branchFilter = await getBranchFilter()

  return prisma.purchaseOrder.findMany({
    where: { ...branchFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { id: true, name: true, companyName: true } },
      items: {
        include: { item: { select: { id: true, name: true, unit: true } } },
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

  const branchId = await getCurrentBranchId()

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
        branchId,
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
          branchId,
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
        branchId,
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

  const branchFilter = await getBranchFilter()

  return prisma.stockMovement.findMany({
    where: { ...branchFilter, ...(itemId ? { itemId } : {}) },
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

  const branchFilter = await getBranchFilter()

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true, ...branchFilter },
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

// ── Purchase Payment Method Correction ───────────────────────────────────────

export async function correctPurchasePaymentMethod(data: {
  purchaseOrderId: number
  newMethod: 'CASH' | 'NETWORK' | 'CREDIT'
  newAgentId?: number | null
  reason: string
}) {
  const session = await requireAdminOrAbove()

  if (!data.reason?.trim()) throw new Error('A reason is required.')

  // Load the PO with its linked transaction
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: data.purchaseOrderId },
    include: {
      returns: { where: { status: 'APPROVED' } },
    },
  })
  if (!po) throw new Error('Purchase order not found.')
  if (!po.transactionId) throw new Error('This purchase has no linked financial transaction and cannot be corrected.')

  const targetAgentId = data.newAgentId !== undefined ? data.newAgentId : po.agentId

  // Safety: already same method and same agent?
  if (po.method === data.newMethod && po.agentId === targetAgentId) {
    throw new Error(`Payment method is already ${data.newMethod} and representative is unchanged.`)
  }

  // Safety: block if there are approved returns (purchase reversed)
  if (po.returns.length > 0) {
    throw new Error('Cannot correct payment method: this purchase has approved return(s).')
  }

  // Load the linked transaction
  const txRecord = await prisma.transaction.findUnique({
    where: { id: po.transactionId },
  })
  if (!txRecord) throw new Error('Linked financial transaction not found.')

  // Safety: block if the transaction is locked in a financial settlement
  if (txRecord.settlementId) {
    throw new Error('Cannot correct payment method: this transaction is already included in a financial settlement.')
  }

  // Safety: block CREDIT → anything if no agent is linked
  if (data.newMethod === 'CREDIT' && !targetAgentId) {
    throw new Error('Cannot set method to CREDIT: this purchase has no linked representative.')
  }

  // Atomic update
  await prisma.$transaction(async (db) => {
    const oldMethod = po.method as PayMethod
    const oldAgentId = po.agentId

    // Update PurchaseOrder method and agent
    await db.purchaseOrder.update({
      where: { id: po.id },
      data: { 
        method: data.newMethod as PayMethod,
        agentId: targetAgentId,
      },
    })

    // Update linked Transaction method, agent and potentially description
    await db.transaction.update({
      where: { id: po.transactionId! },
      data: { 
        method: data.newMethod as PayMethod,
        agentId: targetAgentId,
        ...(targetAgentId && !oldAgentId ? { description: `Inventory purchase (PO #${po.id})` } : {}),
      },
    })

    // Write permanent audit record (reuse the existing PaymentMethodCorrection model)
    await db.paymentMethodCorrection.create({
      data: {
        invoiceNumber: `PO-${po.id}`,
        transactionId: po.transactionId!,
        oldMethod,
        newMethod: data.newMethod as PayMethod,
        oldAgentId,
        newAgentId: targetAgentId,
        reason: data.reason.trim(),
        correctedById: session.user.id,
      },
    })
  })

  revalidatePath('/inventory')
  revalidatePath('/')

  return { success: true, purchaseOrderId: po.id, newMethod: data.newMethod, newAgentId: targetAgentId }
}

// Note: consumeInventoryItems was removed — stock is consumed atomically
// inside recordDailySales (transactions.ts) to keep the operations atomic.
