'use server'

import { auth } from '@/auth'
import { cookies } from 'next/headers'

// Roles that can switch branches via cookie (Super Admin sees all by default; Admin uses cookie or assigned branchId)
const MULTI_BRANCH_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

export async function setActiveBranchCookie(branchId: number | null) {
  const cookieStore = await cookies()
  if (branchId) {
    cookieStore.set('active_branch_id', branchId.toString(), { path: '/' })
  } else {
    cookieStore.delete('active_branch_id')
  }
}

/**
 * Returns the branchId filter for Prisma queries.
 * - SUPER_ADMIN: respects cookie; if none, sees ALL branches (no filter)
 * - ADMIN: respects cookie; if none, falls back to their assigned branchId
 * - All other roles: restricted to their own assigned branchId
 */
export async function getBranchFilter(): Promise<{ branchId?: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const role = session.user.role as string

  if (MULTI_BRANCH_ROLES.includes(role as any)) {
    const cookieStore = await cookies()
    const activeBranch = cookieStore.get('active_branch_id')?.value
    if (activeBranch && activeBranch !== 'all') {
      return { branchId: parseInt(activeBranch, 10) }
    }
    // Super Admins with no cookie → see all branches
    if (role === 'SUPER_ADMIN') return {}
    // Admins with no cookie → fall back to assigned branch
    return { branchId: session.user.branchId ?? 1 }
  }

  return { branchId: session.user.branchId ?? 1 }
}

/**
 * Returns the current user's active branchId (for creating new records).
 */
export async function getCurrentBranchId(): Promise<number> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const role = session.user.role as string

  if (MULTI_BRANCH_ROLES.includes(role as any)) {
    const cookieStore = await cookies()
    const activeBranch = cookieStore.get('active_branch_id')?.value
    if (activeBranch && activeBranch !== 'all') {
      return parseInt(activeBranch, 10)
    }
  }

  return session.user.branchId ?? 1
}

/**
 * Returns true if the current user is a Super Admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === 'SUPER_ADMIN'
}
