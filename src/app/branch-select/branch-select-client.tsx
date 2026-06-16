'use client'

import { useState } from 'react'
import { Building2, CheckCircle2, ArrowRight, Loader2, LogOut } from 'lucide-react'
import { setActiveBranchCookie } from '@/actions/branch-helpers'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

type Branch = { id: number; name: string; location: string | null }

export function BranchSelectClient({
  branches,
  userRole,
  userName,
}: {
  branches: Branch[]
  userRole: string
  userName: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEnter = async () => {
    if (!selectedId) return
    setLoading(true)
    await setActiveBranchCookie(selectedId)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-black">
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/15 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 mb-5">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Select Branch
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-200">{userName}</span>.
            Choose which branch to enter.
          </p>
        </div>

        {/* Branch list */}
        <div className="space-y-3 mb-8">
          {branches.map(branch => {
            const isSelected = selectedId === branch.id
            return (
              <button
                key={branch.id}
                onClick={() => setSelectedId(branch.id)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-start group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'
                }`}>
                  <Building2 size={22} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-base leading-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    {branch.name}
                  </p>
                  {branch.location && (
                    <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{branch.location}</p>
                  )}
                </div>

                {/* Check */}
                <div className={`shrink-0 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <CheckCircle2 size={22} className="text-blue-600" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selectedId || loading}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base tracking-wide shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Entering Branch...</>
          ) : (
            <><ArrowRight size={20} /> Enter Branch</>
          )}
        </button>

        {/* Sign out link */}
        <div className="text-center mt-6">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
