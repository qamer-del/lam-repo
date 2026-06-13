'use client'

import { useState } from 'react'
import { Settings2, Users, Receipt, GitBranch } from 'lucide-react'
import { SystemSettingsPanel } from '@/components/system-settings-panel'
import { UsersClient } from './users-client'
import { ReceiptSettingsPanel } from '@/components/receipt-settings-panel'
import { BranchManagement } from '@/components/branch-management'
import { Branch } from '@prisma/client'

export function SettingsClient({ 
  initialUsers, 
  initialPendingUsers,
  initialSettings, 
  initialTemplates,
  userRole,
  initialBranches = [],
}: { 
  initialUsers: any[]
  initialPendingUsers: any[]
  initialSettings: any
  initialTemplates: any
  userRole: string
  initialBranches?: Branch[]
}) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const pendingCount = initialPendingUsers?.length || 0

  const TABS = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'receipts', label: 'Receipts & Printers', icon: Receipt },
    { id: 'users', label: 'Users & Roles', icon: Users },
    ...(isSuperAdmin ? [{ id: 'branches', label: 'Branches', icon: GitBranch }] : []),
  ]

  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="flex flex-col md:flex-row items-start gap-8 max-w-[1400px] mx-auto">
      
      {/* ── Sidebar (iOS Settings Style) ── */}
      <aside className="w-full md:w-64 shrink-0 space-y-2 sticky top-8">
        <div className="mb-6 px-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">System configuration</p>
        </div>
        
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all shrink-0 md:shrink ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon size={18} className={isActive ? 'text-blue-100' : 'text-gray-400'} />
                {tab.label}
                {tab.id === 'users' && pendingCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center px-1.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full min-w-0 pb-20">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-4xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Manage global behavior and cash counting rules.</p>
              </div>
              <SystemSettingsPanel initialSettings={initialSettings} />
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Receipts & Printers</h2>
                <p className="text-gray-500 text-sm mt-1">Configure physical paper sizes, store branding, and what gets printed.</p>
              </div>
              <ReceiptSettingsPanel initialTemplates={initialTemplates} />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 max-w-5xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                <p className="text-gray-500 text-sm mt-1">Add, remove, or modify employee access permissions.</p>
              </div>
              <UsersClient initialUsers={initialUsers} initialPendingUsers={initialPendingUsers} userRole={userRole} branches={initialBranches} />
            </div>
          )}

          {activeTab === 'branches' && isSuperAdmin && (
            <BranchManagement
              branches={initialBranches}
              users={initialUsers.map((u: any) => ({ id: u.id, name: u.name, role: u.role, branchId: u.branchId ?? 1 }))}
            />
          )}
        </div>
      </main>
    </div>
  )
}
