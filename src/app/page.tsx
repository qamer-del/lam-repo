import { Suspense } from 'react'
import { DashboardWrapper } from '@/components/dashboard-wrapper'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()
  const role = session?.user?.role

  if (role === 'CASHIER') {
    redirect('/sales')
  }

  // Admins/Super Admins must pick a branch before entering if multiple exist
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    const cookieStore = await cookies()
    const activeBranch = cookieStore.get('active_branch_id')?.value
    if (!activeBranch) {
      const branchCount = await prisma.branch.count({ where: { isActive: true } })
      if (branchCount > 1) {
        redirect('/branch-select')
      }
    }
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <DashboardWrapper />
    </Suspense>
  )
}
