'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    
    // server action proxy since next-auth signIn operates safely there or we can use next-auth react
    const res = await signInAction(formData)
    if (res?.error) {
      setError("Invalid username or password")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full shadow-none border-none bg-transparent">
      <CardHeader className="space-y-4 px-0 pb-8 text-left">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Shield className="text-white" size={24} />
        </div>
        <div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('appName')}
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            {t('systemAccessControl')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('usernameLogin')}</Label>
            <Input 
              id="username" 
              name="username" 
              required 
              autoFocus 
              className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-blue-600 focus-visible:ring-2 focus-visible:border-transparent text-left transition-all" 
              dir="ltr"
              placeholder="admin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('password')}</Label>
            <Input 
              id="password" 
              type="password" 
              name="password" 
              required 
              className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-blue-600 focus-visible:ring-2 focus-visible:border-transparent text-left transition-all" 
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">{error}</p>}
          <Button type="submit" className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-600/25" disabled={loading}>
            {loading ? t('authenticating') : t('signIn')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
