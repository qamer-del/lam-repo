import { prisma } from '@/lib/prisma'
import { UsersClient } from './users-client'
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
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
