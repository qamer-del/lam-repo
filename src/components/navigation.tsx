'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Receipt, Shield, LogOut } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { href: '/sales', icon: Receipt, labelKey: 'sales' as const, adminOnly: true },
  { href: '/staff', icon: Users, labelKey: 'staffMembers' as const, adminOnly: true },
  { href: '/admin/users', icon: Shield, labelKey: 'users' as const, adminOnly: true },
]

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname()
  const { t, locale, setLocale } = useLanguage()

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          {t('appName')}
        </h1>
        <p className="text-xs text-gray-400 mt-1">Accounting & Payroll</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          if (item.adminOnly && role !== 'ADMIN') return null
          
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>

      {/* Language Toggle & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="w-full px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          {locale === 'ar' ? t('switchToEn') : t('switchToAr')}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <LogOut size={16} />
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="flex justify-around py-2">
        {navItems.map(item => {
          if (item.adminOnly && role !== 'ADMIN') return null

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.icon size={20} />
              {t(item.labelKey)}
            </Link>
          )
        })}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-all text-red-500 dark:text-red-400"
        >
          <LogOut size={20} />
          {t('logout')}
        </button>
      </div>
    </nav>
  )
}
