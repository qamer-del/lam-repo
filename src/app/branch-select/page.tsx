import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BranchSelectClient } from './branch-select-client'

export const dynamic = 'force-dynamic'

export default async function BranchSelectPage() {
  const session = await auth()
  const role = session?.user?.role

  // Only admins go through branch selection — cashiers already have a fixed branch
  if (!session?.user) redirect('/login')
  if (role === 'CASHIER' || role === 'OWNER') redirect('/')

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  // If there's only 1 branch, skip the picker entirely
  if (branches.length <= 1) redirect('/')

  return <BranchSelectClient branches={branches} userRole={role!} userName={session.user.name ?? ''} />
}
