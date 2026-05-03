'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Receipt, Settings, LogOut, Briefcase, Package, UserCheck, Shield } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Dashboard' },
  { href: '/sales', icon: Receipt, labelKey: 'sales' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'CASHIER'], labelFallback: 'Sales' },
  { href: '/customers', icon: UserCheck, labelKey: 'customers' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Customers' },
  { href: '/staff', icon: Users, labelKey: 'staffMembers' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Staff' },
  { href: '/agents', icon: Briefcase, labelKey: 'agents' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Agents / Representatives' },
  { href: '/inventory', icon: Package, labelKey: 'inventory' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Inventory' },
  { href: '/warranty', icon: Shield, labelKey: 'warranty' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'CASHIER'], labelFallback: 'Warranty' },
  { href: '/admin/settings', icon: Settings, labelKey: 'settings' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN'], labelFallback: 'System Settings' },
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
          if (item.allowedRoles && (!role || !item.allowedRoles.includes(role))) return null
          
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
              {t(item.labelKey) || item.labelFallback}
            </Link>
          )
        })}
      </nav>

      {/* Language Toggle, Logout */}
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

export function MobileTopBar() {
  const { t, locale, setLocale } = useLanguage()

  return (
    <header className="md:hidden sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          {t('appName')}
        </h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 text-[10px] font-bold rounded-full bg-gray-100 dark:bg-gray-800 border border-transparent active:border-blue-500 transition"
          >
            {locale === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-red-500 active:bg-red-50 dark:active:bg-red-900/20 rounded-full transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 shadow-2xl pb-safe">
      <div className="flex justify-around py-3 px-2">
        {navItems.map(item => {
          if (item.allowedRoles && (!role || !item.allowedRoles.includes(role))) return null

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 scale-110'
                  : 'text-gray-400 dark:text-gray-500 scale-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[10px] font-bold truncate max-w-[60px] ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {t(item.labelKey) || item.labelFallback}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
