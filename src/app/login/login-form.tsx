'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { signInAction } from './actions'

export function LoginForm() {
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    // server action proxy since next-auth signIn operates safely there
    const res = await signInAction(formData)
    if (res?.error) {
      setError("Invalid username or password")
      setLoading(false)
    }
  }

  return (
    <div className="w-full relative z-10">
      <div className="flex flex-col items-center justify-center space-y-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="text-white" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{t('systemAccessControl')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
          <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('usernameLogin')}</Label>
          <Input 
            id="username" 
            name="username" 
            required 
            autoFocus 
            className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400/50 focus-visible:ring-blue-500 focus-visible:ring-1 focus-visible:border-transparent text-left transition-all backdrop-blur-sm rounded-xl" 
            dir="ltr"
            placeholder="admin"
          />
        </div>
        <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('password')}</Label>
          <Input 
            id="password" 
            type="password" 
            name="password" 
            required 
            className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400/50 focus-visible:ring-blue-500 focus-visible:ring-1 focus-visible:border-transparent text-left transition-all backdrop-blur-sm rounded-xl" 
            dir="ltr"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-500/20 text-center">{error}</p>}
        <Button type="submit" className="w-full h-12 mt-4 text-sm font-bold tracking-wide rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white transition-all shadow-lg shadow-blue-500/25" disabled={loading}>
          {loading ? t('authenticating') : t('signIn')}
        </Button>
      </form>
    </div>
  )
}
