'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateSystemSettings } from '@/actions/settings'
import { toast } from 'sonner'
import { Banknote, Settings2, ShieldCheck } from 'lucide-react'

export function SystemSettingsPanel({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings)
  const [loading, setLoading] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      const updated = await updateSystemSettings({ enableDenominationCounting: checked })
      setSettings(updated)
      toast.success('Settings updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
      <CardHeader className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
            <Settings2 size={20} />
          </div>
          <div>
            <CardTitle className="text-lg font-black tracking-tight">System Configuration</CardTitle>
            <CardDescription className="text-xs">Manage global application features and behavior</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all hover:border-blue-200 dark:hover:border-blue-900/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="denom-counting" className="text-sm font-bold cursor-pointer">Enable Cash Denomination Counting</Label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm">
                When enabled, cashiers must enter the quantity of each bill and coin during shift closing.
              </p>
            </div>
          </div>
          <Switch 
            id="denom-counting"
            checked={settings.enableDenominationCounting}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        <div className="pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <ShieldCheck size={14} className="text-blue-500" />
          <span>Only Administrators can modify these settings</span>
        </div>
      </CardContent>
    </Card>
  )
}
