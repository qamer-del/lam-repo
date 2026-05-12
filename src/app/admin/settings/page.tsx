import { prisma } from '@/lib/prisma'
import { UsersClient } from './users-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSystemSettings } from '@/actions/settings'
import { SystemSettingsPanel } from '@/components/system-settings-panel'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/')
  }

  const [users, settings] = await Promise.all([
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
    getSystemSettings()
  ])

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-gray-500 text-sm">Manage system-wide configurations and user access</p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <SystemSettingsPanel initialSettings={settings} />
        <div className="space-y-6">
          <div className="px-1">
            <h2 className="text-lg font-black tracking-tight">User Management</h2>
            <p className="text-gray-500 text-xs mt-1">Manage staff access and account permissions</p>
          </div>
          <UsersClient initialUsers={users} />
        </div>
      </div>
    </div>
  )
}
