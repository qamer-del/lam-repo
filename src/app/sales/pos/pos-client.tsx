'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { usePrinter } from '@/providers/printer-provider'
import { useStore, Transaction } from '@/store/useStore'
import { recordDailySales, getInvoiceDetails, getShiftInvoices } from '@/actions/transactions'
import { createCustomer } from '@/actions/customers'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BnplCheckoutModal } from '@/components/bnpl-checkout-modal'
import { BnplPendingPanel } from '@/components/bnpl-pending-panel'
import { PaymentMethodCorrectionModal } from '@/components/payment-method-correction-modal'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Banknote, Wifi,
  SplitSquareHorizontal, ShoppingBag, Users, Check, UserPlus, ArrowLeft,
  CheckCircle2, Package, ChevronsUpDown, X, History, CreditCard, LogOut,
  ArrowUpRight, ArrowDownLeft, Percent, Tag, Keyboard, ChevronDown, ChevronUp, Loader2, Printer, Menu, Globe, RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CloseShiftBtn } from '@/components/close-shift-btn'
import { ShiftClosingWorkflow } from '@/components/shift-closing-workflow'
import { CreditCollectionPanel } from '@/components/credit-collection-panel'
import { WarrantyNotification } from '@/components/warranty-notification'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type PayMode = 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'
type ActiveTab = 'pos' | 'sales' | 'credit'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string
  currentStock: number; sellingPrice: number; reorderLevel: number
  hasWarranty?: boolean; warrantyDuration?: number | null; warrantyUnit?: string | null
  barcode?: string | null; barcodeType?: string | null
}
interface CartItem { itemId: number; name: string; unit: string; quantity: number | string; price: number | string; totalInput?: string }
interface CustomerOption { id: number; name: string; phone: string | null }

interface PosClientProps {
  inventoryItems: InventoryItem[]
  customers: CustomerOption[]
  cashierName: string
  userRole?: string
  hasUnsettled: boolean
  unsettledCash: number; unsettledNetwork: number; unsettledTabby: number; unsettledTamara: number
  allTodaySales: any[]
  activeShiftSales: any[]
  closedShifts: any[]
  unpaidCreditSales: any[]
  activeShift: any | null
}

