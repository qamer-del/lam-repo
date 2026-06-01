import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSystemSettings } from '@/actions/settings'
import { ensureDefaultTemplate, getReceiptTemplates } from '@/actions/receipt-templates'
import { getPendingUsers } from '@/actions/users'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/')
  }

  const userRole = session?.user?.role ?? 'CASHIER'

  // Ensure default receipt template exists
  await ensureDefaultTemplate()

  const [users, pendingUsers, settings, templates] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        status: true,
        phone: true,
        createdAt: true
      },
      where: { status: { in: ['ACTIVE', 'REJECTED'] } },
      orderBy: { createdAt: 'asc' }
    }),
    getPendingUsers(),
    getSystemSettings(),
    getReceiptTemplates()
  ])

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <SettingsClient 
        initialUsers={users} 
        initialPendingUsers={pendingUsers}
        initialSettings={settings} 
        initialTemplates={templates}
        userRole={userRole}
      />
    </div>
  )
}
