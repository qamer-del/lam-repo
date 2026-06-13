'use server'

import { auth } from '@/auth'
import { cookies } from 'next/headers'

const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'] as const

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
 * SUPER_ADMIN gets an unrestricted view (no branchId filter) UNLESS they explicitly selected a branch.
 * All other roles are restricted to their own branch.
 */
export async function getBranchFilter(): Promise<{ branchId?: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const role = session.user.role as string
  if (SUPER_ADMIN_ROLES.includes(role as any)) {
    const cookieStore = await cookies()
    const activeBranch = cookieStore.get('active_branch_id')?.value
    if (activeBranch && activeBranch !== 'all') {
      return { branchId: parseInt(activeBranch, 10) }
    }
    // Super Admins see all branches by default (no filter)
    return {}
  }

  return { branchId: session.user.branchId ?? 1 }
}

/**
 * Returns the current user's active branchId (for creating new records).
 * Falls back to branch 1 (Main Branch) for safety.
 */
export async function getCurrentBranchId(): Promise<number> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  const role = session.user.role as string
  if (SUPER_ADMIN_ROLES.includes(role as any)) {
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

