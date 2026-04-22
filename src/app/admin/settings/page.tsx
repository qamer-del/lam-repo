import { prisma } from '@/lib/prisma'
import { UsersClient } from './users-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return <UsersClient initialUsers={users} />
}