const PAY_METHODS: { mode: PayMode; label: string; shortcut: string; icon: any; active: string }[] = [
  { mode: 'CASH',    label: 'Cash',    shortcut: 'Ctrl+1', icon: Banknote,              active: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
  { mode: 'NETWORK', label: 'Network', shortcut: 'Ctrl+2', icon: Wifi,                  active: 'bg-blue-50 border-blue-500 text-blue-700' },
  { mode: 'SPLIT',   label: 'Split',   shortcut: 'Ctrl+3', icon: SplitSquareHorizontal, active: 'bg-orange-50 border-orange-500 text-orange-700' },
  { mode: 'TABBY',   label: 'Tabby',   shortcut: 'Ctrl+4', icon: ShoppingBag,           active: 'bg-purple-50 border-purple-500 text-purple-700' },
  { mode: 'TAMARA',  label: 'Tamara',  shortcut: 'Ctrl+5', icon: ShoppingBag,           active: 'bg-pink-50 border-pink-500 text-pink-700' },
  { mode: 'CREDIT',  label: 'Credit',  shortcut: 'Ctrl+6', icon: Users,                 active: 'bg-amber-50 border-amber-500 text-amber-700' },
]

export function PosClient({
  inventoryItems, customers: initialCustomers, cashierName, userRole,
  hasUnsettled, unsettledCash, unsettledNetwork, unsettledTabby, unsettledTamara,
  allTodaySales, activeShiftSales, closedShifts, unpaidCreditSales, activeShift
}: PosClientProps) {
  const { t, locale, setLocale } = useLanguage()
  const isRTL = locale === 'ar'
  const router = useRouter()
  const { print: printReceipt, status: printerStatus, isPrinting } = usePrinter()

  const { activeShift: storeActiveShift, setVaultData } = useStore()

  useEffect(() => {
    setVaultData({ 
      activeShift, 
      transactions: allTodaySales,
      cashInDrawer: unsettledCash,
      networkSales: unsettledNetwork,
      tabbyBalance: unsettledTabby,
      tamaraBalance: unsettledTamara
    })
  }, [activeShift, allTodaySales, unsettledCash, unsettledNetwork, unsettledTabby, unsettledTamara, setVaultData])
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<any>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [mobilePosView, setMobilePosView] = useState<'items' | 'cart'>('items')
  const [expandedShiftId, setExpandedShiftId] = useState<number | null>(null)
  const [shiftInvoices, setShiftInvoices] = useState<Record<number, any[]>>({})
  const [shiftInvoicesLoading, setShiftInvoicesLoading] = useState<Record<number, boolean>>({})
  const [correctionOpenFor, setCorrectionOpenFor] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const itemListRef = useRef<HTMLDivElement>(null)

  const filteredItems = search.trim() === ''
    ? inventoryItems
    : inventoryItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.sku?.toLowerCase().includes(search.toLowerCase())) ||
        (i.barcode?.toLowerCase().includes(search.toLowerCase()))
      )

  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = useCallback((item: InventoryItem) => {
    if (item.currentStock <= 0) return
    setCart(prev => {
      const ex = prev.find(c => c.itemId === item.id)
      if (ex) return prev.map(c => c.itemId === item.id ? { ...c, quantity: (parseFloat(c.quantity as string) || 0) + 1 } : c)
      return [...prev, { itemId: item.id, name: item.name, unit: item.unit, quantity: 1, price: item.sellingPrice }]
    })
    setTimeout(() => {
      document.getElementById(`price-input-${item.id}`)?.focus()
    }, 50)
  }, [])

  const setQty = (id: number, qty: number | string) => {
    if (typeof qty === 'number' && qty <= 0) { setCart(prev => prev.filter(c => c.itemId !== id)); return }
    setCart(prev => prev.map(c => c.itemId === id ? { ...c, quantity: qty, totalInput: undefined } : c))
  }
  const updatePrice = (id: number, price: number | string) =>
    setCart(prev => prev.map(c => c.itemId === id ? { ...c, price, totalInput: undefined } : c))
  
  const updateTotalInput = (id: number, val: string) => {
    setCart(prev => prev.map(c => {
      if (c.itemId === id) {
        const total = parseFloat(val)
        if (!isNaN(total)) {
          const qty = parseFloat(c.quantity as string) || 1
          const price = Number((total / qty).toFixed(2)).toString()
          return { ...c, totalInput: val, price }
        }
        return { ...c, totalInput: val, price: '' }
      }
      return c
    }))
  }

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.itemId !== id))

  const cartSubtotal = cart.reduce((s, c) => s + (parseFloat(c.quantity as string) || 0) * (parseFloat(c.price as string) || 0), 0)

  const [payMode, setPayMode] = useState<PayMode>('CASH')
  const [totalOverride, setTotalOverride] = useState('')
  const [cashAmt, setCashAmt] = useState('')
  const [netAmt, setNetAmt] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(() => format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [pendingWarranties, setPendingWarranties] = useState<any[]>([])
  const [bnplModal, setBnplModal] = useState<{ provider: 'TABBY' | 'TAMARA' } | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const baseTotal = totalOverride !== '' ? (parseFloat(totalOverride) || 0) : cartSubtotal
  const discountAmt = baseTotal * (parseFloat(discountPct) || 0) / 100
  const finalTotal = Math.max(0, baseTotal - discountAmt)

  const handleCashAmtChange = (val: string) => {
    setCashAmt(val)
    const c = parseFloat(val) || 0
    if (finalTotal >= c) setNetAmt((finalTotal - c).toFixed(2))
  }

  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerComboOpen, setCustomerComboOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const resetForm = () => {
    setCart([]); setPayMode('CASH'); setTotalOverride('')
    setCashAmt(''); setNetAmt(''); setDiscountPct(''); setDescription('')
    setCustomerId(null); setCustomerName(''); setCustomerPhone('')
    setCustomerSearch(''); setQuickAddMode(false); setQuickAddPhone('')
    setFocusedIdx(-1)
    setTimeout(() => { searchRef.current?.focus() }, 100)
  }

  const handleSubmit = useCallback(async () => {
    const validItems = cart.filter(c => (parseFloat(c.quantity as string) || 0) > 0)
    if (!validItems.length) { toast.warning(t('selectAtLeastOneItem')); return }
    if (finalTotal <= 0) { toast.warning(t('enterValidTotal')); return }
    if (payMode === 'SPLIT') {
      const c = parseFloat(cashAmt) || 0, n = parseFloat(netAmt) || 0
      if (Math.abs(finalTotal - (c + n)) > 0.01) { toast.warning(t('splitAmountError')); return }
    }
    if (payMode === 'CREDIT' && !customerId && (!customerName.trim() || !customerPhone.trim())) {
      toast.warning(t('creditCustomerRequired')); return
    }
    setLoading(true)
    // ── BNPL: open checkout modal instead of direct sale ──────────────────
    if (payMode === 'TABBY' || payMode === 'TAMARA') {
      setLoading(false)
      setBnplModal({ provider: payMode })
      return
    }
    try {
      const results = await recordDailySales({
        paymentMode: payMode, totalAmount: finalTotal,
        cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
        networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
        description: description || undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        dueDate: payMode === 'CREDIT' && dueDate ? new Date(dueDate) : undefined,
        consumedItems: validItems.map(ci => ({ itemId: ci.itemId, quantity: parseFloat(ci.quantity as string) || 0 })),
      })
      if (results) {
        useStore.getState().addTransactions(results as Transaction[])
        if (printerStatus === 'connected' && results.length > 0) {
          printReceipt({
            invoiceNumber: results[0].invoiceNumber || '',
            createdAt: results[0].createdAt ? new Date(results[0].createdAt) : new Date(),
            cashierName: (results[0] as any).recordedBy?.name || cashierName,
            items: validItems.map(ci => ({ name: ci.name, quantity: parseFloat(ci.quantity as string) || 0, price: parseFloat(ci.price as string) || 0, unit: ci.unit })),
            totalAmount: finalTotal, paymentMethod: payMode,
            cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
            networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
            customerName: customerName || undefined, description: description || undefined,
          }).catch(() => {})
        }
        const soldIds = validItems.map(ci => ci.itemId)
        const warrantyItems = inventoryItems.filter(i => soldIds.includes(i.id) && i.hasWarranty)
        if (warrantyItems.length > 0 && results.length > 0) {
          const { checkWarrantyStatus } = await import('@/actions/warranty')
          const invNum = results[0].invoiceNumber
          if (invNum) { const wr = await checkWarrantyStatus({ invoiceNumber: invNum }); if (wr.length > 0) setPendingWarranties(wr) }
        }
      }
      toast.success(t('transactionAdded'))
      resetForm()
      router.refresh()
    } catch (e) { console.error(e); toast.error(t('operationFailed')) }
    finally { setLoading(false) }
  }, [cart, finalTotal, payMode, cashAmt, netAmt, customerId, customerName, customerPhone, dueDate, description, printerStatus])

  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.key === '/' || e.key === 'F2') && !inInput && activeTab === 'pos') {
        e.preventDefault(); searchRef.current?.focus(); setFocusedIdx(-1); return
      }
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur()
        setSearch(''); setFocusedIdx(-1)
        setTimeout(() => searchRef.current?.focus(), 50)
        return
      }
      if (e.key === 'ArrowDown' && (e.target === searchRef.current || !inInput) && activeTab === 'pos') {
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, filteredItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp' && (e.target === searchRef.current || !inInput) && activeTab === 'pos') {
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, -1))
        if (focusedIdx <= 0) searchRef.current?.focus()
        return
      }
      if (e.key === 'Enter' && focusedIdx >= 0 && !inInput && activeTab === 'pos') {
        e.preventDefault()
        const item = filteredItems[focusedIdx]
        if (item) addToCart(item)
        return
      }
      if (e.ctrlKey && ['1','2','3','4','5','6'].includes(e.key) && activeTab === 'pos') {
        e.preventDefault()
        const modes: PayMode[] = ['CASH','NETWORK','SPLIT','TABBY','TAMARA','CREDIT']
        setPayMode(modes[parseInt(e.key) - 1])
        return
      }
      if (e.key === 'Home' && activeTab === 'pos') {
        e.preventDefault()
        setPayMode(prev => {
          const modes: PayMode[] = ['CASH','NETWORK','SPLIT','TABBY','TAMARA','CREDIT']
          return modes[(modes.indexOf(prev) + 1) % modes.length]
        })
        return
      }
      if (e.key === 'F4' && activeTab === 'pos') { e.preventDefault(); amountRef.current?.focus(); return }
      if ((e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) && activeTab === 'pos') {
        e.preventDefault(); submitRef.current(); return
      }
      if (e.ctrlKey && e.key === 'k' && activeTab === 'pos') { e.preventDefault(); setCart([]); return }
      if (e.key === '?' && !inInput) { e.preventDefault(); setShowShortcuts(v => !v); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, focusedIdx, filteredItems, addToCart])

  useEffect(() => {
    if (focusedIdx >= 0 && itemListRef.current) {
      const el = itemListRef.current.children[focusedIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIdx])

  const getPayMethodLabel = (mode: PayMode) => {
    const map = { CASH: t('cash'), NETWORK: t('network'), SPLIT: t('splitPayment'), TABBY: t('tabby'), TAMARA: t('tamara'), CREDIT: t('credit') }
    return map[mode]
  }

  const shortcuts = [
    { key: '/', label: 'Focus search' }, { key: 'F2', label: 'Focus search' },
    { key: '↑ ↓', label: 'Navigate list' }, { key: 'Enter', label: 'Add item' },
    { key: 'Ctrl+1-6', label: t('paymentMethod') }, { key: 'F4', label: t('totalAmount') },
    { key: 'F9', label: t('recordSale') }, { key: 'Ctrl+Enter', label: t('recordSale') },
    { key: 'Ctrl+K', label: t('clear') }, { key: 'Esc', label: 'Back to search' },
    { key: '?', label: t('shortcuts') },
  ]

  const submitBtnColor = payMode === 'CASH' ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/25'
    : payMode === 'NETWORK' ? 'from-blue-500 to-blue-600 shadow-blue-500/25'
    : payMode === 'SPLIT' ? 'from-orange-500 to-orange-600 shadow-orange-500/25'
    : payMode === 'TABBY' ? 'from-purple-500 to-purple-600 shadow-purple-500/25'
    : payMode === 'CREDIT' ? 'from-amber-500 to-amber-600 shadow-amber-500/25'
    : 'from-pink-500 to-pink-600 shadow-pink-500/25'

  return (
    <>
      {/* ── BNPL Checkout Modal ── */}
      {bnplModal && (
        <BnplCheckoutModal
          provider={bnplModal.provider}
          amount={finalTotal}
          cart={cart.filter(c => (parseFloat(c.quantity as string) || 0) > 0).map(c => ({
            itemId: c.itemId,
            name: c.name,
            quantity: parseFloat(c.quantity as string) || 0,
            price: parseFloat(c.price as string) || 0,
            unit: c.unit,
          }))}
          customerName={customerName || undefined}
          customerId={customerId || undefined}
          onSuccess={(invoiceNumber) => {
            setBnplModal(null)
            toast.success('Payment confirmed! Invoice created.')
            router.refresh()
            resetForm()
            // Auto-print if printer connected
            if (printerStatus === 'connected') {
              printReceipt({
                invoiceNumber,
                createdAt: new Date(),
                cashierName,
                items: cart.filter(c => (parseFloat(c.quantity as string) || 0) > 0).map(ci => ({ name: ci.name, quantity: parseFloat(ci.quantity as string) || 0, price: parseFloat(ci.price as string) || 0, unit: ci.unit })),
                totalAmount: finalTotal,
                paymentMethod: bnplModal.provider,
                customerName: customerName || undefined,
              }).catch(() => {})
            }
          }}
          onCancel={() => setBnplModal(null)}
        />
      )}

      {pendingWarranties.length > 0 && (
        <WarrantyNotification warranties={pendingWarranties} customerPhone={customerPhone || undefined} onDismiss={() => setPendingWarranties([])} />
      )}

      {correctionOpenFor && (
        <PaymentMethodCorrectionModal
          open={!!correctionOpenFor}
          onOpenChange={(v) => { if (!v) setCorrectionOpenFor(null) }}
          invoiceNumber={correctionOpenFor}
          currentMethod={expandedDetails?.transactions?.[0]?.method || 'CASH'}
          onCorrected={() => {
            // Re-fetch the details to update the UI live
            if (correctionOpenFor) {
              setExpandedLoading(true)
              getInvoiceDetails(correctionOpenFor).then(res => {
                setExpandedDetails(res)
                setExpandedLoading(false)
              }).catch(() => setExpandedLoading(false))
            }
          }}
        />
      )}

      <div className="fixed top-0 bottom-24 left-0 right-0 lg:relative lg:top-auto lg:bottom-auto lg:inset-auto lg:h-screen flex flex-col bg-[#f0f2f5] overflow-hidden z-[60] lg:z-auto" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ── HEADER ── */}
        {/* 3-column grid ensures tabs are always perfectly centered with zero overlap */}
        <header className="h-16 lg:h-[72px] bg-[#0f1729] px-3 sm:px-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 shrink-0 z-20" style={{boxShadow:'0 2px 24px rgba(0,0,0,0.4)'}}>

          {/* COL 1 LEFT: Avatar + identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[13px] font-black shadow-lg ring-2 ring-white/10 shrink-0">
              {cashierName?.[0]?.toUpperCase() ?? 'C'}
            </div>
            <div className="hidden sm:flex flex-col leading-none min-w-0">
              <span className="text-white text-[12px] font-bold truncate">{cashierName}</span>
              {activeShift
                ? <span className="text-emerald-400 text-[10px] font-semibold tracking-wider uppercase mt-0.5">Shift #{activeShift.id}</span>
                : <span className="text-slate-600 text-[10px] tracking-wider uppercase mt-0.5">No Shift</span>
              }
            </div>
          </div>

          {/* COL 2 CENTER: Tabs — always perfectly centered in their column */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-0.5 bg-white/[0.06] rounded-[18px] p-[5px] border border-white/[0.08]">
              {([
                ['pos',    t('pos')      || 'POS',      ShoppingCart],
                ['sales',  t('activity') || 'Activity',  History],
                ['credit', t('credit')   || 'Credit',    CreditCard],
              ] as const).map(([tab, label, Icon]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    'relative flex items-center gap-1.5 h-[34px] px-3 sm:px-4 rounded-[13px] text-[11px] sm:text-[12px] font-bold transition-all duration-200 whitespace-nowrap',
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.55)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
                  )}>
                  <Icon size={13} />
                  <span>{label}</span>
                  {tab === 'credit' && unpaidCreditSales.length > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[17px] h-[17px] px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black ring-2 ring-[#0f1729]">
                      {unpaidCreditSales.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* COL 3 RIGHT: Desktop actions / Mobile command button */}
          <div className="flex items-center justify-end gap-2">

            {/* Desktop — compact pill row */}
            <div className="hidden lg:flex items-center gap-2">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLocale(locale === 'ar' ? 'en' : 'ar'); }}
                className="h-9 px-3.5 rounded-xl bg-white/[0.07] border border-white/10 hover:bg-white/[0.12] transition-all text-[11px] font-black uppercase tracking-widest text-slate-300">
                {locale === 'ar' ? 'EN' : 'AR'}
              </button>
              <div className="h-9 px-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('printer')}
              </div>
              <CloseShiftBtn triggerClassName="h-9 px-4 rounded-xl bg-white/[0.07] border border-white/10 hover:bg-white/[0.12] transition-all text-[11px] font-bold text-slate-300 flex items-center gap-2" triggerIcon={<History size={14} />} />
              <button type="button" disabled={isLoggingOut}
                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setIsLoggingOut(true); try { const { signOut } = await import('next-auth/react'); await signOut({ callbackUrl: '/login' }); } catch { setIsLoggingOut(false); } }}
                className="h-9 px-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-[11px] font-bold text-red-400 flex items-center gap-2 disabled:opacity-40">
                {isLoggingOut ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <LogOut size={14} />}
                {t('logout') || 'Logout'}
              </button>
            </div>

            {/* Mobile — command center bottom sheet */}
            <Sheet>
              <SheetTrigger className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.07] border border-white/10 text-slate-300 hover:bg-white/[0.13] active:scale-90 transition-all">
                <Menu size={18} />
              </SheetTrigger>

              {/* Bottom Sheet: "Command Center" */}
              <SheetContent className="z-[120] p-0 border-0 rounded-t-[2rem] overflow-hidden" style={{background:'#0b1120', maxHeight:'90vh'}}>
                <SheetTitle className="sr-only">Command Center</SheetTitle>

                {/* Pull indicator already rendered by SheetContent */}

                {/* Identity strip */}
                <div className="px-6 pt-2 pb-5 flex items-center gap-4 border-b border-white/[0.07]">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-lg font-black shadow-xl ring-2 ring-white/10 shrink-0">
                    {cashierName?.[0]?.toUpperCase() ?? 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[15px] font-black truncate">{cashierName}</p>
                    {activeShift
                      ? <p className="text-emerald-400 text-[11px] font-semibold mt-0.5">● Active session · Shift #{activeShift.id}</p>
                      : <p className="text-slate-500 text-[11px] mt-0.5">No active shift</p>
                    }
                  </div>
                  {/* Live clock dot */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-emerald-500 text-[9px] font-black uppercase tracking-wider">Live</span>
                  </div>
                </div>

                {/* Action tiles — 2×2 grid */}
                <div className="p-4 grid grid-cols-2 gap-3">

                  {/* Language tile */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLocale(locale === 'ar' ? 'en' : 'ar'); }}
                    className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:border-blue-500/40 hover:bg-blue-500/[0.08] active:scale-95 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center relative">
                      <Globe size={20} className="text-blue-400" />
                    </div>
                    <div className="relative">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Language</p>
                      <p className="text-white text-[18px] font-black leading-tight">{locale === 'ar' ? 'EN' : 'AR'}</p>
                    </div>
                    <div className="absolute bottom-3 end-3 text-blue-500/50 text-[10px] font-black">→</div>
                  </button>

                  {/* Printer status tile */}
                  <div className="relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.05] border border-emerald-500/20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center relative">
                      <Printer size={20} className="text-emerald-400" />
                    </div>
                    <div className="relative">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('printer')}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <p className="text-emerald-400 text-[13px] font-black">Ready</p>
                      </div>
                    </div>
                  </div>

                  {/* Close Shift tile */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsShiftOpen(true); }}
                    className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:border-amber-500/40 hover:bg-amber-500/[0.08] active:scale-95 transition-all overflow-hidden text-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center relative">
                      <History size={20} className="text-amber-400" />
                    </div>
                    <div className="relative">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Close Shift</p>
                      <p className="text-white text-[13px] font-black">End Session</p>
                    </div>
                  </button>

                  {/* Logout tile */}
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setIsLoggingOut(true); try { const { signOut } = await import('next-auth/react'); await signOut({ callbackUrl: '/login' }); } catch { setIsLoggingOut(false); } }}
                    className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:border-red-500/40 hover:bg-red-500/[0.08] active:scale-95 transition-all overflow-hidden disabled:opacity-40 text-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center relative">
                      {isLoggingOut
                        ? <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <LogOut size={20} className="text-red-400" />}
                    </div>
                    <div className="relative">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('logout') || 'Logout'}</p>
                      <p className="text-white text-[13px] font-black">Sign Out</p>
                    </div>
                  </button>
                </div>

                {/* Bottom safe-area spacing */}
                <div className="h-4" />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* ShiftClosingWorkflow rendered OUTSIDE Sheet so closing the drawer won't dismiss the dialog */}
        <ShiftClosingWorkflow open={isShiftOpen} onOpenChange={setIsShiftOpen} />

        {/* Shortcuts bar */}
        {showShortcuts && (
          <div className="bg-indigo-50/80 border-b border-indigo-100 px-4 py-1.5 flex flex-wrap gap-x-5 gap-y-0.5 shrink-0">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
                <kbd className="bg-white border border-indigo-200 rounded px-1 py-0.5 text-[9px] font-black text-indigo-700 font-mono shadow-sm">{s.key}</kbd>
                <span className="text-gray-500 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── SALES / ACTIVITY TAB ── */}
        {activeTab === 'sales' && (
          <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-5 pb-10">

              {/* ══════════════════════════════════════════════════
                  SECTION A — CURRENT ACTIVE SHIFT
              ══════════════════════════════════════════════════ */}
              <div>
                {/* Gradient section header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex items-center justify-center w-7 h-7">
                    <div className="absolute w-7 h-7 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex-1 flex items-center gap-2.5">
                    <h2 className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.18em]">
                      Current Shift
                    </h2>
                    {activeShift && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-sm">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                        #{activeShift.id} · Since {format(new Date(activeShift.openedAt), 'h:mm a')}
                      </span>
                    )}
                  </div>
                </div>

                {activeShiftSales.length === 0 ? (
                  /* Empty active shift */
                  <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white to-white" />
                    <div className="relative flex flex-col items-center justify-center py-12 text-center px-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                        <Receipt size={26} className="text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-700">No sales yet this shift</p>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-[180px] leading-relaxed">Switch to the POS tab and record your first sale</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(16,185,129,0.07), 0 1px 3px rgba(0,0,0,0.04)' }}>
                    {/* ── Gradient summary strip ── */}
                    {(() => {
                      const cashTotal   = activeShiftSales.filter((t: any) => t.method === 'CASH').reduce((s: number, t: any) => s + (t.type === 'SALE' ? t.amount : -t.amount), 0)
                      const netTotal    = activeShiftSales.filter((t: any) => t.method === 'NETWORK').reduce((s: number, t: any) => s + (t.type === 'SALE' ? t.amount : -t.amount), 0)
                      const grandTotal  = activeShiftSales.reduce((s: number, t: any) => s + (t.type === 'SALE' ? t.amount : -t.amount), 0)
                      const invoiceSet  = new Set(activeShiftSales.map((t: any) => t.invoiceNumber).filter(Boolean))
                      return (
                        <div className="px-4 pt-4 pb-3 border-b border-emerald-50" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 60%, #f8fafc 100%)' }}>
                          <div className="flex items-end justify-between mb-3">
                            <div>
                              <p className="text-[9px] font-black text-emerald-600/70 uppercase tracking-[0.2em] mb-0.5">Total Revenue</p>
                              <p className="text-3xl font-black text-emerald-700 tabular-nums leading-none">
                                {grandTotal.toFixed(2)}
                                <span className="text-sm font-bold text-emerald-500/70 ms-1.5">SAR</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{invoiceSet.size} Invoice{invoiceSet.size !== 1 ? 's' : ''}</p>
                              <p className="text-[10px] font-bold text-gray-500">{activeShiftSales.length} transaction{activeShiftSales.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/70 rounded-xl px-3 py-2 border border-emerald-100/60">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">💵 Cash</p>
                              <p className="text-sm font-black text-gray-800 tabular-nums mt-0.5">{cashTotal.toFixed(2)} <span className="text-[9px] font-normal opacity-50">SAR</span></p>
                            </div>
                            <div className="bg-white/70 rounded-xl px-3 py-2 border border-blue-100/60">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">💳 Network</p>
                              <p className="text-sm font-black text-blue-600 tabular-nums mt-0.5">{netTotal.toFixed(2)} <span className="text-[9px] font-normal opacity-50">SAR</span></p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* ── Invoice rows ── */}
                    {activeShiftSales.map((tx: any, txIdx: number) => {
                      const isExpanded = expandedTxId === tx.id
                      const isSale = tx.type === 'SALE'
                      return (
                        <div key={tx.id} className={cn('border-b border-gray-50 last:border-b-0', txIdx === 0 && 'border-t-0')}>
                          <button
                            onClick={async () => {
                              if (isExpanded) { setExpandedTxId(null); setExpandedDetails(null); return }
                              setExpandedTxId(tx.id)
                              if (tx.invoiceNumber) {
                                setExpandedLoading(true); setExpandedDetails(null)
                                try { const res = await getInvoiceDetails(tx.invoiceNumber); setExpandedDetails(res) }
                                catch { setExpandedDetails(null) }
                                finally { setExpandedLoading(false) }
                              }
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 text-start group',
                              isExpanded ? 'bg-emerald-50/60' : 'hover:bg-gray-50/80'
                            )}
                          >
                            {/* Colored left accent */}
                            <div className={cn(
                              'w-0.5 h-10 rounded-full shrink-0',
                              isSale ? 'bg-emerald-400' : 'bg-rose-400'
                            )} />

                            {/* Icon */}
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                              isSale
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25'
                                : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/25'
                            )}>
                              {isSale ? <ArrowUpRight size={15} strokeWidth={2.5} /> : <ArrowDownLeft size={15} strokeWidth={2.5} />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[11px] font-black text-gray-800 font-mono">{tx.invoiceNumber || `#${tx.id}`}</p>
                                {tx.customerName && (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                    {tx.customerName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{format(new Date(tx.createdAt), 'h:mm a')}</p>
                              {tx.items && tx.items.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {tx.items.map((prod: any, idx: number) => (
                                    <span key={idx} className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md text-[8px] font-bold">
                                      <span className="text-emerald-400">{prod.quantity}×</span> {prod.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <span className={cn(
                                  'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border block text-center mb-1',
                                  tx.method === 'CASH'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  tx.method === 'NETWORK' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  tx.method === 'CREDIT'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-purple-50 text-purple-700 border-purple-200'
                                )}>{getPayMethodLabel(tx.method)}</span>
                                <p className={cn('text-base font-black tabular-nums leading-tight', isSale ? 'text-gray-900' : 'text-rose-500')}>
                                  {isSale ? '+' : '-'}{tx.amount.toFixed(2)}
                                </p>
                              </div>
                              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center transition-colors', isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200')}>
                                {isExpanded ? <ChevronUp size={11} strokeWidth={3} /> : <ChevronDown size={11} strokeWidth={3} />}
                              </div>
                            </div>
                          </button>

                          {/* ── Expanded detail panel ── */}
                          {isExpanded && (
                            <div className="border-t border-emerald-50 bg-gradient-to-b from-emerald-50/40 to-gray-50/60 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                              {expandedLoading ? (
                                <div className="flex items-center justify-center py-6 gap-2">
                                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading details…</span>
                                </div>
                              ) : expandedDetails ? (
                                <>
                                  {/* Meta chips */}
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { label: 'Invoice', value: expandedDetails.invoiceNumber, mono: true },
                                      { label: 'Time', value: format(new Date(expandedDetails.createdAt), 'h:mm a'), mono: false },
                                      { label: 'By', value: expandedDetails.salesperson, mono: false },
                                    ].map(chip => (
                                      <div key={chip.label} className="bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm flex-1 min-w-[80px]">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{chip.label}</p>
                                        <p className={cn('text-[11px] font-bold text-gray-800 mt-0.5 leading-tight', chip.mono && 'font-mono')}>{chip.value}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Items table */}
                                  {expandedDetails.items && expandedDetails.items.length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                                        <Package size={11} className="text-gray-400" />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Items Sold</span>
                                      </div>
                                      {expandedDetails.items.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                            <p className="text-xs font-semibold text-gray-700 truncate">{item.name}</p>
                                          </div>
                                          <span className="text-xs font-black text-gray-900 tabular-nums shrink-0 ms-3">
                                            {item.quantitySold} <span className="text-[10px] font-normal text-gray-400">{item.unit}</span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Total bar */}
                                  <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                                    <div className="flex items-center justify-between px-4 py-3.5">
                                      <div className="flex gap-5">
                                        <div>
                                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Excl. VAT</p>
                                          <p className="text-sm font-bold text-slate-300 tabular-nums">{(expandedDetails.totalAmount / 1.15).toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-amber-500/80 font-black uppercase tracking-widest">VAT 15%</p>
                                          <p className="text-sm font-bold text-amber-400 tabular-nums">{(expandedDetails.totalAmount - expandedDetails.totalAmount / 1.15).toFixed(2)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[8px] text-emerald-400/80 uppercase tracking-widest font-black">Total</p>
                                        <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none">{expandedDetails.totalAmount.toFixed(2)} <span className="text-[10px] opacity-60 font-bold">SAR</span></p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Print & Actions bar */}
                                  <div className="flex gap-2">
                                    {userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userRole) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setCorrectionOpenFor(expandedDetails.invoiceNumber)
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 h-10 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-indigo-100"
                                      >
                                        <RefreshCw size={14} strokeWidth={2.5} /> Correct
                                      </button>
                                    )}

                                    {printerStatus === 'connected' && (
                                      <button
                                        type="button" disabled={isPrinting}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          printReceipt({
                                            invoiceNumber: expandedDetails.invoiceNumber,
                                            createdAt: new Date(expandedDetails.createdAt),
                                            cashierName: expandedDetails.salesperson || cashierName,
                                            items: (expandedDetails.items || []).map((item: any) => ({ name: item.name, quantity: item.quantitySold, price: item.price || 0, unit: item.unit })),
                                            totalAmount: expandedDetails.totalAmount,
                                            paymentMethod: expandedDetails.transactions?.[0]?.method || 'CASH',
                                          })
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-50"
                                      >
                                        <Printer size={14} />{isPrinting ? 'Printing…' : 'Reprint Receipt'}
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-center py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">No details available</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════════
                  SECTION B — PREVIOUS CLOSED SHIFTS
              ══════════════════════════════════════════════════ */}
              {closedShifts.length > 0 && (
                <div className="pt-2">
                  {/* Section header with divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Historical Shifts</h2>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                    <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200/60 shadow-sm px-2.5 py-1 rounded-full whitespace-nowrap">
                      Last 14 days
                    </span>
                  </div>

                  <div className="relative space-y-4">
                    {/* Vertical timeline line */}
                    <div className="absolute top-2 bottom-6 left-6 w-px bg-slate-200/60 hidden sm:block" />

                    {closedShifts.map((shift: any) => {
                      const isOpen = expandedShiftId === shift.id
                      const invoices = shiftInvoices[shift.id]
                      const isLoadingInvoices = shiftInvoicesLoading[shift.id]
                      const hasBnpl = (shift.tabbySales || 0) + (shift.tamaraSales || 0) > 0
                      const shiftDate = format(new Date(shift.openedAt), 'EEE, MMM d')

                      return (
                        <div key={shift.id} className="relative sm:pl-[42px]">
                          {/* Timeline dot */}
                          <div className={cn(
                            'absolute left-4 top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm hidden sm:flex items-center justify-center transition-colors z-10',
                            isOpen ? 'bg-indigo-400' : 'bg-slate-200'
                          )}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>

                          <div className={cn(
                            'rounded-[1.25rem] border overflow-hidden transition-all duration-300',
                            isOpen
                              ? 'bg-white border-indigo-100 shadow-md shadow-indigo-900/5 ring-1 ring-indigo-50'
                              : 'bg-white/60 border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-white'
                          )}>
                            {/* ── Card Header ── */}
                            <button
                              onClick={async () => {
                                if (isOpen) { setExpandedShiftId(null); return }
                                setExpandedShiftId(shift.id)
                                if (!shiftInvoices[shift.id]) {
                                  setShiftInvoicesLoading(prev => ({ ...prev, [shift.id]: true }))
                                  try {
                                    const data = await getShiftInvoices(shift.id)
                                    setShiftInvoices(prev => ({ ...prev, [shift.id]: data }))
                                  } catch {
                                    setShiftInvoices(prev => ({ ...prev, [shift.id]: [] }))
                                  } finally {
                                    setShiftInvoicesLoading(prev => ({ ...prev, [shift.id]: false }))
                                  }
                                }
                              }}
                              className="w-full text-start p-4 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* Left side: Basic info */}
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className={cn(
                                    'w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors',
                                    isOpen ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200/70'
                                  )}>
                                    <p className={cn('text-[7px] font-black uppercase leading-none mb-0.5', isOpen ? 'text-indigo-400' : 'text-slate-400')}>{format(new Date(shift.openedAt), 'MMM')}</p>
                                    <p className={cn('text-sm font-black leading-none', isOpen ? 'text-indigo-700' : 'text-slate-700')}>{format(new Date(shift.openedAt), 'd')}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[13px] font-black text-slate-800">Shift #{shift.id}</p>
                                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                        Closed
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                                      {format(new Date(shift.openedAt), 'h:mm a')} — {shift.closedAt ? format(new Date(shift.closedAt), 'h:mm a') : 'Now'}
                                    </p>
                                  </div>
                                </div>

                                {/* Right side: Metrics & Chevron */}
                                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pl-14 sm:pl-0">
                                  {/* Compact stats strip */}
                                  <div className="flex items-center gap-4 text-right">
                                    <div>
                                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Invoices</p>
                                      <p className="text-[11px] font-bold text-slate-600">{shift.invoiceCount}</p>
                                    </div>
                                    <div className="w-px h-6 bg-slate-100" />
                                    <div>
                                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Total Sales</p>
                                      <p className="text-sm font-black text-slate-800 tabular-nums leading-tight">
                                        {shift.totalSales.toFixed(2)} <span className="text-[9px] font-bold text-slate-400">SAR</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm border',
                                    isOpen ? 'bg-indigo-50 text-indigo-500 border-indigo-100 rotate-180' : 'bg-white text-slate-400 border-slate-200'
                                  )}>
                                    <ChevronDown size={14} strokeWidth={2.5} />
                                  </div>
                                </div>
                              </div>

                              {/* Tags row (only shown if there are network/bnpl sales) */}
                              {((shift.cardSales || 0) > 0 || hasBnpl || shift.cashSales > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-3.5 pl-14 sm:pl-[54px]">
                                  {shift.cashSales > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-2 py-1 rounded-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      Cash {shift.cashSales.toFixed(2)}
                                    </span>
                                  )}
                                  {(shift.cardSales || 0) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100/60 px-2 py-1 rounded-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      Network {shift.cardSales.toFixed(2)}
                                    </span>
                                  )}
                                  {(shift.tabbySales || 0) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-100/60 px-2 py-1 rounded-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                      Tabby {shift.tabbySales.toFixed(2)}
                                    </span>
                                  )}
                                  {(shift.tamaraSales || 0) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-pink-700 bg-pink-50 border border-pink-100/60 px-2 py-1 rounded-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                      Tamara {shift.tamaraSales.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>

                            {/* ── Lazy-loaded invoice list (Scrollable) ── */}
                            {isOpen && (
                              <div className="border-t border-indigo-50 bg-slate-50/50">
                                {isLoadingInvoices ? (
                                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading records…</span>
                                  </div>
                                ) : invoices && invoices.length > 0 ? (
                                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-slate-100/80 overscroll-contain">
                                    {invoices.map((tx: any) => {
                                      const isTxSale = tx.type === 'SALE'
                                      return (
                                        <div key={tx.id} className="flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-white transition-colors group">
                                          {/* Left accent + icon */}
                                          <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                                            <div className={cn('w-0.5 h-8 rounded-full transition-colors', isTxSale ? 'bg-slate-200 group-hover:bg-indigo-300' : 'bg-rose-200 group-hover:bg-rose-400')} />
                                            <div className={cn(
                                              'w-7 h-7 rounded-[10px] flex items-center justify-center shadow-sm',
                                              isTxSale ? 'bg-white text-slate-500 border border-slate-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
                                            )}>
                                              {isTxSale ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownLeft size={13} strokeWidth={2.5} />}
                                            </div>
                                          </div>
                                          {/* Content */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <p className="text-[11px] font-black text-slate-700 font-mono">{tx.invoiceNumber || `#${tx.id}`}</p>
                                              {tx.customerName && (
                                                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">{tx.customerName}</span>
                                              )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{format(new Date(tx.createdAt), 'h:mm a')}</p>
                                            {tx.items && tx.items.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {tx.items.map((prod: any, idx: number) => (
                                                  <span key={idx} className="text-[8px] font-bold text-slate-500 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md shadow-sm">
                                                    <span className="text-slate-400 mr-0.5">{prod.quantity}×</span>{prod.name}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          {/* Amount */}
                                          <div className="text-right shrink-0">
                                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 shadow-sm block text-center mb-1">{tx.method}</span>
                                            <p className={cn('text-[13px] font-black tabular-nums tracking-tight', isTxSale ? 'text-slate-800' : 'text-rose-500')}>
                                              {isTxSale ? '+' : '-'}{tx.amount.toFixed(2)}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="py-8 text-center bg-white/50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No invoices found</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Global empty state ── */}
              {activeShiftSales.length === 0 && closedShifts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5 shadow-inner border border-white">
                    <Receipt size={32} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-black text-slate-600">No activity yet</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5 max-w-[200px] leading-relaxed">Sales recorded during this shift will appear here.</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── CREDIT TAB ── */}
        {activeTab === 'credit' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('unpaidCredit')}</h2>
              <CreditCollectionPanel sales={unpaidCreditSales} />
            </div>
          </div>
        )}

        {/* ── POS TAB ── */}
        {activeTab === 'pos' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

            {/* ── Pending BNPL Recovery Panel — survives page refresh ── */}
            <div className="lg:hidden absolute top-0 left-0 right-0 z-20">
              <BnplPendingPanel
                userRole={userRole}
                onPaymentConfirmed={(invoiceNumber) => {
                  toast.success(`Payment confirmed — ${invoiceNumber}`)
                  router.refresh()
                }}
              />
            </div>
            <div className="hidden lg:block absolute top-0 left-[400px] right-0 z-20">
              <BnplPendingPanel
                userRole={userRole}
                onPaymentConfirmed={(invoiceNumber) => {
                  toast.success(`Payment confirmed — ${invoiceNumber}`)
                  router.refresh()
                }}
              />
            </div>

            {/* LEFT PANEL — Product Browser */}
            <div className={cn(
              "w-full lg:w-[400px] lg:shrink-0 flex-1 min-h-0 flex flex-col bg-white lg:border-e border-gray-200 transition-all duration-300",
              mobilePosView === 'cart' ? 'hidden lg:flex' : 'flex'
            )}>
              {/* Search */}
              <div className="px-3 py-2.5 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input ref={searchRef} type="text" autoFocus
                    placeholder={t('searchItemNameOrSku')}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setFocusedIdx(-1) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { 
                        e.preventDefault()
                        if (focusedIdx >= 0 && filteredItems[focusedIdx]) {
                          if (filteredItems[focusedIdx].currentStock > 0) {
                            addToCart(filteredItems[focusedIdx])
                            setSearch(''); setFocusedIdx(-1);
                          }
                        } else if (search.trim()) {
                          const s = search.trim().toLowerCase()
                          // 1. Exact Barcode Match
                          const barcodeMatch = inventoryItems.find(i => i.barcode?.toLowerCase() === s)
                          // 2. Exact SKU Match
                          const skuMatch = inventoryItems.find(i => i.sku?.toLowerCase() === s)
                          
                          const match = barcodeMatch || skuMatch
                          if (match && match.currentStock > 0) {
                            addToCart(match)
                            setSearch(''); setFocusedIdx(-1);
                          } else if (filteredItems.length === 1 && filteredItems[0].currentStock > 0) {
                            addToCart(filteredItems[0])
                            setSearch(''); setFocusedIdx(-1);
                          } else {
                            toast.error('Barcode not found or item out of stock')
                            setSearch('') // Clear search so cashier can scan again
                          }
                        }
                      }
                    }}
                    className="w-full h-9 ps-8 pe-7 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-sm font-medium placeholder-gray-400 transition-all"
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setFocusedIdx(-1); searchRef.current?.focus() }}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <p className="text-[9px] text-gray-400 font-medium">{filteredItems.length} {t('items')}</p>
                  {cart.length > 0 && <p className="text-[9px] font-bold text-emerald-600">{cart.reduce((s,c)=>s+(parseFloat(c.quantity as string)||0),0)} {t('inCart')}</p>}
                </div>
              </div>

              {/* Column headers */}
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <span className="flex-1">{t('items')}</span>
                <span className="w-16 text-center">{t('stock') || 'Stock'}</span>
                <span className="w-20 text-end">{t('price') || 'Price'}</span>
              </div>

              {/* Item list */}
              <div ref={itemListRef} className="flex-1 overflow-y-auto p-2 lg:p-0">
                {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                    <Package size={24} className="mb-1.5" /><p className="text-[10px] font-medium">{t('noItemFound')}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-0">
                  {filteredItems.map((item, idx) => {
                    const oos = item.currentStock <= 0
                    const low = !oos && item.currentStock <= item.reorderLevel
                    const inCart = cart.find(c => c.itemId === item.id)
                    const isFocused = idx === focusedIdx
                    return (
                      <button key={item.id} onClick={() => { addToCart(item); setFocusedIdx(idx) }}
                        disabled={oos}
                        className={cn(
                          'relative flex flex-col lg:flex-row lg:items-center p-4 lg:px-3 lg:py-[7px] text-start transition-all rounded-2xl lg:rounded-none border lg:border-0 lg:border-b border-gray-200 lg:border-gray-50 shadow-sm lg:shadow-none mb-1 lg:mb-0',
                          oos ? 'opacity-35 cursor-not-allowed bg-gray-50' :
                          isFocused ? 'bg-gradient-to-r from-blue-100/80 to-transparent border-blue-300 shadow-[0_4px_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/20 lg:border-s-[4px] lg:border-s-blue-600 relative z-20 scale-[1.015] transition-all duration-300' :
                          inCart ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                        )}>
                        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-2">
                          <div className="flex items-center justify-between lg:justify-start gap-2">
                            {inCart ? (
                              <span className="w-6 h-6 lg:w-5 lg:h-5 rounded-lg bg-emerald-500 text-white text-[10px] lg:text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm">{inCart.quantity}</span>
                            ) : (
                              <span className="w-6 h-6 lg:w-5 lg:h-5 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0"><Package size={12} /></span>
                            )}
                            <div className="lg:hidden text-end">
                              <span className="text-sm font-black text-gray-900">{item.sellingPrice.toFixed(0)} <span className="text-[10px] text-gray-400">{t('sar')}</span></span>
                            </div>
                          </div>
                          <div className="min-w-0 mt-1 lg:mt-0">
                            <p className={cn('text-sm lg:text-[13px] font-bold lg:font-semibold truncate leading-tight', inCart || isFocused ? 'text-blue-700' : 'text-gray-800')}>{item.name}</p>
                            {item.sku && <p className="text-[10px] lg:text-[9px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-3 mt-2 lg:mt-0">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                            oos ? 'bg-red-100 text-red-600' : low ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
                            {oos ? t('outOfStock') : `${item.currentStock} ${t('units') || ''}`}
                          </span>
                          <span className="hidden lg:block w-20 text-end text-[13px] font-bold text-gray-800 tabular-nums shrink-0">
                            {item.sellingPrice.toFixed(0)} <span className="text-[9px] text-gray-400">{t('sar')}</span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Cart Toggle Footer */}
              {cart.length > 0 && (
                <div className="lg:hidden sticky bottom-0 p-4 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30">
                  <button
                    onClick={() => setMobilePosView('cart')}
                    className="w-full h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-between px-6 shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative">
                        <ShoppingCart size={22} />
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                          {cart.reduce((s,c)=>s+(parseFloat(c.quantity as string)||0),0)}
                        </span>
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">{t('reviewOrder') || 'Review Order'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">{t('total')}</p>
                      <p className="text-xl font-black">{finalTotal.toFixed(2)} SAR</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Cart + Payment */}
            <div className={cn(
              "flex-1 min-h-0 flex flex-col bg-[#f8f9fb] transition-all duration-300",
              mobilePosView === 'items' ? 'hidden lg:flex' : 'flex'
            )}>
              {/* Mobile Back Button */}
              <div className="lg:hidden bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setMobilePosView('items')} className="flex items-center gap-2 text-gray-600 font-bold">
                  <ArrowLeft size={18} />
                  <span>{t('backToItems') || 'Add More Items'}</span>
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase">{t('total')}</p>
                  <p className="text-lg font-black text-emerald-600">{finalTotal.toFixed(2)} SAR</p>
                </div>
              </div>
              {/* Cart header */}
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={13} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('currentOrder')}</span>
                  {cart.length > 0 && (
                    <span className="bg-emerald-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{cart.reduce((s,c)=>s+(parseFloat(c.quantity as string)||0),0)}</span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-wider">
                    {t('clear')}
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto bg-[#f8f9fb]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <ShoppingCart size={32} className="mb-2 opacity-30" />
                    <p className="text-xs font-medium">{t('noItemsAddedYet')}</p>
                    <p className="text-[10px] text-gray-300 mt-1">/ {t('or')} F2 → {t('search')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <div key={item.itemId} className="bg-white px-3 py-3 flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.itemId)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                        <p className="text-[13px] font-semibold text-gray-800 truncate flex-1 min-w-0">{item.name}</p>
                        {/* Qty */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-9 shrink-0 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-all">
                          <button onClick={() => setQty(item.itemId, (parseFloat(item.quantity as string) || 0) - 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 transition-colors rounded-s-lg"><Minus size={11} strokeWidth={3} /></button>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            min="0"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              setQty(item.itemId, v)
                            }}
                            onFocus={e => e.target.select()}
                            className="w-10 h-full text-center text-sm font-black tabular-nums bg-transparent border-none outline-none text-gray-900 p-0"
                          />
                          <button onClick={() => setQty(item.itemId, (parseFloat(item.quantity as string) || 0) + 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 transition-colors rounded-e-lg"><Plus size={11} strokeWidth={3} /></button>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold shrink-0">×</span>
                        {/* Price */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-9 w-24 shrink-0 px-2 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/30 transition-all">
                          <input
                            id={`price-input-${item.itemId}`}
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            step="0.01"
                            min="0"
                            value={item.price === 0 ? '' : item.price}
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updatePrice(item.itemId, v)
                            }}
                            onFocus={e => e.target.select()}
                            className="w-full text-sm font-bold tabular-nums text-end bg-transparent border-none outline-none text-gray-900 h-full p-0"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold shrink-0">=</span>
                        {/* Total Price */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-9 w-24 shrink-0 px-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            value={
                              item.totalInput !== undefined
                                ? item.totalInput
                                : (item.quantity !== '' && item.price !== '' 
                                    ? ((parseFloat(item.quantity as string) || 0) * (parseFloat(item.price as string) || 0)).toFixed(2)
                                    : '')
                            }
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateTotalInput(item.itemId, v)
                            }}
                            onFocus={e => e.target.select()}
                            className="w-full text-sm font-bold tabular-nums text-end bg-transparent border-none outline-none text-indigo-700 h-full p-0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAYMENT SECTION */}
              <div className="shrink-0 bg-white border-t border-gray-200 p-3 space-y-2.5 z-10">

                {/* Subtotal + Discount */}
                {cart.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-bold text-gray-400 uppercase text-[10px]">{t('subtotal')}</span>
                      <span className="font-black text-gray-800 tabular-nums">{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg border border-gray-200 h-9 px-2.5 w-32 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400/20 transition-all">
                      <Percent size={11} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        placeholder="0"
                        value={discountPct}
                        onChange={e => setDiscountPct(e.target.value.replace(/[^0-9.]/g, ''))}
                        onFocus={e => e.target.select()}
                        className="flex-1 min-w-0 text-sm font-bold tabular-nums bg-transparent border-none outline-none text-gray-900 h-full p-0 text-end"
                      />
                      <span className="text-[10px] font-bold text-gray-400 shrink-0">%</span>
                    </div>
                    {parseFloat(discountPct) > 0 && (
                      <span className="text-[10px] font-black text-rose-500 tabular-nums shrink-0">-{discountAmt.toFixed(2)}</span>
                    )}
                  </div>
                )}

                {/* Payment method pill bar */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PAY_METHODS.map(({ mode, label, shortcut, icon: Icon, active }) => {
                    const isActive = payMode === mode
                    return (
                      <button key={mode} type="button" onClick={() => setPayMode(mode)}
                        className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0',
                          isActive ? active + ' border-current' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600')}>
                        <Icon size={isActive ? 14 : 12} className="shrink-0" />
                        <span className="text-[11px] font-bold uppercase">{getPayMethodLabel(mode)}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Total amount input */}
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">{t('sar')}</span>
                  <input
                    ref={amountRef}
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.00"
                    value={totalOverride !== '' ? totalOverride : finalTotal > 0 ? finalTotal.toFixed(2) : ''}
                    onChange={e => setTotalOverride(e.target.value.replace(/[^0-9.]/g, ''))}
                    onFocus={e => e.target.select()}
                    className="h-12 w-full ps-12 pe-10 text-xl font-black rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 tabular-nums bg-gray-50 focus:bg-white outline-none transition-all"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-300 pointer-events-none">F4</span>
                </div>

                {/* Split amounts */}
                {payMode === 'SPLIT' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-black uppercase text-emerald-600 mb-0.5">{t('cash')}</p>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" value={cashAmt} onChange={e => handleCashAmtChange(e.target.value)} className="h-8 rounded-lg text-sm font-bold border-emerald-200 focus:border-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-blue-600 mb-0.5">{t('network')}</p>
                      <Input readOnly value={netAmt} className="h-8 rounded-lg text-sm font-bold border-blue-100 bg-blue-50 text-blue-700" />
                    </div>
                  </div>
                )}

                {/* Customer */}
                <Popover open={customerComboOpen} onOpenChange={v => { setCustomerComboOpen(v); if (!v) { setQuickAddMode(false); setQuickAddPhone('') } }}>
                  <PopoverTrigger render={
                    <button className={cn('flex w-full items-center justify-between h-9 rounded-lg border px-3 text-xs font-semibold transition-colors',
                      customerId ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className={customerId ? 'text-amber-500' : 'text-gray-300'} />
                        <span className="truncate">{customerId ? (customerList.find(c=>c.id===customerId)?.name||customerName) : `${t('customer')}${payMode==='CREDIT'?' *':''}`}</span>
                      </div>
                      <ChevronsUpDown size={11} className="opacity-40 shrink-0" />
                    </button>
                  } />
                  <PopoverContent className="w-[280px] p-0 rounded-xl shadow-2xl border-none overflow-hidden">
                    {quickAddMode ? (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setQuickAddMode(false); setQuickAddPhone('') }} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><ArrowLeft size={12} /></button>
                          <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 flex items-center gap-1"><UserPlus size={12} /> {t('newCustomer')}</span>
                        </div>
                        <Input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder={t('staffName')} className="h-8 rounded-lg font-bold text-sm" autoFocus />
                        <Input value={quickAddPhone} onChange={e=>setQuickAddPhone(e.target.value)} placeholder="05xxxxxxxx" className="h-8 rounded-lg font-bold text-sm" />
                        <button type="button" disabled={!customerSearch.trim()||quickAddSaving}
                          onClick={async () => {
                            if (!customerSearch.trim()) return
                            setQuickAddSaving(true)
                            try {
                              const nc = await createCustomer({ name: customerSearch.trim(), phone: quickAddPhone.trim()||undefined })
                              setCustomerList(prev=>[...prev,{id:nc.id,name:nc.name,phone:nc.phone}].sort((a,b)=>a.name.localeCompare(b.name)))
                              setCustomerId(nc.id); setCustomerName(nc.name); setCustomerPhone(nc.phone||'')
                              setCustomerComboOpen(false); setQuickAddMode(false); setQuickAddPhone('')
                              toast.success(t('customerAdded') + ': ' + nc.name)
                            } catch { toast.error(t('failedToAddCustomer')) } finally { setQuickAddSaving(false) }
                          }}
                          className="w-full h-8 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5">
                          {quickAddSaving ? '...' : <><UserPlus size={12} /> {t('saveAndSelect')}</>}
                        </button>
                      </div>
                    ) : (
                      <Command>
                        <CommandInput placeholder={t('searchCustomer')} className="h-9" value={customerSearch} onValueChange={setCustomerSearch} />
                        <CommandList className="max-h-[200px]">
                          <CommandGroup>
                            {customerId!==null && (
                              <CommandItem value="__clear__" onSelect={() => { setCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerComboOpen(false) }}
                                className="py-2 px-3 cursor-pointer text-gray-400 italic text-xs">
                                <Check className="mr-2 h-3.5 w-3.5 opacity-0" /> {t('walkinCustomer')}</CommandItem>
                            )}
                            {customerList.map(c => (
                              <CommandItem key={c.id} value={`${c.name} ${c.phone||''}`}
                                onSelect={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone||''); setCustomerSearch(''); setCustomerComboOpen(false) }}
                                className="py-2 px-3 cursor-pointer hover:bg-amber-50">
                                <Check className={cn('mr-2 h-3.5 w-3.5 text-amber-600', customerId===c.id?'opacity-100':'opacity-0')} />
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{c.name}</span>
                                  {c.phone && <span className="text-[9px] text-gray-400">{c.phone}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {customerSearch.trim().length > 0 && (
                            <CommandGroup>
                              <CommandItem value={`__add__${customerSearch}`} onSelect={() => setQuickAddMode(true)}
                                className="py-2 px-3 cursor-pointer hover:bg-violet-50 text-violet-600 font-bold text-sm">
                                <UserPlus size={12} className="mr-2 shrink-0" /> {t('add')} &ldquo;{customerSearch}&rdquo;
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    )}
                  </PopoverContent>
                </Popover>

                {payMode === 'CREDIT' && !customerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={t('customerName') + ' *'} value={customerName} onChange={e=>setCustomerName(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 focus:border-amber-500" />
                    <Input placeholder={t('placeholderPhone') + ' *'} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 focus:border-amber-500" />
                  </div>
                )}
                {payMode === 'CREDIT' && (
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-black uppercase text-amber-500 shrink-0">{t('dueDate')}</p>
                    <Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 flex-1" />
                  </div>
                )}

                {/* Description */}
                <Input placeholder={t('descriptionOptional')} value={description} onChange={e=>setDescription(e.target.value)} className="h-8 rounded-lg text-xs border-gray-200 bg-gray-50" />

                {/* Submit */}
                <button onClick={handleSubmit} disabled={loading || cart.length === 0}
                  className={cn('w-full h-11 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed',
                    `bg-gradient-to-r ${submitBtnColor}`)}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('processing')}</>
                    : <><Check size={16} strokeWidth={3} /> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')} <span className="opacity-60 ms-1 text-[10px]">(F9)</span></>
                  }
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
