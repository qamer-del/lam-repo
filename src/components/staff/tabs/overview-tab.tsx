'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, DollarSign, Clock, Shield, Truck, Gift, Calendar, User, Hash, Globe } from 'lucide-react'
import { getStaffProfile } from '@/actions/staff'
import { format } from 'date-fns'

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
}

interface OverviewTabProps {
  staffId: number
  unsettledAdvancesTotal: number
}

export function OverviewTab({ staffId, unsettledAdvancesTotal }: OverviewTabProps) {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!profile) return null

  const totalMonthlySalary = profile.baseSalary + (profile.safetyAllowance || 0) +
    (profile.transportAllowance || 0) + (profile.otherAllowance || 0)
  const hourlyRate = profile.baseSalary / (profile.monthlyHours || 208)
  const estimatedNet = totalMonthlySalary - unsettledAdvancesTotal

  return (
    <div className="space-y-5">
      {/* Identity Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15)_0,transparent_60%)] pointer-events-none" />
        <div className="flex items-start gap-5 relative">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <span className="text-2xl font-black text-white">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black truncate">{profile.name}</h2>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {profile.idNumber && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Hash size={12} />
                  <span className="text-xs font-medium">{profile.idNumber}</span>
                </div>
              )}
              {profile.nationality && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Globe size={12} />
                  <span className="text-xs font-medium">{profile.nationality}</span>
                </div>
              )}
              {profile.joiningDate && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar size={12} />
                  <span className="text-xs font-medium">Joined {format(profile.joiningDate, 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            {/* Status badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monthly Salary', value: totalMonthlySalary.toFixed(2), sub: 'Base + allowances', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Pending Advances', value: unsettledAdvancesTotal.toFixed(2), sub: 'Unsettled', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Est. Net Payable', value: estimatedNet.toFixed(2), sub: 'Before OT', color: estimatedNet >= 0 ? 'text-emerald-600' : 'text-red-600', bg: estimatedNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Salary Structure */}
      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/60 px-5 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Salary Structure</p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {[
            { icon: DollarSign, label: 'Base Salary', value: profile.baseSalary, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { icon: Shield, label: 'Safety Allowance', value: profile.safetyAllowance, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
            { icon: Truck, label: 'Transport Allowance', value: profile.transportAllowance, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { icon: Gift, label: 'Other Allowance', value: profile.otherAllowance, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={15} />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
              </div>
              <span className={`text-sm font-black tabular-nums ${value > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
                {value.toFixed(2)} SAR
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-blue-50/50 dark:bg-blue-950/10">
            <span className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-gray-300">Total Monthly</span>
            <span className="text-lg font-black tabular-nums text-blue-700 dark:text-blue-400">{totalMonthlySalary.toFixed(2)} SAR</span>
          </div>
        </div>
      </div>

      {/* Payroll Settings */}
      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/60 px-5 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payroll Configuration</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-50 dark:divide-gray-800">
          {[
            { label: 'Hourly Rate', value: `${hourlyRate.toFixed(2)} SAR` },
            { label: 'OT Multiplier', value: `${profile.overtimeMultiplier}×` },
            { label: 'Monthly Hours', value: `${profile.monthlyHours}h` },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-4 text-center">
              <p className="text-base font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
