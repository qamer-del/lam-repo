'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

// ── Admin-created user ────────────────────────────────────────────────────────

export async function createUser(data: {
  name: string
  username: string
  password: string
  role: string
  phone?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }
  // Only Super Admins can create Super Admin accounts
  if (data.role === 'SUPER_ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admins can create other Super Admin accounts')
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)

  await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      password: hashedPassword,
      role: data.role as any,
      phone: data.phone || null,
      status: 'ACTIVE',
      isActive: true,
    },
  })

  revalidatePath('/admin/settings')
}

// ── Self-registration (public — no auth required) ─────────────────────────────

export async function registerUser(data: {
  name: string
  username: string
  password: string
  phone?: string
}) {
  // Check for duplicate username
  const existing = await prisma.user.findUnique({ where: { username: data.username } })
  if (existing) throw new Error('Username is already taken.')

  const hashedPassword = await bcrypt.hash(data.password, 10)

  await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      password: hashedPassword,
      role: 'CASHIER',
      phone: data.phone || null,
      status: 'PENDING',
      isActive: false, // cannot log in until approved
    },
  })
}

// ── Approval / Rejection ─────────────────────────────────────────────────────

export async function approveUser(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE', isActive: true },
  })

  revalidatePath('/admin/settings')
}

export async function rejectUser(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.user.update({
    where: { id },
    data: { status: 'REJECTED', isActive: false },
  })

  revalidatePath('/admin/settings')
}

// ── Edit user ─────────────────────────────────────────────────────────────────

export async function updateUser(id: string, data: {
  name?: string
  role?: string
  password?: string
  phone?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }
  // Only Super Admins can promote/demote to Super Admin
  if (data.role === 'SUPER_ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admins can assign the Super Admin role')
  }

  const updateData: any = {}
  if (data.name) updateData.name = data.name
  if (data.role) updateData.role = data.role
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.password) updateData.password = await bcrypt.hash(data.password, 10)

  await prisma.user.update({ where: { id }, data: updateData })
  revalidatePath('/admin/settings')
}

// ── Delete user ───────────────────────────────────────────────────────────────

export async function deleteUser(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/settings')
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getUsers() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  return prisma.user.findMany({
    where: { status: { in: ['ACTIVE', 'REJECTED'] } },
    select: { id: true, name: true, role: true, username: true, phone: true, status: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getPendingUsers() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  return prisma.user.findMany({
    where: { status: 'PENDING' },
    select: { id: true, name: true, username: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}
