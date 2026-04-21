'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getStaffList() {
  return prisma.staff.findMany({
    where: { isActive: true },
    include: { transactions: true },
    orderBy: { name: 'asc' }
  })
}

export async function addStaff(data: { name: string; baseSalary: number }) {
  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      baseSalary: data.baseSalary,
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
