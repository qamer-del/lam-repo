'use client'

import { useState, useEffect, useCallback } from 'react'
import { Edit2, Plus, Wallet, Loader2, UserX, Hash, Globe, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getStaffProfile } from '@/actions/staff'
import { EditStaffModal } from '@/components/edit-staff-modal'
import { AddAdvanceDialog } from '@/components/staff/dialogs/add-advance-dialog'
import { ErpSettleDialog } from '@/components/staff/dialogs/erp-settle-dialog'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'

type StaffProfile = {
  id: number
  name: string
  idNumber?: string | null
  nationality?: string | null
  baseSalary: number
  safetyAllowance: number
  overtimeAllowance: number
  transportAllowance: number
  otherAllowance: number
  overtimeMultiplier: number
  monthlyHours: number
  joiningDate?: Date | null
  isActive: boolean
  userId?: string | null
}

interface StaffProfileHeaderProps {
  staffId: number
  onRefresh?: () => void
  onSettled?: () => void
}

export function StaffProfileHeader({ staffId, onRefresh, onSettled }: StaffProfileHeaderProps) {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [addAdvanceOpen, setAddAdvanceOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)

  const isAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN'
  const canSettle = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStaffProfile(staffId)
      if (data) setProfile({ ...data, joiningDate: data.joiningDate ? new Date(data.joiningDate) : null })
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [staffId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-3 w-56 bg-gray-50 dark:bg-gray-900 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <span className="text-lg font-black text-white">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">{profile.name}</h2>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {profile.idNumber && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <Hash size={11} /> {profile.idNumber}
                </span>
              )}
              {profile.nationality && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <Globe size={11} /> {profile.nationality}
                </span>
              )}
              {profile.joiningDate && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <Calendar size={11} /> Joined {format(profile.joiningDate, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Action toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <EditStaffModal 
                staff={{
                  ...profile,
                  idNumber: profile.idNumber || undefined,
                  nationality: profile.nationality || undefined
                }} 
                onUpdated={() => { load(); onRefresh?.() }} 
              />
            )}
            {isAdmin && (
              <Button size="sm" variant="outline"
                onClick={() => setAddAdvanceOpen(true)}
                className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20 text-xs font-bold">
                <Plus size={13} /> Add Advance
              </Button>
            )}
            {canSettle && (
              <Button size="sm"
                onClick={() => setSettleOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 text-xs font-bold">
                <Wallet size={13} /> Settle Salary
              </Button>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <>
          <AddAdvanceDialog
            staffId={profile.id}
            staffName={profile.name}
            open={addAdvanceOpen}
            onOpenChange={setAddAdvanceOpen}
            onAdded={onRefresh}
          />
          <ErpSettleDialog
            staff={profile}
            open={settleOpen}
            onOpenChange={setSettleOpen}
            onSettled={() => { onRefresh?.(); onSettled?.() }}
          />
        </>
      )}
    </>
  )
}
