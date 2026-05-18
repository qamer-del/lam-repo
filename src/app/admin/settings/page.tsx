import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSystemSettings } from '@/actions/settings'
import { ensureDefaultTemplate, getReceiptTemplates } from '@/actions/receipt-templates'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/')
  }

  // Ensure default receipt template exists
  await ensureDefaultTemplate()

  const [users, settings, templates] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    }),
    getSystemSettings(),
    getReceiptTemplates()
  ])

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <SettingsClient 
        initialUsers={users} 
        initialSettings={settings} 
        initialTemplates={templates} 
      />
    </div>
  )
}
