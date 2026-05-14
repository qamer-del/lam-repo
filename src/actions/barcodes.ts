'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { generateRandomBarcode, validateBarcode } from '@/lib/barcode'
import type { BarcodeType, LabelConfig } from '@/lib/barcode'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdminOrAbove() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session!
}

// ── Barcode Assignment ────────────────────────────────────────────────────────

export async function assignBarcode(data: {
  itemId: number
  barcode: string
  barcodeType: BarcodeType
}) {
  await requireAdminOrAbove()

  const validation = validateBarcode(data.barcodeType, data.barcode)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid barcode')
  }

  // Check uniqueness (excluding current item)
  const existing = await prisma.inventoryItem.findFirst({
    where: {
      barcode: data.barcode,
      id: { not: data.itemId },
    },
  })
  if (existing) {
    throw new Error(`Barcode "${data.barcode}" is already assigned to "${existing.name}"`)
  }

  const item = await prisma.inventoryItem.update({
    where: { id: data.itemId },
    data: {
      barcode: data.barcode,
      barcodeType: data.barcodeType,
    },
  })

  revalidatePath('/inventory')
  revalidatePath('/inventory/barcodes')
  return item
}

export async function autoGenerateBarcode(data: {
  itemId: number
  barcodeType: BarcodeType
}) {
  await requireAdminOrAbove()

  // Try up to 5 times to generate a unique barcode
  for (let attempt = 0; attempt < 5; attempt++) {
    const barcode = generateRandomBarcode(data.barcodeType)
    const existing = await prisma.inventoryItem.findFirst({
      where: { barcode },
    })
    if (!existing) {
      const item = await prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: { barcode, barcodeType: data.barcodeType },
      })
      revalidatePath('/inventory')
      revalidatePath('/inventory/barcodes')
      return item
    }
  }

  throw new Error('Failed to generate unique barcode after 5 attempts')
}

export async function removeBarcode(itemId: number) {
  await requireAdminOrAbove()

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { barcode: null, barcodeType: null },
  })

  revalidatePath('/inventory')
  revalidatePath('/inventory/barcodes')
  return item
}

export async function checkBarcodeAvailability(barcode: string, excludeItemId?: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const existing = await prisma.inventoryItem.findFirst({
    where: {
      barcode,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    select: { id: true, name: true },
  })

  return { available: !existing, conflictItem: existing }
}

// ── Barcode Lookup (for POS scanner) ─────────────────────────────────────────

export async function lookupByBarcode(barcode: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const item = await prisma.inventoryItem.findFirst({
    where: {
      isActive: true,
      OR: [
        { barcode: barcode },
        { sku: barcode }, // fallback: scan SKU too
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      barcodeType: true,
      unit: true,
      currentStock: true,
      sellingPrice: true,
      reorderLevel: true,
      hasWarranty: true,
      warrantyDuration: true,
      warrantyUnit: true,
    },
  })

  return item
}

// ── Items With Barcodes (for label module) ────────────────────────────────────

export async function getItemsWithBarcodes() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  return prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      barcodeType: true,
      sellingPrice: true,
      hasWarranty: true,
      category: true,
      currentStock: true,
    },
    orderBy: { name: 'asc' },
  })
}

// ── Label Templates ────────────────────────────────────────────────────────────

export async function getLabelTemplates() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return prisma.labelTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function saveLabelTemplate(name: string, config: LabelConfig) {
  await requireAdminOrAbove()

  const template = await prisma.labelTemplate.create({
    data: {
      name,
      config: config as any,
    },
  })

  revalidatePath('/inventory/barcodes')
  return template
}

export async function updateLabelTemplate(id: number, name: string, config: LabelConfig) {
  await requireAdminOrAbove()

  const template = await prisma.labelTemplate.update({
    where: { id },
    data: { name, config: config as any },
  })

  revalidatePath('/inventory/barcodes')
  return template
}

export async function deleteLabelTemplate(id: number) {
  await requireAdminOrAbove()

  await prisma.labelTemplate.delete({ where: { id } })
  revalidatePath('/inventory/barcodes')
}

// ── Printer Settings ──────────────────────────────────────────────────────────

export async function getPrinterSettings() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const settings = await prisma.printerSettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    // Return defaults without persisting — created on first save
    return {
      id: 1,
      printerName: 'ZDesigner GK420t',
      dpi: 203,
      darkness: 15,
      printSpeed: 4,
      labelWidth: 50,
      labelHeight: 25,
    }
  }
  return settings
}

export async function savePrinterSettings(data: {
  printerName: string
  dpi: number
  darkness: number
  printSpeed: number
  labelWidth: number
  labelHeight: number
}) {
  await requireAdminOrAbove()

  const settings = await prisma.printerSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  })

  revalidatePath('/inventory/barcodes')
  return settings
}
