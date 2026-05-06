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
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  idNumber?: string;
  nationality?: string;
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }
  
  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      baseSalary: data.baseSalary,
      housingAllowance: data.housingAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowance: data.otherAllowance || 0,
      idNumber: data.idNumber,
      nationality: data.nationality,
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
