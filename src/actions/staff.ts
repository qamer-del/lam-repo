'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getStaffList() {
  return prisma.staff.findMany({
    where: { isActive: true },
    include: { 
      transactions: true,
      salarySettlements: {
        orderBy: { paidAt: 'desc' },
        include: { transactions: true }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function addStaff(data: { 
  name: string; 
  baseSalary: number;
  overtimeAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  idNumber?: string;
  nationality?: string;
  userId?: string;
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }
  
  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      baseSalary: data.baseSalary,
      overtimeAllowance: data.overtimeAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowance: data.otherAllowance || 0,
      idNumber: data.idNumber,
      nationality: data.nationality,
      userId: data.userId || null,
    }
  })
  revalidatePath('/staff')
  revalidatePath('/')
  return staff
}

export async function getStaffWithAdvances(staffId: number) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      transactions: {
        where: { type: 'ADVANCE' },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  return staff
}

export async function getStaffOverdueCredits(staffId: number) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { userId: true }
  })

  if (!staff?.userId) return { count: 0, total: 0, invoices: [] }

  const overdueCredits = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      method: 'CREDIT',
      isSettled: false,
      recordedById: staff.userId,
      OR: [
        { dueDate: { lt: new Date() } },
        { dueDate: null } // Handle older invoices created before we added the dueDate field
      ]
    },
    include: { linkedBy: { select: { amount: true } } }
  })

  let totalOverdueRemaining = 0
  const unpaidInvoices = []

  for (const creditTx of overdueCredits) {
    const paidSoFar = creditTx.linkedBy.reduce((sum, p) => sum + p.amount, 0)
    const remaining = creditTx.amount - paidSoFar
    if (remaining > 0.01) {
      totalOverdueRemaining += remaining
      unpaidInvoices.push({ ...creditTx, remaining })
    }
  }

  return {
    count: unpaidInvoices.length,
    total: totalOverdueRemaining,
    invoices: unpaidInvoices
  }
}
