'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function createCustomer(data: {
  name: string
  phone?: string
  email?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const customer = await prisma.customer.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  })

  revalidatePath('/customers')
  revalidatePath('/sales')
  return customer
}

export async function updateCustomer(
  id: number,
  data: { name?: string; phone?: string; email?: string; notes?: string }
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone.trim() || null }),
      ...(data.email !== undefined && { email: data.email.trim() || null }),
      ...(data.notes !== undefined && { notes: data.notes.trim() || null }),
    },
  })

  revalidatePath('/customers')
  revalidatePath('/sales')
  return customer
}

export async function deactivateCustomer(id: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/customers')
}

export async function getAllCustomers() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      transactions: {
        where: { type: 'SALE' },
        select: {
          id: true,
          amount: true,
          method: true,
          isSettled: true,
          invoiceNumber: true,
          createdAt: true,
        },
      },
    },
  })

  return customers.map((c) => {
    const totalSpend = c.transactions.reduce((sum, t) => sum + t.amount, 0)
    const outstandingCredit = c.transactions
      .filter((t) => t.method === 'CREDIT' && !t.isSettled)
      .reduce((sum, t) => sum + t.amount, 0)
    const invoiceNumbers = [...new Set(c.transactions.map((t) => t.invoiceNumber).filter(Boolean))]
    const lastPurchase = c.transactions.length > 0
      ? c.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : null

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      isActive: c.isActive,
      createdAt: c.createdAt,
      totalSpend,
      outstandingCredit,
      invoiceCount: invoiceNumbers.length,
      transactionCount: c.transactions.length,
      lastPurchase,
    }
  })
}

export async function getAllCustomersForSelect() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true },
  })
}

export async function getCustomerDetails(id: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        include: { recordedBy: { select: { name: true } } },
      },
    },
  })

  if (!customer) return null

  return customer
}
