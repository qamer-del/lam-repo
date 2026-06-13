'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

function requireSuperAdmin(role: string | undefined) {
  if (role !== 'SUPER_ADMIN') throw new Error('Unauthorized: Super Admin only')
}

export async function getBranches() {
  const session = await auth()
  requireSuperAdmin(session?.user?.role)
  return prisma.branch.findMany({ orderBy: { createdAt: 'asc' } })
}

export async function createBranch(data: { name: string; location?: string }) {
  const session = await auth()
  requireSuperAdmin(session?.user?.role)

  const branch = await prisma.branch.create({
    data: {
      name: data.name,
      location: data.location || null,
      isActive: true,
    },
  })

  revalidatePath('/admin/settings')
  return branch
}

export async function updateBranch(id: number, data: { name?: string; location?: string; isActive?: boolean }) {
  const session = await auth()
  requireSuperAdmin(session?.user?.role)

  const branch = await prisma.branch.update({
    where: { id },
    data,
  })

  revalidatePath('/admin/settings')
  return branch
}

export async function deleteBranch(id: number) {
  const session = await auth()
  requireSuperAdmin(session?.user?.role)

  // Prevent deleting the main branch
  const count = await prisma.branch.count()
  if (count <= 1) throw new Error('Cannot delete the only branch')

  await prisma.branch.delete({ where: { id } })
  revalidatePath('/admin/settings')
}

export async function assignUserToBranch(userId: string, branchId: number) {
  const session = await auth()
  requireSuperAdmin(session?.user?.role)

  await prisma.user.update({
    where: { id: userId },
    data: { branchId },
  })

  revalidatePath('/admin/settings')
}
