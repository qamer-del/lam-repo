'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function createUser(data: any) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') throw new Error("Unauthorized")
  
  // Security check: Only Super Admins can create Super Admins
  if (data.role === 'SUPER_ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized: Only Super Admins can create other Super Admin accounts")
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)
  
  await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      password: hashedPassword,
      role: data.role,
    }
  })
  
  revalidatePath('/admin/users')
}

export async function deleteUser(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') throw new Error("Unauthorized")
  
  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/users')
}

export async function getUsers() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  return prisma.user.findMany({
    select: { id: true, name: true, role: true, username: true },
    orderBy: { name: 'asc' }
  })
}
