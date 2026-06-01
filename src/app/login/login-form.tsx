'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shield, UserPlus, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { signInAction } from './actions'
import { registerUser } from '@/actions/users'

export function LoginForm() {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'login' | 'register' | 'success'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regForm, setRegForm] = useState({ name: '', username: '', password: '', phone: '' })

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const res = await signInAction(formData)
    if (res?.error) {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await registerUser(regForm)
      setMode('success')
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (mode === 'success') {
    return (
      <div className="w-full relative z-10 flex flex-col items-center gap-6 py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={32} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registration Submitted</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
            Your account is <span className="font-semibold text-amber-600 dark:text-amber-400">pending approval</span>.
            An administrator will review your request and activate your account.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => { setMode('login'); setRegForm({ name: '', username: '', password: '', phone: '' }) }}
          className="gap-2 rounded-xl"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Button>
      </div>
    )
  }

  // ── Register form ─────────────────────────────────────────────────────────
  if (mode === 'register') {
    return (
      <div className="w-full relative z-10">
        <div className="flex flex-col items-center justify-center space-y-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <UserPlus className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Create Account</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your account will require admin approval before you can log in.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</Label>
            <Input
              id="reg-name"
              required
              value={regForm.name}
              onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus-visible:ring-violet-500 focus-visible:ring-1"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-username" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Username</Label>
            <Input
              id="reg-username"
              required
              dir="ltr"
              value={regForm.username}
              onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Choose a username"
              className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus-visible:ring-violet-500 focus-visible:ring-1 text-left"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Password</Label>
            <Input
              id="reg-password"
              type="password"
              required
              dir="ltr"
              value={regForm.password}
              onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus-visible:ring-violet-500 focus-visible:ring-1 text-left"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-phone" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Phone <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </Label>
            <Input
              id="reg-phone"
              type="tel"
              dir="ltr"
              value={regForm.phone}
              onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+966 5x xxx xxxx"
              className="h-12 bg-white/50 dark:bg-black/50 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus-visible:ring-violet-500 focus-visible:ring-1 text-left"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-500/20 text-center">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 text-sm font-bold tracking-wide rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Registration'}
          </Button>

          <button
            type="button"
            onClick={() => { setMode('login'); setError(null) }}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5 pt-1"
          >
            <ArrowLeft size={12} /> Back to Login
          </button>
        </form>
      </div>
    )
  }

  // ── Login form (default) ──────────────────────────────────────────────────
  return (
    <div className="w-full relative z-10">
      <div className="flex flex-col items-center justify-center space-y-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="text-white" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{t('systemAccessControl')}</h2>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
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
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" />{t('authenticating')}</> : t('signIn')}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-xs text-gray-400 mb-3">Don't have an account?</p>
        <button
          onClick={() => { setMode('register'); setError(null) }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          <UserPlus size={15} />
          Create Account
        </button>
      </div>
    </div>
  )
}
