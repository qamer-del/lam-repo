'use client'

import { setActiveBranchCookie } from '@/actions/branch-helpers'
import { Building2 } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function BranchSwitcherClient({
  branches,
  activeBranchId,
}: {
  branches: { id: number; name: string }[]
  activeBranchId: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl mb-4 text-sm w-full">
      <Building2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
      <select
        className="bg-transparent border-none outline-none font-bold text-blue-900 dark:text-blue-100 flex-1 min-w-0 cursor-pointer disabled:opacity-50"
        value={activeBranchId || 'all'}
        disabled={isPending}
        onChange={(e) => {
          const val = e.target.value
          startTransition(async () => {
            await setActiveBranchCookie(val === 'all' ? null : parseInt(val, 10))
            router.refresh()
          })
        }}
      >
        <option value="all">🌍 All Branches (Global)</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>
            🏪 {b.name}
          </option>
        ))}
      </select>
    </div>
  )
}
