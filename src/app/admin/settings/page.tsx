import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSystemSettings } from '@/actions/settings'
import { ensureDefaultTemplate, getReceiptTemplates } from '@/actions/receipt-templates'
import { getPendingUsers, getAllUsersForAdmin } from '@/actions/users'
import { getBranches } from '@/actions/branches'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/')
  }

  const userRole = session?.user?.role ?? 'CASHIER'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  // Ensure default receipt template exists
  await ensureDefaultTemplate()

  const [users, pendingUsers, settings, templates, branches] = await Promise.all([
    getAllUsersForAdmin(),
    getPendingUsers(),
    getSystemSettings(),
    getReceiptTemplates(),
    isSuperAdmin ? getBranches() : Promise.resolve([]),
  ])

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <SettingsClient
        initialUsers={users}
        initialPendingUsers={pendingUsers}
        initialSettings={settings}
        initialTemplates={templates}
        userRole={userRole}
        initialBranches={branches}
      />
    </div>
  )
}
