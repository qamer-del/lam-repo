'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { DEFAULT_TEMPLATE_CONFIG, type ReceiptTemplateConfig } from '@/lib/receipt-template'

// Prisma returns Json as JsonValue — double-cast through unknown is the
// correct Prisma pattern for strongly-typed JSON fields.
function toConfig(json: unknown): ReceiptTemplateConfig {
  return json as unknown as ReceiptTemplateConfig
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReceiptTemplateRow {
  id: number
  name: string
  isDefault: boolean
  config: ReceiptTemplateConfig
  createdAt: Date
  updatedAt: Date
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getReceiptTemplates(): Promise<ReceiptTemplateRow[]> {
  const rows = await prisma.receiptTemplate.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map(r => ({ ...r, config: toConfig(r.config) }))
}

export async function getDefaultReceiptTemplate(): Promise<ReceiptTemplateRow | null> {
  const row = await prisma.receiptTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!row) return null
  return { ...row, config: toConfig(row.config) }
}

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createReceiptTemplate(
  name: string,
  config: ReceiptTemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): Promise<ReceiptTemplateRow> {
  const count = await prisma.receiptTemplate.count()
  const row = await prisma.receiptTemplate.create({
    data: { name, config: config as object, isDefault: count === 0 },
  })
  revalidatePath('/admin/receipt-templates')
  return { ...row, config: toConfig(row.config) }
}

// ─── Seed ──────────────────────────────────────────────────────────────────────

export async function ensureDefaultTemplate(): Promise<ReceiptTemplateRow> {
  const existing = await getDefaultReceiptTemplate()
  if (existing) return existing
  return createReceiptTemplate('Default Template', DEFAULT_TEMPLATE_CONFIG)
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateReceiptTemplate(
  id: number,
  data: Partial<{ name: string; config: ReceiptTemplateConfig }>,
): Promise<ReceiptTemplateRow> {
  const row = await prisma.receiptTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.config !== undefined && { config: data.config as object }),
    },
  })
  revalidatePath('/admin/receipt-templates')
  return { ...row, config: toConfig(row.config) }
}

// ─── Set default ───────────────────────────────────────────────────────────────

export async function setDefaultReceiptTemplate(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.receiptTemplate.updateMany({ data: { isDefault: false } }),
    prisma.receiptTemplate.update({ where: { id }, data: { isDefault: true } }),
  ])
  revalidatePath('/admin/receipt-templates')
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteReceiptTemplate(id: number): Promise<void> {
  const count = await prisma.receiptTemplate.count()
  if (count <= 1) throw new Error('Cannot delete the only template.')

  const deleted = await prisma.receiptTemplate.delete({ where: { id } })

  if (deleted.isDefault) {
    const first = await prisma.receiptTemplate.findFirst({ orderBy: { createdAt: 'asc' } })
    if (first) {
      await prisma.receiptTemplate.update({ where: { id: first.id }, data: { isDefault: true } })
    }
  }
  revalidatePath('/admin/receipt-templates')
}

// ─── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateReceiptTemplate(id: number): Promise<ReceiptTemplateRow> {
  const source = await prisma.receiptTemplate.findUniqueOrThrow({ where: { id } })
  const row = await prisma.receiptTemplate.create({
    data: {
      name: `${source.name} (Copy)`,
      config: source.config as object,
      isDefault: false,
    },
  })
  revalidatePath('/admin/receipt-templates')
  return { ...row, config: toConfig(row.config) }
}
