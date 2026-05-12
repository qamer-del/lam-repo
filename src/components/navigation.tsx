'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import { 
  LayoutDashboard, Users, Receipt, Settings, LogOut, 
  Briefcase, Package, UserCheck, Shield, MoreHorizontal, Search, BarChart3
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { PrinterStatus } from '@/components/ui/printer-status'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'

const navItems = [
  { href: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Dashboard' },
  { href: '/sales', icon: Receipt, labelKey: 'sales' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'CASHIER'], labelFallback: 'Sales' },
  { href: '/customers', icon: UserCheck, labelKey: 'customers' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Customers' },
  { href: '/staff', icon: Users, labelKey: 'staffMembers' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Staff' },
  { href: '/agents', icon: Briefcase, labelKey: 'agents' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Agents / Representatives' },
  { href: '/inventory', icon: Package, labelKey: 'inventory' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Inventory' },
  { href: '/admin/finance', icon: BarChart3, labelKey: 'finance' as const, allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'], labelFallback: 'Finance' },
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
      <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            {role?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-widest">{role?.replace('_', ' ') || 'User'}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-gray-400 font-bold truncate">Online Status</p>
            </div>
          </div>
        </div>
        {/* Printer Status Badge */}
        <div className="mb-3">
          <PrinterStatus className="w-full justify-center" />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="flex-1 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-black text-[10px] uppercase tracking-[0.1em] text-gray-600 dark:text-gray-300 shadow-sm active:scale-95"
          >
            {locale === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm active:scale-95 border border-red-100/50 dark:border-red-900/30"
            title={t('logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
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
          <PrinterStatus />
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
  const { t, locale } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const visibleItems = useMemo(() => 
    navItems.filter(item => !item.allowedRoles || (role && item.allowedRoles.includes(role))),
    [role]
  )

  const showMore = visibleItems.length > 5
  const mainItems = showMore ? visibleItems.slice(0, 4) : visibleItems
  const moreItems = showMore ? visibleItems.slice(4) : []

  const filteredMoreItems = moreItems.filter(item => 
    (t(item.labelKey) || item.labelFallback).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const NavItem = ({ item, isSheet = false }: { item: typeof navItems[0], isSheet?: boolean }) => {
    const isActive = pathname === item.href
    
    if (isSheet) {
      return (
        <Link
          href={item.href}
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-4 p-4 rounded-[1.5rem] transition-all",
            isActive 
              ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" 
              : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <div className={cn("p-2 rounded-xl", isActive ? "bg-white/20" : "bg-white dark:bg-gray-800 shadow-sm")}>
            <item.icon size={20} />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">
            {t(item.labelKey) || item.labelFallback}
          </span>
        </Link>
      )
    }

    return (
      <Link
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
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe">
      <div className="flex justify-around items-center py-3 px-2">
        {mainItems.map(item => (
          <NavItem key={item.href} item={item} />
        ))}

        {showMore && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger render={
              <button className="flex flex-col items-center gap-1.5 text-gray-400 dark:text-gray-500 active:scale-110 transition-all outline-none" />
            }>
              <div className="flex flex-col items-center">
                <div className="p-1.5 rounded-xl">
                  <MoreHorizontal size={22} />
                </div>
                <span className="text-[10px] font-bold opacity-70">More</span>
              </div>
            </SheetTrigger>
            <SheetContent className="max-h-[85vh] overflow-hidden flex flex-col font-cairo">
              <SheetHeader className="text-right">
                <SheetTitle className="text-2xl font-black">{t('more') || 'Quick Access'}</SheetTitle>
                <SheetDescription>{t('selectPage') || 'Navigate to other system modules'}</SheetDescription>
              </SheetHeader>

              <div className="relative mt-4">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-gray-400", locale === 'ar' ? 'left-4' : 'right-4')} size={18} />
                <Input 
                  placeholder={t('search') || 'Search pages...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-12 rounded-2xl border-none bg-gray-100 dark:bg-gray-900 px-6 font-bold text-right"
                />
              </div>

              <div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-3 custom-scrollbar">
                {filteredMoreItems.length > 0 ? (
                  filteredMoreItems.map(item => (
                    <NavItem key={item.href} item={item} isSheet />
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-bold">
                    {t('noResults') || 'No pages found'}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  )
}
